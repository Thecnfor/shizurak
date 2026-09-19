"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessagesSquare, PanelRight, Send, X } from "lucide-react";
import { useParams } from "next/navigation";
import { Activity, useEffect, useMemo, useRef, useState } from "react";
import { GenuiRenderer } from "@/components/genui/genui-renderer";
import { OpenUIRenderer } from "@/components/genui/open-ui-renderer";
import {
  parseOpenuiBlock,
  parseSpecBlock,
  stripOpenuiBlock,
  stripSpecBlock,
} from "@/lib/genui/parse-spec";
import { getClientKernel } from "@/lib/kernel";
import type { PageContextService } from "@/lib/kernel/plugins/page-context";
import { useThemeStore } from "@/stores/theme-store";
import { useUIShellStore } from "@/stores/ui-shell-store";

type Labels = {
  open: string;
  title: string;
  placeholder: string;
  dock: string;
};

function textOf(m: { parts?: { type: string; text?: string }[] }): string {
  return (m.parts ?? [])
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("");
}

/** 消息正文：```openui```/```spec``` 块→真 GenUI 渲染；其余→纯文本。 */
function MessageBody({ text }: { text: string }) {
  const openui = parseOpenuiBlock(text);
  const spec = openui ? null : parseSpecBlock(text);
  const prose = stripOpenuiBlock(stripSpecBlock(text));
  return (
    <>
      {prose ? <p className="whitespace-pre-wrap">{prose}</p> : null}
      {openui ? (
        <div className="mt-2">
          <OpenUIRenderer lang={openui} />
        </div>
      ) : null}
      {spec ? (
        <div className="mt-2">
          <GenuiRenderer spec={spec} />
        </div>
      ) : null}
    </>
  );
}

/**
 * Dock 主体（含 useChat）。仅在浏览器挂载后渲染——避免 useChat 初始化时的
 * 不稳定值（Math.random 生成 id）进入 Cache Components 预渲染。
 */
function DockPanel({ labels }: { labels: Labels }) {
  const agentDock = useUIShellStore((s) => s.agentDock);
  const setAgentDock = useUIShellStore((s) => s.setAgentDock);
  const toggle = useUIShellStore((s) => s.toggleAgentDock);
  const [input, setInput] = useState("");
  const params = useParams<{ lang: string }>();
  const scroller = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages, id }) => {
          const k = getClientKernel();
          const pc = k.context.has("pageContext")
            ? k.context.require<PageContextService>("pageContext").snapshot()
            : [];
          return {
            body: {
              messages,
              id,
              theme: useThemeStore.getState().themeId,
              locale: params?.lang ?? "zh",
              pageContext: pc,
            },
          };
        },
      }),
    [params?.lang],
  );

  const { messages, status, sendMessage } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";
  const docked = agentDock.mode === "docked";

  const send = () => {
    const v = input.trim();
    if (!v || busy) return;
    setInput("");
    sendMessage({ text: v });
    requestAnimationFrame(() => {
      const el = scroller.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  return (
    <aside
      aria-label={labels.title}
      className={`flex flex-col overflow-hidden rounded-md border border-border bg-bg-elevated p-3 shadow-[var(--overlay-shadow)] transition-[width] duration-200 ${
        docked
          ? "h-[60vh] w-[min(480px,92vw)]"
          : "h-[26rem] w-[min(340px,92vw)]"
      }`}
    >
      <header className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs uppercase tracking-widest text-ink-muted">
          {labels.title}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={labels.dock}
            aria-pressed={docked}
            onClick={() =>
              setAgentDock({ mode: docked ? "floating" : "docked" })
            }
            className="flex size-7 items-center justify-center rounded-sm text-ink-muted hover:text-ink"
          >
            <PanelRight className="size-4" />
          </button>
          <button
            type="button"
            aria-label={labels.open}
            onClick={toggle}
            className="flex size-7 items-center justify-center rounded-sm text-ink-muted hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      <div
        ref={scroller}
        className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1 text-sm"
      >
        {messages.length === 0 ? (
          <p className="text-ink-muted">{labels.placeholder}</p>
        ) : null}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-md bg-surface-hover px-3 py-2"
                : "mr-auto max-w-[85%] rounded-md bg-surface px-3 py-2"
            }
          >
            <MessageBody text={textOf(m)} />
          </div>
        ))}
        {busy ? <p className="font-mono text-xs text-ink-faint">…</p> : null}
      </div>

      <form
        className="mt-2 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder={labels.placeholder}
          className="flex-1 resize-none rounded-sm border border-border bg-surface p-2 text-sm text-ink outline-none placeholder:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring-color)]"
        />
        <button
          type="submit"
          aria-label={labels.open}
          disabled={busy || !input.trim()}
          className="flex size-9 items-center justify-center rounded-sm border border-border-strong bg-bg-elevated text-accent disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </aside>
  );
}

/**
 * Agent Dock —— 访客 AI 导览，真实接 /api/chat（AI SDK v7 useChat → ToolLoopAgent → ARK 模型）。
 * 三态 hidden/floating/docked，用 <Activity> 跨路由保活。见设计规范 §11.2。
 */
export function AgentDock({ labels }: { labels: Labels }) {
  const agentDock = useUIShellStore((s) => s.agentDock);
  const toggle = useUIShellStore((s) => s.toggleAgentDock);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {mounted ? (
        <Activity
          mode={agentDock.open ? "visible" : "hidden"}
          name="agent-dock"
        >
          <DockPanel labels={labels} />
        </Activity>
      ) : null}

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
