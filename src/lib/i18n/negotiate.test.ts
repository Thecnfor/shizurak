import { describe, expect, it } from "vitest";
import { hasLocale, negotiateLocale } from "./negotiate";

describe("negotiateLocale", () => {
  it("中文优先匹配", () => {
    expect(negotiateLocale("zh-CN,zh;q=0.9,en;q=0.8")).toBe("zh");
  });
  it("英文请求匹配 en", () => {
    expect(negotiateLocale("en-US,en;q=0.9")).toBe("en");
  });
  it("不支持语言回落默认 zh", () => {
    expect(negotiateLocale("fr-FR,fr;q=0.9")).toBe("zh");
  });
  it("空/垃圾输入回落默认", () => {
    expect(negotiateLocale(null)).toBe("zh");
    expect(negotiateLocale("")).toBe("zh");
    expect(negotiateLocale(";;;q=???")).toBe("zh");
  });
  it("hasLocale 收窄", () => {
    expect(hasLocale("zh")).toBe(true);
    expect(hasLocale("jp")).toBe(false);
  });
});
