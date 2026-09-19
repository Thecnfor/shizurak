"use client";

import { type ReactNode, ViewTransition } from "react";

const byType = {
  "nav-forward": "nav-forward",
  "nav-back": "nav-back",
  default: "none",
};

/**
 * 包页面内容，让路由导航带上方向感（<Link transitionTypes> 驱动）。
 * 布局层不参与（layout 跨导航持续，enter/exit 不触发），须用在 page.tsx 内。
 * 见设计规范 §6.4。
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={byType} exit={byType} default="none">
      {children}
    </ViewTransition>
  );
}
