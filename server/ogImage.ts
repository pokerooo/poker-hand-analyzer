import sharp from "sharp";

// OG image: 1200x630 (standard Open Graph size)
const W = 1200;
const H = 630;

const SUIT_SYMBOLS: Record<string, string> = {
  s: "♠", h: "♥", d: "♦", c: "♣",
};

const SUIT_COLORS: Record<string, string> = {
  s: "#1e293b", h: "#dc2626", d: "#dc2626", c: "#1e293b",
};

function parseCard(card: string): { rank: string; suit: string; symbol: string; color: string } {
  if (!card || card.length < 2) return { rank: "?", suit: "?", symbol: "?", color: "#64748b" };
  const rank = card.slice(0, -1).toUpperCase();
  const suit = card.slice(-1).toLowerCase();
  return {
    rank,
    suit,
    symbol: SUIT_SYMBOLS[suit] || suit,
    color: SUIT_COLORS[suit] || "#64748b",
  };
}

function cardSvg(card: string, x: number, y: number, w = 72, h = 96): string {
  const { rank, symbol, color } = parseCard(card);
  const rx = 6;
  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="white" stroke="#e2e8f0" stroke-width="1.5"/>
      <text x="${x + 7}" y="${y + 20}" font-family="Georgia, serif" font-size="18" font-weight="700" fill="${color}">${rank}</text>
      <text x="${x + 7}" y="${y + 36}" font-family="Georgia, serif" font-size="16" fill="${color}">${symbol}</text>
      <text x="${x + w / 2}" y="${y + h / 2 + 10}" font-family="Georgia, serif" font-size="28" font-weight="700" fill="${color}" text-anchor="middle">${symbol}</text>
      <text x="${x + w - 7}" y="${y + h - 8}" font-family="Georgia, serif" font-size="18" font-weight="700" fill="${color}" text-anchor="end" transform="rotate(180 ${x + w - 7} ${y + h - 8 - 8})">${rank}</text>
    </g>`;
}

function gradeColor(grade: string): string {
  const g = grade.toUpperCase();
  if (g === "A+" || g === "A") return "#10b981";
  if (g === "A-" || g === "B+") return "#34d399";
  if (g === "B" || g === "B-") return "#fbbf24";
  if (g === "C+" || g === "C") return "#f97316";
  return "#ef4444";
}

export async function generateOgImage(opts: {
  title?: string;
  heroCards: string[];
  boardCards: string[];
  heroPosition: string;
  grade?: string;
  gameType?: string;
  blinds?: string;
}): Promise<Buffer> {
  const { title, heroCards, boardCards, heroPosition, grade, gameType, blinds } = opts;

  // Layout constants
  const PAD = 48;
  const cardW = 72;
  const cardH = 96;
  const cardGap = 10;

  // Hero cards row (left side)
  const heroCardsX = PAD;
  const heroCardsY = H / 2 - cardH / 2 - 20;

  // Board cards row (center)
  const boardCount = Math.min(boardCards.length, 5);
  const boardTotalW = boardCount * (cardW + cardGap) - cardGap;
  const boardX = (W - boardTotalW) / 2;
  const boardY = H / 2 - cardH / 2 - 20;

  // Grade badge (right side)
  const gradeX = W - PAD - 100;
  const gradeY = H / 2 - 60;
  const gc = grade ? gradeColor(grade) : "#64748b";

  const heroCardsSvg = heroCards.slice(0, 2).map((c, i) =>
    cardSvg(c, heroCardsX + i * (cardW + cardGap), heroCardsY)
  ).join("");

  const boardCardsSvg = boardCards.slice(0, 5).map((c, i) =>
    cardSvg(c, boardX + i * (cardW + cardGap), boardY)
  ).join("");

  const displayTitle = title || "Poker Hand Analysis";
  const gameLabel = gameType === "mtt" ? "MTT" : "Cash";
  const blindsLabel = blinds || "";

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0f1a"/>
      <stop offset="100%" stop-color="#0d1f12"/>
    </linearGradient>
    <linearGradient id="felt" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0f4a2a"/>
      <stop offset="100%" stop-color="#063a1a"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- Felt table oval -->
  <ellipse cx="${W / 2}" cy="${H / 2 + 40}" rx="${W / 2 - 40}" ry="${H / 2 - 60}" fill="url(#felt)" stroke="#10b981" stroke-width="3" opacity="0.7"/>

  <!-- Brand bar top -->
  <rect x="0" y="0" width="${W}" height="64" fill="rgba(0,0,0,0.6)"/>
  <text x="${PAD}" y="42" font-family="Georgia, serif" font-size="22" font-weight="700" fill="#10b981">♠ PokerReplay</text>
  <text x="${W - PAD}" y="42" font-family="Arial, sans-serif" font-size="16" fill="#64748b" text-anchor="end">${gameLabel}${blindsLabel ? " · " + blindsLabel : ""}</text>

  <!-- Title -->
  <text x="${W / 2}" y="108" font-family="Georgia, serif" font-size="28" font-weight="700" fill="white" text-anchor="middle">${displayTitle.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>

  <!-- Hero label -->
  <rect x="${heroCardsX}" y="${heroCardsY - 28}" width="120" height="22" rx="4" fill="rgba(16,185,129,0.15)" stroke="#10b981" stroke-width="1"/>
  <text x="${heroCardsX + 60}" y="${heroCardsY - 12}" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#10b981" text-anchor="middle">HERO · ${heroPosition.toUpperCase()}</text>

  <!-- Hero cards -->
  ${heroCardsSvg}

  <!-- Board label -->
  ${boardCount > 0 ? `
  <rect x="${boardX}" y="${boardY - 28}" width="${boardTotalW}" height="22" rx="4" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  <text x="${boardX + boardTotalW / 2}" y="${boardY - 12}" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#94a3b8" text-anchor="middle">BOARD</text>
  ` : `
  <text x="${W / 2}" y="${boardY + cardH / 2 + 8}" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.2)" text-anchor="middle">Preflop Hand</text>
  `}

  <!-- Board cards -->
  ${boardCardsSvg}

  <!-- Grade badge -->
  ${grade ? `
  <rect x="${gradeX}" y="${gradeY}" width="100" height="100" rx="12" fill="${gc}20" stroke="${gc}" stroke-width="2" filter="url(#glow)"/>
  <text x="${gradeX + 50}" y="${gradeY + 58}" font-family="Georgia, serif" font-size="48" font-weight="700" fill="${gc}" text-anchor="middle">${grade}</text>
  <text x="${gradeX + 50}" y="${gradeY + 80}" font-family="Arial, sans-serif" font-size="11" fill="${gc}99" text-anchor="middle">AI GRADE</text>
  ` : `
  <rect x="${gradeX}" y="${gradeY}" width="100" height="100" rx="12" fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.2)" stroke-width="1.5"/>
  <text x="${gradeX + 50}" y="${gradeY + 52}" font-family="Arial, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">AI Coach</text>
  <text x="${gradeX + 50}" y="${gradeY + 70}" font-family="Arial, sans-serif" font-size="11" fill="#475569" text-anchor="middle">Tap to analyse</text>
  `}

  <!-- CTA bottom -->
  <rect x="0" y="${H - 52}" width="${W}" height="52" fill="rgba(0,0,0,0.5)"/>
  <text x="${W / 2}" y="${H - 20}" font-family="Arial, sans-serif" font-size="15" fill="#64748b" text-anchor="middle">pokerhand-g6hpzuqn.manus.space · Tap to replay this hand</text>
</svg>`;

  return await sharp(Buffer.from(svg)).png().toBuffer();
}
