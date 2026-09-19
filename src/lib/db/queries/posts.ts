import { and, desc, eq, isNull } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "../client";
import { posts } from "../schema";

export interface PostSummary {
  slug: string;
  title: string;
  summary: string | null;
  publishedAt: Date | null;
  readingTime: number | null;
}

/** 已发布文章列表（按 locale，发布时间倒序）。缓存标签 posts。 */
export async function listPublishedPosts(
  locale: string,
): Promise<PostSummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("posts", `posts:${locale}`);
  const rows = await getDb()
    .select({
      slug: posts.slug,
      title: posts.title,
      summary: posts.summary,
      publishedAt: posts.publishedAt,
      readingTime: posts.readingTime,
    })
    .from(posts)
    .where(
      and(
        eq(posts.status, "published"),
        eq(posts.locale, locale as "zh" | "en"),
        isNull(posts.deletedAt),
      ),
    )
    .orderBy(desc(posts.publishedAt));
  return rows;
}

/** 单篇详情（含编译产物 HTML + TOC）。缓存标签 post:<slug>。 */
export async function getPostBySlug(slug: string, locale: string) {
  "use cache";
  cacheLife("days");
  cacheTag(`post:${slug}`, `post:${slug}:${locale}`);
  const [row] = await getDb()
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.slug, slug),
        eq(posts.locale, locale as "zh" | "en"),
        isNull(posts.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}
