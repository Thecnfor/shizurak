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
  if (!tokens)
    throw new Error(`主题 ${theme.meta.id} 缺少 ${effectiveMode} 模式令牌`);

  // 持久化数据不可信（localStorage 可被手改/旧版本残留）：非有限数回退默认，有限数夹进值域
  const num = (v: unknown, min: number, max: number, dflt: number) =>
    typeof v === "number" && Number.isFinite(v)
      ? Math.min(max, Math.max(min, v))
      : dflt;

  const speed = num(overrides.motionSpeed, 0.5, 2, 1);
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

  const humK = num(overrides.hum, 0, 1, 1);
  const effects: ThemeEffects = {
    ...theme.effects,
    renderer: humK <= 0 ? "none" : theme.effects.renderer,
    hum: {
      breath: theme.effects.hum.breath * humK,
      flashlight: humK > 0 && theme.effects.hum.flashlight,
      tremor: theme.effects.hum.tremor * humK,
    },
    rift: {
      ...theme.effects.rift,
      intensity: num(
        overrides.riftIntensity,
        0,
        1,
        theme.effects.rift.intensity,
      ),
    },
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
