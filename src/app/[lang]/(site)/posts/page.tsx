import { Suspense } from "react";
import { RouteTransition } from "@/components/fx/route-transition";
import { listPublishedPosts } from "@/lib/db/queries/posts";
import { postMeta } from "@/lib/utils";
import { getDictionary } from "../../dictionaries";
import { PaperRow, PaperRowsSkeleton } from "../paper-row";

/**
 * 文章列表（spec §4：信纸排印 + display 一句话导语，同首页密度）。
 * 取数与首页幕②同一模式：<Suspense> + try/catch 降空态——DB 不可达时
 * 静态骨架照常交付、导航照常起 VT，页面永不 500。
 * 行链接不点名 rift-*：首页→文章才是 T2（§2.2），列表→文章走 T1 主语法。
 */
export default async function PostsPage({
  params,
}: PageProps<"/[lang]/posts">) {
  const { lang } = await params;
  const dict = await getDictionary();
  return (
    <RouteTransition>
      <main className="mx-auto max-w-[var(--container-max)] px-6 py-[18vh]">
        <p className="mono-micro text-accent">{dict.nav.posts}</p>
        <h1 className="mt-4 max-w-[18ch] text-[length:var(--text-display-size)] font-semibold leading-[var(--text-display-lh)] tracking-[var(--text-display-tracking)]">
          {dict.posts.headline}
        </h1>
        <div className="mt-[10vh]">
          <Suspense fallback={<PaperRowsSkeleton count={3} />}>
            <PostList
              lang={lang}
              empty={dict.posts.empty}
              headline={dict.nav.posts}
            />
          </Suspense>
        </div>
      </main>
    </RouteTransition>
  );
}

async function PostList({
  lang,
  empty,
  headline,
}: {
  lang: string;
  empty: string;
  headline: string;
}) {
  let items: Awaited<ReturnType<typeof listPublishedPosts>> = [];
  try {
    // 与首页幕②同口径：墙钟期限已内化进 listPublishedPosts 的 cache 边界（I-1），
    // 页面只剩 try/catch——不可达/超期按空态定稿，不押住文档收尾
    items = await listPublishedPosts(lang);
  } catch {
    // DB 不可达：按空态呈现，不甩错误
    items = [];
  }
  if (items.length === 0) {
    return <p className="mono-micro text-ink-faint">{empty}</p>;
  }
  return (
    <section aria-label={headline}>
      <ul>
        {items.map((p) => (
          <PaperRow
            key={p.slug}
            href={`/${lang}/posts/${p.slug}`}
            title={p.title}
            meta={postMeta(p)}
          />
        ))}
      </ul>
    </section>
  );
}
