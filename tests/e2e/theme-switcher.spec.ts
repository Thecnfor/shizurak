import { expect, test } from "@playwright/test";

test("切换主题：data-theme 与 CSS 变量同步", async ({ page }) => {
  await page.goto("/zh");
  await page.getByRole("button", { name: "主题" }).click();
  await page.getByRole("button", { name: /流明/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "lumen");
  const bg = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(),
  );
  expect(["#ffffff", "#fff"]).toContain(bg);
});

test("色相滑块改变 --hue-rotate", async ({ page }) => {
  await page.goto("/zh");
  await page.getByRole("button", { name: "主题" }).click();
  const slider = page.getByRole("slider", { name: "强调色相" });
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.documentElement.style.getPropertyValue("--hue-rotate"),
      ),
    )
    .toBe("2deg");
});

test("单模主题（void）不显示模式切换", async ({ page }) => {
  await page.goto("/zh");
  await page.getByRole("button", { name: "主题" }).click();
  await expect(page.getByRole("button", { name: "跟随系统" })).toHaveCount(0);
  await page.getByRole("button", { name: /流明/ }).click();
  await expect(page.getByRole("button", { name: "跟随系统" })).toBeVisible();
});
