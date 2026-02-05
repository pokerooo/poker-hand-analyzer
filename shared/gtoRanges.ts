/**
 * GTO Preflop Opening Ranges for 6-max Cash Games
 * Based on modern solver outputs and professional play
 * Ranges are for raising first in (RFI) scenarios
 */

export type HandCategory = 'premium' | 'strong' | 'playable' | 'marginal' | 'fold';

export interface RangeData {
  position: string;
  rangePercentage: number;
  hands: string[];
  description: string;
}

// Helper function to expand hand notation
function expandRange(notation: string): string[] {
  const hands: string[] = [];
  
  // Pairs (e.g., "QQ+", "22+", "TT-77")
  if (notation.includes('+') && notation.length === 3 && notation[0] === notation[1]) {
    const rank = notation[0];
    const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    const startIdx = ranks.indexOf(rank);
    for (let i = startIdx; i < ranks.length; i++) {
      hands.push(ranks[i] + ranks[i]);
    }
    return hands;
  }
  
  // Range of pairs (e.g., "TT-77")
  if (notation.includes('-') && notation.length === 5) {
    const [start, end] = notation.split('-');
    if (start[0] === start[1] && end[0] === end[1]) {
      const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
      const startIdx = ranks.indexOf(start[0]);
      const endIdx = ranks.indexOf(end[0]);
      for (let i = startIdx; i <= endIdx; i++) {
        hands.push(ranks[i] + ranks[i]);
      }
      return hands;
    }
  }
  
  // Suited connectors/gappers (e.g., "A5s-A2s", "KQs")
  if (notation.includes('s')) {
    const base = notation.replace('s', '').replace('+', '').replace(/-.*/, '');
    if (notation.includes('-')) {
      // Range like "A5s-A2s"
      const [start, end] = notation.split('-');
      const highCard = start[0];
      const startRank = start[1];
      const endRank = end.replace('s', '')[1];
      const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
      const startIdx = ranks.indexOf(startRank);
      const endIdx = ranks.indexOf(endRank);
      for (let i = startIdx; i <= endIdx; i++) {
        hands.push(highCard + ranks[i] + 's');
      }
    } else if (notation.includes('+')) {
      // Range like "ATs+"
      const highCard = base[0];
      const startRank = base[1];
      const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
      const startIdx = ranks.indexOf(startRank);
      const highIdx = ranks.indexOf(highCard);
      for (let i = startIdx; i < highIdx; i++) {
        hands.push(highCard + ranks[i] + 's');
      }
    } else {
      hands.push(notation);
    }
    return hands;
  }
  
  // Offsuit hands (e.g., "AKo", "AJo+")
  if (notation.includes('o')) {
    const base = notation.replace('o', '').replace('+', '');
    if (notation.includes('+')) {
      const highCard = base[0];
      const startRank = base[1];
      const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
      const startIdx = ranks.indexOf(startRank);
      const highIdx = ranks.indexOf(highCard);
      for (let i = startIdx; i < highIdx; i++) {
        hands.push(highCard + ranks[i] + 'o');
      }
    } else {
      hands.push(notation);
    }
    return hands;
  }
  
  // Single hand
  return [notation];
}

// GTO Opening Ranges by Position
export const GTO_RANGES: Record<string, RangeData> = {
  UTG: {
    position: 'UTG',
    rangePercentage: 15,
    hands: [
      'AA', 'KK', 'QQ', 'JJ', 'TT', '99',
      'AKs', 'AQs', 'AJs', 'ATs', 'A5s', 'A4s',
      'KQs', 'KJs', 'KTs',
      'QJs', 'QTs',
      'JTs', 'T9s',
      'AKo', 'AQo'
    ],
    description: 'Tight range from early position, premium hands only'
  },
  'UTG+1': {
    position: 'UTG+1',
    rangePercentage: 16,
    hands: [
      'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88',
      'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A5s', 'A4s', 'A3s', 'A2s',
      'KQs', 'KJs', 'KTs',
      'QJs', 'QTs',
      'JTs', 'T9s', '98s',
      'AKo', 'AQo', 'AJo'
    ],
    description: 'Slightly wider than UTG, adding some suited aces and connectors'
  },
  'UTG+2': {
    position: 'UTG+2',
    rangePercentage: 18,
    hands: [
      'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77',
      'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
      'KQs', 'KJs', 'KTs', 'K9s',
      'QJs', 'QTs', 'Q9s',
      'JTs', 'J9s',
      'T9s', 'T8s',
      '98s', '87s',
      'AKo', 'AQo', 'AJo', 'ATo'
    ],
    description: 'Middle position range, adding more suited connectors'
  },
  CO: {
    position: 'CO',
    rangePercentage: 25,
    hands: [
      'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55',
      'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
      'KQs', 'KJs', 'KTs', 'K9s', 'K8s',
      'QJs', 'QTs', 'Q9s', 'Q8s',
      'JTs', 'J9s', 'J8s',
      'T9s', 'T8s', 'T7s',
      '98s', '97s', '87s', '76s', '65s',
      'AKo', 'AQo', 'AJo', 'ATo', 'A9o',
      'KQo', 'KJo', 'KTo'
    ],
    description: 'Cutoff range, significantly wider with position advantage'
  },
  BTN: {
    position: 'BTN',
    rangePercentage: 45,
    hands: [
      'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
      'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
      'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'K3s', 'K2s',
      'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'Q6s', 'Q5s', 'Q4s',
      'JTs', 'J9s', 'J8s', 'J7s', 'J6s',
      'T9s', 'T8s', 'T7s', 'T6s',
      '98s', '97s', '96s', '87s', '86s', '76s', '75s', '65s', '54s',
      'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'A7o', 'A6o', 'A5o',
      'KQo', 'KJo', 'KTo', 'K9o',
      'QJo', 'QTo', 'Q9o',
      'JTo', 'J9o',
      'T9o', 'T8o',
      '98o'
    ],
    description: 'Button range, widest opening range with maximum position'
  },
  SB: {
    position: 'SB',
    rangePercentage: 40,
    hands: [
      'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
      'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
      'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s',
      'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'Q6s',
      'JTs', 'J9s', 'J8s', 'J7s',
      'T9s', 'T8s', 'T7s',
      '98s', '97s', '87s', '86s', '76s', '65s', '54s',
      'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'A7o', 'A6o', 'A5o', 'A4o',
      'KQo', 'KJo', 'KTo', 'K9o', 'K8o',
      'QJo', 'QTo', 'Q9o',
      'JTo', 'J9o',
      'T9o', 'T8o',
      '98o', '87o'
    ],
    description: 'Small blind vs BB, wide range but not as wide as button'
  },
  BB: {
    position: 'BB',
    rangePercentage: 0,
    hands: [],
    description: 'Big blind is a defending position, not an opening position'
  }
};

// Flatten all ranges for easier lookup
const flattenedRanges: Record<string, Set<string>> = {};
Object.keys(GTO_RANGES).forEach(position => {
  flattenedRanges[position] = new Set(GTO_RANGES[position].hands);
});

/**
 * Evaluate if a hand is in the GTO range for a given position
 */
export function evaluateHandInRange(hand: string, position: string): {
  inRange: boolean;
  category: HandCategory;
  percentile: number;
  recommendation: string;
} {
  const range = flattenedRanges[position];
  if (!range) {
    return {
      inRange: false,
      category: 'fold',
      percentile: 0,
      recommendation: 'Invalid position'
    };
  }
  
  const inRange = range.has(hand);
  
  if (!inRange) {
    return {
      inRange: false,
      category: 'fold',
      percentile: 0,
      recommendation: `${hand} is not in the optimal ${position} opening range. Consider folding.`
    };
  }
  
  // Determine category based on hand strength
  const premiumHands = ['AA', 'KK', 'QQ', 'AKs', 'AKo'];
  const strongHands = ['JJ', 'TT', 'AQs', 'AQo', 'AJs', 'KQs'];
  
  let category: HandCategory;
  let percentile: number;
  
  if (premiumHands.includes(hand)) {
    category = 'premium';
    percentile = 95;
  } else if (strongHands.includes(hand)) {
    category = 'strong';
    percentile = 80;
  } else if (hand.includes('s') || hand[0] === hand[1]) {
    category = 'playable';
    percentile = 60;
  } else {
    category = 'marginal';
    percentile = 40;
  }
  
  const recommendation = `${hand} is in the ${position} opening range (${category}). This is a standard raise.`;
  
  return {
    inRange,
    category,
    percentile,
    recommendation
  };
}

/**
 * Get all hands in range for visualization
 */
export function getRangeHands(position: string): string[] {
  return GTO_RANGES[position]?.hands || [];
}

/**
 * Get range percentage for a position
 */
export function getRangePercentage(position: string): number {
  return GTO_RANGES[position]?.rangePercentage || 0;
}
