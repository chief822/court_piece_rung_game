import { Card as CardType } from '@/types/game';
import { getSuitSymbol, getSuitColor } from '@/lib/card-utils';

interface PlayingCardProps {
  card: CardType;
  size?: 'sm' | 'md' | 'lg';
}

export default function PlayingCard({ card, size = 'md' }: PlayingCardProps) {
  const sizeClasses = {
    sm: 'w-16 h-24 text-lg',
    md: 'w-20 h-28 text-xl',
    lg: 'w-24 h-36 text-2xl'
  };

  return (
    <div className={`${sizeClasses[size]} bg-white rounded-lg shadow-lg border-2 border-gray-300 flex flex-col p-2 relative`}>
      {/* Top-left corner */}
      <div className={`${getSuitColor(card.suit)} font-bold leading-none`}>
        <div>{card.rank}</div>
        <div className="text-2xl">{getSuitSymbol(card.suit)}</div>
      </div>
      
      {/* Center symbol */}
      <div className={`absolute inset-0 flex items-center justify-center ${getSuitColor(card.suit)} text-5xl opacity-20`}>
        {getSuitSymbol(card.suit)}
      </div>
      
      {/* Bottom-right corner (rotated) */}
      <div className={`${getSuitColor(card.suit)} font-bold leading-none absolute bottom-2 right-2 rotate-180`}>
        <div>{card.rank}</div>
        <div className="text-2xl">{getSuitSymbol(card.suit)}</div>
      </div>
    </div>
  );
}