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


## Current Task: Auto-Advance & Bulk Action Entry ✓
- [x] Implement auto-advance to next player after recording an action
- [x] Determine next player in sequence (clockwise from current)
- [x] Highlight/select next player automatically
- [x] Skip players who have folded
- [x] Design bulk action entry UI (toggle between normal/quick mode)
- [x] Parse bulk action text format (e.g., "UTG fold, UTG+1 raise 800, MP call")
- [x] Validate bulk action syntax and show errors
- [x] Apply bulk actions to hand state
- [x] Add toggle button to switch between modes
- [x] Test auto-advance with various action sequences
- [x] Test bulk entry with valid and invalid inputs


## Current Task: Hand History Import Feature ✓
- [x] Research and document hand history formats from popular poker sites:
  - [x] PokerStars format (.txt)
  - [x] GGPoker format
- [x] Create hand history parser utility:
  - [x] Parse game info (blinds, ante, game type)
  - [x] Extract hero position and cards
  - [x] Parse preflop actions with amounts
  - [x] Parse flop cards and actions
  - [x] Parse turn card and actions
  - [x] Parse river card and actions
  - [x] Handle different action formats (fold, check, call, bet, raise, all-in)
- [x] Build HandHistoryImport component:
  - [x] Add file upload button (.txt files)
  - [x] Add textarea for paste import
  - [x] Detect poker site format automatically
  - [x] Show preview of parsed data before import
  - [x] Add error handling for invalid formats
- [x] Integrate with HandInputSequential:
  - [x] Add "Import Hand History" button to step 1
  - [x] Pre-fill all form fields from parsed data
  - [x] Allow user to review and edit imported data
  - [x] Handle edge cases (missing data, unsupported formats)
- [x] Test with real hand history examples:
  - [x] Test PokerStars format
  - [x] Test GGPoker format
  - [x] Test error handling with invalid input
  - [x] Write vitest tests for parser (16/16 passing)


## Current Task: AI Analysis, Batch Import & Social Media Export ✓
- [x] AI-Powered Hand Analysis:
  - [x] Create tRPC procedure to analyze hand using LLM
  - [x] Generate strategic recommendations for each street
  - [x] Identify mistakes and suggest improvements
  - [x] Calculate GTO-based suggestions
  - [x] Add "Analyze with AI" button to hand detail page
  - [x] Display AI analysis results in a readable format
  - [x] Store AI analysis in database for future reference
- [x] Batch Import:
  - [x] Modify HandHistoryImport to accept multiple files
  - [x] Parse multiple hand histories from single text input
  - [x] Show progress indicator during batch processing
  - [x] Display summary of imported hands (success/failure count)
  - [x] Save all imported hands to database automatically
  - [x] Handle errors gracefully for individual hands
- [x] Social Media Export:
  - [x] Design export templates for each platform:
    - [x] Instagram Reels (1080x1920, 9:16 vertical)
    - [x] X/Twitter (1200x675, 16:9 landscape)
    - [x] TikTok (1080x1920, 9:16 vertical)
    - [x] WhatsApp (1080x1080, 1:1 square)
  - [x] Create visual hand summary with key stats
  - [x] Add branding/watermark to exports
  - [x] Generate shareable images using canvas/HTML2Canvas
  - [x] Add download buttons for each platform format
  - [x] Include hand analysis highlights in export
  - [x] Test exports on actual social media platforms


## Current Task: Hand Comparison Tool & Community Features ✓
- [x] Hand Comparison Tool:
  - [x] Create database schema for hand comparisons
  - [x] Build HandComparison component with side-by-side layout
  - [x] Add hand selector to choose two hands from archive
  - [x] Display key differences (position, actions, ratings)
  - [x] Highlight pattern similarities across hands
  - [x] Add comparison insights (e.g., "Both hands: passive flop play")
  - [x] Create route /compare for comparison page
- [x] Community Features - Database Schema:
  - [x] Add isPublic column to hands table
  - [x] Create upvotes table (handId, userId, createdAt)
  - [x] Create comments table (id, handId, userId, content, createdAt)
  - [x] Add upvoteCount column to hands table for performance
  - [x] Add commentCount column to hands table
- [x] Community Features - Backend:
  - [x] Create tRPC procedures for upvoting hands
  - [x] Create tRPC procedures for commenting on hands
  - [x] Create tRPC procedure to get public hands (leaderboard)
  - [x] Create tRPC procedure to toggle hand visibility (public/private)
  - [x] Add pagination for community hands list
  - [x] Add sorting options (top rated, most upvoted, recent)
- [x] Community Features - Frontend:
  - [x] Create Community page (/community) with leaderboard
  - [x] Add upvote button to hand detail page
  - [x] Add comments section to hand detail page
  - [x] Add "Make Public" toggle to hand detail page
  - [x] Display upvote and comment counts in archive
  - [x] Show community badge for public hands
  - [x] Add filters for community page (time range, rating)
- [x] Testing:
  - [x] Test hand comparison with various hand pairs
  - [x] Test upvoting and commenting functionality
  - [x] Test leaderboard sorting and pagination
  - [x] Write vitest tests for community features


## Current Task: Hand Range Analysis Feature ✓
- [x] Research and document GTO preflop ranges:
  - [x] UTG range (early position)
  - [x] MP range (middle position)
  - [x] CO range (cutoff)
  - [x] BTN range (button)
  - [x] SB range (small blind)
  - [x] BB range (big blind)
- [x] Create range data structure:
  - [x] Define hand notation (e.g., "AKs", "QQ+", "A5s-A2s")
  - [x] Store ranges for each position
  - [x] Include range percentages (e.g., UTG opens 15%)
  - [x] Add range categories (premium, strong, playable, marginal)
- [x] Build range evaluation logic:
  - [x] Check if hero's hand is in optimal range for position
  - [x] Calculate hand strength percentile within range
  - [x] Identify if hand is at top/middle/bottom of range
  - [x] Provide recommendations (fold, raise, call)
- [x] Create RangeAnalysis component:
  - [x] Display visual range chart (grid of all hands)
  - [x] Highlight hands in range with color coding
  - [x] Show hero's actual hand on the chart
  - [x] Display range statistics (% of hands, combos)
  - [x] Add position-specific insights
- [x] Integrate into hand detail pages:
  - [x] Add "Range Analysis" section to preflop tab
  - [x] Show whether hand selection was optimal
  - [x] Display alternative hands in similar strength tier
  - [x] Add educational tooltips about range construction
- [x] Testing:
  - [x] Test range evaluation for all positions
  - [x] Verify range data accuracy against GTO charts
  - [x] Test UI with various hand types (pairs, suited, offsuit)
  - [x] Write vitest tests for range evaluation logic


## Current Task: Equity Calculator & Hand Replayer ✓
- [x] Equity Calculator:
  - [x] Research poker equity calculation algorithms
  - [x] Implement Monte Carlo simulation for equity calculation
  - [x] Estimate villain's range based on actions and position
  - [x] Calculate hero's equity against villain's range
  - [x] Show equity percentages for each street (preflop, flop, turn, river)
  - [x] Display equity changes as hand progresses
  - [x] Add visual equity bar/chart
  - [x] Show outs and odds for drawing hands
  - [x] Allow manual range adjustment for villain
- [x] Hand Replayer:
  - [x] Design replayer UI with play/pause/step controls
  - [x] Create animation timeline for all actions
  - [x] Animate card reveals (hero cards, flop, turn, river)
  - [x] Animate action buttons and bet amounts
  - [x] Show pot size updates in real-time
  - [x] Display player stack changes
  - [x] Add speed control (0.5x, 1x, 2x)
  - [x] Highlight current action with visual emphasis
  - [x] Show action history sidebar during replay
  - [x] Add keyboard shortcuts (space = play/pause, arrows = step)
- [x] Integration:
  - [x] Add equity calculator to each street tab
  - [x] Add replayer as new tab or modal in hand detail
  - [x] Sync replayer with equity updates
  - [x] Show equity changes during replay
- [x] Testing:
  - [x] Test equity calculations with known scenarios
  - [x] Test replayer animations and timing
  - [x] Verify keyboard shortcuts work correctly
  - [x] Write vitest tests for equity calculator


## Current Task: Hand Tagging System ✓
- [x] Database Schema:
  - [x] Create handTags table (id, handId, tag, color, createdAt)
  - [x] Add indexes for efficient tag queries
  - [x] Support multiple tags per hand
- [x] Backend (tRPC Procedures):
  - [x] addTag(handId, tag, color) - Add tag to hand
  - [x] removeTag(handId, tag) - Remove tag from hand
  - [x] getTags(handId) - Get all tags for a hand
  - [x] getAllTags() - Get all unique tags with usage count
  - [x] filterByTags(tags[]) - Filter hands by tags
- [x] UI Components:
  - [x] TagInput component for adding new tags
  - [x] TagBadge component for displaying tags
  - [x] TagManager component for editing tags on hand detail page
  - [x] TagFilter component for archive filtering
  - [x] Color picker for tag customization
- [x] Integration:
  - [x] Add tag manager to hand detail page header
  - [x] Display tags in hand archive list
  - [x] Add tag filter dropdown to archive page
  - [x] Show tag suggestions based on existing tags
  - [x] Support quick tag presets (bluff, hero call, cooler, mistake, etc.)
- [x] Testing:
  - [x] Test adding/removing tags
  - [x] Test filtering by single and multiple tags
  - [x] Test tag color customization
  - [x] Write vitest tests for tag operations


## Current Task: Mobile Optimization
- [ ] Core Layout & Navigation:
  - [ ] Make header responsive with hamburger menu for mobile
  - [ ] Optimize button sizes for touch (minimum 44x44px)
  - [ ] Add mobile-friendly spacing and padding
  - [ ] Ensure text is readable without zooming (minimum 16px)
  - [ ] Fix viewport meta tag for proper mobile scaling
- [ ] Hand Input Flow:
  - [ ] Make card selector touch-friendly with larger tap targets
  - [ ] Optimize multi-step form for mobile screens
  - [ ] Make action buttons larger and easier to tap
  - [ ] Improve keyboard input for bet amounts on mobile
  - [ ] Add swipe gestures for navigation between steps
- [ ] Hand Detail Page:
  - [ ] Make tabs scrollable horizontally on mobile
  - [ ] Optimize card layout to fit mobile screens
  - [ ] Make equity calculator charts responsive
  - [ ] Ensure hand replayer controls are touch-friendly
  - [ ] Optimize range chart for mobile viewing
- [ ] Archive Page:
  - [ ] Make hand cards stack vertically on mobile
  - [ ] Optimize filters for mobile (collapsible sections)
  - [ ] Make search bar full-width on mobile
  - [ ] Improve tag filter UI for mobile
- [ ] Community & Comparison:
  - [ ] Make hand comparison side-by-side vertical on mobile
  - [ ] Optimize community leaderboard for mobile scrolling
  - [ ] Make comment section mobile-friendly
- [ ] Testing:
  - [ ] Test on iOS Safari
  - [ ] Test on Android Chrome
  - [ ] Verify touch interactions work correctly
  - [ ] Test landscape and portrait orientations
  - [ ] Ensure no horizontal scrolling issues


## Current Task: Mobile Optimization ✓
- [x] Make all pages responsive for mobile devices
- [x] Optimize HandDetail page layout (remove sticky on mobile)
- [x] Make HandArchive filters mobile-friendly with horizontal scroll
- [x] Responsive grids in HandInputSequential (1 col mobile, 2-3 desktop)
- [x] Touch-friendly action buttons (48px min-height)
- [x] Optimize VisualCardSelector for mobile (already had good support)
- [x] Make PlayerActionInterface buttons touch-friendly
- [x] Responsive Community page header
- [x] Optimize RangeAnalysis chart (smaller cells on mobile)
- [x] Make EquityCalculator responsive
- [x] Optimize HandReplayer controls and cards for mobile
- [x] Make HandCompare grids responsive
- [x] Responsive Home page hero section
- [x] Optimize UserStats page for mobile
- [x] Test mobile layout in responsive design mode
- [x] Verify touch interactions work properly


## Current Task: Enhanced Mobile Features ✓
- [x] Swipe Gestures:
  - [x] Add swipe left/right to navigate between streets in HandDetail tabs
  - [x] Add swipe left/right to navigate steps in HandReplayer
  - [x] Implement touch event handlers for swipe detection
  - [x] Created useSwipe custom hook for gesture detection
  - [x] Integrated swipe navigation in HandDetail and HandReplayer
- [x] PWA Features:
  - [x] Create manifest.json with app metadata
  - [x] Add service worker for offline support
  - [x] Implement install prompt for "Add to Home Screen"
  - [x] Cache critical assets for offline use
  - [x] Add PWA icons in multiple sizes (192x192, 512x512)
  - [x] Generated professional poker-themed app icons
  - [x] Added PWA meta tags to index.html
- [x] Theme Toggle:
  - [x] Add theme toggle button to navigation/header
  - [x] Enable switchable theme in ThemeProvider
  - [x] Persist theme preference in localStorage
  - [x] Add smooth transition animations
  - [x] Added ThemeToggle component to Home, Archive, and Detail pages


## Current Task: Social Media Sharing Feature ✓
- [x] Design share card generator:
  - [x] Existing SocialMediaExport component generates platform-optimized images
  - [x] Supports Instagram, Twitter, TikTok, WhatsApp formats
  - [x] Professional visual cards with hand details, board, and rating
  - [x] Uses html2canvas to generate downloadable images
- [x] Implement share functionality:
  - [x] Created ShareHandDialog component with social media integration
  - [x] Added share buttons for Twitter, Facebook, LinkedIn with proper URLs
  - [x] Implemented copy link functionality with clipboard API
  - [x] Added link to image export feature
  - [x] Share text includes hand details and hashtags
- [x] Integration:
  - [x] Added share button to HandDetail page header
  - [x] Added share button to HandArchive cards
  - [x] Share dialog shows hand preview with key stats
  - [x] Mobile-friendly dialog with responsive layout


## Current Task: Discord Webhook Integration ✓
- [x] Backend Implementation:
  - [x] Created discordWebhooks table in database schema
  - [x] Added tRPC procedures for webhook CRUD operations (list, add, update, delete, share)
  - [x] Implemented Discord webhook posting with rich embeds
  - [x] Added webhook validation and error handling
  - [x] Formatted hand data for Discord embed (cards, position, rating, board, street ratings, URL)
  - [x] Rich embed includes hero hand, overall rating, blinds, board cards, street ratings, and analysis link
- [x] Frontend Implementation:
  - [x] Created DiscordWebhookManager component for webhook settings
  - [x] Added Discord share section to ShareHandDialog
  - [x] Built webhook configuration UI (add/edit/delete webhooks with default selection)
  - [x] Added webhook selection dropdown for sharing
  - [x] Implemented success/error feedback for Discord shares with toast notifications
- [x] Integration:
  - [x] Created dedicated Discord settings page at /discord route
  - [x] Integrated Discord share with existing share dialog
  - [x] Added Discord Settings button to Home page
  - [x] Mobile-friendly webhook management and sharing UI
  - [x] Webhook manager shows default badge and allows setting default


## Current Task: Improve Hand Input Interface ✓
- [x] Make card selectors more compact:
  - [x] Reduced card button sizes in VisualCardSelector (36px min height, smaller text)
  - [x] Optimized grid layout with tighter spacing (0.5-1px gaps)
  - [x] Hero cards now visible side-by-side on large screens (grid-cols-2)
  - [x] All 3 flop cards visible together (grid-cols-3 on large screens)
  - [x] Maintained touch-friendly tap targets (40px min for buttons, 36px for cards)
- [x] Optimized HandInputSequential layout:
  - [x] Reduced spacing between sections (space-y-3 instead of space-y-6)
  - [x] Made step cards more compact (pb-3, text-lg titles, text-sm descriptions)
  - [x] Reduced padding in card selectors (p-2 sm:p-3)
  - [x] Improved visual hierarchy with smaller fonts and tighter spacing
  - [x] Position buttons more compact (h-12 instead of h-16, 3x5 grid)
  - [x] All card selection steps now fit better on screen without excessive scrolling
