import { expect, test } from "@playwright/test";

test("根路径按语言协商重定向", async ({ page }) => {
  // Playwright 默认 Accept-Language 为 en-US → 期望 /en
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
});

test("中文直连渲染中文标题且 html lang=zh", async ({ page }) => {
  await page.goto("/zh");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("伍泽凯");
});

test("不支持的语言 404", async ({ page }) => {
  const res = await page.goto("/jp");
  // /jp 不在 locales 中：proxy 重定向为 /zh/jp，再由 [lang] 层 404
  expect(res?.status()).toBe(404);
});
