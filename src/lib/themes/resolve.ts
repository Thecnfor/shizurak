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
  const effectiveMode: ThemeMode = theme.meta.modes.includes(mode)
    ? mode
    : theme.meta.modes[0];
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

  const backgroundOff =
    overrides.background === false || theme.effects.background === "none";
  const effects: ThemeEffects = {
    ...theme.effects,
    background: backgroundOff ? "none" : theme.effects.background,
    intensity: overrides.effectsIntensity ?? theme.effects.intensity,
  };

  return {
    meta: theme.meta,
    mode: effectiveMode,
    tokens,
    motion,
    effects,
    genui: theme.genui,
    overrides,
  };
}
