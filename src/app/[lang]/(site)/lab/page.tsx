import Link from "next/link";
import { Suspense } from "react";
import { RouteTransition } from "@/components/fx/route-transition";
import { listSharedSpecs } from "@/lib/db/queries/lab";
import { getDictionary } from "../../dictionaries";

/**
 * Lab 首页。DB 取数收进 <Suspense> 边界（不是性能优化，是 T2 的可用性前提）：
 * 页面级 await 会把整条路由的 RSC 响应押在数据库往返之后（本机实测 dev PostgreSQL
 * 不可达时 11.6s 才返回），React 因此根本不为这次导航起 view transition——
 * 幕语法拿不到类，T2 崩解无从发生。骨架（标题 + 空态）先交付，分享列表后补。
 */
export default async function LabPage({ params }: PageProps<"/[lang]/lab">) {
  const { lang } = await params;
  const dict = await getDictionary();
  return (
    <RouteTransition>
      <main className="mx-auto max-w-[var(--container-max)] px-6 py-24">
        <h1 className="text-[length:var(--text-h1-size)] font-semibold">
          {dict.nav.lab}
        </h1>
        <p className="mt-4 max-w-prose text-ink-muted">{dict.lab.intro}</p>
        <Suspense
          fallback={
            <section className="mt-10">
              <h2 className="font-mono text-xs uppercase tracking-widest text-ink-muted">
                {dict.lab.sharedTitle}
              </h2>
              <p className="mt-3 text-sm text-ink-faint" aria-busy="true">
                …
              </p>
            </section>
          }
        >
          <SharedSection
            lang={lang}
            title={dict.lab.sharedTitle}
            empty={dict.lab.sharedEmpty}
          />
        </Suspense>
      </main>
    </RouteTransition>
  );
}

/** 已分享 spec 列表（唯一碰 DB 的一段，取不到就按空态呈现） */
async function SharedSection({
  lang,
  title,
  empty,
}: {
  lang: string;
  title: string;
  empty: string;
}) {
  let shared: Awaited<ReturnType<typeof listSharedSpecs>> = [];
  try {
    shared = await listSharedSpecs();
  } catch {
    // DB 不可达：列表降级为空态，页面骨架与幕语法都不该被它拖住
    shared = [];
  }
  return (
    <section className="mt-10">
      <h2 className="font-mono text-xs uppercase tracking-widest text-ink-muted">
        {title}
      </h2>
      {shared.length === 0 ? (
        <p className="mt-3 text-sm text-ink-faint">{empty}</p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {shared.map((s) => (
            <li key={s.id}>
              <Link
                href={`/${lang}/lab/s/${s.id}`}
                className="block rounded-md border border-border bg-surface p-4 hover:bg-surface-hover"
              >
                <span className="font-mono text-xs uppercase tracking-widest text-accent">
                  {s.kind}
                </span>
                <span className="mt-1 block font-mono text-xs text-ink-faint">
                  {s.id.slice(0, 8)} · {s.themeId}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
