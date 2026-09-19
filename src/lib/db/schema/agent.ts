import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/** GenUI spec 持久化（架构规范 §6.1）：分享页 /lab/s/[id] 的 SSOT。 */
export const genuiSpecs = pgTable("genui_specs", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").$type<"json-render" | "openui" | "rsc">().notNull(),
  spec: jsonb("spec").notNull(),
  themeId: text("theme_id").notNull().default("void"),
  source: text("source").$type<"visitor" | "author">().notNull(),
  threadId: uuid("thread_id"),
  shared: boolean("shared").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const agentThreads = pgTable("agent_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").$type<"visitor" | "author">().notNull().default("visitor"),
  visitorHash: text("visitor_hash"),
  title: text("title"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const agentMessages = pgTable("agent_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  threadId: uuid("thread_id").notNull(),
  role: text("role").$type<"user" | "assistant">().notNull(),
  parts: jsonb("parts").notNull(),
  model: text("model"),
  tokensIn: integer("tokens_in"),
  tokensOut: integer("tokens_out"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** 自研埋点事件（架构规范 §10）。 */
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  path: text("path"),
  postId: uuid("post_id"),
  visitorHash: text("visitor_hash"),
  referrer: text("referrer"),
  props: jsonb("props"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** 站点配置 KV。 */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

/** L2 审批通过后落库的读者来信（contactAuthor 工具产物）。 */
export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  message: text("message").notNull(),
  threadId: uuid("thread_id"),
  locale: text("locale"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
