import type { CSSProperties } from "react";
import { getDictionary } from "@/app/[lang]/dictionaries";

/**
 * 单行页脚（spec §4 首页④）：mono micro 一行排完版权 / RSS / ⌘K 提示。
 * 原「SYS · NOMINAL」遥测贴纸随拒绝清单（§0.2：❌ 仪表贴纸）移除；
 * ⌘K 提示继承 mono 微颤底噪（错相 1.7s，hum-off / reduced 由 CSS 联动停颤）。
 */
export async function SiteFooter() {
  const dict = await getDictionary();
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex min-h-12 max-w-[var(--container-max)] items-center gap-8 px-6 py-4">
        <span className="mono-micro text-ink-faint">{dict.footer.rights}</span>
        <a
          href="/feed.xml"
          className="mono-micro text-ink-faint transition-colors hover:text-ink"
        >
          RSS
        </a>
        <span
          className="mono-micro hum-tremor ml-auto text-ink-faint"
          style={{ "--tremor-delay": "1.7s" } as CSSProperties}
        >
          {dict.footer.commandHint}
        </span>
      </div>
    </footer>
  );
}
