import type { ResolvedTheme } from "@/lib/themes/resolve";

/** 三引擎（Harness 规范 §3） */
export type GenUIEngineId = "json-render" | "openui" | "rsc";
/** 传输通道（互斥律，Harness 规范 §4.2） */
export type GenUIChannel = "chat-data-stream" | "server-action-rsc";

export interface GenUIIntent {
  /** 意图来源，决定通道 */
  source: "chat" | "page-inline" | "first-paint" | "share" | "og";
  /** 是否需要站点真实数据（→ json-render） */
  needsRealData?: boolean;
  /** 探索/解释/即兴（→ openui） */
  exploratory?: boolean;
  /** 需被搜索引擎索引（→ RSC 强制） */
  seoIndexable?: boolean;
}

export interface RouteDecision {
  engine: GenUIEngineId;
  channel: GenUIChannel;
}

export interface GenUIRenderContext {
  theme: ResolvedTheme;
  locale: "zh" | "en";
  threadId?: string;
  pageContext?: readonly unknown[];
}

export interface GenUIEngine {
  id: GenUIEngineId;
  /** 该引擎能否承接此意图（0..1 置信度，路由用于择优） */
  canHandle(intent: GenUIIntent): number;
  /** 主题切换时的重放规则 */
  reskin: "in-place" | "re-render" | "not-applicable";
}
