import { checkAllThemes } from "../src/lib/themes/contrast-gate";
import { themeList } from "../src/themes/registry";

const { violations, checks } = checkAllThemes(themeList);

for (const c of checks) {
  console.log(
    `${c.ok ? "\u2713" : "\u2717"} ${c.themeId}:${c.mode} ${c.label} = ${c.ratio.toFixed(2)} (\u2265${c.min})`,
  );
}

if (violations.length > 0) {
  console.error(`\n${violations.length} 项对比度未达标`);
  process.exit(1);
}
console.log("\n主题契约校验通过");
