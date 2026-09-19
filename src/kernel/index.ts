import {
  defineKernel,
  type Kernel,
  type KernelContext,
  plugin,
} from "@/kernel/core";
import { createAgentService } from "@/kernel/genui/tool-loop";
import { genuiRouterPlugin } from "@/kernel/plugins/genui-router";
import { modelAdapterPlugin } from "@/kernel/plugins/model-adapter";
import { storesPlugin } from "@/kernel/plugins/stores";
import { toolRegistryPlugin } from "@/kernel/plugins/tool-registry";
import { registerDomainTools } from "@/kernel/tools/domain";

/** 插件集变更时 +1（dev HMR 守卫，复用 cross-dashboard 模式） */
export const KERNEL_VERSION = 1;

const agentPlugin = plugin(
  (ctx: KernelContext) => {
    ctx.provide("ai.agent", createAgentService(ctx));
  },
  {
    name: "agent",
    provide: ["ai.agent"],
    require: ["ai.models", "ai.tools", "ai.genui"],
  },
);

/** 工厂：返回未启动的内核（测试用；生产走 getKernel 单例） */
export function createBackendKernel(): Kernel {
  return defineKernel("blog-backend", [
    modelAdapterPlugin,
    toolRegistryPlugin,
    genuiRouterPlugin,
    storesPlugin,
    agentPlugin,
  ]);
}

interface GlobalWithKernel {
  __SHIZURAK_KERNEL__?: Kernel;
  __SHIZURAK_KERNEL_VERSION__?: number;
}

/** 后端内核唯一入口：globalThis 单例 + KERNEL_VERSION 守卫 + 领域工具注册。 */
export async function getKernel(): Promise<Kernel> {
  const g = globalThis as GlobalWithKernel;
  if (
    !g.__SHIZURAK_KERNEL__ ||
    g.__SHIZURAK_KERNEL_VERSION__ !== KERNEL_VERSION
  ) {
    await g.__SHIZURAK_KERNEL__?.stop().catch(() => {});
    const kernel = createBackendKernel();
    await kernel.start();
    registerDomainTools(kernel.context.require("ai.tools"));
    g.__SHIZURAK_KERNEL__ = kernel;
    g.__SHIZURAK_KERNEL_VERSION__ = KERNEL_VERSION;
  }
  return g.__SHIZURAK_KERNEL__;
}

export { CANNED_POSTS } from "@/kernel/tools/domain";
