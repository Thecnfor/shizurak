import { describe, expect, it } from "vitest";
import { lumenTheme, voidTheme } from "@/themes/registry";
import { themeVarsCss } from "./css";

describe("themeVarsCss", () => {
  const css = themeVarsCss([voidTheme, lumenTheme]);

  it("为每个主题×模式产出选择器", () => {
    expect(css).toContain('[data-theme="void"][data-mode="dark"]');
    expect(css).toContain('[data-theme="lumen"][data-mode="light"]');
    expect(css).toContain('[data-theme="lumen"][data-mode="dark"]');
  });
  it("单模主题同时匹配无 mode 属性场景", () => {
    expect(css).toContain(
      '[data-theme="void"], [data-theme="void"][data-mode="dark"]',
    );
  });
  it("令牌转 kebab-case 变量", () => {
    expect(css).toContain("--bg: #07070a");
    expect(css).toContain("--ink-secondary: #a9b3bc");
    expect(css).toContain("--radius-sm: 0px");
    expect(css).toContain("--text-h1-size:");
  });
  it("accent 走 oklch 色相旋转钩子", () => {
    expect(css).toContain(
      "oklch(from #cfe4ff l c calc(h + var(--hue-rotate, 0)))",
    );
  });
});
