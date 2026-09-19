import { describe, expect, it } from "vitest";
import type { ThemeOverrides } from "@/themes/contract";
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
  it("riftIntensity 覆盖主题默认烈度", () => {
    expect(
      resolveTheme(voidTheme, "dark", { riftIntensity: 0.2 }).effects.rift
        .intensity,
    ).toBe(0.2);
    expect(resolveTheme(voidTheme, "dark").effects.rift.intensity).toBe(0.7);
  });
  it("hum=0 关闭特效层（renderer 降为 none）", () => {
    const r = resolveTheme(voidTheme, "dark", { hum: 0 });
    expect(r.effects.renderer).toBe("none");
    expect(r.effects.hum.tremor).toBe(0);
  });
  it("持久化垃圾值净化为安全数，永不产出 NaN/越界", () => {
    // localStorage 可被手改或残留旧版本字段：字符串/NaN 回退默认，越界有限数夹进值域
    const junk = resolveTheme(voidTheme, "dark", {
      hum: "abc",
      motionSpeed: NaN,
    } as unknown as ThemeOverrides);
    expect(junk.effects.hum.breath).toBe(voidTheme.effects.hum.breath);
    expect(junk.effects.hum.tremor).toBe(voidTheme.effects.hum.tremor);
    expect(junk.motion.duration.ui).toBe(voidTheme.motion.duration.ui);
    expect(junk.effects.rift.intensity).toBe(voidTheme.effects.rift.intensity);

    const outOfRange = resolveTheme(voidTheme, "dark", {
      hum: -3,
      riftIntensity: 9,
      motionSpeed: 100,
    });
    expect(outOfRange.effects.renderer).toBe("none"); // hum 夹到下限 0
    expect(outOfRange.effects.rift.intensity).toBe(1);
    expect(outOfRange.motion.duration.ui).toBe(
      voidTheme.motion.duration.ui * 2,
    );
  });
  it("解析结果是新对象，不修改源主题（纯函数）", () => {
    const r = resolveTheme(voidTheme, "dark", { motionSpeed: 2 });
    expect(r.motion).not.toBe(voidTheme.motion);
    expect(voidTheme.motion.duration.ui).toBe(280);
  });
});
