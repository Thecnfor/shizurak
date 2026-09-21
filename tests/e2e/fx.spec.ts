import { expect, test } from "@playwright/test";

/** rift-layer 挂载后注册的转场驱动入口（Task 6/7 同源契约） */
type RiftWindow = {
  __rift?: { setTear(p: number): void; setCollapse(p: number): void };
};

test("void 人格：idle 后出现 rift canvas 并完成 GL 挂载", async ({ page }) => {
  await page.goto("/zh?fxtier=high");
  await expect(page.locator("canvas[data-rift]")).toBeAttached();
  // GL 路径在 requestIdleCallback 后动态加载：轮询 __rift 注册完成代替固定等待
  await expect
    .poll(
      () =>
        page.evaluate(() => Boolean((window as unknown as RiftWindow).__rift)),
      {
        timeout: 15_000,
        message:
          "window.__rift 未在 idle 后注册（rift chunk 动态加载或 mountRift 失败）",
      },
    )
    .toBe(true);
});

test("lumen 主题不渲染任何特效节点", async ({ page }) => {
  await page.goto("/zh?fxtier=high&theme=lumen");
  await expect(page.locator("[data-fx]")).toHaveCount(0);
  await expect(page.locator("canvas[data-rift]")).toHaveCount(0);
});

test("低端分级：不加载 GL，canvas 走 CSS 呼吸兜底", async ({ page }) => {
  await page.goto("/zh?fxtier=low");
  const cssCanvas = page.locator('canvas[data-rift="css"]');
  await expect(cssCanvas).toBeAttached();
  await expect(cssCanvas).toHaveCSS("animation-name", "rift-breath");
  // lite 档不得有 shader 状态挂载，也不得再渲染旧 fallback div
  expect(
    await page.evaluate(
      () => (window as unknown as RiftWindow).__rift === undefined,
    ),
  ).toBe(true);
  await expect(page.locator('[data-fx="fallback"]')).toHaveCount(0);
});

test.describe("reduced-motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  test("强制静态化：不加载 canvas", async ({ page }) => {
    await page.goto("/zh?fxtier=high");
    await expect(page.locator("canvas[data-rift]")).toHaveCount(0);
  });
});
