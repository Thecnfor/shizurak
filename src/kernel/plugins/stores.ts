import type { GenUIChannel, GenUIEngineId } from "@/kernel/contracts/genui";
import { type KernelContext, plugin } from "@/kernel/core";

export interface StoredSpec {
  id: string;
  kind: GenUIEngineId;
  themeId: string;
  spec: unknown;
  source: "visitor" | "author";
  shared: boolean;
  createdAt: number;
}

export interface SpecStoreService {
  save(
    spec: Omit<StoredSpec, "id" | "createdAt" | "shared"> & { id?: string },
  ): StoredSpec;
  load(id: string): StoredSpec | undefined;
  share(id: string): StoredSpec | undefined;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  channel?: GenUIChannel;
  at: number;
}

export interface ThreadStoreService {
  append(threadId: string, msg: Omit<ChatMessage, "at">): void;
  history(threadId: string): ChatMessage[];
}

/** 内存实现（开发/测试可用）；M4 换 PG（genui_specs / agent_threads）。接口不变。 */
export const storesPlugin = plugin(
  (ctx: KernelContext) => {
    const specs = new Map<string, StoredSpec>();
    let seq = 0;
    const specStore: SpecStoreService = {
      save(s) {
        seq += 1;
        const id = s.id ?? `spec_${seq}`;
        const rec: StoredSpec = {
          id,
          kind: s.kind,
          themeId: s.themeId,
          spec: s.spec,
          source: s.source,
          shared: false,
          createdAt: Date.now(),
        };
        specs.set(id, rec);
        return rec;
      },
      load: (id) => specs.get(id),
      share(id) {
        const rec = specs.get(id);
        if (!rec) return undefined;
        rec.shared = true;
        return rec;
      },
    };
    ctx.provide("spec.store", specStore);

    const threads = new Map<string, ChatMessage[]>();
    const threadStore: ThreadStoreService = {
      append(threadId, msg) {
        const list = threads.get(threadId) ?? [];
        list.push({ ...msg, at: Date.now() });
        threads.set(threadId, list);
      },
      history: (threadId) => threads.get(threadId) ?? [],
    };
    ctx.provide("thread.store", threadStore);

    return () => {
      specs.clear();
      threads.clear();
    };
  },
  { name: "stores", provide: ["spec.store", "thread.store"] },
);
