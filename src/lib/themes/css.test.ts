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
  it("accent 直出令牌色值（hue-rotate 钩子已删除）", () => {
    expect(css).toContain("--accent: #cfe4ff;");
    expect(css).toContain("--accent-hover: #e6f1ff;");
  });
  it("回归门禁：生成 CSS 不含 oklch(from 相对色值与 hue-rotate 残留", () => {
    // 旧钩子 oklch(from … calc(h + var(--hue-rotate))) 与 <angle> 注册碰撞，
    // 使全部主题 accent 整链 IACVT（见 2026-09-21 修复）；不得回潮
    expect(css).not.toContain("oklch(from");
    expect(css).not.toContain("hue-rotate");
  });
  it("幕语法 easing 从 motion token 直出（源唯一：主题数据）", () => {
    // globals.css 里的 :root 手工镜像与它的同步义务注释已删，这两条变量
    // 是 T1/T2 的 animation-timing-function 与光标环过渡的唯一曲线来源
    expect(css).toContain(
      `--ease-entrance: ${voidTheme.motion.easing.entrance};`,
    );
    expect(css).toContain(`--ease-rift: ${voidTheme.motion.easing.rift};`);
    // 非幕人格拿到自己的曲线，而不是 void 的副本
    expect(lumenTheme.motion.easing.entrance).not.toBe(
      voidTheme.motion.easing.entrance,
    );
    expect(css).toContain(
      `--ease-entrance: ${lumenTheme.motion.easing.entrance};`,
    );
  });
});
