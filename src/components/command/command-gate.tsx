"use client";

import { type ComponentType, useEffect, useState } from "react";
import { useUIShellStore } from "@/stores/ui-shell-store";
import type { CommandMenuProps } from "./command-menu";

/**
 * ⌘K 门控（T10 补记 size 红线削减）：键盘监听与就绪探针留在首载小 chunk，
 * cmdk 本体（连 radix dialog）拆成独立 chunk——空闲预取 + 首按兜底拉取，
 * 落地后常驻挂载（cmdk 过滤态跨开合保留，与旧实现一致）。
 * data-command-ready 语义不变：与 keydown 监听注册同帧翻转，E2E 以此为准。
 */
export function CommandGate(props: CommandMenuProps) {
  const [Menu, setMenu] = useState<ComponentType<CommandMenuProps> | null>(
    null,
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      import("./command-menu").then(
        (m) => {
          if (!cancelled) setMenu(() => m.CommandMenu);
        },
        () => {
          // chunk 拉取失败：不缓存，下次按键再试（见 onKey 的兜底 load）
        },
      );
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        load(); // 预取还没到的首按：同帧兜底拉取，open 翻转在挂载后即见
        const s = useUIShellStore.getState();
        s.setCommandOpen(!s.commandOpen);
      }
    };
    document.addEventListener("keydown", onKey);
    setReady(true);
    // 空闲预取：首次 ⌘K 时 chunk 已在缓存里，T3 拉焦演出不被下载打断
    const canIdle = typeof window.requestIdleCallback === "function";
    const idle = canIdle
      ? window.requestIdleCallback(load, { timeout: 2000 })
      : window.setTimeout(load, 1500);
    return () => {
      cancelled = true;
      document.removeEventListener("keydown", onKey);
      if (canIdle) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);

  return (
    <>
      {ready ? <span data-command-ready hidden /> : null}
      {Menu ? <Menu {...props} /> : null}
    </>
  );
}
