import { useEffect, useState } from 'react';
import type { GameState, Card, Suit, NetworkMessage, ChatMessage } from '@/types/game';
import type { RoomState } from '@/types/game';
import type { WebRTCManager } from '@/lib/webrtc-manager';
import { createInitialGameState, startNewRound, selectTrump, playCard, continueAfterTrick, addChatMessage } from '@/lib/game-logic';
import GameTable from './GameTable';
import TrumpSelection from './TrumpSelection';
import ScoreBoard from './ScoreBoard';
import ChatPanel from './ChatPanel';

interface GameBoardProps {
  roomState: RoomState;
  myId: string;
  webrtc: WebRTCManager;
}

export default function GameBoard({ roomState, myId, webrtc }: GameBoardProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const isHost = roomState.hostId === myId;

  // Initialize game (only host)
  useEffect(() => {
    if (isHost && !gameState) {
      console.log('Host initializing game...');
      const initialState = createInitialGameState(roomState.players);
      const newRoundState = startNewRound(initialState);
      setGameState(newRoundState);
      
      // Sync state to all players
      webrtc.sendData({
        type: 'game-state-sync',
        state: newRoundState
      } as NetworkMessage);
    }
  }, [isHost, gameState, roomState.players, webrtc]);

  // Listen for network messages
  useEffect(() => {
    const originalCallback = webrtc['callbacks'].onData;
    
    webrtc['callbacks'].onData = (peerId: string, data: any) => {
      originalCallback?.(peerId, data);
      handleNetworkMessage(data);
    };

    return () => {
      webrtc['callbacks'].onData = originalCallback;
    };
  }, [webrtc, gameState]);

  const handleNetworkMessage = (message: NetworkMessage) => {
    console.log('Game message received:', message);
    
    switch (message.type) {
      case 'game-state-sync':
        if (message.state && !isHost) {
          setGameState(message.state as GameState);
        }
        break;
      
      case 'trump-selected':
        if (gameState) {
          const newState = selectTrump(gameState, message.suit);
          setGameState(newState);
        }
        break;
      
      case 'card-played':
        if (gameState) {
          const newState = playCard(gameState, message.playerId, message.card);
          setGameState(newState);
        }
        break;
      
      case 'chat-message':
        if (gameState) {
          const newState = addChatMessage(gameState, message.message);
          setGameState(newState);
        }
        break;
    }
  };

  const handleTrumpSelect = (suit: Suit) => {
    if (!gameState) return;
    
    const newState = selectTrump(gameState, suit);
    setGameState(newState);
    
    // Broadcast to all players
    webrtc.sendData({
      type: 'trump-selected',
      suit
    } as NetworkMessage);
  };

  const handleCardPlay = (card: Card) => {
    if (!gameState) return;
    
    const newState = playCard(gameState, myId, card);
    setGameState(newState);
    
    // Broadcast to all players
    webrtc.sendData({
      type: 'card-played',
      card,
      playerId: myId
    } as NetworkMessage);
  };

  const handleContinue = () => {
    if (!gameState) return;
    
    if (gameState.phase === 'trick-complete') {
      const newState = continueAfterTrick(gameState);
      setGameState(newState);
      
      if (isHost) {
        webrtc.sendData({
          type: 'game-state-sync',
          state: newState
        } as NetworkMessage);
      }
    } else if (gameState.phase === 'round-complete') {
      const newState = startNewRound(gameState);
      setGameState(newState);
      
      if (isHost) {
        webrtc.sendData({
          type: 'game-state-sync',
          state: newState
        } as NetworkMessage);
      }
    }
  };

  const handleSendMessage = (text: string) => {
    if (!gameState) return;
    
    const myPlayer = gameState.players.find(p => p.id === myId);
    if (!myPlayer) return;
    
    const message: ChatMessage = {
      id: `${myId}-${Date.now()}`,
      playerId: myId,
      nickname: myPlayer.nickname,
      message: text,
      timestamp: Date.now()
    };
    
    const newState = addChatMessage(gameState, message);
    setGameState(newState);
    
    webrtc.sendData({
      type: 'chat-message',
      message
    } as NetworkMessage);
  };

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 to-emerald-800 flex items-center justify-center">
        <div className="text-amber-400 text-2xl">Setting up game...</div>
      </div>
    );
  }

  const myPlayer = gameState.players.find(p => p.id === myId);
  const isTrumpCaller = gameState.trumpCallerId === myId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-green-900 to-teal-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Score Board */}
          <div className="lg:col-span-1">
            <ScoreBoard gameState={gameState} />
          </div>
          
          {/* Game Table */}
          <div className="lg:col-span-2">
            {gameState.phase === 'trump-selection' && isTrumpCaller && myPlayer && (
              <TrumpSelection
                firstFiveCards={myPlayer.cards.slice(0, 5)}
                onSelectTrump={handleTrumpSelect}
              />
            )}
            
            {gameState.phase !== 'trump-selection' && (
              <GameTable
                gameState={gameState}
                myId={myId}
                onPlayCard={handleCardPlay}
                onContinue={handleContinue}
              />
            )}
          </div>
          
          {/* Chat Panel */}
          <div className="lg:col-span-1">
            <ChatPanel
              messages={gameState.chatMessages}
              myId={myId}
              onSendMessage={handleSendMessage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
