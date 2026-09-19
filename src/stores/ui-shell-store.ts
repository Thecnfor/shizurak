"use client";

import { create } from "zustand";
import type { FxTier } from "@/lib/fx/tier";

interface AgentDockState {
  open: boolean;
  mode: "floating" | "docked";
}

interface UIShellStore {
  fxTier: FxTier;
  setFxTier: (tier: FxTier) => void;
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  /** Agent Dock（浮层，modeless）：跨路由状态经 <Activity> 保活，见设计规范 §11 */
  agentDock: AgentDockState;
  toggleAgentDock: () => void;
  setAgentDock: (patch: Partial<AgentDockState>) => void;
}

export const useUIShellStore = create<UIShellStore>((set) => ({
  fxTier: "mid",
  setFxTier: (fxTier) => set({ fxTier }),
  commandOpen: false,
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  agentDock: { open: false, mode: "floating" },
  toggleAgentDock: () =>
    set((s) => ({ agentDock: { ...s.agentDock, open: !s.agentDock.open } })),
  setAgentDock: (patch) =>
    set((s) => ({ agentDock: { ...s.agentDock, ...patch } })),
}));
