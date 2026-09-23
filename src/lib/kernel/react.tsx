"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { Kernel } from "@/kernel/core";

const KernelCtx = createContext<Kernel | null>(null);

/**
 * 前端内核唯一 React 接入点：接收已启动的内核实例并注入子树。
 * 启动时序移交 client-boot.ensureClientKernel（由 ClientKernelShell 接线）：
 * 本文件不再静态引用 "./index"，否则 cordis+zod 图会回到首载关键包。
 */
export function KernelProvider({
  children,
  kernel = null,
}: {
  children: ReactNode;
  kernel?: Kernel | null;
}) {
  return <KernelCtx.Provider value={kernel}>{children}</KernelCtx.Provider>;
}

export function useKernel(): Kernel | null {
  return useContext(KernelCtx);
}

/** 取内核 Service（内核未就绪时返回 undefined，组件需容错）。 */
export function useKernelService<T>(id: string): T | undefined {
  const k = useKernel();
  if (!k || !k.context.has(id)) return undefined;
  return k.context.require<T>(id);
}
