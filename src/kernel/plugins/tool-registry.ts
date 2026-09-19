import type { ZodError } from "zod";
import {
  isExecutableLevel,
  type ToolDescriptor,
  type ToolExecContext,
} from "@/kernel/contracts/tool";
import { type KernelContext, plugin } from "@/kernel/core";

export interface InvokeOk {
  status: "ok";
  id: string;
  output: unknown;
}
export interface InvokePending {
  status: "needs-approval";
  id: string;
  preview: { title: string; summary: string; riskNote?: string };
}
export interface InvokeError {
  status: "error";
  id: string;
  error: string;
}
export type InvokeResult = InvokeOk | InvokePending | InvokeError;

export interface ToolsService {
  register(descriptor: ToolDescriptor): void;
  list(): ToolDescriptor[];
  get(id: string): ToolDescriptor | undefined;
  invoke(
    id: string,
    input: unknown,
    ctx: ToolExecContext,
  ): Promise<InvokeResult>;
}

function zodMessage(e: ZodError): string {
  return e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
}

export const toolRegistryPlugin = plugin(
  (ctx: KernelContext) => {
    const tools = new Map<string, ToolDescriptor>();
    const svc: ToolsService = {
      register(d) {
        if (tools.has(d.id)) throw new Error(`工具重复注册: ${d.id}`);
        if (isExecutableLevel(d.level) && !d.execute)
          throw new Error(`L0/L1 工具必须带 execute: ${d.id}`);
        if (d.level === "L2" && !d.preview)
          throw new Error(`L2 工具必须带 preview（确认卡可视化）: ${d.id}`);
        tools.set(d.id, d);
      },
      list: () => [...tools.values()],
      get: (id) => tools.get(id),
      async invoke(id, input, execCtx) {
        const d = tools.get(id);
        if (!d) return { status: "error", id, error: `未知工具: ${id}` };
        const parsed = d.parameters.safeParse(input);
        if (!parsed.success)
          return { status: "error", id, error: zodMessage(parsed.error) };
        // 审计 + 计量（每次调用都发事件，Harness 规范 §9）
        await ctx.emit("agent/tool.invoked", {
          id,
          level: d.level,
          theme: execCtx.theme,
          locale: execCtx.locale,
        });
        if (d.level === "L2") {
          // L2 绝不自动执行：挂起待确认（红线，架构规范 §5.4）
          return {
            status: "needs-approval",
            id,
            preview: d.preview!(parsed.data),
          };
        }
        try {
          const output = await d.execute!(parsed.data, execCtx);
          return { status: "ok", id, output };
        } catch (err) {
          return {
            status: "error",
            id,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
    };
    ctx.provide("ai.tools", svc);
  },
  { name: "tool-registry", provide: ["ai.tools"] },
);
