/**
 * Hand History Parser
 * Parses hand histories from popular online poker sites
 * Supported formats: PokerStars, GGPoker, 888poker, PartyPoker
 */

export type ParsedHandHistory = {
  // Game info
  smallBlind: number;
  bigBlind: number;
  ante?: number;
  
  // Hero info
  heroPosition: string;
  heroCards: string[]; // e.g., ["A♠", "T♣"]
  
  // Actions by street
  preflopActions: ParsedAction[];
  flopCards?: string[];
  flopActions?: ParsedAction[];
  turnCard?: string;
  turnActions?: ParsedAction[];
  riverCard?: string;
  riverActions?: ParsedAction[];
  
  // Metadata
  site: 'pokerstars' | 'ggpoker' | 'unknown';
  handId?: string;
  tableName?: string;
  gameDate?: string;
};

export type ParsedAction = {
  player: string;
  position: string;
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';
  amount?: number;
};

/**
 * Detect which poker site format the hand history is in
 */
export function detectPokerSite(text: string): ParsedHandHistory['site'] {
  if (text.includes('PokerStars Hand #') || text.includes('PokerStars Zoom Hand #')) {
    return 'pokerstars';
  }
  if (text.includes('GGPoker Hand #') || text.includes('Game Hand #')) {
    return 'ggpoker';
  }
  return 'unknown';
}

/**
 * Main parser function - detects format and delegates to appropriate parser
 */
export function parseHandHistory(text: string): ParsedHandHistory {
  const site = detectPokerSite(text);
  
  switch (site) {
    case 'pokerstars':
      return parsePokerStars(text);
    case 'ggpoker':
      return parseGGPoker(text);
    default:
      throw new Error('Unsupported hand history format. Please use PokerStars or GGPoker format.');
  }
}

/**
 * Parse PokerStars hand history format
 * Example:
 * PokerStars Hand #123456789: Hold'em No Limit ($0.50/$1.00) - 2024/01/15 12:34:56 ET
 * Table 'Example' 9-max Seat #3 is the button
 * Seat 1: Player1 ($100 in chips)
 * ...
 * Player1: posts small blind $0.50
 * Player2: posts big blind $1.00
 * *** HOLE CARDS ***
 * Dealt to Hero [As Tc]
 * Player3: raises $2.50 to $3.50
 */
function parsePokerStars(text: string): ParsedHandHistory {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const result: ParsedHandHistory = {
    smallBlind: 0,
    bigBlind: 0,
    heroPosition: '',
    heroCards: [],
    preflopActions: [],
    site: 'pokerstars',
  };
  
  // Parse blinds from first line
  const blindsMatch = text.match(/\(\$?([\d.]+)\/\$?([\d.]+)\)/);
  if (blindsMatch) {
    result.smallBlind = parseFloat(blindsMatch[1]);
    result.bigBlind = parseFloat(blindsMatch[2]);
  }
  
  // Parse hand ID
  const handIdMatch = text.match(/Hand #(\d+)/);
  if (handIdMatch) {
    result.handId = handIdMatch[1];
  }
  
  // Build seat map (Seat # -> Player name)
  const seatMap = new Map<number, string>();
  const seatRegex = /Seat (\d+): (.+?) \(/g;
  let seatMatch;
  while ((seatMatch = seatRegex.exec(text)) !== null) {
    seatMap.set(parseInt(seatMatch[1]), seatMatch[2]);
  }
  
  // Find hero and their cards
  const heroMatch = text.match(/Dealt to (.+?) \[(.+?)\]/);
  if (heroMatch) {
    const heroName = heroMatch[1];
    const cardsStr = heroMatch[2];
    result.heroCards = parseCards(cardsStr);
    
    // Find hero's seat number
    for (const [seat, name] of Array.from(seatMap.entries())) {
      if (name === heroName) {
        result.heroPosition = seatToPosition(seat, seatMap.size);
        break;
      }
    }
  }
  
  // Parse actions
  let currentStreet: 'preflop' | 'flop' | 'turn' | 'river' = 'preflop';
  
  for (const line of lines) {
    // Detect street changes
    if (line.includes('*** HOLE CARDS ***')) {
      currentStreet = 'preflop';
      continue;
    }
    if (line.includes('*** FLOP ***')) {
      currentStreet = 'flop';
      const flopMatch = line.match(/\[(.+?)\]/);
      if (flopMatch) {
        result.flopCards = parseCards(flopMatch[1]);
        result.flopActions = [];
      }
      continue;
    }
    if (line.includes('*** TURN ***')) {
      currentStreet = 'turn';
      const turnMatch = line.match(/\[.+?\] \[(.+?)\]/);
      if (turnMatch) {
        result.turnCard = parseCards(turnMatch[1])[0];
        result.turnActions = [];
      }
      continue;
    }
    if (line.includes('*** RIVER ***')) {
      currentStreet = 'river';
      const riverMatch = line.match(/\[.+?\] \[(.+?)\]/);
      if (riverMatch) {
        result.riverCard = parseCards(riverMatch[1])[0];
        result.riverActions = [];
      }
      continue;
    }
    
    // Parse action lines
    const action = parsePokerStarsAction(line, seatMap);
    if (action) {
      switch (currentStreet) {
        case 'preflop':
          result.preflopActions.push(action);
          break;
        case 'flop':
          result.flopActions?.push(action);
          break;
        case 'turn':
          result.turnActions?.push(action);
          break;
        case 'river':
          result.riverActions?.push(action);
          break;
      }
    }
  }
  
  return result;
}

/**
 * Parse a single action line from PokerStars format
 */
function parsePokerStarsAction(line: string, seatMap: Map<number, string>): ParsedAction | null {
  // Skip non-action lines
  if (line.includes('***') || line.includes('Seat ') || line.includes('Table ') || 
      line.includes('Dealt to') || line.includes('posts') || line.length === 0) {
    return null;
  }
  
  // Extract player name and action
  const actionMatch = line.match(/^(.+?): (folds|checks|calls|bets|raises|is all-in)/);
  if (!actionMatch) return null;
  
  const playerName = actionMatch[1];
  const actionType = actionMatch[2];
  
  // Find player's position
  let position = 'Unknown';
  for (const [seat, name] of Array.from(seatMap.entries())) {
    if (name === playerName) {
      position = seatToPosition(seat, seatMap.size);
      break;
    }
  }
  
  // Parse amount
  let amount: number | undefined;
  const amountMatch = line.match(/\$?([\d.]+)/);
  if (amountMatch) {
    amount = parseFloat(amountMatch[1]);
  }
  
  // Map action type
  let action: ParsedAction['action'];
  if (actionType === 'folds') action = 'fold';
  else if (actionType === 'checks') action = 'check';
  else if (actionType === 'calls') action = 'call';
  else if (actionType === 'bets') action = 'bet';
  else if (actionType === 'raises') action = 'raise';
  else if (actionType === 'is all-in') action = 'allin';
  else return null;
  
  return {
    player: playerName,
    position,
    action,
    amount,
  };
}

/**
 * Parse GGPoker hand history format (similar to PokerStars but with slight differences)
 */
function parseGGPoker(text: string): ParsedHandHistory {
  // GGPoker format is very similar to PokerStars, reuse the parser with minor adjustments
  return parsePokerStars(text.replace('GGPoker Hand', 'PokerStars Hand'));
}



/**
 * Parse card string like "As Tc" or "Ah Kd Qc" into array of cards with suits
 */
function parseCards(cardsStr: string): string[] {
  const cards: string[] = [];
  const cardTokens = cardsStr.trim().split(/\s+/);
  
  for (const token of cardTokens) {
    if (token.length < 2) continue;
    
    const rank = token[0].toUpperCase();
    const suitChar = token[1].toLowerCase();
    
    let suit = '';
    if (suitChar === 's') suit = '♠';
    else if (suitChar === 'h') suit = '♥';
    else if (suitChar === 'c') suit = '♣';
    else if (suitChar === 'd') suit = '♦';
    
    if (suit) {
      cards.push(rank + suit);
    }
  }
  
  return cards;
}

/**
 * Convert seat number to position name
 */
function seatToPosition(seat: number, tableSize: number): string {
  if (tableSize === 9) {
    // 9-max table
    const positions = ['UTG', 'UTG+1', 'UTG+2', 'MP', 'MP+1', 'CO', 'BTN', 'SB', 'BB'];
    return positions[(seat - 1) % 9] || 'Unknown';
  } else if (tableSize === 6) {
    // 6-max table
    const positions = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
    return positions[(seat - 1) % 6] || 'Unknown';
  }
  
  return `Seat${seat}`;
}
