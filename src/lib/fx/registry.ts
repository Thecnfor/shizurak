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
  // 契约 v2：按 renderer 分派。rift-layer 暂以 starfield 占位，Task 3 替换为真正的幕层。
  "rift-layer": {
    loader: () => import("@/components/fx/starfield").then((m) => m.Starfield),
    minTier: "mid",
  },
};
