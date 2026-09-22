# 01 · 设计规范（Design Spec）

> 项目：**shizurak**（blog.xrak.top）— 伍泽凯个人博客
> 状态：定稿候选 v1 · 2026-09-19
> 关联：[架构规范](./02-architecture-spec.md) · [状态管理规范](./03-state-spec.md) · [依赖规范](./04-dependency-spec.md) · [Harness 规范](./05-harness-spec.md)

---

## 0. 设计哲学

> ⚠️ 本节已被[幕语法 v2](../superpowers/specs/2026-09-19-curtain-grammar-design.md) §0 替换（三定律 G1–G3 + 拒绝清单以 v2 为准）。

### 0.1 三条美学公理

1. **极简工业风 = 信息密度即美**。每一个像素都要有职责：装饰即信息（HUD 遥测显示的是真实数据），留白即结构（网格对齐而非随意间距）。参考坐标：SpaceX 控制台、NASA 任务面板、Vercel/Geist 的克制、Braun 工业设计。
2. **太空歌剧感 = 宏大叙事 + 精确执行**。震撼来自「尺度对比」：深空背景的无限 vs 等宽数字的精确；缓慢庄严的场景运动 vs 毫秒级的微交互响应。绝不廉价炫技——每个特效有明确的性能预算与降级路径。
3. **双重人格 = 一个内容，两种宇宙**。同一篇文章、同一个 AI 回答，在 `void` 下是深空 HUD 遥测卡，在 `lumen` 下是苹果风干净卡片。主题不是皮肤，是完整体验契约（见 §1）。

### 0.2 五条设计铁律

| # | 铁律 | 说明 |
|---|------|------|
| L1 | **动效不写进 React state** | GSAP 用 `useGSAP` scope 自管理；motion 用 variants。需要 UI 反映动画进度时走 `useSyncExternalStore` 桥接，禁止 `setState` 每帧 |
| L2 | **时长与曲线从主题取** | 所有 duration/easing 来自 `theme.motion`，代码中禁止魔法数字（`0.3`、`cubic-bezier(...)` 直接写死视为违规） |
| L3 | **特效必须可降级** | 每个特效声明：性能预算 → 低端设备降级 → `prefers-reduced-motion` 静态化，三级路径缺一不可 |
| L4 | **GSAP 与 Motion 不争同一属性** | 同一元素同一属性（如 `opacity`）只归一个系统管；交接时用明确的所有权边界（见 §6.1） |
| L5 | **AI 参与透明** | 每篇文章标注 AI 参与度（人写 / AI 辅助 / AI 生成+人工审核），呈现为 HUD 徽章或极简脚注——「一切 AI 生成」的诚实化 |

---

## 1. 主题契约（Theme Contract）

多主题交汇架构的核心：**主题不是配色方案，是四层体验声明**。跳脱非黑即白的关键在于——任意主题可以只覆写其中任意层，组合出无限人格。

### 1.1 四层模型

```
Theme = tokens ⊕ motion ⊕ effects ⊕ genui
        │          │         │          │
        │          │         │          └─ GenUI 皮肤：agent 生成的界面随主题换装
        │          │         └─ 特效材质：背景渲染器 / overlay / 光标 / HUD
        │          └─ 动效人格：easing 语言 / 时长阶 / 编排模式 / 滚动强度
        └─ 设计令牌：色彩 / 排版 / 间距 / 形状 / 阴影 / 质感 → CSS variables
```

- **tokens** → 编译为 CSS variables（Tailwind 4 `@theme inline` 映射），零运行时开销
- **motion / effects / genui** → 运行时对象，经 theme store 广播给 GSAP、特效层、GenUI 渲染器
- 四层解耦：新主题可以复用 `void` 的 motion 只换 tokens（如 `terminal` = 终端绿 tokens + precise motion + CRT 特效）

### 1.2 TypeScript 契约定义

```ts
// src/themes/contract.ts
import type { Transition } from 'motion/react'

export interface ThemeMeta {
  id: string                       // 'void' | 'lumen' | ...
  name: string                     // 展示名（中文）：'深空' | '流明'
  nameEn: string                   // 'Void' | 'Lumen'
  description: string              // 切换器中的一句话
  modes: Array<'light' | 'dark'>   // 支持的模式（首个为默认）：void 仅 ['dark']；lumen 双模 ['light','dark']
  status: 'stable' | 'preview' | 'reserved'
  preview: { accent: string; bg: string; hasFx: boolean }  // 切换器预览色块
}

export interface ThemeTokens {
  color: {
    bg: string; bgElevated: string; surface: string; surfaceHover: string
    ink: string; inkSecondary: string; inkMuted: string; inkFaint: string
    accent: string; accentHover: string; accentInk: string   // accentInk = accent 上的文字色
    border: string; borderStrong: string
    danger: string; success: string; warning: string
    glow: string                   // 光晕（HUD 辉光特效专用）
  }
  typography: {
    sans: string; mono: string; display: string              // font-family 栈
    scale: Record<
      'display' | 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'micro',
      { size: string; lineHeight: string; tracking: string; weight: number }
    >
  }
  space: { unit: number; containerMax: string; gutter: string; sectionY: string }
  shape: { radiusSm: string; radiusMd: string; radiusLg: string; borderWidth: string }
  elevation: { shadowSm: string; shadowMd: string; glow: string }
  texture: { noiseOpacity: number; gridOpacity: number; scanlineOpacity: number }
}

export interface ThemeMotion {
  personality: 'cinematic' | 'precise' | 'playful' | 'calm'
  easing: { entrance: string; exit: string; emphasis: string; scroll: string }
  duration: { micro: number; ui: number; section: number; scene: number }   // ms
  gsap: { defaults: gsap.TweenVars; ease: string }           // 主题注册时写入 gsap.defaults()
  spring: { ui: Transition; layout: Transition }             // motion/react 预设
  scrollIntensity: number          // 0–1：滚动叙事强度（ScrollTrigger scrub 与视差深度）
}

export interface ThemeEffects {
  background: 'nebula' | 'starfield' | 'none' | 'paper-grain'
  overlays: Array<'scanline' | 'grain' | 'grid' | 'vignette'>
  cursor: 'reticle' | 'default'
  hud: boolean                     // HUD 遥测装饰（真实数据）
  intensity: number                // 0–1 默认强度（用户可覆盖）
}
// 注：特效实现不在此声明——主题是纯数据；字符串 id 由 lib/fx/registry.ts 解析为
// 动态 import（mermaid 式分包），themes/ 目录禁止依赖 React 组件

export interface ThemeGenUI {
  catalogVariant: 'hud' | 'clean'  // json-render 组件皮肤
  openuiVariant: 'hud' | 'clean'   // OpenUI 组件皮肤
  streamReveal: { stagger: number; effect: 'fade' | 'decode' }  // 流式显现节奏
}

export interface Theme {
  meta: ThemeMeta
  /** 继承另一主题（可选）：新主题只需覆写四层中任意一层，
   *  其余从基座浅合并。例：terminal = extends 'void' + tokens override */
  extends?: string
  tokens: ThemeTokens
  motion: ThemeMotion
  effects: ThemeEffects
  genui: ThemeGenUI
}
```

### 1.3 主题注册与解析

```
src/themes/
├── contract.ts          # 上述契约 + 校验
├── registry.ts          # 静态注册表（构建时全量已知）
├── void/
│   ├── index.ts         # Theme 定义（纯数据，零 React 依赖）
│   ├── tokens.css       # CSS variables（单模主题一套，双模主题 [data-mode] 两套；由 tokens.ts 构建期生成）
│   └── genui.tsx        # HUD 皮肤组件变体（GenUI 皮肤，M2 起用）
├── lumen/               # 同构（无 effects，load 返回空）
└── reserved/            # terminal / paper / cyber 的占位清单
```

> 引擎（解析/注入）在 `src/lib/themes/`（`resolve.ts` 纯函数 · `css.ts` 变量注入 · `inject.ts` RSC 直出 · `ssr.ts` cookie→ResolvedTheme 供 RSC 通道），主题定义目录只做声明——**定义与引擎分离**（架构规范 §3 边界规则）。

解析顺序：`registry[id]` → **若 `extends` 先浅合并基座主题**（子覆写的层胜出）→ 应用用户 overrides（§1.5）→ 按当前 mode 取 tokens → 输出 `ResolvedTheme`（tokens 合并 + motion 缩放 + effects 强度覆盖 + `previousResolved` 供特效层 fade-out 卸载旧层）。**解析是纯函数**，可在 RSC 与客户端同构运行（RSC 侧经 `ssr.ts` 从 cookie 解析）。

### 1.4 运行时切换机制

双轨制，单一事实源：

| 轨道 | 载体 | 职责 |
|------|------|------|
| DOM 轨道 | `next-themes` 管 `<html data-theme="void">` + `data-mode` | SSR 无闪烁、CSS variables 生效、Tailwind `dark:` 变体 |
| 运行时轨道 | Zustand `theme-store` | 持有 `ResolvedTheme` 对象，广播给 GSAP / 特效层 / GenUI 渲染器 |

- **主题与模式是正交两维**：`data-theme`（主题人格）× `data-mode`（明暗）。单模主题（void）忽略模式切换器；双模主题（lumen）的切换器含 明/暗/跟随系统 三态（next-themes 原生）
- 切换入口统一走 `theme-store.setTheme(id)`，由 store 同步写 `next-themes`（`setTheme`）——**禁止组件直接调 next-themes**
- 切换时：tokens 立即生效（CSS 变量）；特效层异步换装（旧特效 fade out → 卸载 → 新特效 dynamic import → fade in），过渡 ≤ 400ms
- 首屏：**RSC 直出 tokens**——服务端把当前 mode 的 CSS variables 直接写进 `<html style={...}>`（`inject.ts`），`data-theme` 由 next-themes 内联脚本在 hydration 前写入；零 FOUC / 零 CLS，特效层在 `requestIdleCallback` 后启动（不阻塞 LCP）
- 切主题时 tokens 生效方式：替换 `<style id="theme-tokens">` 节点（而非逐条改行内 style），**< 40ms**（§10）

### 1.5 个性化微调系统（顶尖个性化自定义）

用户可在基座主题上叠加**运行时微调**（存 localStorage，可 URL 分享）：

```ts
export interface ThemeOverrides {
  accentHue?: number            // -180..180 色相旋转（OKLCH 计算，保持感知亮度）
  effectsIntensity?: number     // 0..1 覆盖主题默认强度
  motionSpeed?: number          // 0.5..2.0 全局时长倍率（写进 motion.duration 缩放）
  background?: boolean          // 背景特效总开关
  overlays?: Partial<Record<'scanline'|'grain'|'grid'|'vignette', boolean>>
  cursor?: boolean              // 自定义光标开关
}
```

- 分享码：`?theme=void&ov=<base64url(JSON)>`（nuqs 解析，进入页面即还原）
- 微调面板 UI：主题切换器内的「高级」抽屉，实时预览（滑块拖动即时生效）
- **accent 色相旋转用 OKLCH 空间**（`oklch(from var(--accent) l c calc(h + var(--hue-rotate)))`），避免 HSL 旋转导致的感知亮度跳变
- `@property --hue-rotate` 注册为 `<angle>` 类型 → 色相旋转本身可 `transition` 动画（不是硬跳）
- **theme:check 全角度校验**：色相旋转到 −180..180 任意角度都不得跌破边框 3:1 / 正文 7:1 对比度（OKLCH 的 L 分量旋转时不自动补偿，黄区尤易破线）

### 1.6 主题分包与性能（架构红利）

| 资源 | void | lumen |
|------|------|-------|
| tokens.css | ~2KB | ~2KB |
| 特效层 JS（nebula/starfield/hud…） | ~45KB gz（**懒加载，idle 后**） | **0（不下载）** |
| 特效层 GLSL | ~8KB | 0 |
| GenUI 皮肤 | ~6KB（懒加载） | ~4KB |

规则：特效唯一入口是 `lib/fx/registry.ts`（`effects.background` 字符串 id → 动态 import）；`lumen` 的 `background` 为 `'none'`，**永不请求特效 chunk**。构建产物按特效分 chunk，访客只下载当前主题实际引用的代码。

---

## 2. 首发主题规格

> ⚠️ 本节已被[幕语法 v2](../superpowers/specs/2026-09-19-curtain-grammar-design.md) §1–§2 替换（`void` 人格重铸为「幕」，tokens/动效/特效以 v2 为准）。

### 2.1 `void` · 深空（极客黑 · 太空歌剧）

**模式**：仅 `dark`（深空没有白天）。**人格**：cinematic — 缓慢庄严的入场（1.2s 级）、滚动叙事、深空尺度感。

**色彩令牌**（深空蓝黑系 + 仪表盘青 + 遥测琥珀）：

| Token | 值 | 用途 |
|-------|-----|------|
| `bg` | `#05060a` | 深空底色（带 2% 蓝，纯黑显廉价） |
| `bgElevated` | `#0a0c12` | 悬浮层 |
| `surface` | `#0e1118` | 卡片 |
| `surfaceHover` | `#131722` | 卡片 hover |
| `ink` | `#e8ecf1` | 主文字（冷白，非纯白） |
| `inkSecondary` | `#aab3c0` | 次级 |
| `inkMuted` | `#8b95a5` | 辅助 |
| `inkFaint` | `#525c6b` | 装饰文字 |
| `accent` | `#5eead4` | 仪表青（主交互、链接、HUD 高亮） |
| `accentHover` | `#7ff0dd` | — |
| `accentInk` | `#04211c` | accent 上的文字 |
| `border` | `rgba(148,180,200,0.10)` | 常规边框 |
| `borderStrong` | `rgba(94,234,212,0.30)` | 强调边框（HUD 刻度） |
| `glow` | `rgba(94,234,212,0.35)` | 辉光 |
| `warning` | `#fbbf24` | 遥测琥珀（警示、次要高亮） |
| `danger` | `#fb7185` | 警示玫红 |
| `success` | `#4ade80` | 状态绿 |

**排版**：西文/数字 `Geist Sans`，等宽 `Geist Mono`（**全主题统一**，识别度锚点），中文 `Noto Sans SC`（subset）。display 字重 600、tracking `-0.02em`；正文 400/1.75 行高；HUD 数字全部等宽 + `font-variant-numeric: tabular-nums`。

**形状**：`radiusSm 2px / radiusMd 4px / radiusLg 6px`（**近乎直角**——工业感），`borderWidth 1px`；卡片用切角（`clip-path: polygon(...)` 8px 切角）替代圆角。

**质感**：noise 0.03 / grid 0.05 / scanline 0.04（默认强度 0.7）。

**动效**：entrance `cubic-bezier(0.16, 1, 0.3, 1)`（expo-out，庄严收尾）；exit `cubic-bezier(0.7, 0, 0.84, 0)`；duration micro 120 / ui 280 / section 800 / scene 1600；scrollIntensity 0.9；spring ui `{ stiffness: 260, damping: 30 }`。

**特效层**（全部受 `effectsIntensity` 缩放）：
1. `nebula` — WebGL2 fragment shader 星云（fbm 域扭曲噪声），uniforms：time/mouse/intensity/accent；DPR 上限 1.5
2. `starfield` — 3 层视差星野 + 偶发流星；Canvas 2D；页面隐藏时暂停
3. `hud-grid` — SVG 网格 + 坐标刻度，低透明度，滚动视差
4. `telemetry` — HUD 遥测条（**真实数据**：文章数 / 项目数 / 运行时长 / UTC 时钟），数字滚动用 `@number-flow/react`
5. `scanline` + `grain` — CSS/SVG overlay，静态帧（零持续开销）
6. `reticle` — 十字准星光标 + 拖尾（仅 `pointer: fine` 设备）
7. `launch-hero` — 首页发射序列（见 §8.1）

**GenUI 皮肤 `hud`**：切角卡片 + 顶部刻度尺 + 等宽数字 + 数据更新闪烁 + 边框辉光；流式显现 `decode`（文字解码效果，stagger 24ms）。

### 2.2 `lumen` · 流明（OpenAI × Apple 极简）

**模式**：双模 `['light', 'dark']`（默认 light）。**人格**：precise — 克制的微动效（0.35s 级）、大留白、无装饰。

**色彩令牌**：

| Token | Light | Dark |
|-------|-------|------|
| `bg` | `#ffffff` | `#0d0d0d` |
| `bgElevated` | `#fafafa` | `#141414` |
| `surface` | `#ffffff` | `#161616` |
| `ink` | `#1a1a1a` | `#ececec` |
| `inkSecondary` | `#4a4a4a` | `#b8b8b8` |
| `inkMuted` | `#6b6b6b` | `#8a8a8a` |
| `accent` | `#0071e3` | `#0a84ff` |
| `border` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.10)` |

**排版**：西文 `Inter`，中文 `Noto Sans SC`，等宽 `Geist Mono`。display 字重 600、tracking `-0.03em`（苹果式紧排）；正文 400/1.7；段落最大宽度 `68ch`。

**形状**：`radiusSm 8px / radiusMd 12px / radiusLg 18px`；阴影柔和分层（`0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06)`）。

**动效**：entrance `cubic-bezier(0.25, 0.1, 0.25, 1)`；duration micro 100 / ui 220 / section 400 / scene 600；scrollIntensity 0.15（几乎无滚动特效，仅淡入）；spring ui `{ stiffness: 400, damping: 40 }`。

**特效层**：`background: 'none'`，`overlays: []`，`cursor: 'default'`，`hud: false`，`load: undefined`——**零特效代码**。

**GenUI 皮肤 `clean`**：16px 圆角卡片、细边框、柔和阴影、系统感排版；流式显现 `fade + slide-up`（stagger 30ms）。

### 2.3 预留主题与新增清单

预留（`status: 'reserved'`，仅注册元信息占位）：`terminal`（终端绿 + CRT 特效 + precise motion）· `paper`（纸墨 + 霞鹜文楷 + paper-grain 背景 + calm motion）· `cyber`（赛博朋克 + 霓虹 + playful motion）。

**新增一个主题 = 5 步**（架构验收标准）：
1. `themes/<id>/` 目录：`index.ts`（Theme 定义）+ `tokens.css`
2. 注册进 `registry.ts`
3. （可选）覆写 `motion` / `effects` / `genui` 任意层
4. （可选）实现特效层 `load()`
5. 跑 `pnpm theme:check <id>`（契约校验：token 完整性、对比度 AA、特效预算声明）

---

## 3. 排版系统

### 3.1 字族策略（中文字体是重点工程）

| 用途 | 字体 | 加载策略 |
|------|------|----------|
| 中文正文 | Noto Sans SC Variable | **cn-font-split 按 unicode-range 分片自托管**（每片 ≤ 100KB），首屏常用片 `<link rel="preload">`，其余按需 |
| 中文（paper 主题预留） | 霞鹜文楷 LXGW WenKai | 同策略，按主题懒加载 |
| 西文 sans | Geist Sans（void）/ Inter（lumen） | `next/font/local` 自托管 variable |
| 等宽 | Geist Mono | 全主题统一；`tabular-nums` 用于一切数字展示 |
| 数学 | KaTeX 自带字体 | 按需（含公式的文章才加载） |

### 3.2 字阶（type scale）

| 级别 | size / lineHeight / tracking | 用途 |
|------|------------------------------|------|
| display | `clamp(2.5rem, 6vw, 4.5rem)` / 1.05 / -0.03em | 首页 hero |
| h1 | `clamp(2rem, 4vw, 3rem)` / 1.15 / -0.02em | 文章标题 |
| h2 | `1.75rem` / 1.3 / -0.01em | 章节 |
| h3 | `1.25rem` / 1.4 / 0 | 小节 |
| body | `1.0625rem` / 1.75 / 0 | 正文（17px，中文阅读舒适区） |
| small | `0.875rem` / 1.6 / 0.01em | 辅助 |
| micro | `0.75rem` / 1.5 / 0.06em / uppercase | HUD 标签、徽章 |

### 3.3 中英混排与分语言排版规则

- 中英文之间自动空格（`text-autospace` + 兜底 remark 插件处理内容层）
- 中文标点用全角，代码/URL 内用半角
- 行高：中文正文 ≥ 1.7（西文可 1.6）
- 禁止中文两端对齐（`text-align: justify` 中文场景禁用）
- **分语言细则**（i18n 预适配，架构规范 §6.4）：
  - `zh`：正文 1.75 行高、段落最大宽度 `68ch`、tracking 0
  - `en`：正文 1.6 行高、段落最大宽度 `72ch`、display 标题 tracking 收紧至 `-0.03em`（西文大字号需要负字距）
  - 由根布局的 `lang` 参数驱动（`[lang="en"]` 选择器微调），组件代码零分支

---

## 4. 色彩系统

- **命名规范**：语义 token（`bg/surface/ink/accent/border/...`），禁止组件里出现原始色值或 Tailwind 调色板类（`bg-zinc-900` 违规）
- **对比度**：正文 ≥ 7:1（AAA），大字号 ≥ 4.5:1，UI 边框 ≥ 3:1；`pnpm theme:check` 自动校验
- **状态色**：danger/success/warning 全主题必须定义（HUD 场景高频使用）
- **透明色统一用 `rgba` 或 `color-mix()`**，禁止 `opacity` 属性实现颜色淡化（会连累子元素）
- 深色主题禁用纯黑 `#000`（void 用 `#05060a`）；浅色主题禁用纯白背景大面积（lumen light 用 `#fff` 但 surface 分层 `#fafafa`）

---

## 5. 特效目录（Effects Catalog）

> ⚠️ 本节已被[幕语法 v2](../superpowers/specs/2026-09-19-curtain-grammar-design.md) §5 替换（rift-layer 常驻底噪 + hum 体系；HUD 遥测/扫描线/星野等已入拒绝清单）。

每个特效必须声明：**预算 / 降级 / reduced-motion** 三级路径。

**实现顺序**（M0 先以 `starfield` 验证特效管线，其余递增）：`starfield`（M0）→ `hud-grid` / `telemetry`（M1）→ `nebula` WebGL shader（M1）→ `scanline`/`grain`/`reticle`/`launch-hero`（M1.5 打磨）。

| ID | 主题 | 实现 | 性能预算 | 低端降级 | reduced-motion |
|----|------|------|----------|----------|----------------|
| `nebula` | void | WebGL2 fragment shader | 1080p 60fps；DPR ≤ 1.5；GPU 占用 < 25% | 降 DPR 至 1 + 降采样 0.5x；再降 → 静态渐变图 | 静态渐变 |
| `starfield` | void | Canvas 2D 3 层 | 60fps；星数 ≤ 300（按面积缩放） | 星数减半 + 停闪烁 | 静态星点图 |
| `hud-grid` | void | SVG/CSS | 零持续开销（纯静态 + transform 视差） | 关视差 | 静态 |
| `telemetry` | void | DOM + number-flow | 1s 定时器；数字变化才触发动画 | 关动画直接更新 | 静态数字 |
| `scanline`/`grain` | void | CSS/SVG 静态帧 | 零 JS | — | 保留（静态无害）或关 |
| `reticle` | void | DOM + rAF | 仅 pointer:fine；rAF 节流 | 触摸设备禁用 | 禁用 |
| `launch-hero` | void | GSAP timeline + Canvas 粒子 | 一次性 3.2s；粒子 ≤ 800 | 简化序列（无粒子，仅视差+文字） | 直接呈现最终态 |

**设备分级**（`lib/fx/tier.ts` 自动探测）：`high`（WebGL2 + deviceMemory ≥ 8 + 非省电模式）/ `mid`（WebGL2）/ `low`（无 WebGL2 或 `saveData`）→ 对应完整 / 降采样 / 静态。用户可在个性化面板强制覆盖。

---

## 6. 动效语法（Motion Grammar）

> ⚠️ 本节已被[幕语法 v2](../superpowers/specs/2026-09-19-curtain-grammar-design.md) §6 替换（转场词汇收敛为 T1 撕幕 / T2 垂帘 / T3 拉焦，一次转场只用其一）。

### 6.1 三系统分工律（GSAP × motion × ViewTransition，铁律 L4 展开）

| 系统 | 管辖 | 典型场景 |
|------|------|----------|
| **GSAP** | 时间线编排、滚动驱动（ScrollTrigger）、Canvas/Shader、SVG 路径、**同页** FLIP 重排、文字分割（SplitText） | 发射序列、滚动叙事、星云 uniform 驱动、标题逐字显现 |
| **motion** | React 状态驱动的出现/消失（AnimatePresence）、**同页**布局动画（`layout` / `layoutId`）、手势（drag/hover/tap）、列表增删 | GenUI 卡片流式入场、对话框、同页列表重排、按钮反馈、Tab 切换 |
| **React `<ViewTransition>`** | **跨页 shared element morph**、Suspense reveal、方向性导航、主题切换整站 morph（原生、声明式、零额外依赖） | 文章卡→文章页 hero、星空层跨页持续、void↔lumen 换肤 morph |

**所有权边界**：元素进入「场景编排」归 GSAP（`useGSAP` scope）；「状态响应」归 motion（variants）；「跨路由同一性」归 ViewTransition（`name` 匹配）。同一元素同一属性不得双写——如卡片入场由 GSAP 完成后，后续 hover 反馈交 motion（GSAP timeline `onComplete` 后移除 inline 属性）。**跨页转场不再用 GSAP Flip**（Flip 退居「同页重排」）。

**GSAP 插件清单**（3.15 起全部免费，Webflow 收购后无 Club 门槛）：ScrollTrigger · SplitText · Flip · CustomEase · Observer。`gsap.registerPlugin()` 在 `lib/motion/gsap.ts` 统一执行；每主题的 `motion.gsap.defaults` 在主题切换时写入 `gsap.defaults()`。

### 6.2 编排模式（每主题按人格取用）

| 模式 | void（cinematic） | lumen（precise） |
|------|-------------------|------------------|
| 页面入场 | 场景序列：背景先行 → 标题 decode → 内容 stagger 上浮（总 1.2–1.6s） | 统一 fade+8px 上浮，stagger 40ms（总 ≤ 400ms） |
| 滚动叙事 | ScrollTrigger scrub 视差 + pin 章节（scrollIntensity 0.9） | 仅 IntersectionObserver 淡入（0.15） |
| 路由转场 | **React `<ViewTransition>`**：星空层跨页持续（`view-transition-name: fx-root`）+ 内容 shared element morph + `nav-forward/nav-back` 方向感 | 快速 fade（150ms，同用 ViewTransition `default="none"` 精准命名） |
| 微交互 | hover 辉光 + 刻度线响应（120ms） | hover 微缩放 + 背景变化（100ms） |
| 文字 | SplitText 逐字 decode | 整体 fade |

### 6.3 reduced-motion 降级表

`prefers-reduced-motion: reduce` 时**全局强制**：所有 GSAP 时间线 `timeScale(1000)` 直达终态或替换为 ≤150ms opacity 过渡；视差/scrub 关闭；自动播放的循环动画（星野漂移除外——纯环境运动保留但减速 50%）。ViewTransition 用 `@media (prefers-reduced-motion: reduce) { ::view-transition-old(*), ::view-transition-new(*), ::view-transition-group(*) { animation-duration: 0s !important } }` 一键静态化。降级逻辑在 `lib/motion/reduced.ts` 统一封装，组件不得自行判断。

### 6.4 跨页转场与主题 morph（View Transitions）

本项是「太空歌剧高级感」最狠的一抹原生利器（React 19.2 + Next 16.3.5 App Router 无配置可用）：

- **跨页 shared element**：列表卡与详情页 hero 包同名 `<ViewTransition name={`post-${slug}`}>`——点卡即 morph 到文章页，返回反向；无 VT 支持的浏览器自然降级为普通导航
- **星空层跨页持续**：`FxLayer` 根节点 `style={{ viewTransitionName: 'fx-root' }}` + `::view-transition-old(fx-root){ display:none }`——背景不动、内容变
- **方向感导航**：`<Link transitionTypes={['nav-forward']}>` / `['nav-back']`，CSS 伪元素分派左滑/右滑；命令面板跳转用自定义 `nav-command`（void 上是 HUD 引导感）
- **Suspense reveal**：骨架屏 `exit="slide-down"` + 内容 `enter="slide-up"`，非对称时长（退场快、入场缓，官方指南 Step 2）
- **主题切换整站 morph**：`setTheme` 包一次 `document.startViewTransition(() => apply(...))`——切角→圆角、深空→白底、accent 全站的 **一次性跨主题 morph**（可能最炸的一个体验设计）
- **保持可交互**：`::view-transition { pointer-events: none }`，避免转场期间丢点击；转场时长控短
- lumen 滚动进度条用 **CSS 原生 `animation-timeline: scroll(root)`**（零 JS），与「零特效代码」承诺一致

---

## 7. GenUI 视觉规范

> ⚠️ 本节已被[幕语法 v2](../superpowers/specs/2026-09-19-curtain-grammar-design.md) §7 替换（HUD 皮肤改 stitch 缝补 / clean 双皮肤，预算表以 v2 为准）。

### 7.1 三引擎职责（视觉层视角）

| | json-render | OpenUI | **RSC** |
|---|-------------|--------|---------|
| 视觉定位 | **数据仪表**：绑定真实数据的结构化卡片 | **即兴画布**：对话式探索的动态界面 | **服务端直出**：一次性展示 / SEO 分享页 / OG |
| 组件规模 | 精选 ~15 个领域组件（少而精） | ~25 个（含布局原语，组合自由） | 与上两者**共用同一 catalog**（registry-server 变体） |
| 流式显现 | JSONL patch 增量渲染，新节点 stagger 入场 | OpenUI Lang 逐行渲染，`decode`/fade 显现 | Server Action 流 + Suspense 挂载（客户端零注册表） |
| 视觉锚点 | 数据准确性、可扫读 | 惊喜感、可探索 | 首屏即正确、可被搜索引擎索引 |

> 三引擎的**唯一 catalog 真源**与路由规则见 [05 · Agent Harness 规范](./05-harness-spec.md) §3–§5；皮肤变体（hud/clean）由 theme-bridge 统一解析。

### 7.2 json-render 组件目录（博客领域 catalog）

`PostCard` · `PostList` · `ProjectPanel` · `AwardTimeline` · `MetricGrid`（遥测指标组）· `CompareTable` · `MiniChart`（自绘 SVG 折线/柱状，主题化，不引图表库）· `Callout` · `LinkGrid` · `Timeline` · `StatDelta` · `CodeSnippet` · `QuoteBlock` · `ImageFigure` · `ActionButton`（绑定 ui-action）

每个组件接收**语义化 props**（如 `PostCard: { slug, title, summary, tags, publishedAt, readingTime }`），Zod schema 在 `src/components/genui/catalog.ts` 定义——**catalog 即契约**，系统提示词由它自动生成。

### 7.3 主题桥接规则（theme-bridge 插件）

- GenUI **spec 与皮肤分离**：spec 只含语义数据，皮肤在渲染时由当前主题决定
- `<Renderer>` 的 registry 按 `theme.genui.catalogVariant` 解析到 `hud` 或 `clean` 组件实现
- 主题切换时：已渲染的 GenUI 卡片**原地换装**（motion layout 动画过渡，不重新请求）——**仅 Data Stream 通道（json-render/openui）**
- **RSC 通道换肤规则**：RSC 无客户端状态，切主题不能原地换肤——服务端按 cookie 的 `ResolvedTheme` 选 `registry-server` 变体重渲染（访客主题不变时首屏直出已正确，无需重放）
- 流式显现节奏取 `theme.genui.streamReveal`（void: decode 24ms / lumen: fade 30ms）

### 7.4 流式视觉节奏

- 生成中：骨架屏用主题化的「扫描」形态（void: 扫描线扫过切角框 / lumen: 柔和 shimmer）
- 首个 token 到达 ≤ 800ms（P50）；期间显示思考态（void: 遥测文字轮播 / lumen: 三点脉冲）
- 长回答：分段显现，每段完成即固定（不整篇等完）；表格/图表最后锚定

### 7.5 OG 图与分享同源

- OG / 社交图不再手写模板：优先用 **`@json-render/image`** 直接渲染「分享方当时那份 spec」（`spec-store` 取 spec + `theme_id`）——OG 与站点 GenUI 卡片**完全同源**，切换主题 OG 跟着换肤（void: 深空 + HUD 框 / lumen: 大字排版）
- 分享 URL 携带 `?theme=<id>&ov=<base64url>`，接收方还原分享方当时的视觉（设计规范 §1.5）

---

## 8. 页面级设计

> ⚠️ 本节已被[幕语法 v2](../superpowers/specs/2026-09-19-curtain-grammar-design.md) §8 替换（首页三幕信纸、名录 mono 化、验收清单以 v2 为准）。

### 8.1 首页（`/`）

**void 版 —— 发射序列**（`launch-hero`，一次性 3.2s，仅首访；回访直接呈现终态）：
1. **T-3s 倒计时**：等宽数字 + HUD 环形进度，遥测文字滚动（真实数据：文章数/项目数/当前 UTC）
2. **点火**：视口边缘辉光脉冲 → 星野加速 → 粒子上升（Canvas，≤800 粒子）→ 轻震屏（±2px，可关）
3. **升空**：背景层视差上移，标题 SplitText 逐字 decode：「伍泽凯 / 从生产环境里长出来的技术」
4. **入轨**：遥测条归位 → 精选文章卡片 stagger 入场 → 滚动提示（向下箭头 + "进入轨道"）

结构（自上而下）：hero（全屏）→ 精选文章（3–4 张 HUD 卡）→ 项目星座（项目以「轨道节点」隐喻：中心个人，环绕 Rak/FlowMind/XRAK/机器人，hover 展开档案卡）→ 最新动态（timeline）→ 关于摘要 → footer（遥测条：© / RSS / 状态）。

**lumen 版**：同一内容结构——大标题两行（600 字重紧排）→ 一句话简介 → 精选文章列表（纯排版，无卡片）→ 项目行 → footer。入场 fade 400ms。**零特效代码加载**。

### 8.2 文章页（`/posts/[slug]`）

- 顶部：阅读进度条（void: HUD 遥测样式 / lumen: 细线）
- 正文：最大宽度 `68ch`；Shiki 双主题代码块（复制按钮、行高亮、diff 标记、终端窗样式）；KaTeX 公式；Mermaid 主题化渲染；图片灯箱
- 侧边：TOC 滚动高亮（移动端折叠为浮动按钮）
- 头部元信息：日期 / 阅读时间 / 标签 / **AI 参与度徽章**（铁律 L5）
- 结尾：「问 AI 关于这篇文章」入口（page-context 注入文章，GenUI 回答）+ 相关文章 + Waline 评论区
- 段落级「问 AI 这一段」：hover 触发 **RSC Server Action**（页内一键解释，零客户端 JS，不走 chat 主链，见 05 §4）
- OG 图：`@json-render/image` 渲染分享方 spec（主题化，与站点 GenUI 同源，§7.5）

### 8.3 项目页（`/projects`）

项目档案（Rak 集群 / FlowMind / XRAK / 机器人系列）：结构化字段（定位/技术栈/状态/链接/战绩）→ 渲染为 `ProjectPanel` GenUI 组件。支持 agent 交互：「对比 Rak 和 FlowMind 的技术栈」→ 生成 `CompareTable`。

### 8.4 关于页（`/about`）

- 只取**公开素材**（个人经历/能力总览/奖项速查——**严禁触碰隐私文件**）
- 奖项用 `AwardTimeline` 组件呈现（国一/国二/省金…按级别色标）
- 叙事：一句话定位 → 能力矩阵 → 奖项时间线 → 联系入口

### 8.5 实验室（`/lab`）

GenUI playground：访客直接体验**三引擎**（预设 prompt 画廊 + 自由输入），展示 json-render（数据）、OpenUI（即兴）与 **RSC（服务端直出）** 的能力差异。同时是 blog-as-MCP 的演示面。`/lab/s/[id]` 分享页首屏走 RSC（SEO 可索引）。

### 8.6 管理台（`/admin`）

- 仪表盘：访问统计（自研埋点数据）→ `MetricGrid` + `MiniChart`；agent token 用量
- 文章管理：列表 / 编辑（TipTap 富文本 + CodeMirror 源码双模式）/ **diff 审核视图**（agent 草稿逐段采纳/拒绝）/ 发布
- 素材库：vault 摄取来的 materials 列表 → 「生成草稿」一键触发 content-agent
- Agent 工作台：作者侧对话（维护任务：翻译/摘要/回复建议/SEO）
- 视觉：跟随主题（admin 也换肤），但默认信息密度更高（工具属性）

---

## 9. 无障碍（A11y）

- **键盘**：全部交互可达；⌘K 命令面板 / 焦点环（void: 青色描边 / lumen: 系统蓝）；跳过导航链接
- **屏幕阅读器**：GenUI 流式内容 `aria-live="polite"` 节流播报（每段完成播报一次，非逐 token）；特效层全部 `aria-hidden`
- **对比度**：见 §4；`theme:check` 强制校验
- **reduced-motion**：见 §6.3
- **色觉**：danger/success 不仅靠色相（加图标/形状）；HUD 刻度不依赖纯色区分
- **触控**：目标 ≥ 44×44px；reticle 光标触摸设备禁用

---

## 10. 性能预算（Performance Budget）

| 指标 | 目标 | 红线 |
|------|------|------|
| First-load JS（lumen 首页） | ≤ **140KB** gz | 180KB |
| First-load JS（void 首页，不含特效层） | ≤ **160KB** gz | 200KB |
| 特效层 JS（idle 后加载） | ≤ 45KB gz | 60KB |
| LCP（4G / 中端机） | ≤ 2.0s | 2.5s |
| CLS（RSC 直出 tokens 后） | ≤ 0.02 | 0.1 |
| INP | ≤ 200ms | 300ms |
| 主题切换（tokens 生效） | **< 40ms** | 100ms |
| 中文字体单片 | ≤ 100KB | 150KB |
| WebGL 首帧启动 | ≤ 150ms | 300ms |
| agent 首 token（P50） | **≤ 350–500ms** | 1.2s |
| RSC GenUI 服务端渲染 | ≤ 400ms（P95 800ms） | 1.2s（超时降级纯文本） |

CI 门禁：Lighthouse CI（移动端 Slow 4G）+ `size-limit` + `pnpm size`（bundle-analyzer）+ `theme:check`（主题契约，含 OKLCH 全角度对比度 / 焦点可见性 / hover-only 检测）。任何超预算的 PR 阻断合并。

---

## 11. 浮层体验契约（Overlay Contract）

浮层不是“弹窗几个框”，而是一套**跨主题一致的层级与行为契约**（Agent Dock / ⌘K / GenUI hover 卡 / L2 确认卡 / toast 共享同一套规则）。

### 11.1 z-index 语义分层（职责而非数字）

| 层 | z | 内容 | 约束 |
|----|:--:|------|------|
| 特效层 | **-10** | starfield / nebula / scanline / reticle | 永远 `z<0`、`aria-hidden`、`pointer-events: none`；不参与 stacking |
| 内容层 | 0 | 正文 |
| 粘性头/尾 | 10 | nav / footer |
| HUD 装饰 | 20 | 遥测条 / 阅读进度条 / 坐标刻度 | 静态、不可交互、`aria-hidden` |
| GenUI 内联浮层 | 30 | tooltip / hover 卡 |
| Agent Dock | 40 | 浮动/停靠两态（modeless） |
| Modal / ⌘K | 50 | 命令面板 / 对话框（modal） |
| Toast / 确认卡 | 60 | L2 审批 / 轻提示 |

**关键边界**：特效层与浮层不同一 stacking context（前者恒 z<0，后者从 z-20 起）——HUD 感与内容感不打架。

### 11.2 Agent Dock 三态

`hidden → floating（右下角，收起是 HUD 呼吸环 + 遥测脉冲）→ docked（右侧 480px，与内容并列）`。

- 用 **React `<Activity>`** 承载：切页时 Dock 不 remount，输入草稿 / 滚动位置 / 已生成 spec 全保留（effects 自动 cleanup）
- **主题切换时 Dock 位置与草稿完全不变**（`<Activity>` 保证）
- modeless：`aria-describedby` 而非 `aria-modal`（不捕焦点，不阻断阅读）
- lumen 下 floating 态是细边框圆点，**零特效代码**

### 11.3 通用浮层基座（`components/ui/*`）

- 一律 **Radix Portal → `document.body`**（避开 stacking context 灾难）
- **主题化阴影**：`shadow-[var(--overlay-shadow)]`（void: glow + 1px accent 描边 / lumen: 柔和 shadow）；焦点环取 `--focus-ring-color`
- **入场动效**：Radix `data-[state=open]` + motion variants（不用 GSAP），走主题 `motion.spring.ui`
- **reduced-motion**：只 opacity，不 translate
- **a11y**：modal 类焦点陷阱 + `aria-modal="true"` + `Esc` 关闭 + 触发元素焦点归位；Dock 例外（modeless）

### 11.4 L2 审批卡（Harness 浮层的主题化延伸）

- 来自 `UiAction.preview`（[05 §6.2](./05-harness-spec.md)）——title / summary / riskNote 经当前主题渲染：void = 红色切角告警框 + 遥测风“批准/拒绝”；lumen = 柔和 modal
- 进入 `agent-store.pendingActions` 队列，z-60；批准后执行一次

---

## 附：设计决策记录（ADR 摘要）

| # | 决策 | 理由 |
|---|------|------|
| D1 | 主题 = 四层契约而非配色 | 多主题交汇的根基；GenUI 换肤是差异化亮点 |
| D2 | 代码字体全主题统一 Geist Mono | 识别度锚点；跨主题的「同一个作者」感 |
| D3 | void 卡片用切角替代圆角 | 工业仪表感；与 lumen 的圆角形成人格对立 |
| D4 | 特效全部走 `effects.load()` 分包 | 「炫技」与「性能」不互斥的架构保证 |
| D5 | accent 微调用 OKLCH 旋转 | HSL 旋转亮度跳变毁质感 |
| D6 | MiniChart 自绘 SVG 不引图表库 | 主题一致性 + 包体预算；图表库的默认样式无法跨主题统一 |
| D7 | 跨页转场用原生 ViewTransition，GSAP Flip 退居同页 | React 19.2 + Next 16 无配置可用；声明式、零额外依赖、与 VT 伪类配合 |
| D8 | 主题切换包一次 `document.startViewTransition` | 整站跨主题 morph 是“两种宇宙”的最强体感表达 |
| D9 | 浮层独立成 §11 契约 | HUD 感与内容感不打架；Agent Dock 三态 + L2 审批卡跨主题一致 |
| D10 | 主题支持 `extends` 浅合并 | “新增主题 = 5 步”降到 2-3 步；四层可单独复用 |
| D11 | OG 图用 `@json-render/image` 渲染分享 spec | 数据/OG 同源；不手写模板且随主题换肤 |
