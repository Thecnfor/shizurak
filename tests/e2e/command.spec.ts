import { expect, test } from "@playwright/test";

test("⌘K 打开面板并执行主题命令", async ({ page }) => {
  await page.goto("/zh");
  // 命令面板独立 chunk：以自身就绪探针为准（键盘监听注册同帧翻转）
  await expect(page.locator("[data-command-ready]")).toBeAttached();
  await page.keyboard.press("ControlOrMeta+k");
  await expect(page.getByPlaceholder("搜索或输入命令…")).toBeVisible();
  await page.keyboard.type("流明");
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "lumen");
});

test("导航命令跳转", async ({ page }) => {
  await page.goto("/zh");
  await expect(page.locator("[data-command-ready]")).toBeAttached();
  await page.keyboard.press("ControlOrMeta+k");
  await page.keyboard.type("项目");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/zh\/projects$/);
});
