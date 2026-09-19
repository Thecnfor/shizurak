import { and, desc, eq, isNull } from "drizzle-orm";
import { Feed } from "feed";

// RSS（feed 库）：zh+en 已发布文章；无 DATABASE_URL 时返回空 feed（不炸）。
export async function GET(): Promise<Response> {
  const feed = new Feed({
    title: "shizurak",
    description: "The agent-native blog engine — 伍泽凯 / Wu Zekai",
    id: "https://blog.xrak.top/",
    link: "https://blog.xrak.top/",
    language: "zh",
    image: "https://blog.xrak.top/api/og",
    favicon: "https://blog.xrak.top/favicon.ico",
    copyright: `© ${new Date().getFullYear()} Wu Zekai`,
    updated: new Date(),
  });

  if (process.env.DATABASE_URL) {
    try {
      const { getDb } = await import("@/lib/db/client");
      const { posts } = await import("@/lib/db/schema");
      const rows = await getDb()
        .select({
          slug: posts.slug,
          title: posts.title,
          summary: posts.summary,
          locale: posts.locale,
          publishedAt: posts.publishedAt,
        })
        .from(posts)
        .where(and(eq(posts.status, "published"), isNull(posts.deletedAt)))
        .orderBy(desc(posts.publishedAt))
        .limit(50);
      for (const p of rows) {
        const url = `https://blog.xrak.top/${p.locale}/posts/${p.slug}`;
        feed.addItem({
          title: p.title,
          id: url,
          link: url,
          description: p.summary ?? undefined,
          date: p.publishedAt ?? new Date(),
        });
      }
    } catch {
      /* 空 feed 也比 500 好 */
    }
  }

  return new Response(feed.rss2(), {
    headers: { "content-type": "application/rss+xml; charset=utf-8" },
  });
}
