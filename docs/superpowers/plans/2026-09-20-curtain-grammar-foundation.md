# 幕语法之基（Curtain Grammar Foundation）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把设计语言 v2「幕语法」（Rift Grammar）落地到现有 M0–M2 代码：契约 v2 + 幕人格 tokens + 常驻 `rift-layer` WebGL 底噪层 + T1/T2/T3 转场语法 + 留白页面重构 + GenUI stitch 皮肤 + 审计门禁。

**Architecture:** 四层主题契约保持架构不变、字段换代（`effects.renderer` 取代挂件清单，全站在 `FxLayer` 挂载点唯一常驻一个 ogl 全屏 quad shader 层）；转场以 View Transitions API 为骨架（clip-path 撕幕/崩解遮罩）+ shader uniform 同步演出为血肉；篇章人格（生成侧）不在本计划内，见 spec §5，待 CMS persona 字段落地后另出计划。

**Tech Stack:** Next.js 16.3 / React 19.2 / Tailwind 4 / **ogl（新增，~10KB gz）** / gsap 3.15（ScrollTrigger 已在）/ motion 13 / vitest / playwright / biome

**设计依据（执行者必读）：**
- 设计语言定稿：`docs/superpowers/specs/2026-09-19-curtain-grammar-design.md`（下称 spec）
- 三份第三方基准：`docs/design-refs/{linear.app,vercel,supabase}.DESIGN.md`
- 实施时调用已装 skill：`impeccable`（质感底线，其 craft-floor 与 spec 冲突时 **spec 优先**）、`baseline-ui`（收尾扫描）

**Global Constraints:**
- 铁律不变：动效不写 React state；时长/easing 一律取 `theme.motion`，禁魔法数字；特效必须有降级路径
- **禁区（另一会话在改，未提交）**：`src/kernel/`、`src/lib/kernel/`、`src/app/api/`、`jev-adapter`、`session.ts`、`nav.tsx` 的 jev 相关未提交改动——本计划所有任务 **不得触碰**上述文件；nav.tsx 仅在 Task 8 改样式类名且须先看 diff 避免冲突
- reduced-motion：T1/T2/T3 全部退化为 120ms opacity，底噪四项全关
- 每个 Task 结束跑 `pnpm verify`（lint+unit+theme:check）后 commit；e2e 在标注的任务里跑 `pnpm e2e tests/e2e/<file>`
- 预算红线：rift chunk ≤30KB gz；first-load JS（幕）≤170KB gz；T1≤300ms · T2≤600ms · T3≤350ms

---

## Task 1: 主题契约 v2（数据结构换代）

**Files:**
- Modify: `src/themes/contract.ts`（全量重写，见下）
- Modify: `src/lib/themes/resolve.ts:46-52`（effects 解析）
- Modify: `src/stores/theme-store.ts`（overrides 持久化兼容）
- Modify: `src/themes/lumen/index.ts`、`src/themes/terminal/index.ts`、`src/themes/paper/index.ts`（effects/genui 字段适配）
- Test: `src/themes/registry.test.ts`、`src/stores/theme-store.test.ts`、`src/themes/merge.test.ts`（适配）

- [ ] **Step 1: 写失败测试**（`src/themes/contract.v2.test.ts` 新建）

```ts
import { describe, expect, it } from "vitest";
import { voidTheme } from "@/themes/void";
import { lumenTheme } from "@/themes/lumen";
import { resolveTheme } from "@/lib/themes/resolve";

describe("契约 v2", () => {
  it("幕人格：renderer=rift-layer，无挂件字段", () => {
    expect(voidTheme.effects.renderer).toBe("rift-layer");
    expect(voidTheme.effects.hum).toEqual({ breath: 0.6, flashlight: true, tremor: 0.3 });
    expect(voidTheme.effects.rift).toEqual({ tear: "diagonal", intensity: 0.7 });
    expect(voidTheme.genui.catalogVariant).toBe("stitch");
    expect(voidTheme.motion.easing.rift).toBe("cubic-bezier(0.85, 0, 0.15, 1)");
  });
  it("lumen：renderer=none，仅拉焦", () => {
    expect(lumenTheme.effects.renderer).toBe("none");
    expect(lumenTheme.effects.rift.intensity).toBe(0);
  });
  it("overrides 只认三个旋钮", () => {
    const r = resolveTheme(voidTheme, "dark", { hum: 0, riftIntensity: 1, motionSpeed: 2 });
    expect(r.effects.hum.breath).toBe(0);
    expect(r.effects.hum.flashlight).toBe(false);
    expect(r.effects.rift.intensity).toBe(1);
    expect(r.motion.duration.ui).toBe(voidTheme.motion.duration.ui * 2);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**　Run: `pnpm test src/themes/contract.v2.test.ts`　Expected: FAIL（类型/字段不存在）

- [ ] **Step 3: 重写 `src/themes/contract.ts`**（全量替换。删除 `FxBackgroundId/FxOverlayId`、`ThemeEffects.background/overlays/cursor/hud`、`ThemeOverrides.accentHue/background/overlays/cursor`；`ThemeMotion.scrollIntensity` 删除并新增 `easing.rift`；`catalogVariant/openuiVariant` 的 `"hud"` 改 `"stitch"`；`streamReveal.effect` 的 `"decode"` 改 `"tear"`。tokens 键**不动**（避免 CSS 管线连坐），只换语义）

```ts
export type ThemeMode = "light" | "dark";

export interface ThemeMeta {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  modes: ThemeMode[]; // 首个为默认
  status: "stable" | "preview" | "reserved";
  preview: { accent: string; bg: string; hasFx: boolean };
}

export interface ThemeTypographyLevel {
  size: string;
  lineHeight: string;
  tracking: string;
  weight: number;
}

export interface ThemeTokens {
  color: {
    bg: string;            // 幕布黑
    bgElevated: string;    // 余白深一档（少量使用）
    surface: string;       // 玻璃纸 sheet 底
    surfaceHover: string;
    ink: string;
    inkSecondary: string;  // spec: inkDim
    inkMuted: string;      // spec: inkMute
    inkFaint: string;
    accent: string;        // 「针脚」冰蓝白——只作细线/焦点环/进度，禁大面积
    accentHover: string;
    accentInk: string;     // 近黑（accent 大面积场景已禁，保留为契约完整性）
    border: string;        // hairline
    borderStrong: string;  // 缝线强调（genui stitch 边框用）
    danger: string;
    success: string;
    warning: string;
    glow: string;          // 针脚辉光 rgba
  };
  typography: {
    sans: string;
    mono: string;
    display: string;
    scale: Record<
      "display" | "h1" | "h2" | "h3" | "body" | "small" | "micro",
      ThemeTypographyLevel
    >;
  };
  space: { unit: number; containerMax: string; gutter: string; sectionY: string };
  shape: { radiusSm: string; radiusMd: string; radiusLg: string; borderWidth: string };
  elevation: { shadowSm: string; shadowMd: string; glow: string };
  texture: { noiseOpacity: number; gridOpacity: number; scanlineOpacity: number }; // v2 仅 noiseOpacity 有效，其余置 0（键保留防 CSS 管线断）
}

export interface ThemeMotion {
  personality: "cinematic" | "precise" | "playful" | "calm";
  easing: { entrance: string; exit: string; emphasis: string; scroll: string; rift: string };
  duration: { micro: number; ui: number; section: number; scene: number }; // ms
  gsap: { ease: string };
  spring: { ui: { stiffness: number; damping: number }; layout: { stiffness: number; damping: number } };
}

export type FxRendererId = "rift-layer" | "none";

export interface ThemeEffects {
  renderer: FxRendererId; // 唯一常驻层；挂件清单已废除
  hum: { breath: number; flashlight: boolean; tremor: number }; // 0–1 底噪（G3）
  rift: { tear: "diagonal" | "horizontal"; intensity: number }; // 0–1 撕裂烈度（G2）
}

export interface ThemeGenUI {
  catalogVariant: "stitch" | "clean";
  openuiVariant: "stitch" | "clean";
  streamReveal: { stagger: number; effect: "fade" | "tear" };
}

export interface Theme {
  meta: ThemeMeta;
  extends?: string;
  tokens: Partial<Record<ThemeMode, ThemeTokens>>;
  motion: ThemeMotion;
  effects: ThemeEffects;
  genui: ThemeGenUI;
}

export interface ThemeOverrides {
  hum?: number;          // 0–1 底噪总强度（乘进 hum 三项）
  riftIntensity?: number; // 0–1 撕裂烈度
  motionSpeed?: number;   // 0.5–2
}
```

- [ ] **Step 4: 适配 `resolve.ts`**（替换 46–52 行 effects 解析；motion 缩放逻辑保留）

```ts
  const humK = overrides.hum ?? 1;
  const effects: ThemeEffects = {
    ...theme.effects,
    renderer: humK === 0 ? "none" : theme.effects.renderer,
    hum: {
      breath: theme.effects.hum.breath * humK,
      flashlight: humK > 0 && theme.effects.hum.flashlight,
      tremor: theme.effects.hum.tremor * humK,
    },
    rift: {
      ...theme.effects.rift,
      intensity: overrides.riftIntensity ?? theme.effects.rift.intensity,
    },
  };
```

- [ ] **Step 5: 适配四个主题数据文件**。`void/index.ts` 的 `motion.easing` 加 `rift: "cubic-bezier(0.85, 0, 0.15, 1)"`、删 `scrollIntensity`，`effects`/`genui` 换成 Step 1 测试断言的值（catalogVariant 暂仍指 stitch——皮肤实现在 Task 9）；`lumen/terminal/paper` 同构：`renderer: "none"`（terminal 允许 `"rift-layer"`，breath 0.2）、`rift: { tear: "horizontal", intensity: 0 }`（lumen 必须 0：只配 T3）、`genui.catalogVariant: "clean"`（lumen/paper）/`"stitch"`（terminal）。texture 的 grid/scanline 归 0。**本 Task 不改 tokens 数值**（Task 2 改）。
- [ ] **Step 6: theme-store 兼容旧持久化**：`readPersisted()` 解析 `overrides` 时丢弃未知键（`accentHue` 等）：`overrides: Object.fromEntries(Object.entries((parsed.overrides ?? {}) as object).filter(([k]) => ["hum","riftIntensity","motionSpeed"].includes(k)))`
- [ ] **Step 7: 全量跑**　Run: `pnpm verify`　Expected: contract.v2.test PASS；旧测试因字段引用失败处逐个修断言（禁止改回旧结构）
- [ ] **Step 8: Commit**　`git commit -am "feat(theme): 契约 v2——renderer/hum/rift 取代挂件清单，stitch/tear 取代 hud/decode"`

## Task 2: 「幕」人格 tokens 重写（数值换代）

**Files:**
- Modify: `src/themes/void/index.ts`（仅 tokens 数值 + meta）
- Modify: `src/app/[lang]/dictionaries/{en,zh}.json`（主题名文案）
- Test: `tests/e2e/theme-vars.spec.ts`（追加断言）、`src/themes/registry.test.ts`（meta 断言）

- [ ] **Step 1: 写失败 e2e**（追加到 `tests/e2e/theme-vars.spec.ts`）

```ts
test("幕人格 tokens", async ({ page }) => {
  await page.goto("/zh");
  const root = page.locator("html");
  await expect(root).toHaveCSS("background-color", "rgb(7, 7, 10)");
  const accent = await root.evaluate((el) =>
    getComputedStyle(el).getPropertyValue("--accent").trim());
  expect(accent).toBe("#cfe4ff");
});
```

- [ ] **Step 2: 跑确认失败**　Run: `pnpm e2e tests/e2e/theme-vars.spec.ts`　Expected: FAIL
- [ ] **Step 3: 重写 `voidTokens.color`**（键不变，按 spec §1.1 换值）：

```ts
  color: {
    bg: "#07070a", bgElevated: "#0b0c10", surface: "rgba(232, 236, 239, 0.02)",
    surfaceHover: "rgba(232, 236, 239, 0.04)",
    ink: "#e8ecef", inkSecondary: "#a9b3bc", inkMuted: "#7d8891", inkFaint: "#4a525c",
    accent: "#cfe4ff", accentHover: "#e6f1ff", accentInk: "#07070a",
    border: "#22262d", borderStrong: "rgba(207, 228, 255, 0.35)",
    danger: "#e0596f", success: "#57b97b", warning: "#c9a86a",
    glow: "rgba(207, 228, 255, 0.28)",
  },
```

`space` 换：`{ unit: 4, containerMax: "70rem", gutter: "2rem", sectionY: "18vh" }`；`shape` 全直角：`{ radiusSm: "0px", radiusMd: "2px", radiusLg: "2px", borderWidth: "1px" }`；`elevation.shadowMd: "0 40px 120px rgba(0,0,0,.6)"`；`texture: { noiseOpacity: 0.02, gridOpacity: 0, scanlineOpacity: 0 }`；`typography.scale.body`: `{ size: "1rem", lineHeight: "1.9", tracking: "0", weight: 400 }`，`micro` tracking `"0.2em"`，`display` size `"clamp(3.5rem, 9vw, 7.5rem)"`。`meta`: `name: "幕", nameEn: "Curtain", description: "留白为幕面 · 转场即撕幕", preview: { accent: "#cfe4ff", bg: "#07070a", hasFx: true }`。
- [ ] **Step 4: 字典**：`zh.json` 中主题名「深空」→「幕」、描述同步上值；`en.json` `"Void"`→`"Curtain"`。grep 两文件里 `void` 展示键确认无硬编码残留
- [ ] **Step 5: 再生 CSS 并跑**　Run: `pnpm test:e2e theme-vars && pnpm verify`（gen-theme-css 由 predev/prebuild 触发；e2e 前跑 `tsx scripts/gen-theme-css.ts`）。Expected: PASS
- [ ] **Step 6: 更新受影响旧断言**（`registry.test.ts` 等对 `#5eead4`/「深空」的断言按新值改）后 Commit　`git commit -am "feat(theme): 「幕」人格 tokens——幕布黑/针脚冰蓝/直角大留白"`

## Task 3: rift-layer（ogl 常驻层）进场，starfield 退场

**Files:**
- Create: `src/lib/gl/rift.ts`（shader + 层封装）、`src/components/fx/rift-layer.tsx`
- Modify: `src/lib/fx/registry.ts`（`rift-layer` 注册）、`src/components/fx/fx-layer.tsx`（按 `effects.renderer` 分派）、`src/themes/void/index.ts`（meta 不变）
- Delete: `src/components/fx/starfield.tsx`、`src/components/fx/starfield.test.ts`
- Install: `pnpm add ogl`

- [ ] **Step 1: 写失败单测**（`src/lib/gl/rift.test.ts`——只测纯逻辑：uniform 状态机，不碰 GL）

```ts
import { describe, expect, it } from "vitest";
import { createRiftState } from "@/lib/gl/rift";

describe("rift state", () => {
  it("idle：只有 breath；tear/collapse 一次性", () => {
    const s = createRiftState({ breath: 0.6, intensity: 0.7 });
    expect(s.u.t).toBe(0);
    s.setTear(0.5); expect(s.u.tear).toBe(0.35); // 0.5 × intensity
    s.setTear(0); expect(s.u.tear).toBe(0);
    s.setCollapse(1); expect(s.u.collapse).toBe(1);
    s.setHum(0); expect(s.u.breath).toBe(0);
  });
});
```

- [ ] **Step 2: 跑确认失败**　Run: `pnpm test src/lib/gl/rift.test.ts`
- [ ] **Step 3: 实现 `src/lib/gl/rift.ts`**（uniform 状态机 + ogl 层。完整代码：）

```ts
import { Geometry, Mesh, OGLRenderingContext, Program, Renderer, Triangle } from "ogl";

export interface RiftUniforms {
  t: number; res: [number, number]; mouse: [number, number];
  breath: number; tear: number; collapse: number; shift: number; time: number;
}

export function createRiftState(effects: { breath: number; intensity: number }) {
  const u: RiftUniforms = { t: 0, res: [1, 1], mouse: [0.5, 0.5], breath: effects.breath, tear: 0, collapse: 0, shift: 0, time: 0 };
  const K = effects.intensity;
  return {
    u,
    setHum(v: number) { u.breath = v * effects.breath; },
    setTear(p: number) { u.tear = p * K; },
    setCollapse(p: number) { u.collapse = Math.min(1, p) * K; },
    setShift(v: number) { u.shift = v * K; },
  };
}

const VERT = `attribute vec2 position; void main(){ gl_Position = vec4(position, 0.0, 1.0); }`;
const FRAG = `precision mediump float;
uniform vec2 uRes; uniform vec2 uMouse;
uniform float uBreath, uTear, uCollapse, uShift, uTime;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  // 幕面呼吸：中央 8s 周期 ±1.5% 明暗
  float breath = (0.5 + 0.5 * sin(uTime * 0.785)) * 0.015 * uBreath;
  // 手电柔光：鼠标径向 300px 光斑
  float d = distance(uv * uRes, uMouse * uRes) / (300.0 * (uRes.x/1440.0));
  float light = exp(-d*d*3.0) * 0.028 * uBreath;
  // 撕裂缝：对角带 + 缝上闪光与 RGB 抖
  float diag = uv.x + uv.y;
  float seam = smoothstep(0.02, 0.0, abs(diag - uTear * 2.2));
  vec3 col = vec3(0.027, 0.027, 0.039) + breath + light;
  col += seam * vec3(0.81, 0.89, 1.0) * (0.5 + 0.5*h(uv*100.0+uTime));
  col.r += seam * uShift * 0.35; col.b -= seam * uShift * 0.35;
  // 崩解：块状噪声在 uCollapse 前后吞噬画面
  vec2 blk = floor(uv * vec2(48.0, 27.0));
  float thr = h(blk) * 0.4 + uCollapse;
  if (thr > 1.0 && uCollapse > 0.0 && uCollapse < 1.0) col = mix(col, vec3(0.0), step(1.0, thr));
  gl_FragColor = vec4(col * (1.0 - uCollapse * 0.9), 1.0);
}`;

export interface RiftLayer { dispose(): void; gl: OGLRenderingContext }

export function mountRift(canvas: HTMLCanvasElement, state: RiftState): RiftLayer {
  const renderer = new Renderer({ canvas, dpr: Math.min(devicePixelRatio, 1.5), antialias: false });
  const gl = renderer.gl;
  const geometry = new Triangle(gl);
  const program = new Program(gl, { vertex: VERT, fragment: FRAG, uniforms: {
    uRes: { value: state.u.res }, uMouse: { value: state.u.mouse },
    uBreath: { value: state.u.breath },
    uTear: { value: 0 }, uCollapse: { value: 0 }, uShift: { value: 0 }, uTime: { value: 0 },
  }});
  const mesh = new Mesh(gl, { geometry, program });
  let raf = 0, hidden = false;
  const resize = () => { const w = innerWidth, hgt = innerHeight; renderer.resize(w, hgt); state.u.res = [w, hgt]; };
  const onMove = (e: MouseEvent) => { state.u.mouse = [e.clientX / innerWidth, 1 - e.clientY / innerHeight]; };
  const onVis = () => { hidden = document.hidden; };
  resize(); addEventListener("resize", resize); addEventListener("mousemove", onMove); document.addEventListener("visibilitychange", onVis);
  const t0 = performance.now();
  const loop = () => {
    if (!hidden) {
      const now = (performance.now() - t0) / 1000;
      state.u.time = now;
      program.uniforms.uTime.value = now;
      program.uniforms.uBreath.value = state.u.breath;
      program.uniforms.uTear.value = state.u.tear;
      program.uniforms.uCollapse.value = state.u.collapse;
      program.uniforms.uShift.value = state.u.shift;
      renderer.render({ scene: mesh });
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return { dispose() { cancelAnimationFrame(raf); removeEventListener("resize", resize); removeEventListener("mousemove", onMove); document.removeEventListener("visibilitychange", onVis); }, gl };
}
export type RiftState = ReturnType<typeof createRiftState>;
```

（若 `ogl` 的实际导出与上面有出入——执行时以 `node_modules/ogl/src` 为准微调 import 名与 Renderer 选项，不得改行为。）
- [ ] **Step 4: `rift-layer.tsx`**（挂载点：tier≥mid 且 renderer=rift-layer；idle 后动态 import rift.ts；tier low/reduced → CSS 呼吸渐变兜底）

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { useFxTier } from "@/lib/fx/tier";
import { usePrefersReducedMotion } from "@/lib/motion/reduced";
import { useThemeStore } from "@/stores/theme-store";

export function RiftLayer() {
  const ref = useRef<HTMLCanvasElement>(null);
  const effects = useThemeStore((s) => s.resolved.effects);
  const tier = useFxTier();
  const reduced = usePrefersReducedMotion();
  const [idle, setIdle] = useState(false);
  useEffect(() => { const id = requestIdleCallback(() => setIdle(true)); return () => cancelIdleCallback(id); }, []);
  useEffect(() => {
    if (!ref.current || effects.renderer !== "rift-layer" || reduced || tier === "low" || !idle) return;
    let layer: { dispose(): void } | null = null; let alive = true;
    import("@/lib/gl/rift").then(({ createRiftState, mountRift }) => {
      if (!alive) return;
      const state = createRiftState({ breath: effects.hum.breath, intensity: effects.rift.intensity });
      layer = mountRift(ref.current!, state);
      // 转场层（Task 6/7）只认这个入口：存 state（含 setTear/setCollapse/setShift），不是 layer
      (window as unknown as { __rift?: typeof state }).__rift = state;
    });
    return () => { alive = false; layer?.dispose(); };
  }, [effects.renderer, effects.hum.breath, effects.rift.intensity, tier, reduced, idle]);
  if (reduced || effects.renderer === "none") return null;
  return <canvas ref={ref} data-rift aria-hidden className="fixed inset-0 -z-10 h-full w-full" style={tier === "low" ? { animation: "rift-breath 8s ease-in-out infinite", background: "radial-gradient(60% 50% at 50% 40%, rgba(207,228,255,.02), transparent)" } : undefined} />;
}
```

- [ ] **Step 5: 接线**：`fx-layer.tsx` 的 `entry = fxRegistry[effects.background]` → 保留 FxLayer 但背景分派改为 `effects.renderer`（registry 只留 `rift-layer: { loader: () => import("@/components/fx/rift-layer").then(m => m.RiftLayer), minTier: "low" }`，删除 starfield 注册项）；根布局（`src/app/[lang]/(site)/layout.tsx`）FxLayer 渲染处确认 canvas 有 `view-transition-name: fx-root` 既有规则仍命中。删除 `starfield.tsx` 与其测试。
- [ ] **Step 6: 跑**　Run: `pnpm verify && pnpm e2e tests/e2e/fx.spec.ts`　Expected: PASS（fx.spec 里 starfield 断言改为：幕人格 idle 后存在 `canvas[data-rift]`；tier=reduced 时不存在）
- [ ] **Step 7: Commit**　`git commit -am "feat(fx): rift-layer 常驻 ogl 层（呼吸/手电/缝/崩解 uniform），starfield 退场"`

## Task 4: 底噪四项补全（tremor + 幕环光标 + CSS 兜底）

**Files:**
- Modify: `src/app/globals.css`（`@keyframes rift-breath`、tremor、幕环样式）
- Create: `src/components/fx/cursor-ring.tsx`
- Modify: `src/components/site/nav.tsx` ⚠️ 仅给 mono 标签类加 `hum-tremor`（先看未提交 diff 避让）

- [ ] **Step 1: 写失败 e2e**（`tests/e2e/fx.spec.ts` 追加）

```ts
test("底噪：幕环光标 pointer:fine 才出现", async ({ browser }) => {
  const ctx = await browser.newContext({ screen: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("/zh");
  await page.mouse.move(400, 300);
  await expect(page.locator("[data-cursor-ring]")).toBeVisible();
});
```

- [ ] **Step 2: 跑确认失败**　Run: `pnpm e2e tests/e2e/fx.spec.ts -g 幕环`
- [ ] **Step 3: globals.css 追加**：

```css
@keyframes rift-breath { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.015)} }
@keyframes hum-tremor { 0%,96%,100%{transform:none} 97%,99%{transform:translate(0,1px)} }
.hum-tremor { animation: hum-tremor 5s steps(1) infinite; animation-delay: var(--tremor-delay, 0s); }
.cursor-ring { position: fixed; z-index: 100; width: 30px; height: 30px; margin: -15px 0 0 -15px; border: 1px solid var(--border-strong); border-radius: 50%; pointer-events: none; mix-blend-mode: difference; transition: transform .18s var(--ease-entrance); }
.cursor-ring[data-hot="true"] { transform: scale(2.1); border-color: var(--color-warning); }
@media (pointer: coarse) { .cursor-ring { display: none } }
```

- [ ] **Step 4: `cursor-ring.tsx`**（lerp 惯性跟随 + 悬停可交互元素时 hot；挂到 `(site)/layout.tsx`，仅当 `resolved.effects.hum.tremor > 0 && !reduced` 渲染）

```tsx
"use client";
import { useEffect, useRef } from "react";
export function CursorRing() {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0;
    const move = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY;
      const t = e.target as HTMLElement;
      el.current?.setAttribute("data-hot", String(!!t.closest("a,button,[role=dialog]"))); };
    const loop = () => { x += (tx - x) * 0.16; y += (ty - y) * 0.16;
      if (el.current) el.current.style.translate = `${x}px ${y}px`; raf = requestAnimationFrame(loop); };
    addEventListener("mousemove", move); raf = requestAnimationFrame(loop);
    return () => { removeEventListener("mousemove", move); cancelAnimationFrame(raf); };
  }, []);
  return <div ref={el} data-cursor-ring className="cursor-ring" aria-hidden />;
}
```

- [ ] **Step 5: tremor 挂点**：nav.tsx 的 mono 导航标签与 footer 时间戳 className 加 `hum-tremor`，并用 `style={{ ["--tremor-delay" as string]: "1.7s" }}` 错相（禁止同步抖动）。⚠️ nav.tsx 有未提交改动：只加类名，不碰其他行。
- [ ] **Step 6: 跑**　Run: `pnpm e2e tests/e2e/fx.spec.ts && pnpm verify`。Expected: PASS
- [ ] **Step 7: Commit**　`git commit -am "feat(fx): 底噪四项——tremor 错相微颤 + 惯性幕环光标 + lite CSS 呼吸兜底"`

## Task 5: T3 镜头拉焦（组件级转场）

**Files:**
- Create: `src/lib/motion/focus.ts`
- Modify: `src/components/command/command-menu.tsx`、`src/stores/ui-shell-store.ts`（无需改）
- Test: `tests/e2e/command.spec.ts` 追加

- [ ] **Step 1: 写失败 e2e**

```ts
test("⌘K 拉焦：打开时整站壳带 data-focus-pull", async ({ page }) => {
  await page.goto("/zh");
  await page.keyboard.press("Control+k");
  await expect(page.locator("[data-focus-pull]").first()).toBeAttached({ timeout: 1000 });
});
```

- [ ] **Step 2: 跑确认失败**　Run: `pnpm e2e tests/e2e/command.spec.ts -g 拉焦`
- [ ] **Step 3: 实现 `focus.ts`**（对目标容器 gsap：blur(8px)→0 + `data-focus-pull` 标记 + 一道扫描线；时长取 `motion.duration.ui`，reduced 直通）

```ts
import { gsap } from "gsap";
import type { ThemeMotion } from "@/themes/contract";
export function focusPull(el: HTMLElement | null, motion: ThemeMotion): () => void {
  if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  el.setAttribute("data-focus-pull", "1");
  const d = motion.duration.ui / 1000;
  const tl = gsap.timeline({ onComplete: () => el.removeAttribute("data-focus-pull") });
  tl.fromTo(el, { filter: "blur(8px)", opacity: 0.6 }, { filter: "blur(0px)", opacity: 1, duration: d * 1.4, ease: motion.easing.rift });
  return () => tl.kill();
}
```

- [ ] **Step 4:** command-menu.tsx 的 Dialog 内容 ref 在 open 变 true 的 effect 里调 `focusPull(contentRef.current, resolved.motion)`；扫描线用 `::after`（globals.css 里 `[data-focus-pull]::after` 一条 1px var(--accent) 线 top→bottom gsap CSSPlugin `y` 动画，350ms 内完成，实现并入 Step 3 的 tl：`tl.fromTo(el, { "--fp-y": "0%" }, { "--fp-y": "100%" }, 0)`，CSS 用 `translateY(var(--fp-y))`）
- [ ] **Step 5: 跑**　Run: `pnpm e2e tests/e2e/command.spec.ts && pnpm verify`。Expected: PASS（旧断言不受影响）
- [ ] **Step 6: Commit**　`git commit -am "feat(motion): T3 镜头拉焦——⌘K 失焦→扫描→锁焦"`

## Task 6: T1 定格撕幕（全站路由主转场）

**Files:**
- Modify: `src/app/globals.css:70-97`（view-transition 伪元素动画段）
- Modify: `src/components/fx/route-transition.tsx`
- Modify: `src/lib/motion/vt.ts`（`withRiftViewTransition`：驱动 `window.__rift` 的 setTear/setShift 同步 GSAP timeline）
- Test: `tests/e2e/smoke.spec.ts` 追加

- [ ] **Step 1: 写失败 e2e**

```ts
test("路由切换触发撕幕", async ({ page }) => {
  await page.goto("/zh");
  const seen = page.evaluate(() => new Promise((r) => {
    const obs = new MutationObserver(() => {
      if (document.documentElement.classList.contains("rift-tear")) { obs.disconnect(); r(true); }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    setTimeout(() => { obs.disconnect(); r(document.documentElement.classList.contains("rift-tear")); }, 2500);
  }));
  await page.getByRole("link", { name: /posts|文章/ }).first().click();
  expect(await seen).toBe(true);
});
```

- [ ] **Step 2: 跑确认失败**　Run: `pnpm e2e tests/e2e/smoke.spec.ts -g 撕幕`
- [ ] **Step 3: globals.css 转场段替换**（删除既有 nav-forward/back 伪类动画，换成幕语法；`rift-tear` 类由 JS 在转场期间挂到 `<html>` 以便测试与样式联动）

```css
::view-transition-old(root), ::view-transition-new(root) { animation-duration: 300ms; animation-timing-function: var(--ease-rift); mix-blend-mode: normal; }
::view-transition-old(root) { animation-name: rift-old; }
::view-transition-new(root) { animation-name: rift-new; }
@keyframes rift-old { to { clip-path: polygon(110% 0, 110% 0, 110% 110%, 110% 110%); transform: translate(6%, -3%) rotate(1.2deg); filter: brightness(.4); } }
@keyframes rift-new { from { clip-path: polygon(-10% 0, -10% 0, -10% 110%, -10% 110%); transform: translate(-4%, 2%); } to { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); transform: none; } }
```

- [ ] **Step 4: `vt.ts` 加 `withRiftViewTransition(mutate)`**：包裹 `doc.startViewTransition`；开始处给 `<html>` 加 `rift-tear`、若 `window.__rift` 存在则 gsap timeline（`motion.duration.scene` 不用——硬上限 300ms：取 `Math.min(300, motion.duration.ui + 20)`）对 `setTear(0→1)`、`setShift(±1 两帧)`，结束移除类。route-transition.tsx 与 command-menu `go()` 的导航统一改走它（Link 保持 `transitionTypes` 但 byType 常量全指 `root`）。
- [ ] **Step 5: 跑**　Run: `pnpm e2e tests/e2e/smoke.spec.ts && pnpm verify`。Expected: PASS
- [ ] **Step 6: Commit**　`git commit -am "feat(motion): T1 定格撕幕——VT clip-path 对角撕 + rift-layer 缝光同步"`

## Task 7: T2 信号崩解（首页→文章、→Lab 专用）

**Files:**
- Modify: `src/lib/motion/vt.ts`（`collapseViewTransition`：先 shader 崩解半程 → mutate → 聚合半程，总 ≤600ms）
- Modify: `src/app/[lang]/(site)/page.tsx`（信纸行链接改走 collapse）、`src/app/[lang]/(site)/lab/page.tsx` 入口链接
- Test: `tests/e2e/smoke.spec.ts` 追加 `rift-collapse` 类断言（模式同 Task 6 Step 1，链接名 lab）

- [ ] **Step 1:** 写失败 e2e（断言 `<html>` 出现 `rift-collapse` 类）→ 跑确认失败
- [ ] **Step 2:** 实现 `collapseViewTransition(el 可选)`：

```ts
export function collapseViewTransition(mutate: () => void, motion: ThemeMotion) {
  const rift = (window as unknown as { __rift?: { setCollapse(p: number): void } }).__rift;
  const doc = document as ViewTransitionDoc;
  if (!rift || !doc.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { mutate(); return; }
  const half = Math.min(300, motion.duration.section / 2);
  const t = gsap.timeline();
  doc.startViewTransition(() => {}); // 占位取快照由下方完成
  t.to((p) => rift.setCollapse(p), { duration: half / 1000, from: 0, to: 1, onUpdate() { rift.setCollapse(this.progress()); } })
   .add(() => { document.documentElement.classList.add("rift-collapse"); mutate(); })
   .to(rift, { duration: half / 1000, onStart() {}, onUpdate() { rift.setCollapse(1 - this.progress()); }, onComplete() { rift.setCollapse(0); setTimeout(() => document.documentElement.classList.remove("rift-collapse"), 80); } });
}
```

（上面是意图代码：GSAP 数值回调写法执行时按 gsap 官方 `gsap.to({v:0},{v:1,onUpdate})` 模式改写，行为不变：崩解→切换→聚合，全程 DOM 只 startViewTransition 一次。）
- [ ] **Step 3:** 接线：信纸行 `onClick={(e) => { e.preventDefault(); collapseViewTransition(() => router.push(href), motion); }}`（RSC 页面里由一个小 client 组件 `SignalRow` 承载——新建 `src/app/[lang]/(site)/signal-row.tsx`）
- [ ] **Step 4:** 跑 e2e + `pnpm verify`，Commit　`git commit -am "feat(motion): T2 信号崩解——首页→文章/Lab 的块状崩解聚合"`

## Task 8: 页面留白重构（首页三幕信纸 / hero 自撕 / 面板换代）

**Files:**
- Modify: `src/app/[lang]/(site)/hero.tsx`、`page.tsx`、`posts/page.tsx`、`projects/page.tsx`、`src/components/site/footer.tsx`、`src/components/site/theme-switcher.tsx`
- Modify: `src/app/[lang]/dictionaries/{en,zh}.json`（home.switcher 文案键）
- Test: `tests/e2e/home.spec.ts`、`tests/e2e/shell.spec.ts` 适配

- [ ] **Step 1:** `hero.tsx` 重写为留白版：删除 SplitText 逐字入场，改为——h1（display 令牌）进站 600ms 后整块跑一次 `focusPull`（复用 Task 5），下方 kicker/role 两行 mono micro；`data-hero-title` 保留给既有测试的最小改：断言文本可见即可（改 home.spec 对应断言）
- [ ] **Step 2:** `page.tsx` 三屏：屏1 Hero；屏2 `<section aria-label=精选>` 5 行 `SignalRow`（占位假数据沿用现 posts 页内容源，无内容管线时硬编码 5 条 + TODO 注释挂 M1）；屏3 项目 mono 名录 4 行 + footer 单行。删除现有多余 section
- [ ] **Step 3:** `theme-switcher.tsx` 面板换代：删色相滑块与 overlays 开关，保留 motionSpeed，新增 `hum`、`riftIntensity` 两个 Slider（i18n 键 `switcher.hum`「底噪」/ `switcher.rift`「撕裂烈度」，en: Hum / Rift）——数据走 Task 1 的 setOverride
- [ ] **Step 4:** footer 改一行 micro：`© 2026 WUZEKAI / RSS / ⌘K`；nav.tsx mono 链接 10px + tracking 0.2em（与未提交 jev 改动合并时保留双方）
- [ ] **Step 5:** 跑 `pnpm e2e tests/e2e/home.spec.ts tests/e2e/shell.spec.ts && pnpm verify`；旧断言（遥测条、scanline 等）按 spec §0.2 拒绝清单删除
- [ ] **Step 6:** Commit　`git commit -am "feat(site): 留白重构——首页三幕信纸 / hero 拉焦自撕 / 面板换代 hum+rift"`

## Task 9: GenUI「缝补」皮肤（stitch）

**Files:**
- Modify: `src/components/genui/registry.tsx`（hud 实现改 stitch：dashed hairline + 无边角装饰）、`src/lib/genui/parse-spec.ts`（若 variant 枚举有硬编码）
- Test: `src/components/genui/genui-renderer.test.tsx` 断言 `data-skin="stitch"` 与 class 变化

- [ ] **Step 1:** 改失败断言：renderer 测试里期望 `data-skin="stitch"`、卡框 class 含 `border-dashed`；跑 `pnpm test src/components/genui/genui-renderer.test.tsx` 确认失败
- [ ] **Step 2:** 实现：hud 分支重命名为 stitch——边框 `1px dashed var(--border-strong)`、圆角 0、内距 16px、无 glow；`streamReveal.effect==="tear"` 时子节点入场用 `gsap.fromTo(node,{opacity:0,clipPath:"inset(0 100% 0 0)"},{clipPath:"inset(0 0 0 0)",duration:0.08,ease:motion.easing.rift})`（≤80ms 小块撕开）；clean 分支不动
- [ ] **Step 3:** 跑 `pnpm verify`；agent-dock 冒烟 `pnpm e2e tests/e2e/command.spec.ts`。Commit　`git commit -am "feat(genui): stitch 缝补皮肤 + tear 显现节奏，hud/decode 退场"`

## Task 10: 审计门禁换代 + 全量回归

**Files:**
- Modify: `src/lib/themes/contrast-gate.ts`（字段适配 v2 + 新增断言）
- Modify: `package.json`（size 检查脚本）
- Test: 全量

- [ ] **Step 1:** contrast-gate：删除 overlays/hud 相关检查；新增两条——`accent 与 bg 对比 ≥4.5`（针脚可用性）与 `rift.intensity ∈ [0,1]`；`pnpm theme:check` 通过
- [ ] **Step 2:** `package.json` scripts 加 `"size:check": "next build && node scripts/size-check.mjs"`；新建 `scripts/size-check.mjs`：读 `.next` 产物，断言含 rift 的 chunk gz ≤30KB、首屏 JS（首页路由）≤170KB，超则 exit 1（代码：遍历 `find .next/static -name '*.js'` + `zlib.gzipSync` 汇总，按路由 manifest 归属）
- [ ] **Step 3:** 全量回归：`pnpm verify && pnpm e2e`；reduced-motion 专项：`pnpm e2e tests/e2e/fx.spec.ts -g reduced`（若无此用例先补：emulateMedia reduced 后断言无 `canvas[data-rift]`、无 `data-cursor-ring`、切换路由 120ms 内完成）
- [ ] **Step 4:** 调用 impeccable `audit` + baseline-ui 对首页/文章壳做一轮质感扫描，按发现回修（只收 spec 一致项）
- [ ] **Step 5:** README/README.zh-CN 主题表更新（幕/Curtain；特效行改「rift-layer 常驻底噪 + T1/T2/T3 转场语法」）；01-design-spec.md 顶部加「§0/2/5/6/7/8 以 2026-09-19 spec 为准」的指针注；Commit　`git commit -am "feat(checks): 门禁 v2 + size 红线 + 文档指针——幕语法全量落地"`

---

## 验收清单（对照 spec §8）

- [ ] `pnpm theme:check` 全绿（含 stitch 主题与 hum/rift 断言）
- [ ] e2e：T1（rift-tear 类）、T2（rift-collapse 类）、T3（data-focus-pull）各自命中；reduced 下三者全退化且无 WebGL 实例
- [ ] 底噪审计：待机 60s 无四项之外的动画节点（DevTools Performance 手工抽查一次，截图存 PR 描述）
- [ ] `pnpm size:check` 绿；`canvas[data-rift]` idle 后出现、页面隐藏时 rAF 暂停（visibilitychange 断言）
- [ ] 首页三屏无任何被禁元素（扫描线/仪表/遥测/粒子）——grep `scanline|telemetry|reticle` 于 src/ 归零

## 后续（不在本计划）

- **Plan B 篇章人格**：`posts.meta.persona` 五旋钮 + admin diff 双栏 + content-agent `propose_persona` 工具 + SSR 烘焙（spec §5；依赖刚合入的 admin/kernel，等其稳定后单独出计划）
- **Plan B 范围补充**：文章页留白构图 + 针脚阅读进度线（spec §4 文章页部分）——目标页由 M1 新代码拥有，执行前先盘点 `src/app/[lang]/(site)/posts/` 现状再出精确任务
- **lumen 针脚化取值待定**：spec §6.1 要求 lumen accent 同样退为针脚角色但未给具体值，Task 2 仅改 void；lumen 新值由用户定稿后小 PR 落地
- 真内容接入 M1 后替换 Task 8 Step 2 的假数据挂点

## 执行期补记

> Task 1–7 落地过程中发现的与计划文本不符的事实，后续读计划的人（和 Task 8+ 的执行者）以本节为准：

- **transitionTypes 预取竞态**（Task 7 实测）：Link 的 `transitionTypes` 只在目标路由 prefetch 响应已落地后存活；预取还在飞时点击，Next 复用未完成请求走 ping 提交，React 不带 types → 本应 T2 的导航退化成 T1。e2e（collapse.spec）靠点击前显式等 `?_rsc` 响应 + 400ms 缓存落地窗口规避；产品侧跟进项：点击路径主动 await prefetch 再 push，或等上游修复用路径丢 types 的行为（代码注释见 nav.tsx）。
- **DB 取数必须收进 <Suspense>，否则导航起双 VT / 根本不起 VT**（Task 7 实测）：页面级 `await` 数据库会把整条路由 RSC 响应押在 DB 往返后（本机 DB 不可达时 ≈11.6s），React 为这次导航根本不起 view transition，幕语法拿不到类；即便 DB 慢而可达，Suspense 解挂补提交会再起一次 VT（双转场）。模式定案：DB 段落包 `<Suspense fallback=诚实骨架>` + 子组件内 try/catch 降空态（见 lab/page.tsx，首页精选信号沿用），E2E 一律断言「骨架或内容二选一」不断具体行。
- **shell.spec 的 DB 基础设施依赖**（Task 7 评审指出）：nav→posts 用例的 h1 内容断言把测试耦在 DB 可达性上（posts 页当时页级 await 取数，DB 挂则 500）。Task 8 把 posts 取数收进 Suspense+try/catch 后，导航断言放宽为 href/URL 校验，内容断言只赌静态骨架；此条随 Task 8 的 e2e 改造一同落地。
