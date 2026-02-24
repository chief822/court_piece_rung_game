// components/GameAlerts.tsx
import { GameState } from '@/types/game';
import { Card, CardContent } from '@/components/ui/card';
import { useTimer } from 'react-timer-hook';

interface GameAlertsProps {
  gameState: GameState;
  expiryTime: Date;
  isComplete: string;
  onTimerExpire: () => void;
}

export default function GameAlerts({ gameState, expiryTime, isComplete, onTimerExpire }: GameAlertsProps) {
  const { totalSeconds } = useTimer({
    expiryTimestamp: expiryTime,
    onExpire: onTimerExpire,
  });

  const isRound = isComplete === 'round-complete';
  const bgColor = isRound ? 'from-purple-600 to-purple-700' : 'from-green-600 to-green-700';

  const winner = gameState.players.find(p => p.id === gameState.prevTrickWinner);

  return (
    <Card className={`mt-4 bg-gradient-to-r ${bgColor} border-2 border-white/20 animate-in fade-in slide-in-from-top-4`}>
      <CardContent className="p-4 text-center text-white">
        {isComplete === 'trick-complete-without-winner' && (
          <div className="font-bold">Senior: {winner?.nickname}</div>
        )}
        
        {isComplete === 'trick-complete-with-winner' && (
          <div className="font-bold">Winner: {winner?.nickname}</div>
        )}

        {isRound && (
          <div className="space-y-1">
            <div className="font-black text-lg">Round Over!</div>
            <div className="text-xs opacity-90">
              T1: {gameState.players[0].tricksWon + gameState.players[2].tricksWon} | 
              T2: {gameState.players[1].tricksWon + gameState.players[3].tricksWon}
            </div>
          </div>
        )}

        <div className="mt-2 inline-block bg-white/20 px-3 py-1 rounded-full text-sm font-mono">
          Next in: {totalSeconds}s
        </div>
      </CardContent>
    </Card>
  );
}