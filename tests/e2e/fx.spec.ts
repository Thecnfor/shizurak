import { expect, test } from "@playwright/test";

test("void 主题渲染 starfield canvas", async ({ page }) => {
  await page.goto("/zh?fxtier=high");
  await expect(page.locator('canvas[data-fx="starfield"]')).toBeAttached();
});

test("lumen 主题不渲染任何特效节点", async ({ page }) => {
  await page.goto("/zh?fxtier=high&theme=lumen");
  await expect(page.locator("[data-fx]")).toHaveCount(0);
});

test("低端分级降级为静态层", async ({ page }) => {
  await page.goto("/zh?fxtier=low");
  await expect(page.locator('[data-fx="fallback"]')).toBeAttached();
  await expect(page.locator('canvas[data-fx="starfield"]')).toHaveCount(0);
});

test.describe("reduced-motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  test("强制静态化：不加载 canvas", async ({ page }) => {
    await page.goto("/zh?fxtier=high");
    await expect(page.locator('canvas[data-fx="starfield"]')).toHaveCount(0);
  });
});
