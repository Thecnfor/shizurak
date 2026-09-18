import { expect, test } from "@playwright/test";

test("导航在工作且指向 [lang] 路由", async ({ page }) => {
  await page.goto("/zh");
  await page.getByRole("link", { name: "文章" }).click();
  await expect(page).toHaveURL(/\/zh\/posts$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("文章");
});

test("页脚遥测条存在", async ({ page }) => {
  await page.goto("/zh");
  await expect(page.getByText("SYS · NOMINAL")).toBeVisible();
});
