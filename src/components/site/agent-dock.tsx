"use client";

import { MessagesSquare } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useUIShellStore } from "@/stores/ui-shell-store";

export type Labels = {
  open: string;
  title: string;
  placeholder: string;
  dock: string;
  error: string;
  approve: string;
  reject: string;
  approvalTitle: string;
  approvalDone: string;
};

/**
 * 重面板（useChat + ai + GenUI/OpenUI 渲染栈 ≈150KB gz）拆到独立 chunk：
 * T10 size 红线的 ONE honest fix——首次打开 dock 前不进首页 first-load。
 * ssr:false 与旧的 mounted-gate 语义一致（useChat 不稳定值不进预渲染）；
 * everOpened 保持挂载，<Activity> 跨路由保活语义不变。
 */
const DockPanel = dynamic(() => import("./agent-dock-panel"), { ssr: false });

/**
 * Agent Dock —— 访客 AI 导览，真实接 /api/chat（AI SDK v7 useChat → ToolLoopAgent → ARK 模型）。
 * 三态 hidden/floating/docked，用 <Activity> 跨路由保活。见设计规范 §11.2。
 */
export function AgentDock({ labels }: { labels: Labels }) {
  const agentDock = useUIShellStore((s) => s.agentDock);
  const toggle = useUIShellStore((s) => s.toggleAgentDock);
  const [mounted, setMounted] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (agentDock.open) setEverOpened(true);
  }, [agentDock.open]);

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {mounted && everOpened ? <DockPanel labels={labels} /> : null}

      <button
        type="button"
        onClick={toggle}
        aria-label={labels.open}
        aria-expanded={agentDock.open}
        className="flex size-12 items-center justify-center rounded-full border border-border-strong bg-bg-elevated text-accent shadow-[var(--glow)] transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring-color)]"
      >
        <MessagesSquare className="size-5" />
      </button>
    </div>
  );
}
