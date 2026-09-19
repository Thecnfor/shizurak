import { beforeEach, describe, expect, it } from "vitest";
import { useThemeStore } from "./theme-store";

describe("theme-store", () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.getState().hydrate();
  });

  it("默认 void", () => {
    expect(useThemeStore.getState().themeId).toBe("void");
    expect(useThemeStore.getState().resolved.meta.id).toBe("void");
  });

  it("setTheme 切换并持久化", () => {
    useThemeStore.getState().setTheme("lumen");
    expect(useThemeStore.getState().resolved.meta.id).toBe("lumen");
    expect(
      JSON.parse(localStorage.getItem("shizurak:theme") ?? "{}").themeId,
    ).toBe("lumen");
  });

  it("setOverride 触发 resolved 重算并持久化", () => {
    useThemeStore.getState().setOverride("motionSpeed", 2);
    expect(useThemeStore.getState().resolved.motion.duration.ui).toBe(560);
    expect(
      JSON.parse(localStorage.getItem("shizurak:theme") ?? "{}").overrides
        .motionSpeed,
    ).toBe(2);
  });

  it("hydrate 还原新旋钮，丢弃旧版未知键", () => {
    localStorage.setItem(
      "shizurak:theme",
      JSON.stringify({
        themeId: "lumen",
        overrides: { accentHue: 40, hum: 0.5, motionSpeed: 1.5 },
      }),
    );
    useThemeStore.getState().hydrate();
    expect(useThemeStore.getState().themeId).toBe("lumen");
    expect(
      (useThemeStore.getState().overrides as Record<string, unknown>).accentHue,
    ).toBeUndefined();
    expect(useThemeStore.getState().overrides.hum).toBe(0.5);
    expect(useThemeStore.getState().overrides.motionSpeed).toBe(1.5);
  });

  it("未知主题 id 回退 void", () => {
    localStorage.setItem("shizurak:theme", JSON.stringify({ themeId: "nope" }));
    useThemeStore.getState().hydrate();
    expect(useThemeStore.getState().themeId).toBe("void");
  });

  it("setTheme 记录 previousResolved（供特效层 fade-out）", () => {
    useThemeStore.getState().setTheme("lumen");
    expect(useThemeStore.getState().previousResolved.meta.id).toBe("void");
    expect(useThemeStore.getState().resolved.meta.id).toBe("lumen");
  });

  it("切换写 shizurak-theme cookie（供 RSC 通道服务端读取）", () => {
    useThemeStore.getState().setTheme("lumen");
    const m = /shizurak-theme=([^;]+)/.exec(document.cookie);
    expect(m).toBeTruthy();
    const snap = JSON.parse(decodeURIComponent(m?.[1] ?? "{}"));
    expect(snap.themeId).toBe("lumen");
    expect(snap.mode).toBeTruthy();
  });
});
