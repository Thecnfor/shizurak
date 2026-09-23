import Link from "next/link";

/**
 * 信纸行家族的服务端一侧（spec §1.2：文章列表不是卡片，一行行信纸——
 * hairline 分隔 + 上下大留白；视觉在 globals.css 的 .paper-row/.mono-micro）。
 * 首页幕②那条点名 T2 崩解的行是客户端 signal-row.tsx，只有链接语法不同；
 * 列表/项目/关于页的导航不设点名 → 走 T1 主语法，无需客户端组件。
 * 日期/元信息的口径住在 lib/utils（fmtDate/postMeta），这里只管排印。
 */

export function PaperRow({
  href,
  title,
  meta,
}: {
  href: string;
  title: string;
  meta: string;
}) {
  return (
    <li data-paper-row>
      <Link href={href} className="paper-row">
        <h3 className="paper-row-title text-[1.05rem] font-medium leading-snug">
          {title}
        </h3>
        <span className="mono-micro shrink-0 tabular-nums text-ink-faint">
          {meta}
        </span>
      </Link>
    </li>
  );
}

/** 骨架信纸行：Suspense fallback 与「无内容/DB 不可达」共用同一形态
 *  （诚实占位、永不报错；e2e 的 rows-or-skeleton 断言锚在 data-paper-row）。
 *  行高与真行逐项对齐（perf 审计 2026-09-23：骨架→内容替换的 CLS 源头是行高差）：
 *  标题行的 leading-snug 必须与 PaperRow/SignalRow 的 h3 同抄——span 不继承 h3
 *   UA 行盒，差 ~1.4px/行×5 行；字号/mono-micro 两侧本就同源。
 *  已知不可锁项：真行标题可折行（两行标题比一行骨架高），列表长度 N≠骨架数——
 *  那是内容语义变化，不是形态错位，不在此治。 */
export function PaperRowsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <ul aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: 骨架行无身份也无状态，位置就是键
        <li key={i} data-paper-row data-skeleton="true" className="paper-row">
          <span className="paper-row-title text-[1.05rem] leading-snug">…</span>
          <span className="mono-micro tabular-nums">…</span>
        </li>
      ))}
    </ul>
  );
}
