import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Crown, Copy, Check } from 'lucide-react';

export default function RoomJoin() {
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateRoom = () => {
    if (!nickname.trim()) return;
    const code = generateRoomCode();
    navigate(`/room/${code}`, { state: { nickname, isHost: true } });
  };

  const handleJoinRoom = () => {
    if (!nickname.trim() || !roomCode.trim()) return;
    navigate(`/room/${roomCode.toUpperCase()}`, { state: { nickname, isHost: false } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-amber-400 mb-2 drop-shadow-lg">Court Piece Double Sir</h1>
          <p className="text-xl text-amber-100 font-medium">Rung Game - updated UI</p>
          <div className="flex items-center justify-center gap-2 mt-4 text-amber-200">
            <Users className="w-5 h-5" />
            <span className="text-sm">4 Players Required</span>
          </div>
        </div>

        {/* Nickname Input */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-amber-700 border-2 mb-6">
          <CardHeader>
            <CardTitle className="text-amber-400 text-2xl">Enter Your Name</CardTitle>
            <CardDescription className="text-amber-100">Choose a nickname for the game</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Your nickname..."
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="text-lg h-12 bg-slate-700 border-amber-600 text-white placeholder:text-slate-400"
              maxLength={20}
            />
          </CardContent>
        </Card>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Create Room */}
          <Card className="bg-gradient-to-br from-amber-600 to-amber-700 border-amber-500 border-2 hover:shadow-xl transition-all">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Crown className="w-6 h-6 text-amber-200" />
                <CardTitle className="text-white text-2xl">Create Room</CardTitle>
              </div>
              <CardDescription className="text-amber-100">
                Host a new game and invite friends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleCreateRoom}
                disabled={!nickname.trim()}
                className="w-full h-12 text-lg font-bold bg-white text-amber-700 hover:bg-amber-50"
              >
                Create Game Room
              </Button>
            </CardContent>
          </Card>

          {/* Join Room */}
          <Card className="bg-gradient-to-br from-teal-600 to-teal-700 border-teal-500 border-2 hover:shadow-xl transition-all">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-teal-200" />
                <CardTitle className="text-white text-2xl">Join Room</CardTitle>
              </div>
              <CardDescription className="text-teal-100">
                Enter a room code to join a game
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Enter room code..."
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="text-lg h-12 bg-teal-800 border-teal-400 text-white placeholder:text-teal-300"
                maxLength={6}
              />
              <Button
                onClick={handleJoinRoom}
                disabled={!nickname.trim() || !roomCode.trim()}
                className="w-full h-12 text-lg font-bold bg-white text-teal-700 hover:bg-teal-50"
              >
                Join Game
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Rules Preview
        <Card className="mt-6 bg-slate-800/50 border-amber-700">
          <CardHeader>
            <CardTitle className="text-amber-400 text-xl">Quick Rules</CardTitle>
          </CardHeader>
          <CardContent className="text-amber-100 space-y-2 text-sm">
            <p>• 4 players in 2 teams (players opposite each other are partners)</p>
            <p>• Trump caller selects trump suit from first 5 cards</p>
            <p>• Win 7 tricks to win the deal</p>
            <p>• Win 7 consecutive deals to earn a Court</p>
            <p>• First 7 consecutive tricks = 1 Court (Goon Court)</p>
            <p>• Win all 13 tricks = 52 Courts (Bavney)</p>
          </CardContent>
        </Card> */}
      </div>
    </div>
  );
}
