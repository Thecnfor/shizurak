import type { Theme } from "@/themes/contract";
import { lumenTheme } from "@/themes/lumen";
import { voidTheme } from "@/themes/void";

export { lumenTheme, voidTheme };

export const themeList: Theme[] = [voidTheme, lumenTheme];
export const themeRegistry: Record<string, Theme> = Object.fromEntries(
  themeList.map((t) => [t.meta.id, t]),
);
export function getTheme(id: string): Theme | undefined {
  return themeRegistry[id];
}
