"use client";

import Link from "next/link";
import { declareGrammarIntent } from "@/lib/motion/vt";

/**
 * 首页「精选信号」的一行信纸（客户端组件只为挂 transitionTypes：
 * spec §2.2 首页→文章是 T2 信号崩解的合法触发点，其余列表链接走 T1）。
 * 视觉完全交给 .paper-row / .mono-micro（globals.css），与 posts 列表页
 * 的服务端信纸行同源——差别只有这条链接的语法点名。
 *
 * prefetch 竞态兜底（遗留批）：prefetch 还在飞时点击，Next 复用未完成请求、
 * React 提交不带 types → 点名会退化成 T1（collapse.spec 文件头有实测案）。
 * 「点击 → await router.prefetch → push」在 Next 16.3.5 的公开 API 上做不出来
 * （router.prefetch 返回 void，内部 promise 被丢弃；研究注记见 vt.ts 意图段），
 * 改走自持补丁：onClick 同步 declareGrammarIntent("rift-collapse")，驱动在下一条
 * 无 rift-* 点名的路由过渡提交时消费（一次性 + TTL）。types 正常落地时意图作废，
 * 本组件仍以 Link 的 transitionTypes 为主通道。
 * TODO(nav)：nav.tsx 的 Lab 链接是同一竞态的另一个受害者（该文件他人在管，
 * 解冻后在这里加同款 onClick 声明即可，勿动语法派发）。
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
        onClick={() => {
          // 只声明意图，不 preventDefault：导航留在 Link 原生路径
          //（预取/滚动恢复/历史栈都由 Next 管，拦截重建反而引入偏差）
          declareGrammarIntent("rift-collapse");
        }}
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
