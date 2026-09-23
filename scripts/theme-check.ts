import {
  checkAllThemes,
  checkEffectSanity,
} from "../src/lib/themes/contrast-gate";
import { themeList } from "../src/themes/registry";

const { violations, checks } = checkAllThemes(themeList);

for (const c of checks) {
  console.log(
    `${c.ok ? "\u2713" : "\u2717"} ${c.themeId}:${c.mode} ${c.label} = ${c.ratio.toFixed(2)} (\u2265${c.min})`,
  );
}

// 契约 v2 数值域（Task 10）：hum/rift 区间 + streamReveal 合理性
const sanity = checkEffectSanity(themeList);
for (const v of sanity) {
  console.error(`\u2717 ${v.themeId} ${v.label}: ${v.detail}`);
}

if (violations.length > 0) {
  console.error(`\n${violations.length} 项对比度未达标`);
  process.exit(1);
}
if (sanity.length > 0) {
  console.error(`\n${sanity.length} 项效果数值域越界`);
  process.exit(1);
}
console.log("\n主题契约校验通过");
