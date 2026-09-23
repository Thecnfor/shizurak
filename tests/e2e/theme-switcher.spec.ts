import { expect, test } from "@playwright/test";

test("切换主题：data-theme 与 CSS 变量同步", async ({ page }) => {
  await page.goto("/zh");
  // 水合前点 SSR 渲染的主题按钮是无操作，负载下 popover 永远不出现（同 smoke 口径）
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: "主题" }).click();
  await page.getByRole("button", { name: /流明/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "lumen");
  const bg = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(),
  );
  expect(["#ffffff", "#fff"]).toContain(bg);
});

test("个性化滑块（hum/rift）调整覆盖值并持久化", async ({ page }) => {
  await page.goto("/zh");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: "主题" }).click();

  // 幕面底噪：默认 1，左移两步（step 0.1）→ 0.8
  const hum = page.getByRole("slider", { name: "幕面底噪" });
  await hum.focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(hum).toHaveAttribute("aria-valuenow", "0.8");

  // 撕裂烈度：void 主题默认 0.7，左移两步 → 0.5
  const rift = page.getByRole("slider", { name: "撕裂烈度" });
  await rift.focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(rift).toHaveAttribute("aria-valuenow", "0.5");

  // 覆盖值经 store 持久化到 localStorage（v2 不再旁路写 --hue-rotate）
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem("shizurak:theme");
        const v = raw ? JSON.parse(raw) : {};
        return JSON.stringify(v.overrides ?? {});
      }),
    )
    .toContain('"riftIntensity":0.5');
});

test("单模主题（void）不显示模式切换", async ({ page }) => {
  await page.goto("/zh");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: "主题" }).click();
  await expect(page.getByRole("button", { name: "跟随系统" })).toHaveCount(0);
  await page.getByRole("button", { name: /流明/ }).click();
  await expect(page.getByRole("button", { name: "跟随系统" })).toBeVisible();
});
