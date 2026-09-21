"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { focusPull } from "@/lib/motion/focus";
import { withThemeViewTransition } from "@/lib/motion/vt";
import { useThemeStore } from "@/stores/theme-store";
import { useUIShellStore } from "@/stores/ui-shell-store";
import { themeList } from "@/themes/registry";

/**
 * T3 拉焦载体 = cmdk 的遮罩层（视口级、堆叠在面板之下）。
 * 先试从 Dialog 内容节点回溯（[cmdk-dialog] 的前一个兄弟就是 [cmdk-overlay]），
 * 未挂载时退回 cmdk 的属性契约全局查。两者都是 cmdk 自己写上的稳定属性。
 */
function focusPullHost(root: HTMLElement | null): HTMLElement | null {
  const sibling = root?.closest("[cmdk-dialog]")?.previousElementSibling;
  if (sibling instanceof HTMLElement) return sibling;
  return document.querySelector<HTMLElement>("[cmdk-overlay]");
}

export function CommandMenu({
  lang,
  labels,
}: {
  lang: string;
  labels: {
    placeholder: string;
    nav: string;
    theme: string;
    empty: string;
    posts: string;
    projects: string;
    about: string;
    lab: string;
  };
}) {
  const open = useUIShellStore((s) => s.commandOpen);
  const setOpen = useUIShellStore((s) => s.setCommandOpen);
  const setTheme = useThemeStore((s) => s.setTheme);
  const motion = useThemeStore((s) => s.resolved.motion);
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // T3 镜头拉焦（spec §4：⌘K 是全站最贵的交互瞬间）：打开即失焦→扫描→锁焦。
  // 载体取 cmdk 遮罩层而非面板本体：遮罩是视口级且 DOM 序在面板之前，
  // 所以 blur 能糊到整屏、扫描线压在内容之上面板之下，面板自己保持锐利。
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let stop = () => {};
    let raf = 0;
    let frames = 0;
    const pull = () => {
      if (cancelled) return;
      const scrim = focusPullHost(contentRef.current);
      if (scrim) {
        stop = focusPull(scrim, motion);
        return;
      }
      // 帧数上限纯粹是防空转的保险（遮罩因任何原因没出现就放弃演出），不是计时源
      if (++frames < 30) raf = requestAnimationFrame(pull);
    };
    pull();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stop();
    };
  }, [open, motion]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!useUIShellStore.getState().commandOpen);
      }
    };
    document.addEventListener("keydown", onKey);
    // 就绪探针：独立 chunk 的 hydrate 顺序不可预测（存在键盘监听注册前的按键窗口），
    // 此标记与监听器注册同帧翻转——E2E 以此为准，不依赖全局 hydration 时机
    setReady(true);
    return () => document.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const itemClass =
    "cursor-pointer rounded-sm px-3 py-2 text-sm text-ink data-[selected=true]:bg-surface-hover";
  const groupClass =
    "px-1 py-1 text-xs uppercase tracking-widest text-ink-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1";

  return (
    <>
      {ready ? <span data-command-ready hidden /> : null}
      <Command.Dialog
        ref={contentRef}
        open={open}
        onOpenChange={setOpen}
        label={labels.placeholder}
        overlayClassName="fixed inset-0 z-50 bg-black/40"
        contentClassName="fixed left-1/2 top-[20vh] z-50 w-[min(92vw,34rem)] -translate-x-1/2 rounded-md border border-border bg-bg-elevated shadow-[var(--shadow-md)]"
      >
        <Command.Input
          placeholder={labels.placeholder}
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-muted"
        />
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-ink-muted">
            {labels.empty}
          </Command.Empty>
          <Command.Group heading={labels.nav} className={groupClass}>
            <Command.Item
              onSelect={() => go(`/${lang}/posts`)}
              className={itemClass}
            >
              {labels.posts}
            </Command.Item>
            <Command.Item
              onSelect={() => go(`/${lang}/projects`)}
              className={itemClass}
            >
              {labels.projects}
            </Command.Item>
            <Command.Item
              onSelect={() => go(`/${lang}/about`)}
              className={itemClass}
            >
              {labels.about}
            </Command.Item>
            <Command.Item
              onSelect={() => go(`/${lang}/lab`)}
              className={itemClass}
            >
              {labels.lab}
            </Command.Item>
          </Command.Group>
          <Command.Group heading={labels.theme} className={groupClass}>
            {themeList.map((t) => (
              <Command.Item
                key={t.meta.id}
                value={`theme ${t.meta.name} ${t.meta.nameEn}`}
                onSelect={() => {
                  withThemeViewTransition(() => setTheme(t.meta.id));
                  setOpen(false);
                }}
                className={itemClass}
              >
                {t.meta.name} · {t.meta.nameEn}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command.Dialog>
    </>
  );
}
