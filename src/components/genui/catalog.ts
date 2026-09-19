import { z } from "zod";

/**
 * GenUI 领域 catalog（设计规范 §7.2）：AI 只能在此白名单内组合。
 * 唯一真源——json-render / OpenUI / RSC 三引擎共用（Harness 规范 §3.3）。
 */
export const PostCard = z.object({
  type: z.literal("PostCard"),
  slug: z.string(),
  title: z.string(),
  summary: z.string().optional(),
  tags: z.array(z.string()).optional(),
  publishedAt: z.string().optional(),
  readingTime: z.string().optional(),
});

export const MetricGrid = z.object({
  type: z.literal("MetricGrid"),
  metrics: z
    .array(
      z.object({ label: z.string(), value: z.union([z.string(), z.number()]) }),
    )
    .min(1),
});

export const ActionButton = z.object({
  type: z.literal("ActionButton"),
  actionId: z.string(),
  label: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
});

export const Callout = z.object({
  type: z.literal("Callout"),
  tone: z.enum(["info", "success", "warning", "danger"]).default("info"),
  text: z.string(),
});

export const catalogEntry = z.discriminatedUnion("type", [
  PostCard,
  MetricGrid,
  ActionButton,
  Callout,
]);

export type CatalogEntry = z.infer<typeof catalogEntry>;

export const catalog = {
  PostCard,
  MetricGrid,
  ActionButton,
  Callout,
} as const;

export type CatalogComponentName = keyof typeof catalog;

/** 从 catalog 生成系统提示用的组件说明（catalog 即契约，05 §5） */
export function catalogPrompt(): string {
  return `可用 GenUI 组件（type 字段选择）：\n${(
    Object.keys(catalog) as CatalogComponentName[]
  )
    .map(
      // biome-ignore lint/suspicious/noExplicitAny: 各项 shape 异构，toJSONSchema 只读结构
      (k) =>
        `- ${k}: ${JSON.stringify(z.toJSONSchema(catalog[k].shape as any))}`,
    )
    .join("\n")}`;
}
