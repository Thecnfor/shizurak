"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
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

export type CommandMenuProps = {
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
};

/**
 * ⌘K 面板本体（cmdk + radix 重依赖）：由 command-gate 懒挂载——键盘监听与
 * 就绪探针在门控里，本组件只在 chunk 落地后负责渲染与 T3 拉焦。
 * 可见性由门控保证：首按时若模块未到位，open 翻转后挂载即见（非丢失）。
 */
export function CommandMenu({ lang, labels }: CommandMenuProps) {
  const open = useUIShellStore((s) => s.commandOpen);
  const setOpen = useUIShellStore((s) => s.setCommandOpen);
  const setTheme = useThemeStore((s) => s.setTheme);
  const motion = useThemeStore((s) => s.resolved.motion);
  const router = useRouter();

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

  /**
   * 不在此处再包一层 document.startViewTransition：Next 的 router.push 已把这次
   * 导航提交包进 React 的路由 VT（实测 ⌘K 跳转记到 1 次 startViewTransition({update,types})），
   * 重复包裹只会嵌套两条过渡。T1 撕幕由 RiftDirector 在 startViewTransition 挂点上统一导演。
   */
  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const itemClass =
    "cursor-pointer rounded-sm px-3 py-2 text-sm text-ink data-[selected=true]:bg-surface-hover";
  const groupClass =
    "px-1 py-1 text-xs uppercase tracking-widest text-ink-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1";

  return (
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
  );
}
