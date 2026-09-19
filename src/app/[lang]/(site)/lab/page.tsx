import Link from "next/link";
import { RouteTransition } from "@/components/fx/route-transition";
import { listSharedSpecs } from "@/lib/db/queries/lab";
import { getDictionary } from "../../dictionaries";

export default async function LabPage({ params }: PageProps<"/[lang]/lab">) {
  const { lang } = await params;
  const dict = await getDictionary();
  const shared = await listSharedSpecs();
  return (
    <RouteTransition>
      <main className="mx-auto max-w-[var(--container-max)] px-6 py-24">
        <h1 className="text-[length:var(--text-h1-size)] font-semibold">
          {dict.nav.lab}
        </h1>
        <p className="mt-4 max-w-prose text-ink-muted">
          GenUI 实验场：右下角 AI 导览（真实 ARK + 三引擎：json-render / OpenUI
          / RSC）。访客 Agent 用真模型回答，结构化界面即时渲染。
        </p>
        <section className="mt-10">
          <h2 className="font-mono text-xs uppercase tracking-widest text-ink-muted">
            已分享的动态界面
          </h2>
          {shared.length === 0 ? (
            <p className="mt-3 text-sm text-ink-faint">还没有分享。</p>
          ) : (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {shared.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/${lang}/lab/s/${s.id}`}
                    transitionTypes={["nav-forward"]}
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
      </main>
    </RouteTransition>
  );
}
