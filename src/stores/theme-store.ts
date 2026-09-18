"use client";

import { create } from "zustand";
import { resolveTheme, type ResolvedTheme } from "@/lib/themes/resolve";
import type { ThemeMode, ThemeOverrides } from "@/themes/contract";
import { getTheme, voidTheme } from "@/themes/registry";

const STORAGE_KEY = "shizurak:theme";

interface PersistedShape {
  themeId: string;
  overrides: ThemeOverrides;
}

function readPersisted(): PersistedShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { themeId: voidTheme.meta.id, overrides: {} };
    const parsed = JSON.parse(raw) as Partial<PersistedShape>;
    return {
      themeId:
        typeof parsed.themeId === "string" ? parsed.themeId : voidTheme.meta.id,
      overrides: (parsed.overrides ?? {}) as ThemeOverrides,
    };
  } catch {
    return { themeId: voidTheme.meta.id, overrides: {} };
  }
}

interface ThemeStore {
  themeId: string;
  modeChoice: ThemeMode | "system";
  mode: ThemeMode;
  overrides: ThemeOverrides;
  resolved: ResolvedTheme;
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
) {
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

function persist(themeId: string, overrides: ThemeOverrides) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ themeId, overrides }));
  } catch {
    /* 隐私模式下忽略 */
  }
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  ...build(voidTheme.meta.id, "system", {}),
  setTheme: (id) => {
    const next = build(id, get().modeChoice, get().overrides);
    set(next);
    persist(next.themeId, next.overrides);
  },
  setMode: (choice) => {
    set(build(get().themeId, choice, get().overrides));
  },
  setOverride: (key, value) => {
    const overrides = { ...get().overrides, [key]: value };
    const next = build(get().themeId, get().modeChoice, overrides);
    set(next);
    persist(next.themeId, next.overrides);
  },
  resetOverrides: () => {
    const next = build(get().themeId, get().modeChoice, {});
    set(next);
    persist(next.themeId, next.overrides);
  },
  hydrate: () => {
    const p = readPersisted();
    set(build(p.themeId, get().modeChoice, p.overrides));
  },
}));
