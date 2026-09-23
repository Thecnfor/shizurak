import type { Theme } from "@/themes/contract";

const terminalTokens = {
  color: {
    bg: "#060a06",
    bgElevated: "#0a100a",
    surface: "#0d140d",
    surfaceHover: "#121c12",
    ink: "#c9f7cf",
    inkSecondary: "#86d691",
    inkMuted: "#4e9a5c",
    inkFaint: "#2f6640",
    accent: "#34d399",
    accentHover: "#6ee7b7",
    accentInk: "#022c1e",
    border: "rgba(52, 211, 153, 0.16)",
    borderStrong: "rgba(52, 211, 153, 0.45)",
    danger: "#f87171",
    success: "#4ade80",
    warning: "#facc15",
    glow: "rgba(52, 211, 153, 0.30)",
  },
  typography: {
    sans: 'var(--font-geist-mono), ui-monospace, "SFMono-Regular", "PingFang SC", monospace',
    mono: 'var(--font-geist-mono), ui-monospace, "SFMono-Regular", monospace',
    display: "var(--font-geist-mono), ui-monospace, monospace",
    scale: {
      display: {
        size: "clamp(2rem, 5vw, 3.5rem)",
        lineHeight: "1.1",
        tracking: "-0.01em",
        weight: 500,
      },
      h1: {
        size: "clamp(1.75rem, 3.4vw, 2.5rem)",
        lineHeight: "1.2",
        tracking: "-0.01em",
        weight: 500,
      },
      h2: { size: "1.5rem", lineHeight: "1.3", tracking: "0", weight: 500 },
      h3: { size: "1.125rem", lineHeight: "1.4", tracking: "0", weight: 600 },
      body: {
        size: "0.9375rem",
        lineHeight: "1.7",
        tracking: "0",
        weight: 400,
      },
      small: {
        size: "0.8125rem",
        lineHeight: "1.6",
        tracking: "0",
        weight: 400,
      },
      micro: {
        size: "0.6875rem",
        lineHeight: "1.5",
        tracking: "0.1em",
        weight: 500,
      },
    },
  },
  space: {
    unit: 4,
    containerMax: "64rem",
    gutter: "1.25rem",
    sectionY: "4.5rem",
  },
  shape: {
    radiusSm: "0px",
    radiusMd: "2px",
    radiusLg: "2px",
    borderWidth: "1px",
  },
  elevation: {
    shadowSm: "0 1px 0 rgba(52, 211, 153, 0.12)",
    shadowMd: "0 0 0 1px rgba(52, 211, 153, 0.25)",
    glow: "0 0 18px rgba(52, 211, 153, 0.18)",
  },
  texture: { noiseOpacity: 0.02, gridOpacity: 0, scanlineOpacity: 0 },
} satisfies Theme["tokens"]["dark"];

/** terminal · 荧光（预留主题 → preview）：等宽全单色 + CRT 扫描线，契约的"终端"维度验证。 */
export const terminalTheme: Theme = {
  meta: {
    id: "terminal",
    name: "荧光",
    nameEn: "Terminal",
    description: "等宽字体 · 磷光绿 · CRT 质感",
    modes: ["dark"],
    status: "preview",
    preview: { accent: "#34d399", bg: "#060a06", hasFx: true },
  },
  tokens: { dark: terminalTokens },
  motion: {
    personality: "precise",
    easing: {
      entrance: "steps(8, end)",
      exit: "steps(6, start)",
      emphasis: "steps(4, end)",
      scroll: "linear",
      rift: "cubic-bezier(0.85, 0, 0.15, 1)",
    },
    duration: { micro: 90, ui: 180, section: 420, scene: 700 },
    gsap: { ease: "steps(6)" },
    spring: {
      ui: { stiffness: 420, damping: 38 },
      layout: { stiffness: 420, damping: 38 },
    },
  },
  effects: {
    renderer: "rift-layer",
    hum: { breath: 0.2, flashlight: false, tremor: 0.4 },
    rift: { intensity: 0.5 },
  },
  genui: {
    catalogVariant: "stitch",
    openuiVariant: "stitch",
    streamReveal: { effect: "tear" },
  },
};
