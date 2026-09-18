# shizurak M0 · 地基 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付一个可运行的站点地基——`/[lang]` i18n 路由 + 四层主题契约引擎（`void`/`lumen` 可切换）+ 站点壳（导航/页脚/⌘K）+ 特效底座（首个特效 starfield）+ 首页 hero 入场。

**Architecture:** Next.js 16.3.5 App Router（Cache Components + React Compiler）。主题定义为**纯数据**（tokens/motion/effects-id/genui），经构建期脚本生成 CSS variables（`[data-theme][data-mode]` 选择器），运行时由 Zustand store 解析并广播给 GSAP/特效层。i18n 走官方模式：`app/[lang]/` 根布局 + `proxy.ts` 语言协商 + `next/root-params` 字典。特效层按设备分级（high/mid/low）动态加载，`lumen` 永不下载特效代码。

**Tech Stack:** Next 16.3.5 · React 19.2.8 · TS 5 · Tailwind 4 · Zustand 5 · next-themes · GSAP 3.15 · motion 13 · cmdk · Radix 原语 · Vitest 5 + Testing Library · Playwright 1.63

**规范依据:** `docs/specs/01-design-spec.md`（主题契约/令牌/动效语法）· `docs/specs/02-architecture-spec.md`（版本约定/目录/边界）· `docs/specs/03-state-spec.md`（store 规格）· `docs/specs/04-dependency-spec.md`（版本锁定）

## Global Constraints

- 工作目录 `/mnt/shared/XRAK/shizurak`；Node 22 + pnpm 10.33.2（已配 `packageManager`）
- **所有依赖精确锁定**：`pnpm add -E`（`.npmrc` 设 `save-exact=true`），版本以 Task 1 清单为准
- 标识符英文、注释与文案中文；文案一律走字典（`zh`/`en`），组件内禁止硬编码可见文本
- **令牌纪律**：组件禁止裸色值（`#hex`/`rgb()`）与魔法时长（`0.3s`）；色值取 Tailwind 语义类（`bg-bg`/`text-ink`/`border-border`…），动效时长/曲线取 `resolved.motion`
- **主题目录是纯数据**：`src/themes/**` 禁止 import React 组件（特效经 `src/lib/fx/registry.ts` 字符串 id 解析加载）
- 边界：`src/components/**` 禁止 import `src/lib/server/**`、`src/lib/db/**`（M0 尚不存在，先立规则）
- reduced-motion 与特效三级降级是硬性验收项，不得跳过
- 每任务收尾必须 `pnpm lint` + `pnpm test` 绿；提交信息用 conventional 前缀（`feat:`/`test:`/`chore:`/`docs:`），结尾带 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- `next dev` 会自动改 `AGENTS.md`（见仓库 CLAUDE.md 说明）——**随工作一并提交**，保持树干净
- 已知偏差（有意为之，勿"修复"）：M0 用系统 CJK 字体栈（`PingFang SC`/`Microsoft YaHei`），中文 webfont 管线（cn-font-split）在 M1 落地；nebula shader 在 M1，M0 特效只实现 starfield

---

### Task 1: 工程骨架与质量门禁

**Files:**
- Modify: `package.json` · `next.config.ts` · `biome.json` · `.gitignore` · `tsconfig.json`（如需）
- Create: `.npmrc` · `vitest.config.ts` · `vitest.setup.ts` · `playwright.config.ts` · `src/lib/utils.ts` · `src/lib/utils.test.ts` · `tests/e2e/smoke.spec.ts` · `scripts/gen-theme-css.ts`（空占位）

**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]): string`（全项目类名合成唯一入口）；`pnpm test` / `pnpm e2e` / `pnpm lint` / `pnpm theme:check` 脚本

- [ ] **Step 1: 安装依赖（精确锁定）**

```bash
cd /mnt/shared/XRAK/shizurak
printf 'save-exact=true\n' > .npmrc
pnpm add -E zustand@5.0.15 next-themes clsx@2.1.1 tailwind-merge@3.7.0 \
  lucide-react@1.47.0 cmdk@1.1.1 gsap@3.15.0 @gsap/react@2.1.2 motion@13.4.0 \
  negotiator@1.1.0 @formatjs/intl-localematcher@0.9.0 \
  @radix-ui/react-popover @radix-ui/react-slider @radix-ui/react-switch
pnpm add -D -E vitest@5.0.1 @vitejs/plugin-react @testing-library/react@16.3.3 \
  @testing-library/dom @testing-library/jest-dom jsdom@30.1.0 \
  @playwright/test@1.63.0 @types/negotiator@0.6.5 tsx@4.23.13
./node_modules/.bin/playwright install chromium
```

若 pnpm 10 提示 ignored build scripts（esbuild/sharp 等），把对应包名加入 `pnpm-workspace.yaml` 的 `ignoredBuiltDependencies`（这些包的 postinstall 仅是可选的二进制下载，被忽略后走平台可选依赖，功能不受影响）。

- [ ] **Step 2: 配置 next.config.ts（Cache Components 开启）**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
};

export default nextConfig;
```

- [ ] **Step 3: 写 utils 的失败测试**

`src/lib/utils.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("合并类名并去重 Tailwind 冲突", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-ink", false && "hidden", "bg-bg")).toBe("text-ink bg-bg");
  });
});
```

- [ ] **Step 4: 运行测试确认失败**

Run: `pnpm vitest run src/lib/utils.test.ts`
Expected: FAIL（`./utils` 不存在）

- [ ] **Step 5: 实现 utils + 测试配置**

`src/lib/utils.ts`：

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

`vitest.config.ts`：

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
```

`vitest.setup.ts`：

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 6: 写 E2E 冒烟测试 + Playwright 配置**

`playwright.config.ts`：

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
```

`tests/e2e/smoke.spec.ts`（暂用当前默认页，Task 5 后仍应绿）：

```ts
import { expect, test } from "@playwright/test";

test("站点可响应", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.status()).toBeLessThan(400);
});
```

- [ ] **Step 7: 更新 package.json scripts、biome 忽略、gitignore**

`package.json` scripts 改为（保留已有键，新增如下）：

```json
{
  "predev": "tsx scripts/gen-theme-css.ts",
  "dev": "next dev",
  "prebuild": "tsx scripts/gen-theme-css.ts",
  "build": "next build",
  "start": "next start",
  "lint": "biome check",
  "format": "biome format --write",
  "test": "vitest run",
  "test:watch": "vitest",
  "e2e": "playwright test",
  "theme:check": "tsx scripts/theme-check.ts"
}
```

`scripts/gen-theme-css.ts` 先建**空占位**（保证 predev 不炸；Task 3 全量实现）：

```ts
// 占位：Task 3 实现 token→CSS 生成
console.log("gen-theme-css: 占位运行");
```

`.gitignore` 追加：

```
src/app/theme-vars.generated.css
playwright-report/
test-results/
```

`biome.json` 的 `files.includes` 追加忽略：`"!**/*.generated.css"`。

- [ ] **Step 8: 全量验证**

Run: `pnpm lint && pnpm test && pnpm e2e`
Expected: 全部通过（e2e 1 条；首次运行 dev server 可能较慢，timeout 已放宽）

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: M0 工程骨架——依赖锁定 · vitest/playwright 门禁 · cn 工具"
```

---

### Task 2: 主题契约与注册表 + theme:check

**Files:**
- Create: `src/themes/contract.ts` · `src/themes/void/index.ts` · `src/themes/lumen/index.ts` · `src/themes/registry.ts` · `src/lib/themes/contrast.ts` · `src/lib/themes/contrast.test.ts` · `src/themes/registry.test.ts` · `scripts/theme-check.ts`

**Interfaces:**
- Produces（后续任务全部依赖，名称冻结）：
  - `Theme` / `ThemeMeta` / `ThemeTokens` / `ThemeMotion` / `ThemeEffects` / `ThemeGenUI` / `ThemeOverrides` / `ThemeMode` / `FxBackgroundId` / `FxOverlayId`（`src/themes/contract.ts`）
  - `themeRegistry: Record<string, Theme>` · `themeList: Theme[]` · `getTheme(id: string): Theme | undefined`（`src/themes/registry.ts`）
  - `contrastRatio(hexA: string, hexB: string): number` · `relativeLuminance(hex: string): number`（`src/lib/themes/contrast.ts`）

- [ ] **Step 1: 写契约类型**

`src/themes/contract.ts`（与设计规范 §1.2 一致；`effects.load` 改为字符串 id 经 fx registry 解析——见 Global Constraints 边界规则）：

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
    bg: string; bgElevated: string; surface: string; surfaceHover: string;
    ink: string; inkSecondary: string; inkMuted: string; inkFaint: string;
    accent: string; accentHover: string; accentInk: string;
    border: string; borderStrong: string;
    danger: string; success: string; warning: string;
    glow: string;
  };
  typography: {
    sans: string; mono: string; display: string;
    scale: Record<
      "display" | "h1" | "h2" | "h3" | "body" | "small" | "micro",
      ThemeTypographyLevel
    >;
  };
  space: { unit: number; containerMax: string; gutter: string; sectionY: string };
  shape: { radiusSm: string; radiusMd: string; radiusLg: string; borderWidth: string };
  elevation: { shadowSm: string; shadowMd: string; glow: string };
  texture: { noiseOpacity: number; gridOpacity: number; scanlineOpacity: number };
}

export interface ThemeMotion {
  personality: "cinematic" | "precise" | "playful" | "calm";
  easing: { entrance: string; exit: string; emphasis: string; scroll: string };
  duration: { micro: number; ui: number; section: number; scene: number }; // ms
  gsap: { ease: string };
  spring: {
    ui: { stiffness: number; damping: number };
    layout: { stiffness: number; damping: number };
  };
  scrollIntensity: number; // 0–1
}

export type FxBackgroundId = "nebula" | "starfield" | "none" | "paper-grain";
export type FxOverlayId = "scanline" | "grain" | "grid" | "vignette";

export interface ThemeEffects {
  background: FxBackgroundId;
  overlays: FxOverlayId[];
  cursor: "reticle" | "default";
  hud: boolean;
  intensity: number; // 0–1
}

export interface ThemeGenUI {
  catalogVariant: "hud" | "clean";
  openuiVariant: "hud" | "clean";
  streamReveal: { stagger: number; effect: "fade" | "decode" };
}

export interface Theme {
  meta: ThemeMeta;
  tokens: Partial<Record<ThemeMode, ThemeTokens>>;
  motion: ThemeMotion;
  effects: ThemeEffects;
  genui: ThemeGenUI;
}

export interface ThemeOverrides {
  accentHue?: number; // -180..180
  effectsIntensity?: number; // 0..1
  motionSpeed?: number; // 0.5..2
  background?: boolean;
  overlays?: Partial<Record<FxOverlayId, boolean>>;
  cursor?: boolean;
}
```

- [ ] **Step 2: 写对比度工具失败测试**

`src/lib/themes/contrast.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { contrastRatio, relativeLuminance } from "./contrast";

describe("contrast", () => {
  it("黑白对比为 21", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });
  it("白底相对亮度为 1", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
  });
  it("非法输入抛错", () => {
    expect(() => contrastRatio("nope", "#fff")).toThrow();
  });
});
```

- [ ] **Step 3: 运行确认失败** → `pnpm vitest run src/lib/themes/contrast.test.ts`（FAIL：模块不存在）

- [ ] **Step 4: 实现 contrast.ts**

```ts
function parseHex(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`非法 hex 色值: ${hex}（对比度检查仅支持 #rrggbb）`);
  const n = Number.parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const [l1, l2] = [relativeLuminance(hexA), relativeLuminance(hexB)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}
```

- [ ] **Step 5: 运行确认通过** → 同上（PASS）

- [ ] **Step 6: 写 void 主题（设计规范 §2.1 全量令牌）**

`src/themes/void/index.ts`：

```ts
import type { Theme } from "@/themes/contract";

const voidTokens = {
  color: {
    bg: "#05060a",
    bgElevated: "#0a0c12",
    surface: "#0e1118",
    surfaceHover: "#131722",
    ink: "#e8ecf1",
    inkSecondary: "#aab3c0",
    inkMuted: "#8b95a5",
    inkFaint: "#525c6b",
    accent: "#5eead4",
    accentHover: "#7ff0dd",
    accentInk: "#04211c",
    border: "rgba(148, 180, 200, 0.10)",
    borderStrong: "rgba(94, 234, 212, 0.30)",
    danger: "#fb7185",
    success: "#4ade80",
    warning: "#fbbf24",
    glow: "rgba(94, 234, 212, 0.35)",
  },
  typography: {
    sans: 'var(--font-geist-sans), "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
    mono: 'var(--font-geist-mono), ui-monospace, "SFMono-Regular", monospace',
    display: 'var(--font-geist-sans), "PingFang SC", "Microsoft YaHei", sans-serif',
    scale: {
      display: { size: "clamp(2.5rem, 6vw, 4.5rem)", lineHeight: "1.05", tracking: "-0.03em", weight: 600 },
      h1: { size: "clamp(2rem, 4vw, 3rem)", lineHeight: "1.15", tracking: "-0.02em", weight: 600 },
      h2: { size: "1.75rem", lineHeight: "1.3", tracking: "-0.01em", weight: 600 },
      h3: { size: "1.25rem", lineHeight: "1.4", tracking: "0", weight: 600 },
      body: { size: "1.0625rem", lineHeight: "1.75", tracking: "0", weight: 400 },
      small: { size: "0.875rem", lineHeight: "1.6", tracking: "0.01em", weight: 400 },
      micro: { size: "0.75rem", lineHeight: "1.5", tracking: "0.06em", weight: 500 },
    },
  },
  space: { unit: 4, containerMax: "72rem", gutter: "1.5rem", sectionY: "6rem" },
  shape: { radiusSm: "2px", radiusMd: "4px", radiusLg: "6px", borderWidth: "1px" },
  elevation: {
    shadowSm: "0 1px 2px rgba(0, 0, 0, 0.4)",
    shadowMd: "0 8px 24px rgba(0, 0, 0, 0.5)",
    glow: "0 0 24px rgba(94, 234, 212, 0.15)",
  },
  texture: { noiseOpacity: 0.03, gridOpacity: 0.05, scanlineOpacity: 0.04 },
} satisfies Theme["tokens"]["dark"];

export const voidTheme: Theme = {
  meta: {
    id: "void",
    name: "深空",
    nameEn: "Void",
    description: "极客黑 · 太空歌剧",
    modes: ["dark"],
    status: "stable",
    preview: { accent: "#5eead4", bg: "#05060a", hasFx: true },
  },
  tokens: { dark: voidTokens },
  motion: {
    personality: "cinematic",
    easing: {
      entrance: "cubic-bezier(0.16, 1, 0.3, 1)",
      exit: "cubic-bezier(0.7, 0, 0.84, 0)",
      emphasis: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      scroll: "power2.out",
    },
    duration: { micro: 120, ui: 280, section: 800, scene: 1600 },
    gsap: { ease: "power3.out" },
    spring: { ui: { stiffness: 260, damping: 30 }, layout: { stiffness: 300, damping: 32 } },
    scrollIntensity: 0.9,
  },
  effects: {
    background: "starfield",
    overlays: ["scanline", "grain"],
    cursor: "reticle",
    hud: true,
    intensity: 0.7,
  },
  genui: {
    catalogVariant: "hud",
    openuiVariant: "hud",
    streamReveal: { stagger: 24, effect: "decode" },
  },
};
```

- [ ] **Step 7: 写 lumen 主题（双模，设计规范 §2.2）**

`src/themes/lumen/index.ts`（要点：`inkMuted` 浅色已按 AA 调至 `#6b6b6b`）：

```ts
import type { Theme, ThemeTokens } from "@/themes/contract";

const scale: ThemeTokens["typography"]["scale"] = {
  display: { size: "clamp(2.5rem, 6vw, 4.5rem)", lineHeight: "1.08", tracking: "-0.03em", weight: 600 },
  h1: { size: "clamp(2rem, 4vw, 3rem)", lineHeight: "1.15", tracking: "-0.03em", weight: 600 },
  h2: { size: "1.75rem", lineHeight: "1.3", tracking: "-0.02em", weight: 600 },
  h3: { size: "1.25rem", lineHeight: "1.4", tracking: "-0.01em", weight: 600 },
  body: { size: "1.0625rem", lineHeight: "1.6", tracking: "0", weight: 400 },
  small: { size: "0.875rem", lineHeight: "1.55", tracking: "0", weight: 400 },
  micro: { size: "0.75rem", lineHeight: "1.5", tracking: "0.05em", weight: 500 },
};

const fonts: ThemeTokens["typography"] = {
  sans: 'var(--font-inter), "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
  mono: 'var(--font-geist-mono), ui-monospace, "SFMono-Regular", monospace',
  display: 'var(--font-inter), "PingFang SC", "Microsoft YaHei", sans-serif',
  scale,
};

function lumenTokens(c: ThemeTokens["color"]): ThemeTokens {
  return {
    color: c,
    typography: fonts,
    space: { unit: 4, containerMax: "72rem", gutter: "1.5rem", sectionY: "8rem" },
    shape: { radiusSm: "8px", radiusMd: "12px", radiusLg: "18px", borderWidth: "1px" },
    elevation: {
      shadowSm: "0 1px 2px rgba(0, 0, 0, 0.04)",
      shadowMd: "0 1px 2px rgba(0, 0, 0, 0.04), 0 8px 24px rgba(0, 0, 0, 0.06)",
      glow: "0 0 0 rgba(0, 0, 0, 0)",
    },
    texture: { noiseOpacity: 0, gridOpacity: 0, scanlineOpacity: 0 },
  };
}

export const lumenTheme: Theme = {
  meta: {
    id: "lumen",
    name: "流明",
    nameEn: "Lumen",
    description: "OpenAI × Apple 极简",
    modes: ["light", "dark"],
    status: "stable",
    preview: { accent: "#0071e3", bg: "#ffffff", hasFx: false },
  },
  tokens: {
    light: lumenTokens({
      bg: "#ffffff",
      bgElevated: "#fafafa",
      surface: "#ffffff",
      surfaceHover: "#f5f5f5",
      ink: "#1a1a1a",
      inkSecondary: "#4a4a4a",
      inkMuted: "#6b6b6b",
      inkFaint: "#b0b0b0",
      accent: "#0071e3",
      accentHover: "#0062c4",
      accentInk: "#ffffff",
      border: "rgba(0, 0, 0, 0.08)",
      borderStrong: "rgba(0, 0, 0, 0.16)",
      danger: "#d92d20",
      success: "#067647",
      warning: "#b54708",
      glow: "rgba(0, 0, 0, 0)",
    }),
    dark: lumenTokens({
      bg: "#0d0d0d",
      bgElevated: "#141414",
      surface: "#161616",
      surfaceHover: "#1f1f1f",
      ink: "#ececec",
      inkSecondary: "#b8b8b8",
      inkMuted: "#8a8a8a",
      inkFaint: "#575757",
      accent: "#0a84ff",
      accentHover: "#3d9bff",
      accentInk: "#04121f",
      border: "rgba(255, 255, 255, 0.10)",
      borderStrong: "rgba(255, 255, 255, 0.20)",
      danger: "#f97066",
      success: "#47cd89",
      warning: "#fdb022",
      glow: "rgba(0, 0, 0, 0)",
    }),
  },
  motion: {
    personality: "precise",
    easing: {
      entrance: "cubic-bezier(0.25, 0.1, 0.25, 1)",
      exit: "cubic-bezier(0.4, 0, 1, 1)",
      emphasis: "cubic-bezier(0.22, 1, 0.36, 1)",
      scroll: "power1.out",
    },
    duration: { micro: 100, ui: 220, section: 400, scene: 600 },
    gsap: { ease: "power2.out" },
    spring: { ui: { stiffness: 400, damping: 40 }, layout: { stiffness: 420, damping: 42 } },
    scrollIntensity: 0.15,
  },
  effects: { background: "none", overlays: [], cursor: "default", hud: false, intensity: 0 },
  genui: {
    catalogVariant: "clean",
    openuiVariant: "clean",
    streamReveal: { stagger: 30, effect: "fade" },
  },
};
```

- [ ] **Step 8: 写注册表 + 注册表测试**

`src/themes/registry.ts`：

```ts
import type { Theme } from "@/themes/contract";
import { lumenTheme } from "@/themes/lumen";
import { voidTheme } from "@/themes/void";

export const themeList: Theme[] = [voidTheme, lumenTheme];
export const themeRegistry: Record<string, Theme> = Object.fromEntries(
  themeList.map((t) => [t.meta.id, t]),
);
export function getTheme(id: string): Theme | undefined {
  return themeRegistry[id];
}
```

`src/themes/registry.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { getTheme, themeList } from "./registry";

describe("主题注册表", () => {
  it("void/lumen 均已注册", () => {
    expect(getTheme("void")?.meta.nameEn).toBe("Void");
    expect(getTheme("lumen")?.meta.modes).toEqual(["light", "dark"]);
  });
  it("每个主题声明的模式都有令牌", () => {
    for (const t of themeList) {
      for (const mode of t.meta.modes) {
        expect(t.tokens[mode], `${t.meta.id}:${mode}`).toBeDefined();
      }
    }
  });
});
```

- [ ] **Step 9: 写 theme:check 脚本（对比度门禁）**

`scripts/theme-check.ts`：

```ts
import { contrastRatio } from "../src/lib/themes/contrast";
import { themeList } from "../src/themes/registry";

const MIN = { ink: 7, inkSecondary: 4.5, inkMuted: 4.5, accentInk: 4.5 } as const;
let failures = 0;

for (const theme of themeList) {
  for (const mode of theme.meta.modes) {
    const t = theme.tokens[mode];
    if (!t) {
      console.error(`✗ ${theme.meta.id}:${mode} 缺少令牌`);
      failures++;
      continue;
    }
    const checks: Array<[string, number]> = [
      ["ink/bg", contrastRatio(t.color.ink, t.color.bg)],
      ["inkSecondary/bg", contrastRatio(t.color.inkSecondary, t.color.bg)],
      ["inkMuted/bg", contrastRatio(t.color.inkMuted, t.color.bg)],
      ["accentInk/accent", contrastRatio(t.color.accentInk, t.color.accent)],
    ];
    for (const [label, ratio] of checks) {
      const min = MIN[label.split("/")[0] as keyof typeof MIN];
      const ok = ratio >= min;
      if (!ok) failures++;
      console.log(`${ok ? "✓" : "✗"} ${theme.meta.id}:${mode} ${label} = ${ratio.toFixed(2)} (≥${min})`);
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} 项对比度未达标`);
  process.exit(1);
}
console.log("\n主题契约校验通过");
```

- [ ] **Step 10: 全量验证**

Run: `pnpm test && pnpm theme:check`
Expected: 单测全绿；theme:check 输出全部 ✓（若某比率未达阈值：**修令牌色值而不是降阈值**，改完同步 `docs/specs/01-design-spec.md` 对应表格）

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: 主题契约 + void/lumen 主题数据 + 对比度门禁"
```

---

### Task 3: Token → CSS 生成管线

**Files:**
- Create: `src/lib/themes/css.ts` · `src/lib/themes/css.test.ts` · `tests/e2e/theme-vars.spec.ts`
- Modify: `scripts/gen-theme-css.ts`（替换占位）· `src/app/globals.css`（全量重写）

**Interfaces:**
- Consumes: `themeList`（Task 2）
- Produces: `themeVarsCss(themes: Theme[]): string`（纯函数，可测）；构建产物 `src/app/theme-vars.generated.css`，选择器约定 **`[data-theme="<id>"]` + `[data-mode="<mode>"]`**；CSS 变量命名 `--bg` `--ink-secondary` `--radius-sm` `--text-h1-size` 等（camelCase → kebab）

- [ ] **Step 1: 写失败测试**

`src/lib/themes/css.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { themeVarsCss } from "./css";
import { lumenTheme, voidTheme } from "@/themes/registry";

describe("themeVarsCss", () => {
  const css = themeVarsCss([voidTheme, lumenTheme]);

  it("为每个主题×模式产出选择器", () => {
    expect(css).toContain('[data-theme="void"][data-mode="dark"]');
    expect(css).toContain('[data-theme="lumen"][data-mode="light"]');
    expect(css).toContain('[data-theme="lumen"][data-mode="dark"]');
  });
  it("单模主题同时匹配无 mode 属性场景", () => {
    expect(css).toContain('[data-theme="void"], [data-theme="void"][data-mode="dark"]');
  });
  it("令牌转 kebab-case 变量", () => {
    expect(css).toContain("--bg: #05060a");
    expect(css).toContain("--ink-secondary: #aab3c0");
    expect(css).toContain("--radius-sm: 2px");
    expect(css).toContain("--text-h1-size:");
  });
  it("accent 走 oklch 色相旋转钩子", () => {
    expect(css).toContain("oklch(from #5eead4 l c calc(h + var(--hue-rotate, 0)))");
  });
});
```

- [ ] **Step 2: 运行确认失败** → `pnpm vitest run src/lib/themes/css.test.ts`（FAIL）

- [ ] **Step 3: 实现 css.ts**

```ts
import type { Theme, ThemeMode } from "@/themes/contract";

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** accent 系色值包一层 OKLCH 色相旋转（个性化 accentHue 的运行时钩子） */
function colorValue(key: string, value: string): string {
  if (key === "accent" || key === "accentHover") {
    return `oklch(from ${value} l c calc(h + var(--hue-rotate, 0)))`;
  }
  return value;
}

function tokensToDecls(theme: Theme, mode: ThemeMode): string {
  const t = theme.tokens[mode];
  if (!t) throw new Error(`${theme.meta.id}:${mode} 缺少令牌`);
  const decls: string[] = [];
  for (const [key, value] of Object.entries(t.color)) {
    decls.push(`  --${kebab(key)}: ${colorValue(key, value)};`);
  }
  for (const [key, value] of Object.entries(t.shape)) decls.push(`  --${kebab(key)}: ${value};`);
  for (const [key, value] of Object.entries(t.elevation)) decls.push(`  --${kebab(key)}: ${value};`);
  for (const [key, value] of Object.entries(t.texture)) decls.push(`  --${kebab(key)}: ${value};`);
  decls.push(`  --space-unit: ${t.space.unit}px;`);
  decls.push(`  --container-max: ${t.space.containerMax};`);
  decls.push(`  --gutter: ${t.space.gutter};`);
  decls.push(`  --section-y: ${t.space.sectionY};`);
  decls.push(`  --font-sans: ${t.typography.sans};`);
  decls.push(`  --font-mono: ${t.typography.mono};`);
  decls.push(`  --font-display: ${t.typography.display};`);
  for (const [level, v] of Object.entries(t.typography.scale)) {
    decls.push(`  --text-${kebab(level)}-size: ${v.size};`);
    decls.push(`  --text-${kebab(level)}-lh: ${v.lineHeight};`);
    decls.push(`  --text-${kebab(level)}-tracking: ${v.tracking};`);
    decls.push(`  --text-${kebab(level)}-weight: ${v.weight};`);
  }
  return decls.join("\n");
}

export function themeVarsCss(themes: Theme[]): string {
  const blocks: string[] = [
    "/* 自动生成：scripts/gen-theme-css.ts —— 请勿手改 */",
    ":root {\n  --hue-rotate: 0;\n}",
  ];
  for (const theme of themes) {
    for (const mode of theme.meta.modes) {
      const selector =
        theme.meta.modes.length === 1
          ? `[data-theme="${theme.meta.id}"], [data-theme="${theme.meta.id}"][data-mode="${mode}"]`
          : `[data-theme="${theme.meta.id}"][data-mode="${mode}"]`;
      blocks.push(`${selector} {\n${tokensToDecls(theme, mode)}\n}`);
    }
  }
  return `${blocks.join("\n\n")}\n`;
}
```

- [ ] **Step 4: 实现生成脚本**

`scripts/gen-theme-css.ts`（全量替换占位）：

```ts
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { themeVarsCss } from "../src/lib/themes/css";
import { themeList } from "../src/themes/registry";

const out = resolve(__dirname, "../src/app/theme-vars.generated.css");
writeFileSync(out, themeVarsCss(themeList));
console.log(`✓ 已生成 ${out}（${themeList.length} 主题）`);
```

- [ ] **Step 5: 重写 globals.css**

`src/app/globals.css` 全量替换：

```css
@import "tailwindcss";
@import "./theme-vars.generated.css";

@theme inline {
  --color-bg: var(--bg);
  --color-bg-elevated: var(--bg-elevated);
  --color-surface: var(--surface);
  --color-surface-hover: var(--surface-hover);
  --color-ink: var(--ink);
  --color-ink-secondary: var(--ink-secondary);
  --color-ink-muted: var(--ink-muted);
  --color-ink-faint: var(--ink-faint);
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-accent-ink: var(--accent-ink);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-danger: var(--danger);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-glow: var(--glow);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --font-display: var(--font-display);
  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
}

html {
  color-scheme: dark light;
}

body {
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-sans);
  transition: background-color 0.2s ease, color 0.2s ease;
}

@media (prefers-reduced-motion: reduce) {
  body {
    transition: none;
  }
}
```

- [ ] **Step 6: 生成 + 验证**

Run: `pnpm vitest run src/lib/themes/css.test.ts && pnpm predev`
Expected: 测试 PASS；`src/app/theme-vars.generated.css` 已生成

- [ ] **Step 7: 写 E2E——data-theme 切换时 CSS 变量生效**

`tests/e2e/theme-vars.spec.ts`：

```ts
import { expect, test } from "@playwright/test";

test("CSS 变量随 data-theme 切换", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "void"));
  const voidBg = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(),
  );
  expect(voidBg).toBe("#05060a");

  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "lumen");
    document.documentElement.setAttribute("data-mode", "light");
  });
  const lumenBg = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(),
  );
  expect(lumenBg).toBe("#ffffff");
});
```

- [ ] **Step 8: 运行 E2E** → `pnpm e2e`（PASS）

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: token→CSS 生成管线 + Tailwind 映射 + 变量切换 E2E"
```

---

### Task 4: 主题解析引擎 + theme-store

**Files:**
- Create: `src/lib/themes/resolve.ts` · `src/lib/themes/resolve.test.ts` · `src/stores/theme-store.ts` · `src/stores/theme-store.test.ts`

**Interfaces:**
- Consumes: `Theme`/`ThemeOverrides`（Task 2）
- Produces（名称冻结）：
  - `resolveTheme(theme: Theme, mode: ThemeMode, overrides?: ThemeOverrides): ResolvedTheme`
  - `ResolvedTheme = { meta: ThemeMeta; mode: ThemeMode; tokens: ThemeTokens; motion: ThemeMotion; effects: ThemeEffects; genui: ThemeGenUI; overrides: ThemeOverrides }`（`src/lib/themes/resolve.ts`）
  - `useThemeStore`（`src/stores/theme-store.ts`）：`{ themeId, modeChoice: 'light'|'dark'|'system', mode: ThemeMode, overrides, resolved, setTheme(id), setMode(choice), setOverride(k, v), resetOverrides(), hydrate() }`

- [ ] **Step 1: 写 resolve 失败测试**

`src/lib/themes/resolve.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { resolveTheme } from "./resolve";
import { lumenTheme, voidTheme } from "@/themes/registry";

describe("resolveTheme", () => {
  it("单模主题忽略传入模式", () => {
    expect(resolveTheme(voidTheme, "light").mode).toBe("dark");
  });
  it("双模主题按模式取令牌", () => {
    expect(resolveTheme(lumenTheme, "light").tokens.color.bg).toBe("#ffffff");
    expect(resolveTheme(lumenTheme, "dark").tokens.color.bg).toBe("#0d0d0d");
  });
  it("motionSpeed 缩放全部时长", () => {
    const r = resolveTheme(voidTheme, "dark", { motionSpeed: 2 });
    expect(r.motion.duration.ui).toBe(560);
    expect(r.motion.duration.scene).toBe(3200);
  });
  it("effectsIntensity 覆盖主题默认", () => {
    expect(resolveTheme(voidTheme, "dark", { effectsIntensity: 0.2 }).effects.intensity).toBe(0.2);
    expect(resolveTheme(voidTheme, "dark").effects.intensity).toBe(0.7);
  });
  it("background=false 关闭背景特效", () => {
    expect(resolveTheme(voidTheme, "dark", { background: false }).effects.background).toBe("none");
  });
  it("解析结果是新对象，不修改源主题（纯函数）", () => {
    const r = resolveTheme(voidTheme, "dark", { motionSpeed: 2 });
    expect(r.motion).not.toBe(voidTheme.motion);
    expect(voidTheme.motion.duration.ui).toBe(280);
  });
});
```

- [ ] **Step 2: 运行确认失败** → `pnpm vitest run src/lib/themes/resolve.test.ts`

- [ ] **Step 3: 实现 resolve.ts**

```ts
import type {
  Theme,
  ThemeEffects,
  ThemeGenUI,
  ThemeMeta,
  ThemeMode,
  ThemeMotion,
  ThemeOverrides,
  ThemeTokens,
} from "@/themes/contract";

export interface ResolvedTheme {
  meta: ThemeMeta;
  mode: ThemeMode;
  tokens: ThemeTokens;
  motion: ThemeMotion;
  effects: ThemeEffects;
  genui: ThemeGenUI;
  overrides: ThemeOverrides;
}

export function resolveTheme(
  theme: Theme,
  mode: ThemeMode,
  overrides: ThemeOverrides = {},
): ResolvedTheme {
  const effectiveMode: ThemeMode = theme.meta.modes.includes(mode) ? mode : theme.meta.modes[0];
  const tokens = theme.tokens[effectiveMode];
  if (!tokens) throw new Error(`主题 ${theme.meta.id} 缺少 ${effectiveMode} 模式令牌`);

  const speed = overrides.motionSpeed ?? 1;
  const scale = (ms: number) => Math.round(ms * speed);
  const motion: ThemeMotion = {
    ...theme.motion,
    duration: {
      micro: scale(theme.motion.duration.micro),
      ui: scale(theme.motion.duration.ui),
      section: scale(theme.motion.duration.section),
      scene: scale(theme.motion.duration.scene),
    },
  };

  const backgroundOff = overrides.background === false || theme.effects.background === "none";
  const effects: ThemeEffects = {
    ...theme.effects,
    background: backgroundOff ? "none" : theme.effects.background,
    intensity: overrides.effectsIntensity ?? theme.effects.intensity,
  };

  return { meta: theme.meta, mode: effectiveMode, tokens, motion, effects, genui: theme.genui, overrides };
}
```

- [ ] **Step 4: 运行确认通过**

- [ ] **Step 5: 写 store 失败测试**

`src/stores/theme-store.test.ts`：

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { useThemeStore } from "./theme-store";

describe("theme-store", () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.getState().hydrate();
  });

  it("默认 void", () => {
    expect(useThemeStore.getState().themeId).toBe("void");
    expect(useThemeStore.getState().resolved.meta.id).toBe("void");
  });

  it("setTheme 切换并持久化", () => {
    useThemeStore.getState().setTheme("lumen");
    expect(useThemeStore.getState().resolved.meta.id).toBe("lumen");
    expect(JSON.parse(localStorage.getItem("shizurak:theme") ?? "{}").themeId).toBe("lumen");
  });

  it("setOverride 触发 resolved 重算并持久化", () => {
    useThemeStore.getState().setOverride("motionSpeed", 2);
    expect(useThemeStore.getState().resolved.motion.duration.ui).toBe(560);
    expect(JSON.parse(localStorage.getItem("shizurak:theme") ?? "{}").overrides.motionSpeed).toBe(2);
  });

  it("hydrate 从 localStorage 还原", () => {
    localStorage.setItem(
      "shizurak:theme",
      JSON.stringify({ themeId: "lumen", overrides: { accentHue: 40 } }),
    );
    useThemeStore.getState().hydrate();
    expect(useThemeStore.getState().themeId).toBe("lumen");
    expect(useThemeStore.getState().overrides.accentHue).toBe(40);
  });

  it("未知主题 id 回退 void", () => {
    localStorage.setItem("shizurak:theme", JSON.stringify({ themeId: "nope" }));
    useThemeStore.getState().hydrate();
    expect(useThemeStore.getState().themeId).toBe("void");
  });
});
```

- [ ] **Step 6: 实现 store**

`src/stores/theme-store.ts`：

```ts
"use client";

import { create } from "zustand";
import type { ThemeMode, ThemeOverrides } from "@/themes/contract";
import { getTheme, voidTheme } from "@/themes/registry";
import { resolveTheme, type ResolvedTheme } from "@/lib/themes/resolve";

const STORAGE_KEY = "shizurak:theme";

interface PersistedShape {
  themeId: string;
  overrides: ThemeOverrides;
}

function readPersisted(): PersistedShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { themeId: voidTheme.meta.id, overrides: {} };
    const parsed = JSON.parse(raw) as Partial<PersistedShape>;
    return {
      themeId: typeof parsed.themeId === "string" ? parsed.themeId : voidTheme.meta.id,
      overrides: (parsed.overrides ?? {}) as ThemeOverrides,
    };
  } catch {
    return { themeId: voidTheme.meta.id, overrides: {} };
  }
}

interface ThemeStore {
  themeId: string;
  modeChoice: ThemeMode | "system";
  mode: ThemeMode;
  overrides: ThemeOverrides;
  resolved: ResolvedTheme;
  setTheme: (id: string) => void;
  setMode: (choice: ThemeMode | "system") => void;
  setOverride: <K extends keyof ThemeOverrides>(key: K, value: ThemeOverrides[K]) => void;
  resetOverrides: () => void;
  hydrate: () => void;
}

function build(themeId: string, modeChoice: ThemeMode | "system", overrides: ThemeOverrides) {
  const theme = getTheme(themeId) ?? voidTheme;
  const systemDark =
    typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)").matches : true;
  const mode: ThemeMode = modeChoice === "system" ? (systemDark ? "dark" : "light") : modeChoice;
  return {
    themeId: theme.meta.id,
    modeChoice,
    mode,
    overrides,
    resolved: resolveTheme(theme, mode, overrides),
  };
}

function persist(themeId: string, overrides: ThemeOverrides) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ themeId, overrides }));
  } catch {
    /* 隐私模式下忽略 */
  }
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  ...build(voidTheme.meta.id, "system", {}),
  setTheme: (id) => {
    const next = build(id, get().modeChoice, get().overrides);
    set(next);
    persist(next.themeId, next.overrides);
  },
  setMode: (choice) => {
    set(build(get().themeId, choice, get().overrides));
  },
  setOverride: (key, value) => {
    const overrides = { ...get().overrides, [key]: value };
    const next = build(get().themeId, get().modeChoice, overrides);
    set(next);
    persist(next.themeId, next.overrides);
  },
  resetOverrides: () => {
    const next = build(get().themeId, get().modeChoice, {});
    set(next);
    persist(next.themeId, next.overrides);
  },
  hydrate: () => {
    const p = readPersisted();
    set(build(p.themeId, get().modeChoice, p.overrides));
  },
}));
```

- [ ] **Step 7: 运行确认通过** → `pnpm vitest run src/stores/theme-store.test.ts`

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: 主题解析引擎（纯函数）+ theme-store（持久化/微调/回退）"
```

---

### Task 5: i18n 路由预适配（proxy + 字典 + [lang] 根布局）

**Files:**
- Create: `src/lib/i18n/negotiate.ts` · `src/lib/i18n/negotiate.test.ts` · `src/proxy.ts` · `src/app/[lang]/dictionaries.ts` · `src/app/[lang]/dictionaries/zh.json` · `src/app/[lang]/dictionaries/en.json` · `src/app/[lang]/layout.tsx` · `src/app/[lang]/(site)/page.tsx`（临时占位）
- Delete: `src/app/layout.tsx` · `src/app/page.tsx`
- Modify: `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Produces（名称冻结）：
  - `locales: readonly ['zh','en']` · `type Locale` · `defaultLocale: 'zh'` · `hasLocale(x: string): x is Locale` · `negotiateLocale(acceptLanguage: string | null): Locale`（`src/lib/i18n/negotiate.ts`）
  - `getDictionary(): Promise<Dictionary>`（`src/app/[lang]/dictionaries.ts`，服务端经 `next/root-params` 读语言）
- 字典键约定（M0 冻结，M1 只增不改）：`site.title` `site.tagline` `nav.posts` `nav.projects` `nav.about` `nav.lab` `nav.theme` `footer.rights` `home.heroKicker` `theme.*`（switcher/mode/light/dark/system/customize/accentHue/intensity/motionSpeed）`command.*`（placeholder/nav/theme/empty）

- [ ] **Step 1: 写协商函数失败测试**

`src/lib/i18n/negotiate.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { hasLocale, negotiateLocale } from "./negotiate";

describe("negotiateLocale", () => {
  it("中文优先匹配", () => {
    expect(negotiateLocale("zh-CN,zh;q=0.9,en;q=0.8")).toBe("zh");
  });
  it("英文请求匹配 en", () => {
    expect(negotiateLocale("en-US,en;q=0.9")).toBe("en");
  });
  it("不支持语言回落默认 zh", () => {
    expect(negotiateLocale("fr-FR,fr;q=0.9")).toBe("zh");
  });
  it("空/垃圾输入回落默认", () => {
    expect(negotiateLocale(null)).toBe("zh");
    expect(negotiateLocale("")).toBe("zh");
    expect(negotiateLocale(";;;q=???")).toBe("zh");
  });
  it("hasLocale 收窄", () => {
    expect(hasLocale("zh")).toBe(true);
    expect(hasLocale("jp")).toBe(false);
  });
});
```

- [ ] **Step 2: 运行确认失败** → `pnpm vitest run src/lib/i18n/negotiate.test.ts`

- [ ] **Step 3: 实现 negotiate.ts**

```ts
import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

export const locales = ["zh", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "zh";

export function hasLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;
  try {
    const languages = new Negotiator({
      headers: { "accept-language": acceptLanguage },
    }).languages();
    return match(languages, [...locales], defaultLocale) as Locale;
  } catch {
    return defaultLocale;
  }
}
```

- [ ] **Step 4: 写 proxy.ts**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { hasLocale, negotiateLocale } from "@/lib/i18n/negotiate";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1] ?? "";
  if (hasLocale(first)) return NextResponse.next();

  const locale = negotiateLocale(request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Step 5: 写字典与 dictionaries.ts**

`src/app/[lang]/dictionaries/zh.json`：

```json
{
  "site": { "title": "伍泽凯 · Shizurak", "tagline": "从生产环境里长出来的技术" },
  "nav": { "posts": "文章", "projects": "项目", "about": "关于", "lab": "实验室", "theme": "主题" },
  "footer": { "rights": "© 2026 伍泽凯 · shizurak" },
  "home": { "heroKicker": "个人站点 · 建设中" },
  "theme": {
    "switcher": "主题",
    "mode": "明暗",
    "light": "浅色",
    "dark": "深色",
    "system": "跟随系统",
    "customize": "个性化",
    "accentHue": "强调色相",
    "intensity": "特效强度",
    "motionSpeed": "动效速度"
  },
  "command": {
    "placeholder": "搜索或输入命令…",
    "nav": "导航",
    "theme": "主题",
    "empty": "无匹配结果"
  }
}
```

`src/app/[lang]/dictionaries/en.json`：同结构英文文案（`site.title` → `"Shizurak · Zekai Wu"`，其余直译）。

`src/app/[lang]/dictionaries.ts`：

```ts
import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { hasLocale, type Locale } from "@/lib/i18n/negotiate";

const dictionaries = {
  zh: () => import("./dictionaries/zh.json").then((m) => m.default),
  en: () => import("./dictionaries/en.json").then((m) => m.default),
} satisfies Record<Locale, () => Promise<unknown>>;

export type Dictionary = Awaited<ReturnType<(typeof dictionaries)["zh"]>>;

export async function getDictionary(): Promise<Dictionary> {
  const locale = await lang();
  if (!hasLocale(locale)) notFound();
  return dictionaries[locale]() as Promise<Dictionary>;
}
```

- [ ] **Step 6: 写 [lang] 根布局，删除旧布局**

`src/app/[lang]/layout.tsx`：

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n/negotiate";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Shizurak",
  description: "伍泽凯的个人博客 —— Agent Harness 原生",
};

export async function generateStaticParams() {
  return [{ lang: "zh" }, { lang: "en" }];
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return (
    <html
      lang={lang}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable}`}
    >
      <body className="min-h-dvh bg-bg text-ink antialiased">{children}</body>
    </html>
  );
}
```

删除旧文件：`rm src/app/layout.tsx src/app/page.tsx`（职责由 `[lang]/layout.tsx` 与临时首页承接）。

- [ ] **Step 7: 临时首页占位（Task 10 全量替换）**

`src/app/[lang]/(site)/page.tsx`：

```tsx
import { getDictionary } from "../dictionaries";

export default async function HomePage() {
  const dict = await getDictionary();
  return (
    <main className="mx-auto max-w-[var(--container-max)] p-6">
      <h1 className="text-[length:var(--text-h1-size)]">{dict.site.title}</h1>
      <p className="text-ink-muted">{dict.home.heroKicker}</p>
    </main>
  );
}
```

- [ ] **Step 8: 更新 E2E**

`tests/e2e/smoke.spec.ts` 全量替换：

```ts
import { expect, test } from "@playwright/test";

test("根路径按语言协商重定向", async ({ page }) => {
  // Playwright 默认 Accept-Language 为 en-US → 期望 /en
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
});

test("中文直连渲染中文标题且 html lang=zh", async ({ page }) => {
  await page.goto("/zh");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("伍泽凯");
});

test("不支持的语言 404", async ({ page }) => {
  const res = await page.goto("/jp");
  // /jp 不在 locales 中：proxy 重定向为 /zh/jp，再由 [lang] 层 404
  expect(res?.status()).toBe(404);
});
```

- [ ] **Step 9: 全量验证**

Run: `pnpm test && pnpm e2e`
Expected: 全绿（`next dev` 首次运行会重写 AGENTS.md，随提交带上）

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: i18n 预适配——proxy 语言协商 + root-params 字典 + [lang] 根布局"
```

---

### Task 6: ThemeProvider（next-themes 集成 + 无闪烁 + URL/localStorage 水合）

**Files:**
- Create: `src/lib/themes/init-script.ts` · `src/lib/themes/init-script.test.ts` · `src/components/providers/theme-provider.tsx` · `src/lib/motion/gsap.ts`
- Modify: `src/app/[lang]/layout.tsx`（挂 provider + 内联脚本）

**Interfaces:**
- Consumes: `useThemeStore`（Task 4）
- Produces（名称冻结）：
  - `THEME_INIT_SCRIPT: string`（防闪烁内联脚本源码）
  - `<ThemeProvider>{children}</ThemeProvider>`（`theme-provider.tsx`，'use client'）
  - `registerGsap(): void` · `applyMotionDefaults(motion: ThemeMotion): void`（`src/lib/motion/gsap.ts`）

- [ ] **Step 1: 写 init-script 失败测试（jsdom 实执行）**

`src/lib/themes/init-script.test.ts`：

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { THEME_INIT_SCRIPT } from "./init-script";

function runScript() {
  // jsdom 中直接执行内联脚本源码，验证真实行为
  window.eval(THEME_INIT_SCRIPT);
}

describe("THEME_INIT_SCRIPT", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.removeProperty("--hue-rotate");
  });

  it("从 localStorage 还原 data-theme", () => {
    localStorage.setItem("shizurak:theme", JSON.stringify({ themeId: "lumen", overrides: {} }));
    runScript();
    expect(document.documentElement.getAttribute("data-theme")).toBe("lumen");
  });

  it("还原 accentHue 到 --hue-rotate", () => {
    localStorage.setItem(
      "shizurak:theme",
      JSON.stringify({ themeId: "void", overrides: { accentHue: 40 } }),
    );
    runScript();
    expect(document.documentElement.style.getPropertyValue("--hue-rotate")).toBe("40deg");
  });

  it("无存储/坏 JSON 时不报错不改属性", () => {
    localStorage.setItem("shizurak:theme", "{oops");
    expect(() => runScript()).not.toThrow();
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });

  it("未知主题 id 不写入", () => {
    localStorage.setItem("shizurak:theme", JSON.stringify({ themeId: "evil" }));
    runScript();
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });
});
```

- [ ] **Step 2: 运行确认失败** → `pnpm vitest run src/lib/themes/init-script.test.ts`

- [ ] **Step 3: 实现 init-script.ts**

```ts
/**
 * 防闪烁内联脚本：在首帧前写入 data-theme 与 --hue-rotate。
 * 通过 <script dangerouslySetInnerHTML> 注入根布局 <head>，必须保持为自执行、无依赖的 ES5 级代码。
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var known=["void","lumen"];
var raw=localStorage.getItem("shizurak:theme");if(!raw)return;
var v=JSON.parse(raw);var d=document.documentElement;
if(v&&typeof v.themeId==="string"&&known.indexOf(v.themeId)!==-1){d.setAttribute("data-theme",v.themeId);}
var o=v&&v.overrides;if(o&&typeof o.accentHue==="number"&&isFinite(o.accentHue)){d.style.setProperty("--hue-rotate",o.accentHue+"deg");}
}catch(e){}})();`;
```

- [ ] **Step 4: 运行确认通过**

- [ ] **Step 5: 实现 gsap.ts（注册与主题默认值）**

`src/lib/motion/gsap.ts`：

```ts
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { ThemeMotion } from "@/themes/contract";

let registered = false;

export function registerGsap(): void {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(useGSAP, ScrollTrigger);
  registered = true;
}

export function applyMotionDefaults(motion: ThemeMotion): void {
  registerGsap();
  gsap.defaults({ ease: motion.gsap.ease, duration: motion.duration.ui / 1000 });
}
```

- [ ] **Step 6: 实现 ThemeProvider**

`src/components/providers/theme-provider.tsx`：

```tsx
"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { useEffect, type ReactNode } from "react";
import { applyMotionDefaults } from "@/lib/motion/gsap";
import { getTheme } from "@/themes/registry";
import { useThemeStore } from "@/stores/theme-store";

function DomSync() {
  const resolved = useThemeStore((s) => s.resolved);
  const { resolvedTheme, setTheme: setNextTheme } = useTheme();

  // store → DOM + GSAP 默认值
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", resolved.meta.id);
    root.style.setProperty("--hue-rotate", `${resolved.overrides.accentHue ?? 0}deg`);
    applyMotionDefaults(resolved.motion);
  }, [resolved]);

  // next-themes(系统模式变化) → store
  useEffect(() => {
    if (resolvedTheme === "light" || resolvedTheme === "dark") {
      if (useThemeStore.getState().mode !== resolvedTheme) {
        useThemeStore.getState().setMode(resolvedTheme);
      }
    }
  }, [resolvedTheme]);

  // store(modelChoice) → next-themes
  const modeChoice = useThemeStore((s) => s.modeChoice);
  useEffect(() => {
    setNextTheme(modeChoice === "system" ? "system" : modeChoice);
  }, [modeChoice, setNextTheme]);

  return null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeId = useThemeStore((s) => s.resolved.meta.id);
  const forced = getTheme(themeId)?.meta.modes.length === 1 ? "dark" : undefined;

  // 首次挂载：URL 分享码 > localStorage
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const urlTheme = sp.get("theme");
    if (urlTheme && getTheme(urlTheme)) {
      useThemeStore.getState().setTheme(urlTheme);
    } else {
      useThemeStore.getState().hydrate();
    }
  }, []);

  return (
    <NextThemesProvider
      attribute="data-mode"
      defaultTheme="system"
      enableSystem
      forcedTheme={forced}
      disableTransitionOnChange
    >
      <DomSync />
      {children}
    </NextThemesProvider>
  );
}
```

- [ ] **Step 7: 挂载到根布局**

`src/app/[lang]/layout.tsx` 修改（新增两处，其余不动）：

```tsx
// import 区新增：
import { ThemeProvider } from "@/components/providers/theme-provider";
import { THEME_INIT_SCRIPT } from "@/lib/themes/init-script";

// <html> 内、<body> 前新增 <head>：
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-bg text-ink antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
```

- [ ] **Step 8: 写 E2E——主题持久化**

`tests/e2e/theme-persist.spec.ts`：

```ts
import { expect, test } from "@playwright/test";

test("主题选择跨刷新持久化且首帧前已就位", async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      (window as unknown as { __themeAtDCL?: string }).__themeAtDCL =
        document.documentElement.getAttribute("data-theme") ?? "";
    });
  });
  await page.goto("/zh");
  await page.evaluate(() =>
    localStorage.setItem("shizurak:theme", JSON.stringify({ themeId: "lumen", overrides: {} })),
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "lumen");
  const atDcl = await page.evaluate(
    () => (window as unknown as { __themeAtDCL?: string }).__themeAtDCL,
  );
  expect(atDcl).toBe("lumen");
});
```

- [ ] **Step 9: 全量验证** → `pnpm test && pnpm e2e`

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: ThemeProvider——next-themes 集成 · 防闪烁内联脚本 · URL/localStorage 水合"
```

---

### Task 7: 站点壳（导航 + 页脚 + 占位页）

**Files:**
- Create: `src/components/site/nav.tsx` · `src/components/site/footer.tsx`
- Create（占位页，M1 填充）：`src/app/[lang]/(site)/posts/page.tsx` · `projects/page.tsx` · `about/page.tsx` · `lab/page.tsx`
- Create: `src/app/[lang]/(site)/layout.tsx`

**Interfaces:**
- Consumes: `getDictionary`（Task 5）
- Produces: `SiteNav({ lang }: { lang: string })` · `SiteFooter()`（RSC 具名导出）；`(site)` 布局是全部公开页面的外壳（特效层在 Task 9 挂到此处）

- [ ] **Step 1: 实现 nav**

`src/components/site/nav.tsx`：

```tsx
import Link from "next/link";
import { getDictionary } from "@/app/[lang]/dictionaries";

export async function SiteNav({ lang }: { lang: string }) {
  const dict = await getDictionary();
  const links = [
    { href: `/${lang}/posts`, label: dict.nav.posts },
    { href: `/${lang}/projects`, label: dict.nav.projects },
    { href: `/${lang}/about`, label: dict.nav.about },
    { href: `/${lang}/lab`, label: dict.nav.lab },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-[var(--container-max)] items-center justify-between px-6">
        <Link href={`/${lang}`} className="font-mono text-sm tracking-widest text-ink">
          SHIZURAK
        </Link>
        <div className="flex items-center gap-6">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-ink-muted hover:text-ink">
              {l.label}
            </Link>
          ))}
          <div id="theme-switcher-slot" />
        </div>
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: 实现 footer**

`src/components/site/footer.tsx`：

```tsx
import { getDictionary } from "@/app/[lang]/dictionaries";

export async function SiteFooter() {
  const dict = await getDictionary();
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex h-12 max-w-[var(--container-max)] items-center justify-between px-6 font-mono text-xs text-ink-muted">
        <span>{dict.footer.rights}</span>
        <span className="tracking-widest">SYS · NOMINAL</span>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: 实现 (site) 布局 + 占位页**

`src/app/[lang]/(site)/layout.tsx`：

```tsx
import { SiteFooter } from "@/components/site/footer";
import { SiteNav } from "@/components/site/nav";

export default async function SiteLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteNav lang={lang} />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
```

占位页四份（`posts`/`projects`/`about`/`lab`），以 posts 为例，其余同构换字典键：

```tsx
import { getDictionary } from "../../dictionaries";

export default async function PostsPage() {
  const dict = await getDictionary();
  return (
    <main className="mx-auto max-w-[var(--container-max)] px-6 py-24">
      <h1 className="text-[length:var(--text-h1-size)] font-semibold">{dict.nav.posts}</h1>
      <p className="mt-4 text-ink-muted">{dict.home.heroKicker}</p>
    </main>
  );
}
```

- [ ] **Step 4: 写 E2E**

`tests/e2e/shell.spec.ts`：

```ts
import { expect, test } from "@playwright/test";

test("导航在工作且指向 [lang] 路由", async ({ page }) => {
  await page.goto("/zh");
  await page.getByRole("link", { name: "文章" }).click();
  await expect(page).toHaveURL(/\/zh\/posts$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("文章");
});

test("页脚遥测条存在", async ({ page }) => {
  await page.goto("/zh");
  await expect(page.getByText("SYS · NOMINAL")).toBeVisible();
});
```

- [ ] **Step 5: 全量验证** → `pnpm test && pnpm e2e`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: 站点壳——导航/页脚/四个占位页"
```

---

### Task 8: 主题切换器 + 个性化面板

**Files:**
- Create: `src/components/site/theme-switcher.tsx` · `tests/e2e/theme-switcher.spec.ts`
- Modify: `src/components/site/nav.tsx`（挂载切换器替换 slot）

**Interfaces:**
- Consumes: `useThemeStore`（Task 4）· `themeList`/`getTheme`（Task 2）· 字典 `theme.*`/`nav.theme`
- Produces: `ThemeSwitcher({ labels }: { labels: Record<string, string> })`（client 组件，无其他 props）

- [ ] **Step 1: 实现 ThemeSwitcher**

`src/components/site/theme-switcher.tsx`：

```tsx
"use client";

import * as Popover from "@radix-ui/react-popover";
import * as Slider from "@radix-ui/react-slider";
import { Palette } from "lucide-react";
import { useState } from "react";
import { useThemeStore } from "@/stores/theme-store";
import { themeList } from "@/themes/registry";

function LabeledSlider({
  label,
  display,
  min,
  max,
  step,
  value,
  onValueChange,
}: {
  label: string;
  display: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onValueChange: (v: number) => void;
}) {
  return (
    <label className="block text-xs text-ink-muted">
      {label} · {display}
      <Slider.Root
        className="relative mt-1 flex h-4 w-full touch-none select-none items-center"
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onValueChange(v)}
      >
        <Slider.Track className="relative h-1 grow rounded-full bg-surface-hover">
          <Slider.Range className="absolute h-full rounded-full bg-accent" />
        </Slider.Track>
        <Slider.Thumb
          aria-label={label}
          className="block size-3 rounded-full bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        />
      </Slider.Root>
    </label>
  );
}

export function ThemeSwitcher({ labels }: { labels: Record<string, string> }) {
  const { themeId, modeChoice, overrides, resolved, setTheme, setMode, setOverride } =
    useThemeStore();
  const [open, setOpen] = useState(false);
  const multiMode = resolved.meta.modes.length > 1;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={labels.switcher}
        className="flex size-8 items-center justify-center rounded-sm text-ink-muted hover:text-ink focus-visible:outline focus-visible:outline-accent"
      >
        <Palette className="size-4" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          align="end"
          className="z-50 w-72 rounded-md border border-border bg-bg-elevated p-4 shadow-[var(--shadow-md)]"
        >
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-ink-muted">
            {labels.switcher}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {themeList.map((t) => (
              <button
                key={t.meta.id}
                type="button"
                onClick={() => setTheme(t.meta.id)}
                data-active={t.meta.id === themeId}
                className="flex items-center gap-2 rounded-sm border border-border p-2 text-left text-sm data-[active=true]:border-border-strong data-[active=true]:text-ink"
              >
                <span
                  aria-hidden
                  className="size-4 rounded-full border border-border"
                  style={{ background: t.meta.preview.accent }}
                />
                <span>
                  {t.meta.name}
                  <span className="block text-xs text-ink-muted">{t.meta.nameEn}</span>
                </span>
              </button>
            ))}
          </div>

          {multiMode && (
            <div className="mt-4">
              <p className="mb-1 font-mono text-xs uppercase tracking-widest text-ink-muted">
                {labels.mode}
              </p>
              <div className="flex gap-1">
                {(["light", "dark", "system"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    data-active={modeChoice === m}
                    className="flex-1 rounded-sm border border-border px-2 py-1 text-xs text-ink-muted data-[active=true]:border-border-strong data-[active=true]:text-ink"
                  >
                    {labels[m]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 space-y-3">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
              {labels.customize}
            </p>
            <LabeledSlider
              label={labels.accentHue}
              display={`${overrides.accentHue ?? 0}°`}
              min={-180}
              max={180}
              step={1}
              value={overrides.accentHue ?? 0}
              onValueChange={(v) => setOverride("accentHue", v)}
            />
            <LabeledSlider
              label={labels.intensity}
              display={(overrides.effectsIntensity ?? resolved.effects.intensity).toFixed(1)}
              min={0}
              max={1}
              step={0.1}
              value={overrides.effectsIntensity ?? resolved.effects.intensity}
              onValueChange={(v) => setOverride("effectsIntensity", v)}
            />
            <LabeledSlider
              label={labels.motionSpeed}
              display={`${(overrides.motionSpeed ?? 1).toFixed(1)}×`}
              min={0.5}
              max={2}
              step={0.1}
              value={overrides.motionSpeed ?? 1}
              onValueChange={(v) => setOverride("motionSpeed", v)}
            />
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
```

- [ ] **Step 2: 挂载进 nav**

`nav.tsx`：把 `<div id="theme-switcher-slot" />` 替换为（字典对象整体传给 client 组件——只传可序列化字符串）：

```tsx
// import 区新增：
import { ThemeSwitcher } from "@/components/site/theme-switcher";

// JSX 替换：
<ThemeSwitcher
  labels={{
    switcher: dict.nav.theme,
    mode: dict.theme.mode,
    light: dict.theme.light,
    dark: dict.theme.dark,
    system: dict.theme.system,
    customize: dict.theme.customize,
    accentHue: dict.theme.accentHue,
    intensity: dict.theme.intensity,
    motionSpeed: dict.theme.motionSpeed,
  }}
/>
```

- [ ] **Step 3: 写 E2E**

`tests/e2e/theme-switcher.spec.ts`：

```ts
import { expect, test } from "@playwright/test";

test("切换主题：data-theme 与 CSS 变量同步", async ({ page }) => {
  await page.goto("/zh");
  await page.getByRole("button", { name: "主题" }).click();
  await page.getByRole("button", { name: /流明/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "lumen");
  const bg = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(),
  );
  expect(bg).toBe("#ffffff");
});

test("色相滑块改变 --hue-rotate", async ({ page }) => {
  await page.goto("/zh");
  await page.getByRole("button", { name: "主题" }).click();
  const slider = page.getByRole("slider", { name: "强调色相" });
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.style.getPropertyValue("--hue-rotate")),
    )
    .toBe("2deg");
});

test("单模主题（void）不显示模式切换", async ({ page }) => {
  await page.goto("/zh");
  await page.getByRole("button", { name: "主题" }).click();
  await expect(page.getByRole("button", { name: "跟随系统" })).toHaveCount(0);
  await page.getByRole("button", { name: /流明/ }).click();
  await expect(page.getByRole("button", { name: "跟随系统" })).toBeVisible();
});
```

- [ ] **Step 4: 全量验证** → `pnpm test && pnpm e2e`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: 主题切换器 + 个性化面板（色相/强度/速度）"
```

---

### Task 9: 特效底座 + starfield

**Files:**
- Create: `src/lib/fx/tier.ts` · `src/lib/fx/tier.test.ts` · `src/lib/fx/registry.ts` · `src/lib/motion/reduced.ts` · `src/components/fx/starfield.tsx` · `src/components/fx/starfield.test.ts` · `src/components/fx/fx-layer.tsx` · `src/stores/ui-shell-store.ts` · `tests/e2e/fx.spec.ts`
- Modify: `src/app/[lang]/(site)/layout.tsx`（挂 FxLayer）

**Interfaces:**
- Consumes: `useThemeStore.resolved.effects`（Task 4）
- Produces（名称冻结）：
  - `type FxTier = 'high' | 'mid' | 'low'` · `detectTier(input: TierInput): FxTier` · `useFxTier(): FxTier`（`src/lib/fx/tier.ts`；**支持 `?fxtier=high|mid|low` 手动覆盖**，供调试与 E2E）
  - `fxRegistry` · `FxProps = { intensity: number; tier: FxTier }`（`src/lib/fx/registry.ts`）
  - `usePrefersReducedMotion(): boolean`（`src/lib/motion/reduced.ts`）
  - `starCount(area: number, tier: FxTier): number` · `Starfield({ intensity, tier }: FxProps)`（canvas 带 `data-fx="starfield"`）
  - `useUIShellStore`（`src/stores/ui-shell-store.ts`）：`{ fxTier, setFxTier, commandOpen, setCommandOpen }`

- [ ] **Step 1: 写 tier 失败测试**

`src/lib/fx/tier.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { detectTier } from "./tier";

describe("detectTier", () => {
  it("无 WebGL2 → low", () => {
    expect(detectTier({ hasWebGL2: false, deviceMemory: 16 })).toBe("low");
  });
  it("省流量 → mid", () => {
    expect(detectTier({ hasWebGL2: true, deviceMemory: 16, saveData: true })).toBe("mid");
  });
  it("内存充足 → high", () => {
    expect(detectTier({ hasWebGL2: true, deviceMemory: 8 })).toBe("high");
  });
  it("内存未知按 8 处理 → high", () => {
    expect(detectTier({ hasWebGL2: true })).toBe("high");
  });
  it("内存不足 → mid", () => {
    expect(detectTier({ hasWebGL2: true, deviceMemory: 4 })).toBe("mid");
  });
});
```

- [ ] **Step 2: 实现 tier.ts + ui-shell-store + reduced.ts**

`src/lib/fx/tier.ts`：

```ts
"use client";

import { useEffect } from "react";
import { useUIShellStore } from "@/stores/ui-shell-store";

export type FxTier = "high" | "mid" | "low";

export interface TierInput {
  hasWebGL2: boolean;
  deviceMemory?: number;
  saveData?: boolean;
}

export function detectTier(input: TierInput): FxTier {
  if (!input.hasWebGL2) return "low";
  if (input.saveData) return "mid";
  return (input.deviceMemory ?? 8) >= 8 ? "high" : "mid";
}

function detectWebGL2(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2"));
  } catch {
    return false;
  }
}

export function useFxTier(): FxTier {
  const fxTier = useUIShellStore((s) => s.fxTier);
  useEffect(() => {
    const override = new URLSearchParams(window.location.search).get("fxtier");
    if (override === "high" || override === "mid" || override === "low") {
      useUIShellStore.getState().setFxTier(override);
      return;
    }
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean };
    };
    useUIShellStore.getState().setFxTier(
      detectTier({
        hasWebGL2: detectWebGL2(),
        deviceMemory: nav.deviceMemory,
        saveData: nav.connection?.saveData,
      }),
    );
  }, []);
  return fxTier;
}
```

`src/stores/ui-shell-store.ts`：

```ts
"use client";

import { create } from "zustand";
import type { FxTier } from "@/lib/fx/tier";

interface UIShellStore {
  fxTier: FxTier;
  setFxTier: (tier: FxTier) => void;
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
}

export const useUIShellStore = create<UIShellStore>((set) => ({
  fxTier: "mid",
  setFxTier: (fxTier) => set({ fxTier }),
  commandOpen: false,
  setCommandOpen: (commandOpen) => set({ commandOpen }),
}));
```

`src/lib/motion/reduced.ts`：

```ts
"use client";

import { useReducedMotion } from "motion/react";

export function usePrefersReducedMotion(): boolean {
  return useReducedMotion() ?? false;
}
```

- [ ] **Step 3: 写 starfield 纯函数失败测试**

`src/components/fx/starfield.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { starCount } from "./starfield";

describe("starCount", () => {
  it("与分级正相关且封顶 300", () => {
    expect(starCount(1_920 * 1_080, "high")).toBeLessThanOrEqual(300);
    expect(starCount(1_920 * 1_080, "high")).toBeGreaterThan(starCount(1_920 * 1_080, "mid"));
  });
  it("低端设备最少", () => {
    expect(starCount(1_920 * 1_080, "low")).toBeLessThan(starCount(1_920 * 1_080, "mid"));
  });
});
```

- [ ] **Step 4: 实现 fx registry + Starfield + FxLayer**

`src/lib/fx/registry.ts`：

```ts
import type { ComponentType } from "react";
import type { FxTier } from "@/lib/fx/tier";

export interface FxProps {
  intensity: number;
  tier: FxTier;
}

export const fxRegistry: Record<
  string,
  { loader: () => Promise<ComponentType<FxProps>>; minTier: FxTier }
> = {
  starfield: {
    loader: () => import("@/components/fx/starfield").then((m) => m.Starfield),
    minTier: "mid",
  },
  // nebula: M1 追加（WebGL shader）
};
```

`src/components/fx/starfield.tsx`：

```tsx
"use client";

import { useEffect, useRef } from "react";
import type { FxProps } from "@/lib/fx/registry";
import { usePrefersReducedMotion } from "@/lib/motion/reduced";

export function starCount(area: number, tier: FxProps["tier"]): number {
  const factor = tier === "high" ? 1 : tier === "mid" ? 0.5 : 0.25;
  return Math.min(300, Math.max(24, Math.round((area / 12000) * factor)));
}

interface Star {
  x: number;
  y: number;
  r: number;
  speed: number;
  phase: number;
}

function makeStars(count: number, w: number, h: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 1.2 + 0.3,
    speed: Math.random() * 0.02 + 0.005,
    phase: Math.random() * Math.PI * 2,
  }));
}

export function Starfield({ intensity, tier }: FxProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    let raf = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      stars = makeStars(starCount(w * h, tier), w, h);
    };

    const draw = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const twinkle = 0.55 + 0.45 * Math.sin(t * 0.001 + s.phase);
        ctx.globalAlpha = intensity * twinkle * 0.9;
        ctx.fillStyle = "#e8ecf1";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    resize();
    window.addEventListener("resize", resize);

    if (reduced) {
      draw(0); // 静态一帧
      return () => window.removeEventListener("resize", resize);
    }

    let last = 0;
    const loop = (t: number) => {
      const dt = last ? (t - last) / 1000 : 0;
      last = t;
      for (const s of stars) {
        s.y += s.speed * dt * 60;
        if (s.y > h + 2) s.y = -2;
      }
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = 0;
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intensity, tier, reduced]);

  return (
    <canvas
      ref={ref}
      data-fx="starfield"
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}
```

`src/components/fx/fx-layer.tsx`：

```tsx
"use client";

import { useEffect, useState, type ComponentType } from "react";
import { fxRegistry, type FxProps } from "@/lib/fx/registry";
import { useFxTier } from "@/lib/fx/tier";
import { usePrefersReducedMotion } from "@/lib/motion/reduced";
import { useThemeStore } from "@/stores/theme-store";

const tierRank = { low: 0, mid: 1, high: 2 } as const;

export function FxLayer() {
  const effects = useThemeStore((s) => s.resolved.effects);
  const tier = useFxTier();
  const reduced = usePrefersReducedMotion();
  const [Background, setBackground] = useState<ComponentType<FxProps> | null>(null);

  const entry = fxRegistry[effects.background];
  const enabled =
    effects.background !== "none" && effects.intensity > 0 && !reduced && entry !== undefined;
  const meetsTier = entry !== undefined && tierRank[tier] >= tierRank[entry.minTier];

  useEffect(() => {
    let alive = true;
    if (!enabled || !entry || !meetsTier) {
      setBackground(null);
      return;
    }
    entry.loader().then((C) => {
      if (alive) setBackground(() => C);
    });
    return () => {
      alive = false;
    };
  }, [enabled, meetsTier, entry]);

  if (!enabled) return null;

  if (!meetsTier || !Background) {
    // 低端设备降级：静态渐变（零 JS 开销）
    return (
      <div
        data-fx="fallback"
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 0%, color-mix(in oklab, var(--accent) 8%, transparent), transparent 60%)",
        }}
      />
    );
  }

  return <Background intensity={effects.intensity} tier={tier} />;
}
```

- [ ] **Step 5: 挂载 FxLayer 到 (site) 布局**

`src/app/[lang]/(site)/layout.tsx` 修改：

```tsx
// import 区新增：
import { FxLayer } from "@/components/fx/fx-layer";

// <div className="flex min-h-dvh flex-col"> 内部最前插入：
      <FxLayer />
```

- [ ] **Step 6: 写 E2E**

`tests/e2e/fx.spec.ts`：

```ts
import { expect, test } from "@playwright/test";

test("void 主题渲染 starfield canvas", async ({ page }) => {
  await page.goto("/zh?fxtier=high");
  await expect(page.locator('canvas[data-fx="starfield"]')).toBeAttached();
});

test("lumen 主题不渲染任何特效节点", async ({ page }) => {
  await page.goto("/zh?fxtier=high&theme=lumen");
  await expect(page.locator("[data-fx]")).toHaveCount(0);
});

test("低端分级降级为静态层", async ({ page }) => {
  await page.goto("/zh?fxtier=low");
  await expect(page.locator('[data-fx="fallback"]')).toBeAttached();
  await expect(page.locator('canvas[data-fx="starfield"]')).toHaveCount(0);
});

test.describe("reduced-motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  test("强制静态化：不加载 canvas", async ({ page }) => {
    await page.goto("/zh?fxtier=high");
    await expect(page.locator('canvas[data-fx="starfield"]')).toHaveCount(0);
  });
});
```

- [ ] **Step 7: 全量验证** → `pnpm test && pnpm e2e`

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: 特效底座——设备分级 + 注册表 + starfield（含静态降级与 reduced-motion）"
```

---

### Task 10: 首页 hero（入场时间线）

**Files:**
- Create: `src/app/[lang]/(site)/hero.tsx`
- Modify: `src/app/[lang]/(site)/page.tsx`（全量替换占位）
- Create: `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `useThemeStore.resolved.motion`（Task 4）· `registerGsap`（Task 6）· 字典 `site.*`/`home.*`
- Produces: `Hero({ title, tagline, kicker })`；根节点在时间线完成时写 `data-anim="done"`（E2E 断言锚点），初始 `data-anim="pending"`

- [ ] **Step 1: 实现 Hero**

`src/app/[lang]/(site)/hero.tsx`：

```tsx
"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { useRef } from "react";
import { registerGsap } from "@/lib/motion/gsap";
import { usePrefersReducedMotion } from "@/lib/motion/reduced";
import { useThemeStore } from "@/stores/theme-store";

export function Hero({
  title,
  tagline,
  kicker,
}: {
  title: string;
  tagline: string;
  kicker: string;
}) {
  const root = useRef<HTMLElement>(null);
  const motion = useThemeStore((s) => s.resolved.motion);
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      registerGsap();
      const el = root.current;
      if (!el) return;
      if (reduced) {
        el.dataset.anim = "done";
        return;
      }
      const split = new SplitText(el.querySelector("[data-hero-title]"), {
        type: "chars,words",
      });
      gsap
        .timeline({
          defaults: { ease: motion.easing.entrance, duration: motion.duration.section / 1000 },
          onComplete: () => {
            el.dataset.anim = "done";
            split.revert();
          },
        })
        .from(split.chars, { autoAlpha: 0, y: 24, stagger: 0.02 })
        .from(
          el.querySelectorAll("[data-hero-fade]"),
          { autoAlpha: 0, y: 12, stagger: 0.08, duration: motion.duration.ui / 1000 },
          "-=0.4",
        );
    },
    { scope: root, dependencies: [motion, reduced] },
  );

  return (
    <section
      ref={root}
      data-anim="pending"
      className="mx-auto flex min-h-[70vh] max-w-[var(--container-max)] flex-col justify-center px-6"
    >
      <p data-hero-fade className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
        {kicker}
      </p>
      <h1
        data-hero-title
        className="mt-4 max-w-3xl text-[length:var(--text-display-size)] font-semibold leading-[var(--text-display-lh)] tracking-[var(--text-display-tracking)]"
      >
        {title}
      </h1>
      <p data-hero-fade className="mt-6 max-w-xl text-lg text-ink-muted">
        {tagline}
      </p>
    </section>
  );
}
```

- [ ] **Step 2: 全量替换首页**

`src/app/[lang]/(site)/page.tsx`：

```tsx
import { getDictionary } from "../dictionaries";
import { Hero } from "./hero";

export default async function HomePage() {
  const dict = await getDictionary();
  return (
    <main>
      <Hero title={dict.site.title} tagline={dict.site.tagline} kicker={dict.home.heroKicker} />
    </main>
  );
}
```

- [ ] **Step 3: 写 E2E**

`tests/e2e/home.spec.ts`：

```ts
import { expect, test } from "@playwright/test";

test("hero 渲染标题且入场时间线完成", async ({ page }) => {
  await page.goto("/zh");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("伍泽凯");
  await expect(page.locator('[data-anim="done"]')).toBeAttached({ timeout: 5000 });
});

test.describe("reduced-motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  test("跳过动画直接呈现", async ({ page }) => {
    await page.goto("/zh");
    await expect(page.locator('[data-anim="done"]')).toBeAttached({ timeout: 1500 });
  });
});
```

- [ ] **Step 4: 全量验证** → `pnpm test && pnpm e2e`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: 首页 hero——SplitText 入场时间线 + reduced-motion 直达"
```

---

### Task 11: ⌘K 命令面板

**Files:**
- Create: `src/components/command/command-menu.tsx` · `tests/e2e/command.spec.ts`
- Modify: `src/app/[lang]/(site)/layout.tsx`（挂 CommandMenu）

**Interfaces:**
- Consumes: `useUIShellStore.commandOpen`（Task 9）· `useThemeStore.setTheme`（Task 4）· 字典（Task 5）
- Produces: `CommandMenu({ lang, labels }: { lang: string; labels: {...} })`（client；⌘K/Ctrl+K 开合，Esc 关闭）

- [ ] **Step 1: 实现 CommandMenu**

`src/components/command/command-menu.tsx`：

```tsx
"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useThemeStore } from "@/stores/theme-store";
import { useUIShellStore } from "@/stores/ui-shell-store";
import { themeList } from "@/themes/registry";

export function CommandMenu({
  lang,
  labels,
}: {
  lang: string;
  labels: {
    placeholder: string;
    nav: string;
    theme: string;
    empty: string;
    posts: string;
    projects: string;
    about: string;
    lab: string;
  };
}) {
  const open = useUIShellStore((s) => s.commandOpen);
  const setOpen = useUIShellStore((s) => s.setCommandOpen);
  const setTheme = useThemeStore((s) => s.setTheme);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!useUIShellStore.getState().commandOpen);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const itemClass =
    "cursor-pointer rounded-sm px-3 py-2 text-sm text-ink data-[selected=true]:bg-surface-hover";
  const groupClass =
    "px-1 py-1 text-xs uppercase tracking-widest text-ink-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1";

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label={labels.placeholder}
      className="fixed inset-0 z-50"
      contentClassName="mx-auto mt-[20vh] w-[min(92vw,34rem)] rounded-md border border-border bg-bg-elevated shadow-[var(--shadow-md)]"
    >
      <Command.Input
        placeholder={labels.placeholder}
        className="w-full border-b border-border bg-transparent px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-muted"
      />
      <Command.List className="max-h-80 overflow-y-auto p-2">
        <Command.Empty className="px-3 py-6 text-center text-sm text-ink-muted">
          {labels.empty}
        </Command.Empty>
        <Command.Group heading={labels.nav} className={groupClass}>
          <Command.Item onSelect={() => go(`/${lang}/posts`)} className={itemClass}>
            {labels.posts}
          </Command.Item>
          <Command.Item onSelect={() => go(`/${lang}/projects`)} className={itemClass}>
            {labels.projects}
          </Command.Item>
          <Command.Item onSelect={() => go(`/${lang}/about`)} className={itemClass}>
            {labels.about}
          </Command.Item>
          <Command.Item onSelect={() => go(`/${lang}/lab`)} className={itemClass}>
            {labels.lab}
          </Command.Item>
        </Command.Group>
        <Command.Group heading={labels.theme} className={groupClass}>
          {themeList.map((t) => (
            <Command.Item
              key={t.meta.id}
              value={`theme ${t.meta.name} ${t.meta.nameEn}`}
              onSelect={() => {
                setTheme(t.meta.id);
                setOpen(false);
              }}
              className={itemClass}
            >
              {t.meta.name} · {t.meta.nameEn}
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
```

- [ ] **Step 2: 挂载到 (site) 布局**

`layout.tsx` 修改：

```tsx
// import 区新增：
import { getDictionary } from "../dictionaries";
import { CommandMenu } from "@/components/command/command-menu";

// 函数体内：
  const dict = await getDictionary();

// 返回 JSX 最外层 </div> 前：
      <CommandMenu
        lang={lang}
        labels={{
          placeholder: dict.command.placeholder,
          nav: dict.command.nav,
          theme: dict.command.theme,
          empty: dict.command.empty,
          posts: dict.nav.posts,
          projects: dict.nav.projects,
          about: dict.nav.about,
          lab: dict.nav.lab,
        }}
      />
```

- [ ] **Step 3: 写 E2E**

`tests/e2e/command.spec.ts`：

```ts
import { expect, test } from "@playwright/test";

test("⌘K 打开面板并执行主题命令", async ({ page }) => {
  await page.goto("/zh");
  await page.keyboard.press("ControlOrMeta+k");
  await expect(page.getByPlaceholder("搜索或输入命令…")).toBeVisible();
  await page.keyboard.type("流明");
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "lumen");
});

test("导航命令跳转", async ({ page }) => {
  await page.goto("/zh");
  await page.keyboard.press("ControlOrMeta+k");
  await page.keyboard.type("项目");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/zh\/projects$/);
});
```

- [ ] **Step 4: 全量验证（M0 总验收）**

Run: `pnpm lint && pnpm test && pnpm theme:check && pnpm e2e`
Expected: 全部绿。手动验收清单：
1. `pnpm dev` → 访问 `http://localhost:3000` 自动跳 `/zh`（中文浏览器）
2. void 主题星空漂移；切 lumen 星空消失、圆角变柔、明暗可切
3. 个性化滑块即时生效并跨刷新保留
4. ⌘K 可导航可切主题
5. 系统开启「减弱动态效果」后：无 canvas、hero 直达

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: ⌘K 命令面板——导航 + 主题命令；M0 地基完成"
```

---

## Self-Review（已完成，记录于此）

**Spec coverage（M0 范围）:**
- 设计规范 §1 主题契约 → Task 2/3/4 ✓；§2 void/lumen 令牌 → Task 2 ✓；§3 排版令牌 → Task 3 输出变量（中文 webfont 管线明确 M1）；§4 色彩（AA 校验）→ Task 2 theme:check ✓；§5 特效（starfield 首发，顺序注记）→ Task 9 ✓；§6 动效语法（GSAP/Motion 分工、reduced 降级）→ Task 6/9/10 ✓；§10 性能预算 → M1 CI 落地（M0 已含 e2e 门禁）
- 架构规范 §2 版本约定 → Task 1（cacheComponents/root-params）✓；§3 目录与边界 → 各任务即结构 ✓；§4 内核 → M2；§6.4 i18n → Task 5/6 ✓；§8 认证 → M1；§11/§12 → M1/M4
- 状态规范 §3.2 URL → Task 6（`?theme=` 水合）✓；§3.3 store 契约 → Task 4/9 ✓；§6 动效铁律 → Task 9/10（GSAP 自管理，未进 React state）✓
- 依赖规范 → Task 1 版本锁定 ✓

**Placeholder scan:** 无 TBD/TODO；每个代码步骤均为完整代码。
**Type consistency:** `ThemeMode`/`ThemeOverrides`/`ResolvedTheme`/`FxTier`/`FxProps`/`Dictionary` 名称跨任务一致；`themeVarsCss`/`starCount`/`detectTier` 定义与测试同名引用；`useThemeStore` 字段（themeId/modeChoice/mode/overrides/resolved/actions）跨任务一致。
**已知取舍:** （1）M0 未引入 shadcn CLI（Radix 原语直用）——避免 shadcn 的 CSS 变量体系与主题契约冲突，shadcn 组件库在 M1 按契约重制；（2）Noto Sans SC webfont 延至 M1（cn-font-split 管线，系统 CJK 栈先行）；（3）首页发射序列全量为 M1.5 打磨项，M0 交付基础入场时间线。
