# PokerReplay — Complete Redesign TODO

## Vision
Casual players paste or type their hand exactly how they'd describe it on WhatsApp.
The app parses it instantly, builds an animated table replay, and makes it shareable in one tap.
Optional paid AI coach scores the hand and explains what to do differently.

---

## Phase 1: Natural Language Hand Parser ✓
- [x] Build server-side LLM parser: takes free-text hand description, returns structured JSON
- [x] Parse: blinds (ante/sb/bb), positions, hole cards, board cards, actions per street
- [x] Handle shorthand: "utg open 5k", "we co ATo flat", "btn flat", "bb complete"
- [x] Handle board: "Flop A99r", "Turn Th bdfd", "River 5d"
- [x] Handle actions: bet/raise/call/fold/check/jam/shove/allin + amounts
- [x] Handle result: "he folds", "I win", "he jams covering", "I call off"
- [x] Return structured ParsedHand object with all streets and players
- [x] Add tRPC publicProcedure: hands.parseText
- [x] Add tRPC publicProcedure: hands.create (save parsed hand, works for guests too)

## Phase 2: Database & Backend Simplification ✓
- [x] Simplified hands schema: rawText, parsedData, shareSlug, coachAnalysis, coachUnlocked
- [x] shareSlug (short unique URL slug) for public share links
- [x] parsedData JSON column (stores full structured hand)
- [x] rawText column (stores original input)
- [x] coachAnalysis JSON column (stores AI coach result)
- [x] coachUnlocked boolean column
- [x] publicProcedure: hands.getBySlug (for public share links)
- [x] Schema applied via SQL (db:push was hanging, used direct SQL)

## Phase 3: Landing Page & Hand Input UI ✓
- [x] New landing page: casual, visual, mobile-first (PokerReplay brand)
- [x] Hero: single large text area "Describe your hand..."
- [x] Placeholder text showing example WhatsApp-style input
- [x] "Visualise" CTA button (also Cmd+Enter shortcut)
- [x] Example hands gallery (tap to load: Flopped top pair, River bluff, Big pot 3bet)
- [x] Simple 3-step explainer: Type → Replay → Share
- [x] No signup required messaging
- [x] AI Coach premium CTA at bottom

## Phase 4: Animated Poker Table Replayer ✓
- [x] Top-down poker table component (PokerTable.tsx)
- [x] Player seats positioned around table (dynamic based on player count)
- [x] Hero seat highlighted (amber/gold color)
- [x] Cards dealt to hero (face up), others face down
- [x] Community cards revealed per street
- [x] Action display: current action highlighted, bet amounts shown
- [x] Pot counter updating per step
- [x] Auto-play timeline (1.5s per step)
- [x] Step forward/backward controls + skip to start/end
- [x] Progress slider
- [x] Street label shown in controls
- [x] Swipe left/right to step through actions
- [x] Mobile-optimised layout

## Phase 5: Social Sharing ✓
- [x] Native Web Share API (single tap on mobile)
- [x] Copy public link button
- [x] Platform-specific share buttons: WhatsApp, Twitter/X, Facebook, TikTok, IG, Threads
- [x] Public share page (no login required to view)
- [x] Hand text copy for WhatsApp-style sharing

## Phase 6: AI Coach ✓ (free during beta)
- [x] "AI Coach" tab on replayer page
- [x] LLM analysis: plain English, street-by-street scoring
- [x] Overall grade, what you did well, what to improve
- [x] Saved to hand record after first analysis
- [x] Shows cached analysis on revisit
- [ ] Stripe paywall (pending — currently free during beta)

## Phase 7: Final Polish ✓
- [x] Theme toggle (dark/light) on all pages
- [x] My Hands page for authenticated users
- [x] Guest mode — no signup required
- [x] Clean routing: / → /hand/:slug → /my-hands
- [x] Removed all old complex pages and components
- [x] Mobile-first responsive design throughout

## Pending / Future
- [ ] Stripe paywall for AI Coach (one-time unlock per hand)
- [ ] Stack size display on player chips in replayer
- [ ] Video/GIF export for TikTok/IG Stories
- [ ] Hand edit after creation
- [ ] User profile page

## Current Task: Replayer Fixes ✓
- [x] Fix community card reveal: Flop = 3 cards, Turn = +1 (4 total), River = +1 (5 total)
- [x] Added sanitiseBoardCards() to enforce correct incremental card counts client-side
- [x] Updated parser system prompt with CRITICAL BOARD CARD RULE to fix at source
- [x] Added heroFirst() to sort players array so hero is always index 0 = bottom-center seat
- [x] Hero (we/I/hero) now always appears at the bottom-center seat on the table

## Current Task: Input Validation + Replayer Enhancements + Bright Theme ✓
- [x] Enforce blinds (e.g. 500/1000) as required input field with validation
- [x] Enforce effective stack (e.g. 2000eff) as required input field with validation
- [x] Show clear validation errors if either is missing before allowing visualise
- [x] Updated example hands to always include both required fields
- [x] Add card deal animation when community cards are revealed (flop/turn/river) via CSS keyframe
- [x] Show full board on final "Hand complete" step (allBoardCards accumulated across streets)
- [x] Add optional hand title field before visualising
- [x] Display hand title on replayer page header
- [x] Redesigned to bright engaging light theme (white bg, green primary, amber accents)
- [x] Updated PokerTable with bright green felt, warm amber rim, white player chips
- [x] Updated HandReplayer header with sticky backdrop, title display
- [x] Updated MyHands header with sticky backdrop
- [x] 91 unit tests passing across 7 test files

## Current Task: Stack Display + Video Export
- [ ] Show effective stack on player chips in replayer
- [ ] Update PokerTable to accept and display stack sizes per player
- [ ] Update HandReplayer to pass stack sizes through replay steps
- [ ] Update hand parser to extract starting stack sizes
- [ ] Build video/GIF export of hand replay
- [ ] Render each replay step to canvas using html2canvas
- [ ] Stitch frames into a downloadable video/GIF
- [ ] Add export button to share tab in replayer
- [ ] Support portrait format for TikTok/IG Stories

## Current Task: Narration Visibility + Real-Time Playback
- [ ] Fix narration text visibility below the poker table (remove overflow clipping)
- [ ] Replace step-by-step controls with real-time auto-play timer
- [ ] Auto-advance steps on a 2-3 second interval like watching a live hand
- [ ] Keep manual prev/next controls for scrubbing
- [ ] Add play/pause button for user control
- [ ] Smooth CSS transitions between steps (fade/slide)

## Current Task: Modern Gaming Design ✓
- [x] Redesign PokerTable with premium dark felt, glow rim, neon accents
- [x] Redesign card faces with sharp modern typography and suit icons (white cards, proper red/black suits)
- [x] Update player chips with gaming-style badges and stack displays
- [x] Add glow effects on active player and hero seat
- [x] Update community card reveal with premium card-flip animation
- [x] Update replayer UI chrome to match gaming aesthetic (dark header, neon controls, green glow)
- [x] Update global CSS theme to support dark gaming palette

## Current Task: Stack Display + Auto-Play + Video Export
- [x] Show effective stack on player chips in replayer (remaining stack per step)
- [x] Update PokerTable to accept and display stack sizes per player
- [x] Update HandReplayer to pass stack sizes through replay steps
- [x] Update hand parser to extract starting stack sizes
- [x] Real-time auto-play: 2-3s per step with play/pause toggle
- [x] Auto-play replaces manual step-through as default mode
- [x] Keep manual prev/next controls for scrubbing
- [x] Smooth CSS transitions between steps (fade/slide on narration card)
- [x] Video/GIF export of hand replay
- [x] Install html2canvas for frame capture
- [x] Render each replay step to canvas
- [x] Stitch frames into downloadable video/GIF
- [x] Add export button to share tab in replayer
- [x] Support portrait format for TikTok/IG Stories

## Current Task: Villain Range Annotation
- [x] Add villainType field to hands table in DB schema
- [x] Add setVillainType tRPC mutation
- [x] Update coach.analyze procedure to accept and use villainType
- [x] Update LLM system prompt to adjust exploitative recommendations based on villain type
- [x] Build villain type selector UI in Coach tab (preset tags + free-text)
- [x] Persist villain type selection per hand
- [x] Show villain type context in the analysis output
- [x] Write tests for villain type prompt injection (9 tests added, 105 total passing)

## Current Task: Growth Features (Streak, Roast, Spot the Mistake, EV Leaks)

### Feature 8: Study Streak Counter
- [x] Add streakCount and lastStudyDate columns to users table
- [x] Update streak on every hand analysis or review action
- [x] Show streak badge on dashboard/My Hands page
- [x] Add streak milestone toasts (3, 7, 14, 30 days)

### Feature 6: Villain Roast Mode
- [x] Add roast field to coach analysis LLM response schema
- [x] Generate punchy one-liner roast of villain's play in the hand
- [x] Display roast card in Coach tab after analysis
- [x] Make roast copyable for sharing in Discord/Telegram

### Feature 4: Spot the Mistake Challenge Export
- [x] Add challenge mode to Share tab in HandReplayer
- [x] Generate share card showing board + action up to decision point (final action hidden)
- [x] Add "What would you do?" CTA with link back to full analysis
- [x] Generate unique challenge URL per hand
- [x] Public challenge view page showing the spot without the answer

### Feature 5: Session EV Leak Detection
- [x] Add session grouping to My Hands (group by date)
- [x] Build leak analysis tRPC procedure that scans multiple hands
- [x] Detect recurring patterns: check-fold frequency, sizing tells, positional leaks
- [x] Display leak report card on My Hands page per session
- [x] Quantify leaks in estimated buy-in impact

### Feature: Hand Edit Mode in Replayer
- [x] Add Edit Hand button in replayer header/controls
- [x] Show inline text editor pre-filled with current rawText
- [x] Re-parse hand on save using existing parseText + create mutations
- [x] Update the replayer state with new parsed data without page reload
- [x] Show loading state during re-parse
- [x] Persist updated rawText and parsedData to DB
- [x] Add updateHand tRPC mutation (protected, owner only)

### Feature: Accurate Stack Deduction
- [x] Track per-player running stack across all streets (not just starting stack)
- [x] Deduct bet/raise/call/all-in amounts from player stack per action
- [x] Handle blind posts as initial deductions before preflop actions
- [x] Show effective stack (min of hero and villain remaining) on each step
- [x] Reset stacks correctly when moving between streets

### Feature: 8-Max Table Population
- [x] Define canonical 8-max seat order: BTN, SB, BB, UTG, UTG+1, MP, HJ, CO
- [x] Populate all 8 seats in PokerTable, showing empty seats for positions not in hand
- [x] Empty seats show greyed-out chip/avatar with position label
- [x] Active players (in hand) show normally with cards and stacks
- [x] Folded players show face-down cards and dimmed styling

## Current Task: Position Fix + OG Preview Card

### Fix: 8-Max Position Order
- [x] Update CANONICAL_POSITIONS to UTG, UTG+1, LJ, HJ, CO, BTN, SB, BB
- [x] Fix seat assignment: fixed position-to-slot mapping (BTN bottom-right, SB bottom-left, etc.)
- [x] Ensure ghost seats use the correct position labels in the correct visual slots
- [x] Update handParser system prompt to use LJ label
- [x] Update HandReplayer SEAT_ORDER_8MAX to include LJ

### Feature: OG Preview Card
- [x] Add server-side /api/og/:slug route that returns a PNG image
- [x] Generate card image: dark background, board cards, hero cards, position, grade badge
- [x] Used SVG-to-PNG via sharp for image generation
- [x] Add og:image meta tag to HandReplayer page via react-helmet-async
- [x] Add twitter:card, twitter:image meta tags
- [x] OG image endpoint tested and returning 200 PNG at 65KB
- [x] Fix stale Vite parse error (JSX > character in exploitative adjustments)

## Current Task: Stripe Paywall + Hand History Import + Pattern Recognition

### Stripe Integration
- [ ] Add Stripe via webdev_add_feature
- [ ] Define pricing: Pro subscription ($19.99/mo) unlocks AI Coach + Hand History Import + Pattern Recognition
- [ ] Create Stripe products and price IDs
- [ ] Build checkout session creation tRPC procedure
- [ ] Build Stripe webhook handler for payment events
- [ ] Add subscription status to users table (isPro, stripeCustomerId, stripeSubscriptionId)
- [ ] Gate AI Coach behind Pro check (show paywall if not Pro)
- [ ] Gate Hand History Import behind Pro check
- [ ] Gate Pattern Recognition behind Pro check

### Hand History Import (Paywalled)
- [ ] Build server-side PokerStars hand history .txt parser
- [ ] Build server-side GGPoker hand history .txt parser
- [ ] Parse: blinds, positions, hole cards, board cards, actions per street
- [ ] Add hands.importHistory tRPC procedure (protected + Pro only)
- [ ] Build drag-and-drop file upload UI on My Hands page
- [ ] Show import progress (parsing N hands...)
- [ ] Show import results (X hands imported, Y skipped)
- [ ] Add import history tab to My Hands page

### Pattern Recognition (Paywalled)
- [ ] Build server-side LLM pattern analysis across all user hands
- [ ] Detect: positional leaks, sizing tells, check-fold frequency, 3bet frequency
- [ ] Quantify leaks in BB/100 or buy-in impact
- [ ] Build Pattern Recognition dashboard page
- [ ] Show leak breakdown by position, street, action type
- [ ] Show trend over time (improving/worsening)
- [ ] Add charts (bar chart by position, line chart over sessions)

## Session: Stripe Paywall + Import + Pattern Recognition — COMPLETED

### Stripe Integration ✓
- [x] Stripe router with checkout session creation (createCheckout, createPortal)
- [x] Stripe webhook handler for checkout.session.completed, subscription.deleted, subscription.updated, invoice.payment_failed
- [x] isPro, stripeCustomerId, stripeSubscriptionId columns on users table
- [x] AI Coach gated behind Pro check (ProPaywall shown if not Pro)
- [x] Hand History Import gated behind Pro check
- [x] Pattern Recognition gated behind Pro check
- [x] ProPaywall component with loading spinner and Stripe checkout redirect
- [x] ProSuccess page at /pro-success with feature unlock confirmation
- [x] Stripe price updated to $19.99/month

### Hand History Import ✓
- [x] PokerStars hand history .txt parser (splitHandHistory, parseHandHistory, historyHandToText)
- [x] GGPoker hand history .txt parser
- [x] hands.importHistory tRPC procedure (protected + Pro only, up to 50 hands per import)
- [x] ImportHistory page at /import with drag-and-drop file upload
- [x] Import results display (X imported, Y skipped, per-hand status)
- [x] Import nav button on My Hands page
- [x] 16 hand history parser tests passing

### Pattern Recognition ✓
- [x] patterns.analyze tRPC procedure (Pro only, LLM-powered cross-hand analysis)
- [x] Detects: positional leaks, sizing tells, street tendencies, range construction issues
- [x] Quantifies leaks in estimated buy-in impact per 100 hands
- [x] PatternRecognition dashboard page at /patterns with Pro paywall gate
- [x] Grade distribution bar chart
- [x] Expandable pattern cards with study drills
- [x] Strengths section to reinforce good habits
- [x] Overall player level classification
- [x] Patterns nav button on My Hands page

### All tests: 105 passing (7 test files), 0 TypeScript errors

## Session: AI Coach Rebuild + New Features (Mar 2026)

- [ ] Remove paywall from AI Coach (open to all users)
- [ ] Generate Phil Galfond-style caricature mascot
- [ ] Build Memory Bank page — cross-hand leak pattern detection by category
- [ ] Build enhanced AI Coach chat — free-form Q&A with quick-question prompts and mascot
- [ ] Build Win Rate Visualizer — position/hand group P&L chart
- [ ] Wire all new routes into App.tsx and navigation

## Session: AI Coach Rebuild + New Features
- [x] Remove AI Coach paywall (open to all users)
- [x] Generate Phil Galfond-style caricature mascot (CDN hosted)
- [x] Build Memory Bank page (/memory-bank) — cross-hand leak pattern detection with drills
- [x] Build AI Coach chat page (/coach) — free-form Q&A, quick-prompt pills, mascot, streaming responses
- [x] Build Win Rate Visualizer (/win-rate) — position/hand group P&L, cumulative area chart
- [x] Add memoryBankRouter, winrateRouter, chatRouter to appRouter
- [x] Wire Memory, Coach, Win Rate nav buttons into MyHands header
- [x] Wire all three new routes into App.tsx
- [x] TypeScript check: 0 errors
- [x] All 105 tests passing

## Session: Direct AI Coach Access
- [x] Add AI Coach button to homepage header nav
- [x] Add AI Coach entry point below the hero input area on homepage (CTA card now clickable)

## Session: Coach Chat UX Improvements
- [x] Reduce quick prompts to 3 on Coach Chat page
- [x] Add shuffle/refresh button to cycle through prompt pool
- [x] Add AI Coach button to HandReplayer header (with hand context pre-fill)
- [x] Add "Back to my hand" link in Coach Chat when arriving from replayer

## Session: Coach Chat UX Round 2
- [x] Add studyTopics DB table (created via SQL) and saveStudyTopic / getStudyTopics / markReviewed / delete helpers in db.ts
- [x] Add studyRouter with save/list/markReviewed/delete procedures wired into appRouter
- [x] Add "Study this concept" button on each coach response (saves to DB, toggles to checkmark)
- [x] Auto-prefill Coach Chat input with hand summary when arriving from replayer
- [x] Add session question counter in Coach Chat header ("N questions this session")

## Session: HandReplayer Bug Fixes (Mar 2026)
- [x] Fix stack tracking — decrement player stacks after each bet/call/raise at each replay step
- [x] Fix font visibility — player name and stack text should be white/bright on the table
- [x] Fix edit hand glitch — textarea should be directly editable when edit mode is triggered
- [x] Improved hand parser system prompt to extract startingStack from "eff" notation

## Session: Stack Display Refinement (Mar 2026)
- [x] Show stack depth only for Hero and active participating players (not ghost/empty seats)
- [x] Display stack as a separate label near the player chip, not inside it
- [x] Stack label always visible (not hidden when bet is active)
- [x] Compact pill format (e.g. 80k) positioned just below the player chip
- [x] Hero stack in green, other players in slate-400 — visually distinct

## Session: SPR + Effective Stack Display (Mar 2026)
- [x] Add SPR (Stack-to-Pot Ratio) display in the centre of the poker table next to the pot
- [x] SPR computed as min(heroStack, villainStack) / pot, colour-coded: red <=4, amber <=13, green >13
- [x] Show effective stack (smaller of Hero vs main villain) as "Eff: 62k" badge in narration card
- [x] Main villain identified as last non-hero, non-folded player in the hand
- [x] Both SPR and Eff only shown when pot > 0 (hidden on preflop start)
- [x] 0 TypeScript errors, 105 tests passing

## Session: Homepage Video + Headline Rewrite (Mar 2026)
- [x] Upload TrailerVideo.mp4 to CDN via manus-upload-file --webdev
- [x] Rewrite homepage headline: "Stop guessing. Start thinking like a pro."
- [x] Updated subheadline to focus on AI coaching, visual replays, and leak detection
- [x] Embed trailer video above the hand input area on homepage
- [x] Video autoplays muted, loops, playsInline, with controls available
- [x] Video styled with green glow border to match site theme
- [x] 0 TypeScript errors, 105 tests passing

## Session: Homepage Copy Polish + Domain Research (Mar 2026)
- [x] Change headline: "thinking" -> "playing" ("Start playing like a pro.")
- [x] Change badge text to "Your Personal AI Poker Coach"
- [x] Add animated social counter: starts at 5,000, ticks up randomly every 4-8s
- [x] Research and propose available domain names under $50 that reflect AI poker coaching brand

## Session: Real Counter + Feature Tiles + OG Tags (Mar 2026)
- [x] Add siteStats table to DB schema (key, value) for usage counter
- [x] Add incrementStat and getStat helpers in db.ts (atomic SQL INSERT ON DUPLICATE KEY UPDATE)
- [x] Add tRPC publicProcedure: stats.getUsageCount (returns live count)
- [x] Add tRPC publicProcedure: stats.incrementUsage (called when entering visualiser)
- [x] Update homepage counter to read from live DB count instead of static 5000
- [x] Increment counter in HandReplayer on mount (once per hand load, not per step)
- [x] Add 3 feature tiles below the video: Hand Replayer, AI Coach, Leak Detection
- [x] Add OG meta tags: og:title, og:description, og:type, og:image, twitter:card
- [x] HelmetProvider already wired in main.tsx, react-helmet-async already installed
- [x] 0 TypeScript errors, 105 tests passing

## Session: Rebrand + OG Image + BB Depth (Mar 2026)
- [x] Rename site to "Poker AI" — updated index.html, Home.tsx, HandReplayer.tsx, ProPaywall.tsx
- [x] Generated 1200x630 OG image: dark bg, headline, poker table, Poker AI branding
- [x] OG image uploaded to CDN, og:image and twitter:image meta tags updated
- [x] BB depth label added: Eff badge now shows "Eff: 62k (62bb)" format
- [x] 0 TypeScript errors, 105 tests passing

## Session: Four-Colour Card Scheme (Mar 2026)
- [x] Audited all card rendering: PokerTable.tsx (CardFace), PlayingCard.tsx (hero cards in HandReplayer)
- [x] SUIT_META updated in both files: Hearts=Red, Spades=Dark, Diamonds=Blue, Clubs=Green
- [x] CardFace in PokerTable: coloured filled background, white rank/suit text
- [x] PlayingCard.tsx: fully rewritten with four-colour filled scheme
- [x] FALLBACK_META added for unknown/unparseable cards (dark slate)
- [x] Reinforced suit parsing in handParser.ts with CRITICAL SUIT RULE section
- [x] Parser now maps word suits (club/spade/heart/diamond) and symbols (♣♠♥♦) to correct letter codes
- [x] 0 TypeScript errors, 105 tests passing

## Session: Board Texture Legend (Mar 2026)
- [x] Add board texture legend to narration card in HandReplayer
- [x] Compute texture: Monotone / Flush Draw / Two-Tone / Rainbow based on suit frequency
- [x] Colour-coded suit pips (♥ red, ♦ blue, ♠ slate, ♣ green) shown in order of frequency
- [x] Texture label pill: Monotone=amber, Flush Draw=amber, Rainbow=green, Paired=red
- [x] Paired board indicator shown as separate red pill when any rank appears 2+ times
- [x] Legend only shown when community cards are present (hidden preflop)
- [x] 0 TypeScript errors, 105 tests passing

## Session: Bug Fix — /my-hands Failed to Fetch (Mar 2026)
- [x] Fix "Failed to fetch" error on /my-hands page — transient issue caused by stale incrementStat SQL error + server restart timing
- [x] Confirmed incrementStat fix is live (Drizzle .insert().onDuplicateKeyUpdate())
- [x] /my-hands page loading correctly with all 9 hands displayed

## Session: Claude Switch + SQL Fix (Mar 2026)
- [x] Switch LLM model from gemini-2.5-flash to claude-sonnet-4-5
- [x] Fix incrementStat SQL error — confirmed working (errors were stale from before the Drizzle ODKU fix; current incrementStat returns ok:true, DB shows 5002 views)
- [x] Run all tests to confirm 0 regressions — 105/105 passing

## Session: Rate Limiting + Response Time Indicator (Mar 2026)
- [x] Add aiCallLog table to DB schema (userId, callType, createdAt) — created via SQL
- [x] Add checkAiRateLimit() helper — max 20 AI calls/day for free users, unlimited for Pro
- [x] Gate all AI procedures (chat.ask, coach.analyze, patterns.analyze) behind rate limit check
- [x] Return remaining calls count in rate limit response for UI display
- [x] Add "Thinking... Xs" elapsed timer to AI Coach chat (live second counter while Claude responds)
- [x] Show remaining daily AI calls badge in coach chat header (colour-coded: green/amber/red)
- [x] Disable prompts and input when daily limit is reached
- [x] Show limit warning banner on welcome screen when ≤5 calls remaining
- [x] Add rateLimit.getStatus tRPC query for frontend to fetch current usage on load
- [x] 105/105 tests passing, 0 TypeScript errors

## Session: Remove AI Coach Paywall (Mar 2026)
- [x] Remove Pro paywall from AI Coach tab in HandReplayer
- [x] Ensure rate limiting (20 calls/day) remains active for free users

## Session: Collapse Note Section (Mar 2026)
- [x] Collapse the parser Note section in HandReplayer by default
- [x] Add click-to-expand toggle with chevron icon

## Session: Coach Side Panel + Mobile Bottom Sheet (Mar 2026)
- [ ] Desktop: Coach tab opens as fixed right-side panel alongside the replayer
- [ ] Mobile: Coach tab opens as a bottom sheet with minimize/maximize toggle
- [ ] Coach panel triggered by clicking the Coach tab (not a separate page)
- [ ] Panel can be dismissed/closed independently of the replayer

## Session: Replay Speed + Coach Panel Redesign (Mar 2026)
- [x] Fix JSX error from coach panel redesign
- [x] Increase replay speed to 1.5x (2500ms → 1667ms per step)
- [x] Desktop: Coach panel opens as fixed right-side panel (420px wide)
- [x] Mobile: Coach panel opens as bottom sheet with minimize/maximize

## Session: Persist Coach Panel State (Mar 2026)
- [x] Store coachPanelOpen in sessionStorage keyed by hand slug
- [x] Restore panel state on mount from sessionStorage
- [x] Sync panel state to sessionStorage on every open/close toggle

## Session: Mobile Responsiveness Fixes (Mar 2026)
- [x] My Hands: Fix overflowing header tab bar on mobile — split into top bar (back/title/New Hand) + horizontally-scrollable nav pill row
- [x] My Hands: New Hand button shows icon-only on xs, full label on sm+
- [x] Hand Replayer: Fix cramped header — Coach and Share buttons show icon-only on mobile (label hidden below sm)
- [x] Home: Tighten hero section padding on mobile (py-6 on xs, py-16 on sm+), gap reduced
- [x] Home: "How it works" grid stacks to 1 column on mobile (was fixed 3-col)
- [x] Home: Hero h1 reduced to text-3xl on mobile (was text-4xl)

## Session: Full Day/Night Theme Support (Mar 2026)
- [x] Audit all pages for hardcoded dark inline styles (rgba(10,15,13,...), #0a0f0d, etc.)
- [x] Extend index.css with complete light/dark CSS variable palette (backgrounds, borders, text, accents)
- [x] Refactor HandReplayer.tsx — replace all hardcoded dark styles with CSS variables
- [x] Refactor MyHands.tsx — replace all hardcoded dark styles with CSS variables
- [x] Refactor CoachChat.tsx — replace all hardcoded dark styles with CSS variables
- [x] Refactor MemoryBank.tsx — replace all hardcoded dark styles with CSS variables
- [x] Refactor WinRateVisualizer.tsx — replace all hardcoded dark styles with CSS variables
- [x] Refactor PokerTable.tsx — replace hardcoded felt/rim colours with theme-aware variables
- [x] Refactor PatternRecognition.tsx and ImportHistory.tsx
- [x] Add floating ThemeToggle button (Moon/Sun) to App.tsx — visible on all pages
- [x] ThemeProvider set to switchable=true with localStorage persistence
- [x] 0 TypeScript errors, 105 tests passing

## Session: Theme Improvements (Mar 2026)
- [x] Lighter poker table felt in day mode — oklch(0.48 0.16 155) medium green (was dark 0.35)
- [x] Reposition floating theme toggle on mobile — bottom-20 on xs, bottom-6 on sm+ (avoids replay controls)
- [x] Persist theme preference to DB — users.theme ENUM column added, updateUserTheme helper in db.ts
- [x] prefs.updateTheme tRPC mutation (protectedProcedure) added and registered in appRouter
- [x] ThemeContext syncs with server: loads user.theme on login, calls prefs.updateTheme on every toggle
- [x] 0 TypeScript errors, 105 tests passing

## Session: AI Coach Hand-Reading Fix + Stack Input (Mar 2026)
- [x] Strengthen coach LLM prompt: inject hero hole cards + final board before analysis, explicit hand-reading rules
- [x] Fix trips/gutshot miscalculation: LLM must enumerate exact 5-card best hand before commenting on each street
- [x] Stack input: allow bb format (e.g. 100bb) or absolute (e.g. 1000) in the effective stack field
- [x] Stack input: allow separate hero/villain stack entry (e.g. H 100bb V 80bb → eff = 80bb)
- [x] Parser CRITICAL STACK RULE updated: handles bb, split stacks, H/V notation, 100bb/80bb format
- [x] Home.tsx validation hint updated to show new stack formats
- [x] Example hands updated to demonstrate H/V split stack format
- [x] 0 TypeScript errors, 105 tests passing

## Session: Language Toggle — Chinese & Spanish (Mar 2026)
- [x] Fix deployment build error (dist/index.js not found — build output path mismatch)
- [x] Create i18n.ts with EN/ZH (Traditional)/ES translations for all UI strings
- [x] Create LanguageContext.tsx with useLanguage hook and localStorage persistence
- [x] Create LanguageToggle component (EN/中/ES pill buttons)
- [x] Add LanguageProvider to main.tsx
- [x] Apply translations to Home.tsx, MyHands.tsx, HandReplayer.tsx, CoachChat.tsx, MemoryBank.tsx, WinRateVisualizer.tsx, PatternRecognition.tsx
- [x] Update coach.analyze LLM prompt to respond in Traditional Chinese or Spanish when selected
- [x] Update chat.ask LLM prompt to respond in Traditional Chinese or Spanish when selected
- [x] Pass language parameter from CoachPanel and CoachChat to both mutations
- [x] Language preference persisted to localStorage
- [x] 0 TypeScript errors, 105 tests passing

## Session: Theme Toggle Fix + Language Persistence (Mar 2026)
- [x] Removed global floating ThemeToggle from App.tsx — no longer overlaps My Hands button
- [x] ThemeToggle now supports inline prop — renders as compact header button when inline=true
- [x] All page headers updated to use <ThemeToggle inline /> for consistent in-nav placement
- [x] ImportHistory header updated to include both LanguageToggle and ThemeToggle inline
- [x] users.language ENUM('en','zh','es') column added to DB and schema.ts
- [x] updateUserLanguage helper added to db.ts
- [x] prefs.updateLanguage tRPC mutation added (protectedProcedure)
- [x] LanguageContext: loads user.language from server on login, calls prefs.updateLanguage on every toggle
- [x] 0 TypeScript errors, 105 tests passing

## Session: Freemium Tier System + Stripe Paywall (Mar 2026)
- [ ] DB: Add plan ENUM('fish','reg','shark') column to users table
- [ ] DB: Add monthlyHandsUsed, monthlyCoachUsed, usageResetDate columns to users table
- [ ] DB: Track anonymous guest hand count in localStorage (3 free hands before sign-up gate)
- [ ] Server: Enforce hand parse limits (fish=3/mo, reg=15/mo, shark=50/mo)
- [ ] Server: Enforce coach analyze + chat limits (fish=3/mo, reg=15/mo, shark=unlimited)
- [ ] Server: Monthly usage reset logic (reset on 1st of each month)
- [ ] Stripe: Create products and prices for Reg ($19/mo, $99/yr) and Shark ($29/mo, $199/yr)
- [ ] Stripe: createCheckoutSession mutation with plan + billing period selection
- [ ] Stripe: Webhook handler to update users.plan on subscription events
- [ ] Pricing page (/pricing): 3-tier cards (Fish/Reg/Shark) with feature lists and CTAs
- [ ] Sign-up gate modal: prompt after 3 anonymous hand replays (name+email or social login)
- [ ] Paywall modal: Upgrade prompt when hand or coach limit is hit
- [ ] Gate Memory Bank and Leak/Pattern Detection to Reg+ users
- [ ] Gate Shark-only features (exploitative analysis, database analysis, style profile)
- [ ] Add /pricing route to App.tsx

## Session: Freemium Tier System + Stripe Paywall — COMPLETED (Mar 2026)
- [x] DB: Add plan ENUM('fish','reg','shark') column to users table
- [x] DB: Add monthlyHandsUsed, monthlyCoachUsed, usageResetDate columns to users table
- [x] DB: Add stripeCustomerId, stripeSubscriptionId to users table
- [x] Server: checkHandLimit / checkCoachLimit helpers with monthly reset logic
- [x] Server: incrementMonthlyHands / incrementMonthlyCoach helpers
- [x] Server: setUserPlan / setUserPlanByCustomerId helpers for webhook
- [x] Server: Enforce hand create limits per tier in routers.ts
- [x] Server: Enforce coach analyze + chat.ask limits per tier in routers.ts
- [x] Stripe: stripeRouter.ts with createCheckout (plan + interval) and status query
- [x] Stripe: Webhook handler for checkout.session.completed and customer.subscription.updated
- [x] Pricing page (/pricing): 3-tier cards (Fish/Reg/Shark) with feature lists and CTAs
- [x] UpgradeSuccess page (/upgrade-success) for post-checkout redirect
- [x] Sign-up gate modal: shown to anonymous users after 3 hand replays
- [x] Upgrade modal: shown when hand or coach monthly limit is hit
- [x] useGuestHandCount hook: tracks anonymous hand views in localStorage
- [x] Home.tsx: Pricing link in header, upgrade modal on limit error
- [x] HandReplayer.tsx: sign-up gate + upgrade modal wired to CoachPanel onLimitReached
- [x] 10 new tier limit tests, 115 total passing, 0 TypeScript errors

## Session: Player Profile Tab — Shark Only (Mar 2026)
- [x] DB: No new schema needed — derive metrics from existing hands table
- [x] Server: playerProfile.getMetrics tRPC procedure (protectedProcedure, Shark-gated)
- [x] Server: Compute radar dimensions from parsed hand history (VPIP, PFR, AF, 3bet%, CBet%, fold-to-cbet%)
- [x] Client: PlayerProfile page (/profile) with radar chart + stats table
- [x] Client: Radar chart using recharts RadarChart — dark gaming aesthetic
- [x] Client: Stats table (street-by-street: hands analysed, avg grade, EV BB)
- [x] Client: Shark paywall gate — blur overlay + upgrade CTA for non-Shark users
- [x] Client: Add Profile tab/link to navigation (My Hands header)
- [x] Wire /profile route in App.tsx

## Session: AI Profile Report + Radar Trend Tracker — COMPLETED (Mar 2026)
- [x] DB: profile_snapshots table (userId, snapshotDate, styleTag, handsCount, radar axes, street grades, aiReport)
- [x] DB: Applied migration via direct SQL (drizzle-kit interactive mode bypassed)
- [x] Server: playerProfile.generateReport — LLM coaching narrative from radar + street stats (Shark-only)
- [x] Server: playerProfile.saveSnapshot — persist current metrics as dated snapshot with upsert logic
- [x] Server: playerProfile.getSnapshots — list last 12 snapshots in chronological order
- [x] Client: AIReportSection — Generate Report button + Save Snapshot button + rendered markdown narrative
- [x] Client: TrendTrackerSection — Recharts LineChart of all 6 radar axes over time
- [x] Client: Delta badges showing change vs previous snapshot per axis (up/down/flat)
- [x] Client: Snapshot history table (date, style, hands, AI report indicator)
- [x] 135 tests passing, 0 TypeScript errors

## Session: Auto-Snapshot + Opponent Profiling + Report History — COMPLETED (Mar 2026)
- [x] DB: opponent_profiles table (userId, villainName, vpip, pfr, threeBet, cbet, foldToCbet, af, notes, aiAdjustments, createdAt)
- [x] DB: Applied migration via direct SQL
- [x] Server: Weekly auto-snapshot cron job (startAutoSnapshotScheduler — fires every Sunday midnight UTC)
- [x] Server: opponentProfile.create / list / update / delete / analyze tRPC procedures (Shark-gated)
- [x] Server: opponentProfile.analyze — LLM generates 4-section exploitative strategy per villain
- [x] Client: OpponentProfiler page (/opponents) — villain stats form with sliders, villain radar, exploitative adjustments
- [x] Client: Report History section on PlayerProfile — expandable list of past AI reports per snapshot
- [x] Client: Opponent Profiler CTA card on PlayerProfile page
- [x] Wire /opponents route in App.tsx
- [x] Tests: 14 new tests (villain normalisation, classification, AF, scheduler) — 150 total passing, 0 TS errors
