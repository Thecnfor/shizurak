import type { GenUIIntent, RouteDecision } from "@/kernel/contracts/genui";

/**
 * 引擎路由决策表（Harness 规范 §5）。优先级：SEO > 首屏/分享/OG > 页内 > chat(数据|探索)。
 * 纯函数：同一 intent 永远同一路由，且系统提示词由本表同源生成（HS8）。
 */
export function resolveRoute(intent: GenUIIntent): RouteDecision {
  // 服务端直出通道（一次性 / SEO / 首屏 / OG / 页内）
  if (
    intent.seoIndexable ||
    intent.source === "share" ||
    intent.source === "og" ||
    intent.source === "first-paint" ||
    intent.source === "page-inline"
  ) {
    return { engine: "rsc", channel: "server-action-rsc" };
  }
  // chat 主链（Data Stream）
  if (intent.needsRealData) {
    return { engine: "json-render", channel: "chat-data-stream" };
  }
  return { engine: "openui", channel: "chat-data-stream" };
}

/** 由路由表同源生成的系统提示片段（写入 agent system prompt，保证规则与分发一致） */
export function buildRoutingPrompt(): string {
  return [
    "GenUI 路由规则（严格按序）：",
    "1. 需被索引 / 分享页 / OG / 首屏 / 页内一次性 → 引擎 RSC，通道 server-action-rsc。",
    "2. 会话内、涉及站点真实数据 → 引擎 json-render，通道 chat-data-stream。",
    "3. 会话内、解释/对比/探索/即兴 → 引擎 openui，通道 chat-data-stream。",
    "通道互斥：一次响应只用一种传输，不得混发。",
  ].join("\n");
}

/**
 * 面向模型的 GenUI 输出契约（当前渲染 json-render Spec）：
 * 要求模型用 ```spec``` 代码块输出受 catalog 约束的 json-render Spec，禁止自造其它 DSL。
 */
export function buildGenUiSpecPrompt(): string {
  return [
    "当结构化界面比纯文本更清晰时，输出一个 ```spec 代码块，内含一个合法的 json-render Spec JSON：",
    '{"root":"<key>","elements":{"<key>":{"type":"<Comp>","props":{...},"children":["<childKey>", ...]}}}。',
    "每个元素有唯一 key；children 引用其它元素 key（扁平结构）。只允许以下组件与其 props：",
    '- Stack: {direction?:"row"|"column", gap?:string} + children',
    "- Card: {title?:string} + children",
    '- Text: {text:string, tone?:"muted"}',
    "- PostCard: {title:string, summary?:string, tags?:string[]}",
    "- MetricGrid: {metrics:{label:string,value:string|number}[]}",
    '- Callout: {text:string, tone?:"info"|"success"|"warning"|"danger"}',
    '若需更自由的探索式可视化，可改用 ```openui``` 代码块输出 openui-lang（组件同上：Text/Callout/Stack/Card/MetricGrid；位置参数，如 root = Card("标题", [Text("正文", "muted")])）。',
    "若纯文本回答即可，不要输出 spec/openui 块。不要输出 <openui>/<json-render> 等其它标签或引擎内部术语。",
  ].join("\n");
}
