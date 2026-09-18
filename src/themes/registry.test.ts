import { describe, expect, it } from "vitest";
import { getTheme, themeList } from "./registry";

describe("主题注册表", () => {
  it("void/lumen 均已注册", () => {
    expect(getTheme("void")?.meta.nameEn).toBe("Void");
    expect(getTheme("lumen")?.meta.modes).toEqual(["light", "dark"]);
  });
  it("每个主题声明的模式都有令牌", () => {
    for (const t of themeList) {
      for (const mode of t.meta.modes) {
        expect(t.tokens[mode], `${t.meta.id}:${mode}`).toBeDefined();
      }
    }
  });
});
