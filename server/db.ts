import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { users, hands, discordWebhooks, InsertUser } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");
  const db = await getDb();
  if (!db) return;

  const updateSet: Record<string, unknown> = { lastSignedIn: new Date() };
  if (user.name !== undefined) updateSet.name = user.name;
  if (user.email !== undefined) updateSet.email = user.email;
  if (user.loginMethod !== undefined) updateSet.loginMethod = user.loginMethod;
  if (user.openId === ENV.ownerOpenId) updateSet.role = 'admin';

  await db.insert(users).values({
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    role: user.openId === ENV.ownerOpenId ? 'admin' : 'user',
    lastSignedIn: new Date(),
  }).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0] ?? undefined;
}

// ─── Hands ────────────────────────────────────────────────────────────────────

function generateSlug(len = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function createHand(data: {
  userId?: number | null;
  rawText: string;
  parsedData: unknown;
  title?: string | null;
  notes?: string | null;
  isPublic?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const shareSlug = generateSlug(8);
  await db.insert(hands).values({
    userId: data.userId ?? null,
    rawText: data.rawText,
    parsedData: data.parsedData,
    title: data.title ?? null,
    notes: data.notes ?? null,
    shareSlug,
    isPublic: data.isPublic ?? true,
    coachUnlocked: false,
    coachAnalysis: null,
  });
  return { shareSlug };
}

export async function getHandBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(hands).where(eq(hands.shareSlug, slug)).limit(1);
  return result[0] ?? undefined;
}

export async function getHandById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(hands).where(eq(hands.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function getUserHands(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(hands).where(eq(hands.userId, userId)).orderBy(desc(hands.createdAt));
}

export async function updateHandCoachAnalysis(id: number, coachAnalysis: unknown) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(hands).set({ coachUnlocked: true, coachAnalysis }).where(eq(hands.id, id));
}

export async function deleteHand(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(hands).where(and(eq(hands.id, id), eq(hands.userId, userId)));
}

// ─── Study Streak ─────────────────────────────────────────────────────────────

/**
 * Called whenever a user performs a study action (analysis, review, etc.).
 * Increments streak if last study was yesterday, resets if gap > 1 day, no-ops if already studied today.
 * Returns the updated streak count and whether a milestone was hit.
 */
export async function updateStudyStreak(userId: number): Promise<{ streak: number; isNewDay: boolean; milestone: number | null }> {
  const db = await getDb();
  if (!db) return { streak: 0, isNewDay: false, milestone: null };

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = result[0];
  if (!user) return { streak: 0, isNewDay: false, milestone: null };

  const todayUTC = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const lastDate = (user as any).lastStudyDate as string | null;

  // Already studied today — no change
  if (lastDate === todayUTC) {
    return { streak: (user as any).studyStreak ?? 0, isNewDay: false, milestone: null };
  }

  // Calculate yesterday
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayUTC = yesterday.toISOString().slice(0, 10);

  const currentStreak = (user as any).studyStreak ?? 0;
  const longestStreak = (user as any).longestStreak ?? 0;

  // Continue streak if last study was yesterday, else reset to 1
  const newStreak = lastDate === yesterdayUTC ? currentStreak + 1 : 1;
  const newLongest = Math.max(longestStreak, newStreak);

  await db.update(users).set({
    studyStreak: newStreak,
    lastStudyDate: todayUTC,
    longestStreak: newLongest,
  } as any).where(eq(users.id, userId));

  // Check for milestone (3, 7, 14, 30, 60, 100)
  const milestones = [3, 7, 14, 30, 60, 100];
  const milestone = milestones.includes(newStreak) ? newStreak : null;

  return { streak: newStreak, isNewDay: true, milestone };
}

export async function getStudyStreak(userId: number): Promise<{ streak: number; longestStreak: number; lastStudyDate: string | null }> {
  const db = await getDb();
  if (!db) return { streak: 0, longestStreak: 0, lastStudyDate: null };
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = result[0];
  if (!user) return { streak: 0, longestStreak: 0, lastStudyDate: null };
  return {
    streak: (user as any).studyStreak ?? 0,
    longestStreak: (user as any).longestStreak ?? 0,
    lastStudyDate: (user as any).lastStudyDate ?? null,
  };
}

export async function updateVillainType(id: number, userId: number, villainType: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(hands).set({ villainType }).where(and(eq(hands.id, id), eq(hands.userId, userId)));
}

export async function updateHand(id: number, userId: number, data: { rawText: string; parsedData: unknown; title?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateSet: Record<string, unknown> = {
    rawText: data.rawText,
    parsedData: data.parsedData,
    // Reset coach analysis when hand is edited
    coachAnalysis: null,
    coachUnlocked: false,
  };
  if (data.title !== undefined) updateSet.title = data.title;
  await db.update(hands).set(updateSet as any).where(and(eq(hands.id, id), eq(hands.userId, userId)));
}

// ─── Discord Webhooks ─────────────────────────────────────────────────────────

export async function getDiscordWebhooks(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(discordWebhooks).where(eq(discordWebhooks.userId, userId)).orderBy(desc(discordWebhooks.createdAt));
}

export async function createDiscordWebhook(userId: number, name: string, webhookUrl: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(discordWebhooks).values({ userId, name, webhookUrl, isDefault: false });
  return (result as any).insertId as number;
}

export async function deleteDiscordWebhook(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(discordWebhooks).where(and(eq(discordWebhooks.id, id), eq(discordWebhooks.userId, userId)));
}

export async function setDefaultDiscordWebhook(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(discordWebhooks).set({ isDefault: false }).where(eq(discordWebhooks.userId, userId));
  await db.update(discordWebhooks).set({ isDefault: true }).where(and(eq(discordWebhooks.id, id), eq(discordWebhooks.userId, userId)));
}

// ─── Stripe / Subscription ────────────────────────────────────────────────────

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function setUserPro(userId: number, stripeCustomerId: string, stripeSubscriptionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({
    stripeCustomerId,
    stripeSubscriptionId,
    isPro: true,
  } as any).where(eq(users.id, userId));
}

export async function setUserProByCustomerId(stripeCustomerId: string, isPro: boolean, stripeSubscriptionId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateSet: Record<string, unknown> = { isPro };
  if (stripeSubscriptionId) updateSet.stripeSubscriptionId = stripeSubscriptionId;
  await db.update(users).set(updateSet as any).where(eq(users.stripeCustomerId as any, stripeCustomerId));
}

export async function getUserByStripeCustomerId(stripeCustomerId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.stripeCustomerId as any, stripeCustomerId)).limit(1);
  return result[0] ?? undefined;
}

export async function isUserPro(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return (result[0] as any)?.isPro ?? false;
}
