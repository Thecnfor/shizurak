import Link from "next/link";
import type { CSSProperties } from "react";
import { getDictionary } from "@/app/[lang]/dictionaries";
import { ThemeSwitcher } from "@/components/site/theme-switcher";

/* 底噪 tremor 错相（spec §2.1：随机相位禁同步）：服务端组件不能读 store，
   延迟用静态内联样式；hum 关闭靠 <html>.hum-off 联动停颤（见 cursor-ring.tsx） */
const TREMOR_DELAYS = ["0s", "0.6s", "1.2s", "1.8s"];

/** transitionTypes 直递 Next Link → React addTransitionType →
 *  startViewTransition({ update, types })，由 RiftDirector 按点名派发幕语法
 *  （spec §2.2：任意页→Lab 是 T2 信号崩解的合法触发点之一） */
type NavLink = { href: string; label: string; transitionTypes?: string[] };

export async function SiteNav({ lang }: { lang: string }) {
  const dict = await getDictionary();
  const links: NavLink[] = [
    { href: `/${lang}/posts`, label: dict.nav.posts },
    { href: `/${lang}/projects`, label: dict.nav.projects },
    { href: `/${lang}/about`, label: dict.nav.about },
    {
      href: `/${lang}/lab`,
      label: dict.nav.lab,
      transitionTypes: ["rift-collapse"],
    },
    { href: `/${lang}/search`, label: dict.nav.search },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-[var(--container-max)] items-center justify-between px-6">
        <Link
          href={`/${lang}`}
          className="font-mono text-sm tracking-widest text-ink"
        >
          SHIZURAK
        </Link>
        <div className="flex items-center gap-6">
          {links.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              transitionTypes={l.transitionTypes}
              className="hum-tremor text-sm text-ink-muted hover:text-ink"
              style={
                {
                  "--tremor-delay": TREMOR_DELAYS[i % TREMOR_DELAYS.length],
                } as CSSProperties
              }
            >
              {l.label}
            </Link>
          ))}
          <ThemeSwitcher
            labels={{
              switcher: dict.nav.theme,
              mode: dict.theme.mode,
              light: dict.theme.light,
              dark: dict.theme.dark,
              system: dict.theme.system,
              customize: dict.theme.customize,
              hum: dict.theme.hum,
              rift: dict.theme.rift,
              motionSpeed: dict.theme.motionSpeed,
            }}
          />
        </div>
      </nav>
    </header>
  );
}
