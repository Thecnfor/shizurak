# 02 · 架构规范（Architecture Spec）

> 项目：**shizurak**（blog.xrak.top）— 伍泽凯个人博客
> 状态：定稿候选 v1 · 2026-09-19
> 关联：[设计规范](./01-design-spec.md) · [状态管理规范](./03-state-spec.md) · [依赖规范](./04-dependency-spec.md)

---

## 1. 架构总览

```
┌─────────────────────────────────────────────────────────────────────────┐
│  blog.xrak.top — Next.js 16.3.5 (App Router · React Compiler · Cache Components) │
│                                                                          │
│  ┌─────────────────────────── 前端（浏览器） ──────────────────────────┐  │
│  │  主题引擎                    │  前端内核（Cordis · 'use client'）    │  │
│  │  tokens→CSS vars             │  ui-actions（L0/L1/L2 动作注册表）    │  │
│  │  motion→GSAP/motion 广播     │  page-context（页面即上下文）         │  │
│  │  effects→动态分包特效层      │  component-kit（GenUI 组件目录）      │  │
│  │  genui→皮肤变体              │  theme-bridge（GenUI 随主题换肤）     │  │
│  └──────────────────────────────┴──────────────────────────────────────┘  │
│  ┌─────────────────────────── 服务端（Node） ──────────────────────────┐  │
│  │  后端内核（Cordis 同构）     │  内容管线                              │  │
│  │  model-adapter → LiteLLM    │  Agent-CMS（/admin）                  │  │
│  │  tool-registry（领域+MCP）   │  MDX 编译（发布时）                    │  │
│  │  mastra-engine（工作流）     │  素材摄取（rak-core → materials）      │  │
│  │  content-agent（作者侧）     │  搜索（FTS → 语义）                    │  │
│  │  spec-store（GenUI 持久化）  │  埋点（自研 events）                   │  │
│  └──────────────────────────────┴──────────────────────────────────────┘  │
└────────────┬──────────────────┬─────────────────┬────────────────────────┘
             ▼                  ▼                 ▼
     CNPG PostgreSQL        MinIO (blog 桶)    LiteLLM 网关（集群）
     blog 库 + pgvector     媒体资源            模型路由 + 预算闸
     （posts/materials/
      genui_specs/events/
      agent_threads/auth）
             │
             ▼
     Redis（db · `blog:` 前缀）：限流 / 会话缓存 / 计数缓冲
```

**写作流（vault → CMS）**：

```
Obsidian（本地设备）──LiveSync──▶ CouchDB（sync.app.xrak.top/obsidian）
    │                                   │
    │（你在 blog/ 文件夹写作）            │（headless 客户端 30s 轮询）
    ▼                                   ▼
vault 内 blog/ 文件夹            rak-core /home/xrak/wiki（明文副本）
                                        │
                                        │ ingest 管线（只读扫描 + 推送）
                                        ▼
                              POST /api/ingest ──▶ materials 表（素材库）
                                        │
                                        │ content-agent 工作流（Mastra）
                                        ▼
                              drafts（草稿）──▶ 你审核（diff 视图）──▶ 发布
```

> **铁律**：博客对 CouchDB 与 vault **只读**；绝不对 LiveSync 库执行任何写操作（同步状态污染 = 全设备灾难）。ingest 只消费 rak-core 的明文副本。

---

## 2. Next.js 16.3.5 版本约定（本版本特有，务必遵守）

| 事项 | 约定 | 说明 |
|------|------|------|
| **middleware → proxy** | 使用 `src/proxy.ts`（如确需）；**认证不用 proxy** | 本版本官方立场：proxy 是最后手段。鉴权走 RSC/layout 层 `auth.api.getSession()`（见 §8） |
| **Cache Components** | `next.config.ts` 设 `cacheComponents: true` | 统一开启 PPR + `use cache` + dynamicIO；`experimental.ppr` 已移除 |
| **`use cache`** | 数据读取函数一律 `'use cache'` + `cacheLife()` + `cacheTag()` | 缓存键 = buildID + 函数签名 + 序列化参数；参数与返回值必须可序列化（无类实例/函数） |
| **`revalidateTag`** | 发布/更新内容时精确失效 | 标签规范：`post:<slug>` · `posts` · `materials` · `site-stats` |
| **类型助手** | 页面用 `PageProps<'/posts/[slug]'>`，布局用 `LayoutProps<'/'>` | 全局可用，无需 import（类型生成后） |
| **React Compiler** | `reactCompiler: true`（已启用） | 不手写 `useMemo/useCallback`（编译器接管）；仅在编译器无法处理的边界（如 GSAP 命令式代码）用 ref |
| **React 19.2** | `<Activity>` 用于导航状态保留 | Cache Components 下 Next 自动使用；勿手动干预 |
| **路由处理器** | `app/api/**/route.ts` | AI 流式、ingest、events、auth 均走 route handler |
| **动态 API** | `cookies()` / `headers()` 在 `use cache` 外读取，传参进缓存作用域 | 官方推荐模式；admin 页面为动态（no-store） |

**Route Segment 策略**：`/admin/**` 显式 `export const dynamic = 'force-dynamic'`；公开页面全部走 `use cache` + PPR 静态壳。

---

## 3. 目录结构

```
shizurak/
├── docs/specs/                    # 四份规范（本目录）
├── public/
├── scripts/
│   ├── ingest.ts                  # 素材摄取 CLI（本机/rak-core 运行）
│   ├── export-content.ts          # 内容逃生舱：全量 markdown 导出
│   └── theme-check.ts             # 主题契约校验（CI）
├── src/
│   ├── app/
│   │   ├── (site)/                # 公开站点（共享站点布局）
│   │   │   ├── layout.tsx         # 站点壳：导航 + Agent Dock + 特效层挂载点
│   │   │   ├── page.tsx           # 首页（发射序列）
│   │   │   ├── posts/
│   │   │   │   ├── page.tsx       # 文章列表
│   │   │   │   └── [slug]/page.tsx
│   │   │   ├── projects/page.tsx
│   │   │   ├── about/page.tsx
│   │   │   ├── lab/page.tsx       # GenUI playground
│   │   │   └── search/page.tsx
│   │   ├── (admin)/
│   │   │   └── admin/
│   │   │       ├── layout.tsx     # 鉴权 + 管理台壳（force-dynamic）
│   │   │       ├── page.tsx       # 仪表盘
│   │   │       ├── posts/         # 文章管理 + 编辑器
│   │   │       ├── materials/     # 素材库
│   │   │       └── agent/         # 作者侧 agent 工作台
│   │   ├── api/
│   │   │   ├── auth/[...all]/route.ts    # better-auth handler
│   │   │   ├── chat/route.ts             # 访客 agent 流式端点
│   │   │   ├── genui/specs/route.ts      # GenUI spec 持久化/分享
│   │   │   ├── ingest/route.ts           # 素材摄取（token 鉴权）
│   │   │   ├── events/route.ts           # 埋点收集（beacon）
│   │   │   ├── search/route.ts           # 搜索（FTS/语义）
│   │   │   └── admin/agent/route.ts      # 作者侧 agent 流式端点
│   │   ├── rss.xml/route.ts
│   │   ├── sitemap.ts
│   │   ├── robots.ts
│   │   ├── opengraph-image.tsx    # 默认 OG 模板
│   │   ├── layout.tsx             # 根布局：字体 + ThemeProvider + KernelProvider
│   │   └── globals.css
│   ├── kernel/                    # ── 后端内核（Cordis，同构 vendor）──
│   │   ├── vendor/                # Cordis 4.0（Koishi 内核，MIT，自 cross-dashboard 复用）
│   │   │   ├── cordis/
│   │   │   ├── cosmokit/
│   │   │   └── standard-schema/
│   │   ├── plugins/
│   │   │   ├── model-adapter.ts   # → ai.models
│   │   │   ├── tool-registry.ts   # → ai.tools
│   │   │   ├── mastra-engine.ts   # → workflows
│   │   │   ├── content-agent.ts   # → content
│   │   │   ├── spec-store.ts      # → specs
│   │   │   └── thread-store.ts    # → threads（会话持久化）
│   │   ├── index.ts               # getKernel()（globalThis 单例 + KERNEL_VERSION）
│   │   └── selftest.ts
│   ├── lib/
│   │   ├── kernel/                # ── 前端内核（'use client'，复用同构 vendor）──
│   │   │   ├── plugins/
│   │   │   │   ├── ui-actions.ts     # → actions
│   │   │   │   ├── page-context.ts   # → pageContext
│   │   │   │   ├── component-kit.ts  # → genui
│   │   │   │   └── theme-bridge.ts   # → themeBridge
│   │   │   ├── index.ts           # getClientKernel() + whenKernelReady()
│   │   │   └── react.tsx          # KernelProvider / useKernelService hooks
│   │   ├── themes/                # （见 01-design-spec §1.3；此处仅引擎）
│   │   │   ├── resolve.ts         # ResolvedTheme 纯函数
│   │   │   └── css.ts             # tokens → CSS variables 注入
│   │   ├── motion/                # gsap.ts（注册+defaults）· reduced.ts · hooks.ts
│   │   ├── fx/                    # tier.ts（设备分级）· registry.ts（特效注册）
│   │   ├── content/               # markdown/mdx 编译 · shiki · katex · mermaid · toc
│   │   ├── db/                    # drizzle schema + queries（仅 server 可 import）
│   │   │   ├── schema/            # posts.ts / materials.ts / genui.ts / events.ts / auth.ts
│   │   │   ├── client.ts          # postgres.js + drizzle 实例
│   │   │   └── queries/
│   │   ├── auth/                  # better-auth 配置 + 会话工具
│   │   ├── search/                # fts.ts（v1）· semantic.ts（v2 预留）
│   │   ├── analytics/             # 埋点服务端收集 + 查询（供 agent 工具）
│   │   └── server/                # 仅服务端工具（minio.ts / redis.ts / litellm.ts）
│   ├── components/
│   │   ├── ui/                    # shadcn 基座（复制自持，禁止整体升级覆盖）
│   │   ├── fx/                    # 特效组件（Nebula / Starfield / HudGrid / Reticle...）
│   │   ├── genui/                 # catalog.ts（Zod）· registry-hud/ · registry-clean/ · Renderer 封装
│   │   ├── site/                  # nav / footer / post-card / toc / comments(Waline)...
│   │   └── admin/                 # 编辑器 / diff 审核 / 素材列表...
│   ├── themes/                    # void/ · lumen/ · reserved/ · contract.ts · registry.ts
│   ├── stores/                    # zustand：theme-store / ui-shell-store / agent-store
│   └── proxy.ts                   # （预留：仅静态重定向等最后手段；当前无）
├── next.config.ts                 # cacheComponents: true · reactCompiler: true
└── package.json
```

**边界规则**（Biome 自定义规则强制）：
- `components/**` 禁止 import `lib/db/**`、`lib/server/**`（对应 FlowMind ADR-010 纪律）
- `lib/kernel/plugins/**`（前端）禁止 import `src/kernel/**`（除 vendor）
- 内核插件之间**禁止互相 import**——只经 Service 与事件通信（Cordis 铁律）
- `themes/**` 禁止 import `components/**`（主题只声明，不实现页面）

---

## 4. DSH-Cordis 双层内核

同构微内核，vendor 自 cross-dashboard（Koishi Cordis 4.0，MIT），理念照搬：**内核只做三件事**——插件生命周期（含可逆副作用 disposers）、声明式依赖注入（`inject` 拓扑序启动）、全局事件总线 + Service。**零 Agent 业务逻辑进内核**。

### 4.1 后端内核（`src/kernel`）

启动模式复用 cross-dashboard 的 `globalThis` 单例 + `KERNEL_VERSION` 守卫（dev HMR 安全）：

```ts
const KERNEL_VERSION = 1   // 插件集变更时 +1
export function getKernel(): Promise<Context>   // async：await 插件 fiber 确保服务就绪
```

| 插件 | 提供 Service | 职责 | 关键依赖 |
|------|--------------|------|----------|
| `model-adapter` | `ai.models` | 模型注册表：chat / embedding / title 模型；经 AI SDK v7 `createOpenAICompatible` 指向 **LiteLLM 网关**；暴露 token 计量回调 | env: `LITELLM_BASE_URL` / `LITELLM_KEY`（虚拟 key + 预算） |
| `tool-registry` | `ai.tools` | 领域工具注册（含权限级别 L0/L1/L2 元数据）；MCP 客户端（Later：blog-as-MCP 反向暴露）；工具执行统一入口（审计 + 计量） | db queries · search |
| `mastra-engine` | `workflows` | Mastra 工作流注册与执行：`content-pipeline`（素材→草稿）· `ingest-pipeline`（摄取清洗）· `index-pipeline`（嵌入索引）· `translate-pipeline`（i18n 预留） | Mastra · model-adapter |
| `content-agent` | `content` | 作者侧能力：`materialToDraft()` · `suggestReplies(comments)` · `summarize()` · `seoMeta()` · 维护任务 | workflows · ai.models |
| `spec-store` | `specs` | GenUI spec 持久化与分享（`genui_specs` 表）：`save()` / `load(id)` / `share(spec)` | db |
| `thread-store` | `threads` | 会话持久化（`agent_threads` / `agent_messages`）：`append()` / `history(threadId)` / 访客哈希归并 | db |

**领域工具清单**（`tool-registry` 注册，级别标注权限模型 §5.4）：

| 工具 | 级别 | 说明 |
|------|:----:|------|
| `searchPosts` | L0 | 全文/语义检索文章 |
| `getPost` | L0 | 读取文章（含正文） |
| `listProjects` | L0 | 项目档案 |
| `getAwards` | L0 | 奖项数据（公开素材） |
| `getSiteStats` | L0 | 站点统计（文章数/访问趋势——读自研埋点） |
| `getReadingStats` | L0 | 单篇阅读数据 |
| `navigateTo` | L1 | 页面导航（前端 ui-action 代理） |
| `setTheme` | L1 | 切换主题/个性化（前端 ui-action 代理） |
| `filterPosts` | L1 | 列表筛选（前端 ui-action 代理） |
| `generateUI` | L1 | 显式触发 GenUI 生成（json-render / OpenUI 路由） |
| `subscribeUpdates` | L2 | 订阅更新（需确认） |
| `contactAuthor` | L2 | 给作者发消息（需确认） |

### 4.2 前端内核（`lib/kernel`）

| 插件 | 提供 Service | 职责 |
|------|--------------|------|
| `ui-actions` | `actions` | UI 动作注册表：`register(action)` / `invoke(id, params)` / `list()`；动作带级别（L0 只读 / L1 本地可逆 / L2 需确认）；L2 动作进入 `agent-store.pendingActions` 等待确认卡 |
| `page-context` | `pageContext` | 页面注册上下文 Provider（文章页注册 `{type:'post', id, title, tags, excerpt}`；项目页注册项目档案）；序列化注入每次 chat 请求 |
| `component-kit` | `genui` | GenUI 运行时：json-render catalog registry（按主题解析 hud/clean 变体）+ OpenUI 组件库注册；`render(spec)` 统一入口 |
| `theme-bridge` | `themeBridge` | 订阅 theme-store；主题切换时通知 GenUI 渲染器原地换装；提供 `currentVariant()` |

前端内核同样 `globalThis` 单例 + `whenKernelReady()` 竞速保护（照搬 cross-dashboard 模式）。

### 4.3 与 FlowMind（cross-dashboard）的差异

| 维度 | FlowMind | 博客 | 原因 |
|------|----------|------|------|
| 内核定位 | 业务 Agent 内核（工作台） | 体验 Agent 内核（阅读伴侣 + 作者工具） | 场景不同 |
| 新增插件 | — | `theme-bridge`（前端）· `thread-store`（后端） | GenUI 换肤 + 访客会话持久化 |
| MCP 方向 | 客户端（调外部技能） | 客户端 + **反向服务端**（Later：blog-as-MCP） | 博客对外输出知识 |
| 权限模型 | L0/L1/L2（业务动作） | 继承 + 前端动作细化 | 同一套心智 |

---

## 5. Agent Harness

### 5.1 访客侧链路（流式）

```
浏览器                          服务端（/api/chat route handler）
──────                          ────────────────────────────────
useChat (DefaultChatTransport)
  │ POST { messages, threadId, pageContext, theme }
  ├─────────────────────────────▶ 1. Redis 限流（令牌桶：IP 哈希 + 全局）
                                 2. threads.append(user message)
                                 3. kernel: ai.tools 组装（L0/L1/L2 元数据）
                                 4. streamText({
                                      model: ai.models.chat(),
                                      system: buildSystemPrompt(pageContext, catalog),
                                      tools, toolApproval,          ← v7：审批在调用点
                                      stopWhen: stepCountIs(12)     ← 成本闸：MAX_AGENT_STEPS
                                    })
                                 5. toUIMessageStreamResponse() ──▶ SSE
  ◀──────────────────────────────┘
  ├─ 文本流 → 消息气泡（主题化流式显现）
  ├─ tool call: L0/L1 → 前端内核直接执行（ui-actions）
  │              L2 → 确认卡（pendingActions）→ 用户批准 → 执行一次
  ├─ tool: generateUI → GenUI 管线（§5.2）
  └─ 完成 → threads.append(assistant) + token 计量上报（OTel）
```

**限流与成本闸**（公开 agent 的安全底线，三重）：
1. **Redis 令牌桶**：单 IP 10 req/min、30 req/h；全局 500 req/h（`blog:` 前缀）
2. **LiteLLM 虚拟 key 预算**：月预算上限，超限自动熔断（网关侧强制）
3. **`stopWhen: stepCountIs(12)`**：单次对话最多 12 步工具循环（对齐 FlowMind `MAX_AGENT_STEPS`）

### 5.2 GenUI 双引擎管线

```
用户意图 ──▶ 内核路由（generateUI 工具 / 系统提示决策）
              │
    ┌─────────┴──────────┐
    ▼                    ▼
json-render 链路        OpenUI 链路
（数据仪表）            （即兴画布）
    │                    │
系统提示内嵌 catalog   系统提示 = 从组件库生成（prompt generation）
（Zod schema 序列化）        │
    │                    │
LLM 输出 JSON spec     LLM 流式输出 OpenUI Lang
（JSONL patch 流）          │
    │                    │
@json-render/react     @openuidev/react-lang
Renderer + StateProvider   Renderer（渐进解析）
    │                    │
    └─────────┬──────────┘
              ▼
    component-kit.render(spec)
    → theme-bridge 解析皮肤变体（hud/clean）
    → 流式显现（theme.genui.streamReveal）
```

**路由决策规则**（写入系统提示）：
- 涉及**站点真实数据**（文章/项目/奖项/统计）→ **必须 json-render**（工具取数 → 绑定 `$state`，schema 校验保证不出错）
- 涉及**解释/探索/即兴**（对比、演示、可视化创意）→ **OpenUI**（token 效率 + 流式体验）
- 两者可混排（对话中先文本、再 json-render 数据卡、再 OpenUI 探索块）

**spec 持久化**：有价值的 GenUI 产物经 `specs.save()` 落库，可生成分享页 `/lab/s/[id]`（`specs.share()`）——「三层动态产物」的博客版（一次性回答 → 可分享页面）。

### 5.3 作者侧链路

```
/admin/agent（工作台）                    Mastra 工作流（kernel.workflows）
─────────────────                        ──────────────────────────────
选择素材 → 「生成草稿」 ──────────────▶ content-pipeline:
                                          1. ingest-clean：素材清洗（去隐私、规范化）
                                          2. outline：大纲（模型：主力 chat 模型）
                                          3. draft：分段生成（流式回显到工作台）
                                          4. enrich：配图 prompt + SEO meta + 标签建议
                                          5. checkpoint：落 posts(status=draft) + revisions
                                        ──▶ 工作台 diff 审核（逐段采纳/拒绝）
                                        ──▶ 发布（revalidateTag）
维护任务（对话式）：
  「总结本周评论」→ suggestReplies（读 Waline API → 摘要 + 回复草稿）
  「翻译这篇」  → translate-pipeline（i18n 预留）
  「检查失效链接」→ 链接巡检（route handler + fetch HEAD）
```

### 5.4 权限模型（继承 FlowMind，AI SDK v7 `toolApproval` 映射）

| 级别 | 定义 | 执行策略 | v7 实现 |
|:----:|------|----------|---------|
| L0 | 只读/建议 | 自动执行 | 默认（无 approval） |
| L1 | 本地可逆（导航/筛选/主题/生成 UI） | 自动执行到「本地状态」 | 默认（前端 ui-actions 保证可逆） |
| L2 | 对外/不可逆（订阅/发消息/发布） | **挂起 → 确认卡 → 批准才执行一次** | `toolApproval: { subscribeUpdates: async () => 'user-approval' }` |

红线：**访客侧 agent 永远没有 L2 以上的能力**（无 DB 写、无发布、无删除）；作者侧 agent 的发布动作同样走确认。

---

## 6. 内容管线

### 6.1 数据模型（PG `blog` 库，Drizzle）

遵循生态列规范：`uuid v7` 主键（应用层生成）· `created_at/updated_at timestamptz(6)` · `deleted_at` 软删 · 归属列（`author_id`）。

```
posts              id · slug(uniq) · title · summary · content_md · content_html(编译产物)
                   status(draft|review|published|archived) · type(post|project|note)
                   locale('zh'|'en') · cover_media_id · ai_involvement(human|assisted|generated)
                   published_at · reading_time · search_vector(tsvector) · embedding(vector 1024, v2)
                   author_id · created_at · updated_at · deleted_at
post_revisions     id · post_id · content_md · editor(human|agent:<model>) · note · created_at
materials          id · source(vault|manual|agent) · source_path · raw_md · status(new|linked|used|discarded)
                   tags(text[]) · created_at
tags / post_tags   标准多对多
media              id · minio_key · mime · width · height · size · blurhash · alt · created_at
genui_specs        id · kind(json-render|openui) · spec(jsonb) · source(visitor|author) · thread_id
                   · shared(bool) · created_at · expires_at
agent_threads      id · kind(visitor|author) · visitor_hash · title · created_at
agent_messages     id · thread_id · role · parts(jsonb) · model · tokens_in · tokens_out · created_at
events             id · name · path · post_id · visitor_hash · referrer · props(jsonb) · created_at
settings           key(PK) · value(jsonb)          # 站点配置 KV
（better-auth 生成：user / session / account / verification / passkey）
（Waline 独立 schema：waline）
```

**索引**：`posts(slug)` 唯一 · `posts(status, published_at desc)` · `posts.search_vector` GIN · `events(name, created_at)` · `events(post_id, created_at)` · `agent_messages(thread_id, created_at)`。

### 6.2 MDX 编译策略

- 存储：`content_md`（Markdown + MDX 扩展语法，作者独占可信来源——**仅作者可写，无访客输入进编译**，安全边界清晰）
- **发布时编译**（content-pipeline 末步）：unified 管线 `remark-gfm → remark-math → rehype-katex → shiki 双主题 → rehype-slug → toc 提取` → 产物存 `content_html` + `toc(jsonb)`
- 运行时零编译开销；`use cache` + `cacheTag('post:<slug>')` 直接读编译产物
- 交互式 MDX 组件（`<Demo>` 等）例外：保留 RSC 运行时渲染（组件白名单固定，不经 DB）
- Shiki 双主题：`themes: { light: 'github-light', dark: 'github-dark' }` + CSS variables，跟随站点主题切换零重渲染

### 6.3 素材摄取（ingest）

```
rak-core /home/xrak/wiki/blog/          本机或 rak-core 定时运行 scripts/ingest.ts
├── idea-*.md         （灵感碎片）  ──▶ 扫描（mtime 增量）→ 过滤 frontmatter
├── draft-*.md        （半成品）        `blog_public: true` 白名单
└── ref-*.md          （资料摘录）  ──▶ POST /api/ingest（Bearer token）
                                           └─▶ materials 表（去重：source_path + hash）
```

- **只读 vault 副本**；`blog_public: true` frontmatter 是唯一准入标记（防隐私泄漏的双保险之一）
- 摄取内容视为**不可信输入**（作者随手写的含隐私内容）——ingest-pipeline 强制隐私扫描（银行卡号/密码形态/`我.md` 类引用），命中即隔离待人工处理
- 触发：cron（每 30min）或手动 `pnpm ingest`；rak-core 与博客同集群时优先服务器侧运行

### 6.4 i18n 预留（中文优先）

- 数据层：`posts.locale` + 唯一约束 `(slug, locale)`；翻译是同 slug 的另一 locale 行，`translate-pipeline` 生成
- 路由层：v1 单语（`/posts/[slug]`）；v2 启用 next-intl 时迁移为 `/[locale]/posts/[slug]`（默认 locale 不前缀）
- UI 层：文案集中 `src/i18n/zh.ts`（v1 单文件），结构即未来 messages 目录形状
- **不在 v1 引入 next-intl 运行时**——只保留架构位（依赖规范中列为 reserved）

---

## 7. 搜索架构

| 阶段 | 方案 | 说明 |
|------|------|------|
| **v1（发布即有）** | PG 全文检索（BM25） | ParadeDB `pg_search` 扩展（CNPG 自定义镜像，tantivy 中文分词）为首选；不可行则 `zhparser`；兜底 `pg_trgm`。`/api/search` + `/search` 页面（nuqs URL 状态） |
| **v2（agent 上线后）** | pgvector 语义检索 | `index-pipeline` 工作流批量嵌入（LiteLLM embedding 模型，1024 维）；agent 工具 `searchPosts` 升级为混合检索（BM25 + 向量 RRF 融合） |

两条链共用 `lib/search/` 接口：`search(query, { mode: 'fts' | 'semantic' | 'hybrid' })`。

---

## 8. 认证架构（better-auth 1.7 + Passkey）

```
lib/auth/index.ts
  betterAuth({
    database: drizzleAdapter(db, { provider: 'pg' }),
    plugins: [passkey()],                    // @better-auth/passkey
    session: { expiresIn: 30d, cookieCache: enabled },
    // 单作者：注册关闭（disableSignUp），首个用户 CLI 初始化
  })

app/api/auth/[...all]/route.ts
  export const { POST, GET } = toNextJsHandler(auth)

app/(admin)/admin/layout.tsx（鉴权唯一入口，不用 proxy）
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/admin/sign-in')
```

- 登录方式：**Passkey 主**（Face ID / 指纹 / 安全密钥）+ TOTP 备用恢复；注册通道关闭（单用户）
- 会话：`cookieCache` 减少 DB 往返；`BETTER_AUTH_SECRET` 走 K8s Secret
- 预留：后续接 Authentik OIDC（better-auth 的 OIDC provider 能力）统一集群 SSO
- 公开写接口的独立鉴权：`/api/ingest` 用 Bearer token（`INGEST_TOKEN`，rak-core 侧持有）；`/api/events` 用限流 + 来源校验（无鉴权，公开埋点）

---

## 9. 评论架构（Waline 自托管 + Agent 增强）

- **部署**：Waline Server 独立小 Deployment（`waline/waline` 镜像），存储用同一 PG 集群（`waline` schema）；`@waline/client` 嵌入文章页（主题化 CSS variables 对齐主题契约）
- **反垃圾**：Waline 内置（Akismet 可选）+ 访客评论强制审核（单作者博客，审核队列在 /admin）
- **Agent 增强**（作者侧）：`suggestReplies` 工作流经 Waline API 拉取待审评论 → 摘要 + 回复草稿 → 工作台一键采纳/修改后提交
- 通知：新评论 → ntfy 推送到作者设备

---

## 10. 统计架构（自研轻量埋点）

```
访客浏览器                          服务端                       消费方
─────────                          ──────                       ──────
sendBeacon('/api/events') ──▶ 限流 → 清洗（去 PII）
  { name: 'pageview',              → Redis 缓冲（计数合并）
    path, postId,                  → 批量落库 events 表（每 30s flush）
    referrer,                      → 实时计数（Redis 直读）
    visitorHash }                        │
                                         ├─▶ /admin 仪表盘（MetricGrid + MiniChart）
                                         └─▶ agent 工具 getSiteStats / getReadingStats
```

- `visitorHash` = `sha256(ip + ua + salt(日轮换))`——去标识化，不可反查
- 事件类型：`pageview` · `read_complete`（滚动 90%）· `agent_chat` · `theme_switch` · `genui_render` · `outbound_click`
- 数据主权：全在自有 PG；agent 可直接查询（「这周哪篇最热」→ 真实数据的 GenUI 图表卡）

---

## 11. 渲染与缓存策略

| 路由 | 渲染 | 缓存策略 | 失效触发 |
|------|------|----------|----------|
| `/` | RSC + 特效 client islands | `use cache` + `cacheLife('hours')` + `cacheTag('posts','site-stats')` | 发布/统计变更 |
| `/posts` | RSC | `use cache` + `cacheTag('posts')` | 发布 |
| `/posts/[slug]` | RSC（预编译 HTML 注入） | `use cache` + `cacheLife('max')` + `cacheTag('post:<slug>')` | 该文更新 |
| `/projects` `/about` | RSC | `use cache` + `cacheLife('days')` | 手动 revalidate |
| `/lab` `/lab/s/[id]` | RSC + client GenUI | `/lab` 静态；分享页 `use cache` + `cacheTag('spec:<id>')` | spec 创建即失效 |
| `/search` | RSC + client 交互 | 页面静态壳；结果走 `/api/search`（dynamic + Redis 短缓存 60s） | — |
| `/api/chat` | Route Handler（SSE 流） | dynamic，no-store | — |
| `/admin/**` | RSC dynamic | `force-dynamic`，no-store | — |
| `/rss.xml` `/sitemap.xml` | Route Handler | `use cache` + `cacheTag('posts')` | 发布 |
| `/opengraph-image` | ImageResponse | `use cache` + `cacheTag('post:<slug>')` | 该文更新 |

**发布动作的事务性**：`posts` 更新 → 编译产物写入 → `revalidateTag('post:<slug>', 'posts')` → RSS/sitemap/OG 同步失效。失败回滚走 revisions。

---

## 12. 部署拓扑（Rak 集群 · ArgoCD）

```
GitHub (Thecnfor/shizurak, main)
  │  push
  ▼
GitLab 镜像仓库（core-ui/shizurak）
  │  CI: biome check → tsc → vitest → playwright → kaniko build
  ▼
Harbor（harbor.app.xrak.top/core-ui/shizurak:<sha>）
  │  CI 末步：bump argocd-apps 镜像 tag（GitOps 唯一写入口）
  ▼
ArgoCD（金丝雀：analysis 门自动回滚）
  ▼
k3s 集群
├── Deployment: shizurak-web（2×512Mi–1Gi，Next standalone 镜像，ROLE=web）
├── Service + IngressRoute（Traefik）: blog.xrak.top（cert-manager TLS）
├── Deployment: waline（1×256Mi，独立）
└── 依赖（复用集群既有）：
    ├── CNPG PostgreSQL → blog 库（role: blog_app）+ waline schema
    ├── Redis → db N（key 前缀 blog:）
    ├── MinIO → blog 桶（媒体）
    └── LiteLLM → 虚拟 key（月度预算闸）
```

- **镜像**：单 Dockerfile（Next standalone 输出）；`ROLE=web`（v1 单角色；Mastra 工作流在 web 进程内跑，后续需要可拆 worker 角色）
- **Secrets**（Vaultwarden → K8s Secret）：`DATABASE_URL` · `REDIS_URL` · `MINIO_*` · `LITELLM_KEY` · `BETTER_AUTH_SECRET` · `INGEST_TOKEN` · `WALINE_*`
- **观测**：OTel SDK → 集群 OTLP（Tempo 链路 / Loki 日志 / Prometheus 指标）；Grafana 看板：agent token 用量、首 token 延迟、限流命中、GenUI 渲染耗时
- **备份**：blog 库纳入既有 db-backup（CNPG）；MinIO blog 桶纳入 Velero 范围；**内容逃生舱** `scripts/export-content.ts` 全量导出 markdown（每月手动跑一次归档到 vault）
- **健康检查**：`/api/health`（DB/Redis/LiteLLM 连通性 + 版本），供 K8s probe 与 Uptime-Kuma

---

## 附：架构决策记录（ADR 摘要）

| # | 决策 | 理由 |
|---|------|------|
| A1 | 内容 SSOT 在 PG，不直连 CouchDB/vault | LiveSync 库是同步状态机（eden 分块私有格式），读写皆险；rak-core 明文副本是最稳集成点 |
| A2 | 内建 Agent-CMS 而非 git-MDX | 「Agent 管线优先」要求结构化的素材→草稿→审核→发布状态机；Git 无法表达审核工作流 |
| A3 | 复用 cross-dashboard 的 Cordis vendor | 已生产验证的心智模型；同构双层（服务端/浏览器）一套心智；MIT 可 vendor |
| A4 | json-render + OpenUI 双引擎而非二选一 | 确定性（数据）与生成性（探索）是两种任务，工具应对应任务而非统一 |
| A5 | 鉴权走 RSC 而非 proxy | Next 16 官方立场：proxy 是最后手段；`getSession` 在 layout 层天然正确且可测 |
| A6 | 发布时编译 MDX 而非运行时 | 运行时零编译开销；`use cache` 直接读产物；编译失败的反馈在发布时而非访客侧 |
| A7 | 自研埋点而非 Umami | 数据直接进 agent 工具链（GenUI 数据卡）；~百行成本换取零集成摩擦 |
| A8 | 限流三重闸（Redis + LiteLLM 预算 + stepCountIs） | 公开 agent 是成本敞口；三重独立防线，任何一层失效不致命 |
