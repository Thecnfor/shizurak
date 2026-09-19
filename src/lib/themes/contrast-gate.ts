import { contrastRatio } from "./contrast";

/** WCAG 最低对比度阈值（与 scripts/theme-check.ts 保持单一来源） */
export const WCAG_MIN = {
  ink: 7,
  inkSecondary: 4.5,
  inkMuted: 4.5,
  accentInk: 4.5,
} as const;

export interface ContrastViolation {
  themeId: string;
  mode: string;
  label: string;
  ratio: number;
  min: number;
}

export interface ContrastResult {
  pass: boolean;
  violations: ContrastViolation[];
  checks: Array<{
    themeId: string;
    mode: string;
    label: string;
    ratio: number;
    min: number;
    ok: boolean;
  }>;
}

/**
 * 对给定主题列表执行全主题×模式 WCAG 对比度门禁。
 * 供 scripts/theme-check.ts（CLI）和 src/themes/contrast-gate.test.ts（vitest）共用。
 */
export function checkAllThemes(
  themes: Array<{
    meta: { id: string; modes: string[] };
    tokens: Record<string, { color: Record<string, string> } | undefined>;
  }>,
): ContrastResult {
  const violations: ContrastViolation[] = [];
  const checks: ContrastResult["checks"] = [];

  for (const theme of themes) {
    for (const mode of theme.meta.modes) {
      const t = theme.tokens[mode];
      if (!t) {
        violations.push({
          themeId: theme.meta.id,
          mode,
          label: "tokens",
          ratio: 0,
          min: 0,
        });
        continue;
      }

      const pairs: Array<[string, string, string, string]> = [
        ["ink", t.color.ink, t.color.bg, "ink/bg"],
        ["inkSecondary", t.color.inkSecondary, t.color.bg, "inkSecondary/bg"],
        ["inkMuted", t.color.inkMuted, t.color.bg, "inkMuted/bg"],
        ["accentInk", t.color.accentInk, t.color.accent, "accentInk/accent"],
      ];

      for (const [key, fg, bg, label] of pairs) {
        const ratio = contrastRatio(fg, bg);
        const min = WCAG_MIN[key as keyof typeof WCAG_MIN];
        const ok = ratio >= min;
        checks.push({
          themeId: theme.meta.id,
          mode,
          label,
          ratio,
          min,
          ok,
        });
        if (!ok) {
          violations.push({ themeId: theme.meta.id, mode, label, ratio, min });
        }
      }
    }
  }

  return { pass: violations.length === 0, violations, checks };
}
