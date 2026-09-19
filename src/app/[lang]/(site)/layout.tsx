import { Suspense } from "react";
import { CommandMenu } from "@/components/command/command-menu";
import { FxLayer } from "@/components/fx/fx-layer";
import { ClientKernelShell } from "@/components/providers/client-kernel-shell";
import { AgentDock } from "@/components/site/agent-dock";
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
    <Suspense fallback={null}>
      <ClientKernelShell>
        <div className="flex min-h-dvh flex-col">
          <FxLayer />
          <SiteNav lang={lang} />
          <div className="flex-1">{children}</div>
          <SiteFooter />
          <AgentDock
            labels={{
              open: dict.agentDock.open,
              title: dict.agentDock.title,
              placeholder: dict.agentDock.placeholder,
              dock: dict.agentDock.dock,
            }}
          />
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
      </ClientKernelShell>
    </Suspense>
  );
}
