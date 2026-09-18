"use client";

import { create } from "zustand";
import type { FxTier } from "@/lib/fx/tier";

interface UIShellStore {
  fxTier: FxTier;
  setFxTier: (tier: FxTier) => void;
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
}

export const useUIShellStore = create<UIShellStore>((set) => ({
  fxTier: "mid",
  setFxTier: (fxTier) => set({ fxTier }),
  commandOpen: false,
  setCommandOpen: (commandOpen) => set({ commandOpen }),
}));
