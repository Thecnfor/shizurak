"use client";

import { type ComponentType, useEffect, useState } from "react";
import { type FxProps, fxRegistry } from "@/lib/fx/registry";
import { useFxTier } from "@/lib/fx/tier";
import { usePrefersReducedMotion } from "@/lib/motion/reduced";
import { useThemeStore } from "@/stores/theme-store";

const tierRank = { low: 0, mid: 1, high: 2 } as const;

export function FxLayer() {
  const effects = useThemeStore((s) => s.resolved.effects);
  const tier = useFxTier();
  const reduced = usePrefersReducedMotion();
  // hydration 门禁（T9 评审批 I，同 agent-dock 模式）：SSR 首帧与客户端挂载前
  // 一致渲染 null（旧版 SSR 无条件渲染 data-fx=fallback、客户端可能返回
  // null 的水合警告已随此口径消失），挂载后再进入真实分支。
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [Background, setBackground] = useState<ComponentType<FxProps> | null>(
    null,
  );

  const entry = fxRegistry[effects.renderer];
  const enabled =
    effects.renderer !== "none" &&
    effects.rift.intensity > 0 &&
    !reduced &&
    entry !== undefined;
  const meetsTier =
    entry !== undefined && tierRank[tier] >= tierRank[entry.minTier];

  useEffect(() => {
    let alive = true;
    if (!enabled || !entry || !meetsTier) {
      setBackground(null);
      return;
    }
    entry.loader().then((C) => {
      if (alive) setBackground(() => C);
    });
    return () => {
      alive = false;
    };
  }, [enabled, meetsTier, entry]);

  if (!mounted || !enabled) return null;

  if (!meetsTier || !Background) {
    // 低端设备降级：静态渐变（零 JS 开销）
    return (
      <div
        data-fx="fallback"
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 0%, color-mix(in oklab, var(--accent) 8%, transparent), transparent 60%)",
        }}
      />
    );
  }

  return <Background intensity={effects.rift.intensity} tier={tier} />;
}
