import type { ComponentType } from "react";
import type { FxTier } from "@/lib/fx/tier";

export interface FxProps {
  intensity: number;
  tier: FxTier;
}

export const fxRegistry: Record<
  string,
  { loader: () => Promise<ComponentType<FxProps>>; minTier: FxTier }
> = {
  starfield: {
    loader: () => import("@/components/fx/starfield").then((m) => m.Starfield),
    minTier: "mid",
  },
  // nebula: M1 追加（WebGL shader）
};
