# Poker AI Coach - Deployment Guide

## Vercel Deployment

### Prerequisites
- GitHub account with the repository pushed
- Vercel account (free tier available at vercel.com)
- Custom domain (aicoachpoker.com)

### Step 1: Push to GitHub
```bash
git remote add origin https://github.com/your-username/poker-hand-analyzer.git
git branch -M main
git push -u origin main
```

### Step 2: Connect to Vercel
1. Go to https://vercel.com
2. Click "New Project"
3. Import the GitHub repository
4. Select "Other" as the framework
5. Configure build settings:
   - **Build Command**: `pnpm build`
   - **Output Directory**: `dist/public`
   - **Install Command**: `pnpm install`

### Step 3: Environment Variables
Add these in Vercel Project Settings → Environment Variables:

```
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_test_your_key
OAUTH_SERVER_URL=https://oauth.yourdomain.com
VITE_OAUTH_PORTAL_URL=https://oauth.yourdomain.com
VITE_APP_ID=poker-coach-production
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### Step 4: Connect Custom Domain
1. In Vercel Project Settings → Domains
2. Add `aicoachpoker.com`
3. Update your domain registrar's DNS records to point to Vercel:
   - Add CNAME record: `aicoachpoker.com` → `cname.vercel.com`
   - Or use Vercel's nameservers

### Step 5: Deploy
- Push to main branch to auto-deploy
- Vercel will build and deploy automatically

## Local Development

```bash
# Install dependencies
pnpm install

# Development mode
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Environment Setup

Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

## Database Setup

For production, use a managed MySQL service:
- **PlanetScale** (free tier, MySQL-compatible)
- **AWS RDS** (managed MySQL)
- **DigitalOcean** (managed databases)

Update `DATABASE_URL` in environment variables.

## Discord Notifications

1. Create a Discord webhook in your server
2. Add the webhook URL to `DISCORD_WEBHOOK_URL` env variable
3. The app will send notifications on key events

## Monitoring

- Check Vercel Analytics dashboard for performance
- Monitor error logs in Vercel Functions
- Set up error tracking with Sentry (optional)

## Budget Optimization

- **Vercel**: Free tier includes 100GB bandwidth/month
- **Database**: Use PlanetScale free tier (5GB storage)
- **Discord**: Free webhooks
- **Total monthly cost**: $0 (free tier)

## Support

For issues or questions, check:
- Vercel documentation: https://vercel.com/docs
- Project repository: https://github.com/pokerooo/poker-hand-analyzer
