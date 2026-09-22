"use client";

import type {
  ComponentRegistry,
  ComponentRenderProps,
} from "@json-render/react";
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

export const genuiRegistry: ComponentRegistry = {
  Stack,
  Card,
  Text,
  PostCard,
  MetricGrid,
  Callout,
};
