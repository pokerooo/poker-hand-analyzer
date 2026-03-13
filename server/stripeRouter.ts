import Stripe from "stripe";
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { setUserPro, getUserById, setUserPlanByCustomerId, getUserUsageStatus } from "./db";
import { PRODUCTS, PlanKey } from "./products";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-02-25.clover",
});

// Map Stripe price IDs → plan keys (populated from env at startup)
function priceIdToPlan(priceId: string): PlanKey | null {
  const map: Record<string, PlanKey> = {};
  if (process.env.STRIPE_REG_MONTHLY_PRICE_ID) map[process.env.STRIPE_REG_MONTHLY_PRICE_ID] = "reg";
  if (process.env.STRIPE_REG_ANNUAL_PRICE_ID) map[process.env.STRIPE_REG_ANNUAL_PRICE_ID] = "reg";
  if (process.env.STRIPE_SHARK_MONTHLY_PRICE_ID) map[process.env.STRIPE_SHARK_MONTHLY_PRICE_ID] = "shark";
  if (process.env.STRIPE_SHARK_ANNUAL_PRICE_ID) map[process.env.STRIPE_SHARK_ANNUAL_PRICE_ID] = "shark";
  // Legacy Pro price
  if (process.env.STRIPE_PRO_PRICE_ID) map[process.env.STRIPE_PRO_PRICE_ID] = "shark";
  return map[priceId] ?? null;
}

export const stripeRouter = router({
  // Get subscription status for the current user
  status: protectedProcedure.query(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    const usage = await getUserUsageStatus(ctx.user.id);
    return {
      isPro: (user as any)?.isPro ?? false,
      plan: (user as any)?.plan ?? "fish",
      stripeCustomerId: (user as any)?.stripeCustomerId ?? null,
      usage,
    };
  }),

  // Create a Stripe Checkout session for a given plan + billing interval
  createCheckout: protectedProcedure
    .input(z.object({
      origin: z.string().url(),
      plan: z.enum(["reg", "shark"]),
      interval: z.enum(["month", "year"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      // Determine product key
      const productKey = `${input.plan}_${input.interval === "month" ? "monthly" : "annual"}` as keyof typeof PRODUCTS;
      const product = PRODUCTS[productKey];
      if (!product) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid plan/interval combination" });

      // If a Stripe price ID is configured, use it directly; otherwise build inline price
      const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = (product as any).priceId
        ? { price: (product as any).priceId, quantity: 1 }
        : {
            price_data: {
              currency: product.currency,
              product_data: {
                name: product.name,
                description: product.description,
              },
              unit_amount: product.amount,
              recurring: { interval: product.interval },
            },
            quantity: 1,
          };

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: user.email ?? undefined,
        allow_promotion_codes: true,
        line_items: [lineItem],
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          user_id: ctx.user.id.toString(),
          plan: input.plan,
          customer_email: user.email ?? "",
          customer_name: user.name ?? "",
        },
        success_url: `${input.origin}/upgrade-success?session_id={CHECKOUT_SESSION_ID}&plan=${input.plan}`,
        cancel_url: `${input.origin}/pricing`,
      });

      return { checkoutUrl: session.url };
    }),

  // Create a Stripe Customer Portal session to manage subscription
  createPortal: protectedProcedure
    .input(z.object({ origin: z.string().url() }))
    .mutation(async ({ input, ctx }) => {
      const user = await getUserById(ctx.user.id);
      const customerId = (user as any)?.stripeCustomerId;
      if (!customerId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No active subscription found" });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${input.origin}/my-hands`,
      });

      return { portalUrl: session.url };
    }),
});

// ─── Stripe Webhook Handler (Express route, not tRPC) ─────────────────────────

export async function handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }

  // Handle test events
  if (event.id.startsWith("evt_test_")) {
    console.log("[Webhook] Test event detected, skipping processing");
    return;
  }

  console.log(`[Stripe Webhook] ${event.type} — ${event.id}`);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = parseInt(session.metadata?.user_id ?? "0", 10);
      const plan = (session.metadata?.plan ?? "shark") as PlanKey;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? "";
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? "";

      if (userId && customerId && subscriptionId) {
        const { setUserPlan } = await import("./db");
        await setUserPlan(userId, plan, customerId, subscriptionId);
        console.log(`[Stripe] User ${userId} upgraded to ${plan} (customer: ${customerId})`);
      }
      break;
    }

    case "customer.subscription.deleted": {
      // Subscription cancelled — downgrade to fish
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      await setUserPlanByCustomerId(customerId, "fish");
      console.log(`[Stripe] Plan downgraded to fish for customer ${customerId}`);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      const isActive = subscription.status === "active" || subscription.status === "trialing";

      if (isActive) {
        // Determine plan from the price ID on the subscription
        const priceId = subscription.items.data[0]?.price?.id ?? "";
        const plan = priceIdToPlan(priceId) ?? "shark";
        await setUserPlanByCustomerId(customerId, plan, subscription.id);
        console.log(`[Stripe] Subscription updated for customer ${customerId}: plan=${plan}`);
      } else {
        await setUserPlanByCustomerId(customerId, "fish");
        console.log(`[Stripe] Subscription inactive for customer ${customerId}: downgraded to fish`);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? "";
      if (customerId) {
        await setUserPlanByCustomerId(customerId, "fish");
        console.log(`[Stripe] Payment failed for customer ${customerId} — downgraded to fish`);
      }
      break;
    }

    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }
}
