import { describe, expect, it } from "vitest";
import { checkAllThemes } from "@/lib/themes/contrast-gate";
import { themeList } from "@/themes/registry";

describe("WCAG 对比度门禁", () => {
  const result = checkAllThemes(themeList);

  it("所有主题×模式的颜色对比度均满足 WCAG 阈值", () => {
    if (!result.pass) {
      const details = result.violations
        .map(
          (v) =>
            `${v.themeId}:${v.mode} ${v.label} ratio=${v.ratio.toFixed(2)} (需要 ≥${v.min})`,
        )
        .join("\n  ");
      expect.fail(`对比度未达标:\n  ${details}`);
    }
    expect(result.pass).toBe(true);
  });

  it.each(
    themeList.flatMap((theme) =>
      theme.meta.modes.map((mode) => ({ themeId: theme.meta.id, mode })),
    ),
  )("$themeId:$mode 令牌存在且通过检查", ({ themeId, mode }) => {
    const themeChecks = result.checks.filter(
      (c) => c.themeId === themeId && c.mode === mode,
    );
    // 至少应产出 4 项检查（ink, inkSecondary, inkMuted, accentInk）
    expect(themeChecks.length).toBeGreaterThanOrEqual(4);
    for (const c of themeChecks) {
      expect(
        c.ok,
        `${c.themeId}:${c.mode} ${c.label} = ${c.ratio.toFixed(2)} (≥${c.min})`,
      ).toBe(true);
    }
  });
});
