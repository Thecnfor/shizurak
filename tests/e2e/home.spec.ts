import { expect, test } from "@playwright/test";

test("hero 渲染标题且入场时间线完成", async ({ page }) => {
  await page.goto("/zh");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("伍泽凯");
  await expect(page.locator('[data-anim="done"]')).toBeAttached({
    timeout: 5000,
  });
});

test.describe("reduced-motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  test("跳过动画直接呈现", async ({ page }) => {
    await page.goto("/zh");
    await expect(page.locator('[data-anim="done"]')).toBeAttached({
      timeout: 1500,
    });
  });
});
