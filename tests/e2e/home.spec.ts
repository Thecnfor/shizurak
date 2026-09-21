import { expect, test } from "@playwright/test";

/**
 * 首页三幕（Task 8 留白重构后的 DOM 纪律断言）。
 * 旧 [data-anim="done"] 契约随 GSAP SplitText 时间线一起退役：hero 显现改为
 * 元素级 CSS 动画 hero-reveal（挂载即播一次，300ms），声明值可直读，
 * 不再需要 JS 完成标记。
 */
test("hero 自撕：标题可见且声明了 hero-reveal 动画", async ({ page }) => {
  await page.goto("/zh");
  const title = page.getByRole("heading", { level: 1 });
  await expect(title).toContainText("伍泽凯");
  // computed animation-name 就是 CSS 声明值，与动画播没播完无关
  await expect(title).toHaveCSS("animation-name", "hero-reveal");
});

test("幕②精选信号：真信纸或骨架二选一，永不报错", async ({ page }) => {
  await page.goto("/zh");
  // DB 不可达/慢/空：Suspense fallback 与 try/catch 空态都交付 5 行骨架信纸；
  // DB 可用：同样式的真实文章行。两种形态都以 data-paper-row 落地，
  // 故这里只赌「有行」，不赌具体行（计划「执行期补记」的 E2E 纪律）
  await expect(
    page.locator("[data-signals] [data-paper-row]").first(),
  ).toBeVisible();
});

test("幕③项目名录：4 行 mono 名录", async ({ page }) => {
  await page.goto("/zh");
  await expect(page.locator("[data-directory] [data-paper-row]")).toHaveCount(
    4,
  );
});

test.describe("reduced-motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  test("hero 自撕静态化：animation-name 为 none", async ({ page }) => {
    await page.goto("/zh");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCSS(
      "animation-name",
      "none",
    );
  });
});
