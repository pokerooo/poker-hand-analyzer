import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, hands, InsertHand, userStats, InsertUserStats } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Hands Management
 */
export async function createHand(hand: InsertHand) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(hands).values(hand);
  return result;
}

export async function getUserHands(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(hands)
    .where(eq(hands.userId, userId))
    .orderBy(desc(hands.createdAt));
}

export async function getHandById(handId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(hands)
    .where(eq(hands.id, handId))
    .limit(1);
  
  if (result.length === 0) return undefined;
  
  // Verify ownership
  if (result[0].userId !== userId) return undefined;
  
  return result[0];
}

export async function updateHand(handId: number, userId: number, updates: Partial<InsertHand>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verify ownership first
  const existing = await getHandById(handId, userId);
  if (!existing) throw new Error("Hand not found or access denied");
  
  await db
    .update(hands)
    .set(updates)
    .where(eq(hands.id, handId));
}

export async function deleteHand(handId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verify ownership first
  const existing = await getHandById(handId, userId);
  if (!existing) throw new Error("Hand not found or access denied");
  
  await db.delete(hands).where(eq(hands.id, handId));
}

/**
 * User Statistics
 */
export async function getUserStats(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(userStats)
    .where(eq(userStats.userId, userId))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserStats(userId: number, stats: Partial<InsertUserStats>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getUserStats(userId);
  
  if (existing) {
    await db
      .update(userStats)
      .set(stats)
      .where(eq(userStats.userId, userId));
  } else {
    await db.insert(userStats).values({
      userId,
      ...stats,
    });
  }
}

// Statistics queries
export async function getUserStatistics(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user statistics: database not available");
    return null;
  }

  try {
    // Get all hands for the user
    const userHands = await db.select().from(hands).where(eq(hands.userId, userId));

    if (userHands.length === 0) {
      return {
        totalHands: 0,
        averageRating: 0,
        mistakeFrequency: {},
        positionPerformance: {},
        ratingTrend: [],
      };
    }

    // Calculate average rating
    const totalRating = userHands.reduce((sum, hand) => sum + parseFloat(hand.overallRating || "0"), 0);
    const averageRating = totalRating / userHands.length;

    // Count mistake frequency
    const mistakeFrequency: Record<string, number> = {};
    userHands.forEach((hand) => {
      const mistakes = (hand.mistakeTags as unknown as string[]) || [];
      mistakes.forEach((mistake) => {
        mistakeFrequency[mistake] = (mistakeFrequency[mistake] || 0) + 1;
      });
    });

    // Calculate position performance
    const positionPerformance: Record<string, { count: number; avgRating: number }> = {};
    userHands.forEach((hand) => {
      const position = hand.heroPosition;
      if (!positionPerformance[position]) {
        positionPerformance[position] = { count: 0, avgRating: 0 };
      }
      positionPerformance[position].count++;
      positionPerformance[position].avgRating += parseFloat(hand.overallRating || "0");
    });

    // Calculate average ratings for each position
    Object.keys(positionPerformance).forEach((position) => {
      const data = positionPerformance[position];
      data.avgRating = data.avgRating / data.count;
    });

    // Get rating trend over time (last 30 hands)
    const recentHands = userHands
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 30)
      .reverse();

    const ratingTrend = recentHands.map((hand, index) => ({
      handNumber: index + 1,
      rating: parseFloat(hand.overallRating || "0"),
      date: hand.createdAt,
    }));

    return {
      totalHands: userHands.length,
      averageRating: parseFloat(averageRating.toFixed(2)),
      mistakeFrequency,
      positionPerformance,
      ratingTrend,
    };
  } catch (error) {
    console.error("[Database] Failed to get user statistics:", error);
    return null;
  }
}

export async function getMistakePatterns(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get mistake patterns: database not available");
    return [];
  }

  try {
    const userHands = await db.select().from(hands).where(eq(hands.userId, userId));

    const mistakeCount: Record<string, number> = {};
    userHands.forEach((hand) => {
      const mistakes = (hand.mistakeTags as unknown as string[]) || [];
      mistakes.forEach((mistake) => {
        mistakeCount[mistake] = (mistakeCount[mistake] || 0) + 1;
      });
    });

    // Convert to array and sort by frequency
    return Object.entries(mistakeCount)
      .map(([mistake, count]) => ({ mistake, count }))
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error("[Database] Failed to get mistake patterns:", error);
    return [];
  }
}
