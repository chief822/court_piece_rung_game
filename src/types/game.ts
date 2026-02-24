// Game Types for Court Piece (Rung)

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // unique identifier
}

export const SUIT_ORDER: Suit[] = [
  'spades',
  'hearts',
  'diamonds',
  'clubs',
];

export const RANK_ORDER: Rank[] = [
  'A',
  'K',
  'Q',
  'J',
  '10',
  '9',
  '8',
  '7',
  '6',
  '5',
  '4',
  '3',
  '2',
];

export const RANK_INDEX = Object.fromEntries(
  RANK_ORDER.map((r, i) => [r, i])
) as Record<Rank, number>;

export const SUIT_INDEX = Object.fromEntries(
  SUIT_ORDER.map((s, i) => [s, i])
) as Record<Suit, number>;

export type PlayerPosition = 0 | 1 | 2 | 3; // 0=bottom, 1=left, 2=top, 3=right

export interface Player {
  id: string;
  nickname: string;
  position: PlayerPosition;
  cards: Card[];
  tricksWon: number;
}

export interface Trick {
  cards: { card: Card; playerId: string }[];
  winner: string | null;
  leadSuit: Suit | null;
}

export type GamePhase = 'waiting' | 'trump-selection' | 'playing' | 'trick-complete-without-winner' | 'trick-complete-with-winner' | 'round-complete' | 'game-over';

export interface GameState {
  phase: GamePhase;
  players: Player[];
  trumpSuit: Suit | null;
  trumpCallerId: string | null;
  currentTrick: Trick;
  accumalatedTricksAfterLastWinner: Trick[];
  completedTricks: number;
  currentPlayerIndex: number;
  dealerIndex: number;
  
  // Scoring
  team1Score: number; // players 0 & 2
  team2Score: number; // players 1 & 3
  team1DealsWon: number;
  team2DealsWon: number;
  team1Courts: number;
  team2Courts: number;
  consecutiveDealsWinner: 1 | 2 | null;
  consecutiveDealsCount: number;
  
  prevTrickWinner: string | null;
  
  // Round info
  roundNumber: number;
  
  // Chat
  chatMessages: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  playerId: string;
  nickname: string;
  message: string;
  timestamp: number;
}

export interface RoomState {
  roomCode: string;
  players: Array<{
    id: string;
    nickname: string;
    isReady: boolean;
    isHost: boolean;
  }>;
  hostId: string;
  gameStarted: boolean;
}

// Network Messages
export type NetworkMessage =
  | { type: 'player-ready'; playerId: string }
  | { type: 'start-game' }
  | { type: 'trump-selected'; suit: Suit }
  | { type: 'card-played'; card: Card; playerId: string }
  | { type: 'chat-message'; message: ChatMessage }
  | { type: 'game-state-sync'; state: Partial<GameState> }
  | { type: 'request-state-sync' };
