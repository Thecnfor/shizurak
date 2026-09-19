# 05 · Agent Harness 规范（Harness Spec）

> 项目：**shizurak**（blog.xrak.top）— 伍泽凯个人博客
> 状态：定稿 v1 · 2026-09-19
> 关联：[设计规范](./01-design-spec.md) · [架构规范](./02-architecture-spec.md) · [状态管理规范](./03-state-spec.md) · [依赖规范](./04-dependency-spec.md)

> 定位：本文是「把所有前沿部件**统一规范起来**」的那一份文档——DSH-Cordis 微内核 · AI SDK v7 · Mastra · **三引擎 GenUI（json-render / OpenUI / RSC）** · 主题桥 · 权限模型 · 成本闸 · 可观测——它们不是并列清单，而是**同一套契约下的插件与运行时**。架构规范 §5 描述 Harness 的**位置**，本规范描述 Harness 的**语义**。

---

## 0. 设计公理

| # | 公理 | 展开 |
|---|------|------|
| H1 | **微内核只做三件事** | 插件生命周期 · 声明式依赖注入 · 事件总线 + Service。任何 Agent/GenUI/主题业务逻辑都不进内核（架构规范 §4）。 |
| H2 | **插件之间零 import** | 只经 Service 与事件通信；跨插件协作靠**契约层**（`GenUIEngine` / `UiAction` / `ToolDescriptor`）。 |
| H3 | **一切上下文可寻址** | 页面 / 段落 / 卡片 / 会话 / 主题——都能作为 `contextRef` 被工具与 GenUI 引擎读取；系统提示词按 token 预算从上下文栈取片段。 |
| H4 | **一切产物可主题化** | Agent 输出的文本、GenUI spec、RSC 组件、OG 图——**同一份内容 × 不同主题 = 不同皮肤**（设计规范 §7 · §11）。 |
| H5 | **一切成本可预算** | 每一次模型调用、工具步骤、RSC 渲染、GenUI spec 生成——都进 OTel span；三重闸任一层失效不致命。 |
| H6 | **一切前沿经过实测** | 本规范只锁定 2026-09-19 已核实的事实：Next 16.3.5 stable · AI SDK v7 GA · json-render 0.21 (Vercel Labs) · OpenUI 0.3 (thesysdev) · GSAP 3.15 全插件免费。**未 promote 到 stable 的能力（如 Next `<Stack>`）不进当前依赖，只留位**。 |

---

## 1. Harness 总览

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       Agent Harness（统一契约）                           │
│                                                                          │
│   ┌─── 前端内核 (lib/kernel · 'use client' · Cordis) ───┐                │
│   │  ui-actions    L0/L1/L2 动作注册表                   │                │
│   │  page-context  上下文栈（页 → 段 → 卡）              │                │
│   │  component-kit GenUI 客户端 Registry（hud/clean）    │                │
│   │  theme-bridge  订阅 theme-store → 广播皮肤变体       │                │
│   │  genui-router-client  选择渲染器（三引擎）           │                │
│   └────────────────────────┬────────────────────────────┘                │
│                            │  UIMessage stream / Server Actions          │
│   ┌────────────────────────▼────────────────────────────┐                │
│   │        AI SDK v7 运行时（ToolLoopAgent）             │                │
│   │  streamText · toolApproval · stopWhen · reasoning    │                │
│   │  transports: Data Stream（默认）/ RSC（ai/rsc 专通道）│                │
│   └────────────────────────┬────────────────────────────┘                │
│                            │                                             │
│   ┌────────────────────────▼────────────────────────────┐                │
│   │  后端内核 (src/kernel · Node · Cordis)               │                │
│   │   model-adapter   → ai.models（LiteLLM 虚拟 key）    │                │
│   │   tool-registry   → ai.tools（+ 官方 @ai-sdk/mcp）   │                │
│   │   mastra-engine   → workflows（content/ingest/index）│                │
│   │   genui-router    → engines（json-render/openui/rsc）│                │
│   │   content-agent   → 作者侧能力                        │                │
│   │   spec-store      → GenUI spec 持久化 + 分享          │                │
│   │   thread-store    → 会话与消息                        │                │
│   └────────────────────────┬────────────────────────────┘                │
│                            │                                             │
│   ┌────────────────────────▼────────────────────────────┐                │
│   │  GenUI 三引擎（统一 GenUIEngine 契约 · §3）           │                │
│   │   json-render │ OpenUI Lang │ RSC（streamUI/Actions） │                │
│   └─────────────────────────────────────────────────────┘                │
└──────────────────────────────────────────────────────────────────────────┘
     │           │              │              │              │
     ▼           ▼              ▼              ▼              ▼
  PostgreSQL   MinIO         Redis         LiteLLM       OTel (集群)
  (blog)      (媒体/spec)   (限流/缓存)   (模型/预算)   (Tempo/Loki/Prom)
```

**四条主链**（其余皆为其服务）：

1. **访客对话链**：`useChat → /api/chat → ToolLoopAgent → tools → GenUI Engine → 客户端渲染器（theme-bridge 换肤）`
2. **RSC 专通道链**：`Server Action (streamUI) → 服务端 yield 组件 → RSC 流下发 → 客户端零注册表渲染`
3. **作者工作流链**：`/admin → Mastra workflow → model-adapter → 审核 diff → 发布（revalidateTag）`
4. **上下文回环链**：`page-context 栈 + theme-store.resolved → 每次请求注入（不污染 system prompt，走 user/context part）`

---

## 2. 统一抽象契约

### 2.1 Plugin / Service / Event 命名规范

| 抽象 | 命名 | 示例 |
|------|------|------|
| Plugin id | `<domain>-<role>`（kebab-case） | `ai-model-adapter` · `genui-router` · `theme-bridge` |
| Service 键 | `ai.models` / `ai.tools` / `genui.router` / `page.context` / `ui.actions` / `theme.bridge` / `spec.store` / `thread.store` / `workflows` | 三段式以内，动词留给方法名 |
| Event 名 | `<subject>.<verb>`（现在时） | `theme.switched` · `agent.tool.invoked` · `genui.rendered` · `page.context.pushed` |

**禁止**：`agentServiceManager` / `handleThemeChange`（事件名带 handle）等——命名即契约。

### 2.2 Plugin 骨架（Cordis 4.0）

```ts
// 通用形态（前后端一致）
export const plugin = createContext(
  {
    name: 'genui-router',
    inherits: ['ai-model-adapter', 'theme-bridge', 'page-context'], // 拓扑序
    provide: (ctx) => ({
      genui: ctx.genui, // 暴露的 Service
    }),
  },
  ({ require }, scope) => {
    const models = require('ai.models')
    const engines = require('genui.engines')
    // 生命周期：可注册 disposer（HMR 安全）
    return { engine(id: string) { return engines.get(id) } }
  },
)
```

**内核入口**（复用 cross-dashboard 模式）：
- `getKernel(): Promise<Context>` · `whenKernelReady(): Promise<Context>`
- `globalThis` 单例 + `KERNEL_VERSION` 守卫（HMR 时插件集变更需 bump）
- 前端内核与后端内核**同构 vendor 同一份 Cordis**（心智一致）

### 2.3 Service 契约注册表

| Service | 提供者 | 关键方法 | 消费方 |
|---------|--------|----------|--------|
| `ai.models` | `model-adapter` | `chat()` · `embedding()` · `title()` · `onTokenUsage(cb)` | ToolLoopAgent · 工作流 |
| `ai.tools` | `tool-registry` | `list()` · `invoke(id, args, ctx)` · `mcpFederation()` | ToolLoopAgent · ui-actions |
| `genui.engines` | `genui-router` | `register(engine)` · `resolve(intent)` · `get(id)` | /api/chat · /lab · Server Actions |
| `genui.specStore` | `spec-store` | `save(spec)` · `load(id)` · `share(id)` | /lab/s/[id] · OG 图 |
| `agent.threads` | `thread-store` | `append(msg)` · `history(tid)` · `visitorHash()` | /api/chat · admin/agent |
| `ui.actions` | `ui-actions` | `register(action)` · `invoke(id, params)` · `list(level)` | 前端 component-kit · ToolLoopAgent（L1 代理） |
| `page.context` | `page-context` | `push(ref)` · `pop(ref)` · `snapshot(depth?)` | useChat 请求注入 · 工具读取 |
| `theme.bridge` | `theme-bridge` | `current()` · `subscribe(cb)` | GenUI 渲染器 · RSC 通道 · FxLayer |
| `workflows` | `mastra-engine` | `run(name, input)` · `stream(name, input)` | /admin · cron ingest |

**契约原则**：Service 只提供**能力**（可序列化参数 + 可序列化返回），不共享可变对象引用。

---

## 3. GenUI 三引擎统一抽象

### 3.1 GenUIEngine 接口

```ts
// src/kernel/contracts/genui.ts（前后端共享类型）
export type GenUIEngineId = 'json-render' | 'openui' | 'rsc'

export interface GenUIRenderContext {
  theme: ResolvedTheme       // 皮肤解析所需（hud/clean 变体）
  locale: 'zh' | 'en'        // 内容语言（架构规范 §6.4）
  threadId?: string
  pageContext?: ContextRef   // 上下文栈顶引用（§8）
  streamSignal: AbortSignal  // 取消传播
}

export interface GenUIEngine<TPayload = unknown, TResult = unknown> {
  id: GenUIEngineId
  /** 意图分类器——路由表（§5）用其判定引擎是否可处理当前 intent */
  canHandle: (intent: GenUIIntent) => number       // 0..1 置信度
  /** 从模型流 / Server Action 参数中构造可渲染负载 */
  emit: (source: GenUIStreamSource) => AsyncIterable<TPayload>
  /** 渲染：客户端引擎返回 spec；RSC 引擎返回 RSC 流（服务端已渲染） */
  render: (payload: TPayload, ctx: GenUIRenderContext) => TResult
  /** 主题切换时的重放规则（theme-bridge 消费） */
  reskin: 'in-place' | 're-render' | 'not-applicable'
}
```

### 3.2 三引擎对照表

| 维度 | json-render | OpenUI Lang | **RSC（本轮新增）** |
|------|-------------|-------------|---------------------|
| 归属 | Vercel Labs（Apache-2.0） | thesysdev（MIT） | React/AI SDK 原生（`ai/rsc`） |
| 负载 | JSON spec（JSONL patch 流） | OpenUI Lang（结构化文本 DSL） | RSC payload（服务端已序列化） |
| 渲染位置 | 客户端 `<Renderer>` + Registry | 客户端 `@openuidev/react-lang` | **服务端**已渲染，客户端只挂载 DOM |
| 客户端 JS 成本 | ~20KB（懒加载） | ~15KB（懒加载） | **0 额外**（复用框架 runtime） |
| 交互能力 | 强（`$state` 绑定 + ui-action） | 中（组件回调） | 需 `'use client'` 岛 |
| 主题换肤 | theme-bridge 广播，原地 morph | 同左（`streamReveal` 节奏不同） | **重放服务端渲染**（RSC 无客户端状态） |
| SEO 可索引 | 否（首屏空壳） | 否 | **是**（HTML 直出） |
| 流式呈现 | JSONL patch → 增量渲染 | Lang 逐行 → 渐进解析 | Server Action 流 → Suspense 挂载 |
| 适用意图 | 真实数据绑定 · 结构化仪表 | 探索 · 即兴 · 可视化创意 | **一次性展示 · SEO 分享页 · OG 图** |
| 降级路径 | 引擎不可用→纯文本回答 | 同左 | 无 VT 支持→静态 HTML 直出 |

### 3.3 三引擎共存规则

- **同一份 spec / 组件目录（catalog）**：`src/components/genui/catalog.ts` 是**唯一真源**；json-render 直接以 Zod schema 消费；OpenUI 由 `@openuidev/cli` 从同一组件库生成 Lang 提示；RSC 组件从同一 registry 导入。**换主题只换 registry 变体**（`registry-hud/` · `registry-clean/` · `registry-server/`），三引擎自动同步。
- **禁止在业务侧直接 `import` 具体引擎 API**——只经 `genui.engines.resolve(intent).render(...)`。升级 json-render 0.21→0.22 破坏性变更只影响适配层（架构规范 §6 · 依赖规范 §6）。
- **RSC 与 Data Stream 互斥律**（§4.2）——单次请求选定一种传输，禁止在同一响应流里混发。

---

## 4. RSC GenUI 详设（本轮核心新增）

### 4.1 传输机制

RSC GenUI 是**第三条通道**，不复用 `useChat` 的 Data Stream（SSE）。它是 **Server Actions + React RSC 流** 的组合：

```ts
// app/[lang]/(site)/posts/[slug]/actions.tsx（服务端）
'use server'
import { streamUI } from 'ai/rsc'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { z } from 'zod'
import { registryServer } from '@/components/genui/registry-server'
import { readResolvedThemeFromHeaders } from '@/lib/themes/ssr'

const model = createOpenAICompatible({ /* → LiteLLM */ })

export async function explainSection(sectionRef: string) {
  const theme = await readResolvedThemeFromHeaders()   // §4.4 主题感知
  const { value } = streamUI({
    model,
    initial: <SectionSkeleton theme={theme} />,
    messages: [/* user/context part；system 不进 messages（v7 默认 allowSystemInMessages=false）*/],
    tools: {
      showConcept: {
        description: '展示一个概念卡（真实数据 + 类比）',
        parameters: z.object({ term: z.string(), posts: z.array(z.string()) }),
        generate: async function* ({ term, posts }, { themeId }) {
          yield <ConceptCardLoading term={term} />
          return <ConceptCard term={term} posts={posts} variant={themeId} />
        },
      },
      // 更多工具…（受 §6 权限模型约束）
    },
  })
  return value  // RSC 流；客户端 <Suspense> 挂载
}
```

**要点**：
- `streamUI` 是 **AI SDK 内置子入口**（`ai/rsc`），**不额外装包**。
- `generate` 生成器可 `yield` 中间态，React 把每个 yield 序列化为 RSC payload 流式下发。
- 客户端**零注册表**——不像 json-render 需要 `<Renderer>` 与 component map；RSC 直接把服务端已渲染的 DOM 补丁应用。

### 4.2 **传输互斥律**（v7 现实约束）

AI SDK v7 的 chat 支持两种传输，**每次 chat 会话只能选一种**：

| 传输 | API | 优点 | 代价 |
|------|-----|------|------|
| **Data Stream**（默认） | `useChat` + `/api/chat` + `toUIMessageStreamResponse` | 支持 `data-genui` part · 客户端可缓存 spec · 跨主题原地换肤 · L2 确认卡体验 | 客户端要装渲染器（~20KB） |
| **RSC Protocol** | `ai/rsc` `streamUI` / Server Actions | 服务端组件直出 · 零客户端注册表 · SEO 可索引 | 换主题需重跑服务端 · 状态回到服务端 · 交互要 `'use client'` 岛 |

**Harness 决策（混合拓扑）**：

- **访客 chat 主链 = Data Stream**：这是当前规范 §3.5（状态规范）的默认，`useChat` 承载多轮对话、GenUI data-parts、L2 pending actions、reasoning 可视化——所有交互性场景。
- **RSC GenUI = 专用通道**（不进 chat 主链）：
  1. **页内一键解释**：文章段落 hover → "问 AI 这一段" → Server Action → RSC 组件浮现（**零客户端 JS 增加**，比 chat 通道轻得多）
  2. **`/lab/s/[id]` 分享页**：GenUI spec 存在 `spec-store`，分享页用 RSC **服务端直出**（SEO 可索引 + 无 JS 也能看到内容）
  3. **OG / 社交图**：`app/[lang]/opengraph-image.tsx` 用 `@json-render/image` 或直接 RSC + `ImageResponse` 渲染"分享方当时那份 spec"
  4. **首屏 SSR 直出 GenUI 卡**：如首页"最新动态"卡（agent 生成的时序摘要）——RSC 直出，访客切换对话时不影响首屏已渲染内容

**禁止**：把访客 chat 整体改成 RSC——失去 theme-bridge 原地换肤、`pendingActions` 确认卡的流畅性、以及 json-render spec 的分享缓存能力。

### 4.3 RSC GenUI 与三引擎路由

路由表（§5）新增 `channel` 维度：

```ts
type Channel = 'chat-data-stream' | 'server-action-rsc'
```

同一 intent 可能两通道都能满足——路由决策偏序：
- 若请求**源于 `useChat`**（会话消息）→ `chat-data-stream`
- 若请求**源于页面局部交互**（hover / click / 首屏）→ `server-action-rsc`
- 若内容**需被搜索引擎索引**（分享页 / OG）→ `server-action-rsc` 强制

### 4.4 主题感知（RSC 通道）

RSC 渲染发生在服务端，拿不到客户端 `useThemeStore`。方案：

- **主题状态同时持久化到 cookie**（`theme-store` 写入时同步 `document.cookie = 'shizurak-theme=void'` + `mode` + `overrides` base64）
- **RSC 侧读取**：`lib/themes/ssr.ts` 暴露 `readResolvedThemeFromHeaders()`——从 cookie 解析 → `resolveTheme()` 纯函数（设计规范 §1.3）→ 返回 `ResolvedTheme`
- **RSC 组件按 variant 分派**：`<ConceptCard variant={theme.meta.id === 'void' ? 'hud' : 'clean'} ... />` —— 与客户端 registry 同一份语义但不同皮肤
- **降级**：cookie 缺失/非法 → 用默认主题（`void`），不阻塞渲染

**权衡**：cookie 每次请求都送几十字节，但换来**首屏与 RSC 通道完全主题一致**——值得。

### 4.5 交互回环（RSC 组件内挂 client 岛）

RSC 组件本身不能 `useState`——但可以在其中**嵌入 client island**：

```tsx
// components/genui/registry-server/action-button-hud.tsx（RSC）
export function ActionButtonHud({ action, params }: ...) {
  return (
    <div data-genui-action>
      <span className="hud-label">{action.label}</span>
      <ActionButtonClient actionId={action.id} params={params} />  {/* 'use client' */}
    </div>
  )
}
```

`ActionButtonClient` 通过前端内核 `ui.actions.invoke(id, params)` 走 §6 权限模型；L2 动作进 `pendingActions` 队列——**与 Data Stream 通道共享同一套动作注册表**。

### 4.6 RSC 降级与预算

- **无 VT 支持浏览器**（Safari 早期）：RSC 流依然工作（VT 只影响动画，不影响渲染）
- **streamUI 失败**（模型异常）：`initial` 骨架屏保留 → `onError` 客户端提示重试
- **预算**：单次 RSC GenUI 服务端渲染耗时上限 **800ms**（P95 目标 400ms）；超时降级为纯文本回答（`text/plain` data-part）
- **span**：每次 RSC 通道调用产生独立 span（§9）

---

## 5. 引擎路由决策表

**核心问题**：一个 intent 到达 Harness，走哪个引擎 + 哪个通道？

### 5.1 决策矩阵

| Intent 类别 | 例 | 引擎 | 通道 | 主题换肤 |
|-------------|-----|------|------|----------|
| **真实数据 · 结构化** | "最近三篇文章" / "Rak 集群状态" / "奖项列表" | json-render | chat-data-stream | 原地 |
| **探索 · 对比 · 演示** | "对比 FlowMind 和 Rak" / "解释 K8s 调度器" | openui | chat-data-stream | 原地 |
| **一次性展示 · 页内辅助** | 段落解释 / 术语卡 / 相关代码片段 | rsc | server-action-rsc | 换主题需重放 |
| **可分享 · SEO 需要** | `/lab/s/[id]` 分享页 | rsc（首屏）+ json-render（交互） | 混合 | 首屏服务端 · 交互客户端 |
| **OG / 社交图** | 文章 OG 图 / 分享卡 | rsc 或 `@json-render/image` | 静态路由 | 服务端按作者当时主题渲染 |
| **首屏 GenUI 卡** | 首页"最新动态"agent 摘要卡 | rsc | server-action-rsc（构建期 prerender） | SSR 时按访客 cookie |
| **无 UI 纯文本** | 短问答 | 不生成 UI | chat-data-stream | — |

### 5.2 路由规则（写入系统提示词生成器）

```
输入 intent
├─ intent.contextRef.path 匹配 /lab/s/* 或 opengraph-image → channel=server-action-rsc
├─ intent.source == 'chat' （useChat 内部）
│   ├─ 有真实数据取数需求（tool:searchPosts/getSiteStats/...） → engine=json-render
│   └─ 探索/解释/可视化创意 → engine=openui
├─ intent.source == 'page-inline'（页内一键解释）→ engine=rsc, channel=server-action-rsc
└─ intent.source == 'first-paint'（首屏 SSR）→ engine=rsc, channel=server-action-rsc
```

**路由优先级**：`SEO > 首屏 > 交互 > 探索 > 数据`。同一问题多引擎都能答时，按此序裁。

### 5.3 路由插件（genui-router）

```ts
// src/kernel/plugins/genui-router.ts
export const genuiRouterPlugin = createContext({
  name: 'genui-router',
  inherits: ['ai-model-adapter'],
  provide: (ctx) => ({ 'genui.engines': ctx.genui.engines, 'genui.router': ctx.genui.router }),
})

// 内部注册三个引擎
function bootstrap(engines: Map<GenUIEngineId, GenUIEngine>) {
  engines.set('json-render', createJsonRenderEngine())
  engines.set('openui',      createOpenUIEngine())
  engines.set('rsc',         createRscEngine())    // 只服务端可用
}
```

路由表以数据形式表达（`lib/genui/routing-table.ts`），**系统提示词由路由表生成**——保证模型看到的规则与实际分发一致（消除"提示漂移"）。

---

## 6. 权限模型（L0 / L1 / L2）

**沿用架构规范 §5.4 的三级定义**，本节展开**在 Harness 契约下的具体映射**。

### 6.1 三级动作与 AI SDK v7 映射

| 级别 | 定义 | 执行策略 | AI SDK v7 实现 |
|:----:|------|----------|----------------|
| **L0** | 只读 / 建议（`searchPosts` · `getPost` · `listProjects` · `getSiteStats`） | 自动执行 | `tool.execute` 默认（无 approval） |
| **L1** | 本地可逆（`navigateTo` · `setTheme` · `filterPosts` · `generateUI`） | 自动执行到「前端本地状态」 | 前端 `ui.actions` 注册为 L1；后端 tool 通过 `onToolCall` 转发到客户端执行 |
| **L2** | 对外 / 不可逆（`subscribeUpdates` · `contactAuthor` · 发布 · 删除） | **挂起 → 确认卡 → 批准才执行一次** | `toolApproval: { contactAuthor: 'user-approval' }`（v7 稳定化） |

### 6.2 UiAction 契约（三引擎共用）

```ts
// src/components/genui/action-contract.ts
export interface UiAction<TParams = unknown> {
  id: string                             // 'theme.set' | 'post.filter' | 'nav.to'
  level: 'L0' | 'L1' | 'L2'
  schema: ZodType<TParams>               // zod schema：参数校验 + 系统提示自动生成
  reversible: boolean
  preview?: (params: TParams) => {       // 用于 L2 确认卡的主题化渲染
    title: string
    summary: string
    riskNote?: string
  }
  execute: (params: TParams) => Promise<void> | void
}
```

`preview` 是 L2 审批卡的关键——**确认卡也随主题换肤**（HUD 版是红色边框切角告警；clean 版是柔和 modal）。

### 6.3 三引擎的权限边界

| 引擎 | 能触发的动作 | 不能触发的动作 |
|------|-------------|---------------|
| json-render | ActionButton 组件绑 `ui-action:<id>`（走 L0/L1/L2 判定） | 不允许 spec 内直接 `fetch` |
| OpenUI | 通过 `createLibrary` 声明的组件回调 | 同上 |
| **RSC** | `'use client'` 岛内调 `ui.actions.invoke` | **服务端 yield 时禁止直接触发写库/发布**（这些是 author-side workflow，走 §7 工作流链） |

**红线**：访客侧**任何通道**都不获得 L2 之外的能力；作者侧发布动作同样走确认。

---

## 7. 成本三重闸

**目标**：任何一层失效都不致命。

| 层 | 位置 | 阈值 | 触发行为 |
|----|------|------|----------|
| **① Redis 令牌桶** | /api/chat · Server Action 入口 | 单 IP `10 req/min + 30 req/h`；全局 `500 req/h` | 429 + 冷却提示（HUD 版显示"再等 Ns"倒计时） |
| **② LiteLLM 虚拟 key 预算** | 网关侧（架构规范 §5.1） | 月预算硬顶 | 网关直接 402 → Harness 降级为纯文本缓存回答 |
| **③ `stopWhen: stepCountIs(12)`** | ToolLoopAgent 内部 | 单次对话 12 步工具循环 | 强制结束流；`finishReason: 'step-budget'` 上报 |
| **④ RSC 通道预算**（本规范新增） | Server Action 计时 | 单次渲染 ≤ 800ms | 超时 abort streamUI → 降级为纯文本回答 |
| **⑤ GenUI spec 尺寸闸** | genui-router.emit | 单 spec ≤ 64KB | 截断 + 提示"结果过大，已简化" |

**观测**：五道闸的每次触发都是独立 metric（`harness.gate.<name>.hit`），Grafana 面板按分钟粒度展示——任一层异常高触发预示上游有问题。

---

## 8. page-context 上下文栈

**升级架构规范 §4.2** 的"快照"形态为**栈**。

### 8.1 分层注册

```
┌─── L0（页面）─────────────────────┐
│ { type: 'post', slug, title,      │
│   tags, publishedAt, excerpt }    │
│  ┌─── L1（区块）───────────────┐  │
│  │ { type: 'section', anchor,  │  │
│  │   heading, summary }        │  │
│  │  ┌─── L2（元素）─────────┐  │  │
│  │  │ { type: 'card', id,   │  │  │
│  │  │   semantic }          │  │  │
│  │  └───────────────────────┘  │  │
│  └─────────────────────────────┘  │
└───────────────────────────────────┘
```

- 页面 mount → 推 L0
- 区块进入视口（IntersectionObserver）→ 推 L1；离开 → 弹
- 元素 hover/focus → 推 L2；失焦 → 弹

### 8.2 Token 预算注入

`snapshot(depth)` 按 token 预算取栈顶 N 层，替代整页 dump：

```ts
// lib/kernel/plugins/page-context.ts
snapshot(opts?: { maxTokens?: number }): ContextRef[] {
  const budget = opts?.maxTokens ?? 800
  const stack = this._stack           // 有序栈
  const picked: ContextRef[] = []
  let tokens = 0
  for (const ref of stack) {
    const t = estimateTokens(ref)
    if (tokens + t > budget) break
    picked.push(ref); tokens += t
  }
  return picked
}
```

**关键**：`snapshot` 是**纯读**——不改变栈；调用方（chat / Server Action）把结果作为 **user/context part** 注入，**绝不拼进 system prompt**（AI SDK v7 `allowSystemInMessages=false` 是结构防线，架构规范 §5.1）。

### 8.3 RSC 通道下的 page-context

RSC 请求走 Server Action，`pageContext` **显式作为参数传入**（不通过 globalThis）：

```ts
'use server'
export async function explainSection(sectionRef: ContextRef, pageStack: ContextRef[]) {
  // pageStack 从客户端序列化传入；服务端校验（防越权）
  assertRefsBelongToSession(sectionRef, pageStack)
  ...
}
```

校验规则：`sectionRef.anchor` 必须属于当前会话已注册的 L0 页面（否则 400）——**防止客户端伪造上下文**。

---

## 9. 可观测契约

### 9.1 Span 层级（每次 Harness 请求一棵树）

```
harness.request  (root, traceparent 从浏览器)
├─ gate.redis.check
├─ kernel.services.wire                          (仅内核冷启时)
├─ agent.tool-loop                               (ToolLoopAgent)
│  ├─ model.stream  (LiteLLM 上游 · token in/out · cache_control 命中)
│  ├─ tool.execute.<name>  ×N
│  └─ gate.step-budget.check
├─ genui.engine                                  (§3)
│  ├─ engine.route  → engine_id
│  ├─ engine.emit   → payload_bytes
│  └─ engine.render → render_ms
├─ theme.bridge                                  (换肤耗时)
├─ page.context.snapshot                         (栈深 / token 占用)
└─ rsc.stream                                    (仅 RSC 通道)
   ├─ rsc.render.<component>                     单组件耗时
   └─ rsc.payload.bytes                          下发字节数
```

### 9.2 关键属性（每个 span 必带）

| 属性 | 用途 |
|------|------|
| `theme` (void/lumen/...) | 按主题分位数看性能 |
| `locale` | 分语言看首 token 延迟 |
| `engine` (json-render/openui/rsc) | 引擎级监控 |
| `spec.id` | 端到端追踪一份 GenUI |
| `page.context.depth` | 上下文栈深度（>6 常提示 token 爆炸风险） |
| `gate.hit` | 命中的成本闸名 |
| `visitor.hash` | 去标识化访客（日轮换 salt） |

### 9.3 Grafana 关键面板

- **agent 首 token P50/P95**（按 theme × locale × engine 分面）
- **GenUI 渲染耗时**（json-render emit→render · rsc.stream）
- **成本闸触发次数**（哪道闸在挡什么）
- **prompt cache 命中率**（LiteLLM 侧 `cache_read_input_tokens / input_tokens`）
- **page-context token 分布**（超过 1200 tokens 的请求数）

---

## 10. Harness × 主题契约的桥接

主题不是"前端的事"——Harness 每一层都要感知：

| 层 | 主题感知点 |
|----|-----------|
| 系统提示词 | `buildSystemPrompt(pageContext, catalog, theme)`——HUD 主题倾向**紧凑数据风格**；clean 主题倾向**自然语言风格**（体现于示例） |
| 工具选择 | 主题无功能差别，但**GenUI catalogVariant** 决定渲染层选 hud/clean 组件 |
| L2 审批卡 | `UiAction.preview` 输出经主题皮肤渲染（§6.2） |
| RSC 通道 | `readResolvedThemeFromHeaders()` → 服务端选 registry-server 变体（§4.4） |
| 流式显现节奏 | `theme.genui.streamReveal`（void decode 24ms / lumen fade 30ms）——由 theme-bridge 广播给三引擎 |
| 错误降级文案 | void 用遥测术语（"信号丢失"），lumen 用直白（"暂时无法连接"）——**降级文案也在主题契约内** |

**关键**：主题不是"CSS 类"，是**贯穿全栈的运行时对象**——从渲染层到 Harness 层。这是"多主题交汇架构（跳脱非黑即白）"的真正落点（设计规范 §1）。

---

## 11. 前沿核对（Harness 专属）

| 组件 | 版本 | 状态 |
|------|------|:----:|
| AI SDK | v7.0.106 | ToolLoopAgent / toolApproval / stopWhen / reasoning / `ai/rsc` streamUI — 全部 v7 稳定 |
| @ai-sdk/react | 随 `ai` 主版本对齐 | v7 期实际装 `5.x` 或 `7.x`（安装时以 npm 实测为准；依赖规范 §2.5） |
| @ai-sdk/mcp | 2.0.53 | 官方 MCP 客户端（Streamable HTTP/SSE/stdio + OAuth + 会话重连） |
| Mastra | 1.67.0 | `createWorkflow/createStep/commit` |
| json-render | 0.21 (Vercel Labs, Apache-2.0) | core/react/zustand/image/devtools-react |
| OpenUI | 0.3 (thesysdev) | lang-core/react-lang/react-ui/cli |
| Next.js | 16.3.5 | Cache Components · `ai/rsc` 兼容 · root-params |
| React | 19.2.8 | `<Activity>`（Agent Dock 状态保留）· `useEffectEvent` · `useOptimistic` · `<ViewTransition>` |

**排除**（评估后不引入）：
- **AG-UI 协议**：AI SDK 自有 UI 消息流已闭环，引入是双重协议栈
- **`@openuidev/react-headless`**：与 `useChat` 双状态源冲突
- **v7 `WorkflowAgent` / `@ai-sdk/workflow`**：Mastra 已在工作流层，不叠床架屋
- **Next `<Stack>` / `useActiveStack`**：Canary 预览，未 promote 到 stable；等价能力用 `<ViewTransition>` + `<Activity>` 实现（设计规范 §6 · §11）

---

## 附 · Harness 决策记录（ADR 摘要）

| # | 决策 | 理由 |
|---|------|------|
| **HS1** | GenUI **三引擎**而非二选一 | 数据/探索/展示是三类任务，工具应对应任务；RSC 补齐「一次性 + SEO」空白 |
| **HS2** | RSC 与 Data Stream **混合拓扑**，不整体切 RSC | AI SDK 传输互斥律；切 RSC 失去 theme-bridge 原地换肤与 pendingActions 流畅性 |
| **HS3** | `page-context` 从"快照"升级为"栈" | 分层注册 + token 预算取栈顶 N 层，避免整页 dump 毁成本 |
| **HS4** | catalog 唯一真源 · 三引擎共用 | 换主题只换 registry 变体，spec 语义不动——DRY 且一致性有保证 |
| **HS5** | UiAction 契约含 `preview` 输出 | L2 审批卡的主题化呈现是"多主题交汇"的最后一公里 |
| **HS6** | 成本闸从三重升级为**五重**（+RSC 800ms + spec 64KB） | RSC 通道是新成本敞口，spec 尺寸是可预见的滥用点 |
| **HS7** | 主题感知贯穿 Harness（不仅前端） | 系统提示词、L2 卡、RSC 通道、错误文案都随主题——"两种宇宙"的完整兑现 |
| **HS8** | 路由表以数据形式表达 + 生成系统提示词 | 消除"提示漂移"——模型看到的规则与实际分发**同源** |
| **HS9** | 禁止插件间 import，只经 Service+事件 | Cordis 铁律；保证任何插件可拔可换 |
| **HS10** | pre-1.0 依赖（json-render 0.21 / openui 0.3）只经适配层 | 升级破坏性变更被适配层吸收；业务代码不动 |

---

## 附 · 术语索引（跨规范统一）

| 术语 | 唯一定义处 |
|------|-----------|
| Harness | 本规范 §1 |
| GenUI 三引擎（json-render / OpenUI / RSC） | 本规范 §3 |
| 混合拓扑（chat 主链 Data Stream + RSC 专通道） | 本规范 §4.2 |
| 传输互斥律 | 本规范 §4.2 |
| page-context 上下文栈 | 本规范 §8 · 架构规范 §4.2 |
| L0 / L1 / L2 权限 | 架构规范 §5.4 · 本规范 §6 |
| 成本三重/五重闸 | 架构规范 §5.1 · 本规范 §7 |
| ResolvedTheme（含 previousResolved） | 设计规范 §1.3 |
| Theme Contract（tokens ⊕ motion ⊕ effects ⊕ genui） | 设计规范 §1.1 |
| 浮层体验契约（Overlay Contract） | 设计规范 §11 |
| DSH-Cordis 双层内核 | 架构规范 §4 |
