/**
 * PokerReplay Stripe Products
 *
 * Pro subscription unlocks:
 *  - AI Coach analysis (unlimited)
 *  - Hand History Import (PokerStars / GGPoker .txt)
 *  - Pattern Recognition dashboard
 *
 * Pricing: $19.99/month recurring
 *
 * To create the product/price in Stripe test mode:
 *   1. Go to Stripe Dashboard → Products → Add product
 *   2. Name: "PokerReplay Pro"
 *   3. Price: $19.99 / month recurring
 *   4. Copy the price ID (price_xxx) into STRIPE_PRO_PRICE_ID below
 *
 * For now we use a lookup key so the price ID can be set via env.
 */

export const PRODUCTS = {
  pro: {
    name: "PokerReplay Pro",
    description: "Unlimited AI Coach · Hand History Import · Pattern Recognition",
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? "price_pro_monthly",
    amount: 1999, // cents
    currency: "usd",
    interval: "month" as const,
  },
} as const;

export type ProductKey = keyof typeof PRODUCTS;
