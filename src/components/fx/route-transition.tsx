"use client";

import { type ReactNode, ViewTransition } from "react";

/**
 * 包页面内容，让路由导航进入原生 View Transition。
 * T1 主语法在 root 伪元素上做对角撕幕（globals.css「T1 定格撕幕」段），
 * 方向性 transitionTypes（nav-forward/nav-back）已随「一次转场一种语法」铁律废除——
 * 这里保持无类型 <ViewTransition>，页面内容留在 root 快照内。
 * 布局层不参与（layout 跨导航持续，enter/exit 不触发），须用在 page.tsx 内。
 * 见设计规范 §6.4 / 幕语法 spec §2.2。
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  return <ViewTransition>{children}</ViewTransition>;
}
