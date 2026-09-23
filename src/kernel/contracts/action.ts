/**
 * zod 兼容的最小校验面（T10 补记 size 削减）：UiAction.schema 的结构类型。
 * 服务端/GenUI 路径照旧传 zod schema（zod 的 safeParse 返回在结构上可赋值）；
 * 首载客户端可直接传手写校验对象——zod 运行时不再经契约拖进浏览器关键包。
 */
export interface ValidatorIssue {
  path: readonly PropertyKey[];
  message: string;
}
export type ValidationResult<Input> =
  | { success: true; data: Input }
  | { success: false; error: { issues: readonly ValidatorIssue[] } };
export interface Validator<Input = unknown> {
  safeParse(value: unknown): ValidationResult<Input>;
}

/** 前端 UI 动作（Harness 规范 §6.2）：三引擎与工具循环共用同一动作注册表 */
export interface UiAction<Input = any> {
  id: string;
  level: "L0" | "L1" | "L2";
  schema: Validator<Input>;
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
