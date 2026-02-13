import { Card as CardType, GameState } from '@/types/game';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PlayingCard from './PlayingCard';
import { canPlayCard } from '@/lib/card-utils';
import { getSuitSymbol } from '@/lib/card-utils';
import { ArrowRight } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface GameTableProps {
  gameState: GameState;
  myId: string;
  onPlayCard: (card: CardType) => void;
  onContinue: () => void;
}

export default function GameTable({ gameState, myId, onPlayCard, onContinue }: GameTableProps) {
  const [isComplete, setisComplete] = useState<string>('');
  const prevPhase = useRef<string | null>(null);
  const myPlayer = gameState.players.find(p => p.id === myId);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === myId && gameState.phase === 'playing';

  const getPlayerPosition = (playerIndex: number) => {
    if (!myPlayer) return 'bottom';
    const myPosition = myPlayer.position;
    const relativePosition = (playerIndex - myPosition + 4) % 4;
    return ['bottom', 'left', 'top', 'right'][relativePosition];
  };

  const handleCardClick = (card: CardType) => {
    if (!isMyTurn || !myPlayer) return;
    
    const canPlay = canPlayCard(card, myPlayer.cards, gameState.currentTrick.leadSuit);
    if (canPlay) {
      onPlayCard(card);
    }
  };

  useEffect(() => {
    const prev = prevPhase.current;
    const curr = gameState.phase;

    prevPhase.current = curr;

    const enteredComplete =
      (curr === 'trick-complete' || curr === 'round-complete') &&
      prev !== curr;

    if (!enteredComplete) return;

    setisComplete(gameState.phase);
    onContinue();

    const timeout = setTimeout(() => {
      setisComplete('');
    }, 5000);
  }, [gameState.phase, onContinue]);

  return (
    <div className="space-y-4">
      {/* Trump Suit Indicator */}
      {gameState.trumpSuit && (
        <Card className="bg-gradient-to-r from-purple-600 to-purple-700 border-purple-500 border-2">
          <CardContent className="p-4">
            <div className="text-center text-white">
              <span className="text-lg font-medium mr-2">Trump Suit:</span>
              <span className="text-3xl">{getSuitSymbol(gameState.trumpSuit)}</span>
              <span className="text-lg font-bold ml-2 capitalize">{gameState.trumpSuit}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Game Table */}
      <Card className="bg-gradient-to-br from-green-800 to-green-900 border-amber-700 border-4 relative">
        <CardContent className="p-8">
          <div className="relative h-[500px]">
            {/* Center area - Current Trick */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-64 h-64">
                {gameState.currentTrick.cards.map((playedCard, index) => {
                  const playerIndex = gameState.players.findIndex(p => p.id === playedCard.playerId);
                  const position = getPlayerPosition(playerIndex);
                  
                  const positionStyles = {
                    bottom: 'bottom-0 left-1/2 -translate-x-1/2',
                    top: 'top-0 left-1/2 -translate-x-1/2',
                    left: 'left-0 top-1/2 -translate-y-1/2',
                    right: 'right-0 top-1/2 -translate-y-1/2'
                  };
                  
                  return (
                    <div
                      key={playedCard.card.id}
                      className={`absolute ${positionStyles[position as keyof typeof positionStyles]}`}
                    >
                      <PlayingCard card={playedCard.card} size="md" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Players Info */}
            {gameState.players.map((player, index) => {
              const position = getPlayerPosition(index);
              const isCurrent = gameState.currentPlayerIndex === index;
              
              const containerStyles = {
                bottom: 'bottom-4 left-1/2 -translate-x-1/2',
                top: 'top-4 left-1/2 -translate-x-1/2',
                left: 'left-4 top-1/2 -translate-y-1/2',
                right: 'right-4 top-1/2 -translate-y-1/2'
              };
              
              return (
                <div
                  key={player.id}
                  className={`absolute ${containerStyles[position as keyof typeof containerStyles]}`}
                >
                  <div className={`bg-slate-800 rounded-lg px-4 py-2 border-2 ${
                    isCurrent ? 'border-yellow-400 shadow-lg shadow-yellow-400/50' : 'border-slate-600'
                  }`}>
                    <div className="text-white font-bold">{player.nickname}</div>
                    <div className="text-amber-400 text-sm">Tricks: {player.tricksWon}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* My Hand */}
      {myPlayer && (
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-amber-700 border-2">
          <CardContent className="p-4">
            <div className="mb-2 text-center">
              <span className="text-amber-400 font-bold text-lg">Your Hand</span>
              {isMyTurn && (
                <span className="ml-4 text-green-400 font-bold animate-pulse">Your Turn!</span>
              )}
            </div>
            <div className="flex justify-center gap-2 flex-wrap">
              {myPlayer.cards.map(card => {
                const canPlay = isMyTurn && canPlayCard(card, myPlayer.cards, gameState.currentTrick.leadSuit);
                return (
                  <div
                    key={card.id}
                    onClick={() => handleCardClick(card)}
                    className={canPlay ? 'cursor-pointer hover:-translate-y-2 transition-transform' : 'opacity-60'}
                  >
                    <PlayingCard card={card} size="md" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trick Complete / Round Complete */}
      {(isComplete !== '') && (
        <Card className="bg-gradient-to-r from-green-600 to-green-700 border-green-500 border-2">
          <CardContent className="p-6 text-center">
            {isComplete === 'trick-complete' && (
              <>
                <div className="text-white text-xl font-bold mb-4">
                  Trick Won by {gameState.players.find(p => p.id === gameState.lastWinner)?.nickname}
                </div>
              </>
            )}
            {isComplete === 'round-complete' && (
              <>
                <div className="text-white text-2xl font-bold mb-2">Round Complete!</div>
                <div className="text-green-100 mb-4">
                  Team 1: {gameState.players[0].tricksWon + gameState.players[2].tricksWon} tricks
                  {' | '}
                  Team 2: {gameState.players[1].tricksWon + gameState.players[3].tricksWon} tricks
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
