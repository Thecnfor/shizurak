import { FxLayer } from "@/components/fx/fx-layer";
import { SiteFooter } from "@/components/site/footer";
import { SiteNav } from "@/components/site/nav";

export default async function SiteLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  return (
    <div className="flex min-h-dvh flex-col">
      <FxLayer />
      <SiteNav lang={lang} />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
