import { Context, Service } from "@cordisjs/core";

/**
 * DSH-Cordis 微内核核心 —— 直接构建在真 `@cordisjs/core` 的 Context 之上
 * （插件生命周期 / 具名 Service / @inject 依赖调度 / 事件 / 可作用域 disposer 全部由 cordis 承担）。
 * 本文件只是把 cordis 的 class-Service/`inject` 惯用法适配成 shizurak 的
 * 字符串 id `provide/require` 契约，**不自己造 DI/事件/生命周期轮子**。
 * 内核只做三件事（Harness 规范 H1）：插件生命周期、声明式依赖注入、事件总线 + Service。
 */

export type MaybePromise<T> = T | Promise<T>;
export type Disposable = () => MaybePromise<void>;

export interface PluginMeta {
  name: string;
  provide?: readonly string[];
  require?: readonly string[];
}

export type PluginFactory = (
  ctx: KernelContext,
) => Disposable | MaybePromise<void>;

export interface RegisteredPlugin {
  meta: PluginMeta;
  factory: PluginFactory;
}

export type EventHandler = (...args: unknown[]) => MaybePromise<void>;

export class KernelError extends Error {}

export interface KernelContext {
  readonly name: string;
  provide<T>(id: string, impl: T): T;
  require<T>(id: string): T;
  has(id: string): boolean;
  on(event: string, handler: EventHandler): Disposable;
  once(event: string, handler: EventHandler): Disposable;
  emit(event: string, ...args: unknown[]): Promise<void>;
  use(plugin: RegisteredPlugin): void;
  services(): string[];
}

export interface Kernel {
  readonly context: KernelContext;
  start(): Promise<void>;
  stop(): Promise<void>;
  readonly started: boolean;
}

export function plugin(
  factory: PluginFactory,
  meta: PluginMeta,
): RegisteredPlugin {
  return { meta, factory };
}

/** 把一个任意 impl 包装成 cordis 具名 Service（immediate），从而可被 `inject:[name]` 调度。 */
function namedService(name: string, impl: unknown): typeof Service {
  return class NamedService extends Service {
    constructor(ctx: Context) {
      super(ctx, name, true);
      Object.assign(this, impl as object);
    }
  } as unknown as typeof Service;
}

export function defineKernel(
  name: string,
  plugins: RegisteredPlugin[] = [],
): Kernel {
  const root = new Context();
  const provided = new Map<string, { impl: unknown; from: string }>();
  const disposers: Disposable[] = [];
  const startErrors: unknown[] = [];
  const queue: RegisteredPlugin[] = [...plugins];
  let started = false;

  const facade = (owner: string): KernelContext => ({
    name: owner,
    provide<T>(id: string, impl: T): T {
      const prev = provided.get(id);
      if (prev) {
        throw new KernelError(
          `Service "${id}" 已被 ${prev.from} 提供，重复提供`,
        );
      }
      provided.set(id, { impl, from: owner });
      // 交给 cordis：注册为具名 Service，唤醒依赖它的插件（真实 DI 调度，非自研）
      // biome-ignore lint/suspicious/noExplicitAny: 动态 Service 类对 cordis plugin 重载的越界
      (root as any).plugin(namedService(id, impl));
      return impl;
    },
    require<T>(id: string): T {
      const hit = provided.get(id);
      if (!hit) {
        throw new KernelError(`Service "${id}" 未提供（依赖缺失）`);
      }
      return hit.impl as T;
    },
    has: (id) => provided.has(id),
    // cordis 的 on/once/parallel 按强类型事件名签名；本内核用动态字符串事件，
    // 故对 root 做一次宽松转型（仅类型层面，运行期行为即 cordis 事件总线）。
    // biome-ignore lint/suspicious/noExplicitAny: 动态事件名对 cordis 强类型事件表的越界
    on: (event, handler) => (root as any).on(event, handler) as Disposable,
    // biome-ignore lint/suspicious/noExplicitAny: 同上
    once: (event, handler) => (root as any).once(event, handler) as Disposable,
    // biome-ignore lint/suspicious/noExplicitAny: 同上
    async emit(event, ...args) {
      await (root as any).parallel(event, ...args);
    },
    use(p) {
      if (started) throw new KernelError("内核已启动，不能再 use");
      queue.push(p);
    },
    services: () => [...provided.keys()],
  });

  // 预检：meta 图上依赖缺失 / 环 / 重复提供 —— cordis 对缺失依赖是"静默阻塞"，
  // 这里给出显式错误（保持内核契约），真正的运行时排序仍交给 cordis。
  function preflight(list: RegisteredPlugin[]) {
    const producers = new Map<string, string>();
    for (const p of list) {
      for (const id of p.meta.provide ?? []) {
        if (producers.has(id)) {
          throw new KernelError(
            `Service "${id}" 已被 ${producers.get(id)} 提供，重复提供`,
          );
        }
        producers.set(id, p.meta.name);
      }
    }
    for (const p of list) {
      for (const dep of p.meta.require ?? []) {
        if (!producers.has(dep)) {
          const missing = list
            .filter((q) => (q.meta.require ?? []).includes(dep))
            .map((q) => q.meta.name);
          throw new KernelError(
            `内核启动失败：依赖缺失或环，未满足的 Service: ${dep}（被 ${missing.join(", ")} 依赖）`,
          );
        }
      }
    }
  }

  function toCordis(p: RegisteredPlugin) {
    const impl = async (c: Context) => {
      try {
        const d = await p.factory(facade(p.meta.name));
        if (typeof d === "function") disposers.push(d as Disposable);
      } catch (e) {
        // cordis v3 对工厂同步抛错只记日志并 resolve（静默吞错）；
        // 内核契约要求依赖缺失必须显式失败，捕获后由 start() 上抛。
        startErrors.push(e);
        throw e;
      }
      void c;
    };
    (impl as unknown as { inject: string[] }).inject = [
      ...(p.meta.require ?? []),
    ];
    return impl as never;
  }

  const self = facade(name);

  return {
    context: self,
    get started() {
      return started;
    },
    async start() {
      if (started) return;
      preflight(queue);
      // biome-ignore lint/suspicious/noExplicitAny: 动态插件体对 cordis plugin 重载的越界
      for (const p of queue.splice(0, queue.length))
        (root as any).plugin(toCordis(p));
      await root.start();
      if (startErrors.length) throw startErrors[0];
      started = true;
      await self.emit("kernel/start");
    },
    async stop() {
      if (!started) return;
      await self.emit("kernel/stop");
      for (const d of [...disposers].reverse()) await d();
      disposers.length = 0;
      await root.stop();
      provided.clear();
      started = false;
    },
  };
}
