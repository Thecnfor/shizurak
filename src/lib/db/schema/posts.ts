import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** posts 表（架构规范 §6.1）：内容 SSOT 在 PG，locale + (slug,locale) 唯一。 */
export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    contentMd: text("content_md").notNull(),
    contentHtml: text("content_html").notNull(),
    toc: jsonb("toc").$type<
      Array<{ id: string; text: string; depth: number }>
    >(),
    status: text("status")
      .$type<"draft" | "review" | "published" | "archived">()
      .notNull()
      .default("draft"),
    type: text("type")
      .$type<"post" | "project" | "note">()
      .notNull()
      .default("post"),
    locale: text("locale").$type<"zh" | "en">().notNull().default("zh"),
    translationOf: uuid("translation_of"),
    coverMediaId: uuid("cover_media_id"),
    aiInvolvement: text("ai_involvement")
      .$type<"human" | "assisted" | "generated">()
      .notNull()
      .default("human"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    readingTime: integer("reading_time"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("posts_slug_locale_ux").on(t.slug, t.locale),
    index("posts_status_published_ix").on(t.status, t.publishedAt),
  ],
);

/** 媒体（MinIO 对象元数据；正文引用 blurhash 已预留）。 */
export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  minioKey: text("minio_key").notNull(),
  mime: text("mime").notNull(),
  width: integer("width"),
  height: integer("height"),
  size: integer("size"),
  blurhash: text("blurhash"),
  alt: text("alt"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
