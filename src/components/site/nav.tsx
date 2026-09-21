import Link from "next/link";
import type { CSSProperties } from "react";
import { getDictionary } from "@/app/[lang]/dictionaries";
import { ThemeSwitcher } from "@/components/site/theme-switcher";

/* 底噪 tremor 错相（spec §2.1：随机相位禁同步）：服务端组件不能读 store，
   延迟用静态内联样式；hum 关闭靠 <html>.hum-off 联动停颤（见 cursor-ring.tsx） */
const TREMOR_DELAYS = ["0s", "0.6s", "1.2s", "1.8s"];

export async function SiteNav({ lang }: { lang: string }) {
  const dict = await getDictionary();
  const links = [
    { href: `/${lang}/posts`, label: dict.nav.posts },
    { href: `/${lang}/projects`, label: dict.nav.projects },
    { href: `/${lang}/about`, label: dict.nav.about },
    { href: `/${lang}/lab`, label: dict.nav.lab },
    { href: `/${lang}/search`, label: dict.nav.search },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-[var(--container-max)] items-center justify-between px-6">
        <Link
          href={`/${lang}`}
          transitionTypes={["nav-back"]}
          className="font-mono text-sm tracking-widest text-ink"
        >
          SHIZURAK
        </Link>
        <div className="flex items-center gap-6">
          {links.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              transitionTypes={["nav-forward"]}
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
