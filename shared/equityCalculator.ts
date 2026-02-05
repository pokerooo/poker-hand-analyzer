/**
 * Poker Equity Calculator using Monte Carlo simulation
 * Calculates win probability for hero's hand against villain's estimated range
 */

// Card representation
export interface Card {
  rank: string; // A, K, Q, J, T, 9, 8, 7, 6, 5, 4, 3, 2
  suit: string; // h, d, s, c
}

// Hand evaluation rankings
enum HandRank {
  HIGH_CARD = 0,
  PAIR = 1,
  TWO_PAIR = 2,
  THREE_OF_A_KIND = 3,
  STRAIGHT = 4,
  FLUSH = 5,
  FULL_HOUSE = 6,
  FOUR_OF_A_KIND = 7,
  STRAIGHT_FLUSH = 8,
  ROYAL_FLUSH = 9
}

const RANK_VALUES: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

/**
 * Parse card string (e.g., "As", "Kh") to Card object
 */
function parseCard(cardStr: string): Card {
  return {
    rank: cardStr[0],
    suit: cardStr[1].toLowerCase()
  };
}

/**
 * Evaluate poker hand strength
 * Returns [handRank, tiebreakers...]
 */
function evaluateHand(cards: Card[]): number[] {
  if (cards.length < 5) return [HandRank.HIGH_CARD, 0];
  
  // Sort by rank value
  const sorted = [...cards].sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
  
  // Count ranks and suits
  const rankCounts = new Map<string, number>();
  const suitCounts = new Map<string, number>();
  
  sorted.forEach(card => {
    rankCounts.set(card.rank, (rankCounts.get(card.rank) || 0) + 1);
    suitCounts.set(card.suit, (suitCounts.get(card.suit) || 0) + 1);
  });
  
  const isFlush = Array.from(suitCounts.values()).some(count => count >= 5);
  const isStraight = checkStraight(sorted);
  
  // Get rank counts sorted by frequency
  const counts = Array.from(rankCounts.entries())
    .sort((a, b) => b[1] - a[1] || RANK_VALUES[b[0]] - RANK_VALUES[a[0]]);
  
  // Royal Flush
  if (isFlush && isStraight && sorted[0].rank === 'A' && sorted[1].rank === 'K') {
    return [HandRank.ROYAL_FLUSH, 14];
  }
  
  // Straight Flush
  if (isFlush && isStraight) {
    return [HandRank.STRAIGHT_FLUSH, RANK_VALUES[sorted[0].rank]];
  }
  
  // Four of a Kind
  if (counts[0][1] === 4) {
    return [HandRank.FOUR_OF_A_KIND, RANK_VALUES[counts[0][0]], RANK_VALUES[counts[1][0]]];
  }
  
  // Full House
  if (counts[0][1] === 3 && counts[1][1] >= 2) {
    return [HandRank.FULL_HOUSE, RANK_VALUES[counts[0][0]], RANK_VALUES[counts[1][0]]];
  }
  
  // Flush
  if (isFlush) {
    const flushCards = sorted.filter(c => c.suit === Array.from(suitCounts.entries()).find(([, count]) => count >= 5)?.[0])
      .slice(0, 5);
    return [HandRank.FLUSH, ...flushCards.map(c => RANK_VALUES[c.rank])];
  }
  
  // Straight
  if (isStraight) {
    return [HandRank.STRAIGHT, RANK_VALUES[sorted[0].rank]];
  }
  
  // Three of a Kind
  if (counts[0][1] === 3) {
    return [HandRank.THREE_OF_A_KIND, RANK_VALUES[counts[0][0]], RANK_VALUES[counts[1][0]], RANK_VALUES[counts[2][0]]];
  }
  
  // Two Pair
  if (counts[0][1] === 2 && counts[1][1] === 2) {
    return [HandRank.TWO_PAIR, RANK_VALUES[counts[0][0]], RANK_VALUES[counts[1][0]], RANK_VALUES[counts[2][0]]];
  }
  
  // Pair
  if (counts[0][1] === 2) {
    return [HandRank.PAIR, RANK_VALUES[counts[0][0]], RANK_VALUES[counts[1][0]], RANK_VALUES[counts[2][0]], RANK_VALUES[counts[3][0]]];
  }
  
  // High Card
  return [HandRank.HIGH_CARD, ...sorted.slice(0, 5).map(c => RANK_VALUES[c.rank])];
}

function checkStraight(sorted: Card[]): boolean {
  const uniqueRanks = Array.from(new Set(sorted.map(c => RANK_VALUES[c.rank]))).sort((a, b) => b - a);
  
  // Check for regular straight
  for (let i = 0; i <= uniqueRanks.length - 5; i++) {
    if (uniqueRanks[i] - uniqueRanks[i + 4] === 4) {
      return true;
    }
  }
  
  // Check for A-2-3-4-5 (wheel)
  if (uniqueRanks.includes(14) && uniqueRanks.includes(5) && uniqueRanks.includes(4) && 
      uniqueRanks.includes(3) && uniqueRanks.includes(2)) {
    return true;
  }
  
  return false;
}

/**
 * Compare two hands
 * Returns: 1 if hand1 wins, -1 if hand2 wins, 0 if tie
 */
function compareHands(hand1: number[], hand2: number[]): number {
  for (let i = 0; i < Math.max(hand1.length, hand2.length); i++) {
    const v1 = hand1[i] || 0;
    const v2 = hand2[i] || 0;
    if (v1 > v2) return 1;
    if (v1 < v2) return -1;
  }
  return 0;
}

/**
 * Generate a random deck excluding known cards
 */
function generateDeck(excludeCards: Card[]): Card[] {
  const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
  const suits = ['h', 'd', 's', 'c'];
  const deck: Card[] = [];
  
  const excludeSet = new Set(excludeCards.map(c => `${c.rank}${c.suit}`));
  
  for (const rank of ranks) {
    for (const suit of suits) {
      if (!excludeSet.has(`${rank}${suit}`)) {
        deck.push({ rank, suit });
      }
    }
  }
  
  return deck;
}

/**
 * Shuffle array in place
 */
function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Estimate villain's range based on actions and position
 * Returns a simplified range (percentage of hands)
 */
export function estimateVillainRange(position: string, actions: string[]): number {
  // Simplified range estimation
  // In a real implementation, this would be much more sophisticated
  
  let rangePercent = 100;
  
  // Adjust based on position
  if (position === 'UTG' || position === 'UTG+1') rangePercent = 15;
  else if (position === 'UTG+2') rangePercent = 18;
  else if (position === 'CO') rangePercent = 25;
  else if (position === 'BTN') rangePercent = 45;
  else if (position === 'SB') rangePercent = 40;
  else if (position === 'BB') rangePercent = 100;
  
  // Adjust based on actions
  for (const action of actions) {
    if (action.includes('raise') || action.includes('3bet')) {
      rangePercent *= 0.4; // Narrow range significantly
    } else if (action.includes('call')) {
      rangePercent *= 0.7; // Narrow range moderately
    }
  }
  
  return Math.max(rangePercent, 5); // Minimum 5% range
}

/**
 * Calculate equity using Monte Carlo simulation
 */
export function calculateEquity(
  heroCards: string[], // e.g., ["As", "Kh"]
  boardCards: string[], // e.g., ["Qd", "Jc", "Ts"]
  villainRange: number = 50, // Percentage of hands villain could have
  simulations: number = 1000
): {
  equity: number;
  wins: number;
  ties: number;
  losses: number;
} {
  const heroParsed = heroCards.map(parseCard);
  const boardParsed = boardCards.map(parseCard);
  const knownCards = [...heroParsed, ...boardParsed];
  
  let wins = 0;
  let ties = 0;
  let losses = 0;
  
  for (let i = 0; i < simulations; i++) {
    const deck = shuffle(generateDeck(knownCards));
    
    // Deal villain's cards (random 2 cards from deck)
    const villainCards = [deck[0], deck[1]];
    
    // Complete the board if needed
    const remainingBoard = 5 - boardCards.length;
    const fullBoard = [...boardParsed, ...deck.slice(2, 2 + remainingBoard)];
    
    // Evaluate hands
    const heroHand = evaluateHand([...heroParsed, ...fullBoard]);
    const villainHand = evaluateHand([...villainCards, ...fullBoard]);
    
    const result = compareHands(heroHand, villainHand);
    
    if (result > 0) wins++;
    else if (result === 0) ties++;
    else losses++;
  }
  
  const equity = ((wins + ties * 0.5) / simulations) * 100;
  
  return {
    equity: Math.round(equity * 10) / 10,
    wins,
    ties,
    losses
  };
}

/**
 * Calculate outs and odds for drawing hands
 */
export function calculateOuts(
  heroCards: string[],
  boardCards: string[]
): {
  outs: number;
  oddsPercent: number;
  description: string;
} {
  // Simplified outs calculation
  // In a real implementation, this would analyze the specific draw
  
  const heroParsed = heroCards.map(parseCard);
  const boardParsed = boardCards.map(parseCard);
  
  const allCards = [...heroParsed, ...boardParsed];
  const suits = allCards.map(c => c.suit);
  const ranks = allCards.map(c => c.rank);
  
  let outs = 0;
  let description = "Made hand";
  
  // Check for flush draw
  const suitCounts = suits.reduce((acc, suit) => {
    acc[suit] = (acc[suit] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const maxSuitCount = Math.max(...Object.values(suitCounts));
  if (maxSuitCount === 4) {
    outs += 9;
    description = "Flush draw";
  }
  
  // Check for straight draw (simplified)
  const sortedRanks = ranks.map(r => RANK_VALUES[r]).sort((a, b) => b - a);
  const uniqueRanks = Array.from(new Set(sortedRanks));
  
  if (uniqueRanks.length >= 4) {
    const gaps = [];
    for (let i = 0; i < uniqueRanks.length - 1; i++) {
      gaps.push(uniqueRanks[i] - uniqueRanks[i + 1]);
    }
    
    if (gaps.some(g => g === 1) && gaps.filter(g => g <= 2).length >= 3) {
      outs += 8;
      description = outs > 8 ? "Flush + straight draw" : "Straight draw";
    }
  }
  
  const cardsLeft = boardCards.length === 3 ? 2 : 1; // Turn + river or just river
  const unknownCards = 52 - allCards.length;
  const oddsPercent = (outs / unknownCards) * 100 * cardsLeft;
  
  return {
    outs,
    oddsPercent: Math.round(oddsPercent * 10) / 10,
    description
  };
}
