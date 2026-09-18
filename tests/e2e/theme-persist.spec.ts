import { expect, test } from "@playwright/test";

test("主题选择跨刷新持久化且首帧前已就位", async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      (window as unknown as { __themeAtDCL?: string }).__themeAtDCL =
        document.documentElement.getAttribute("data-theme") ?? "";
    });
  });
  await page.goto("/zh");
  await page.evaluate(() =>
    localStorage.setItem(
      "shizurak:theme",
      JSON.stringify({ themeId: "lumen", overrides: {} }),
    ),
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "lumen");
  const atDcl = await page.evaluate(
    () => (window as unknown as { __themeAtDCL?: string }).__themeAtDCL,
  );
  expect(atDcl).toBe("lumen");
});
