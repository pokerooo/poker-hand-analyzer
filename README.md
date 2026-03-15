# Poker AI Coach

A professional poker hand analyser and AI coaching platform built for mid-to-high stakes cash game and MTT players ($500–$1,000 buy-ins). Paste any hand in natural language, watch an animated replay, and receive street-by-street exploitative analysis from an AI coach trained on professional-level strategy.

---

## Feature Overview

| Feature | Fish (Free) | Reg ($19/mo · $99/yr) | Shark ($29/mo · $199/yr) |
|---|---|---|---|
| Hand Replayer (animated) | 3/month (no login) | 15/month | 50/month |
| AI Coach analysis | 3/month | 15/month | Unlimited |
| Memory Bank | — | ✓ | ✓ |
| Leak & Pattern Detection | — | ✓ | ✓ |
| Player Profile (radar chart) | — | — | ✓ |
| AI Coaching Report | — | — | ✓ |
| Weekly Auto-Snapshot | — | — | ✓ |
| Opponent Profiler | — | — | ✓ |
| Win Rate / Bankroll Tracker | — | — | Coming soon |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Tailwind CSS 4, shadcn/ui, Recharts |
| Backend | Node.js 22, Express 4, tRPC 11 |
| Database | MySQL / TiDB (via Drizzle ORM) |
| Auth | Manus OAuth (JWT session cookies) |
| Payments | Stripe (Checkout Sessions + Webhooks) |
| AI | Manus Built-in LLM API (OpenAI-compatible) |
| Build | Vite 6, esbuild, pnpm |
| Tests | Vitest (150 tests) |

---

## Prerequisites

Before running locally, ensure you have the following installed:

- **Node.js** v22.x or later — [nodejs.org](https://nodejs.org)
- **pnpm** v9.x or later — `npm install -g pnpm`
- **MySQL** 8.x (local) **or** a hosted MySQL-compatible database (PlanetScale, TiDB Cloud, AWS RDS, DigitalOcean)
- **Git**

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/pokerooo/poker-hand-analyzer.git
cd poker-hand-analyzer
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and set the following variables (see the full reference table below):

```env
# ── Required ──────────────────────────────────────────────────────────────────
DATABASE_URL=mysql://user:password@localhost:3306/poker_coach
JWT_SECRET=a-long-random-secret-string-at-least-32-chars

# ── Manus OAuth (required for user login) ─────────────────────────────────────
VITE_APP_ID=your-manus-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im

# ── Manus LLM API (required for AI Coach) ─────────────────────────────────────
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your-forge-api-key
VITE_FRONTEND_FORGE_API_KEY=your-frontend-forge-api-key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im

# ── Stripe (required for paid subscriptions) ──────────────────────────────────
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key

# Stripe Price IDs — create these in your Stripe Dashboard
STRIPE_REG_MONTHLY_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_REG_ANNUAL_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_SHARK_MONTHLY_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_SHARK_ANNUAL_PRICE_ID=price_xxxxxxxxxxxxx

# ── Optional ──────────────────────────────────────────────────────────────────
PORT=3000
OWNER_OPEN_ID=your-manus-open-id
OWNER_NAME=Your Name
```

### 4. Set Up the Database

Run the Drizzle migration to create all tables:

```bash
pnpm db:push
```

This will create the following tables in your database:

| Table | Purpose |
|---|---|
| `users` | User accounts, plan tier, monthly usage counters |
| `hands` | Parsed hand histories with AI coach analysis |
| `profileSnapshots` | Weekly radar metric snapshots per user |
| `opponentProfiles` | Villain stats and AI exploitative adjustments |
| `studyTopics` | Memory bank study items |
| `aiCallLog` | LLM call audit log |
| `siteStats` | Aggregate site statistics |
| `discordWebhooks` | Discord notification webhooks |

> **Note:** If `pnpm db:push` enters an interactive prompt, apply the migration directly:
> ```bash
> node -e "
> const mysql = require('mysql2/promise');
> mysql.createConnection(process.env.DATABASE_URL).then(c =>
>   c.query('CREATE TABLE IF NOT EXISTS profileSnapshots ...')
> );"
> ```

### 5. Start the Development Server

```bash
pnpm dev
```

The app will be available at **http://localhost:3000**. The server runs both the Express API and Vite dev server through a single process.

---

## Stripe Setup

### Creating Products and Prices

1. Log in to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Go to **Products** → **Add product**
3. Create four products matching the tier structure:

| Product Name | Price | Interval | Environment Variable |
|---|---|---|---|
| Poker AI Reg | $19.00 | Monthly | `STRIPE_REG_MONTHLY_PRICE_ID` |
| Poker AI Reg Annual | $99.00 | Yearly | `STRIPE_REG_ANNUAL_PRICE_ID` |
| Poker AI Shark | $29.00 | Monthly | `STRIPE_SHARK_MONTHLY_PRICE_ID` |
| Poker AI Shark Annual | $199.00 | Yearly | `STRIPE_SHARK_ANNUAL_PRICE_ID` |

4. Copy each **Price ID** (format: `price_xxxxx`) into your `.env` file.

### Configuring the Webhook

1. In Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**
2. Set the endpoint URL to: `https://your-domain.com/api/stripe/webhook`
3. Select these events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the **Signing secret** (`whsec_xxxxx`) into `STRIPE_WEBHOOK_SECRET`

### Test Cards

Use these card numbers in test mode:

| Scenario | Card Number |
|---|---|
| Successful payment | `4242 4242 4242 4242` |
| Payment declined | `4000 0000 0000 0002` |
| 3D Secure required | `4000 0025 0000 3155` |

Use any future expiry date and any 3-digit CVV.

---

## Production Deployment

### Option A — Self-Hosted (VPS / Docker)

#### Build the Application

```bash
pnpm build
```

This produces:
- `dist/public/` — compiled React frontend (served as static files)
- `dist/index.js` — compiled Express server bundle

#### Start the Production Server

```bash
NODE_ENV=production node dist/index.js
```

The server listens on `process.env.PORT` (default `3000`). Place Nginx or Caddy in front for SSL termination.

#### Nginx Example Configuration

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Process Management (PM2)

```bash
npm install -g pm2
pm2 start dist/index.js --name poker-ai --env production
pm2 save
pm2 startup
```

### Option B — Railway

1. Connect your GitHub repository at [railway.app](https://railway.app)
2. Add a **MySQL** plugin from the Railway dashboard
3. Set all environment variables in Railway's **Variables** tab
4. Set the start command to: `pnpm build && node dist/index.js`
5. Deploy — Railway handles SSL and domains automatically

### Option C — Render

1. Create a new **Web Service** at [render.com](https://render.com)
2. Connect your GitHub repository
3. Set:
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `node dist/index.js`
4. Add a **MySQL** database from Render's dashboard
5. Set all environment variables in the **Environment** tab

---

## Environment Variable Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✓ | MySQL connection string (`mysql://user:pass@host:3306/db`) |
| `JWT_SECRET` | ✓ | Secret for signing session cookies (min 32 chars) |
| `VITE_APP_ID` | ✓ | Manus OAuth application ID |
| `OAUTH_SERVER_URL` | ✓ | Manus OAuth backend URL |
| `VITE_OAUTH_PORTAL_URL` | ✓ | Manus login portal URL (used by frontend) |
| `BUILT_IN_FORGE_API_URL` | ✓ | Manus LLM API base URL |
| `BUILT_IN_FORGE_API_KEY` | ✓ | Manus LLM API key (server-side) |
| `VITE_FRONTEND_FORGE_API_KEY` | ✓ | Manus LLM API key (frontend) |
| `VITE_FRONTEND_FORGE_API_URL` | ✓ | Manus LLM API URL (frontend) |
| `STRIPE_SECRET_KEY` | ✓ | Stripe secret key (`sk_live_` or `sk_test_`) |
| `STRIPE_WEBHOOK_SECRET` | ✓ | Stripe webhook signing secret (`whsec_`) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | ✓ | Stripe publishable key (`pk_live_` or `pk_test_`) |
| `STRIPE_REG_MONTHLY_PRICE_ID` | ✓ | Stripe Price ID for Reg monthly ($19) |
| `STRIPE_REG_ANNUAL_PRICE_ID` | ✓ | Stripe Price ID for Reg annual ($99) |
| `STRIPE_SHARK_MONTHLY_PRICE_ID` | ✓ | Stripe Price ID for Shark monthly ($29) |
| `STRIPE_SHARK_ANNUAL_PRICE_ID` | ✓ | Stripe Price ID for Shark annual ($199) |
| `PORT` | — | Server port (default: `3000`) |
| `OWNER_OPEN_ID` | — | Owner's Manus Open ID for admin notifications |
| `OWNER_NAME` | — | Owner's display name |

---

## Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server (Express + Vite HMR on port 3000) |
| `pnpm build` | Build frontend and bundle server for production |
| `pnpm start` | Start the production server (`dist/index.js`) |
| `pnpm test` | Run all 150 Vitest unit tests |
| `pnpm check` | TypeScript type-check without emitting files |
| `pnpm db:push` | Generate and apply Drizzle ORM migrations |
| `pnpm format` | Format all files with Prettier |

---

## Project Structure

```
poker-hand-analyzer/
├── client/                    # React frontend
│   ├── public/                # Static assets (favicon, og images)
│   └── src/
│       ├── pages/             # Page-level components
│       │   ├── Home.tsx           # Landing page + hand input
│       │   ├── HandReplayer.tsx   # Animated table + AI Coach
│       │   ├── MyHands.tsx        # Hand history dashboard
│       │   ├── PlayerProfile.tsx  # Radar chart + trend tracker (Shark)
│       │   ├── OpponentProfiler.tsx # Villain profiling (Shark)
│       │   ├── Pricing.tsx        # 3-tier pricing page
│       │   ├── CoachChat.tsx      # AI Coach chat interface
│       │   ├── MemoryBank.tsx     # Study memory bank (Reg+)
│       │   ├── PatternRecognition.tsx # Leak detection (Reg+)
│       │   └── WinRateVisualizer.tsx  # Win rate tracker
│       ├── components/        # Reusable UI components
│       └── lib/trpc.ts        # tRPC client binding
├── server/
│   ├── _core/                 # Framework plumbing (OAuth, tRPC, LLM)
│   ├── routers.ts             # Main tRPC router (hands, coach, chat)
│   ├── playerProfileRouter.ts # Radar metrics + snapshots (Shark)
│   ├── opponentProfileRouter.ts # Villain profiling (Shark)
│   ├── stripeRouter.ts        # Stripe checkout + webhook handler
│   ├── autoSnapshot.ts        # Weekly cron job for radar snapshots
│   ├── db.ts                  # Drizzle query helpers
│   ├── products.ts            # Stripe plan definitions and limits
│   └── *.test.ts              # Vitest test files
├── drizzle/
│   └── schema.ts              # Database schema (all tables)
├── shared/
│   └── types.ts               # Shared TypeScript types
├── .env.example               # Environment variable template
├── drizzle.config.ts          # Drizzle ORM configuration
├── vite.config.ts             # Vite build configuration
└── vitest.config.ts           # Test configuration
```

---

## Authentication

The app uses **Manus OAuth** for user authentication. When running outside the Manus platform, you will need to configure your own OAuth provider or replace the auth layer in `server/_core/oauth.ts`.

Session cookies are signed with `JWT_SECRET` and are HTTP-only. The frontend reads auth state via `trpc.auth.me.useQuery()` — no direct cookie access is needed in components.

---

## AI Coach Architecture

All LLM calls are made server-side through `server/_core/llm.ts` using the `invokeLLM()` helper. The AI coach uses a structured JSON response format to return:

- Street-by-street grades (A–F) with hand counts
- An overall exploitative recommendation
- A villain roast (one-liner critique of opponent's play)
- Specific adjustments based on villain type (TAG / LAG / Nit / Calling Station)

The Player Profile radar is computed from the parsed hand history without additional LLM calls — VPIP, PFR, 3-Bet%, C-Bet%, Fold-to-CBet, and Aggression Factor are derived directly from the stored action sequences.

---

## Running Tests

```bash
pnpm test
```

The test suite covers:

- Hand parser (natural language → structured JSON)
- Analysis engine (grade computation, EV estimation)
- Tier limit enforcement (Fish / Reg / Shark monthly limits)
- Player profile metric normalisation
- Opponent profile villain classification
- Auto-snapshot scheduler timing
- Auth logout flow

All 150 tests should pass with zero TypeScript errors (`pnpm check`).

---

## Common Issues

**`pnpm db:push` hangs interactively**
This occurs when drizzle-kit detects schema drift. Apply the migration directly via SQL or use the `webdev_execute_sql` tool if running inside Manus.

**Stripe webhook signature verification fails**
Ensure the raw request body reaches the webhook handler before `express.json()` parses it. The route `/api/stripe/webhook` uses `express.raw({ type: 'application/json' })` — do not move it after the JSON middleware.

**LLM calls return 401**
Verify `BUILT_IN_FORGE_API_KEY` is set correctly. This key must be a server-side secret and must never be exposed to the frontend.

**OAuth redirect loop**
Ensure `VITE_OAUTH_PORTAL_URL` and `OAUTH_SERVER_URL` are set correctly. The redirect URL is constructed from `window.location.origin` at runtime — never hardcode a domain.

---

## Subscription Plan Management

To manually change a user's plan (e.g., for testing or manual upgrades), update the `plan` column in the `users` table directly:

```sql
UPDATE users SET plan = 'shark' WHERE email = 'user@example.com';
```

Valid values: `fish` (default), `reg`, `shark`.

Monthly usage counters reset automatically when the current date exceeds `usageResetDate`. To force a reset:

```sql
UPDATE users SET monthlyHandsUsed = 0, monthlyCoachUsed = 0, usageResetDate = NOW() WHERE id = 1;
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make changes and run tests: `pnpm test && pnpm check`
4. Commit with a descriptive message
5. Open a pull request against `main`

All PRs must pass the full test suite and TypeScript check before merging.

---

## License

Private repository. All rights reserved.
