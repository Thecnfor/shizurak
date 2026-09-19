import Link from "next/link";
import { getDictionary } from "@/app/[lang]/dictionaries";
import { ThemeSwitcher } from "@/components/site/theme-switcher";

export async function SiteNav({ lang }: { lang: string }) {
  const dict = await getDictionary();
  const links = [
    { href: `/${lang}/posts`, label: dict.nav.posts },
    { href: `/${lang}/projects`, label: dict.nav.projects },
    { href: `/${lang}/about`, label: dict.nav.about },
    { href: `/${lang}/lab`, label: dict.nav.lab },
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
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              transitionTypes={["nav-forward"]}
              className="text-sm text-ink-muted hover:text-ink"
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
              accentHue: dict.theme.accentHue,
              intensity: dict.theme.intensity,
              motionSpeed: dict.theme.motionSpeed,
            }}
          />
        </div>
      </nav>
    </header>
  );
}
