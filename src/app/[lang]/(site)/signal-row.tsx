"use client";

import Link from "next/link";

/**
 * 首页「精选信号」的一行信纸（客户端组件只为挂 transitionTypes：
 * spec §2.2 首页→文章是 T2 信号崩解的合法触发点，其余列表链接走 T1）。
 * 视觉完全交给 .paper-row / .mono-micro（globals.css），与 posts 列表页
 * 的服务端信纸行同源——差别只有这条链接的语法点名。
 * ⚠️ 已知退化：prefetch 未落地时的首点会丢 types 落回 T1（见 nav.tsx 注记）。
 */
export function SignalRow({
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
      <Link
        href={href}
        transitionTypes={["rift-collapse"]}
        className="paper-row"
      >
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
