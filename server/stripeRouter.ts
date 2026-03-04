import Stripe from "stripe";
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { setUserPro, isUserPro, getUserById } from "./db";
import { PRODUCTS } from "./products";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-02-25.clover",
});

export const stripeRouter = router({
  // Get subscription status for the current user
  status: protectedProcedure.query(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    return {
      isPro: (user as any)?.isPro ?? false,
      stripeCustomerId: (user as any)?.stripeCustomerId ?? null,
    };
  }),

  // Create a Stripe Checkout session for Pro subscription
  createCheckout: protectedProcedure
    .input(z.object({ origin: z.string().url() }))
    .mutation(async ({ input, ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      // Check if already Pro
      if ((user as any)?.isPro) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Already subscribed to Pro" });
      }

      const product = PRODUCTS.pro;

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: user.email ?? undefined,
        allow_promotion_codes: true,
        line_items: [
          {
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
          },
        ],
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          user_id: ctx.user.id.toString(),
          customer_email: user.email ?? "",
          customer_name: user.name ?? "",
        },
        success_url: `${input.origin}/pro-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${input.origin}/my-hands`,
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
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? "";
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? "";

      if (userId && customerId && subscriptionId) {
        await setUserPro(userId, customerId, subscriptionId);
        console.log(`[Stripe] User ${userId} upgraded to Pro (customer: ${customerId})`);
      }
      break;
    }

    case "customer.subscription.deleted": {
      // Subscription cancelled — revoke Pro access
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      const { setUserProByCustomerId } = await import("./db");
      await setUserProByCustomerId(customerId, false);
      console.log(`[Stripe] Pro access revoked for customer ${customerId}`);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      const isActive = subscription.status === "active" || subscription.status === "trialing";
      const { setUserProByCustomerId } = await import("./db");
      await setUserProByCustomerId(customerId, isActive, subscription.id);
      console.log(`[Stripe] Subscription updated for customer ${customerId}: ${subscription.status}`);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? "";
      if (customerId) {
        const { setUserProByCustomerId } = await import("./db");
        await setUserProByCustomerId(customerId, false);
        console.log(`[Stripe] Payment failed for customer ${customerId} — Pro access suspended`);
      }
      break;
    }

    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }
}
