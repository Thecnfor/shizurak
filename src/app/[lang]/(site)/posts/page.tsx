import Link from "next/link";
import { RouteTransition } from "@/components/fx/route-transition";
import { listPublishedPosts } from "@/lib/db/queries/posts";
import { getDictionary } from "../../dictionaries";

function fmt(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export default async function PostsPage({
  params,
}: PageProps<"/[lang]/posts">) {
  const { lang } = await params;
  const dict = await getDictionary();
  const items = await listPublishedPosts(lang);
  return (
    <RouteTransition>
      <main className="mx-auto max-w-[var(--container-max)] px-6 py-24">
        <h1 className="text-[length:var(--text-h1-size)] font-semibold">
          {dict.nav.posts}
        </h1>
        <ul className="mt-10 space-y-4">
          {items.map((p) => (
            <li key={p.slug} className="cv-auto">
              <Link href={`/${lang}/posts/${p.slug}`}>
                {/* 旧 per-row <ViewTransition name> 移除：会把行从 root 快照里剖出去，
                    破坏 T1 整幕撕合（单语法铁律）；详情页那侧的同名配对也已同步拆除
                    （见 [slug]/page.tsx），两侧均只走 root 语法，不再残留具名 VT */}
                <article className="rounded-md border border-border bg-surface p-5 transition-colors hover:bg-surface-hover">
                  <h2 className="text-[length:var(--text-h3-size)] font-semibold text-ink">
                    {p.title}
                  </h2>
                  {p.summary ? (
                    <p className="mt-2 text-ink-muted">{p.summary}</p>
                  ) : null}
                  <p className="mt-3 font-mono text-xs uppercase tracking-widest text-ink-faint tabular-nums">
                    {fmt(p.publishedAt)} · {p.readingTime ?? 1} min
                  </p>
                </article>
              </Link>
            </li>
          ))}
          {items.length === 0 ? (
            <li className="text-ink-muted">{dict.home.heroKicker}</li>
          ) : null}
        </ul>
      </main>
    </RouteTransition>
  );
}
