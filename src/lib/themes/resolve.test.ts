import { describe, expect, it } from "vitest";
import { lumenTheme, voidTheme } from "@/themes/registry";
import { resolveTheme } from "./resolve";

describe("resolveTheme", () => {
  it("单模主题忽略传入模式", () => {
    expect(resolveTheme(voidTheme, "light").mode).toBe("dark");
  });
  it("双模主题按模式取令牌", () => {
    expect(resolveTheme(lumenTheme, "light").tokens.color.bg).toBe("#ffffff");
    expect(resolveTheme(lumenTheme, "dark").tokens.color.bg).toBe("#0d0d0d");
  });
  it("motionSpeed 缩放全部时长", () => {
    const r = resolveTheme(voidTheme, "dark", { motionSpeed: 2 });
    expect(r.motion.duration.ui).toBe(560);
    expect(r.motion.duration.scene).toBe(3200);
  });
  it("effectsIntensity 覆盖主题默认", () => {
    expect(
      resolveTheme(voidTheme, "dark", { effectsIntensity: 0.2 }).effects.intensity,
    ).toBe(0.2);
    expect(resolveTheme(voidTheme, "dark").effects.intensity).toBe(0.7);
  });
  it("background=false 关闭背景特效", () => {
    expect(
      resolveTheme(voidTheme, "dark", { background: false }).effects.background,
    ).toBe("none");
  });
  it("解析结果是新对象，不修改源主题（纯函数）", () => {
    const r = resolveTheme(voidTheme, "dark", { motionSpeed: 2 });
    expect(r.motion).not.toBe(voidTheme.motion);
    expect(voidTheme.motion.duration.ui).toBe(280);
  });
});
