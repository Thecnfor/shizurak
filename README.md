# shizurak · blog.xrak.top

> 伍泽凯的个人博客 —— **Agent Harness 原生的顶级极客站点**。
> 一个「活」的博客：访客与 AI 对话获得动态生成的界面（GenUI），作者用 AI 管线写作；
> 视觉上是 SpaceX 太空歌剧 × 极简工业风，主题系统支持深度个性化自定义。
> **一切前沿，一切 AI 生成。**

---

## 一、需求全文（立项要求 · 2026-09-19）

> 以下为项目发起人的原始要求，逐条编号归档。所有设计与实现决策必须可追溯至此清单。

### R1 · 定位与身份
- R1.1 这是**个人博客**（伍泽凯 / Shizurak），非团队站；对外叙事取自公开素材（个人经历 / 能力总览 / 奖项），**严禁触碰隐私文件**。
- R1.2 域名：`blog.xrak.top`。
- R1.3 部署目标：**Rak 集群**（自建 k3s 生产集群 + ArgoCD GitOps 全链路）。

### R2 · 规范先行
- R2.1 动工前先产出四份规范：**设计规范**、**架构规范**、**状态管理规范**、**依赖规范**。
- R2.2 本 README 必须完整收录立项要求（即本节）。

### R3 · 选型原则
- R3.1 **尽可能用现成库、现成 UI 库、现成框架架构**。
- R3.2 为了高级感与个人风格，**必要时可以自己造轮子**（边界见依赖规范 §3「自研三问」）。
- R3.3 **GSAP 优先**；状态驱动的动效场景使用 **Framer Motion**（motion）。
- R3.4 ORM：Drizzle（评审推荐采纳）。

### R4 · 视觉与体验
- R4.1 特效、炫技、高级感、**顶级极客般的极简工业风**。
- R4.2 **SpaceX 一样的太空歌剧感**。
- R4.3 主题切换：
  - 主题一：**极客黑 + 极客太空歌剧特效**（`void`）
  - 主题二：**OpenAI & 苹果极简**（`lumen`）
- R4.4 **预留更多其他主题**；建立**多主题交汇架构**——跳脱「非黑即白」，实现**顶尖个性化自定义**（主题 = tokens + motion + effects + genui 四层契约，见设计规范 §1）。
- R4.5 每篇文章标注 AI 参与度（人写 / AI 辅助 / AI 生成+人工审核）。

### R5 · Agent Harness 原生（核心）
- R5.1 **DSH-Cordis 内核**：同构双层微内核（复用 cross-dashboard 已验证架构，MIT vendor）。
- R5.2 技术栈：**Mastra**（工作流）+ **Vercel AI SDK v7**（流式/工具/审批）+ **json-render**（确定性 GenUI）+ **OpenUI**（流式生成式 GenUI）。
- R5.3 Agent 面向**访客 + 作者双向**：
  - 访客侧：AI 导览 / 问答 / GenUI 动态界面（⌘K dock、page-context 注入、L0/L1/L2 权限模型）。
  - 作者侧：内容 Agent（素材→草稿→审核→发布、评论摘要回复、翻译预留、维护任务）。
- R5.4 **CMS 要有**：内建 Agent-CMS（`/admin`），内容 SSOT 在集群 PG；写作流 = vault `blog/` 素材 → rak-core 明文副本 → ingest → 素材库 → AI 草稿 → 人工审核 → 发布。
- R5.5 站内搜索：全文 + 语义混合（v1 全文 → v2 pgvector 语义，与 agent RAG 共用嵌入）。
- R5.6 评论：Waline 自托管 + 作者侧 Agent 增强（摘要/回复建议）。
- R5.7 访问统计：自研轻量埋点（PG 事件表，数据直接进 agent 工具链）。
- R5.8 认证：better-auth + Passkey（后台无密码登录）。

### R6 · 语言与内容
- R6.1 中文优先；i18n 架构预留（数据层 locale 维度 + 翻译工作流留位，v1 不启用运行时）。
- R6.2 内容增强：Shiki 双主题代码高亮、KaTeX 数学、Mermaid 图表、OG 图动态生成。

### R7 · 工程纪律
- R7.1 质量门禁：Biome + tsc + Vitest + Playwright + Lighthouse CI + 包体预算（依赖规范 §5）。
- R7.2 成本闸：公开 Agent 三重防线（Redis 限流 + LiteLLM 预算熔断 + `stopWhen` 步数上限）。
- R7.3 内容逃生舱：全量 markdown 导出 CLI，永不被平台锁定。

---

## 二、设计哲学

1. **信息密度即美**——装饰即信息（HUD 遥测显示真实数据），留白即结构。
2. **宏大叙事 × 精确执行**——深空尺度的背景运动 vs 毫秒级的微交互响应。
3. **一个内容，两种宇宙**——主题不是皮肤，是四层体验契约（tokens/motion/effects/genui）；同一篇 AI 回答在 `void` 下是 HUD 遥测卡，在 `lumen` 下是苹果风卡片。
4. **炫技与性能不互斥**——特效按主题分包（lumen 访客永不下载 WebGL 代码），三级降级路径是每个特效的准生证。

## 三、架构速览

```
访客/作者 ─▶ Next.js 16.3.5（Cache Components · React Compiler）
             ├─ 主题引擎：四层契约（void / lumen / 预留…）
             ├─ DSH-Cordis 双层内核
             │    后端：model-adapter→LiteLLM · tool-registry · mastra-engine
             │          content-agent · spec-store · thread-store
             │    前端：ui-actions(L0/L1/L2) · page-context · component-kit · theme-bridge
             ├─ Agent-CMS（/admin）：素材→AI 草稿→diff 审核→发布
             └─ GenUI 双引擎：json-render（数据仪表）+ OpenUI（即兴画布）
                    │
        CNPG(blog 库) · MinIO · Redis · LiteLLM 网关（全部 Rak 集群）

写作流：vault blog/ ──LiveSync──▶ CouchDB ──headless──▶ rak-core 明文 ──ingest──▶ 素材库
部署流：GitHub ─▶ GitLab CI ─▶ Harbor ─▶ ArgoCD 金丝雀 ─▶ blog.xrak.top
```

## 四、规范索引（实现唯一依据）

| 文档 | 内容 |
|------|------|
| [01 · 设计规范](./docs/specs/01-design-spec.md) | 主题契约四层模型 · void/lumen 完整规格 · 排版/色彩/特效目录 · 动效语法（GSAP×Motion 分工律）· GenUI 视觉规范 · 页面级设计 · 无障碍 · 性能预算 |
| [02 · 架构规范](./docs/specs/02-architecture-spec.md) | Next 16.3.5 版本约定 · 目录结构 · DSH-Cordis 双层内核 · Agent Harness 全链路 · 内容管线与数据模型 · 搜索/认证/评论/统计 · 渲染缓存策略 · 部署拓扑 |
| [03 · 状态管理规范](./docs/specs/03-state-spec.md) | 六层状态模型 · 决策树 · 三个 Zustand store 规格 · 主题双轨制 · 动效状态铁律 · 持久化 · 反模式清单 |
| [04 · 依赖规范](./docs/specs/04-dependency-spec.md) | 选型原则 · 全量依赖清单（版本锁定）· 自研边界 · 版本策略 · 包体预算 · 风险与替代 |

## 五、技术阵容速览

```
框架   Next.js 16.3.5 · React 19.2.8 · TypeScript 5 · Tailwind 4 · Biome · React Compiler
UI     shadcn/ui + Radix · lucide · cmdk · sonner · @number-flow/react
动效   GSAP 3.15（全插件）· motion 13 · Lenis · 自研 WebGL shader 特效层
状态   Zustand 5 · SWR · nuqs · React Hook Form + Zod 4
AI     AI SDK v7 · Mastra · json-render 0.21 · OpenUI（react-lang 0.3）· Cordis 4.0 (vendor)
       → 模型经 LiteLLM 网关（集群，零密钥）
内容   Drizzle + PostgreSQL（CNPG）· MinIO · Shiki 4 · KaTeX · Mermaid 12 · TipTap 3
认证   better-auth 1.7 + Passkey
运维   ArgoCD GitOps · OTel → Loki/Tempo/Grafana · Playwright + Lighthouse CI 门禁
```

## 六、仓库结构

```
shizurak/
├── README.md              # 本文件（需求全文 + 规范索引）
├── docs/specs/            # 四份规范（实现唯一依据）
├── src/                   # 应用（结构与边界见架构规范 §3）
├── scripts/               # ingest / export-content / theme-check
└── ...
```

## 七、路线图

| 阶段 | 内容 |
|------|------|
| **M0 · 地基** | 工程骨架（Next 16.3.5 + Tailwind 4 + Biome + 测试门禁）· 主题引擎 + void/lumen · 站点壳（导航/特效层/⌘K） |
| **M1 · 内容** | Drizzle schema + 迁移 · Agent-CMS（编辑器/diff 审核/发布）· 内容管线（Shiki/KaTeX/Mermaid/OG）· ingest CLI · RSS/sitemap/搜索 v1 |
| **M2 · 内核** | Cordis 双层内核 · 访客 Agent（chat + ui-actions + page-context）· GenUI 双引擎 + theme-bridge · 限流与成本闸 |
| **M3 · 作者侧** | content-agent 工作流（素材→草稿）· 评论增强 · 埋点 + /admin 仪表盘 · i18n 数据层 |
| **M4 · 上线** | Dockerfile + GitLab CI + ArgoCD · 可观测接入 · 性能预算验收 · 安全审计 |
| **Later** | 语义搜索 v2 · blog-as-MCP · 英文版翻译管线 · 预留主题（terminal/paper/cyber） |

## 八、开发

```bash
pnpm install        # Node 22 + pnpm 10.33.2（corepack enable）
pnpm dev            # 开发服务器
pnpm lint           # biome check
pnpm test           # vitest
pnpm e2e            # playwright
pnpm theme:check    # 主题契约校验
```

---

*"Build Runway future." — XRAK*
