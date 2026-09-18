"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useThemeStore } from "@/stores/theme-store";
import { useUIShellStore } from "@/stores/ui-shell-store";
import { themeList } from "@/themes/registry";

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
  const router = useRouter();

  const [ready, setReady] = useState(false);

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
        open={open}
        onOpenChange={setOpen}
        label={labels.placeholder}
        overlayClassName="fixed inset-0 z-50 bg-black/40"
        contentClassName="mx-auto mt-[20vh] w-[min(92vw,34rem)] rounded-md border border-border bg-bg-elevated shadow-[var(--shadow-md)]"
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
                  setTheme(t.meta.id);
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
