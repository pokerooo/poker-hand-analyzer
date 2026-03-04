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
