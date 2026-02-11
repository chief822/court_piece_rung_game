import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Users, Copy, Check, Play } from 'lucide-react';
import type { RoomState } from '@/types/game';

interface WaitingRoomProps {
  roomState: RoomState;
  myId: string;
  isHost: boolean;
  onReady: () => void;
  onStartGame: () => void;
}

export default function WaitingRoom({ roomState, myId, isHost, onReady, onStartGame }: WaitingRoomProps) {
  const [copied, setCopied] = useState(false);
  const myPlayer = roomState.players.find(p => p.id === myId);
  const canStart = roomState.players.length === 4 && roomState.players.every(p => p.isReady);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomState.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Room Code */}
        <Card className="mb-6 bg-gradient-to-br from-amber-600 to-amber-700 border-amber-500 border-2">
          <CardHeader>
            <CardTitle className="text-white text-center text-2xl">Room Code</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 justify-center">
              <div className="text-5xl font-bold text-white tracking-widest">
                {roomState.roomCode}
              </div>
              <Button
                onClick={copyRoomCode}
                variant="outline"
                size="icon"
                className="bg-white text-amber-700 hover:bg-amber-50"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </Button>
            </div>
            <p className="text-center text-amber-100 mt-3">Share this code with your friends</p>
          </CardContent>
        </Card>

        {/* Players */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-amber-700 border-2 mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-amber-400 text-2xl flex items-center gap-2">
                <Users className="w-6 h-6" />
                Players ({roomState.players.length}/4)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {roomState.players.map((player, index) => (
                <div
                  key={player.id}
                  className={`p-4 rounded-lg border-2 ${
                    player.isReady 
                      ? 'bg-green-900/30 border-green-500' 
                      : 'bg-slate-700 border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {player.isHost && <Crown className="w-4 h-4 text-amber-400" />}
                      <span className="text-white font-medium">{player.nickname}</span>
                      {player.id === myId && (
                        <span className="text-xs text-amber-400">(You)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {player.isReady ? (
                        <span className="text-green-400 text-sm font-bold">✓ Ready</span>
                      ) : (
                        <span className="text-slate-400 text-sm">Waiting...</span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {index % 2 === 0 ? 'Team 1' : 'Team 2'}
                  </div>
                </div>
              ))}
              
              {/* Empty slots */}
              {Array.from({ length: 4 - roomState.players.length }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="p-4 rounded-lg border-2 border-dashed border-slate-600 bg-slate-800/50"
                >
                  <div className="text-slate-500 text-center">Waiting for player...</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          {!myPlayer?.isReady && (
            <Button
              onClick={onReady}
              className="w-full h-14 text-xl font-bold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
            >
              <Check className="w-6 h-6 mr-2" />
              I'm Ready!
            </Button>
          )}
          
          {isHost && (
            <Button
              onClick={onStartGame}
              disabled={!canStart}
              className="w-full h-14 text-xl font-bold bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white disabled:opacity-50"
            >
              <Play className="w-6 h-6 mr-2" />
              Start Game
            </Button>
          )}
          
          {!canStart && (
            <p className="text-center text-amber-200 text-sm">
              {roomState.players.length < 4 
                ? `Waiting for ${4 - roomState.players.length} more player(s)...`
                : 'Waiting for all players to be ready...'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
