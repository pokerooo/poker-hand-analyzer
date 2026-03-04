import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
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
 * Poker hands table — simplified for the new casual visualiser product.
 * Stores the raw text input and the parsed structured data.
 */
export const hands = mysqlTable("hands", {
  id: int("id").autoincrement().primaryKey(),
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

  // AI Coach (paid feature)
  coachUnlocked: boolean("coachUnlocked").default(false).notNull(),
  coachAnalysis: json("coachAnalysis"), // stored after payment

  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Hand = typeof hands.$inferSelect;
export type InsertHand = typeof hands.$inferInsert;

/**
 * Discord webhooks — for sharing hands to study groups
 */
export const discordWebhooks = mysqlTable("discordWebhooks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  webhookUrl: text("webhookUrl").notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DiscordWebhook = typeof discordWebhooks.$inferSelect;
export type InsertDiscordWebhook = typeof discordWebhooks.$inferInsert;
