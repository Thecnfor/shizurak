"use client";

type ViewTransitionDoc = Document & {
  startViewTransition?: (cb: () => void) => { finished: Promise<void> };
};

/**
 * 把一次会改变 DOM 的同步变更包进原生 View Transition（整站跨主题 morph）。
 * 特性检测 + reduced-motion 尊重：不支持或用户偏好少动画时直接执行，绝不报错。
 * 见设计规范 §6.4。
 */
export function withThemeViewTransition(mutate: () => void): void {
  if (typeof window === "undefined") {
    mutate();
    return;
  }
  const doc = document as ViewTransitionDoc;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || typeof doc.startViewTransition !== "function") {
    mutate();
    return;
  }
  doc.startViewTransition(mutate);
}
