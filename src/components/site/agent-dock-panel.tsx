"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { PanelRight, Send, X } from "lucide-react";
import { useParams } from "next/navigation";
import { Activity, useEffect, useMemo, useRef, useState } from "react";
import { GenuiRenderer } from "@/components/genui/genui-renderer";
import { OpenUIRenderer } from "@/components/genui/open-ui-renderer";
import type { Labels } from "@/components/site/agent-dock";
import type { Kernel } from "@/kernel/core";
import {
  parseOpenuiBlock,
  parseSpecBlock,
  stripOpenuiBlock,
  stripSpecBlock,
} from "@/lib/genui/parse-spec";
import { ensureClientKernel } from "@/lib/kernel/client-boot";
import type { PageContextService } from "@/lib/kernel/plugins/page-context";
import { useThemeStore } from "@/stores/theme-store";
import { useUIShellStore } from "@/stores/ui-shell-store";

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

/** L2 审批卡：AI SDK v7 流内 tool-approval-request → 用户确认/拒绝回流。 */
function ApprovalCard({
  // biome-ignore lint/suspicious/noExplicitAny: UIMessage part 联合类型的审批请求分支
  request,
  labels,
  onRespond,
}: {
  // biome-ignore lint/suspicious/noExplicitAny: 同上
  request: any;
  labels: Labels;
  // biome-ignore lint/suspicious/noExplicitAny: useChat addToolApprovalResponse
  onRespond: (args: any) => void;
}) {
  const [done, setDone] = useState(false);
  const input = request.toolCall?.input as { message?: string } | undefined;
  const summary =
    input?.message ?? JSON.stringify(request.toolCall?.input ?? {});
  return (
    <div className="mt-2 rounded-md border border-border-strong bg-bg-elevated p-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
        {labels.approvalTitle} · {String(request.toolCall?.toolName ?? "tool")}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-xs text-ink-muted">
        {summary}
      </p>
      {request.reason ? (
        <p className="mt-1 font-mono text-[10px] text-[var(--warning)]">
          {String(request.reason)}
        </p>
      ) : null}
      {done ? (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
          {labels.approvalDone}
        </p>
      ) : (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => {
              onRespond({ id: request.approvalId, approved: true });
              setDone(true);
            }}
            className="rounded-sm border border-border-strong bg-surface px-3 py-1 text-xs text-accent hover:bg-surface-hover"
          >
            {labels.approve}
          </button>
          <button
            type="button"
            onClick={() => {
              onRespond({ id: request.approvalId, approved: false });
              setDone(true);
            }}
            className="rounded-sm border border-border px-3 py-1 text-xs text-ink-muted hover:bg-surface-hover"
          >
            {labels.reject}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Dock 主体（含 useChat 与 GenUI/OpenUI 渲染栈——整文件即首载红线里的重依赖，
 * 由 agent-dock.tsx 以 next/dynamic 在首次打开时才加载，见 T10 size 红线修复）。
 * 仅在浏览器挂载后渲染——避免 useChat 初始化时的不稳定值（Math.random 生成 id）
 * 进入 Cache Components 预渲染。
 */
export default function DockPanel({ labels }: { labels: Labels }) {
  const agentDock = useUIShellStore((s) => s.agentDock);
  const setAgentDock = useUIShellStore((s) => s.setAgentDock);
  const toggle = useUIShellStore((s) => s.toggleAgentDock);
  const [input, setInput] = useState("");
  const params = useParams<{ lang: string }>();
  const scroller = useRef<HTMLDivElement>(null);

  // 内核已改懒载（T10 补记）：dock 面板挂载即 chat 意图，触发启动并持有实例；
  // 极端情况下首帧就绪前就发消息，诚实传空 page-context（服务端容错）
  const kernelRef = useRef<Kernel | null>(null);
  useEffect(() => {
    let alive = true;
    ensureClientKernel().then(
      (k) => {
        if (alive) kernelRef.current = k;
      },
      () => {},
    );
    return () => {
      alive = false;
    };
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages, id }) => {
          const k = kernelRef.current;
          const pc = k?.context.has("pageContext")
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

  const { messages, status, sendMessage, error, addToolApprovalResponse } =
    useChat({ transport });
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
    <Activity mode={agentDock.open ? "visible" : "hidden"} name="agent-dock">
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
              aria-label={labels.close}
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
              {(m.parts ?? [])
                .filter((p) => p.type === "tool-approval-request")
                .map(
                  // biome-ignore lint/suspicious/noExplicitAny: 审批分支 part
                  (p: any) => (
                    <ApprovalCard
                      key={p.approvalId}
                      request={p}
                      labels={labels}
                      onRespond={(args) => addToolApprovalResponse(args)}
                    />
                  ),
                )}
            </div>
          ))}
          {busy ? <p className="font-mono text-xs text-ink-faint">…</p> : null}
          {status === "error" ? (
            <p className="mr-auto max-w-[85%] rounded-md border border-border bg-surface px-3 py-2 text-xs text-ink-muted">
              {/* 429/网关异常等统一上屏（useChat 会把非 2xx 归入 error 态） */}
              {error?.message === "Failed to fetch" || !error
                ? labels.error
                : `${labels.error}：${error.message}`}
            </p>
          ) : null}
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
            aria-label={labels.send}
            disabled={busy || !input.trim()}
            className="flex size-9 items-center justify-center rounded-sm border border-border-strong bg-bg-elevated text-accent disabled:opacity-40"
          >
            <Send className="size-4" />
          </button>
        </form>
      </aside>
    </Activity>
  );
}
