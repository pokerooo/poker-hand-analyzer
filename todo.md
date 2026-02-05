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

## Phase 3: Hand Archive & Detail View (In Progress)
- [x] Create HandArchive page component
- [x] Add search and filter functionality (by position, date, rating)
- [x] Display hand cards with color-coded suits
- [x] Show quick stats (date, position, rating, mistake tags)
- [x] Add navigation links from Home page
- [x] Implement delete hand functionality
- [ ] Create HandDetail page with full analysis
- [ ] Add navigation to detail view from archive

## Current Task: Building Analysis Engine ✓
- [x] Create mistake detection rules for common errors:
  - [x] Overcalling rivers (calling large bets with weak holdings)
  - [x] Passive flop play (checking when should bet for value/protection)
  - [x] Missing turn probes (not betting turn after flop check)
  - [x] Overvaluing weak top pairs
  - [x] Not charging draws (checking when draws are present)
  - [x] Poor pot odds calls
  - [x] Leaking in 3-bet spots
- [x] Build rating calculation system (0-10 scale per street)
- [x] Create analysis text generator for explanations
- [x] Integrate engine with hand submission in HandInput form
- [x] Test with various hand scenarios (12/12 tests passing)

## Current Task: Building Hand Detail Page ✓
- [x] Create HandDetail page component
- [x] Display hand setup (blinds, position, hero cards, board)
- [x] Show street-by-street analysis with tabs (Preflop, Flop, Turn, River, Summary)
- [x] Display mistake tags with explanations
- [x] Show ratings for each street with visual indicators
- [x] Render analysis text from engine
- [x] Add navigation from archive page
- [x] Style with Casino Noir theme

## Current Task: Building User Statistics Dashboard ✓
- [x] Create database queries for aggregated stats:
  - [x] Calculate average rating across all hands
  - [x] Count most common mistake patterns
  - [x] Aggregate performance by position
  - [x] Track rating trends over time
- [x] Add tRPC procedures for statistics
- [x] Build dashboard UI with:
  - [x] Overall performance metrics card
  - [x] Mistake frequency chart
  - [x] Position performance breakdown
  - [x] Rating improvement trend chart
- [x] Add navigation from home page
- [x] Style with Casino Noir theme

## Current Task: Implementing Hand Sharing ✓
- [x] Add shareToken field to hands table schema
- [x] Create generateShareToken function
- [x] Add tRPC procedure to generate share link
- [x] Create public share page at /share/:token
- [x] Add Share button to HandDetail page
- [x] Implement copy-to-clipboard functionality
- [x] WhatsApp sharing (users can paste the copied link)
- [x] Test sharing flow

## Current Task: Building Hand Comparison Tool ✓
- [x] Create HandCompare page component at /compare
- [x] Build hand selection interface (multi-select from archive)
- [x] Design side-by-side comparison layout (2-3 hands)
- [x] Display key metrics for each hand:
  - [x] Position, cards, blinds
  - [x] Street-by-street ratings
  - [x] Mistake tags
  - [x] Actions taken on each street
- [x] Add pattern detection logic:
  - [x] Identify common mistakes across selected hands
  - [x] Detect position-based tendencies
  - [x] Find rating patterns by street
- [x] Create insights summary panel
- [x] Add navigation from archive page
- [x] Style with Casino Noir theme

## Current Task: Redesigning Sequential Hand Input Flow ✓
- [x] Create new VisualCardSelector component:
  - [x] Display all 4 suits as large card icons at top (♠ black, ♥ red, ♣ green, ♦ blue)
  - [x] Show rank grid below (A, K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3, 2)
  - [x] Add Clear and Random buttons
  - [x] Highlight selected suit and rank
- [x] Build sequential flow:
  - [x] Step 1: Game setup (blinds, ante)
  - [x] Step 2: Hero position and cards (visual selector)
  - [x] Step 3: Preflop action placeholder
  - [x] Step 4: Flop cards (visual selector for 3 cards)
  - [x] Step 5: Flop action placeholder
  - [x] Step 6: Turn card (visual selector)
  - [x] Step 7: Turn action placeholder
  - [x] Step 8: River card (visual selector)
  - [x] Step 9: River action placeholder
  - [x] Step 10: Review and submit
- [x] Build PlayerActionInterface component with fold/check/call/bet/raise buttons
- [x] Add amount input field for bet/raise actions
- [x] Integrate action tracking into sequential hand input for each street
- [x] Display action history showing who acted and what they did
- [x] Validate action sequences (e.g., can't check after a bet)
- [ ] Create TableVisualization component (future enhancement)
- [x] Style with Casino Noir theme

## Current Task: Adding Undo/Edit Functionality for Actions ✓
- [x] Add undo button to ActionHistory component
- [x] Implement removeLastAction handler in HandInputSequential
- [x] Update pot and currentBet calculations after undo
- [x] Add visual feedback for undo action (toast notification)
- [x] Test undo functionality across all streets
- [x] Ensure undo works correctly with different action types
