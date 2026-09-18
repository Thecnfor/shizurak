import Link from "next/link";
import { getDictionary } from "@/app/[lang]/dictionaries";

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
          className="font-mono text-sm tracking-widest text-ink"
        >
          SHIZURAK
        </Link>
        <div className="flex items-center gap-6">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-ink-muted hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
          <div id="theme-switcher-slot" />
        </div>
      </nav>
    </header>
  );
}
