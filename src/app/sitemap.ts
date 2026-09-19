import type { MetadataRoute } from "next";

// sitemap：静态壳 × 双语言 + 已发布文章（真 PG 有则加）。
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://blog.xrak.top";
  const out: MetadataRoute.Sitemap = [];
  for (const lang of ["zh", "en"] as const) {
    for (const path of ["", "posts", "projects", "about", "lab"]) {
      out.push({
        url: `${base}/${lang}${path ? `/${path}` : ""}`,
        changeFrequency: "weekly",
        priority: path === "" ? 1 : 0.7,
      });
    }
  }
  if (process.env.DATABASE_URL) {
    try {
      const { and, desc, eq, isNull } = await import("drizzle-orm");
      const { getDb } = await import("@/lib/db/client");
      const { posts } = await import("@/lib/db/schema");
      const rows = await getDb()
        .select({
          slug: posts.slug,
          locale: posts.locale,
          publishedAt: posts.publishedAt,
        })
        .from(posts)
        .where(and(eq(posts.status, "published"), isNull(posts.deletedAt)))
        .orderBy(desc(posts.publishedAt));
      for (const r of rows) {
        out.push({
          url: `${base}/${r.locale}/posts/${r.slug}`,
          lastModified: r.publishedAt ?? new Date(),
          changeFrequency: "monthly",
          priority: 0.8,
        });
      }
    } catch {
      /* 静态部分保底 */
    }
  }
  return out;
}
