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
  const stateRef = useRef<RiftState | null>(null);

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
    import("@/lib/gl/rift")
      .then(({ createRiftState, mountRift }) => {
        if (!alive) return;
        try {
          // 挂载时刻从 store 取最新 hum/rift：不闭包依赖这两个值，滑杆变化走下方热更新
          const live = useThemeStore.getState().resolved.effects;
          state = createRiftState({
            breath: live.hum.breath,
            intensity: live.rift.intensity,
          });
          layer = mountRift(canvas, state);
          stateRef.current = state;
          // 转场层只认 state（含 setTear/setCollapse/setShift），不是 layer
          riftGlobalScope().__rift = state;
        } catch (e) {
          // WebGL 上下文创建失败：维持静态幕面，降级留痕便于排查（不静默吞错）
          console.warn("[rift] GL 不可用，降级静态幕布", e);
        }
      })
      .catch((e) => {
        // chunk 本身加载失败（网络 / 发版后 chunk hash 失效）：与 GL 失败同等留痕，不静默白幕
        console.warn("[rift] chunk 加载失败", e);
      });
    return () => {
      alive = false;
      layer?.dispose();
      if (stateRef.current === state) stateRef.current = null;
      const scope = riftGlobalScope();
      if (state && scope.__rift === state) delete scope.__rift;
    };
    // deps 只留“换层”级变量：hum/rift 滑杆逐帧变化走下方热更新 effect，不重挂/不重编译 shader
  }, [effects.renderer, tier, reduced, idle]);

  // 参数热更新：层存活期间直接把新值刷进 uniform 状态，无重挂
  useEffect(() => {
    stateRef.current?.setHum(effects.hum.breath);
  }, [effects.hum.breath]);
  useEffect(() => {
    stateRef.current?.setIntensity(effects.rift.intensity);
  }, [effects.rift.intensity]);

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
