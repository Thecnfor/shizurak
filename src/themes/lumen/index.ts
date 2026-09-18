import type { Theme, ThemeTokens } from "@/themes/contract";

const scale: ThemeTokens["typography"]["scale"] = {
  display: {
    size: "clamp(2.5rem, 6vw, 4.5rem)",
    lineHeight: "1.08",
    tracking: "-0.03em",
    weight: 600,
  },
  h1: {
    size: "clamp(2rem, 4vw, 3rem)",
    lineHeight: "1.15",
    tracking: "-0.03em",
    weight: 600,
  },
  h2: { size: "1.75rem", lineHeight: "1.3", tracking: "-0.02em", weight: 600 },
  h3: { size: "1.25rem", lineHeight: "1.4", tracking: "-0.01em", weight: 600 },
  body: { size: "1.0625rem", lineHeight: "1.6", tracking: "0", weight: 400 },
  small: { size: "0.875rem", lineHeight: "1.55", tracking: "0", weight: 400 },
  micro: {
    size: "0.75rem",
    lineHeight: "1.5",
    tracking: "0.05em",
    weight: 500,
  },
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
    space: {
      unit: 4,
      containerMax: "72rem",
      gutter: "1.5rem",
      sectionY: "8rem",
    },
    shape: {
      radiusSm: "8px",
      radiusMd: "12px",
      radiusLg: "18px",
      borderWidth: "1px",
    },
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
    spring: {
      ui: { stiffness: 400, damping: 40 },
      layout: { stiffness: 420, damping: 42 },
    },
    scrollIntensity: 0.15,
  },
  effects: {
    background: "none",
    overlays: [],
    cursor: "default",
    hud: false,
    intensity: 0,
  },
  genui: {
    catalogVariant: "clean",
    openuiVariant: "clean",
    streamReveal: { stagger: 30, effect: "fade" },
  },
};
