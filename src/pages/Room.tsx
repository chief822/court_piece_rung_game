import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { WebRTCManager } from '@/lib/webrtc-manager';
import type { NetworkMessage, RoomState } from '@/types/game';
import WaitingRoom from '@/components/features/WaitingRoom';
import GameBoard from '@/components/features/GameBoard';
import { connected } from 'process';

function mapPeersToPlayers(peers: any[]) {
  return peers.map((peer) => {
    return {
      id: peer.id,
      nickname: peer.nickname,
      isReady: peer.isReady,
      isHost: peer.isHost,
    }
  });
}

export default function Room() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [webrtc, setWebrtc] = useState<WebRTCManager | null>(null);
  const [myId, setMyId] = useState<string>('');
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
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
        setIsConnected(true);
      },
      
      onRoomJoined: (code, peers) => {
        console.log('Room joined:', code);
        const id = manager.getPeerId();
        setMyId(id);
        const players = mapPeersToPlayers(peers);
        const host = players.find(player => player.isHost);

        setRoomState({
          roomCode: code,
          players,
          hostId: host.id,
          gameStarted: false
        });
      },
      
      onRoomState: (peers) => {
        console.log('Room state updated:', peers);
        setRoomState(prev => {
          if (!prev) return prev;
          
          const players = mapPeersToPlayers(peers);
          
          return {
            ...prev,
            players
          };
        });
      },
      
      onConnected: (peerId, peerNickname) => {
        console.log('Connected to:', peerNickname);
        setIsConnected(true);
      },
      
      onDisconnected: (peerId) => {
        console.log('Disconnected:', peerId);
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

  const handleNetworkMessage = (message: NetworkMessage) => {
    switch (message.type) {   // will make it cleaner later
      case 'start-game':
        setGameStarted(true);
        break;
    }
  };

  const handleReady = () => {
    if (!webrtc || !roomState || !isConnected) return;
    
    webrtc.setReady();
  };

  const handleStartGame = () => {
    if (!webrtc || !roomState) return;
    if (roomState.players.length !== 4) return;
    if (!roomState.players.every(p => p.isReady)) return;
    
    setGameStarted(true);
    webrtc.sendData({ type: 'start-game' });
  };

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

  if (!isConnected || !webrtc) {
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
