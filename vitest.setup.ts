import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// vitest 未开 globals，RTL 的 auto-cleanup 不会自动注册——多个用例渲染同一
// 文本时 screen.getByText 会跨用例撞车；在这里统一挂上，所有测试文件受益。
afterEach(() => cleanup());

// jsdom 未实现 matchMedia（theme-store 依赖它做系统暗色检测）
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  });
}
