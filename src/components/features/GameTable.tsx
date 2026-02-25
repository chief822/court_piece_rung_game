import { Card as CardType, GamePhase, GameState, SUIT_INDEX, RANK_INDEX, Suit, Rank } from '@/types/game';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PlayingCard from './PlayingCard';
import { canPlayCard } from '@/lib/card-utils';
import { getSuitSymbol } from '@/lib/card-utils';
import { ArrowRight } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import {useTimer} from 'react-timer-hook';
import { motion } from 'framer-motion';

interface GameTableProps {
  gameState: GameState;
  myId: string;
  onPlayCard: (card: CardType) => void;
  onContinue: () => void;
}

type TimerProps = {
  expiryTimestamp: Date;
  handleExpire: () => void;
}

function hashStringToNumber(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // force 32-bit
  }
  return Math.abs(hash);
}

function deterministicRandom3(
  seed: number
): [number, number, number] {
  const a = 1664525;
  const c = 1013904223;
  const m = 2 ** 32;

  let x = seed >>> 0;

  function next01(): number {
    x = (a * x + c) % m;
    return x / m; // [0, 1)
  }

  const r1 = next01() * 50;    // [0, 50)
  const r2 = next01() * 50;    // [0, 50)
  const angle = next01() * 360; // [0, 360)

  return [-25 + r1, 25 + r2, angle];
}

function getCardPileTransform(card: { suit: Suit; rank: Rank }) {
  const seed = hashStringToNumber(`${card.rank}-${card.suit}`);

  return deterministicRandom3(seed);
}

export default function GameTable({ gameState, myId, onPlayCard, onContinue }: GameTableProps) {
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
    
    const canPlay = canPlayCard(card, myPlayer.cards, gameState.currentTrick.leadSuit, gameState.trumpSuit);
    if (canPlay) {
      onPlayCard(card);
    }
  };

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

            {/* Center area - Accumulated Pile */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-64 h-64">
                {gameState.accumalatedTricksAfterLastWinner
                  ?.flatMap(trick => trick.cards)
                  .map((playedCard, index) => {
                    const playerIndex = gameState.players.findIndex(
                      p => p.id === playedCard.playerId
                    );

                    const position = getPlayerPosition(playerIndex);
                    const [offsetX, offsetY, rotation] = getCardPileTransform(playedCard.card);
                    
                    // according to test translate-x or -y doesnt work. framer motion is probably overriding it
                    // but top, botttom, left, right are working so use them, havent checked if rotate

                    const positionStyles = {
                      bottom: {
                        bottom: `${offsetX}%`,
                        left: `${offsetY}%`
                      },
                      top: {
                        top: `${offsetX}%`,
                        left: `${offsetY}%`
                      },
                      left: {
                        left: `${offsetX}%`,
                        top: `${offsetY}%`
                      },
                      right: {
                        right: `${offsetX}%`,
                        top: `${offsetY}%`
                      }
                    };

                    return (
                      <motion.div
                        key={playedCard.card.id}
                        layoutId={`card-${playedCard.card.id}`}
                        style={{ 
                          zIndex: 100,
                          position: 'absolute',
                          ...positionStyles[position]
                        }}
                        initial={{ scale: 1.1 }}
                        animate={{ scale: 1, rotate: rotation }}
                        transition={{
                          type: 'spring',
                          stiffness: 180,   // 👈 much slower
                          damping: 30,
                          mass: 1.2,
                          delay: playedCard.playerId === myId ? 0 : 0.2
                        }}
                      >
                        <PlayingCard card={playedCard.card} size="md" />
                      </motion.div>
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
                    {player.cardsWon.map((wonCard) => {
                      return (
                          <motion.div
                            key={wonCard.id}
                            layoutId={`card-${wonCard.id}`}
                            initial={{ scale: 1.1 }}
                            animate={{ scale: 1, opacity: 0 }}
                            transition={{
                              type: 'tween',
                              duration: 1.5,
                              ease: 'easeInOut'   // makes it smooth
                            }}
                            style={{ position: 'absolute' }}
                          >
                            <PlayingCard card={wonCard} size="md" />
                          </motion.div>
                        );
                      })}
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
              {myPlayer.cards
                .slice()
                .sort(
                  (a, b) =>
                    SUIT_INDEX[a.suit] - SUIT_INDEX[b.suit] ||
                    RANK_INDEX[a.rank] - RANK_INDEX[b.rank]
                )
                .map(card => {
                  const canPlay = isMyTurn && canPlayCard(card, myPlayer.cards, gameState.currentTrick.leadSuit, gameState.trumpSuit);

                  return (
                    <motion.div
                      key={card.id}
                      layoutId={`card-${card.id}`}
                      onClick={() => handleCardClick(card)}
                      className="relative select-none cursor-pointer rounded-xl" // Added rounded-xl so the glow wraps nicely
                      
                      // 1. Let Framer Motion handle the opacity based on playability
                      animate={{ 
                        opacity: canPlay ? 1 : 0.6 
                      }}
                      
                      // 2. Let Framer Motion handle the hover glow effect dynamically
                      whileHover={
                        canPlay ? { 
                          boxShadow: "0px 0px 20px 4px rgba(255, 215, 0, 0.6)",
                          y: -5 // Lifts the card up slightly on hover
                        } : {}
                      }
                      
                      transition={{
                        type: 'spring',
                        stiffness: 200,
                        damping: 30
                      }}
                    >
                      <PlayingCard card={card} size="md" />
                    </motion.div>
                  );
                })
              }
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
