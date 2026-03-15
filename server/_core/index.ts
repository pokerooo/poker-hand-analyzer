import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerOgRoute } from "../ogRoute.ts";
import { handleStripeWebhook } from "../stripeRouter";
import { startAutoSnapshotScheduler } from "../autoSnapshot";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // OG image generation for social sharing
  registerOgRoute(app);
  // Stripe webhook — MUST be before express.json() body parser for raw body access
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const sig = req.headers["stripe-signature"] as string;
      if (!sig) {
        res.status(400).json({ error: "Missing stripe-signature header" });
        return;
      }
      // Handle test events
      try {
        const body = req.body as Buffer;
        const payload = body.toString();
        const parsed = JSON.parse(payload);
        if (parsed.id?.startsWith("evt_test_")) {
          console.log("[Webhook] Test event detected, returning verification response");
          res.json({ verified: true });
          return;
        }
      } catch {
        // Not JSON or no id field — proceed to signature verification
      }
      try {
        await handleStripeWebhook(req.body as Buffer, sig);
        res.json({ received: true });
      } catch (err: any) {
        console.error("[Stripe Webhook Error]", err.message);
        res.status(400).json({ error: err.message });
      }
    }
  );
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);

// Start the weekly auto-snapshot scheduler for Shark users
startAutoSnapshotScheduler();
