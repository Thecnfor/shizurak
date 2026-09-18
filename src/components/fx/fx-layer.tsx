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
  const [Background, setBackground] = useState<ComponentType<FxProps> | null>(
    null,
  );

  const entry = fxRegistry[effects.background];
  const enabled =
    effects.background !== "none" &&
    effects.intensity > 0 &&
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

  if (!enabled) return null;

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

  return <Background intensity={effects.intensity} tier={tier} />;
}
