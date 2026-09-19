import type { z } from "zod";

/** 权限级别（架构规范 §5.4 / Harness 规范 §6） */
export type ToolLevel = "L0" | "L1" | "L2";

export interface ToolExecContext {
  locale: "zh" | "en";
  theme: string;
  threadId?: string;
  visitorHash?: string;
  /** page-context 上下文栈顶若干层（Harness 规范 §8） */
  pageContext?: readonly unknown[];
}

export interface ToolDescriptor<Input = any, Output = any> {
  id: string;
  level: ToolLevel;
  description: string;
  parameters: z.ZodType<Input>;
  /** L0/L1 服务端可自动执行；L1 前端动作经 client 代理；L2 无 execute（挂起待确认） */
  execute?: (input: Input, ctx: ToolExecContext) => Output | Promise<Output>;
  /** L2 确认卡的可视化预览（主题化，Harness 规范 §6.2） */
  preview?: (input: Input) => {
    title: string;
    summary: string;
    riskNote?: string;
  };
}

export const isExecutableLevel = (level: ToolLevel): boolean =>
  level === "L0" || level === "L1";
