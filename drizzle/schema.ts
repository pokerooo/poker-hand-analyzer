import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Poker hands table - stores complete hand history
 */
export const hands = mysqlTable("hands", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Owner of this hand
  
  // Hand metadata
  title: varchar("title", { length: 255 }), // Optional user-provided title
  description: text("description"), // Optional notes
  
  // Game info
  smallBlind: int("smallBlind").notNull(),
  bigBlind: int("bigBlind").notNull(),
  ante: int("ante").default(0).notNull(),
  
  // Hero info
  heroPosition: mysqlEnum("heroPosition", ["UTG", "UTG+1", "UTG+2", "MP", "MP+1", "CO", "BTN", "SB", "BB"]).notNull(),
  heroCard1: varchar("heroCard1", { length: 3 }).notNull(), // e.g., "As", "Kh"
  heroCard2: varchar("heroCard2", { length: 3 }).notNull(),
  
  // Board cards (null if not reached)
  flopCard1: varchar("flopCard1", { length: 3 }),
  flopCard2: varchar("flopCard2", { length: 3 }),
  flopCard3: varchar("flopCard3", { length: 3 }),
  turnCard: varchar("turnCard", { length: 3 }),
  riverCard: varchar("riverCard", { length: 3 }),
  
  // Action history - stored as JSON array
  // Each action: { street: 'preflop'|'flop'|'turn'|'river', player: string, action: 'fold'|'check'|'call'|'bet'|'raise'|'allin', amount?: number }
  actions: json("actions").notNull(),
  
  // Analysis results
  overallRating: decimal("overallRating", { precision: 3, scale: 1 }), // e.g., 5.5
  preflopRating: decimal("preflopRating", { precision: 3, scale: 1 }),
  flopRating: decimal("flopRating", { precision: 3, scale: 1 }),
  turnRating: decimal("turnRating", { precision: 3, scale: 1 }),
  riverRating: decimal("riverRating", { precision: 3, scale: 1 }),
  
  // Mistake tags - stored as JSON array of strings
  // e.g., ["overcalling_river", "missing_turn_probe", "passive_flop"]
  mistakeTags: json("mistakeTags"),
  
  // Analysis text
  analysis: text("analysis"), // Full analysis markdown
  aiAnalysis: text("aiAnalysis"), // AI-generated strategic analysis
  
  // Sharing
  shareToken: varchar("shareToken", { length: 32 }).unique(), // Unique token for public sharing
  isPublic: int("isPublic").default(0).notNull(), // 0 = private, 1 = public
  
  // Community engagement
  upvoteCount: int("upvoteCount").default(0).notNull(),
  commentCount: int("commentCount").default(0).notNull(),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Hand = typeof hands.$inferSelect;
export type InsertHand = typeof hands.$inferInsert;

/**
 * Mistake patterns - for tracking common errors
 */
export const mistakePatterns = mysqlTable("mistakePatterns", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Pattern identification
  mistakeType: varchar("mistakeType", { length: 100 }).notNull(), // e.g., "overcalling_river"
  mistakeLabel: varchar("mistakeLabel", { length: 255 }).notNull(), // e.g., "Overcalling Rivers"
  
  // Occurrence tracking
  occurrenceCount: int("occurrenceCount").default(1).notNull(),
  
  // Related hands (JSON array of hand IDs)
  handIds: json("handIds"),
  
  // Timestamps
  firstOccurrence: timestamp("firstOccurrence").defaultNow().notNull(),
  lastOccurrence: timestamp("lastOccurrence").defaultNow().notNull(),
});

export type MistakePattern = typeof mistakePatterns.$inferSelect;
export type InsertMistakePattern = typeof mistakePatterns.$inferInsert;

/**
 * User statistics - aggregated performance metrics
 */
export const userStats = mysqlTable("userStats", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  
  // Overall metrics
  totalHands: int("totalHands").default(0).notNull(),
  averageRating: decimal("averageRating", { precision: 3, scale: 1 }),
  
  // Street-specific averages
  avgPreflopRating: decimal("avgPreflopRating", { precision: 3, scale: 1 }),
  avgFlopRating: decimal("avgFlopRating", { precision: 3, scale: 1 }),
  avgTurnRating: decimal("avgTurnRating", { precision: 3, scale: 1 }),
  avgRiverRating: decimal("avgRiverRating", { precision: 3, scale: 1 }),
  
  // Most common mistakes (JSON array of {type, count} objects)
  topMistakes: json("topMistakes"),
  
  // Timestamps
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserStats = typeof userStats.$inferSelect;
export type InsertUserStats = typeof userStats.$inferInsert;

/**
 * Hand upvotes - tracks user upvotes on public hands
 */
export const handUpvotes = mysqlTable("handUpvotes", {
  id: int("id").autoincrement().primaryKey(),
  handId: int("handId").notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HandUpvote = typeof handUpvotes.$inferSelect;
export type InsertHandUpvote = typeof handUpvotes.$inferInsert;

/**
 * Hand comments - community discussion on public hands
 */
export const handComments = mysqlTable("handComments", {
  id: int("id").autoincrement().primaryKey(),
  handId: int("handId").notNull(),
  userId: int("userId").notNull(),
  userName: varchar("userName", { length: 255 }).notNull(), // Denormalized for performance
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HandComment = typeof handComments.$inferSelect;
export type InsertHandComment = typeof handComments.$inferInsert;

/**
 * Hand tags - custom labels for organizing and filtering hands
 */
export const handTags = mysqlTable("handTags", {
  id: int("id").autoincrement().primaryKey(),
  handId: int("handId").notNull(),
  userId: int("userId").notNull(), // Owner of the tag
  tag: varchar("tag", { length: 50 }).notNull(), // Tag name (e.g., "bluff", "hero call")
  color: varchar("color", { length: 7 }).default("#3b82f6").notNull(), // Hex color code
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HandTag = typeof handTags.$inferSelect;
export type InsertHandTag = typeof handTags.$inferInsert;
