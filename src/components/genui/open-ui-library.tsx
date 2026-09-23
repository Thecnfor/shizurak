"use client";

import {
  type ComponentRenderProps,
  createLibrary,
  defineComponent,
} from "@openuidev/react-lang";
import type { ReactNode } from "react";
import { z } from "zod";
import { frameClass, useGenUiSkin } from "./skin";

/**
 * OpenUI Lang 组件库（第二 GenUI 引擎，Harness 规范 §3.3）。与 json-render 共用同一套
 * 皮肤派发（GenUiSkinProvider → frameClass，见 genui-renderer/open-ui-renderer）与
 * 语义 token（CSS 变量 → 主题自动换装）。组件 props 在 p.props，嵌套子节点
 * 经 p.renderNode(child) 渲染（实测的 react-lang 组件契约）。
 */
type P = Record<string, any>;
const kids = (p: ComponentRenderProps<P>): ReactNode => {
  const c = p.props.children;
  if (!Array.isArray(c)) return null;
  // renderNode 返回的节点已带 statementId key，无需手动索引键。
  return c.map((child) => p.renderNode(child));
};

const Text = defineComponent({
  name: "Text",
  description: "一段文本",
  props: z.object({
    text: z.string(),
    tone: z.enum(["muted", "default"]).optional(),
  }),
  component: (p: ComponentRenderProps<P>) => (
    <p
      className={
        p.props.tone === "muted" ? "text-sm text-ink-muted" : "text-sm text-ink"
      }
    >
      {String(p.props.text ?? "")}
    </p>
  ),
});

const Callout = defineComponent({
  name: "Callout",
  description: "提示块",
  props: z.object({
    text: z.string(),
    tone: z.enum(["info", "success", "warning", "danger"]).optional(),
  }),
  component: (p: ComponentRenderProps<P>) => {
    const { skin } = useGenUiSkin();
    const map: Record<string, string> = {
      info: "border-border text-ink",
      success: "border-success text-success",
      warning: "border-warning text-warning",
      danger: "border-danger text-danger",
    };
    const tone = String(p.props.tone ?? "info");
    return (
      <div
        data-skin={skin}
        className={frameClass(
          skin,
          `rounded-md border bg-bg-elevated p-3 text-sm ${map[tone] ?? map.info}`,
          // 色调即边框色，缝补只缝形状不夺色（与 registry.Callout 同步）
          { strongBorder: false },
        )}
      >
        {String(p.props.text ?? "")}
      </div>
    );
  },
});

const Stack = defineComponent({
  name: "Stack",
  description: "纵向/横向容器",
  props: z.object({
    children: z.array(z.any()).optional(),
    direction: z.enum(["column", "row"]).optional(),
    gap: z.number().optional(),
  }),
  component: (p: ComponentRenderProps<P>) => (
    <div
      className={`flex ${p.props.direction === "row" ? "flex-row" : "flex-col"}`}
      style={{ gap: `${Number(p.props.gap ?? 8)}px` }}
    >
      {kids(p)}
    </div>
  ),
});

const Card = defineComponent({
  name: "Card",
  description: "带标题的卡片",
  props: z.object({
    title: z.string().optional(),
    children: z.array(z.any()).optional(),
  }),
  component: (p: ComponentRenderProps<P>) => {
    const { skin } = useGenUiSkin();
    const title = p.props.title ? String(p.props.title) : "";
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
        {kids(p)}
      </div>
    );
  },
});

const MetricGrid = defineComponent({
  name: "MetricGrid",
  description: "指标网格",
  props: z.object({
    metrics: z.array(
      z.object({ label: z.string(), value: z.union([z.string(), z.number()]) }),
    ),
  }),
  component: (p: ComponentRenderProps<P>) => {
    const { skin } = useGenUiSkin();
    const metrics = Array.isArray(p.props.metrics)
      ? (p.props.metrics as Array<{ label: string; value: string | number }>)
      : [];
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            data-skin={skin}
            className={frameClass(
              skin,
              "rounded-md border border-border bg-surface p-3",
            )}
          >
            <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
              {m.label}
            </p>
            <p className="mt-1 font-mono text-xl tabular-nums text-accent">
              {m.value}
            </p>
          </div>
        ))}
      </div>
    );
  },
});

export const openUiLibrary = createLibrary({
  components: [Text, Callout, Stack, Card, MetricGrid],
});
