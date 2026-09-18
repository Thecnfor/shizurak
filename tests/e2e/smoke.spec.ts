import { expect, test } from "@playwright/test";

test("站点可响应", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.status()).toBeLessThan(400);
});
