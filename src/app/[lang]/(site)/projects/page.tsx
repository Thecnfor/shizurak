import { RouteTransition } from "@/components/fx/route-transition";
import { getDictionary } from "../../dictionaries";

export default async function ProjectsPage() {
  const dict = await getDictionary();
  return (
    <RouteTransition>
      {/* 排版修整（spec §4）：mono micro eyebrow + display 一句话导语，同首页密度 */}
      <main className="mx-auto max-w-[var(--container-max)] px-6 py-[18vh]">
        <p className="mono-micro text-accent">{dict.nav.projects}</p>
        <h1 className="mt-4 max-w-[18ch] text-[length:var(--text-display-size)] font-semibold leading-[var(--text-display-lh)] tracking-[var(--text-display-tracking)]">
          {dict.projects.headline}
        </h1>
        <p className="mt-6 max-w-[62ch] text-[length:var(--text-body-size)] leading-[var(--text-body-lh)] text-ink-secondary">
          {dict.home.heroKicker}
        </p>
      </main>
    </RouteTransition>
  );
}
