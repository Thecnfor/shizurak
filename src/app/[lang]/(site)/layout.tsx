import { Suspense } from "react";
import { CommandMenu } from "@/components/command/command-menu";
import { HumGate } from "@/components/fx/cursor-ring";
import { FxLayer } from "@/components/fx/fx-layer";
import { RiftDirector } from "@/components/fx/rift-director";
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
          {/* T1 撕幕导演：包装 document.startViewTransition，全站只装这一次 */}
          <RiftDirector />
          {/* 底噪门控：tremor>0 且 !reduced 才挂幕环光标，off 时联动停住 tremor */}
          <HumGate />
          <SiteNav lang={lang} />
          <div className="flex-1">{children}</div>
          <SiteFooter />
          <AgentDock
            labels={{
              open: dict.agentDock.open,
              title: dict.agentDock.title,
              placeholder: dict.agentDock.placeholder,
              dock: dict.agentDock.dock,
              error: dict.agentDock.error,
              approve: dict.agentDock.approve,
              reject: dict.agentDock.reject,
              approvalTitle: dict.agentDock.approvalTitle,
              approvalDone: dict.agentDock.approvalDone,
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
