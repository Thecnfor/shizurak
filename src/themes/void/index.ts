import type { Theme } from "@/themes/contract";

const voidTokens = {
  color: {
    bg: "#07070a",
    bgElevated: "#0b0c10",
    surface: "rgba(232, 236, 239, 0.02)",
    surfaceHover: "rgba(232, 236, 239, 0.04)",
    ink: "#e8ecef",
    inkSecondary: "#a9b3bc",
    inkMuted: "#7d8891",
    inkFaint: "#4a525c",
    accent: "#cfe4ff",
    accentHover: "#e6f1ff",
    accentInk: "#07070a",
    border: "#22262d",
    borderStrong: "rgba(207, 228, 255, 0.35)",
    danger: "#e0596f",
    success: "#57b97b",
    warning: "#c9a86a",
    glow: "rgba(207, 228, 255, 0.28)",
  },
  typography: {
    sans: 'var(--font-geist-sans), "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
    mono: 'var(--font-geist-mono), ui-monospace, "SFMono-Regular", monospace',
    display:
      'var(--font-geist-sans), "PingFang SC", "Microsoft YaHei", sans-serif',
    scale: {
      display: {
        size: "clamp(3.5rem, 9vw, 7.5rem)",
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
        size: "1rem",
        lineHeight: "1.9",
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
        tracking: "0.2em",
        weight: 500,
      },
    },
  },
  space: {
    unit: 4,
    containerMax: "70rem",
    gutter: "2rem",
    sectionY: "18vh",
  },
  shape: {
    radiusSm: "0px",
    radiusMd: "2px",
    radiusLg: "2px",
    borderWidth: "1px",
  },
  elevation: {
    shadowSm: "0 1px 2px rgba(0, 0, 0, 0.4)",
    shadowMd: "0 40px 120px rgba(0, 0, 0, 0.6)",
    glow: "0 0 24px rgba(207, 228, 255, 0.15)",
  },
  texture: { noiseOpacity: 0.02, gridOpacity: 0, scanlineOpacity: 0 },
} satisfies Theme["tokens"]["dark"];

export const voidTheme: Theme = {
  meta: {
    id: "void",
    name: "幕",
    nameEn: "Curtain",
    description: "留白为幕面 · 转场即撕幕",
    modes: ["dark"],
    status: "stable",
    preview: { accent: "#cfe4ff", bg: "#07070a", hasFx: true },
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
