import type { CSSProperties } from "react";
import { getDictionary } from "@/app/[lang]/dictionaries";

export async function SiteFooter() {
  const dict = await getDictionary();
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex h-12 max-w-[var(--container-max)] items-center justify-between px-6 font-mono text-xs text-ink-muted">
        <span>{dict.footer.rights}</span>
        {/* 底噪 tremor：与 nav 错相（1.7s），hum 关闭靠 <html>.hum-off 停颤 */}
        <span
          className="hum-tremor tracking-widest"
          style={{ "--tremor-delay": "1.7s" } as CSSProperties}
        >
          SYS · NOMINAL
        </span>
      </div>
    </footer>
  );
}
