"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { type ReactNode, useEffect } from "react";
import { applyMotionDefaults } from "@/lib/motion/gsap";
import { useThemeStore } from "@/stores/theme-store";
import { getTheme } from "@/themes/registry";

/**
 * hydration 完成标记（E2E 等待点）。
 * 置于 children 之后 + rAF 延迟：确保所有子组件（含键盘监听等副作用）的
 * effect 都已执行后才翻转，避免测试在监听器注册前抢跑。
 */
function HydrationMarker() {
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      document.documentElement.dataset.hydrated = "true";
    });
    return () => cancelAnimationFrame(id);
  }, []);
  return null;
}

function DomSync() {
  const resolved = useThemeStore((s) => s.resolved);
  const { resolvedTheme, setTheme: setNextTheme } = useTheme();

  // store → DOM 属性 + GSAP 默认值（v2 废除 accentHue，色相钩子已从生成管线整体删除）
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", resolved.meta.id);
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
      <HydrationMarker />
    </NextThemesProvider>
  );
}
