import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { withDeadline } from "@/lib/utils";
import { getDb } from "../client";
import { posts } from "../schema";

export interface PostSummary {
  slug: string;
  title: string;
  summary: string | null;
  publishedAt: Date | null;
  readingTime: number | null;
}

/**
 * 列表取数的边界内期限（I-1）：略大于驱动层 connect/statement 封顶，
 * 作为查询级硬保证；页面侧只剩 try/catch，不再在外面 race。
 */
const LIST_DEADLINE_MS = 3_000;

/**
 * 已发布文章列表（按 locale，发布时间倒序）。缓存标签 posts。
 *
 * 期限必须在 cache 边界**内**跑（I-1 定案）：此前页面层用 withDeadline
 * 去 race 这个 `use cache` 函数的 promise，超时时被 race 掉的那个 promise
 * 仍在后台 pending 直到 ≈11s 才落地——Next 对此有专门告警（use-cache-errors：
 * "stuck on shared state from the outer render scope"）。
 * T9 评审批 C 再补严一档：构建期黑洞 DB 实测（T10，Next 16.3.5），边界内
 * 只拿 deadline 不吞拒绝时，拒绝仍被缓存工作单元升为 prerender fatal、杀死
 * 构建（页面侧 try/catch 封不住）——而 Cache Components 又禁止空
 * generateStaticParams。出路只能是「永不拒绝」：边界内 catch 归空态。
 * 代价：空列表会以 hours 档入缓存，DB 恢复后靠 revalidate 自愈（≤1h）；
 * 发布动作本身会 revalidateTag("posts")，不可用期间也发不了新文，无叠加风险。
 */
export async function listPublishedPosts(
  locale: string,
): Promise<PostSummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("posts", `posts:${locale}`);
  try {
    return await withDeadline(
      getDb()
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
        .orderBy(desc(posts.publishedAt)),
      LIST_DEADLINE_MS,
      "listPublishedPosts",
    );
  } catch {
    return [];
  }
}

/** 单篇详情（含编译产物 HTML + TOC）。仅限已发布；缓存标签 post:<slug>。 */
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
        eq(posts.status, "published"), // 公开页不得读草稿/归档（防枚举泄露）
        isNull(posts.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export interface SearchHit extends PostSummary {}

/** 搜索 v1（pg_trgm 模糊 + 相似度排序，中英通用）；v2 语义见路线图。 */
export async function searchPosts(
  locale: string,
  q: string,
): Promise<SearchHit[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("posts", `search:${locale}`);
  const query = q.trim();
  if (!query) return [];
  try {
    return await withDeadline(
      searchPostsInner(locale, query),
      LIST_DEADLINE_MS,
      "searchPosts",
    );
  } catch {
    // 同 listPublishedPosts：边界内化归空态，构建/运行都不得被 DB 拒绝杀死
    return [];
  }
}

async function searchPostsInner(
  locale: string,
  query: string,
): Promise<SearchHit[]> {
  const like = `%${query}%`;
  // 同一个 sql 片段复用于 select/orderBy：drizzle 别名不带 AS，不能按别名排序
  const score = sql<number>`greatest(similarity(${posts.title}, ${query}), similarity(coalesce(${posts.summary}, ''), ${query}))`;
  const rows = await getDb()
    .select({
      slug: posts.slug,
      title: posts.title,
      summary: posts.summary,
      publishedAt: posts.publishedAt,
      readingTime: posts.readingTime,
      score,
    })
    .from(posts)
    .where(
      and(
        eq(posts.status, "published"),
        eq(posts.locale, locale as "zh" | "en"),
        isNull(posts.deletedAt),
        or(
          sql`${posts.title} ilike ${like}`,
          sql`${posts.summary} ilike ${like}`,
          sql`${posts.contentMd} ilike ${like}`,
        ),
      ),
    )
    .orderBy(desc(score), desc(posts.publishedAt))
    .limit(30);
  return rows.map(({ score: _s, ...r }) => r);
}
