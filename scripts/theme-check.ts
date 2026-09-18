import { contrastRatio } from "../src/lib/themes/contrast";
import { themeList } from "../src/themes/registry";

const MIN = {
  ink: 7,
  inkSecondary: 4.5,
  inkMuted: 4.5,
  accentInk: 4.5,
} as const;
let failures = 0;

for (const theme of themeList) {
  for (const mode of theme.meta.modes) {
    const t = theme.tokens[mode];
    if (!t) {
      console.error(`✗ ${theme.meta.id}:${mode} 缺少令牌`);
      failures++;
      continue;
    }
    const checks: Array<[string, number]> = [
      ["ink/bg", contrastRatio(t.color.ink, t.color.bg)],
      ["inkSecondary/bg", contrastRatio(t.color.inkSecondary, t.color.bg)],
      ["inkMuted/bg", contrastRatio(t.color.inkMuted, t.color.bg)],
      ["accentInk/accent", contrastRatio(t.color.accentInk, t.color.accent)],
    ];
    for (const [label, ratio] of checks) {
      const min = MIN[label.split("/")[0] as keyof typeof MIN];
      const ok = ratio >= min;
      if (!ok) failures++;
      console.log(
        `${ok ? "✓" : "✗"} ${theme.meta.id}:${mode} ${label} = ${ratio.toFixed(2)} (≥${min})`,
      );
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} 项对比度未达标`);
  process.exit(1);
}
console.log("\n主题契约校验通过");
