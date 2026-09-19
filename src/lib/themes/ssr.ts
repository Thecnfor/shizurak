import type { ThemeMode, ThemeOverrides } from "@/themes/contract";
import { getTheme, voidTheme } from "@/themes/registry";
import { type ResolvedTheme, resolveTheme } from "./resolve";

/** 与 theme-store 的 THEME_COOKIE 同名：客户端写入，服务端（RSC 通道）读取 */
const THEME_COOKIE = "shizurak-theme";

interface ThemeSnapshot {
  themeId?: string;
  mode?: ThemeMode;
  overrides?: ThemeOverrides;
}

/** 从原始 Cookie 头解析主题快照（无副作用，纯函数） */
export function parseThemeCookie(
  header: string | null | undefined,
): ThemeSnapshot {
  if (!header) return {};
  const prefix = `${THEME_COOKIE}=`;
  const pair = header
    .split(/;\s*/)
    .find((p) => p === prefix.slice(0, -1) || p.startsWith(prefix));
  if (!pair) return {};
  try {
    const json = decodeURIComponent(pair.slice(prefix.length));
    return JSON.parse(json) as ThemeSnapshot;
  } catch {
    return {};
  }
}

/**
 * RSC 通道的主题感知入口（05 §4.4）：从 cookie 解析出与服务端渲染一致的 ResolvedTheme。
 * 用法：`resolveThemeFromCookie((await cookies()).getAll().map(c => `${c.name}=${c.value}`).join('; '))`
 * 缺 cookie / 非法值 → 回退默认主题（void），绝不抛错阻塞渲染。
 */
export function resolveThemeFromCookie(
  header: string | null | undefined,
): ResolvedTheme {
  const snap = parseThemeCookie(header);
  const theme =
    (snap.themeId ? getTheme(snap.themeId) : undefined) ?? voidTheme;
  const requested = snap.mode ?? theme.meta.modes[0];
  const mode: ThemeMode = theme.meta.modes.includes(requested)
    ? requested
    : theme.meta.modes[0];
  return resolveTheme(theme, mode, snap.overrides ?? {});
}
