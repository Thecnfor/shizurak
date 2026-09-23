"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Validator } from "@/kernel/contracts/action";
import type { Kernel } from "@/kernel/core";
import {
  bootedClientKernel,
  ensureClientKernel,
  wireOnClientKernel,
} from "@/lib/kernel/client-boot";
import type { PageContextService } from "@/lib/kernel/plugins/page-context";
import type { ActionsService } from "@/lib/kernel/plugins/ui-actions";
import { KernelProvider } from "@/lib/kernel/react";
import { withThemeViewTransition } from "@/lib/motion/vt";
import { useThemeStore } from "@/stores/theme-store";
import { useUIShellStore } from "@/stores/ui-shell-store";

/**
 * 手写基线校验器（T10 补记 size 削减）：契约已 zod 化为结构 Validator，
 * 客户端注册这两个 L1 动作不再拖 zod 进首载；服务端照旧可传 zod schema。
 */
const noInput: Validator<Record<string, never>> = {
  safeParse: (v) =>
    typeof v === "object" && v !== null
      ? { success: true, data: {} }
      : {
          success: false,
          error: { issues: [{ path: [], message: "期望对象" }] },
        },
};
const hrefInput: Validator<{ href: string }> = {
  safeParse: (v) => {
    const href =
      typeof v === "object" && v !== null
        ? (v as { href?: unknown }).href
        : undefined;
    return typeof href === "string"
      ? { success: true, data: { href } }
      : {
          success: false,
          error: { issues: [{ path: ["href"], message: "期望字符串" }] },
        };
  },
};

/**
 * 前端内核挂载壳（无额外 DOM）：启动内核、注册基线 ui-actions、按路由维护 page-context 栈。
 * 内核改为懒载（client-boot）：首 ⌘K 开 / 首 dock 开 / GenUI 渲染器挂载才拉
 * cordis+zod 图；未激活时路由变化不拉内核，启动后由本壳补接线与补推。
 * 真正的访客 agent 接线在 M2（/api/chat 复用同一 ai.agent / actions 契约）。
 */
export function ClientKernelShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [kernel, setKernel] = useState<Kernel | null>(null);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const routerRef = useRef(router);
  routerRef.current = router;
  const lastId = useRef<string | null>(null);

  const syncPage = useCallback((k: Kernel, path: string) => {
    const pc = k.context.require<PageContextService>("pageContext");
    const id = `path:${path}`;
    pc.push({ id, type: "page", data: { pathname: path } });
    if (lastId.current && lastId.current !== id) pc.pop(lastId.current);
    lastId.current = id;
  }, []);

  // 启动就绪后的接线（幂等：动作注册有 get 守卫）
  useEffect(
    () =>
      wireOnClientKernel((k) => {
        const actions = k.context.require<ActionsService>("actions");
        if (!actions.get("theme.cycle")) {
          actions.register({
            id: "theme.cycle",
            level: "L1",
            reversible: true,
            schema: noInput,
            execute: () =>
              withThemeViewTransition(() => {
                const s = useThemeStore.getState();
                s.setTheme(s.themeId === "void" ? "lumen" : "void");
              }),
          });
        }
        if (!actions.get("nav.to")) {
          actions.register({
            id: "nav.to",
            level: "L1",
            reversible: true,
            schema: hrefInput,
            // 只放行应用内路径（防协议相对/伪协议目标被推入路由）
            execute: ({ href }) => {
              if (href.startsWith("/") && !href.startsWith("//")) {
                routerRef.current.push(href);
              }
            },
          });
        }
        syncPage(k, pathRef.current);
        setKernel(k); // GenUI 消费方（registry）随 Context 注入从禁用转可用
      }),
    [syncPage], // 挂载一次：syncPage 只读 ref，setKernel 稳定
  );

  // 懒载触发：⌘K 面板首开 / agent dock 首开（chat attempt 必然在 dock 之后）
  useEffect(() => {
    return useUIShellStore.subscribe((s, prev) => {
      const wants = s.commandOpen || s.agentDock.open;
      const had = prev.commandOpen || prev.agentDock.open;
      if (wants && !had) void ensureClientKernel().catch(() => {});
    });
  }, []);

  // 路由变化：仅在内核已激活时维护 page-context 栈（未激活不为路由拉内核 chunk）
  useEffect(() => {
    const p = bootedClientKernel();
    if (!p) return;
    void p.then(
      (k) => syncPage(k, pathname),
      () => {},
    );
  }, [pathname, syncPage]);

  return <KernelProvider kernel={kernel}>{children}</KernelProvider>;
}
