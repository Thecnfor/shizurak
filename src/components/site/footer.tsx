import { getDictionary } from "@/app/[lang]/dictionaries";

export async function SiteFooter() {
  const dict = await getDictionary();
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex h-12 max-w-[var(--container-max)] items-center justify-between px-6 font-mono text-xs text-ink-muted">
        <span>{dict.footer.rights}</span>
        <span className="tracking-widest">SYS · NOMINAL</span>
      </div>
    </footer>
  );
}
