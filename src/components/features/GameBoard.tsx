import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState, Card, Suit, NetworkMessage, ChatMessage } from '@/types/game';
import type { RoomState } from '@/types/game';
import type { WebRTCManager } from '@/lib/webrtc-manager';
import { createInitialGameState, startNewRound, selectTrump, playCard, continueAfterTrick, addChatMessage } from '@/lib/game-logic';
import GameTable from './GameTable';
import GameAlerts from './GameAlerts';
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
  
  // 1. REF FIX: Keep a ref sync'd with state to access inside event listeners without stale closures
  const gameStateRef = useRef<GameState | null>(null);

  const [isComplete, setIsComplete] = useState<string>('');
  const [expiryTime, setExpiryTime] = useState<Date>(new Date());

  // Sync completion state when gameState phase changes
  useEffect(() => {
    if (['trick-complete-with-winner', 'trick-complete-without-winner', 'round-complete'].includes(gameState?.phase || '')) {
      const newExpiry = new Date();
      newExpiry.setSeconds(newExpiry.getSeconds() + 5);
      setExpiryTime(newExpiry);
      setIsComplete(gameState!.phase);
    } else {
      setIsComplete('');
    }
  }, [gameState?.phase]);
  
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const isHost = roomState.hostId === myId;

  // 2. HOST LOGIC: Initialize game
  useEffect(() => {
    if (isHost && !gameState) {
      console.log('Host initializing game...');
      const initialState = createInitialGameState(roomState.players);
      const newRoundState = startNewRound(initialState);
      setGameState(newRoundState);
      
      // Broadcast initial state (Best effort, but peers might miss it)
      // webrtc.sendData({
      //   type: 'game-state-sync',
      //   state: newRoundState
      // } as NetworkMessage);
    }
  }, [isHost, gameState, roomState.players, webrtc]);

  // 3. PEER LOGIC: Request state on mount
  useEffect(() => {
    if (!isHost && !gameState) {
      console.log('Non-host requesting game state...');
      // Ask the host for the state immediately upon loading this component
      webrtc.sendData({
        type: 'request-game-state'
      } as any);
    }
  }, [isHost, gameState, webrtc]);

  // 4. MESSAGE HANDLER: Uses ref to avoid stale state
  const handleNetworkMessage = useCallback((peerId: string, message: NetworkMessage | any) => {
    console.log('Game message received:', message);
    const currentState = gameStateRef.current; // ALWAYS use the Ref

    switch (message.type) {
      case 'request-game-state':
        // If I am host and I have the state, send it to the specific peer who asked
        if (isHost && currentState) {
            console.log(`Sending sync to requesting peer: ${peerId}`);
            webrtc.sendData({
                type: 'game-state-sync',
                state: currentState
            } as NetworkMessage, peerId, true);
        }
        break;

      case 'game-state-sync':
        if (message.state && !isHost) {
          console.log('Received game state sync');
          setGameState(message.state as GameState);
        }
        break;
      
      case 'trump-selected':
        if (currentState) {
          const newState = selectTrump(currentState, message.suit);
          setGameState(newState);
        }
        break;
      
      case 'card-played':
        if (currentState) {
          const newState = playCard(currentState, message.playerId, message.card);
          setGameState(newState);
        }
        break;
      
      case 'chat-message':
        if (currentState) {
          const newState = addChatMessage(currentState, message.message);
          setGameState(newState);
        }
        break;
    }
    
    // Relay message to other peers if I am the Host
    // (excluding 'request-game-state' which is point-to-point usually, but relaying it doesn't hurt)
    if (webrtc['isHost'] && message.type !== 'request-game-state') {
      webrtc.sendData(message, peerId);
    }
  }, [isHost, webrtc]); // Removed 'gameState' from dependencies to prevent listener churn

  // 5. LISTENER SETUP: Securely attach the listener
  useEffect(() => {
    console.log("Attaching GameBoard network listener");
    const originalCallback = webrtc['callbacks'].onData;            
    
    webrtc['callbacks'].onData = (peerId: string, data: any) => {
      // call original (Room.tsx) just in case, though likely not needed here
      originalCallback?.(peerId, data); 
      handleNetworkMessage(peerId, data);
    };

    return () => {
      console.log("Detaching GameBoard network listener");
      webrtc['callbacks'].onData = originalCallback;
    };
  }, [webrtc, handleNetworkMessage]);

  const handleTrumpSelect = (suit: Suit) => {
    if (!gameState) return;
    const newState = selectTrump(gameState, suit);
    setGameState(newState);
    webrtc.sendData({ type: 'trump-selected', suit } as NetworkMessage);
  };

  const handleCardPlay = (card: Card) => {
    if (!gameState) return;
    const newState = playCard(gameState, myId, card);
    setGameState(newState);
    webrtc.sendData({ type: 'card-played', card, playerId: myId } as NetworkMessage);
  };

  const handleContinue = () => {
    if (!gameState) return;
    if (gameState.phase === 'trick-complete-with-winner' || gameState.phase === 'trick-complete-without-winner') {
      const newState = continueAfterTrick(gameState);
      setGameState(newState);
      if (isHost) webrtc.sendData({ type: 'game-state-sync', state: newState } as NetworkMessage);
    } else if (gameState.phase === 'round-complete') {
      const newState = startNewRound(gameState);
      setGameState(newState);
      if (isHost) webrtc.sendData({ type: 'game-state-sync', state: newState } as NetworkMessage);
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
    webrtc.sendData({ type: 'chat-message', message } as NetworkMessage);
  };

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 to-emerald-800 flex items-center justify-center">
        <div className="text-amber-400 text-2xl flex flex-col items-center gap-4">
            <div>Setting up game...</div>
            {!isHost && <div className="text-sm text-amber-200">Waiting for host data...</div>}
        </div>
      </div>
    );
  }

  const myPlayer = gameState.players.find(p => p.id === myId);
  const isTrumpCaller = gameState.trumpCallerId === myId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-green-900 to-teal-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-1">
            <ScoreBoard gameState={gameState} />
            
            {isComplete && (
              <GameAlerts 
                gameState={gameState} 
                expiryTime={expiryTime} 
                isComplete={isComplete}
                onTimerExpire={handleContinue} 
              />
            )}
          </div>
          <div className="lg:col-span-2">
            {gameState.phase === 'trump-selection' && isTrumpCaller && myPlayer && (
              <TrumpSelection
                firstFiveCards={myPlayer.cards.slice(0, 5)}
                onSelectTrump={handleTrumpSelect}
              />
            )}
            {gameState.phase === 'trump-selection' && !isTrumpCaller && myPlayer && (
              <div className="flex items-center justify-center h-full">
                <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl px-8 py-6 shadow-xl text-center">
                  <div className="text-lg font-semibold text-emerald-300 mb-2">
                    Trump Selection
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <span className="inline-block h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
                    <p className="text-white/80">
                      Waiting for trump to be called…
                    </p>
                  </div>
                </div>
              </div>
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