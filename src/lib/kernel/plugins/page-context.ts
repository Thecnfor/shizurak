import { type KernelContext, plugin } from "@/kernel/core";

export interface ContextRef {
  /** 唯一 id（如 post slug、section anchor） */
  id: string;
  /** 语义类型：page / section / card */
  type: "page" | "section" | "card" | string;
  /** 距栈底深度（0=页面级） */
  depth: number;
  data?: Record<string, unknown>;
}

export interface PageContextService {
  push(ref: Omit<ContextRef, "depth">): void;
  pop(id: string): void;
  stack(): ContextRef[];
  /** 按 token 预算从栈顶取若干层（栈顶=最新/最深，优先注入） */
  snapshot(maxTokens?: number): ContextRef[];
}

export function estimateTokens(ref: ContextRef): number {
  return Math.ceil(JSON.stringify(ref).length / 4);
}

export const pageContextPlugin = plugin(
  (ctx: KernelContext) => {
    const _stack: ContextRef[] = [];
    const svc: PageContextService = {
      push(ref) {
        const existing = _stack.findIndex((r) => r.id === ref.id);
        if (existing >= 0) _stack.splice(existing, 1);
        _stack.push({ ...ref, depth: _stack.length });
        // 去重可能发生在栈中部：统一重算深度，保证 depth ≡ 栈内位置
        _stack.forEach((r, idx) => {
          r.depth = idx;
        });
        ctx.emit("page/context.pushed", { depth: _stack.length });
      },
      pop(id) {
        const i = _stack.findIndex((r) => r.id === id);
        if (i >= 0) {
          _stack.splice(i, 1);
          // 重算深度
          _stack.forEach((r, idx) => {
            r.depth = idx;
          });
          ctx.emit("page/context.popped", { depth: _stack.length });
        }
      },
      stack: () => [..._stack],
      snapshot(maxTokens = 800) {
        const picked: ContextRef[] = [];
        let tokens = 0;
        for (let i = _stack.length - 1; i >= 0; i--) {
          const t = estimateTokens(_stack[i]);
          if (tokens + t > maxTokens) break;
          picked.unshift(_stack[i]);
          tokens += t;
        }
        return picked;
      },
    };
    ctx.provide("pageContext", svc);
  },
  { name: "page-context", provide: ["pageContext"] },
);
