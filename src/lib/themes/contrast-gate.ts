import { contrastRatio } from "./contrast";

/** WCAG 最低对比度阈值（与 scripts/theme-check.ts 保持单一来源） */
export const WCAG_MIN = {
  ink: 7,
  inkSecondary: 4.5,
  inkMuted: 4.5,
  accentInk: 4.5,
  // 幕语法（spec §7 对比度行）：针脚 accent 与幕布黑 ≥4.5:1 达标才许用
  accentOnBg: 4.5,
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
        ["accentOnBg", t.color.accent, t.color.bg, "accent/bg"],
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

/**
 * 契约 v2 数值域门禁（Task 10 Step 1）：对比度管不了的结构字段。
 * - hum.breath / hum.tremor / rift.intensity ∈ [0,1]（shader 与 CSS 都按此区间直接消费）
 * - streamReveal 合理性：stagger 为有限非负数；effect ∈ {fade, tear}；
 *   stitch 人格的显现节奏必须是 tear（T9 定案：缝补皮肤只说「撕」，不说「淡入」）
 */
export interface SanityViolation {
  themeId: string;
  label: string;
  detail: string;
}

export function checkEffectSanity(
  themes: Array<{
    meta: { id: string };
    effects: {
      hum: { breath: number; tremor: number };
      rift: { intensity: number };
    };
    genui: {
      catalogVariant: string;
      streamReveal: { stagger: number; effect: string };
    };
  }>,
): SanityViolation[] {
  const violations: SanityViolation[] = [];
  const inRange = (v: number) => Number.isFinite(v) && v >= 0 && v <= 1;
  for (const theme of themes) {
    const id = theme.meta.id;
    const { hum, rift } = theme.effects;
    if (!inRange(hum.breath))
      violations.push({
        themeId: id,
        label: "hum.breath",
        detail: `${hum.breath} 越出 [0,1]`,
      });
    if (!inRange(hum.tremor))
      violations.push({
        themeId: id,
        label: "hum.tremor",
        detail: `${hum.tremor} 越出 [0,1]`,
      });
    if (!inRange(rift.intensity))
      violations.push({
        themeId: id,
        label: "rift.intensity",
        detail: `${rift.intensity} 越出 [0,1]`,
      });
    const sr = theme.genui.streamReveal;
    if (!Number.isFinite(sr.stagger) || sr.stagger < 0)
      violations.push({
        themeId: id,
        label: "streamReveal.stagger",
        detail: `${sr.stagger} 应为有限非负数`,
      });
    if (sr.effect !== "fade" && sr.effect !== "tear")
      violations.push({
        themeId: id,
        label: "streamReveal.effect",
        detail: `未知显现节奏: ${sr.effect}`,
      });
    if (theme.genui.catalogVariant === "stitch" && sr.effect !== "tear")
      violations.push({
        themeId: id,
        label: "streamReveal.effect",
        detail: `stitch 人格必须 tear，实际 ${sr.effect}`,
      });
  }
  return violations;
}
