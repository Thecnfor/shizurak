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
  texture: {
    noiseOpacity: number;
    gridOpacity: number;
    scanlineOpacity: number;
  };
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
  /** 继承另一主题 id：新主题只覆写四层中任意一层，其余从基座浅合并。
   *  registry 加载时物化继承链，resolveTheme 收到的已是扁平结果。 */
  extends?: string;
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
