import type { GameState, Player, Card, Suit, PlayerPosition, Trick, ChatMessage } from '@/types/game';
import { createDeck, shuffleDeck, dealCards, determineWinner } from './card-utils';

/**
 * Returns a random integer between min and max (both inclusive).
 */
function getRandomInt(min: number, max: number): number {
  // Ensure the inputs are treated as integers
  min = Math.ceil(min);
  max = Math.floor(max);
  
  // The +1 makes the maximum value possible
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Randomly returns either valueA or valueB.
 */
function pickOne(valueA: number, valueB: number): number {
  return Math.random() < 0.5 ? valueA : valueB;
}

export function createInitialGameState(players: Array<{ id: string; nickname: string }>): GameState {
  const positions: PlayerPosition[] = [0, 1, 2, 3];
  
  const gamePlayers: Player[] = players.map((p, index) => ({
    id: p.id,
    nickname: p.nickname,
    position: positions[index],
    cards: [],
    cardsWon: [],
    tricksWon: 0
  }));

  return {
    phase: 'waiting',
    players: gamePlayers,
    trumpSuit: null,
    trumpCallerId: null,
    currentTrick: { cards: [], winner: null, leadSuit: null },
    accumalatedTricksAfterLastWinner: [],
    completedTricks: 0,
    currentPlayerIndex: 0,
    dealerIndex: getRandomInt(0, 3),
    team1Score: 0,
    team2Score: 0,
    team1DealsWon: 0,
    team2DealsWon: 0,
    team1Courts: 0,
    team2Courts: 0,
    consecutiveDealsWinner: null,
    consecutiveDealsCount: 0,
    roundNumber: 1,
    prevTrickWinner: null,
    chatMessages: []
  };
}

export function startNewRound(state: GameState): GameState {
  const deck = shuffleDeck(createDeck());
  const hands = dealCards(deck, 4);
  
  // Trump caller is to the right of dealer (counter-clockwise, so index - 1)
  const trumpCallerIndex = (state.dealerIndex - 1 + 4) % 4;
  
  const newPlayers = state.players.map((p, index) => ({
    ...p,
    cards: hands[index],
    tricksWon: 0
  }));

  const currentTrick = { cards: [], winner: null, leadSuit: null };
  return {
    ...state,
    phase: 'trump-selection',
    players: newPlayers,
    trumpSuit: null,
    trumpCallerId: newPlayers[trumpCallerIndex].id,
    currentTrick,
    completedTricks: 0,
    currentPlayerIndex: trumpCallerIndex,
    prevTrickWinner: null,
    accumalatedTricksAfterLastWinner: [currentTrick]
  };
}

export function selectTrump(state: GameState, suit: Suit): GameState {
  if (state.phase !== 'trump-selection') return state;
  
  return {
    ...state,
    phase: 'playing',
    trumpSuit: suit
  };
}

// returns team number if anyone won yet otherwise null
function getWinnerTeam(state: GameState): number | null {
  const team1Tricks = state.players[0].tricksWon + state.players[2].tricksWon;
  const team2Tricks = state.players[1].tricksWon + state.players[3].tricksWon;
  if (team1Tricks >= 7) {
    return 1;
  }
  else if (team2Tricks >= 7) {
    return 2;
  }
  return null;
}

export function playCard(state: GameState, playerId: string, card: Card): GameState {
  if (state.phase !== 'playing') return state;
  
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex !== state.currentPlayerIndex) return state;
  
  const player = state.players[playerIndex];
  const cardIndex = player.cards.findIndex(c => c.id === card.id);
  if (cardIndex === -1) return state;
  
  // Remove card from player's hand
  const newPlayers = state.players.map((p, idx) => {
    if (idx === playerIndex) {
      return {
        ...p,
        cards: p.cards.filter(c => c.id !== card.id)
      };
    }
    return p;
  });
  
  // Add card to current trick
  const newTrick: Trick = {
    cards: [...state.currentTrick.cards, { card, playerId }],
    winner: null,
    leadSuit: state.currentTrick.leadSuit || card.suit
  };

  const newAccumalatedTricksAfterLastWinner = [...state.accumalatedTricksAfterLastWinner.slice(0, -1), newTrick];
  
  // Check if trick is complete (4 cards played)
  if (newTrick.cards.length === 4) {
    const completedTricks = state.completedTricks + 1;
    const winnerId = determineWinner(newTrick.cards, newTrick.leadSuit!, state.trumpSuit);
    const winnerIndex = state.players.findIndex(p => p.id === winnerId);

    newTrick.winner = winnerId;
    
    // check if someone won
    if (completedTricks > 2 && ((newTrick.winner === state.prevTrickWinner && newAccumalatedTricksAfterLastWinner.length > 1) || completedTricks === 13)) {
      // Update tricks won
      const playersWithTricks: Player[] = newPlayers.map((p, idx) => {
        if (idx === winnerIndex) {
          return {
            ...p,
            tricksWon: p.tricksWon + newAccumalatedTricksAfterLastWinner.length,
            cardsWon: [
              ...p.cardsWon,
              ...newAccumalatedTricksAfterLastWinner.flatMap(trick =>
                trick.cards.map(obj => obj.card)
              )
            ]
          };
        }
        return p;
      });

      return {
        ...state,
        players: playersWithTricks,
        currentTrick: newTrick,
        completedTricks,
        currentPlayerIndex: winnerIndex,
        prevTrickWinner: winnerId,
        phase: 'trick-complete-with-winner',
        accumalatedTricksAfterLastWinner: newAccumalatedTricksAfterLastWinner
      }
    }
    
    return {
      ...state,
      players: newPlayers,
      currentTrick: newTrick,
      completedTricks,
      currentPlayerIndex: winnerIndex,
      prevTrickWinner: winnerId,
      phase: 'trick-complete-without-winner',
      accumalatedTricksAfterLastWinner: newAccumalatedTricksAfterLastWinner
    };
  }
  
  // Move to next player (counter-clockwise)
  const nextPlayerIndex = (state.currentPlayerIndex - 1 + 4) % 4;
  
  return {
    ...state,
    players: newPlayers,
    currentTrick: newTrick,
    currentPlayerIndex: nextPlayerIndex,
    accumalatedTricksAfterLastWinner: newAccumalatedTricksAfterLastWinner
  };
}

export function continueAfterTrick(state: GameState): GameState {
  if (!(state.phase === 'trick-complete-with-winner' || state.phase === 'trick-complete-without-winner')) {
    return state;
  }
  const currentTrick = { cards: [], winner: null, leadSuit: null };

  if (state.phase === 'trick-complete-with-winner') {
    if (getWinnerTeam(state) != null) {
      const newState = completeRound(state);
      return {
        ...newState,
        phase: 'round-complete',
      }
    }
    return {
      ...state,
      phase: 'playing',
      currentTrick,
      accumalatedTricksAfterLastWinner: [currentTrick]
    };
  }
  

  return {
    ...state,
    phase: 'playing',
    currentTrick,
    accumalatedTricksAfterLastWinner: [...state.accumalatedTricksAfterLastWinner, currentTrick]
  };
}

function completeRound(state: GameState): GameState {
  let newState = { ...state };
  let team1DealsWon = state.team1DealsWon;
  let team2DealsWon = state.team2DealsWon;
  let dealerIndex: number = -1;

  const dealWinner = getWinnerTeam(state);
  if (dealWinner === null) {
    // invalid function call
    console.log("Invalid valid call round not complete");
    return state;
  }
  if (dealWinner === 1) {
    team1DealsWon++;
    dealerIndex = pickOne(1, 3);
  }
  else {
    team2DealsWon++;
    dealerIndex = pickOne(0, 2);
  }

  newState = {
    ...newState,
    team1DealsWon,
    team2DealsWon,
    dealerIndex,
    roundNumber: state.roundNumber + 1
  };

  return newState
  // let team1Courts = state.team1Courts;
  // let team2Courts = state.team2Courts;
  // let consecutiveWinner = state.consecutiveDealsWinner;
  // let consecutiveCount = state.consecutiveDealsCount;
  
  // // Check for 52-court (bavney)
  // if (team1Tricks === 13) {
  //   team1Courts += 52;
  //   consecutiveWinner = null;
  //   consecutiveCount = 0;
  // } else if (team2Tricks === 13) {
  //   team2Courts += 52;
  //   consecutiveWinner = null;
  //   consecutiveCount = 0;
  // } else {
  //   // Determine deal winner
  //   const dealWinner = team1Tricks >= 7 ? 1 : 2;
    
  //   if (dealWinner === 1) {
  //     team1DealsWon++;
  //   } else {
  //     team2DealsWon++;
  //   }
    
  //   // Check for goon court (first 7 consecutive tricks)
  //   // TODO: fix later grand court winner check
  //   const first7Tricks = state.completedTricks.slice(0, 7);
  //   const first7Winners = first7Tricks.map(t => {
  //     const winnerIndex = state.players.findIndex(p => p.id === t.winner);
  //     return winnerIndex % 2 === 0 ? 1 : 2;
  //   });
    
  //   if (first7Winners.every(w => w === 1)) {
  //     team1Courts++;
  //   } else if (first7Winners.every(w => w === 2)) {
  //     team2Courts++;
  //   }
    
  //   // Check for 7 consecutive deals (regular court)
  //   if (consecutiveWinner === dealWinner) {
  //     consecutiveCount++;
  //     if (consecutiveCount === 7) {
  //       if (dealWinner === 1) {
  //         team1Courts++;
  //       } else {
  //         team2Courts++;
  //       }
  //       consecutiveWinner = null;
  //       consecutiveCount = 0;
  //     }
  //   } else {
  //     consecutiveWinner = dealWinner;
  //     consecutiveCount = 1;
  //   }
  // }
  
  // // Determine next dealer
  // let nextDealer = state.dealerIndex;
  // if (trumpCallerTeam === 1 && team1Tricks >= 7) {
  //   // Same dealer if trump caller's team wins without a court
  //   nextDealer = state.dealerIndex;
  // } else if (trumpCallerTeam === 2 && team2Tricks >= 7) {
  //   nextDealer = state.dealerIndex;
  // } else {
  //   // Rotate dealer counter-clockwise
  //   nextDealer = (state.dealerIndex - 1 + 4) % 4;
  // }
  
  // newState = {
  //   ...newState,
  //   team1DealsWon,
  //   team2DealsWon,
  //   team1Courts,
  //   team2Courts,
  //   consecutiveDealsWinner: consecutiveWinner,
  //   consecutiveDealsCount: consecutiveCount,
  //   dealerIndex: nextDealer,
  //   roundNumber: state.roundNumber + 1
  // };
  
  // return newState;
}

export function addChatMessage(state: GameState, message: ChatMessage): GameState {
  return {
    ...state,
    chatMessages: [...state.chatMessages, message]
  };
}
