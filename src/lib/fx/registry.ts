import type { ComponentType } from "react";
import type { FxTier } from "@/lib/fx/tier";
import type { FxRendererId } from "@/themes/contract";

export interface FxProps {
  intensity: number;
  tier: FxTier;
}

/** renderer id → 懒加载组件；未注册（含 "none"）由调用方按 undefined 降级 */
export const fxRegistry: Partial<
  Record<
    FxRendererId,
    { loader: () => Promise<ComponentType<FxProps>>; minTier: FxTier }
  >
> = {
  // 契约 v2：唯一常驻幕层。minTier=low——lite 档也进组件，CSS 呼吸兜底在 RiftLayer 内部。
  "rift-layer": {
    loader: () => import("@/components/fx/rift-layer").then((m) => m.RiftLayer),
    minTier: "low",
  },
};
