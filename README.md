<div align="center">

# shizurak

**An agent-native personal blog.**
Not a static site with a chatbot bolted on — the blog itself is built as an AI harness.

A microkernel orchestrates three GenUI engines · a four-layer theme contract drives every pixel and every millisecond of motion · an Agent-CMS writes alongside you.

*SpaceX space-opera × OpenAI/Apple minimal — as swappable experiences, not color swaps.*

[English](./README.md) · [简体中文](./README.zh-CN.md) · [Specs](./docs/specs/) · [Roadmap](#-roadmap)

[![Next.js](https://img.shields.io/badge/Next.js-16.3.5-black?logo=next.js&logoColor=white)](#-tech-stack)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](#-tech-stack)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](#-tech-stack)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](#-tech-stack)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#-contributing)

</div>

---

## ✨ What makes this different

Most personal blogs are static sites with an AI chat widget bolted on as an afterthought. shizurak is the opposite — **the blog is the harness**:

| | |
|:--|:--|
| 🧠 | **Agent Harness native** — A DSH-Cordis microkernel (isomorphic, plugin-based, built on [`@cordisjs/core`](https://github.com/cordis-io/cordis)) powers both the **visitor-side agent** (page-aware concierge that renders UI on the fly) and the **author-side agent** (drafts, translates, summarizes, suggests replies). One kernel, two roles. |
| ⚡ | **System One safety gate (Jev)** — [TypeSafe's](https://typesafe.ai) non-generative decision model (`@typesafe-ai/sdk`) runs *in front of* the LLM: calibrated-probability prompt-injection screening at the chat edge (403 without burning tokens), dynamic `toolApproval` risk on L2 tools, draft grounding checks. 70–500 ms, hallucination-free typed outputs; degrades open when unconfigured. |
| 🎛 | **GenUI in three engines** — [`json-render`](https://github.com/vercel-labs/json-render) for deterministic, schema-validated, data-bound UI; [OpenUI Lang](https://github.com/thesysdev/openui) for token-efficient streaming generative UI (up to 67% fewer tokens than JSON); and **RSC** (`ai/rsc` `streamUI`) for server-rendered, zero-client-JS, SEO-indexable one-shot UI. The agent routes by intent — dashboards vs. improvisation vs. server-direct. |
| 🎨 | **A Theme *Contract*, not themes** — A theme declares four layers: **tokens ⊕ motion ⊕ effects ⊕ GenUI skins**. The minimal theme renders the *same* agent answer as a clean Apple-style card; the space-opera theme renders it as a HUD telemetry panel. Same content, two universes. |
| 🎬 | **Motion with discipline** — GSAP owns choreography (scroll narratives, canvas, shader timelines); Motion owns reactivity (presence, layout, gestures). One rule: never fight over the same property. Every effect ships with a three-tier degradation path. |
| 📝 | **Agent-CMS** — Write in Obsidian. Material flows in, the content agent produces drafts, you review diff-by-diff, publish. AI involvement is labeled on every post. |
| ⚡ | **Performance as a feature** — Themed code-splitting: visitors on the minimal theme *never download* the WebGL nebula shader. Motion respects `prefers-reduced-motion` at the contract level. Budgets are enforced in CI. |
| 🌏 | **i18n pre-adapted** — Built on Next.js 16's official pattern (`[lang]` routing + `Accept-Language` negotiation + `next/root-params` dictionaries) from day one. Adding a language = adding content, not refactoring. |

## 🏗 How it works

```
                        ┌───────────────────────────────────────────────┐
   visitor / author ──▶ │  Next.js 16 · Cache Components · React 19     │
                        │                                               │
                        │  Theme Engine              Agent Harness      │
                        │  ┌──────────────┐         ┌────────────────┐  │
                        │  │ tokens       │◀─skin──▶│ frontend kernel│  │
                        │  │ motion       │         │  ui-actions    │  │
                        │  │ effects      │         │  page-context  │  │
                        │  │ genui skins  │         │  component-kit │  │
                        │  └──────────────┘         └───────┬────────┘  │
                        │                                   │           │
                        │  Agent-CMS                ┌───────▼────────┐  │
                        │  materials→drafts→review  │ backend kernel │  │
                        │                           │  model-adapter │  │
                        │                           │  tool-registry │  │
                        │                           │  agent-loop    │  │
                        │                           │  (AI SDK v7)   │  │
                        │                           └───────┬────────┘  │
                        └───────────────────────────────────┼───────────┘
                                                            │
              ┌─────────────────────┬───────────────────────┼──────────────┐
              ▼                     ▼                       ▼              ▼
      PostgreSQL (CNPG)        MinIO (media)        LLM Gateway       Redis
      content · specs          images/assets        (LiteLLM)         rate limits
      events · threads                              budget-guarded

   GenUI pipeline:  intent ─▶ genui-router ─┬─▶ json-render  (data-bound, deterministic)
                                             ├─▶ OpenUI Lang  (streaming, generative)
                                             └─▶ RSC          (server-rendered, zero client JS)
                                                      │
                                              theme-bridge re-skins
                                              every generated component
```

## 🎨 Themes

| | `void` · 幕 (Curtain) | `lumen` · 流明 |
|:--|:--|:--|
| **Personality** | digital fabric — whitespace is the cloth, transitions are the tear; still as dead, moving as ripping silk ([Rift Grammar v2 →](./docs/superpowers/specs/2026-09-19-curtain-grammar-design.md)) | precise — restrained micro-motion, generous whitespace |
| **Motion** | T1 tear / T2 collapse / T3 focus-pull transition grammar — effect budget lives in the 300–600ms transition, daily screen stays near-still | none beyond shared UI micro-motion |
| **Effects** | rift-layer 常驻底噪 + T1/T2/T3 转场语法 | none — *zero effect code downloaded* |
| **GenUI skin** | stitch 缝补 — sharp corners, visible seams, mono micro type | clean cards — soft radii, quiet shadows |
| **Launch sequence** | hero self-tear (CSS clip-path wipe, zero JS) | instant, fade-in |

Reserved themes `terminal` & `paper` ship as contract proofs; `cyber` stays reserved. [Adding a theme = 5 steps →](./docs/specs/01-design-spec.md#23-预留主题与新增清单)

## 🧰 Tech stack

```
Framework   Next.js 16.3.5 (Cache Components · React Compiler · proxy · root-params) · React 19.2 · TS 5 · Tailwind 4
UI          shadcn/ui + Radix · lucide · cmdk · sonner · @number-flow/react
Motion      GSAP 3.15 (plugins now 100% free) · Motion 13 · Lenis · hand-written WebGL shaders
State       Zustand 5 · SWR · nuqs · React Hook Form + Zod 4
AI          AI SDK v7 (ToolLoopAgent · toolApproval · streaming) · @ai-sdk/openai-compatible · Jev via @typesafe-ai/sdk
GenUI       json-render 0.21 (Vercel Labs) · OpenUI react-lang 0.3 · RSC GenUI · custom theme-bridge
Kernel      DSH-Cordis microkernel on @cordisjs/core 3.18 (isomorphic — plugin lifecycle · DI · event bus)
Content     Drizzle + PostgreSQL (CNPG) · unified/remark/rehype · Shiki 4 (dual-theme) · KaTeX · reading-time
Auth        token→cookie session guarding /admin & /api/admin (better-auth + Passkey planned)
Infra       Kubernetes + ArgoCD GitOps · OTel instrumentation · Redis rate limits · MinIO (planned)
Surface     search v1 (pg_trgm) · RSS · sitemap/robots · dynamic OG (next/og) · MCP server (/api/mcp)
Planned     Mastra workflows · Mermaid · TipTap rich editor · pgvector semantic search
```

## 🚀 Quick start

> 🛰 **Status (2026-09)** — M0–M2 shipped & green: site shell · dual-kernel harness · live visitor agent (real LLM) · GenUI json-render + OpenUI · PostgreSQL content pipeline · author content-agent · standalone/Docker/GitOps artifacts.

```bash
git clone https://github.com/Thecnfor/shizurak.git
cd shizurak
corepack enable && pnpm install
pnpm dev
```

Everything runs without external services (content APIs fall back gracefully). For the full experience, drop a `.env.local`:

```bash
DATABASE_URL=postgres://…        # content pipeline + persistence (CNPG)
REDIS_URL=redis://…             # agent rate limiting (optional)
LITELLM_BASE_URL=https://…      # any OpenAI-compatible gateway
LITELLM_KEY=***                 # …
LITELLM_CHAT_MODEL=…            # powers the agent
```

## 📖 Specifications

This project is spec-first. Five versioned documents are the source of truth — implementation follows the specs, not the other way around:

| Doc | What's inside |
|:--|:--|
| [**01 · Design Spec**](./docs/specs/01-design-spec.md) | The four-layer theme contract · full `void`/`lumen` token tables · effects catalog with degradation tiers · GSAP × Motion division of labor · GenUI visual language · performance budgets |
| [**02 · Architecture Spec**](./docs/specs/02-architecture-spec.md) | Next.js 16 conventions · DSH-Cordis dual-kernel plugin specs · the full Agent Harness (L0/L1/L2 permission model, triple cost gates) · content pipeline & data model · i18n · deployment topology |
| [**03 · State Spec**](./docs/specs/03-state-spec.md) | Six-layer state taxonomy · a decision tree for "where does this state live?" · store contracts · theme dual-track design |
| [**04 · Dependency Spec**](./docs/specs/04-dependency-spec.md) | Every dependency, version-locked with rationale · the "build vs. reuse" boundary · bundle budgets · frontier audit |
| [**05 · Harness Spec**](./docs/specs/05-harness-spec.md) | The unifying contract — microkernel plugin/service/event rules · **three-engine GenUI abstraction** · RSC GenUI channel & the Data-Stream/RSC transport mutex · engine routing table · L0/L1/L2 permissions · five cost gates · page-context stack · observability |

## 🗺 Roadmap

- [x] **M-1** — Specifications: design · architecture · state · dependencies · **harness**
- [x] **M0 — Foundation**: skeleton · four-layer theme engine + `void`/`lumen` · site shell (nav, FX, ⌘K) · i18n · View Transitions (route morph + theme circle-morph) · `<Activity>` agent dock
- [x] **M1 — Content**: Drizzle schema on PostgreSQL · compile pipeline (unified · Shiki dual-theme · KaTeX · TOC · reading-time) · posts list/detail with shared-element morph · AI-involvement labels
- [x] **M2 — Kernel & agent**: DSH-Cordis dual kernel on @cordisjs/core · visitor agent (AI SDK v7 ToolLoopAgent + real LLM + L0/L1/L2 tools) · GenUI json-render + OpenUI end-to-end · Redis rate limit · thread/spec persistence · `/lab` shareable GenUI
- [x] **M3 — Author side**: content agent (material → real-LLM draft) · guarded draft/publish APIs · PG workflow · **minimal `/admin` CMS** (token→cookie session, Markdown editor, one-click publish) — ⏳ rich editor (TipTap) · comments · analytics dashboard
- [x] **M4 — Ship (artifacts)**: standalone Dockerfile · GitLab CI · ArgoCD/k8s manifests · OTel instrumentation · `/api/health`(+`/live`) — ⏳ first production rollout
- [x] **Content surface**: search v1 (pg_trgm fuzzy, CJK+Latin, `/search`) · RSS (`/feed.xml`) · sitemap/robots · dynamic OG images — semantic search v2 (pgvector) planned
- [x] **Harness completeness**: L2 approval loop via AI SDK v7 `toolApproval` (in-stream approval-request → dock confirm card → execute) · **blog-as-MCP** (`/api/mcp`, official SDK, read-only content tools) · reserved themes `terminal` & `paper` proving the four-layer contract

**Later**: semantic search v2 (pgvector) · English translation pipeline · rich TipTap editor · Mastra workflows · Lighthouse CI budgets · Waline comments

## 🤝 Contributing

Ideas, issues, and PRs are welcome — especially around GenUI integration patterns (json-render / OpenUI), theme contract edge cases, and effect performance. Read the specs first; they're the source of truth.

## 📄 License

[MIT](./LICENSE)

## ⭐ Star history

<a href="https://star-history.com/#Thecnfor/shizurak&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=Thecnfor/shizurak&type=Date&theme=dark" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=Thecnfor/shizurak&type=Date" />
  </picture>
</a>

---

<div align="center">
<sub><i>"Build Runway future." — XRAK</i></sub>
</div>
