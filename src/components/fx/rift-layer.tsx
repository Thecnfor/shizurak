"use client";

import { useEffect, useRef, useState } from "react";
import { useFxTier } from "@/lib/fx/tier";
import type { RiftState } from "@/lib/gl/rift";
import { usePrefersReducedMotion } from "@/lib/motion/reduced";
import { useThemeStore } from "@/stores/theme-store";

/** Task 6/7（T1 撕幕 / T2 崩解）唯一入口：GSAP 经此驱动 shader uniform */
function riftGlobalScope(): { __rift?: RiftState } {
  return window as unknown as { __rift?: RiftState };
}

export function RiftLayer() {
  const ref = useRef<HTMLCanvasElement>(null);
  const effects = useThemeStore((s) => s.resolved.effects);
  const tier = useFxTier();
  const reduced = usePrefersReducedMotion();
  const [idle, setIdle] = useState(false);

  // 首屏让路：idle 后才动态加载 rift chunk（spec §3 预算：LCP 零占用）；无 rIC 的环境回退定时器
  useEffect(() => {
    const go = () => setIdle(true);
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(go);
      return () => cancelIdleCallback(id);
    }
    const t = setTimeout(go, 200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    if (
      !canvas ||
      effects.renderer !== "rift-layer" ||
      reduced ||
      tier === "low" ||
      !idle
    ) {
      return;
    }
    let layer: { dispose(): void } | null = null;
    let state: RiftState | null = null;
    let alive = true;
    import("@/lib/gl/rift").then(({ createRiftState, mountRift }) => {
      if (!alive) return;
      try {
        state = createRiftState({
          breath: effects.hum.breath,
          intensity: effects.rift.intensity,
        });
        layer = mountRift(canvas, state);
        // 转场层只认 state（含 setTear/setCollapse/setShift），不是 layer
        riftGlobalScope().__rift = state;
      } catch {
        // WebGL 上下文创建失败：维持静态幕面（canvas 不渲染内容）
      }
    });
    return () => {
      alive = false;
      layer?.dispose();
      const scope = riftGlobalScope();
      if (state && scope.__rift === state) delete scope.__rift;
    };
  }, [
    effects.renderer,
    effects.hum.breath,
    effects.rift.intensity,
    tier,
    reduced,
    idle,
  ]);

  if (reduced || effects.renderer === "none") return null;

  return (
    <canvas
      ref={ref}
      data-rift={tier === "low" ? "css" : "gl"}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
      style={
        tier === "low"
          ? {
              // lite 兜底：CSS 呼吸（rift-breath keyframe 在 globals.css）
              animation: "rift-breath 8s ease-in-out infinite",
              background:
                "radial-gradient(60% 50% at 50% 40%, color-mix(in oklab, var(--accent) 2%, transparent), transparent)",
            }
          : undefined
      }
    />
  );
}
