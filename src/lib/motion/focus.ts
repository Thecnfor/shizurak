"use client";

import { gsap } from "gsap";
import { cssEase } from "@/lib/motion/gsap";
import type { ThemeMotion } from "@/themes/contract";

/** T3 镜头拉焦总预算（spec §7 红线：T3 ≤350ms，超限视同 L2 违规） */
const T3_BUDGET_MS = 350;
/** 失焦起点模糊半径：spec §2.2「整屏 blur 失焦 → 扫描线 → 锁焦」的最大光圈 */
const DEFOCUS_BLUR_PX = 8;

/** 扫描线/失焦两个通道共用的时长：ui×1.4 是「拉焦比常规 UI 更慢一点」的语义倍率，
 *  幕人格 ui=280 → 392ms 已越 T3 红线，故 Math.min 封顶（motionSpeed=2 时同样被封顶）。 */
function t3Seconds(motion: ThemeMotion): number {
  return Math.min(T3_BUDGET_MS, motion.duration.ui * 1.4) / 1000;
}

/**
 * T3 镜头拉焦（spec §2.2 / §4「⌘K：全站模糊 → 面板锁焦浮出」）。
 *
 * 载体 el 约定为**视口级遮罩层**（⌘K 用 cmdk overlay）：失焦走 `backdrop-filter`，
 * 所以面板本体保持锐利、身后整屏糊掉再收回；扫描线是同元素的 `::after`。
 * GSAP 只写 CSS 变量与属性，React 不持有动画状态（铁律）；reduced-motion 直通。
 *
 * @returns 取消函数（卸载/重触发时调用，同时清掉标记与变量，不留常驻 backdrop-filter）
 */
export function focusPull(
  el: HTMLElement | null,
  motion: ThemeMotion,
): () => void {
  if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return () => {};
  }

  const clear = () => {
    el.removeAttribute("data-focus-pull");
    el.style.removeProperty("--fp-blur");
    el.style.removeProperty("--fp-y");
    // 幕布压暗也一并摘掉：不留常驻 inline opacity，遮罩样式归位 cmdk
    el.style.removeProperty("opacity");
  };

  el.setAttribute("data-focus-pull", "1");
  const d = t3Seconds(motion);
  const ease = cssEase(motion.easing.rift) ?? motion.gsap.ease;
  const tl = gsap.timeline({ onComplete: clear });
  // 失焦 → 锁焦（含幕布压暗 0.6→1）
  tl.fromTo(
    el,
    { "--fp-blur": `${DEFOCUS_BLUR_PX}px`, opacity: 0.6 },
    { "--fp-blur": "0px", opacity: 1, duration: d, ease },
    0,
  );
  // 同一时间线上平行掠过一道扫描线（0→100% 由 CSS background-position 消费）
  tl.fromTo(el, { "--fp-y": "0%" }, { "--fp-y": "100%", duration: d, ease }, 0);

  return () => {
    tl.kill();
    clear();
  };
}
