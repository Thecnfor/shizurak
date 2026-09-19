"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";
import { z } from "zod";
import { whenClientKernelReady } from "@/lib/kernel";
import type { PageContextService } from "@/lib/kernel/plugins/page-context";
import type { ActionsService } from "@/lib/kernel/plugins/ui-actions";
import { KernelProvider } from "@/lib/kernel/react";
import { withThemeViewTransition } from "@/lib/motion/vt";
import { useThemeStore } from "@/stores/theme-store";

/**
 * 前端内核挂载壳（无额外 DOM）：启动内核、注册基线 ui-actions、按路由维护 page-context 栈。
 * 真正的访客 agent 接线在 M2（/api/chat 复用同一 ai.agent / actions 契约）。
 */
export function ClientKernelShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const lastId = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    whenClientKernelReady().then((k) => {
      if (!alive) return;
      const actions = k.context.require<ActionsService>("actions");
      if (!actions.get("theme.cycle")) {
        actions.register({
          id: "theme.cycle",
          level: "L1",
          reversible: true,
          schema: z.object({}),
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
          schema: z.object({ href: z.string() }),
          execute: ({ href }) => router.push(href),
        });
      }
      const pc = k.context.require<PageContextService>("pageContext");
      const id = `path:${pathname}`;
      pc.push({ id, type: "page", data: { pathname } });
      if (lastId.current && lastId.current !== id) pc.pop(lastId.current);
      lastId.current = id;
    });
    return () => {
      alive = false;
    };
  }, [pathname, router]);

  return <KernelProvider>{children}</KernelProvider>;
}
