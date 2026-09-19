"use client";

import { create } from "zustand";
import { type ResolvedTheme, resolveTheme } from "@/lib/themes/resolve";
import type { ThemeMode, ThemeOverrides } from "@/themes/contract";
import { getTheme, voidTheme } from "@/themes/registry";

const STORAGE_KEY = "shizurak:theme";
/** RSC 通道服务端读取的主题快照（见 lib/themes/ssr.ts 与 05 §4.4） */
export const THEME_COOKIE = "shizurak-theme";

interface PersistedShape {
  themeId: string;
  modeChoice: ThemeMode | "system";
  overrides: ThemeOverrides;
}

function readPersisted(): PersistedShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw)
      return {
        themeId: voidTheme.meta.id,
        modeChoice: "system",
        overrides: {},
      };
    const parsed = JSON.parse(raw) as Partial<PersistedShape>;
    return {
      themeId:
        typeof parsed.themeId === "string" ? parsed.themeId : voidTheme.meta.id,
      modeChoice:
        parsed.modeChoice === "light" || parsed.modeChoice === "dark"
          ? parsed.modeChoice
          : "system",
      // 契约 v2：丢弃旧版持久化的未知键（accentHue / effectsIntensity 等）
      overrides: Object.fromEntries(
        Object.entries(
          (parsed.overrides ?? {}) as Record<string, unknown>,
        ).filter(
          ([k]) => k === "hum" || k === "riftIntensity" || k === "motionSpeed",
        ),
      ) as ThemeOverrides,
    };
  } catch {
    return { themeId: voidTheme.meta.id, modeChoice: "system", overrides: {} };
  }
}

/** store 中「可被 build() 重算」的状态子集（不含方法、不含 previousResolved） */
interface ThemeState {
  themeId: string;
  modeChoice: ThemeMode | "system";
  mode: ThemeMode;
  overrides: ThemeOverrides;
  resolved: ResolvedTheme;
}

interface ThemeStore extends ThemeState {
  /** 上一份 resolved，供特效层 fade-out 卸载旧层读取（设计规范 §1.3） */
  previousResolved: ResolvedTheme;
  setTheme: (id: string) => void;
  setMode: (choice: ThemeMode | "system") => void;
  setOverride: <K extends keyof ThemeOverrides>(
    key: K,
    value: ThemeOverrides[K],
  ) => void;
  resetOverrides: () => void;
  hydrate: () => void;
}

function build(
  themeId: string,
  modeChoice: ThemeMode | "system",
  overrides: ThemeOverrides,
): ThemeState {
  const theme = getTheme(themeId) ?? voidTheme;
  const systemDark =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : true;
  const mode: ThemeMode =
    modeChoice === "system" ? (systemDark ? "dark" : "light") : modeChoice;
  return {
    themeId: theme.meta.id,
    modeChoice,
    mode,
    overrides,
    resolved: resolveTheme(theme, mode, overrides),
  };
}

function persist(next: ThemeState) {
  const payload = {
    themeId: next.themeId,
    modeChoice: next.modeChoice,
    mode: next.mode,
    overrides: next.overrides,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* 隐私模式下忽略 */
  }
  try {
    // 紧凑序列化写 cookie，供 RSC 通道服务端读 ResolvedTheme（05 §4.4）
    // biome-ignore lint/suspicious/noDocumentCookie: cookie 是主题跨 SSR/客户端共享的唯一可靠载体
    document.cookie = `${THEME_COOKIE}=${encodeURIComponent(
      JSON.stringify(payload),
    )};path=/;max-age=31536000;samesite=lax`;
  } catch {
    /* SSR/异常环境忽略 */
  }
}

const initial = build(voidTheme.meta.id, "system", {});

export const useThemeStore = create<ThemeStore>((set, get) => {
  const commit = (next: ThemeState) => {
    set({ ...next, previousResolved: get().resolved });
    persist(next);
  };
  return {
    ...initial,
    previousResolved: initial.resolved,
    setTheme: (id) => commit(build(id, get().modeChoice, get().overrides)),
    setMode: (choice) => commit(build(get().themeId, choice, get().overrides)),
    setOverride: (key, value) =>
      commit(
        build(get().themeId, get().modeChoice, {
          ...get().overrides,
          [key]: value,
        }),
      ),
    resetOverrides: () => commit(build(get().themeId, get().modeChoice, {})),
    hydrate: () => {
      const p = readPersisted();
      commit(build(p.themeId, p.modeChoice, p.overrides));
    },
  };
});
