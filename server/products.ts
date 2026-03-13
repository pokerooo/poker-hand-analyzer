/**
 * Poker AI — Subscription Tiers
 *
 * Fish (Free):
 *   - 3 hand replays/month (no login required for first 3, then sign-up gate)
 *   - 3 AI coach uses/month (analyze + chat combined)
 *
 * Reg ($19/mo or $99/yr):
 *   - 15 hand analyses & AI coach questions/month
 *   - Memory Bank, Leak & Pattern Detection, AI Coach
 *
 * Shark ($29/mo or $199/yr):
 *   - 50 hand analyses/month
 *   - Unlimited AI coaching questions
 *   - Top-tier exploitative analysis
 *   - Database analysis, Memory Bank, Leak & Pattern Detection
 *   - Bankroll/Win Rate tracker (coming soon)
 *   - Personalised poker style profile
 */

export const PLAN_LIMITS = {
  fish: {
    handsPerMonth: 3,
    coachPerMonth: 3,
  },
  reg: {
    handsPerMonth: 15,
    coachPerMonth: 15,
  },
  shark: {
    handsPerMonth: 50,
    coachPerMonth: Infinity, // unlimited
  },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;

export const PRODUCTS = {
  // Legacy single Pro product (kept for backwards compat with existing subscribers)
  pro: {
    name: "Poker AI Pro",
    description: "Unlimited AI Coach · Hand History Import · Pattern Recognition",
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
    amount: 1999,
    currency: "usd",
    interval: "month" as const,
  },

  // Reg tier
  reg_monthly: {
    name: "Poker AI Reg",
    description: "15 hand analyses & AI coach questions/month · Memory Bank · Leak Detection",
    priceId: process.env.STRIPE_REG_MONTHLY_PRICE_ID ?? "",
    amount: 1900, // $19.00
    currency: "usd",
    interval: "month" as const,
    plan: "reg" as PlanKey,
  },
  reg_annual: {
    name: "Poker AI Reg (Annual)",
    description: "15 hand analyses & AI coach questions/month · Memory Bank · Leak Detection",
    priceId: process.env.STRIPE_REG_ANNUAL_PRICE_ID ?? "",
    amount: 9900, // $99.00/yr
    currency: "usd",
    interval: "year" as const,
    plan: "reg" as PlanKey,
  },

  // Shark tier
  shark_monthly: {
    name: "Poker AI Shark",
    description: "50 hand analyses · Unlimited AI coaching · Exploitative analysis · All features",
    priceId: process.env.STRIPE_SHARK_MONTHLY_PRICE_ID ?? "",
    amount: 2900, // $29.00
    currency: "usd",
    interval: "month" as const,
    plan: "shark" as PlanKey,
  },
  shark_annual: {
    name: "Poker AI Shark (Annual)",
    description: "50 hand analyses · Unlimited AI coaching · Exploitative analysis · All features",
    priceId: process.env.STRIPE_SHARK_ANNUAL_PRICE_ID ?? "",
    amount: 19900, // $199.00/yr
    currency: "usd",
    interval: "year" as const,
    plan: "shark" as PlanKey,
  },
} as const;

export type ProductKey = keyof typeof PRODUCTS;
