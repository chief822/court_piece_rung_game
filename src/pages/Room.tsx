import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { WebRTCManager } from '@/lib/webrtc-manager';
import type { RoomState } from '@/types/game';
import WaitingRoom from '@/components/features/WaitingRoom';
import GameBoard from '@/components/features/GameBoard';

export default function Room() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [webrtc, setWebrtc] = useState<WebRTCManager | null>(null);
  const [myId, setMyId] = useState<string>('');
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [error, setError] = useState<string>('');

  const nickname = location.state?.nickname || 'Player';
  const isHost = location.state?.isHost || false;

  useEffect(() => {
    if (!roomCode) {
      navigate('/');
      return;
    }

    const manager = new WebRTCManager({
      onRoomCreated: (code) => {
        console.log('Room created:', code);
        const id = manager.getPeerId();
        setMyId(id);
        setRoomState({
          roomCode: code,
          players: [{ id, nickname, isReady: false, isHost: true }],
          hostId: id,
          gameStarted: false
        });
      },
      
      onRoomJoined: (code) => {
        console.log('Room joined:', code);
        const id = manager.getPeerId();
        setMyId(id);
      },
      
      onRoomState: (peers) => {
        console.log('Room state updated:', peers);
      },
      
      onConnected: (peerId, peerNickname) => {
        console.log('Connected to:', peerNickname);
        setRoomState(prev => {
          if (!prev) return prev;
          
          const playerExists = prev.players.some(p => p.id === peerId);
          if (playerExists) return prev;
          
          return {
            ...prev,
            players: [...prev.players, { 
              id: peerId, 
              nickname: peerNickname, 
              isReady: false, 
              isHost: false 
            }]
          };
        });
      },
      
      onDisconnected: (peerId) => {
        console.log('Disconnected:', peerId);
        setRoomState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            players: prev.players.filter(p => p.id !== peerId)
          };
        });
      },
      
      onData: (peerId, data) => {
        console.log('Received data from', peerId, data);
        handleNetworkMessage(data);
      },
      
      onRoomClosed: (reason) => {
        setError(`Room closed: ${reason}`);
        setTimeout(() => navigate('/'), 3000);
      },
      
      onError: (err) => {
        setError(err);
      }
    });

    setWebrtc(manager);

    if (isHost) {
      manager.createRoom(roomCode, nickname);
    } else {
      manager.joinRoom(roomCode, nickname);
    }

    return () => {
      manager.disconnect();
    };
  }, [roomCode, nickname, isHost, navigate]);

  const handleNetworkMessage = (message: any) => {
    switch (message.type) {
      case 'player-ready':
        setRoomState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            players: prev.players.map(p => 
              p.id === message.playerId ? { ...p, isReady: true } : p
            )
          };
        });
        break;
      
      case 'start-game':
        setGameStarted(true);
        break;
    }
  };

  const handleReady = () => {
    if (!webrtc || !roomState) return;
    
    const updatedState = {
      ...roomState,
      players: roomState.players.map(p => 
        p.id === myId ? { ...p, isReady: true } : p
      )
    };
    setRoomState(updatedState);
    
    webrtc.sendData({ type: 'player-ready', playerId: myId });
  };

  const handleStartGame = () => {
    if (!webrtc || !roomState) return;
    if (roomState.players.length !== 4) return;
    if (!roomState.players.every(p => p.isReady)) return;
    
    setGameStarted(true);
    webrtc.sendData({ type: 'start-game' });
  };
  console.log("BUG: ");
  console.log(roomState, webrtc);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 to-red-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-red-700 mb-4">Error</h2>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!roomState || !webrtc) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 to-emerald-800 flex items-center justify-center">
        <div className="text-amber-400 text-2xl">Connecting...</div>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <WaitingRoom
        roomState={roomState}
        myId={myId}
        isHost={isHost}
        onReady={handleReady}
        onStartGame={handleStartGame}
      />
    );
  }

  return (
    <GameBoard
      roomState={roomState}
      myId={myId}
      webrtc={webrtc}
    />
  );
}
