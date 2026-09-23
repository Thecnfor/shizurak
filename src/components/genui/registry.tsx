"use client";

import type {
  ComponentRegistry,
  ComponentRenderProps,
} from "@json-render/react";
import { useEffect, useState } from "react";
import { ensureClientKernel } from "@/lib/kernel/client-boot";
import type { ActionsService } from "@/lib/kernel/plugins/ui-actions";
import { useKernel, useKernelService } from "@/lib/kernel/react";
import { cn } from "@/lib/utils";
import { frameClass, useGenUiSkin } from "./skin";

/**
 * GenUI 组件注册表（设计规范 §7.2 · Harness 规范 §3.3）。皮肤由 renderer 经
 * GenUiSkinProvider 下发（契约 v2 catalogVariant：stitch 缝补 / clean 原面板），
 * 颜色仍全走主题 CSS 变量，同一份 spec 在 void/lumen 下自动换装（见 theme-vars）。
 * json-render Renderer 传入 ComponentRenderProps：props 在 element.props。
 */
type P = Record<string, unknown>;
type RCP = ComponentRenderProps<P>;
const s = (v: unknown): string => (v == null ? "" : String(v));

function Stack({ element, children }: RCP) {
  const dir = element.props.direction === "row" ? "flex-row" : "flex-col";
  const gap = s(element.props.gap) || "8px";
  return (
    <div className={`flex ${dir}`} style={{ gap }}>
      {children}
    </div>
  );
}

function Card({ element, children }: RCP) {
  const { skin } = useGenUiSkin();
  const title = s(element.props.title);
  return (
    <div
      data-skin={skin}
      className={frameClass(
        skin,
        "rounded-md border border-border bg-surface p-4",
      )}
    >
      {title ? (
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-ink-muted">
          {title}
        </p>
      ) : null}
      {children}
    </div>
  );
}

function Text({ element, children }: RCP) {
  const tone = element.props.tone === "muted" ? "text-ink-muted" : "text-ink";
  return (
    <p className={`${tone} text-sm leading-relaxed`}>
      {s(element.props.text) || children}
    </p>
  );
}

function PostCard({ element }: RCP) {
  const { skin } = useGenUiSkin();
  const tags = Array.isArray(element.props.tags)
    ? (element.props.tags as unknown[])
    : [];
  return (
    <div
      data-skin={skin}
      className={cn(
        frameClass(skin, "rounded-md border border-border bg-surface p-4"),
        // 缝补拒绝清单：悬停底光也是装饰，只在 clean 下保留
        skin === "clean" && "hover:bg-surface-hover",
      )}
    >
      <p className="font-semibold text-ink">{s(element.props.title)}</p>
      {element.props.summary ? (
        <p className="mt-1 text-sm text-ink-muted">
          {s(element.props.summary)}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {tags.map((t) => (
          <span
            key={s(t)}
            className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-ink-faint"
          >
            {s(t)}
          </span>
        ))}
      </div>
    </div>
  );
}

function MetricGrid({ element }: RCP) {
  const { skin } = useGenUiSkin();
  const metrics = Array.isArray(element.props.metrics)
    ? (element.props.metrics as Array<{ label?: unknown; value?: unknown }>)
    : [];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {metrics.map((m) => (
        <div
          key={s(m.label)}
          data-skin={skin}
          className={frameClass(
            skin,
            "rounded-md border border-border bg-surface p-3",
          )}
        >
          <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
            {s(m.label)}
          </p>
          <p className="mt-1 font-mono text-xl tabular-nums text-accent">
            {s(m.value)}
          </p>
        </div>
      ))}
    </div>
  );
}

function Callout({ element }: RCP) {
  const { skin } = useGenUiSkin();
  const tone = s(element.props.tone) || "info";
  const map: Record<string, string> = {
    info: "border-border text-ink",
    success: "border-success text-success",
    warning: "border-warning text-warning",
    danger: "border-danger text-danger",
  };
  return (
    <div
      data-skin={skin}
      className={frameClass(
        skin,
        `rounded-md border bg-bg-elevated p-3 text-sm ${map[tone] ?? map.info}`,
        // 色调即边框色（success/warning/danger 语义），缝补只缝形状不夺色
        { strongBorder: false },
      )}
    >
      {s(element.props.text)}
    </div>
  );
}

/**
 * ActionButton（T9 评审批 I）：渲染 label，点击派发到内核 ui-actions 通道
 * （actions.invoke：L0/L1 直接执行，L2 转 pending 确认卡，见 ui-actions 插件）。
 * 内核未就绪时禁用；执行报错就地披露（不静默吞）。
 *
 * 遗留批接上 pending 状态线：invoke 在飞 = busy（禁用 + 转圈 + aria-busy），
 * promise 落定（含 reject，不再悬空）才解；L2 的 ui.action.pending 同时接事件总线
 * 与 invoke 返回两条来源（任一路命中即标「待确认」提示行），ui.action.invoked
 * 到达即清。诚实注记：确认卡本体（pendingActions 消费面）尚不存在，L2 落定后
 * 只剩静态提示而非 spinner——spinner 绝不等一个不存在的事件，否则永挂。
 * 缝补皮肤语义不变：spinner 只是 mono 字符旋转，无 glow/装饰类。
 */
function ActionButton({ element }: RCP) {
  const { skin } = useGenUiSkin();
  const kernel = useKernel();
  const actions = useKernelService<ActionsService>("actions");
  const [busy, setBusy] = useState(false);
  const [awaiting, setAwaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actionId = s(element.props.actionId);
  // 内核已改懒载（T10 补记）：消费 ui-actions 的组件挂载即消费信号，
  // 触发启动（幂等）；就绪前按钮维持既有禁用容错
  useEffect(() => {
    void ensureClientKernel().catch(() => {});
  }, []);
  // ui.action.* 事件线：同名动作经其它入口（agent dock 等）派发/落定时，
  // 本按钮的指示态跟着走（payload 形状：{ id }，见 ui-actions 插件 emit；
  // 总线把 emit 的实参逐个传给 handler，首参即 payload）
  useEffect(() => {
    if (!kernel) return;
    const hit = (first: unknown) =>
      (first as { id?: string } | undefined)?.id === actionId;
    const offPending = kernel.context.on("ui.action.pending", (first) => {
      if (hit(first)) setAwaiting(true);
    });
    const offInvoked = kernel.context.on("ui.action.invoked", (first) => {
      if (hit(first)) {
        setAwaiting(false);
        setBusy(false);
      }
    });
    return () => {
      offPending();
      offInvoked();
    };
  }, [kernel, actionId]);
  return (
    <div>
      <button
        type="button"
        disabled={actions === undefined || busy}
        aria-busy={busy || undefined}
        onClick={() => {
          if (!actions) return;
          setError(null);
          setAwaiting(false);
          setBusy(true);
          void actions
            .invoke(
              actionId,
              (element.props.params as Record<string, unknown> | undefined) ??
                {},
            )
            .then((r) => {
              if (r.status === "error") setError(r.error);
              // L2：invoke 同步返回 pending（事件线可能比这里的 then 更早到，
              // 两路都写同一个幂等态）；落定后 spinner 交给 finally 收
              if (r.status === "pending") setAwaiting(true);
            })
            .catch((err: unknown) => setError(String(err)))
            .finally(() => setBusy(false));
        }}
        className={frameClass(
          skin,
          "rounded-md border border-border-strong bg-bg-elevated px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-accent hover:border-accent disabled:opacity-50",
        )}
      >
        {busy ? (
          <span aria-hidden className="mr-1.5 inline-block animate-spin">
            ◌
          </span>
        ) : null}
        {s(element.props.label)}
      </button>
      {awaiting && !busy ? (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
          已转确认 · 等待授权
        </p>
      ) : null}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}

export const genuiRegistry: ComponentRegistry = {
  Stack,
  Card,
  Text,
  PostCard,
  MetricGrid,
  Callout,
  ActionButton,
};
