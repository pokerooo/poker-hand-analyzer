import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

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
        const result = await db.createHand({
          ...input,
          userId: ctx.user.id,
          actions: input.actions as any, // JSON type
        });
        return { success: true, handId: result[0]?.insertId };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteHand(input.id, ctx.user.id);
        return { success: true };
      }),
  }),
  
  stats: router({
    me: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserStats(ctx.user.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;
