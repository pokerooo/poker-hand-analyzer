import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { analyzeHand } from "./analysisEngine";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  stats: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserStatistics(ctx.user.id);
    }),
    
    mistakes: protectedProcedure.query(async ({ ctx }) => {
      return await db.getMistakePatterns(ctx.user.id);
    }),
  }),

  hands: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserHands(ctx.user.id);
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getHandById(input.id, ctx.user.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        smallBlind: z.number(),
        bigBlind: z.number(),
        ante: z.number().default(0),
        heroPosition: z.enum(["UTG", "UTG+1", "UTG+2", "MP", "MP+1", "CO", "BTN", "SB", "BB"]),
        heroCard1: z.string(),
        heroCard2: z.string(),
        flopCard1: z.string().optional(),
        flopCard2: z.string().optional(),
        flopCard3: z.string().optional(),
        turnCard: z.string().optional(),
        riverCard: z.string().optional(),
        actions: z.array(z.object({
          street: z.enum(["preflop", "flop", "turn", "river"]),
          player: z.string(),
          action: z.enum(["fold", "check", "call", "bet", "raise", "allin"]),
          amount: z.number().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        // Run analysis engine
        const analysis = analyzeHand({
          smallBlind: input.smallBlind,
          bigBlind: input.bigBlind,
          ante: input.ante,
          heroPosition: input.heroPosition,
          heroCard1: input.heroCard1,
          heroCard2: input.heroCard2,
          flopCard1: input.flopCard1,
          flopCard2: input.flopCard2,
          flopCard3: input.flopCard3,
          turnCard: input.turnCard,
          riverCard: input.riverCard,
          actions: input.actions,
        });
        
        // Create hand with analysis results
        const result = await db.createHand({
          ...input,
          userId: ctx.user.id,
          actions: input.actions as any, // JSON type
          mistakeTags: analysis.mistakeTags as any, // JSON type
          overallRating: analysis.overallRating.toString(),
          preflopRating: analysis.preflopRating.toString(),
          flopRating: analysis.flopRating?.toString() || null,
          turnRating: analysis.turnRating?.toString() || null,
          riverRating: analysis.riverRating?.toString() || null,
          analysis: analysis.analysis,
        });
        
        return { 
          success: true, 
          handId: result[0]?.insertId,
          analysis: analysis,
        };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteHand(input.id, ctx.user.id);
        return { success: true };
      }),
    
    generateShareToken: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const shareToken = await db.generateHandShareToken(input.id, ctx.user.id);
        if (!shareToken) {
          throw new Error("Failed to generate share token");
        }
        return { shareToken };
      }),
    
    getByShareToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        return await db.getHandByShareToken(input.token);
      }),
    
    revokeSharing: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await db.revokeHandSharing(input.id, ctx.user.id);
        return { success };
      }),
    
    analyzeWithAI: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const hand = await db.getHandById(input.id, ctx.user.id);
        if (!hand) {
          throw new Error("Hand not found");
        }
        
        // Generate AI analysis using LLM
        const aiAnalysis = await db.generateAIAnalysis(hand);
        
        // Update hand with AI analysis
        await db.updateHandAIAnalysis(input.id, ctx.user.id, aiAnalysis);
        
        return { success: true, aiAnalysis };
      }),
    
    togglePublic: protectedProcedure
      .input(z.object({ id: z.number(), isPublic: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        return await db.toggleHandPublic(input.id, ctx.user.id, input.isPublic);
      }),
    
    upvote: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return await db.upvoteHand(input.id, ctx.user.id);
      }),
    
    hasUpvoted: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.hasUserUpvoted(input.id, ctx.user.id);
      }),
    
    addComment: protectedProcedure
      .input(z.object({ id: z.number(), content: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return await db.addComment(input.id, ctx.user.id, ctx.user.name || "Anonymous", input.content);
      }),
    
    getComments: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getHandComments(input.id);
      }),
    
    getPublic: publicProcedure
      .input(z.object({ limit: z.number().default(50), sortBy: z.enum(["recent", "top", "rating"]).default("recent") }))
      .query(async ({ input }) => {
        return await db.getPublicHands(input.limit, input.sortBy);
      }),
    
    // Tag management procedures
    addTag: protectedProcedure
      .input(z.object({ handId: z.number(), tag: z.string(), color: z.string().default("#3b82f6") }))
      .mutation(async ({ ctx, input }) => {
        return await db.addHandTag(input.handId, ctx.user.id, input.tag, input.color);
      }),
    
    removeTag: protectedProcedure
      .input(z.object({ handId: z.number(), tag: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return await db.removeHandTag(input.handId, ctx.user.id, input.tag);
      }),
    
    getTags: protectedProcedure
      .input(z.object({ handId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getHandTags(input.handId, ctx.user.id);
      }),
    
    getAllTags: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getAllUserTags(ctx.user.id);
      }),
    
    filterByTags: protectedProcedure
      .input(z.object({ tags: z.array(z.string()) }))
      .query(async ({ ctx, input }) => {
        return await db.filterHandsByTags(ctx.user.id, input.tags);
      }),
  }),

  discord: router({
    // Get all webhooks for the current user
    listWebhooks: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getDiscordWebhooks(ctx.user.id);
      }),
    
    // Add a new webhook
    addWebhook: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        webhookUrl: z.string().url(),
        isDefault: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.addDiscordWebhook(ctx.user.id, input.name, input.webhookUrl, input.isDefault);
      }),
    
    // Update a webhook
    updateWebhook: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        webhookUrl: z.string().url().optional(),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.updateDiscordWebhook(input.id, ctx.user.id, input.name, input.webhookUrl, input.isDefault);
      }),
    
    // Delete a webhook
    deleteWebhook: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return await db.deleteDiscordWebhook(input.id, ctx.user.id);
      }),
    
    // Share a hand to Discord
    shareHand: protectedProcedure
      .input(z.object({
        handId: z.number(),
        webhookId: z.number().optional(), // If not provided, use default webhook
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.shareHandToDiscord(input.handId, ctx.user.id, input.webhookId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
