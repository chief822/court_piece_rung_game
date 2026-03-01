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

  return [-25 + r1, -25 + r2, angle];
}

function getCardPileTransform(card: { suit: Suit; rank: Rank }) {
  const seed = hashStringToNumber(`${card.rank}-${card.suit}`);

  return deterministicRandom3(seed);
}

export default function GameTable({ gameState, myId, onPlayCard, onContinue }: GameTableProps) {
  const myPlayer = gameState.players.find(p => p.id === myId);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === myId && gameState.phase === 'playing';
  const pileContainerRef = useRef<HTMLDivElement>(null);

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
    <div className="flex flex-col h-full gap-4 pb-6">
      {/* Game Table / Center Pile */}
      <div className="flex-1 relative min-h-[350px]">
        <Card className="bg-gradient-to-br from-green-800 to-green-900 border-amber-700 border-4 h-full">
          <CardContent className="p-8 h-full flex flex-col">
            <div className="relative flex-1">
              {/* Center pile */}
              <div ref={pileContainerRef} className="absolute inset-0 flex items-center justify-center">
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

                      // const positionStyles = {
                      //   bottom: {
                      //     bottom: `${offsetX}%`,
                      //     left: `${offsetY}%`
                      //   },
                      //   top: {
                      //     top: `${offsetX}%`,
                      //     left: `${offsetY}%`
                      //   },
                      //   left: {
                      //     left: `${offsetX}%`,
                      //     top: `${offsetY}%`
                      //   },
                      //   right: {
                      //     right: `${offsetX}%`,
                      //     top: `${offsetY}%`
                      //   }
                      // };
                      const container = pileContainerRef.current;
                      const offsetXpx = (container?.offsetWidth || 1) * (offsetX / 100);
                      const offsetYpx = (container?.offsetHeight || 1) * (offsetY / 100);

                      return (
                        <motion.div
                          key={playedCard.card.id}
                          layoutId={`card-${playedCard.card.id}`}
                          style={{ 
                            zIndex: 100,
                            position: 'absolute',
                            // ...positionStyles[position]
                          }}
                          initial={{ scale: 1.1 }}
                          animate={{ 
                            scale: 1,
                            rotate: rotation,
                            x: offsetXpx,
                            y: offsetYpx
                          }}
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
                        {player.cards.map((cardInHand) => {
                          return (
                            <motion.div
                              key={cardInHand.id}
                              layoutId={`card-${cardInHand.id}`}
                              initial={{ scale: 1.1 }}
                              animate={{ scale: 1, opacity: 0 }}
                              transition={{
                                type: 'tween',
                                duration: 0,  // make it instant to avoid revealing private info
                                ease: 'easeInOut'   // makes it smooth
                              }}
                              style={{ position: 'absolute' }}
                            >
                              <PlayingCard card={cardInHand} size="md" />
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
      </div>

      {/* My Hand */}
      {myPlayer && (
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-amber-700 border-2">
          <CardContent className="pr-[4rem]">
            <div className="mb-2 text-center pt-4">
              <span className="text-amber-400 font-bold text-lg">Your Hand</span>
              {isMyTurn && (
                <span className="ml-4 text-green-400 font-bold animate-pulse">Your Turn!</span>
              )}
            </div>
            {/* 1. Outer Container: Handles full width, padding, and scrollbars entirely */}
            <div
              className="
                w-full overflow-x-auto pb-2 px-2 pt-6
                scroll-pl-6

                scrollbar-thin
                scrollbar-thumb-slate-600
                scrollbar-track-transparent
                hover:scrollbar-thumb-slate-500
              "
            >
              {/* 2. Inner Container: Uses 'w-max' and 'mx-auto' to dynamically center or align-left */}
              <div className="flex gap-0 w-max mx-auto">
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
                        className="relative select-none cursor-pointer rounded-xl"
                        
                        animate={{ 
                          filter: canPlay ? 'brightness(1)' : 'brightness(0.6)'
                        }}
                        
                        whileHover={
                          canPlay ? {
                            y: -20
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
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
