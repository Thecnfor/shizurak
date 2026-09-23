<div align="center">

# shizurak

**Agent Harness 原生的个人博客。**
不是「静态站 + 挂个聊天窗」——博客本身就是一座 AI 工作台。

微内核编排三 GenUI 引擎 · 四层主题契约驱动每一个像素与每一毫秒动效 · Agent-CMS 与你并肩写作。

*SpaceX 太空歌剧 × OpenAI/苹果极简 —— 是可互换的完整体验，不是换配色。*

**🛰 状态（2026-09）**：M0–M4 全部交付——双层内核（真 cordis）· 真实 LLM 访客 Agent + L2 审批回流 · GenUI 双引擎端到端 · PostgreSQL 内容管线 + 搜索 v1/RSS/OG · 作者 Agent + `/admin` 最小 CMS · blog-as-MCP · 四主题（void/lumen/terminal/paper）· 部署产物就绪。全部门禁绿。

[English](./README.md) · [简体中文](./README.zh-CN.md) · [规范文档](./docs/specs/) · [路线图](#-路线图)

[![Next.js](https://img.shields.io/badge/Next.js-16.3.5-black?logo=next.js&logoColor=white)](#-技术阵容)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](#-技术阵容)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](#-技术阵容)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#-参与贡献)

</div>

---

## 一、立项需求全文（R1–R7 · 2026-09-19）

> 本项目发起人的原始要求，逐条编号归档。所有设计与实现决策必须可追溯至此清单。

### R1 · 定位与身份
- R1.1 这是**个人博客**（伍泽凯 / Shizurak），非团队站；对外叙事取自公开素材（个人经历 / 能力总览 / 奖项），**严禁触碰隐私文件**。
- R1.2 域名：`blog.xrak.top`。
- R1.3 部署目标：**Rak 集群**（自建 k3s 生产集群 + ArgoCD GitOps 全链路）。

### R2 · 规范先行
- R2.1 动工前先产出四份规范：**设计规范**、**架构规范**、**状态管理规范**、**依赖规范**。
- R2.2 README 必须完整收录立项要求（即本节）。
- R2.3 项目**开源**，目标高 star——README 与文档按开源精品标准撰写。

### R3 · 选型原则
- R3.1 **尽可能用现成库、现成 UI 库、现成框架架构**。
- R3.2 为了高级感与个人风格，**必要时可以自己造轮子**（边界见依赖规范 §3「自研三问」）。
- R3.3 **GSAP 优先**；状态驱动的动效场景使用 **Framer Motion**（motion）。
- R3.4 ORM：Drizzle。
- R3.5 **依赖全部取最新**，追求前沿（2026-09-19 全量 npm 实测锁定，见依赖规范 §2.10 前沿性核对）。

### R4 · 视觉与体验
- R4.1 特效、炫技、高级感、**顶级极客般的极简工业风**。
- R4.2 **SpaceX 一样的太空歌剧感**。
- R4.3 主题切换：
  - 主题一：**极客黑 + 极客太空歌剧特效**（`void`）
  - 主题二：**OpenAI & 苹果极简**（`lumen`）
- R4.4 **预留更多其他主题**；建立**多主题交汇架构**——跳脱「非黑即白」，实现**顶尖个性化自定义**（主题 = tokens ⊕ motion ⊕ effects ⊕ genui 四层契约，见设计规范 §1）。
- R4.5 每篇文章标注 AI 参与度（人写 / AI 辅助 / AI 生成+人工审核）。

### R5 · Agent Harness 原生（核心）
- R5.1 **DSH-Cordis 内核**：同构双层微内核（复用 cross-dashboard 已验证架构，MIT vendor）。
- R5.2 技术栈（全部当前最前沿）：**Mastra**（工作流）+ **Vercel AI SDK v7**（`ToolLoopAgent` / `toolApproval` / 流式）+ **json-render**（确定性 GenUI）+ **OpenUI**（生成式流式 GenUI）+ **`@ai-sdk/mcp`**（官方 MCP）。
- R5.3 Agent 面向**访客 + 作者双向**：
  - 访客侧：AI 导览 / 问答 / GenUI 动态界面（⌘K dock、page-context 注入、L0/L1/L2 权限模型）。
  - 作者侧：内容 Agent（素材→草稿→审核→发布、评论摘要回复、翻译、维护任务）。
- R5.4 **CMS 要有**：内建 Agent-CMS（`/admin`），内容 SSOT 在集群 PG；写作流 = vault `blog/` 素材 → rak-core 明文副本 → ingest → 素材库 → AI 草稿 → 人工审核 → 发布。
- R5.5 站内搜索：全文 + 语义混合（v1 全文 → v2 pgvector 语义，与 agent RAG 共用嵌入）。
- R5.6 评论：Waline 自托管 + 作者侧 Agent 增强（摘要/回复建议）。
- R5.7 访问统计：自研轻量埋点（PG 事件表，数据直接进 agent 工具链）。
- R5.8 认证：better-auth + Passkey（后台无密码登录）。

### R6 · 语言与内容
- R6.1 **i18n 预适配**：从第一天就按 **Next.js 官方最佳实践**落地多语言路由（`app/[lang]/` + `proxy` 语言协商 + `next/root-params` 字典模式）；中文为默认语言；英文内容由翻译管线增量生成——加语言 = 加内容，零重构。
- R6.2 内容增强：Shiki 双主题代码高亮、KaTeX 数学、Mermaid 图表、OG 图动态生成。

### R7 · 工程纪律
- R7.1 质量门禁：Biome + tsc + Vitest + Playwright + Lighthouse CI + 包体预算（依赖规范 §5）。
- R7.2 成本闸：公开 Agent 三重防线（Redis 限流 + LiteLLM 预算熔断 + `ToolLoopAgent` 步数上限）。
- R7.3 内容逃生舱：全量 markdown 导出 CLI，永不被平台锁定。

---

## 二、设计哲学

1. **信息密度即美**——装饰即信息（HUD 遥测显示真实数据），留白即结构。
2. **宏大叙事 × 精确执行**——深空尺度的背景运动 vs 毫秒级的微交互响应。
3. **一个内容，两种宇宙**——主题不是皮肤，是四层体验契约；同一篇 AI 回答在 `void` 下是 HUD 遥测卡，在 `lumen` 下是苹果风卡片。
4. **炫技与性能不互斥**——特效按主题分包（lumen 访客永不下载 WebGL 代码），三级降级路径是每个特效的准生证。

> 注：以上为立项时原文。2026-09 幕语法 v2（[设计语言修订 →](./docs/superpowers/specs/2026-09-19-curtain-grammar-design.md)）把 `void` 人格从「太空歌剧 HUD」重铸为「数字织物·幕」，下表以 v2 为准。

## 二·五、主题速览（现状）

| | `void` · 幕 (Curtain) | `lumen` · 流明 |
|:--|:--|:--|
| **人格** | 数字织物——留白是幕面，转场是撕幕；静如死物，动如裂帛 | 克制微动效，大片留白 |
| **动效** | T1 撕幕 / T2 垂帘 / T3 拉焦转场语法；特效预算集中在转场 300–600ms | 仅共享 UI 微动效 |
| **特效** | rift-layer 常驻底噪 + T1/T2/T3 转场语法 | 无——*零特效代码下载* |
| **GenUI 皮肤** | stitch 缝补——直角、明缝线、mono 微字 | clean 卡片——软圆角、安静阴影 |

预留主题 `terminal`、`paper` 已作为契约证明落地；`cyber` 仍预留。

## 三、架构速览

```
访客/作者 ─▶ Next.js 16.3.5（Cache Components · React Compiler · i18n [lang] 路由）
             ├─ 主题引擎：四层契约（void / lumen / 预留…）
             ├─ DSH-Cordis 双层内核（基于 @cordisjs/core）
             │    后端：model-adapter→LLM 网关 · tool-registry · agent-loop（AI SDK v7 ToolLoopAgent）
             │          spec-store · thread-store · PG 持久化
             │    前端：ui-actions(L0/L1/L2) · page-context · component-kit · theme-bridge
             ├─ Agent-CMS（/admin）：素材→AI 草稿→diff 审核→发布
             └─ GenUI 三引擎（genui-router 路由）：json-render（数据仪表）+ OpenUI（即兴画布）+ RSC（服务端直出·零客户端 JS）
                    │
        CNPG(blog 库) · MinIO · Redis · LiteLLM 网关（全部 Rak 集群）

写作流：vault blog/ ──LiveSync──▶ CouchDB ──headless──▶ rak-core 明文 ──ingest──▶ 素材库
部署流：GitHub ─▶ GitLab CI ─▶ Harbor ─▶ ArgoCD 金丝雀 ─▶ blog.xrak.top
```

## 四、规范索引（实现唯一依据）

| 文档 | 内容 |
|------|------|
| [01 · 设计规范](./docs/specs/01-design-spec.md) | 主题契约四层模型 · void/lumen 完整规格 · 排版/色彩/特效目录 · 动效语法（GSAP×Motion 分工律）· GenUI 视觉规范 · 页面级设计 · 无障碍 · 性能预算 |
| [02 · 架构规范](./docs/specs/02-architecture-spec.md) | Next 16.3.5 版本约定 · 目录结构 · DSH-Cordis 双层内核 · Agent Harness 全链路 · i18n 预适配 · 内容管线与数据模型 · 搜索/认证/评论/统计 · 渲染缓存策略 · 部署拓扑 |
| [03 · 状态管理规范](./docs/specs/03-state-spec.md) | 六层状态模型 · 决策树 · 三个 Zustand store 规格 · 主题双轨制 · 动效状态铁律 · 持久化 · 反模式清单 |
| [04 · 依赖规范](./docs/specs/04-dependency-spec.md) | 选型原则 · 全量依赖清单（版本锁定）· 前沿性核对 · 自研边界 · 包体预算 · 风险与替代 |
| [05 · Harness 规范](./docs/specs/05-harness-spec.md) | 统一契约——微内核插件/Service/事件规则 · **三引擎 GenUI 抽象** · RSC GenUI 通道与 Data-Stream/RSC 传输互斥律 · 引擎路由表 · L0/L1/L2 权限 · 五重成本闸 · page-context 上下文栈 · 可观测 |

## 五、技术阵容速览

```
框架   Next.js 16.3.5 · React 19.2.8 · TypeScript 5 · Tailwind 4 · Biome · React Compiler
UI     shadcn/ui 4.21 + Radix · lucide · cmdk · sonner · @number-flow/react
动效   GSAP 3.15（全插件）· motion 13 · Lenis · 自研 WebGL shader 特效层
状态   Zustand 5 · SWR · nuqs · React Hook Form + Zod 4
AI     AI SDK v7（ToolLoopAgent · 流式）· @ai-sdk/openai-compatible ✅
       Jev（TypeSafe System One，@typesafe-ai/sdk）✅ — 入口注入闸 / L2 动态审批风险 / 草稿质检，无 key 降级放行
       json-render 0.21 ✅ · OpenUI react-lang 0.3 ✅ · theme-bridge ✅ · RSC GenUI（ai/rsc streamUI）⏳
       Cordis 微内核（@cordisjs/core 3.18）✅
       → 模型经 LiteLLM/Ark 网关（预算熔断 + Redis 限流）
内容   Drizzle + PostgreSQL（CNPG）✅ · unified/remark/rehype + Shiki 4 双主题 + KaTeX + **rehype-sanitize** ✅
       搜索 v1（pg_trgm）✅ · RSS ✅ · sitemap/robots ✅ · 动态 OG（next/og）✅
       Mermaid 12 · TipTap 3 富编辑器 · MinIO ⏳
i18n   app/[lang] + proxy 协商 + next/root-params（官方最佳实践）✅
协议   blog-as-MCP：/api/mcp（官方 @modelcontextprotocol/sdk，只读内容工具）✅
认证   token→cookie 会话守 /admin & /api/admin ✅（better-auth + Passkey ⏳）
运维   standalone Dockerfile ✅ · GitLab CI ✅ · ArgoCD/k8s 清单 ✅ · OTel instrumentation ✅
```

> ✅ = 仓内已落地并可运行 · ⏳ = 路线图内（规范已定义，未实现）

## 六、仓库结构

```
shizurak/
├── README.md              # 英文主版（开源门面）
├── README.zh-CN.md        # 中文版（本文件，含需求全文）
├── docs/specs/            # 五份规范（实现唯一依据）
├── src/                   # 应用（结构与边界见架构规范 §3）
├── src/kernel + src/lib/kernel  # DSH-Cordis 双层内核（插件化）
│ ├   /[lang]/lab/s/[id] · /search · /admin · /feed.xml · /api/{chat,genui,admin,health,mcp,og}
├── scripts/               # seed / gen-theme-css / theme-check
├── deploy/                # k8s + ArgoCD 清单
└── ...（Dockerfile / .gitlab-ci.yml / drizzle.config.ts）
```

## 七、路线图

| 阶段 | 内容 | 状态 |
|------|------|------|
| **M0 · 地基** | 工程骨架 · 主题引擎 + void/lumen · 站点壳（导航/特效层/⌘K）· i18n · View Transitions（路由转场+主题形变）· `<Activity>` 导览坞 | ✅ |
| **M1 · 内容** | Drizzle schema + PG 迁移 · 编译管线（Shiki/KaTeX/TOC/阅读时长）· 列表/详情 + 共享元素形变 · AI 参与度标签 | ✅ |
| **M2 · 内核** | cordis 双层内核 · 访客 Agent（真 LLM + L0/L1/L2 工具）· GenUI json-render+OpenUI 端到端 · Redis 限流 · 线程/spec 持久化 · `/lab` 分享页 | ✅ |
| **M3 · 作者侧** | content-agent（素材→真 LLM 草稿）· 草稿/发布接口 · PG 工作流 · `/admin` 最小 CMS（token→cookie 会话 + Markdown 编辑 + 一键发布） | ✅ |
| | TipTap 富编辑器 · 评论增强 · 埋点仪表盘 · 英文翻译管线 | ⏳ |
| **M4 · 上线** | standalone Dockerfile · GitLab CI · ArgoCD/k8s 清单 · OTel · /api/health(+live) | ✅ 产物 |
| | 首次生产 rollout · Lighthouse 预算门禁 | ⏳ |
| **横切** | L2 审批回流（AI SDK v7 toolApproval → Dock 确认卡）✅ · blog-as-MCP（/api/mcp）✅ · 预留主题 terminal/paper ✅ · 搜索 v1（pg_trgm）+ RSS/sitemap/OG ✅ | |
| **Later** | 语义搜索 v2（pgvector）· TipTap 富编辑器 · Mastra 工作流 · Waline 评论 · cyber 主题 | |

## 八、开发

```bash
pnpm install        # Node 22 + pnpm 10.33.2（corepack enable）
pnpm dev            # 开发服务器
pnpm lint           # biome check
pnpm test           # vitest
pnpm e2e            # playwright
pnpm theme:check    # 主题契约校验
```

## 九、参与贡献

欢迎 Issue 与 PR——尤其是 GenUI 集成模式（json-render / OpenUI）、主题契约边界用例、特效性能方向。动工前先读规范——它是唯一事实源。

## 十、许可

[MIT](./LICENSE)

---

<div align="center">
<sub><i>"Build Runway future." — XRAK</i></sub>
</div>
