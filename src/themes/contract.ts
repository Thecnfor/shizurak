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
    bg: string;
    bgElevated: string;
    surface: string;
    surfaceHover: string;
    ink: string;
    inkSecondary: string;
    inkMuted: string;
    inkFaint: string;
    accent: string;
    accentHover: string;
    accentInk: string;
    border: string;
    borderStrong: string;
    danger: string;
    success: string;
    warning: string;
    glow: string;
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
  space: {
    unit: number;
    containerMax: string;
    gutter: string;
    sectionY: string;
  };
  shape: {
    radiusSm: string;
    radiusMd: string;
    radiusLg: string;
    borderWidth: string;
  };
  elevation: { shadowSm: string; shadowMd: string; glow: string };
  // v2 仅 noiseOpacity 有效，grid/scanline 置 0（键保留防 CSS 生成管线断）
  texture: {
    noiseOpacity: number;
    gridOpacity: number;
    scanlineOpacity: number;
  };
}

export interface ThemeMotion {
  personality: "cinematic" | "precise" | "playful" | "calm";
  easing: {
    entrance: string;
    exit: string;
    emphasis: string;
    scroll: string;
    rift: string;
  };
  duration: { micro: number; ui: number; section: number; scene: number }; // ms
  gsap: { ease: string };
  spring: {
    ui: { stiffness: number; damping: number };
    layout: { stiffness: number; damping: number };
  };
}

export type FxRendererId = "rift-layer" | "none";

export interface ThemeEffects {
  renderer: FxRendererId;
  hum: { breath: number; flashlight: boolean; tremor: number }; // 0–1 底噪
  rift: { intensity: number }; // 0–1 撕裂烈度（v2.1：tear 方向键删除，方向是语法不是人格）
}

export interface ThemeGenUI {
  catalogVariant: "stitch" | "clean";
  openuiVariant: "stitch" | "clean";
  streamReveal: { effect: "fade" | "tear" }; // v2.1：stagger 删除，显现为整卡一次性缝撕
}

export interface Theme {
  meta: ThemeMeta;
  /**
   * 继承另一主题 id：新主题只覆写四层中任意一层，其余从基座浅合并。
   * registry 加载时物化继承链，resolveTheme 收到的已是扁平结果。
   */
  extends?: string;
  tokens: Partial<Record<ThemeMode, ThemeTokens>>;
  motion: ThemeMotion;
  effects: ThemeEffects;
  genui: ThemeGenUI;
}

export interface ThemeOverrides {
  hum?: number; // 0–1 乘数，默认 1；0 关闭特效层
  riftIntensity?: number; // 0–1 绝对烈度
  motionSpeed?: number; // 0.5–2 时长倍率
}
