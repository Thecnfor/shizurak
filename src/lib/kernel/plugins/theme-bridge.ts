import { type KernelContext, plugin } from "@/kernel/core";
import type { ResolvedTheme } from "@/lib/themes/resolve";
import { useThemeStore } from "@/stores/theme-store";

export interface ThemeBridgeService {
  current(): ResolvedTheme;
  variant(): "hud" | "clean";
  /** 主题切换时通知（GenUI 原地换肤消费）；返回取消订阅 */
  subscribe(cb: (r: ResolvedTheme) => void): () => void;
}

export const themeBridgePlugin = plugin(
  (ctx: KernelContext) => {
    const svc: ThemeBridgeService = {
      current: () => useThemeStore.getState().resolved,
      variant: () => useThemeStore.getState().resolved.genui.catalogVariant,
      subscribe(cb) {
        return useThemeStore.subscribe((s) => cb(s.resolved));
      },
    };
    ctx.provide("themeBridge", svc);
    // 主题切换广播（供 GenUI 渲染器换肤）
    const unsub = useThemeStore.subscribe((s, prev) => {
      if (s.resolved !== prev.resolved) ctx.emit("theme/switched", s.resolved);
    });
    return () => unsub();
  },
  { name: "theme-bridge", provide: ["themeBridge"] },
);
