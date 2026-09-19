import { describe, expect, it } from "vitest";
import { lumenTheme } from "@/themes/registry";
import { parseThemeCookie, resolveThemeFromCookie } from "./ssr";

const cookieOf = (obj: unknown) =>
  `shizurak-theme=${encodeURIComponent(JSON.stringify(obj))}`;

describe("parseThemeCookie", () => {
  it("从无匹配头返回空", () => {
    expect(parseThemeCookie(undefined)).toEqual({});
    expect(parseThemeCookie("other=1; x=2")).toEqual({});
  });
  it("坏 JSON 返回空（不抛）", () => {
    expect(parseThemeCookie("shizurak-theme=oops")).toEqual({});
  });
});

describe("resolveThemeFromCookie（RSC 通道主题感知）", () => {
  it("还原主题 + 模式 + overrides", () => {
    const r = resolveThemeFromCookie(
      cookieOf({
        themeId: "lumen",
        mode: "light",
        overrides: { motionSpeed: 2 },
      }),
    );
    expect(r.meta.id).toBe("lumen");
    expect(r.mode).toBe("light");
    expect(r.tokens.color.bg).toBe(lumenTheme.tokens.light?.color.bg);
    expect(r.motion.duration.ui).toBe((lumenTheme.motion.duration.ui ?? 0) * 2);
  });
  it("缺 cookie 回退默认主题 void/dark", () => {
    const r = resolveThemeFromCookie(null);
    expect(r.meta.id).toBe("void");
    expect(r.mode).toBe("dark");
  });
  it("未知主题 id 回退 void", () => {
    expect(resolveThemeFromCookie(cookieOf({ themeId: "evil" })).meta.id).toBe(
      "void",
    );
  });
  it("单模主题强制其唯一模式（忽略请求的 light）", () => {
    const r = resolveThemeFromCookie(
      cookieOf({ themeId: "void", mode: "light" }),
    );
    expect(r.mode).toBe("dark");
  });
});
