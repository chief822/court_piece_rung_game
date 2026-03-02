import { GameState } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users } from 'lucide-react';

interface ScoreBoardProps {
  gameState: GameState;
}

export default function ScoreBoard({ gameState }: ScoreBoardProps) {
  const team1Players = [gameState.players[0], gameState.players[2]];
  const team2Players = [gameState.players[1], gameState.players[3]];

  return (
    <div className="space-y-4">
      {/* Round Info */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-amber-700 border-2">
        <CardHeader>
          <CardTitle className="text-amber-400 text-xl flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Round {gameState.roundNumber}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Team 1 Score */}
      <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500 border-2">
        <CardHeader className='-mb-4'>
          <CardTitle className="text-white text-lg flex flex-row justify-between">
            {/* <div> 
              <Users className="w-5 h-5 inline-block mr-2" />
              Team 1
            </div> */}

            <div className="text-white">
              {/* {team1Players.map(player => (
                <span key={player.id} className="text-sm ml-4">
                  {player.nickname}
                </span>
              ))} */}

              {team1Players[0].nickname} and {team1Players[1].nickname}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-white">
          <div className="mt-4 pt-4 border-t border-blue-400">
            <div className="flex justify-between">
              <span>Courts:</span>
              <span className="font-bold text-xl">{gameState.team1Courts}</span>
            </div>
            
            <div className="flex justify-between mt-2">
              <span>Deals Won:</span>
              <span className="font-bold">{gameState.team1DealsWon}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team 2 Score */}
      <Card className="bg-gradient-to-br from-red-600 to-red-700 border-red-500 border-2">
        <CardHeader className='-mb-4'>
          <CardTitle className="text-white text-lg flex flex-row justify-between">
            {/* <div>
              <Users className="w-5 h-5 inline-block mr-2" />
              Team 2
            </div> */}

            <div className="text-white">
              {/* {team2Players.map(player => (
                <span key={player.id} className="text-sm ml-4">
                  {player.nickname}
                </span>
              ))} */}

              {team2Players[0].nickname} and {team2Players[1].nickname}
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="text-white">
          <div className="mt-4 pt-4 border-t border-red-400">
            <div className="flex justify-between">
              <span>Courts:</span>
              <span className="font-bold text-xl">{gameState.team2Courts}</span>
            </div>

            <div className="flex justify-between mt-2">
              <span>Deals Won:</span>
              <span className="font-bold">{gameState.team2DealsWon}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Consecutive Deals Tracker */}
      {gameState.consecutiveDealsWinner && (
        <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-purple-500 border-2">
          <CardContent className="p-4 text-white text-center">
            <div className="text-sm mb-1">Consecutive Deals</div>
            <div className="text-2xl font-bold">
              Team {gameState.consecutiveDealsWinner}: {gameState.consecutiveDealsCount}/7
            </div>
            <div className="text-xs mt-1 opacity-80">
              {7 - gameState.consecutiveDealsCount} more for a Court!
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
