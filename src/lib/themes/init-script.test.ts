import { beforeEach, describe, expect, it } from "vitest";
import { THEME_INIT_SCRIPT } from "./init-script";

function runScript() {
  // jsdom 中执行内联脚本源码（Function 构造器；脚本为仓库内常量，无外部输入）
  Function(THEME_INIT_SCRIPT)();
}

describe("THEME_INIT_SCRIPT", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.removeProperty("--hue-rotate");
  });

  it("从 localStorage 还原 data-theme", () => {
    localStorage.setItem(
      "shizurak:theme",
      JSON.stringify({ themeId: "lumen", overrides: {} }),
    );
    runScript();
    expect(document.documentElement.getAttribute("data-theme")).toBe("lumen");
  });

  it("陈旧的 accentHue 持久化值不再被写入 --hue-rotate", () => {
    localStorage.setItem(
      "shizurak:theme",
      JSON.stringify({ themeId: "void", overrides: { accentHue: 40 } }),
    );
    runScript();
    expect(
      document.documentElement.style.getPropertyValue("--hue-rotate"),
    ).toBe("");
    // 但 data-theme 还原不受影响
    expect(document.documentElement.getAttribute("data-theme")).toBe("void");
  });

  it("无存储/坏 JSON 时不报错不改属性", () => {
    localStorage.setItem("shizurak:theme", "{oops");
    expect(() => runScript()).not.toThrow();
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });

  it("未知主题 id 不写入", () => {
    localStorage.setItem("shizurak:theme", JSON.stringify({ themeId: "evil" }));
    runScript();
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });

  it("白名单由 registry 派生：非首位注册主题（paper）也能还原", () => {
    // 旧实现硬编码 ["void","lumen"]，paper/terminal 持久化后会被静默丢弃；
    // 派生自 registry 后，任何注册 id 都在名单内
    localStorage.setItem(
      "shizurak:theme",
      JSON.stringify({ themeId: "paper", overrides: {} }),
    );
    runScript();
    expect(document.documentElement.getAttribute("data-theme")).toBe("paper");
  });
});
