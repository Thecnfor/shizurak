import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { themeVarsCss } from "../src/lib/themes/css";
import { themeList } from "../src/themes/registry";

const out = resolve(__dirname, "../src/app/theme-vars.generated.css");
writeFileSync(out, themeVarsCss(themeList));
console.log(`✓ 已生成 ${out}（${themeList.length} 主题）`);
