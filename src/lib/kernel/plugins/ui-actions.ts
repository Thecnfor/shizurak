import type { ActionInvocation, UiAction } from "@/kernel/contracts/action";
import { type KernelContext, plugin } from "@/kernel/core";

export interface ActionsService {
  register(action: UiAction): void;
  list(): UiAction[];
  get(id: string): UiAction | undefined;
  invoke(id: string, params: unknown): Promise<ActionInvocation>;
}

export const uiActionsPlugin = plugin(
  (ctx: KernelContext) => {
    const actions = new Map<string, UiAction>();
    const svc: ActionsService = {
      register(a) {
        if (actions.has(a.id)) throw new Error(`动作重复注册: ${a.id}`);
        if (a.level === "L2" && !a.preview)
          throw new Error(`L2 动作必须带 preview: ${a.id}`);
        if (a.level !== "L2" && !a.execute)
          throw new Error(`L0/L1 动作必须带 execute: ${a.id}`);
        actions.set(a.id, a);
      },
      list: () => [...actions.values()],
      get: (id) => actions.get(id),
      async invoke(id, params) {
        const a = actions.get(id);
        if (!a) return { status: "error", id, error: `未知动作: ${id}` };
        const parsed = a.schema.safeParse(params);
        if (!parsed.success)
          return {
            status: "error",
            id,
            error: parsed.error.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join("; "),
          };
        if (a.level === "L2") {
          // L2 不自动执行：转确认卡（pendingActions）
          await ctx.emit("ui.action.pending", { id });
          return { status: "pending", id, preview: a.preview!(parsed.data) };
        }
        await a.execute!(parsed.data);
        await ctx.emit("ui.action.invoked", { id, level: a.level });
        return { status: "ok", id };
      },
    };
    ctx.provide("actions", svc);
  },
  { name: "ui-actions", provide: ["actions"] },
);
