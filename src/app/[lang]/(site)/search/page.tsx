import Link from "next/link";
import { Suspense } from "react";
import { RouteTransition } from "@/components/fx/route-transition";
import { searchPosts } from "@/lib/db/queries/posts";
import { getDictionary } from "../../dictionaries";

function fmt(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

async function Results({
  lang,
  q,
}: {
  lang: string;
  q: Promise<{ q?: string }>;
}) {
  const dict = await getDictionary();
  const query = (await q).q?.trim() ?? "";
  if (!query)
    return <p className="mt-8 text-sm text-ink-faint">{dict.search.hint}</p>;
  const hits = await searchPosts(lang, query).catch(() => []);
  if (hits.length === 0)
    return <p className="mt-8 text-sm text-ink-faint">{dict.search.empty}</p>;
  return (
    <ul className="mt-8 space-y-4">
      {hits.map((p) => (
        <li key={p.slug}>
          <Link
            href={`/${lang}/posts/${p.slug}`}
            transitionTypes={["nav-forward"]}
            className="block rounded-md border border-border bg-surface p-4 hover:bg-surface-hover"
          >
            <h2 className="text-[length:var(--text-h3-size)] font-semibold text-ink">
              {p.title}
            </h2>
            {p.summary ? (
              <p className="mt-1 text-sm text-ink-muted">{p.summary}</p>
            ) : null}
            <p className="mt-2 font-mono text-xs uppercase tracking-widest text-ink-faint tabular-nums">
              {fmt(p.publishedAt)} · {p.readingTime ?? 1} min
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function SearchPage({
  params,
  searchParams,
}: PageProps<"/[lang]/search">) {
  const { lang } = await params;
  const dict = await getDictionary();
  return (
    <RouteTransition>
      <main className="mx-auto max-w-[var(--container-max)] px-6 py-24">
        <h1 className="text-[length:var(--text-h1-size)] font-semibold">
          {dict.search.title}
        </h1>
        <form
          method="get"
          action={`/${lang}/search`}
          className="mt-6 flex gap-2"
        >
          <input
            type="search"
            name="q"
            defaultValue={(await searchParams).q ?? ""}
            placeholder={dict.search.placeholder}
            aria-label={dict.search.title}
            className="w-full max-w-md rounded-sm border border-border bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring-color)]"
          />
          <button
            type="submit"
            className="rounded-sm border border-border-strong bg-bg-elevated px-4 py-2 text-sm text-ink hover:bg-surface-hover"
          >
            {dict.nav.search}
          </button>
        </form>
        {/* PPR：搜索框即时可见，结果作为流式 hole 由 Suspense 包裹 */}
        <Suspense fallback={null}>
          <Results lang={lang} q={searchParams} />
        </Suspense>
      </main>
    </RouteTransition>
  );
}
