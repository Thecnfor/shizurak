"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { type ReactNode, useEffect } from "react";
import { applyMotionDefaults } from "@/lib/motion/gsap";
import { useThemeStore } from "@/stores/theme-store";
import { getTheme } from "@/themes/registry";

function DomSync() {
  const resolved = useThemeStore((s) => s.resolved);
  const { resolvedTheme, setTheme: setNextTheme } = useTheme();

  // store → DOM 属性 + CSS 变量 + GSAP 默认值
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", resolved.meta.id);
    root.style.setProperty(
      "--hue-rotate",
      `${resolved.overrides.accentHue ?? 0}deg`,
    );
    applyMotionDefaults(resolved.motion);
  }, [resolved]);

  // next-themes（系统模式变化）→ store
  useEffect(() => {
    if (resolvedTheme === "light" || resolvedTheme === "dark") {
      if (useThemeStore.getState().mode !== resolvedTheme) {
        useThemeStore.getState().setMode(resolvedTheme);
      }
    }
  }, [resolvedTheme]);

  // store（modeChoice）→ next-themes
  const modeChoice = useThemeStore((s) => s.modeChoice);
  useEffect(() => {
    setNextTheme(modeChoice === "system" ? "system" : modeChoice);
  }, [modeChoice, setNextTheme]);

  return null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeId = useThemeStore((s) => s.resolved.meta.id);
  const forced =
    getTheme(themeId)?.meta.modes.length === 1 ? "dark" : undefined;

  // 首次挂载：URL 分享码 > localStorage
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const urlTheme = sp.get("theme");
    if (urlTheme && getTheme(urlTheme)) {
      useThemeStore.getState().setTheme(urlTheme);
    } else {
      useThemeStore.getState().hydrate();
    }
  }, []);

  return (
    <NextThemesProvider
      attribute="data-mode"
      defaultTheme="system"
      enableSystem
      forcedTheme={forced}
      disableTransitionOnChange
    >
      <DomSync />
      {children}
    </NextThemesProvider>
  );
}
