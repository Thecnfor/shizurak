import type { Theme } from "@/themes/contract";

const paperTokens = {
  color: {
    bg: "#faf9f6",
    bgElevated: "#f3f1ec",
    surface: "#ffffff",
    surfaceHover: "#efece5",
    ink: "#1c1917",
    inkSecondary: "#44403c",
    inkMuted: "#6b6660",
    inkFaint: "#98938c",
    accent: "#b45309",
    accentHover: "#92400e",
    accentInk: "#fff7ed",
    border: "rgba(68, 64, 60, 0.14)",
    borderStrong: "rgba(180, 83, 9, 0.38)",
    danger: "#b91c1c",
    success: "#15803d",
    warning: "#a16207",
    glow: "rgba(180, 83, 9, 0.16)",
  },
  typography: {
    sans: '"Songti SC", "Noto Serif CJK SC", Georgia, var(--font-geist-sans), serif',
    mono: 'var(--font-geist-mono), ui-monospace, "SFMono-Regular", monospace',
    display: '"Songti SC", "Noto Serif CJK SC", Georgia, serif',
    scale: {
      display: {
        size: "clamp(2.25rem, 5vw, 3.75rem)",
        lineHeight: "1.2",
        tracking: "0.01em",
        weight: 500,
      },
      h1: {
        size: "clamp(1.875rem, 3.6vw, 2.5rem)",
        lineHeight: "1.25",
        tracking: "0.01em",
        weight: 500,
      },
      h2: { size: "1.625rem", lineHeight: "1.35", tracking: "0", weight: 500 },
      h3: { size: "1.1875rem", lineHeight: "1.45", tracking: "0", weight: 600 },
      body: {
        size: "1.0625rem",
        lineHeight: "1.85",
        tracking: "0.01em",
        weight: 400,
      },
      small: {
        size: "0.875rem",
        lineHeight: "1.65",
        tracking: "0.01em",
        weight: 400,
      },
      micro: {
        size: "0.75rem",
        lineHeight: "1.5",
        tracking: "0.08em",
        weight: 500,
      },
    },
  },
  space: { unit: 4, containerMax: "46rem", gutter: "1.5rem", sectionY: "5rem" },
  shape: {
    radiusSm: "3px",
    radiusMd: "6px",
    radiusLg: "10px",
    borderWidth: "1px",
  },
  elevation: {
    shadowSm: "0 1px 2px rgba(28, 25, 23, 0.06)",
    shadowMd: "0 6px 18px rgba(28, 25, 23, 0.08)",
    glow: "0 0 0 rgba(0, 0, 0, 0)",
  },
  texture: { noiseOpacity: 0.02, gridOpacity: 0, scanlineOpacity: 0 },
} satisfies Theme["tokens"]["light"];

/** paper · 纸墨（预留主题 → preview）：验证四层契约的"静谧排版"维度。 */
export const paperTheme: Theme = {
  meta: {
    id: "paper",
    name: "纸墨",
    nameEn: "Paper",
    description: "衬线排版 · 暖纸底 · 阅读至上",
    modes: ["light"],
    status: "preview",
    preview: { accent: "#b45309", bg: "#faf9f6", hasFx: false },
  },
  tokens: { light: paperTokens },
  motion: {
    personality: "calm",
    easing: {
      entrance: "cubic-bezier(0.33, 1, 0.68, 1)",
      exit: "cubic-bezier(0.32, 0, 0.67, 0)",
      emphasis: "cubic-bezier(0.34, 1.2, 0.64, 1)",
      scroll: "linear",
      rift: "cubic-bezier(0.85, 0, 0.15, 1)",
    },
    duration: { micro: 140, ui: 320, section: 700, scene: 1100 },
    gsap: { ease: "power1.out" },
    spring: {
      ui: { stiffness: 200, damping: 34 },
      layout: { stiffness: 220, damping: 36 },
    },
  },
  effects: {
    renderer: "none",
    hum: { breath: 0, flashlight: false, tremor: 0 },
    rift: { tear: "horizontal", intensity: 0 },
  },
  genui: {
    catalogVariant: "clean",
    openuiVariant: "clean",
    streamReveal: { stagger: 10, effect: "fade" },
  },
};
