import { Card as CardType, Suit } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PlayingCard from './PlayingCard';
import { getSuitSymbol } from '@/lib/card-utils';

interface TrumpSelectionProps {
  firstFiveCards: CardType[];
  onSelectTrump: (suit: Suit) => void;
}

export default function TrumpSelection({ firstFiveCards, onSelectTrump }: TrumpSelectionProps) {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  
  // Count suits in first 5 cards
  const suitCounts = suits.reduce((acc, suit) => {
    acc[suit] = firstFiveCards.filter(c => c.suit === suit).length;
    return acc;
  }, {} as Record<Suit, number>);

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-amber-600 to-amber-700 border-amber-500 border-2">
        <CardHeader>
          <CardTitle className="text-white text-2xl text-center">
            You are the Trump Caller!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-amber-100 text-center mb-4">
            Select the trump suit from your first 5 cards
          </p>
          
          {/* First 5 Cards */}
          <div className="flex justify-center gap-2 mb-6">
            {firstFiveCards.map(card => (
              <PlayingCard
                key={card.id}
                card={card}
                size="md"
              />
            ))}
          </div>
          
          {/* Suit Selection Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {suits.map(suit => (
              <Button
                key={suit}
                onClick={() => onSelectTrump(suit)}
                className={`h-20 text-xl font-bold ${
                  suit === 'hearts' || suit === 'diamonds'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-gray-800 hover:bg-gray-900'
                } text-white`}
              >
                <span className="text-4xl mr-2">{getSuitSymbol(suit)}</span>
                <div className="text-left">
                  <div className="capitalize">{suit}</div>
                  <div className="text-sm opacity-80">({suitCounts[suit]} cards)</div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
