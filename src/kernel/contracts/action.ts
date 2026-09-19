import type { z } from "zod";

/** 前端 UI 动作（Harness 规范 §6.2）：三引擎与工具循环共用同一动作注册表 */
export interface UiAction<Input = any> {
  id: string;
  level: "L0" | "L1" | "L2";
  schema: z.ZodType<Input>;
  /** L1 本地可逆（导航/筛选/主题）；L2 对外/不可逆 */
  reversible: boolean;
  /** L2 确认卡可视化（主题化） */
  preview?: (input: Input) => {
    title: string;
    summary: string;
    riskNote?: string;
  };
  /** L0/L1 直接执行；L2 不在此执行（进 pendingActions） */
  execute?: (input: Input) => void | Promise<void>;
}

export type ActionInvocation =
  | { status: "ok"; id: string }
  | {
      status: "pending";
      id: string;
      preview: { title: string; summary: string; riskNote?: string };
    }
  | { status: "error"; id: string; error: string };
