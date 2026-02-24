import type { Card, Suit, Rank } from '@/types/game';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

// Rank values for comparison (Ace is highest)
const RANK_VALUES: Record<Rank, number> = {
  'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10, '9': 9, '8': 8,
  '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2
};

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        suit,
        rank,
        id: `${suit}-${rank}`
      });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealCards(deck: Card[], numPlayers: number = 4): Card[][] {
  const hands: Card[][] = Array.from({ length: numPlayers }, () => []);
  
  // Deal 5 cards first to each player
  for (let i = 0; i < 5; i++) {
    for (let p = 0; p < numPlayers; p++) {
      hands[p].push(deck[i * numPlayers + p]);
    }
  }
  
  // Deal remaining cards in packets of 4
  const remainingStart = 5 * numPlayers;
  for (let i = 0; i < 8; i++) { // 8 more cards per player
    for (let p = 0; p < numPlayers; p++) {
      const cardIndex = remainingStart + i * numPlayers + p;
      if (cardIndex < deck.length) {
        hands[p].push(deck[cardIndex]);
      }
    }
  }
  
  return hands;
}

export function sortHand(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    // Sort by suit first, then by rank
    if (a.suit !== b.suit) {
      return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
    }
    return RANK_VALUES[b.rank] - RANK_VALUES[a.rank];
  });
}

export function canPlayCard(
  card: Card,
  hand: Card[],
  leadSuit: Suit | null,
  trumpSuit: Suit,
): boolean {
  if (!leadSuit) return true; // First card of trick
  
  // Must follow suit if possible
  const hasLeadSuit = hand.some(c => c.suit === leadSuit);
  if (hasLeadSuit) {
    return card.suit === leadSuit;
  }

  // doesn't have any card of lead suit type check if he has trump
  const hasTrumpSuit = hand.some(c => c.suit === trumpSuit);
  if (hasTrumpSuit) {
    return card.suit === trumpSuit;
  }
  
  // Can play any card if no cards of lead suit or trump suit
  return true;
}

export function determineWinner(
  cards: { card: Card; playerId: string }[],
  leadSuit: Suit,
  trumpSuit: Suit | null
): string {
  let winner = cards[0];
  
  for (let i = 1; i < cards.length; i++) {
    const current = cards[i];
    
    // Trump beats non-trump
    if (trumpSuit) {
      if (current.card.suit === trumpSuit && winner.card.suit !== trumpSuit) {
        winner = current;
        continue;
      }
      if (winner.card.suit === trumpSuit && current.card.suit !== trumpSuit) {
        continue;
      }
      
      // Both trump - higher wins
      if (current.card.suit === trumpSuit && winner.card.suit === trumpSuit) {
        if (RANK_VALUES[current.card.rank] > RANK_VALUES[winner.card.rank]) {
          winner = current;
        }
        continue;
      }
    }
    
    // Both same suit (lead suit) - higher wins
    if (current.card.suit === leadSuit && winner.card.suit === leadSuit) {
      if (RANK_VALUES[current.card.rank] > RANK_VALUES[winner.card.rank]) {
        winner = current;
      }
    }
  }
  
  return winner.playerId;
}

export function getSuitSymbol(suit: Suit): string {
  const symbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  };
  return symbols[suit];
}

export function getSuitColor(suit: Suit): string {
  return suit === 'hearts' || suit === 'diamonds' ? 'text-red-600' : 'text-gray-900';
}
