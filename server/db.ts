import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { sql, inArray } from "drizzle-orm";
import { InsertUser, users, hands, InsertHand, userStats, InsertUserStats, handUpvotes, handComments, handTags, discordWebhooks, InsertDiscordWebhook } from "../drizzle/schema";
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

// Generate a random share token
function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Generate and save a share token for a hand
export async function generateHandShareToken(handId: number, userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Verify the hand belongs to the user
    const hand = await getHandById(handId, userId);
    if (!hand) {
      throw new Error("Hand not found or access denied");
    }

    // Generate a unique token
    const shareToken = generateShareToken();

    // Update the hand with the share token and make it public
    await db
      .update(hands)
      .set({ shareToken, isPublic: 1 })
      .where(eq(hands.id, handId));

    return shareToken;
  } catch (error) {
    console.error("[Database] Failed to generate share token:", error);
    return null;
  }
}

// Get a hand by share token (public access)
export async function getHandByShareToken(shareToken: string) {
  const db = await getDb();
  if (!db) return undefined;

  try {
    const result = await db
      .select()
      .from(hands)
      .where(and(eq(hands.shareToken, shareToken), eq(hands.isPublic, 1)))
      .limit(1);

    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get hand by share token:", error);
    return undefined;
  }
}

// Revoke sharing (make hand private again)
export async function revokeHandSharing(handId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Verify the hand belongs to the user
    const hand = await getHandById(handId, userId);
    if (!hand) {
      return false;
    }

    // Make the hand private and clear the share token
    await db
      .update(hands)
      .set({ isPublic: 0, shareToken: null })
      .where(eq(hands.id, handId));

    return true;
  } catch (error) {
    console.error("[Database] Failed to revoke hand sharing:", error);
    return false;
  }
}


/**
 * AI Analysis Functions
 */
import { invokeLLM } from "./_core/llm";

export async function generateAIAnalysis(hand: any): Promise<string> {
  // Format hand data for LLM
  const handDescription = formatHandForAI(hand);
  
  // Call LLM to generate analysis
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a professional poker coach analyzing hands. Provide strategic recommendations for each street, identify mistakes, and suggest improvements. Focus on:
1. Position and range considerations
2. Bet sizing and pot odds
3. Board texture analysis
4. Opponent tendencies (when applicable)
5. GTO-based suggestions
6. Specific mistakes and how to fix them

Format your response in clear sections for each street (Preflop, Flop, Turn, River) with actionable advice.`
      },
      {
        role: "user",
        content: handDescription as string
      }
    ]
  });
  
  const content = response.choices[0]?.message?.content;
  if (typeof content === 'string') {
    return content;
  }
  return "Analysis unavailable";
}

function formatHandForAI(hand: any): string {
  const actions = JSON.parse(hand.actions || "[]");
  
  let description = `# Hand Analysis Request\n\n`;
  description += `**Game Info:**\n`;
  description += `- Blinds: ${hand.smallBlind}/${hand.bigBlind}`;
  if (hand.ante > 0) description += ` (Ante: ${hand.ante})`;
  description += `\n\n`;
  
  description += `**Hero:**\n`;
  description += `- Position: ${hand.heroPosition}\n`;
  description += `- Cards: ${hand.heroCard1} ${hand.heroCard2}\n\n`;
  
  // Group actions by street
  const preflopActions = actions.filter((a: any) => a.street === "preflop");
  const flopActions = actions.filter((a: any) => a.street === "flop");
  const turnActions = actions.filter((a: any) => a.street === "turn");
  const riverActions = actions.filter((a: any) => a.street === "river");
  
  if (preflopActions.length > 0) {
    description += `**Preflop:**\n`;
    preflopActions.forEach((a: any) => {
      description += `- ${a.player}: ${a.action}`;
      if (a.amount) description += ` ${a.amount}`;
      description += `\n`;
    });
    description += `\n`;
  }
  
  if (hand.flopCard1 && hand.flopCard2 && hand.flopCard3) {
    description += `**Flop:** ${hand.flopCard1} ${hand.flopCard2} ${hand.flopCard3}\n`;
    if (flopActions.length > 0) {
      flopActions.forEach((a: any) => {
        description += `- ${a.player}: ${a.action}`;
        if (a.amount) description += ` ${a.amount}`;
        description += `\n`;
      });
    }
    description += `\n`;
  }
  
  if (hand.turnCard) {
    description += `**Turn:** ${hand.turnCard}\n`;
    if (turnActions.length > 0) {
      turnActions.forEach((a: any) => {
        description += `- ${a.player}: ${a.action}`;
        if (a.amount) description += ` ${a.amount}`;
        description += `\n`;
      });
    }
    description += `\n`;
  }
  
  if (hand.riverCard) {
    description += `**River:** ${hand.riverCard}\n`;
    if (riverActions.length > 0) {
      riverActions.forEach((a: any) => {
        description += `- ${a.player}: ${a.action}`;
        if (a.amount) description += ` ${a.amount}`;
        description += `\n`;
      });
    }
    description += `\n`;
  }
  
  description += `\nPlease analyze this hand and provide strategic recommendations.`;
  
  return description;
}

export async function updateHandAIAnalysis(handId: number, userId: number, aiAnalysis: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verify ownership
  const existing = await getHandById(handId, userId);
  if (!existing) throw new Error("Hand not found or access denied");
  
  await db
    .update(hands)
    .set({ aiAnalysis })
    .where(eq(hands.id, handId));
}


// ============================================
// Community Features
// ============================================

export async function toggleHandPublic(handId: number, userId: number, isPublic: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verify ownership
  const existing = await getHandById(handId, userId);
  if (!existing) throw new Error("Hand not found or access denied");
  
  await db
    .update(hands)
    .set({ isPublic: isPublic ? 1 : 0 })
    .where(eq(hands.id, handId));
  
  return { success: true };
}

export async function upvoteHand(handId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if already upvoted
  const existing = await db
    .select()
    .from(handUpvotes)
    .where(and(eq(handUpvotes.handId, handId), eq(handUpvotes.userId, userId)))
    .limit(1);
  
  if (existing.length > 0) {
    // Remove upvote
    await db
      .delete(handUpvotes)
      .where(and(eq(handUpvotes.handId, handId), eq(handUpvotes.userId, userId)));
    
    // Decrement count
    await db.execute(sql`UPDATE hands SET upvoteCount = upvoteCount - 1 WHERE id = ${handId}`);
    
    return { upvoted: false };
  } else {
    // Add upvote
    await db.insert(handUpvotes).values({
      handId,
      userId,
    });
    
    // Increment count
    await db.execute(sql`UPDATE hands SET upvoteCount = upvoteCount + 1 WHERE id = ${handId}`);
    
    return { upvoted: true };
  }
}

export async function hasUserUpvoted(handId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select()
    .from(handUpvotes)
    .where(and(eq(handUpvotes.handId, handId), eq(handUpvotes.userId, userId)))
    .limit(1);
  
  return result.length > 0;
}

export async function addComment(handId: number, userId: number, userName: string, content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(handComments).values({
    handId,
    userId,
    userName,
    content,
  });
  
  // Increment comment count
  await db.execute(sql`UPDATE hands SET commentCount = commentCount + 1 WHERE id = ${handId}`);
  
  return { success: true, commentId: result[0]?.insertId };
}

export async function getHandComments(handId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .select()
    .from(handComments)
    .where(eq(handComments.handId, handId))
    .orderBy(desc(handComments.createdAt));
}

export async function getPublicHands(limit: number = 50, sortBy: "recent" | "top" | "rating" = "recent") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  let query = db
    .select()
    .from(hands)
    .where(eq(hands.isPublic, 1))
    .limit(limit);
  
  if (sortBy === "recent") {
    query = query.orderBy(desc(hands.createdAt)) as any;
  } else if (sortBy === "top") {
    query = query.orderBy(desc(hands.upvoteCount)) as any;
  } else if (sortBy === "rating") {
    query = query.orderBy(desc(hands.overallRating)) as any;
  }
  
  return await query;
}

// ============================================================================
// Tag Management Functions
// ============================================================================

export async function addHandTag(handId: number, userId: number, tag: string, color: string = "#3b82f6") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if tag already exists for this hand
  const existing = await db
    .select()
    .from(handTags)
    .where(and(
      eq(handTags.handId, handId),
      eq(handTags.userId, userId),
      eq(handTags.tag, tag)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    return existing[0]; // Tag already exists
  }
  
  const result = await db.insert(handTags).values({
    handId,
    userId,
    tag,
    color,
  });
  
  return { id: Number((result as any).insertId), handId, userId, tag, color };
}

export async function removeHandTag(handId: number, userId: number, tag: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(handTags)
    .where(and(
      eq(handTags.handId, handId),
      eq(handTags.userId, userId),
      eq(handTags.tag, tag)
    ));
  
  return { success: true };
}

export async function getHandTags(handId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .select()
    .from(handTags)
    .where(and(
      eq(handTags.handId, handId),
      eq(handTags.userId, userId)
    ))
    .orderBy(handTags.createdAt);
}

export async function getAllUserTags(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get all unique tags with usage count
  const tags = await db
    .select({
      tag: handTags.tag,
      color: handTags.color,
      count: sql<number>`COUNT(*)`.as('count')
    })
    .from(handTags)
    .where(eq(handTags.userId, userId))
    .groupBy(handTags.tag, handTags.color)
    .orderBy(desc(sql`COUNT(*)`));
  
  return tags;
}

export async function filterHandsByTags(userId: number, tags: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (tags.length === 0) {
    return await getUserHands(userId);
  }
  
  // Get hands that have ALL the specified tags
  const handIds = await db
    .select({ handId: handTags.handId })
    .from(handTags)
    .where(and(
      eq(handTags.userId, userId),
      inArray(handTags.tag, tags)
    ))
    .groupBy(handTags.handId)
    .having(sql`COUNT(DISTINCT ${handTags.tag}) = ${tags.length}`);
  
  if (handIds.length === 0) {
    return [];
  }
  
  const ids = handIds.map(h => h.handId);
  
  return await db
    .select()
    .from(hands)
    .where(and(
      eq(hands.userId, userId),
      inArray(hands.id, ids)
    ))
    .orderBy(desc(hands.createdAt));
}


// ===== Discord Webhooks =====

export async function getDiscordWebhooks(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .select()
    .from(discordWebhooks)
    .where(eq(discordWebhooks.userId, userId))
    .orderBy(desc(discordWebhooks.isDefault), desc(discordWebhooks.createdAt));
}

export async function addDiscordWebhook(userId: number, name: string, webhookUrl: string, isDefault: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // If this is set as default, unset all other defaults for this user
  if (isDefault) {
    await db
      .update(discordWebhooks)
      .set({ isDefault: false })
      .where(eq(discordWebhooks.userId, userId));
  }
  
  const result = await db
    .insert(discordWebhooks)
    .values({
      userId,
      name,
      webhookUrl,
      isDefault,
    });
  
  return { id: Number((result as any).insertId), success: true };
}

export async function updateDiscordWebhook(
  id: number,
  userId: number,
  name?: string,
  webhookUrl?: string,
  isDefault?: boolean
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // If setting as default, unset all other defaults for this user
  if (isDefault) {
    await db
      .update(discordWebhooks)
      .set({ isDefault: false })
      .where(eq(discordWebhooks.userId, userId));
  }
  
  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (webhookUrl !== undefined) updateData.webhookUrl = webhookUrl;
  if (isDefault !== undefined) updateData.isDefault = isDefault;
  
  await db
    .update(discordWebhooks)
    .set(updateData)
    .where(and(
      eq(discordWebhooks.id, id),
      eq(discordWebhooks.userId, userId)
    ));
  
  return { success: true };
}

export async function deleteDiscordWebhook(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(discordWebhooks)
    .where(and(
      eq(discordWebhooks.id, id),
      eq(discordWebhooks.userId, userId)
    ));
  
  return { success: true };
}

export async function shareHandToDiscord(handId: number, userId: number, webhookId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get the hand data
  const hand = await getHandById(handId, userId);
  if (!hand) {
    throw new Error("Hand not found");
  }
  
  // Get the webhook
  let webhook;
  if (webhookId) {
    const webhooks = await db
      .select()
      .from(discordWebhooks)
      .where(and(
        eq(discordWebhooks.id, webhookId),
        eq(discordWebhooks.userId, userId)
      ))
      .limit(1);
    webhook = webhooks[0];
  } else {
    // Use default webhook
    const webhooks = await db
      .select()
      .from(discordWebhooks)
      .where(and(
        eq(discordWebhooks.userId, userId),
        eq(discordWebhooks.isDefault, true)
      ))
      .limit(1);
    webhook = webhooks[0];
  }
  
  if (!webhook) {
    throw new Error("No webhook found. Please add a Discord webhook first.");
  }
  
  // Format cards for display
  const formatCard = (card: string | null) => {
    if (!card) return "";
    const rank = card.slice(0, -1);
    const suit = card.slice(-1);
    const suitMap: Record<string, string> = { h: "♥️", d: "♦️", s: "♠️", c: "♣️" };
    return `${rank}${suitMap[suit] || suit}`;
  };
  
  const heroCards = `${formatCard(hand.heroCard1)}${formatCard(hand.heroCard2)}`;
  const boardCards = [
    hand.flopCard1 ? formatCard(hand.flopCard1) : null,
    hand.flopCard2 ? formatCard(hand.flopCard2) : null,
    hand.flopCard3 ? formatCard(hand.flopCard3) : null,
    hand.turnCard ? formatCard(hand.turnCard) : null,
    hand.riverCard ? formatCard(hand.riverCard) : null,
  ].filter(Boolean).join(" ");
  
  // Create Discord embed
  const embed = {
    title: hand.title || `${heroCards} from ${hand.heroPosition}`,
    description: hand.description || "Poker hand analysis",
    color: 0xD4AF37, // Gold color
    fields: [
      {
        name: "🎴 Hero Hand",
        value: `${heroCards} from ${hand.heroPosition}`,
        inline: true,
      },
      {
        name: "📊 Overall Rating",
        value: hand.overallRating ? `${hand.overallRating}/10` : "Not rated",
        inline: true,
      },
      {
        name: "💰 Blinds",
        value: `${hand.smallBlind}/${hand.bigBlind}${hand.ante ? ` (Ante: ${hand.ante})` : ""}`,
        inline: true,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: "Poker Hand Analyzer",
    },
  };
  
  // Add board if available
  if (boardCards) {
    embed.fields.push({
      name: "🃏 Board",
      value: boardCards,
      inline: false,
    });
  }
  
  // Add street ratings if available
  const ratings = [];
  if (hand.preflopRating) ratings.push(`Preflop: ${hand.preflopRating}/10`);
  if (hand.flopRating) ratings.push(`Flop: ${hand.flopRating}/10`);
  if (hand.turnRating) ratings.push(`Turn: ${hand.turnRating}/10`);
  if (hand.riverRating) ratings.push(`River: ${hand.riverRating}/10`);
  
  if (ratings.length > 0) {
    embed.fields.push({
      name: "📈 Street Ratings",
      value: ratings.join("\n"),
      inline: false,
    });
  }
  
  // Add hand URL
  const handUrl = `${process.env.VITE_APP_URL || "https://poker-hand-analyzer.manus.space"}/hand/${handId}`;
  embed.fields.push({
    name: "🔗 View Full Analysis",
    value: handUrl,
    inline: false,
  });
  
  // Send to Discord
  try {
    const response = await fetch(webhook.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord webhook failed: ${response.status} ${errorText}`);
    }
    
    return { success: true, message: "Hand shared to Discord successfully!" };
  } catch (error) {
    console.error("Discord webhook error:", error);
    throw new Error(`Failed to share to Discord: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
