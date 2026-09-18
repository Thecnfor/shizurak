import { CommandMenu } from "@/components/command/command-menu";
import { FxLayer } from "@/components/fx/fx-layer";
import { SiteFooter } from "@/components/site/footer";
import { SiteNav } from "@/components/site/nav";
import { getDictionary } from "../dictionaries";

export default async function SiteLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  const dict = await getDictionary();
  return (
    <div className="flex min-h-dvh flex-col">
      <FxLayer />
      <SiteNav lang={lang} />
      <div className="flex-1">{children}</div>
      <SiteFooter />
      <CommandMenu
        lang={lang}
        labels={{
          placeholder: dict.command.placeholder,
          nav: dict.command.nav,
          theme: dict.command.theme,
          empty: dict.command.empty,
          posts: dict.nav.posts,
          projects: dict.nav.projects,
          about: dict.nav.about,
          lab: dict.nav.lab,
        }}
      />
    </div>
  );
}
