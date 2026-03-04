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
