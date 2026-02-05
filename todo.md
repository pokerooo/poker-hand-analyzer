# Poker Hand Analyzer MVP - Development Todo

## MVP Scope (Option A)
- Hand input interface with basic analysis
- User authentication and hand archive
- Simple mistake tagging (rule-based)
- Basic sharing (text/link format)
- Responsive web design (mobile-friendly)

## Phase 1: Upgrade to Full-Stack ✓
- [x] Upgrade project to web-db-user feature
- [x] Set up database schema for users and hands
- [x] Configure Manus OAuth authentication
- [x] Test authentication flow
- [x] Create database helper functions
- [x] Create tRPC procedures for hands

## Phase 2: Hand Input Interface & Archive
- [ ] Create hand input form with street-by-street action entry
- [ ] Build card selector with suit color coding (♥♦ red, ♠♣ black)
- [ ] Implement position selector (UTG, MP, CO, BTN, SB, BB)
- [ ] Add action type selector (fold, check, call, bet, raise, all-in)
- [ ] Create archived hands list view with filters
- [ ] Build hand detail view with full analysis
- [ ] Add edit/delete functionality for saved hands

## Phase 3: Mistake Pattern Recognition & Tagging
- [ ] Implement analysis engine to detect common mistakes:
  - [ ] Overcalling rivers
  - [ ] Missing turn probes
  - [ ] Leaking in 3-bet spots
  - [ ] Passive flop play
  - [ ] Overvaluing weak top pairs
  - [ ] Not charging draws
  - [ ] Poor pot odds calls
- [ ] Create tagging system for mistakes
- [ ] Build pattern recognition algorithm
- [ ] Display mistake tags on hand analysis

## Phase 4: User Profile & Statistics
- [ ] Create user profile page
- [ ] Calculate aggregated average score across all hands
- [ ] Show breakdown by street (preflop, flop, turn, river)
- [ ] Display most common mistake patterns
- [ ] Show improvement trends over time
- [ ] Add hand count and win rate statistics

## Phase 5: Sharing & Mobile Responsiveness
- [ ] Generate shareable URLs for each hand
- [ ] Add copy-to-clipboard functionality for hand links
- [ ] Create text-based hand summary for sharing
- [ ] Ensure responsive design works on mobile
- [ ] Test touch interactions
- [ ] Optimize for iOS Safari and Android Chrome

## Phase 6: Testing & Deployment
- [ ] Test complete user flow (signup → input hand → view archive → share)
- [ ] Verify all mistake tags are working
- [ ] Test on mobile devices
- [ ] Polish UI and fix any bugs
- [ ] Create checkpoint for deployment

## Technical Notes
- Use Manus OAuth for authentication (built-in)
- Database: PostgreSQL via webdev_add_feature
- Color coding: ♥♦ = #dc2626 (red), ♠♣ = #1f2937 (black)
- Mobile: PWA approach for cross-platform deployment

## Current Task: Building Hand Input Form ✓
- [x] Create CardSelector component with color-coded suits (♥♦ red, ♠♣ black)
- [x] Build multi-step form (Step 1: Game info, Step 2: Hero cards, Step 3: Actions, Step 4: Board)
- [x] Add position selector with poker table visual
- [x] Implement action tracker for each street
- [x] Create form validation and submission
- [x] Add route and navigation for input form page
