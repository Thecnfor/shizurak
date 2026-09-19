import { and, desc, eq, isNull } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { RouteTransition } from "@/components/fx/route-transition";
import { getDb } from "@/lib/db/client";
import { getPostBySlug } from "@/lib/db/queries/posts";
import { posts } from "@/lib/db/schema";
import { getDictionary } from "../../../dictionaries";

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const rows = await getDb()
    .select({ slug: posts.slug })
    .from(posts)
    .where(
      and(
        eq(posts.status, "published"),
        eq(posts.locale, "zh"),
        isNull(posts.deletedAt),
      ),
    )
    .orderBy(desc(posts.publishedAt));
  return rows.map((r) => ({ slug: r.slug }));
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
          <ViewTransition name={`post-${post.slug}`} default="none">
            <h1 className="text-[length:var(--text-h1-size)] font-semibold leading-[var(--text-h1-lh)] tracking-[var(--text-h1-tracking)]">
              {post.title}
            </h1>
          </ViewTransition>
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
              transitionTypes={["nav-back"]}
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
