# 04 · 依赖规范（Dependency Spec）

> 项目：**shizurak**（blog.xrak.top）— 伍泽凯个人博客
> 状态：定稿候选 v1 · 2026-09-19 · 版本快照：2026-09-19 全量 npm 实测
> 关联：[设计规范](./01-design-spec.md) · [架构规范](./02-architecture-spec.md) · [状态管理规范](./03-state-spec.md)

---

## 1. 选型原则

1. **现成库优先**——能用社区验证过的库，绝不造轮子；每个自研项必须通过「自研三问」：
   - 现成库的**默认形态**是否无法跨主题统一？（如图表库默认样式毁主题契约 → MiniChart 自绘）
   - 是否属于**个人身份的核心差异**？（如主题引擎——博客的灵魂）
   - 是否**百行内可完成的胶水**？（如埋点、CLI）
2. **前沿性**——优先选择活跃维护、API 现代（RSC 原生 / 流式原生 / 类型完备）的库；宁可 pre-1.0 的前沿，不要停滞的稳定。
3. **生态一致性**——与既有 XRAK 生态（cross-dashboard）保持心智连续：Cordis、AI SDK、Mastra、GSAP、Zustand、shadcn/ui 直接复用，不引入同类第二选择（不引 React Query、不引 jotai、不引第二图表库）。
4. **预算纪律**——每个依赖有明确的包体预算（§5）；运行时依赖总数 ≤ 45；任何新增依赖需回答「删掉它要写多少行」。

---

## 2. 完整依赖清单

> 版本策略：**全部精确锁定**（`save-exact`，无 `^`）；下表为 2026-09-19 实测最新稳定版。

### 2.1 框架与语言（已有，保持）

| 包 | 版本 | 用途 | 备注 |
|----|------|------|------|
| `next` | 16.3.5 | 框架 | Cache Components + React Compiler + proxy 约定（见架构规范 §2） |
| `react` / `react-dom` | 19.2.8 | UI 运行时 | `<Activity>` / Server Components |
| `typescript` | 5.x | 类型 | strict 模式 |
| `tailwindcss` + `@tailwindcss/postcss` | 4.x | 样式 | CSS-first `@theme` 承载设计令牌 |
| `@biomejs/biome` | 2.4.2 | lint + format | 含自定义边界规则（架构规范 §3） |
| `babel-plugin-react-compiler` | 1.0.0 | React Compiler | 已启用，禁手写 memo（架构规范 §2） |

### 2.2 UI 基座

| 包 | 版本 | 用途 |
|----|------|------|
| `shadcn`（CLI） | 4.21.0 | 组件基座（复制到仓库自持，`components/ui/`，禁止整体升级覆盖） |
| `@radix-ui/react-*` | 按 shadcn 引入（当前 1.1.x 系，如 dialog 1.1.23） | 无头原语（dialog/dropdown/popover/tabs/tooltip/scroll-area/switch…） |
| `lucide-react` | 1.47.0 | 图标（唯一图标源） |
| `tailwind-merge` + `clsx` | 3.7.0 / 2.1.1 | 类名合成（shadcn 标准 `cn()`） |
| `sonner` | 2.0.8 | 轻提示（主题化） |
| `cmdk` | 1.1.1 | ⌘K 命令面板 |
| `@number-flow/react` | 0.6.2 | 遥测数字滚动（HUD 核心质感件） |

### 2.3 动效层

| 包 | 版本 | 用途 | 分工（设计规范 §6） |
|----|------|------|---------------------|
| `gsap` | 3.15.0 | 时间线/滚动/Canvas/SVG | 编排、ScrollTrigger、SplitText、Flip、CustomEase（3.15 起全插件免费） |
| `@gsap/react` | 2.1.2 | `useGSAP` hook | scope 化 GSAP 生命周期 |
| `motion` | 13.4.0 | 状态驱动动效 | AnimatePresence / layout / 手势（`motion/react`） |
| `lenis` | 1.3.26 | 平滑滚动 | 与 ScrollTrigger 集成；reduced-motion 时禁用 |

### 2.4 状态层

| 包 | 版本 | 用途 | 层级（状态规范 §1） |
|----|------|------|---------------------|
| `zustand` | 5.0.15 | 三个全局 store | L3（theme / ui-shell / agent） |
| `swr` | 2.5.1 | 客户端增量拉取 | L4（评论数/实时计数，仅此） |
| `nuqs` | 2.10.1 | URL 状态 | L2（搜索/筛选/分页/主题分享码） |
| `react-hook-form` | 7.88.0 | 表单 | L6（仅 /admin） |
| `zod` | 4.6.5 | 校验 | 表单 + DB schema + GenUI catalog 共用 |

### 2.5 AI 与 Agent Harness

| 包 | 版本 | 用途 |
|----|------|------|
| `ai` | 7.0.106 | Vercel AI SDK 核心：**`ToolLoopAgent`**（官方 Agent 抽象——审批/步数/缓存钩子）/ `toolApproval` / `stopWhen` / reasoning parts |
| `@ai-sdk/react` | 4.0.109 | `useChat` + `DefaultChatTransport` |
| `@ai-sdk/openai-compatible` | 3.0.52 | provider 指向 **LiteLLM 网关**（零密钥直连） |
| `@ai-sdk/mcp` | 2.0.53 | **官方 MCP 客户端**（`createMCPClient`：Streamable HTTP/SSE/stdio + OAuth + 会话重连） |
| `@mastra/core` | 1.67.0 | 工作流引擎（`createWorkflow/createStep/commit`）：content/ingest/index/translate 管线 |
| `@json-render/core` | 0.21.0 | GenUI 确定性引擎：catalog（Zod）+ spec 类型 |
| `@json-render/react` | 0.21.0 | `Renderer` / `StateProvider` / `VisibilityProvider` |
| `@json-render/zustand` | 0.21.0 | json-render StateStore 适配（与 Zustand 5 对齐） |
| `@openuidev/react-lang` | 0.3.0 | GenUI 生成性引擎：组件库定义 + 系统提示生成 + 流式渲染 |
| `@openuidev/lang-core` | 0.3.0 | OpenUI Lang 解析/提示生成（框架无关层，服务端用） |
| `@openuidev/react-ui` | 0.16.1 | OpenUI 预构建聊天布局（选择性取用，皮肤自绘） |
| Cordis 4.0（vendor） | — | 微内核（自 cross-dashboard 复用，MIT，不装 npm 包） |

> **不引 `@openuidev/react-headless`（0.16.1）**：它提供 headless 聊天状态 + AI SDK/AG-UI 流式适配器——但本站聊天状态的唯一源是 AI SDK `useChat`（状态规范 §3.5），引入会造成双状态源。OpenUI Lang 流直接喂 `react-lang` 渲染器即可；若实现中发现需要官方适配器，再作为**适配层**引入（不接管状态）。

### 2.6 内容与阅读

| 包 | 版本 | 用途 |
|----|------|------|
| `drizzle-orm` | 0.45.2 | ORM（schema-as-code，SQL-first） |
| `drizzle-kit` | 0.31.10 | 迁移生成（dev） |
| `postgres` | 3.4.9 | postgres.js 驱动（drizzle 底层） |
| `shiki` | 4.4.3 | 代码高亮（**双主题** + CSS variables，随站点主题） |
| `katex` | 0.18.7 | 数学公式 |
| `mermaid` | 12.0.0 | 图表渲染（客户端，主题化） |
| `unified` | 11.0.5 | MDX 编译管线核心 |
| `remark-parse` / `remark-gfm` / `remark-math` / `remark-rehype` | 11.0.0 / 4.0.1 / 6.0.0 / 11.1.2 | remark 系（GFM + 数学） |
| `rehype-katex` / `rehype-slug` / `rehype-autolink-headings` / `rehype-stringify` | 7.0.1 / 6.0.0 / 7.1.0 / 10.0.1 | rehype 系（公式渲染 + 锚点 + 序列化） |
| `reading-time` | 1.5.0 | 阅读时长 |
| `feed` | 6.0.0 | RSS/Atom 生成 |
| `@tiptap/react` + `@tiptap/starter-kit` + `@tiptap/pm` | 3.31.3 | CMS 富文本编辑器（+ markdown 序列化） |
| `@codemirror/lang-markdown` + `@codemirror/*` | 6.5.2 + 6.x | CMS 源码模式编辑器 |
| `uuid` | 14.0.2 | uuid v7 生成（时间有序主键） |
| `minio` | 8.0.7 | MinIO SDK（媒体上传/签名 URL） |
| `ioredis` | 6.0.0 | Redis 客户端（限流/缓存/计数） |
| `better-auth` | 1.7.5 | 认证核心（Drizzle adapter + session） |
| `@better-auth/passkey` | 1.7.5 | Passkey（WebAuthn）插件 |
| `@waline/client` | 3.15.2 | 评论前端（服务端为 Docker 镜像 `waline/waline`，非 npm 依赖） |

### 2.6b i18n（预适配，架构规范 §6.4）

| 包 | 版本 | 用途 |
|----|------|------|
| `negotiator` | 1.1.0 | `Accept-Language` 解析（proxy 语言协商，官方指南标准搭配） |
| `@formatjs/intl-localematcher` | 0.9.0 | 语言匹配（locale 协商决策，官方指南标准搭配） |

### 2.7 可观测

| 包 | 版本 | 用途 |
|----|------|------|
| `@vercel/otel` | 2.1.3 | OTel SDK 封装（→ 集群 OTLP：Tempo/Loki/Prometheus） |
| `@opentelemetry/api` | 1.9.1 | 手动 span（agent 调用链、GenUI 渲染耗时） |

### 2.8 开发与质量（devDependencies）

| 包 | 版本 | 用途 |
|----|------|------|
| `vitest` + `@testing-library/react` + `jsdom` | 5.0.1 / 16.3.3 / 30.1.0 | 单元/组件测试 |
| `@playwright/test` | 1.63.0 | E2E（**唯一自动化门禁**，对齐 cross-dashboard 模式） |
| `@next/bundle-analyzer` | 16.3.5 | 包体分析（对齐 §5 预算） |
| `@lhci/cli` | 0.15.1 | Lighthouse CI（性能预算门禁） |
| `cn-font-split` | 7.4.3 | 中文字体分片（构建工具，见设计规范 §3.1） |
| `tsx` | 4.23.13 | scripts/ 运行（ingest / export / theme-check） |
| `@types/negotiator` | 0.6.5 | negotiator 类型（proxy 语言协商） |
| `@openuidev/cli` | 0.3.0 | 从组件库定义生成 OpenUI 系统提示/JSON schema（构建期运行，产物进仓库） |
| `@json-render/devtools-react` | 0.21.0 | GenUI spec 调试面板（仅 dev 环境挂载） |

### 2.9 预留（v1 不安装，架构留位）

| 包/能力 | 启用时机 | 说明 |
|---------|----------|------|
| `next-intl` 4.14.5 | 仅当内置字典模式撑不住时 | i18n 已按官方最佳实践预适配（`[lang]` 路由 + 字典 + root-params，架构规范 §6.4）；next-intl 是升级备选而非默认路径 |
| MCP 服务端（blog-as-MCP） | Later | 对外暴露博客知识为 MCP server（客户端侧 `@ai-sdk/mcp` 已就位） |
| pgvector 嵌入管线 | v2（搜索语义化） | `embedding` 列预留；扩展随 CNPG 镜像启用 |
| OGL（可选） | 若裸 WebGL2 样板过重 | 3KB WebGL 辅助；默认不引入，自研 shader 层优先 |
| `@openuidev/react-headless` | 仅当 react-lang 直喂流不够用 | 见 §2.5 注：不接管聊天状态，只作适配器 |

### 2.10 前沿性核对（2026-09-19 全量实测）

> 立项要求「一切前沿」的逐层核对——每层锁定该生态当前最前沿选择，拒绝次新版：

| 层 | 前沿选择 | 核对 |
|----|----------|:----:|
| 框架 | Next.js 16.3.5（Cache Components · React Compiler · proxy · **root-params 新 API**）· React 19.2.8 | ✓ npm latest |
| AI 核心 | **AI SDK v7.0.106**：`ToolLoopAgent`（v7 官方 Agent 抽象）· `toolApproval`（v7 稳定化）· reasoning parts · `allowSystemInMessages` 防注入 | ✓ 主版本 v7（非 v5/v6） |
| Harness | DSH-Cordis 微内核（cross-dashboard 生产验证 vendor）+ Mastra 1.67.0 + **`@ai-sdk/mcp` 2.0.53 官方 MCP** | ✓ 各自 latest |
| GenUI | **json-render 0.21**（Vercel Labs）+ **OpenUI react-lang 0.3**（thesysdev，9.6k★，MIT，昨日仍在推送）双引擎 | ✓ 各自 latest |
| 动效 | GSAP 3.15.0（全插件免费时代：SplitText/ScrollTrigger/Flip 全量可用）+ motion 13.4.0 | ✓ 最新主版本 |
| 样式 | Tailwind 4（CSS-first `@theme`）+ shadcn CLI 4.21.0 | ✓ |
| 认证 | better-auth 1.7.5 + `@better-auth/passkey`（WebAuthn 无密码） | ✓ |
| 数据 | Drizzle 0.45.2 + postgres.js 3.4.9 | ✓ |
| 内容 | Shiki 4.4.3（双主题）· Mermaid 12 · TipTap 3.31.3 · KaTeX 0.18.7 | ✓ |
| i18n | Next.js 官方模式：`[lang]` + `proxy` 协商 + `next/root-params`（16.x 新 API） | ✓ 官方指南 |

**排除的前沿诱惑**（评估后不采用，理由入库）：AG-UI 协议（AI SDK 自有 UI 消息流已闭环，引入是双重协议栈）· `@openuidev/react-headless`（与 useChat 双状态源，见 §2.5 注）· v7 `WorkflowAgent`/@ai-sdk/workflow（Mastra 已是工作流层，不叠床架屋）。

---

## 3. 自研清单（造轮子的边界）

| 自研项 | 位置 | 为什么自研（自研三问命中） |
|--------|------|---------------------------|
| 主题引擎（resolve/css/bridge） | `lib/themes/` | 身份核心：四层契约是本站灵魂，无现成库可表达 |
| 特效层（nebula/starfield/hud/reticle） | `components/fx/` | 跨主题统一：现成粒子/星空库的默认形态无法服从主题契约与三级降级 |
| MiniChart（SVG 折线/柱状） | `components/genui/` | 跨主题统一 + 包体：图表库默认样式毁 GenUI 换肤 |
| 埋点（收集/查询/展示） | `lib/analytics/` + `api/events` | 胶水（~百行）+ 数据必须直接进 agent 工具链 |
| ingest / export / theme-check CLI | `scripts/` | 胶水：与 vault 副本、CI 的专属集成 |
| Cordis vendor | `src/kernel/vendor/` | 复用自 cross-dashboard（MIT），不重复造 |

---

## 4. 版本策略

1. **精确锁定**：`.npmrc` 设 `save-exact=true`；所有版本无 `^`；`pnpm-lock.yaml` 进仓库
2. **安全钉**：传递依赖漏洞用 `pnpm.overrides` 钉（不改直接依赖版本）
3. **升级节奏**：
   - 框架层（next/react/tailwind）：等 `x.y.2+` 稳定版，单独 PR，跑全量门禁
   - AI 层（ai/mastra/json-render/openui）：跟随上游快速迭代（周级），但**只经适配层**（§6 风险表）
   - Cordis vendor：冻结，手动同步（变更需过 selftest）
4. **pre-1.0 依赖纪律**（json-render 0.21 / openui 0.3）：升级必须走适配层回归（GenUI 冒烟用例集），禁止直接散用 API
5. **Node 版本**：22 LTS（与 rak-sis 一致）；`engines` 字段声明
6. **包管理器**：pnpm 10.33.2（`packageManager` 字段锁定，corepack）

---

## 5. 包体预算（与设计规范 §10 对齐）

| 分块 | 预算（gz） | 归属 |
|------|-----------|------|
| 框架基座（react/next runtime） | ~90KB | 所有页面 |
| UI 基座（radix 按需 + lucide 按需 + cn） | ~25KB | 站点 |
| 状态层（zustand + swr + nuqs） | ~12KB | 站点 |
| motion（lazy 于交互岛） | ~18KB | 按需 |
| GSAP core + ScrollTrigger | ~32KB | void 特效层 chunk 内 |
| 特效层（fx chunk，idle 加载） | ≤ 45KB | **仅 void** |
| GenUI（json-render react / openui react-lang） | ~20KB / ~15KB | 仅对话激活时懒加载 |
| 内容增强（shiki/katex/mermaid） | 按文章按需 | 文章页懒加载 |
| **首屏合计（lumen）** | **≤ 170KB** | — |
| **首屏合计（void，不含 fx chunk）** | **≤ 190KB** | — |

纪律：新增依赖 PR 必须附 bundle-analyzer 截图；超预算即阻断。

---

## 6. 风险与替代方案

| 依赖 | 风险 | 缓解 | 替代 |
|------|------|------|------|
| `@json-render/*` 0.21 | pre-1.0，API 漂移 | 适配层封装（`components/genui/`）+ 冒烟用例集 + 精确锁定 | 自研 spec 渲染（成本高，仅应急） |
| `@openuidev/react-lang` 0.3.0 | 极早期 | 同上；OpenUI 只用于「探索型」场景，失效时降级为 json-render 单引擎 | 纯 json-render |
| `@mastra/core` 1.x | 快速迭代 | 工作流保持薄（业务在 kernel 层）；锁定版本 | 手写编排（退化路径） |
| `ai` 7.x | 快速迭代 | 只用稳定面（streamText/useChat/toolApproval）；锁定 | 无（生态锚点） |
| ParadeDB `pg_search` | CNPG 镜像定制成本 | 三级回退：pg_search → zhparser → pg_trgm | pg_trgm（功能弱但零依赖） |
| `@waline/client` 3.x | 维护活跃度 | 独立 schema，数据自主，可随时替换前端 | 自研评论（数据在自家 PG，迁移成本低） |
| `cn-font-split` | 构建工具小众 | 产物进仓库（字体分片是构建产物，非运行时依赖） | 手动子集化（fonttools） |
| LiteLLM 网关 | 集群单点 | 网关侧预算熔断 + 博客侧降级文案（agent 不可用时提示） | 直连 provider（备用 env） |

---

## 7. 依赖全景速查

```
框架   next 16.3.5 · react 19.2.8 · ts 5 · tailwind 4 · biome 2.4.2 · react-compiler
UI     shadcn 4.21 + radix · lucide · cmdk · sonner · number-flow
动效   gsap 3.15 + @gsap/react · motion 13 · lenis
状态   zustand 5 · swr 2.5 · nuqs 2.10 · rhf 7.88 + zod 4
AI     ai 7.0.106 (ToolLoopAgent) · @ai-sdk/react · @ai-sdk/openai-compatible → LiteLLM
       @ai-sdk/mcp 2.0.53 (官方 MCP) · mastra 1.67
       json-render 0.21 ×3 · openui react-lang 0.3 + lang-core + react-ui
       cordis 4.0 (vendor)
内容   drizzle 0.45 + postgres 3.4 · shiki 4 · katex · mermaid 12 · unified 系 11
       tiptap 3.31 · codemirror 6 · feed · reading-time · uuid 14
       better-auth 1.7.5 + passkey · waline client 3.15
i18n   negotiator 1.1 + @formatjs/intl-localematcher 0.9（官方指南标准搭配）
运维   minio 8.0 · ioredis 6.0 · @vercel/otel 2.1
质量   vitest 5 · playwright 1.63 · lhci · bundle-analyzer · cn-font-split (dev)
```
