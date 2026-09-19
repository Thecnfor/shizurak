"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Kernel } from "@/kernel/core";
import { whenClientKernelReady } from "./index";

const KernelCtx = createContext<Kernel | null>(null);

/** 前端内核唯一 React 接入点：启动内核并把 Context 注入子树。 */
export function KernelProvider({ children }: { children: ReactNode }) {
  const [kernel, setKernel] = useState<Kernel | null>(null);
  useEffect(() => {
    let alive = true;
    whenClientKernelReady().then((k) => {
      if (alive) setKernel(k);
    });
    return () => {
      alive = false;
    };
  }, []);
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
