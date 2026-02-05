/**
 * Poker Hand Analysis Engine
 * 
 * Analyzes poker hands and detects common mistakes based on game theory optimal (GTO) principles
 * and fundamental poker strategy.
 */

export interface Action {
  street: 'preflop' | 'flop' | 'turn' | 'river';
  player: string;
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';
  amount?: number;
}

export interface HandData {
  smallBlind: number;
  bigBlind: number;
  ante: number;
  heroPosition: string;
  heroCard1: string;
  heroCard2: string;
  flopCard1?: string | null;
  flopCard2?: string | null;
  flopCard3?: string | null;
  turnCard?: string | null;
  riverCard?: string | null;
  actions: Action[];
}

export interface AnalysisResult {
  overallRating: number;
  preflopRating: number;
  flopRating: number | null;
  turnRating: number | null;
  riverRating: number | null;
  mistakeTags: string[];
  analysis: string;
}

/**
 * Main analysis function
 */
export function analyzeHand(hand: HandData): AnalysisResult {
  const mistakes: string[] = [];
  const ratings = {
    preflop: 7, // Default neutral rating
    flop: null as number | null,
    turn: null as number | null,
    river: null as number | null,
  };

  // Analyze each street
  const preflopAnalysis = analyzePreflop(hand);
  ratings.preflop = preflopAnalysis.rating;
  mistakes.push(...preflopAnalysis.mistakes);

  if (hand.flopCard1) {
    const flopAnalysis = analyzeFlop(hand);
    ratings.flop = flopAnalysis.rating;
    mistakes.push(...flopAnalysis.mistakes);
  }

  if (hand.turnCard) {
    const turnAnalysis = analyzeTurn(hand);
    ratings.turn = turnAnalysis.rating;
    mistakes.push(...turnAnalysis.mistakes);
  }

  if (hand.riverCard) {
    const riverAnalysis = analyzeRiver(hand);
    ratings.river = riverAnalysis.rating;
    mistakes.push(...riverAnalysis.mistakes);
  }

  // Calculate overall rating (average of played streets)
  const playedStreets = [
    ratings.preflop,
    ratings.flop,
    ratings.turn,
    ratings.river,
  ].filter((r) => r !== null) as number[];
  
  const overallRating = playedStreets.reduce((sum, r) => sum + r, 0) / playedStreets.length;

  // Generate analysis text
  const analysis = generateAnalysisText(hand, ratings, mistakes);

  return {
    overallRating: Math.round(overallRating * 10) / 10,
    preflopRating: ratings.preflop,
    flopRating: ratings.flop,
    turnRating: ratings.turn,
    riverRating: ratings.river,
    mistakeTags: Array.from(new Set(mistakes)), // Remove duplicates
    analysis,
  };
}

/**
 * Analyze preflop play
 */
function analyzePreflop(hand: HandData): { rating: number; mistakes: string[] } {
  const mistakes: string[] = [];
  let rating = 7; // Start neutral

  const heroActions = hand.actions.filter(
    (a) => a.street === 'preflop' && a.player.toLowerCase().includes('hero')
  );

  const position = hand.heroPosition;
  const earlyPositions = ['UTG', 'UTG+1', 'UTG+2'];
  const middlePositions = ['MP', 'MP+1'];
  const latePositions = ['CO', 'BTN'];
  const blinds = ['SB', 'BB'];

  // Check for opening range issues
  if (heroActions.some((a) => a.action === 'raise' || a.action === 'bet')) {
    // Opening from early position
    if (earlyPositions.includes(position)) {
      rating = 7; // Neutral for EP open
    } else if (latePositions.includes(position)) {
      rating = 8; // Good for late position aggression
    }
  }

  // Check for passive play (limping)
  if (heroActions.some((a) => a.action === 'call' && !hand.actions.some(b => b.action === 'raise' && b.player !== 'Hero'))) {
    mistakes.push('limping_preflop');
    rating -= 2;
  }

  // Check for 3-bet spots
  const facingRaise = hand.actions.some(
    (a) => a.street === 'preflop' && (a.action === 'raise' || a.action === 'bet') && !a.player.toLowerCase().includes('hero')
  );
  
  if (facingRaise && heroActions.some((a) => a.action === 'call')) {
    // Calling 3-bets can be a leak depending on position
    if (earlyPositions.includes(position)) {
      mistakes.push('leaking_in_3bet_spots');
      rating -= 1;
    }
  }

  return { rating: Math.max(1, Math.min(10, rating)), mistakes };
}

/**
 * Analyze flop play
 */
function analyzeFlop(hand: HandData): { rating: number; mistakes: string[] } {
  const mistakes: string[] = [];
  let rating = 7;

  const heroActions = hand.actions.filter(
    (a) => a.street === 'flop' && a.player.toLowerCase().includes('hero')
  );

  const wasPreflopRaiser = hand.actions.some(
    (a) => a.street === 'preflop' && (a.action === 'raise' || a.action === 'bet') && a.player.toLowerCase().includes('hero')
  );

  // Check for passive play as preflop aggressor
  if (wasPreflopRaiser && heroActions.some((a) => a.action === 'check')) {
    // Check if there are draws on board
    const hasDraws = checkForDraws(hand.flopCard1, hand.flopCard2, hand.flopCard3);
    
    if (hasDraws) {
      mistakes.push('not_charging_draws');
      mistakes.push('passive_flop_play');
      rating -= 2;
    } else {
      mistakes.push('passive_flop_play');
      rating -= 1;
    }
  }

  // Check for continuation bet
  if (wasPreflopRaiser && heroActions.some((a) => a.action === 'bet')) {
    rating += 1; // Good for maintaining aggression
  }

  return { rating: Math.max(1, Math.min(10, rating)), mistakes };
}

/**
 * Analyze turn play
 */
function analyzeTurn(hand: HandData): { rating: number; mistakes: string[] } {
  const mistakes: string[] = [];
  let rating = 7;

  const heroFlopActions = hand.actions.filter(
    (a) => a.street === 'flop' && a.player.toLowerCase().includes('hero')
  );
  
  const heroTurnActions = hand.actions.filter(
    (a) => a.street === 'turn' && a.player.toLowerCase().includes('hero')
  );

  const wasPreflopRaiser = hand.actions.some(
    (a) => a.street === 'preflop' && (a.action === 'raise' || a.action === 'bet') && a.player.toLowerCase().includes('hero')
  );

  // Check for missing turn probe (checking flop, then checking turn again)
  if (wasPreflopRaiser && 
      heroFlopActions.some((a) => a.action === 'check') &&
      heroTurnActions.some((a) => a.action === 'check')) {
    mistakes.push('missing_turn_probe');
    rating -= 1;
  }

  // Check for turn aggression after flop check
  if (heroFlopActions.some((a) => a.action === 'check') &&
      heroTurnActions.some((a) => a.action === 'bet' || a.action === 'raise')) {
    rating += 1; // Good delayed c-bet
  }

  return { rating: Math.max(1, Math.min(10, rating)), mistakes };
}

/**
 * Analyze river play
 */
function analyzeRiver(hand: HandData): { rating: number; mistakes: string[] } {
  const mistakes: string[] = [];
  let rating = 7;

  const heroRiverActions = hand.actions.filter(
    (a) => a.street === 'river' && a.player.toLowerCase().includes('hero')
  );

  const villainRiverBet = hand.actions.find(
    (a) => a.street === 'river' && (a.action === 'bet' || a.action === 'raise') && !a.player.toLowerCase().includes('hero')
  );

  // Check for overcalling rivers
  if (villainRiverBet && heroRiverActions.some((a) => a.action === 'call')) {
    const betSize = villainRiverBet.amount || 0;
    // Calculate pot before the river bet
    const potBeforeBet = calculatePotBeforeAction(hand, 'river', villainRiverBet);
    
    // If facing a large bet (>75% pot), calling requires strong hand
    if (betSize > potBeforeBet * 0.75) {
      // This is a simplified check - in reality we'd need to know hero's actual hand strength
      mistakes.push('overcalling_river');
      rating -= 2;
    }
  }

  // Check for poor pot odds calls
  if (villainRiverBet && heroRiverActions.some((a) => a.action === 'call')) {
    const betSize = villainRiverBet.amount || 0;
    const pot = calculatePot(hand, 'river');
    const potOdds = betSize / (pot + betSize);
    
    // If getting bad odds (need >60% equity), it's likely a mistake
    if (potOdds > 0.6) {
      mistakes.push('poor_pot_odds_call');
      rating -= 1;
    }
  }

  return { rating: Math.max(1, Math.min(10, rating)), mistakes };
}

/**
 * Helper: Check if board has draws
 */
function checkForDraws(card1?: string | null, card2?: string | null, card3?: string | null): boolean {
  if (!card1 || !card2 || !card3) return false;

  // Check for flush draws (2+ cards of same suit)
  const suits = [card1.slice(-1), card2.slice(-1), card3.slice(-1)];
  const suitCounts = suits.reduce((acc, suit) => {
    acc[suit] = (acc[suit] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  if (Object.values(suitCounts).some((count) => count >= 2)) {
    return true;
  }

  // Check for straight draws (connected cards)
  const ranks = [card1.slice(0, -1), card2.slice(0, -1), card3.slice(0, -1)];
  const rankValues: Record<string, number> = {
    'A': 14, 'K': 13, 'Q': 12, 'J': 11, 'T': 10,
    '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2
  };
  
  const values = ranks.map((r) => rankValues[r] || 0).sort((a, b) => b - a);
  const maxGap = values[0] - values[2];
  
  if (maxGap <= 4) {
    return true; // Possible straight draw
  }

  return false;
}

/**
 * Helper: Calculate pot size before a specific action
 */
function calculatePotBeforeAction(hand: HandData, street: string, action: Action): number {
  const streets = ['preflop', 'flop', 'turn', 'river'];
  const streetIndex = streets.indexOf(street);
  
  let pot = hand.smallBlind + hand.bigBlind + (hand.ante * 2); // Simplified
  
  hand.actions.forEach((a) => {
    // Stop before the specified action
    if (a === action) return;
    
    const actionStreetIndex = streets.indexOf(a.street);
    if (actionStreetIndex <= streetIndex && a.amount) {
      pot += a.amount;
    }
  });
  
  return pot;
}

/**
 * Helper: Calculate pot size at a given street
 */
function calculatePot(hand: HandData, street: string): number {
  const streets = ['preflop', 'flop', 'turn', 'river'];
  const streetIndex = streets.indexOf(street);
  
  let pot = hand.smallBlind + hand.bigBlind + (hand.ante * 2); // Simplified
  
  hand.actions.forEach((action) => {
    const actionStreetIndex = streets.indexOf(action.street);
    if (actionStreetIndex <= streetIndex && action.amount) {
      pot += action.amount;
    }
  });
  
  return pot;
}

/**
 * Generate human-readable analysis text
 */
function generateAnalysisText(hand: HandData, ratings: any, mistakes: string[]): string {
  let text = `# Hand Analysis\n\n`;
  
  text += `## Overall Assessment\n\n`;
  text += `This hand was played with an overall rating of **${((ratings.preflop + (ratings.flop || 0) + (ratings.turn || 0) + (ratings.river || 0)) / [ratings.preflop, ratings.flop, ratings.turn, ratings.river].filter(r => r !== null).length).toFixed(1)}/10**.\n\n`;
  
  if (mistakes.length > 0) {
    text += `### Detected Mistakes\n\n`;
    mistakes.forEach((mistake) => {
      text += `- **${formatMistakeTag(mistake)}**: ${getMistakeExplanation(mistake)}\n`;
    });
    text += `\n`;
  }
  
  text += `## Street-by-Street Breakdown\n\n`;
  
  text += `### Preflop (${ratings.preflop}/10)\n`;
  text += `Your preflop play was ${getRatingDescription(ratings.preflop)}.\n\n`;
  
  if (ratings.flop !== null) {
    text += `### Flop (${ratings.flop}/10)\n`;
    text += `Your flop play was ${getRatingDescription(ratings.flop)}.\n\n`;
  }
  
  if (ratings.turn !== null) {
    text += `### Turn (${ratings.turn}/10)\n`;
    text += `Your turn play was ${getRatingDescription(ratings.turn)}.\n\n`;
  }
  
  if (ratings.river !== null) {
    text += `### River (${ratings.river}/10)\n`;
    text += `Your river play was ${getRatingDescription(ratings.river)}.\n\n`;
  }
  
  return text;
}

function formatMistakeTag(tag: string): string {
  return tag.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function getMistakeExplanation(mistake: string): string {
  const explanations: Record<string, string> = {
    'overcalling_river': 'You called a large river bet without sufficient pot odds or hand strength.',
    'passive_flop_play': 'As the preflop aggressor, you should consider betting for value or protection.',
    'missing_turn_probe': 'After checking the flop, a turn bet (probe bet) can take down the pot or define your opponent\'s range.',
    'not_charging_draws': 'With draws on the board, you should bet to make drawing hands pay.',
    'poor_pot_odds_call': 'You called without getting the correct pot odds for your hand.',
    'limping_preflop': 'Limping is generally weaker than raising or folding in most situations.',
    'leaking_in_3bet_spots': 'Calling 3-bets from early position can be a leak; consider 4-betting or folding.',
    'overvaluing_weak_top_pair': 'Top pair with a weak kicker may not be strong enough to call large bets.',
  };
  
  return explanations[mistake] || 'This is a common strategic error.';
}

function getRatingDescription(rating: number): string {
  if (rating >= 9) return 'excellent';
  if (rating >= 8) return 'very good';
  if (rating >= 7) return 'good';
  if (rating >= 6) return 'decent';
  if (rating >= 5) return 'mediocre';
  if (rating >= 4) return 'below average';
  return 'poor';
}
