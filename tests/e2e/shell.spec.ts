import { expect, test } from "@playwright/test";

/**
 * DB 基础设施注记（见计划「执行期补记」）：文章列表的行内容依赖 PostgreSQL
 * 可达性，本用例只赌静态骨架（h1 导语是字典常量，DB 挂也在），不赌数据行；
 * 导航断言放宽为 href 校验 + URL 落点。
 */
test("导航在工作且指向 [lang] 路由", async ({ page }) => {
  await page.goto("/zh");
  const postsLink = page.getByRole("link", { name: "文章" }).first();
  await expect(postsLink).toHaveAttribute("href", "/zh/posts");
  await postsLink.click();
  await expect(page).toHaveURL(/\/zh\/posts$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("页脚单行 mono：版权 + RSS + ⌘K 提示", async ({ page }) => {
  await page.goto("/zh");
  await expect(page.getByText("© 2026 WUZEKAI")).toBeVisible();
  await expect(page.getByRole("link", { name: "RSS" })).toHaveAttribute(
    "href",
    "/feed.xml",
  );
  await expect(page.getByText("⌘K 命令面板")).toBeVisible();
});
