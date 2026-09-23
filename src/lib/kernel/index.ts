import {
  defineKernel,
  type Kernel,
  type KernelContext,
  plugin,
} from "@/kernel/core";
import { pageContextPlugin } from "./plugins/page-context";
import { themeBridgePlugin } from "./plugins/theme-bridge";
import { uiActionsPlugin } from "./plugins/ui-actions";

export { pageContextPlugin } from "./plugins/page-context";
export { themeBridgePlugin } from "./plugins/theme-bridge";
export { uiActionsPlugin } from "./plugins/ui-actions";

export const CLIENT_KERNEL_VERSION = 1;

/**
 * component-kit：GenUI 运行时入口，皮肤变体经 theme-bridge 解析（三引擎共用 catalog）。
 * catalogPrompt 要拖 zod+schema 序列化（重依赖，T10 补记 size 削减）：客户端无
 * 同步消费者，改按需动态引用，调用方 await 取串；服务端照旧用 catalog.ts 同步版。
 */
const componentKitPlugin = plugin(
  (ctx: KernelContext) => {
    const bridge = ctx.require<{ variant(): "stitch" | "clean" }>(
      "themeBridge",
    );
    ctx.provide("genui", {
      catalogPrompt: async (): Promise<string> =>
        (await import("@/components/genui/catalog")).catalogPrompt(),
      variant: () => bridge.variant(),
    });
  },
  { name: "component-kit", provide: ["genui"], require: ["themeBridge"] },
);

export function createClientKernel(): Kernel {
  return defineKernel("blog-client", [
    uiActionsPlugin,
    pageContextPlugin,
    themeBridgePlugin,
    componentKitPlugin,
  ]);
}

interface GlobalWithClientKernel {
  __SHIZURAK_CLIENT_KERNEL__?: Kernel;
  __SHIZURAK_CLIENT_KERNEL_VERSION__?: number;
  __SHIZURAK_CLIENT_KERNEL_READY__?: Promise<Kernel>;
}

/** 前端内核单例（globalThis + 版本守卫，HMR 安全）+ 就绪去重；失败不缓存，下次可重试。 */
export function getClientKernel(): Kernel {
  const g = globalThis as GlobalWithClientKernel;
  if (
    !g.__SHIZURAK_CLIENT_KERNEL__ ||
    g.__SHIZURAK_CLIENT_KERNEL_VERSION__ !== CLIENT_KERNEL_VERSION
  ) {
    g.__SHIZURAK_CLIENT_KERNEL__ = createClientKernel();
    g.__SHIZURAK_CLIENT_KERNEL_VERSION__ = CLIENT_KERNEL_VERSION;
    g.__SHIZURAK_CLIENT_KERNEL_READY__ = undefined; // 版本漂移后重置就绪态
  }
  return g.__SHIZURAK_CLIENT_KERNEL__;
}

export function whenClientKernelReady(): Promise<Kernel> {
  const g = globalThis as GlobalWithClientKernel;
  if (typeof window === "undefined") {
    return Promise.reject(new Error("client kernel is browser-only"));
  }
  if (!g.__SHIZURAK_CLIENT_KERNEL_READY__) {
    g.__SHIZURAK_CLIENT_KERNEL_READY__ = (async () => {
      const k = getClientKernel();
      if (!k.started) await k.start();
      return k;
    })().catch((err) => {
      // 不永久缓存失败：清空让下一次调用可重试
      g.__SHIZURAK_CLIENT_KERNEL_READY__ = undefined;
      throw err;
    });
  }
  return g.__SHIZURAK_CLIENT_KERNEL_READY__;
}
