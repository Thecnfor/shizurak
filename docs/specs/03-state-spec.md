# 03 · 状态管理规范（State Spec）

> 项目：**shizurak**（blog.xrak.top）— 伍泽凯个人博客
> 状态：定稿候选 v1 · 2026-09-19
> 关联：[设计规范](./01-design-spec.md) · [架构规范](./02-architecture-spec.md) · [依赖规范](./04-dependency-spec.md) · [Harness 规范](./05-harness-spec.md)

---

## 1. 状态分层模型（六层）

```
┌────────────────────────────────────────────────────────────────┐
│ L1 Server State（RSC）          默认层。一切能服务端拿到的状态。    │
│ L2 URL State（nuqs）            可分享/可回退的状态。              │
│ L3 Client Global（Zustand）     跨岛共享且非 URL 的 UI 状态。      │
│ L4 Client Server-Cache（SWR）   客户端增量拉取的远端数据。          │
│ L5 Agent State（useChat + 内核） 对话流 + GenUI + 动作队列。        │
│ L6 Form State（RHF + Zod）       表单草稿与校验。                  │
└────────────────────────────────────────────────────────────────┘
```

**核心原则：状态住在它能被正确拥有的最低层。** RSC 能给的绝不进 client；URL 能表达的绝不进 store；一次组件生命周期内的绝不提升。

---

## 2. 决策树（「这个状态放哪里？」）

```
这个状态是……
├─ 服务端数据（文章/项目/配置/统计）？
│   ├─ 首屏就要 & 可缓存 → L1 RSC + use cache（默认）
│   └─ 客户端增量刷新（评论数/实时计数）→ L4 SWR
├─ 影响可分享的视图（筛选/搜索词/分页/主题分享码）？ → L2 nuqs
├─ 跨多个岛共享的 UI 状态（面板开合/命令面板/光标模式）？ → L3 Zustand
├─ 动画进度/时间线？ → 不进 React state（GSAP/motion 自管理，见 §6）
├─ Agent 对话/GenUI/动作队列？ → L5（useChat + agent-store + 内核 Service）
├─ 表单输入？ → L6 RHF（提交后才升级为 server state）
└─ 一次渲染内派生？ → 局部 useState / useMemo（React Compiler 接管记忆化）
```

---

## 3. 各层规格

### 3.1 L1 · Server State（RSC + `use cache`）

- 一切内容读取走 `src/lib/db/queries/**`（只读函数，`'use cache'` + `cacheLife` + `cacheTag`）
- 组件直接 `await`，**不经过任何 client store**
- 变更走 Server Actions（admin 表单）或 Route Handlers（ingest/agent），完成后 `revalidateTag`
- 规则：query 函数**只收可序列化参数**（string/number/plain object）；`cookies()/headers()` 必须在缓存作用域外读取后传参

### 3.2 L2 · URL State（nuqs）

| 状态 | 参数 | 页面 |
|------|------|------|
| 语言 | 路径段 `/{lang}/…`（proxy 协商；`next/root-params` 服务端直读） | 全局 |
| 搜索词 | `?q=` | /search |
| 标签筛选 | `?tag=` | /posts |
| 分页 | `?page=` | /posts |
| 主题分享码 | `?theme=void&ov=<base64url>` | 全局（layout 层解析） |
| 实验室 prompt | `?p=` | /lab |

- 全部经 `nuqs` 的 `useQueryState`（App Router 原生，SSR 兼容）；**locale 除外**——它是路径段而非查询参数，服务端经 `next/root-params` 读取，客户端经 `useParams()` 读取
- 服务端组件读 `searchParams`（`PageProps<'/search'>` 类型化）直接查询——**URL 是服务端与客户端共享状态的唯一通道**
- 规则：任何「刷新后应该保留」的视图状态必须先考虑 URL

### 3.3 L3 · Client Global（Zustand 5）—— 三个 store，禁止再增

**`theme-store`**（主题引擎运行时）：

```ts
// src/stores/theme-store.ts
interface ThemeStore {
  themeId: string                        // 当前主题 id
  mode: 'light' | 'dark' | 'system'      // 明暗模式（与主题正交）
  overrides: ThemeOverrides              // 用户微调（§1.5 设计规范）
  resolved: ResolvedTheme                // 解析产物（tokens/motion/effects/genui）
  setTheme(id: string): void             // 同步写 next-themes（唯一入口）
  setMode(mode: ThemeStore['mode']): void
  setOverride<K extends keyof ThemeOverrides>(k: K, v: ThemeOverrides[K]): void
  resetOverrides(): void
  hydrate(themeId: string, mode: ThemeStore['mode'], overrides: ThemeOverrides): void
}
// 订阅者：GSAP defaults 写入器 · 特效层 · GenUI 渲染器（theme-bridge）· CSS vars 注入器
```

- **双写 cookie**：`setTheme/setMode/setOverride` 除写 localStorage + next-themes 外，同步写 `shizurak-theme` cookie（供 **RSC 通道服务端读 `ResolvedTheme`**，见 05 §4.4）；cookie 只存 `{themeId, modeChoice, overrides}` 的紧凑序列化，不存 `resolved` 产物
- **`resolved.previousResolved`**：store 重算 `resolved` 时保留上一份，供特效层 fade-out 卸载旧层读取（设计规范 §1.3）

**`ui-shell-store`**（应用外壳）：

```ts
// src/stores/ui-shell-store.ts
interface UIShellStore {
  commandOpen: boolean                   // ⌘K 命令面板
  agentDock: { open: boolean; mode: 'floating' | 'docked' }
  navScrolled: boolean                   // 导航收缩态（滚动阈值）
  fxTier: 'high' | 'mid' | 'low'         // 设备分级结果（fx/tier.ts 写入）
  toggleCommand(): void
  setAgentDock(patch: Partial<UIShellStore['agentDock']>): void
}
```

**`agent-store`**（会话元数据——**消息本体不在这里**，在 useChat）：

```ts
// src/stores/agent-store.ts
interface AgentStore {
  threadId: string | null
  streamPhase: 'idle' | 'thinking' | 'streaming' | 'acting'
  pendingActions: PendingAction[]        // L2 待确认队列
  genuiSpecs: Map<string, GenUISpec>     // 本会话生成的 spec（渲染缓存）
  resolveAction(id: string, approved: boolean): void
  registerSpec(id: string, spec: GenUISpec): void
}
```

**规则**：新增全局状态前先证明「URL 装不下、RSC 给不了、单组件活不了」；store 用切片模式组织，actions 与 state 同文件；**禁止在 store 里放服务端数据的副本**。

### 3.4 L4 · Client Server-Cache（SWR）

仅用于「客户端需要增量刷新」的少量场景：

| 场景 | key | 刷新策略 |
|------|-----|----------|
| 评论数/最新评论（Waline API 包装） | `waline:<path>` | 30s 轮询（页面可见时） |
| 文章实时阅读数 | `views:<slug>` | 60s |
| /admin 仪表盘实时计数 | `stats:<range>` | 手动刷新 + 60s |

- 其余客户端数据获取一律：Server Action 或 AI SDK 流——**不引入第二个数据获取库**
- SWR 全局配置：`revalidateOnFocus: false`（博客场景不需要激进刷新），`keepPreviousData: true`

### 3.5 L5 · Agent State

**消息流**（AI SDK v7 `useChat`）：

```ts
const { messages, sendMessage, status, stop } = useChat({
  transport: new DefaultChatTransport({
    api: '/api/chat',
    prepareSendMessagesRequest: ({ messages, id }) => ({
      body: {
        messages, id,
        pageContext: pageContext.snapshot(),   // 内核 Service 直读
        theme: useThemeStore.getState().themeId,
        locale: localeFromParams,              // useParams() 取路径语言段（root-params 不进客户端）
      },
    }),
  }),
  onToolCall: ({ toolCall }) => actions.invoke(toolCall),   // L0/L1 前端动作直执行
  onFinish: () => { /* threads 已在服务端持久化；此处仅 OTel 上报 */ },
})
```

- `messages`（UIMessage[]）是消息的**唯一事实源**；`status` 驱动 `streamPhase`（写入 agent-store 供特效层消费）
- **工具结果 → UI 动作**：`onToolCall` 把 tool call 交给前端内核 `actions.invoke()`；L2 动作不执行，转为 `pendingActions` 确认卡
- **GenUI spec**：流内 `data-genui` part → `component-kit.render(spec)` → `agent-store.registerSpec()` 缓存
- 持久化：服务端 `thread-store` 落库（`agent_threads`/`agent_messages`）；访客侧 `threadId` 存 sessionStorage（关页即失，无账号体系）

- **RSC 专通道的状态形态（与 chat 并存但通道隔离）**：页内一键解释等走 `ai/rsc` Server Action，**不进出 `useChat` 的 `messages`**——服务端驱动、客户端近零状态（一个 Suspense + 局部岛）；产出的 RSC 组件不回写 agent-store，若用户点“保存/分享”才显式 `POST /api/genui/specs`（携 `kind:'rsc'` + `theme_id`）

**内核 Service 接入**（React 桥）：

```ts
// lib/kernel/react.tsx —— 内核 Service 的唯一 React 接入点
const ctx = await whenKernelReady()        // 竞速保护（微任务后服务才挂载）
useKernelService('actions')                // → ActionsService
useKernelService('pageContext')            // → PageContextService
// 内核状态（如 pageContext 注册表）经 useSyncExternalStore 桥接进 React
```

### 3.6 L6 · Form State（RHF + Zod）

- 仅 /admin 使用（文章编辑元数据、素材标注、设置）
- Zod schema 放 `lib/db/schema/` 旁（`posts.schema.ts`），表单校验与 DB 校验共用同一 schema
- 编辑器正文（TipTap）是**非受控领域**：TipTap 自管文档状态，仅提交时序列化为 markdown——不进 RHF

---

### 3.7 浮层与跨路由状态（React `<Activity>`）

Agent Dock / ⌘K 这类“跨页应存活”的浮层状态**不进 Zustand 也不靠 URL**，而是靠 **React 19.2 `<Activity>`** 组件级保活：

| 状态 | 归属 | 说明 |
|------|------|------|
| Dock 输入草稿 / 滚动位 / 已生成 spec | **`<Activity>`**（`display:none` 保状态 + cleanup effects） | 跨路由不 remount；开关/停靠模式写 ui-shell-store |
| Dock 开合 / 停靠模式（floating/docked） | ui-shell-store（L3） | 跨岛共享且非 URL |
| ⌘K 开关 | ui-shell-store（`commandOpen`） | 同上 |

**原则**：能从 `<Activity>` 自然获得的 UI 存活状态，**不要往 store里塞**（避免手轮同步逻辑）；只把“其他组件需要读”的开关态进 store。浮层层级与行为见设计规范 §11。

---

## 4. 主题状态：双轨制细则

```
                     单一事实源
theme-store（Zustand）────────────┐
  │ setTheme()                    │ 订阅
  ├─▶ next-themes.setTheme()      ├─▶ GSAP defaults 更新
  │     └─▶ <html data-theme>     ├─▶ 特效层换装（异步）
  │           └─▶ CSS variables   ├─▶ GenUI 渲染器换肤（原地）
  └─▶ resolved 重算（纯函数）      └─▶ shiki 代码主题（CSS 变量，自动）
```

- **组件永远不直接调 next-themes**；`theme-store.setTheme()` 是唯一入口（含 next-themes 同步）
- SSR：next-themes 内联脚本先写 `data-theme` + `data-mode`（无闪烁）；客户端 hydration 后 `theme-store.hydrate()` 从 URL/localStorage 还原 overrides
- 模式（明暗）与主题（人格）正交：`setTheme(id)` 管主题；模式切换走 next-themes 的 `setTheme(mode)`（store 暴露 `setMode()` 包装），双模主题（lumen）才有意义
- 主题切换是**幂等事务**：先算 `resolved`，再一次性广播；特效层换装有独立超时（400ms 强制完成）

---

## 5. GenUI 状态

- **json-render**：`<StateProvider initialState={spec.state}>` 持有 spec 内部状态（筛选/选中）；`$state` 绑定实现数据联动；**spec 状态不提升到 agent-store**（隔离，多个 spec 互不干扰）
- **OpenUI**：渲染器自管解析状态；完成后的最终 spec 落 `agent-store.genuiSpecs`
- **RSC**：无客户端 spec 状态（服务端已渲染）；需交互的部分降级为 json-render（[05 §4.6](./05-harness-spec.md)）
- **持久化**：有价值的 spec → `POST /api/genui/specs` → `specs.save()` → 分享页 `/lab/s/[id]`（RSC 直读，`use cache`）
- **主题切换时**：spec 不动（语义数据），仅渲染器换肤（theme-bridge 广播触发重渲染，motion layout 过渡）——仅 Data Stream 通道；RSC 通道重渲染（见 §3.5 / 05 §4.4）

---

## 6. 动效状态（铁律 L1 的落地细则）

| 状态类型 | 归属 | React 如何感知 |
|----------|------|----------------|
| GSAP timeline 进度 | GSAP 内部 | 不需要（除非 UI 显示进度条 → `useSyncExternalStore` 订阅 GSAP ticker） |
| ScrollTrigger 状态（如 pinned 章节） | GSAP | 组件通过 `data-*` 属性 + CSS 响应，不进 state |
| motion 组件状态（AnimatePresence 等） | motion | motion 自管；布局动画靠 `layout` prop |
| 需要渲染进 DOM 的动画值（数字滚动） | `@number-flow/react` | 组件内部自管 |
| 主题动效参数 | theme-store.resolved.motion | 订阅 store（低频，主题切换才变） |

**禁止**：`requestAnimationFrame` 里 `setState`；用 `useEffect` 手动订阅 GSAP 动画进度写入 state；把 easing/duration 写成组件 props 传递（一律从主题取）。

---

## 7. 持久化策略

| 状态 | 载体 | 生命周期 |
|------|------|----------|
| 主题选择 + overrides | localStorage（`shizurak:theme`） | 永久（可 URL 覆盖） |
| 访客 threadId | sessionStorage | 关页即失 |
| agent 对话（访客） | PG `agent_threads`（visitor_hash 归并） | 90 天 TTL（定时清理） |
| GenUI spec（分享的） | PG `genui_specs` | 永久（未分享的 30 天 TTL） |
| 草稿/表单 | 不入 localStorage | RHF 内存 + 显式保存 |
| 特效强度等微调 | localStorage（并入 theme overrides） | 永久 |

---

## 8. 反模式清单（Code Review 必查）

| ❌ 反模式 | ✅ 正确做法 |
|-----------|------------|
| `useEffect(() => { fetch('/api/posts') }, [])` 拉文章 | RSC 直读 + `use cache` |
| 筛选状态放 Zustand | nuqs URL 参数 |
| `useState` 存 GSAP timeline 进度 | GSAP 自管理 / `useSyncExternalStore` |
| store 里放 `messages` 副本 | useChat 是消息唯一源 |
| 组件直接 `import { setTheme } from 'next-themes'` | `theme-store.setTheme()` 唯一入口 |
| duration/easing 硬编码 | 从 `resolved.motion` 取 |
| 主题切换后手动刷新页面 | theme-bridge 广播原地换装 |
| 把整个 post 对象塞进 client store | RSC 传 props / URL 存 id |
| 内核插件间 `import` 互调 | 只经 Service / 事件（Cordis 铁律） |
| SWR 拉取本可 RSC 的数据 | 删掉 SWR 调用，改 RSC |
