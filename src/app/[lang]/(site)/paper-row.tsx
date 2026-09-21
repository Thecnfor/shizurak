import Link from "next/link";

/**
 * 信纸行家族的服务端一侧（spec §1.2：文章列表不是卡片，一行行信纸——
 * hairline 分隔 + 上下大留白；视觉在 globals.css 的 .paper-row/.mono-micro）。
 * 首页幕②那条点名 T2 崩解的行是客户端 signal-row.tsx，只有链接语法不同；
 * 列表/项目/关于页的导航不设点名 → 走 T1 主语法，无需客户端组件。
 */

/** ISO 日期（无时区戏法：取 UTC 前 10 位，与旧列表页口径一致） */
export function fmtDate(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

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
 *  （诚实占位、永不报错；e2e 的 rows-or-skeleton 断言锚在 data-paper-row） */
export function PaperRowsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <ul aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: 骨架行无身份也无状态，位置就是键
        <li key={i} data-paper-row data-skeleton="true" className="paper-row">
          <span className="paper-row-title text-[1.05rem]">…</span>
          <span className="mono-micro tabular-nums">…</span>
        </li>
      ))}
    </ul>
  );
}
