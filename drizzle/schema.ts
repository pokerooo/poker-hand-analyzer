import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  studyStreak: int("studyStreak").default(0).notNull(),
  lastStudyDate: varchar("lastStudyDate", { length: 10 }), // YYYY-MM-DD UTC
  longestStreak: int("longestStreak").default(0).notNull(),
  // Stripe subscription
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  isPro: boolean("is_pro").default(false).notNull(),
  // UI preferences
  theme: mysqlEnum("theme", ["light", "dark"]).default("light").notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Poker hands table — simplified for the new casual visualiser product.
 * Stores the raw text input and the parsed structured data.
 */
export const hands = mysqlTable("hands", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId"), // nullable — guests can create hands too (stored in session)

  // Raw input from user (WhatsApp-style text)
  rawText: text("rawText").notNull(),

  // Parsed structured data (JSON from LLM parser)
  parsedData: json("parsedData").notNull(),

  // Optional user-added title/note
  title: varchar("title", { length: 255 }),
  notes: text("notes"),

  // Sharing
  shareSlug: varchar("shareSlug", { length: 16 }).unique().notNull(), // short public URL slug e.g. "a3f9x2"
  isPublic: boolean("isPublic").default(true).notNull(),

  // Villain annotation — user-tagged opponent type for exploitative analysis
  villainType: varchar("villainType", { length: 100 }), // e.g. "tight reg", "fish", "LAG", "nit", "calling station"

  // AI Coach (paid feature)
  coachUnlocked: boolean("coachUnlocked").default(false).notNull(),
  coachAnalysis: json("coachAnalysis"), // stored after payment

  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Hand = typeof hands.$inferSelect;
export type InsertHand = typeof hands.$inferInsert;

/**
 * Discord webhooks — for sharing hands to study groups
 */
export const discordWebhooks = mysqlTable("discordWebhooks", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  webhookUrl: text("webhookUrl").notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type DiscordWebhook = typeof discordWebhooks.$inferSelect;
export type InsertDiscordWebhook = typeof discordWebhooks.$inferInsert;

/**
 * Study list — concepts saved by users from AI Coach responses
 */
export const studyTopics = mysqlTable("studyTopics", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  topic: varchar("topic", { length: 500 }).notNull(),       // the concept/question text
  context: text("context"),                                  // the coach's answer snippet
  handSlug: varchar("handSlug", { length: 16 }),             // optional — linked hand
  isReviewed: boolean("isReviewed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StudyTopic = typeof studyTopics.$inferSelect;
export type InsertStudyTopic = typeof studyTopics.$inferInsert;

/**
 * Site-wide stats — simple key/value counter store.
 * Used for the homepage usage counter (key: 'visualiser_views').
 */
export const siteStats = mysqlTable("siteStats", {
  id: int("id").primaryKey().autoincrement(),
  statKey: varchar("statKey", { length: 64 }).notNull().unique(),
  statValue: int("statValue").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SiteStat = typeof siteStats.$inferSelect;

/**
 * AI call log — tracks per-user AI usage for rate limiting.
 * Free users: max 20 AI calls per calendar day (UTC).
 * Pro users: unlimited.
 */
export const aiCallLog = mysqlTable("aiCallLog", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  callType: varchar("callType", { length: 64 }).notNull(), // "chat", "analyze", "patterns"
  calledAt: timestamp("calledAt").defaultNow().notNull(),
});

export type AiCallLog = typeof aiCallLog.$inferSelect;
export type InsertAiCallLog = typeof aiCallLog.$inferInsert;
