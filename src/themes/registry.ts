import type { Theme } from "@/themes/contract";
import { lumenTheme } from "@/themes/lumen";
import { mergeTheme } from "@/themes/merge";
import { paperTheme } from "@/themes/paper";
import { terminalTheme } from "@/themes/terminal";
import { voidTheme } from "@/themes/void";

export { lumenTheme, paperTheme, terminalTheme, voidTheme };

/** 源主题声明表（物化继承链前） */
const declared: Theme[] = [voidTheme, lumenTheme, paperTheme, terminalTheme];
const declaredById: Record<string, Theme> = Object.fromEntries(
  declared.map((t) => [t.meta.id, t]),
);

/** 把某主题沿 extends 链解析为「扁平 Theme」：子覆写的层胜出，未覆写的层继承基座。 */
function materialize(id: string, seen: Set<string> = new Set()): Theme {
  const theme = declaredById[id];
  if (!theme) throw new Error(`未注册的主题 id: ${id}`);
  if (!theme.extends) return theme;
  if (seen.has(id)) throw new Error(`主题 extends 存在环: ${id}`);
  seen.add(id);
  return mergeTheme(materialize(theme.extends, seen), theme);
}

export const themeList: Theme[] = declared.map((t) => materialize(t.meta.id));
export const themeRegistry: Record<string, Theme> = Object.fromEntries(
  themeList.map((t) => [t.meta.id, t]),
);
export function getTheme(id: string): Theme | undefined {
  return themeRegistry[id];
}
