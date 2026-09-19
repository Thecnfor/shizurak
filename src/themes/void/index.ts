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
    display:
      'var(--font-geist-sans), "PingFang SC", "Microsoft YaHei", sans-serif',
    scale: {
      display: {
        size: "clamp(2.5rem, 6vw, 4.5rem)",
        lineHeight: "1.05",
        tracking: "-0.03em",
        weight: 600,
      },
      h1: {
        size: "clamp(2rem, 4vw, 3rem)",
        lineHeight: "1.15",
        tracking: "-0.02em",
        weight: 600,
      },
      h2: {
        size: "1.75rem",
        lineHeight: "1.3",
        tracking: "-0.01em",
        weight: 600,
      },
      h3: { size: "1.25rem", lineHeight: "1.4", tracking: "0", weight: 600 },
      body: {
        size: "1.0625rem",
        lineHeight: "1.75",
        tracking: "0",
        weight: 400,
      },
      small: {
        size: "0.875rem",
        lineHeight: "1.6",
        tracking: "0.01em",
        weight: 400,
      },
      micro: {
        size: "0.75rem",
        lineHeight: "1.5",
        tracking: "0.06em",
        weight: 500,
      },
    },
  },
  space: { unit: 4, containerMax: "72rem", gutter: "1.5rem", sectionY: "6rem" },
  shape: {
    radiusSm: "2px",
    radiusMd: "4px",
    radiusLg: "6px",
    borderWidth: "1px",
  },
  elevation: {
    shadowSm: "0 1px 2px rgba(0, 0, 0, 0.4)",
    shadowMd: "0 8px 24px rgba(0, 0, 0, 0.5)",
    glow: "0 0 24px rgba(94, 234, 212, 0.15)",
  },
  texture: { noiseOpacity: 0.03, gridOpacity: 0, scanlineOpacity: 0 },
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
      rift: "cubic-bezier(0.85, 0, 0.15, 1)",
    },
    duration: { micro: 120, ui: 280, section: 800, scene: 1600 },
    gsap: { ease: "power3.out" },
    spring: {
      ui: { stiffness: 260, damping: 30 },
      layout: { stiffness: 300, damping: 32 },
    },
  },
  effects: {
    renderer: "rift-layer",
    hum: { breath: 0.6, flashlight: true, tremor: 0.3 },
    rift: { tear: "diagonal", intensity: 0.7 },
  },
  genui: {
    catalogVariant: "stitch",
    openuiVariant: "stitch",
    streamReveal: { stagger: 24, effect: "tear" },
  },
};
