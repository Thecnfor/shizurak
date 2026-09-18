<div align="center">

# shizurak

**An agent-native personal blog.**
Not a static site with a chatbot bolted on — the blog itself is built as an AI harness.

A microkernel orchestrates two GenUI engines · a four-layer theme contract drives every pixel and every millisecond of motion · an Agent-CMS writes alongside you.

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
| 🧠 | **Agent Harness native** — A DSH-Cordis microkernel (isomorphic, plugin-based, vendored from a production system) powers both the **visitor-side agent** (page-aware concierge that renders UI on the fly) and the **author-side agent** (drafts, translates, summarizes, suggests replies). One kernel, two roles. |
| 🎛 | **GenUI in two engines** — [`json-render`](https://json-render.dev) for deterministic, schema-validated, data-bound UI; [OpenUI Lang](https://www.openui.com) for token-efficient streaming generative UI (up to 67% fewer tokens than JSON). The agent routes by intent — dashboards vs. improvisation. |
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
                        │                           │  mastra-engine │  │
                        │                           └───────┬────────┘  │
                        └───────────────────────────────────┼───────────┘
                                                            │
              ┌─────────────────────┬───────────────────────┼──────────────┐
              ▼                     ▼                       ▼              ▼
      PostgreSQL (CNPG)        MinIO (media)        LLM Gateway       Redis
      content · specs          images/assets        (LiteLLM)         rate limits
      events · threads                              budget-guarded

   GenUI pipeline:  intent ─▶ kernel routes ─┬─▶ json-render  (data-bound, deterministic)
                                             └─▶ OpenUI Lang  (streaming, generative)
                                                      │
                                              theme-bridge re-skins
                                              every generated component
```

## 🎨 Themes

| | `void` · 深空 | `lumen` · 流明 |
|:--|:--|:--|
| **Personality** | SpaceX space opera | OpenAI × Apple minimal |
| **Motion** | cinematic — slow, ceremonial reveals; scroll-driven narratives | precise — restrained micro-motion, generous whitespace |
| **Effects** | WebGL nebula · parallax starfield · HUD telemetry (real data) · scanlines · reticle cursor | none — *zero effect code downloaded* |
| **GenUI skin** | HUD panels — cut corners, tick marks, tabular numerals | clean cards — soft radii, quiet shadows |
| **Launch sequence** | countdown → ignition → ascent → orbit (GSAP timeline) | instant, fade-in |

Plus a **personalization layer**: rotate the accent hue in OKLCH, dial effect intensity, scale motion speed — shareable via URL. Reserved themes (`terminal`, `paper`, `cyber`) validate the contract. [Adding a theme = 5 steps →](./docs/specs/01-design-spec.md#23-预留主题与新增清单)

## 🧰 Tech stack

```
Framework   Next.js 16.3.5 (Cache Components · React Compiler · proxy · root-params) · React 19.2 · TS 5 · Tailwind 4
UI          shadcn/ui + Radix · lucide · cmdk · sonner · @number-flow/react
Motion      GSAP 3.15 (plugins now 100% free) · Motion 13 · Lenis · hand-written WebGL shaders
State       Zustand 5 · SWR · nuqs · React Hook Form + Zod 4
AI          AI SDK v7 (ToolLoopAgent · toolApproval) · Mastra · @ai-sdk/mcp
GenUI       json-render 0.21 (Vercel Labs) · OpenUI react-lang 0.3 · custom theme-bridge
Kernel      DSH-Cordis 4.0 (vendored, isomorphic — plugin lifecycle · DI · event bus)
Content     Drizzle + PostgreSQL · MinIO · Shiki 4 (dual-theme code) · KaTeX · Mermaid · TipTap 3
Auth        better-auth 1.7 + Passkey (WebAuthn, passwordless)
Infra       Kubernetes + ArgoCD GitOps · OTel → Loki/Tempo/Grafana · Playwright + Lighthouse CI gates
```

## 🚀 Quick start

> ⚠️ Under construction — M0 is in progress. Star & watch to follow along.

```bash
git clone https://github.com/Thecnfor/shizurak.git
cd shizurak
corepack enable && pnpm install
pnpm dev
```

## 📖 Specifications

This project is spec-first. Every architectural decision lives in a versioned document — implementation follows the specs, not the other way around:

| Doc | What's inside |
|:--|:--|
| [**01 · Design Spec**](./docs/specs/01-design-spec.md) | The four-layer theme contract · full `void`/`lumen` token tables · effects catalog with degradation tiers · GSAP × Motion division of labor · GenUI visual language · performance budgets |
| [**02 · Architecture Spec**](./docs/specs/02-architecture-spec.md) | Next.js 16 conventions · DSH-Cordis dual-kernel plugin specs · the full Agent Harness (L0/L1/L2 permission model, triple cost gates) · content pipeline & data model · i18n · deployment topology |
| [**03 · State Spec**](./docs/specs/03-state-spec.md) | Six-layer state taxonomy · a decision tree for "where does this state live?" · store contracts · theme dual-track design |
| [**04 · Dependency Spec**](./docs/specs/04-dependency-spec.md) | Every dependency, version-locked with rationale · the "build vs. reuse" boundary · bundle budgets · frontier audit |

## 🗺 Roadmap

- [x] **M-1** — Specifications: design · architecture · state · dependencies
- [ ] **M0 — Foundation**: project skeleton · theme engine + `void`/`lumen` · site shell (nav, effects layer, ⌘K) · i18n routing
- [ ] **M1 — Content**: Agent-CMS (editor, diff review, publish) · MDX pipeline (Shiki/KaTeX/Mermaid/OG images) · ingest CLI · search v1
- [ ] **M2 — Kernel**: Cordis dual kernel · visitor agent · GenUI dual engine + theme-bridge · rate limiting & cost gates
- [ ] **M3 — Author side**: content agent workflows · comment enhancements · analytics dashboard
- [ ] **M4 — Ship**: ArgoCD pipeline · observability · performance budget verification · security audit

**Later**: semantic search v2 · blog-as-MCP · English translation pipeline · reserved themes

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
