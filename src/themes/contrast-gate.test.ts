import { describe, expect, it } from "vitest";
import { checkAllThemes, checkEffectSanity } from "@/lib/themes/contrast-gate";
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
    // 至少应产出 5 项检查（ink, inkSecondary, inkMuted, accentInk, accentOnBg）
    expect(themeChecks.length).toBeGreaterThanOrEqual(5);
    for (const c of themeChecks) {
      expect(
        c.ok,
        `${c.themeId}:${c.mode} ${c.label} = ${c.ratio.toFixed(2)} (≥${c.min})`,
      ).toBe(true);
    }
  });
});

describe("契约 v2 数值域门禁（checkEffectSanity）", () => {
  it("全部注册主题通过 hum/rift 区间与 streamReveal 合理性", () => {
    expect(checkEffectSanity(themeList)).toEqual([]);
  });

  it("故意投毒：越界值/非法节奏被点名", () => {
    const bad = structuredClone(themeList[0]);
    bad.effects.rift.intensity = 1.4;
    bad.effects.hum.breath = Number.NaN;
    bad.genui.streamReveal = {
      stagger: -5,
      effect: "explode",
    } as unknown as typeof bad.genui.streamReveal;
    const labels = checkEffectSanity([bad]).map((v) => v.label);
    expect(labels).toContain("rift.intensity");
    expect(labels).toContain("hum.breath");
    expect(labels).toContain("streamReveal.stagger");
    expect(labels).toContain("streamReveal.effect");
  });

  it("stitch 人格配 fade 节奏被视为违规", () => {
    const bad = structuredClone(themeList[0]); // void：stitch
    bad.genui.catalogVariant = "stitch";
    bad.genui.streamReveal = { stagger: 10, effect: "fade" };
    const vs = checkEffectSanity([bad]);
    expect(vs.some((v) => v.detail.includes("stitch 人格必须 tear"))).toBe(
      true,
    );
  });
});
