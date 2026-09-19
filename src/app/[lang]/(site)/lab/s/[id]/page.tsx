import { notFound } from "next/navigation";
import { GenuiRenderer } from "@/components/genui/genui-renderer";
import { OpenUIRenderer } from "@/components/genui/open-ui-renderer";
import { getCachedSpec } from "@/lib/db/queries/lab";
import { isSpec } from "@/lib/genui/parse-spec";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return { title: `GenUI · ${id.slice(0, 8)}` };
}

export default async function LabSharePage({
  params,
}: PageProps<"/[lang]/lab/s/[id]">) {
  const { id } = await params;
  const row = await getCachedSpec(id);
  if (!row) notFound();
  return (
    <main className="mx-auto max-w-[var(--container-max)] px-6 py-24">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
        分享的动态界面 · {row.kind} · 主题 {row.themeId}
      </p>
      <div className="mt-6">
        {row.kind === "json-render" && isSpec(row.spec) ? (
          <GenuiRenderer spec={row.spec} />
        ) : row.kind === "openui" &&
          typeof (row.spec as { lang?: unknown })?.lang === "string" ? (
          <OpenUIRenderer lang={(row.spec as { lang: string }).lang} />
        ) : (
          <pre className="overflow-auto rounded-md border border-border bg-surface p-4 text-xs text-ink-muted">
            {JSON.stringify(row.spec, null, 2)}
          </pre>
        )}
      </div>
    </main>
  );
}
