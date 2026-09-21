import { Suspense } from "react";
import { RouteTransition } from "@/components/fx/route-transition";
import { listPublishedPosts } from "@/lib/db/queries/posts";
import { withDeadline } from "@/lib/utils";
import { getDictionary } from "../dictionaries";
import { Hero } from "./hero";
import { fmtDate, PaperRowsSkeleton } from "./paper-row";
import { SignalRow } from "./signal-row";

/**
 * 首页三幕（spec §4：① 一句话大标题 ② 5 行文章信纸 ③ 项目 mono 名录；
 * 第四拍是全站 footer 单行）。G1 留白即构图：每幕一个信息组，幕间呼吸 18vh。
 * ②的取数收进 <Suspense> + 子组件 try/catch（计划「执行期补记」的 DB 模式：
 * 页面级 await 会把 RSC 响应押在 DB 往返上，导航根本不起 view transition）；
 * 空态/DB 不可达都回落骨架行——这一幕永不报错。
 */
export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  const dict = await getDictionary();
  return (
    <RouteTransition>
      {/* data-home：e2e 沉降探针（probes.settleDeferredBoundaries）的锚点 */}
      <main data-home>
        {/* 幕①：hero 自撕显现（动画门控在 CSS，见 globals.css hero-reveal） */}
        <Hero
          title={dict.site.title}
          tagline={dict.site.tagline}
          kicker={dict.home.heroKicker}
        />
        {/* 幕②：精选信号（真实数据，≤5 行） */}
        <section
          aria-label={dict.home.signals}
          data-signals
          className="mx-auto max-w-[var(--container-max)] px-6 pt-[18vh]"
        >
          <h2 className="mono-micro text-ink-muted">{dict.home.signals}</h2>
          <Suspense fallback={<PaperRowsSkeleton count={5} />}>
            <Signals lang={lang} />
          </Suspense>
        </section>
        {/* 幕③：项目名录——纯文本 mono 行，页面尚不存在的条目不给链接 */}
        <section
          aria-label={dict.home.directoryTitle}
          data-directory
          className="mx-auto max-w-[var(--container-max)] px-6 py-[18vh]"
        >
          <h2 className="mono-micro text-ink-muted">
            {dict.home.directoryTitle}
          </h2>
          <ul>
            {dict.home.directory.map((line) => (
              <li key={line} data-paper-row className="paper-row">
                <span className="mono-micro text-ink-secondary">{line}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </RouteTransition>
  );
}

/** 最近 5 篇已发布文章（PostSummary：slug/title/publishedAt/readingTime；
 *  summary 留给列表页，AI 参与度字段尚不在查询形状里——不虚构，省略）。
 *  取数失败/为空/超期都回落骨架行：这一幕永不报错（E2E 断言 rows-or-skeleton）。
 *  3s 期限：DB 不可达时失败回要 ≈11s，会把流式文档的收尾押住同样长度，
 *  并行 e2e 下直接击穿导航超时——超期即按骨架定稿，慢查询后台自生自灭。 */
async function Signals({ lang }: { lang: string }) {
  let rows: Awaited<ReturnType<typeof listPublishedPosts>> = [];
  try {
    rows = (
      await withDeadline(listPublishedPosts(lang), 3_000, "signals")
    ).slice(0, 5);
  } catch {
    rows = [];
  }
  if (rows.length === 0) return <PaperRowsSkeleton count={5} />;
  return (
    <ul>
      {rows.map((p) => (
        <SignalRow
          key={p.slug}
          href={`/${lang}/posts/${p.slug}`}
          title={p.title}
          meta={`${fmtDate(p.publishedAt)} · ${p.readingTime ?? 1} min`}
        />
      ))}
    </ul>
  );
}
