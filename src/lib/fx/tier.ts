"use client";

import { useEffect } from "react";
import { useUIShellStore } from "@/stores/ui-shell-store";

export type FxTier = "high" | "mid" | "low";

export interface TierInput {
  hasWebGL2: boolean;
  deviceMemory?: number;
  saveData?: boolean;
}

export function detectTier(input: TierInput): FxTier {
  if (!input.hasWebGL2) return "low";
  if (input.saveData) return "mid";
  return (input.deviceMemory ?? 8) >= 8 ? "high" : "mid";
}

function detectWebGL2(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2"));
  } catch {
    return false;
  }
}

export function useFxTier(): FxTier {
  const fxTier = useUIShellStore((s) => s.fxTier);
  useEffect(() => {
    const override = new URLSearchParams(window.location.search).get("fxtier");
    if (override === "high" || override === "mid" || override === "low") {
      useUIShellStore.getState().setFxTier(override);
      return;
    }
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean };
    };
    useUIShellStore.getState().setFxTier(
      detectTier({
        hasWebGL2: detectWebGL2(),
        deviceMemory: nav.deviceMemory,
        saveData: nav.connection?.saveData,
      }),
    );
  }, []);
  return fxTier;
}
