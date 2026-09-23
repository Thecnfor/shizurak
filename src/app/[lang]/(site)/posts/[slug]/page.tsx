import { and, desc, eq, isNull } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RouteTransition } from "@/components/fx/route-transition";
import { getDb } from "@/lib/db/client";
import { getPostBySlug } from "@/lib/db/queries/posts";
import { posts } from "@/lib/db/schema";
import { withDeadline } from "@/lib/utils";
import { getDictionary } from "../../../dictionaries";

/**
 * 构建期取参不得把发布阻断在 DB 可达性上（T9 评审批 C）：黑洞 DB 下驱动层
 * connect/statement 封顶已把失败压到秒级，这里再加查询级 withDeadline 硬保证
 * （本函数是裸 getDb，不走 listPublishedPosts 的 cache 边界，需自绑期限）。
 * 失败时不能返回空数组——Cache Components 要求 generateStaticParams 至少一个
 * 结果（empty-generate-static-params），故回退到哨兵 slug：页面/元数据对它
 * 直接 notFound，零 DB 接触，构建照常 exit 0；其余 slug 由 dynamicParams
 * （默认 true）按请求动态渲染，DB 恢复后下次构建重新预渲染。
 */
const BUILD_OFFLINE_SLUG = "_build-offline";

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const rows = await withDeadline(
      getDb()
        .select({ slug: posts.slug })
        .from(posts)
        .where(
          and(
            eq(posts.status, "published"),
            eq(posts.locale, "zh"),
            isNull(posts.deletedAt),
          ),
        )
        .orderBy(desc(posts.publishedAt)),
      3_000,
      "generateStaticParams",
    );
    return rows.map((r) => ({ slug: r.slug }));
  } catch (err) {
    console.warn(
      `[generateStaticParams] DB 不可用，跳过预渲染（哨兵回退 + 动态渲染）: ${String(err)}`,
    );
    return [{ slug: BUILD_OFFLINE_SLUG }];
  }
}

const AI_LABEL: Record<string, string> = {
  human: "人写",
  assisted: "AI 辅助",
  generated: "AI 生成 + 人工审核",
};

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/posts/[slug]">): Promise<Metadata> {
  const { slug, lang } = await params;
  if (slug === BUILD_OFFLINE_SLUG)
    return { title: "shizurak", robots: { index: false } };
  const post = await getPostBySlug(slug, lang);
  if (!post) return { title: "shizurak" };
  const og = `/api/og?title=${encodeURIComponent(post.title)}&sub=${encodeURIComponent(post.summary ?? "")}`;
  return {
    title: `${post.title} · shizurak`,
    description: post.summary ?? undefined,
    openGraph: {
      title: post.title,
      description: post.summary ?? undefined,
      images: [og],
    },
    twitter: { card: "summary_large_image", images: [og] },
  };
}

export default async function PostPage({
  params,
}: PageProps<"/[lang]/posts/[slug]">) {
  const { lang, slug } = await params;
  if (slug === BUILD_OFFLINE_SLUG) notFound();
  const [dict, post] = await Promise.all([
    getDictionary(),
    getPostBySlug(slug, lang),
  ]);
  if (!post) notFound();
  const published = post.publishedAt
    ? new Date(post.publishedAt).toISOString().slice(0, 10)
    : "";
  return (
    <RouteTransition>
      <main className="mx-auto max-w-[var(--container-max)] px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="scroll-progress" aria-hidden />
          {/* 无具名 <ViewTransition>：共享元素转换会把标题从 root 快照里剥出去，
              破坏 T1 整幕撕合（单语法铁律）——列表侧已同理由拆除，此处同步 */}
          <h1 className="text-[length:var(--text-h1-size)] font-semibold leading-[var(--text-h1-lh)] tracking-[var(--text-h1-tracking)]">
            {post.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-widest text-ink-muted tabular-nums">
            <span>{published}</span>
            <span>· {post.readingTime ?? 1} min</span>
            <span className="rounded-sm border border-border px-1.5 py-0.5 text-ink-faint">
              AI: {AI_LABEL[post.aiInvolvement] ?? post.aiInvolvement}
            </span>
          </div>

          {post.toc && post.toc.length > 0 ? (
            <nav
              aria-label="TOC"
              className="mt-8 rounded-md border border-border bg-bg-elevated p-4"
            >
              <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
                目录
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {post.toc.map((t) => (
                  <li
                    key={t.id}
                    style={{ paddingLeft: `${(t.depth - 2) * 0.8}rem` }}
                  >
                    <a
                      href={`#${t.id}`}
                      className="text-ink-muted hover:text-ink"
                    >
                      {t.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          <article
            className="post-body mt-8"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: 正文仅由作者独占、经自有编译管线（remark/rehype/shiki/katex）产出的受信 HTML，无访客输入进编译（架构规范 §6.2）
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />

          <div className="mt-12 border-t border-border pt-6">
            <Link
              href={`/${lang}/posts`}
              className="font-mono text-xs uppercase tracking-widest text-accent"
            >
              ← {dict.nav.posts}
            </Link>
          </div>
        </div>
      </main>
    </RouteTransition>
  );
}
