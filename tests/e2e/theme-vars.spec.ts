import { expect, test } from "@playwright/test";

/** 归一化 hex（CSS 压缩管线可能把 #ffffff 压成 #fff） */
function normHex(value: string): string {
  const v = value.trim();
  if (/^#[0-9a-f]{3}$/i.test(v)) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  return v;
}

test("CSS 变量随 data-theme 切换", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() =>
    document.documentElement.setAttribute("data-theme", "void"),
  );
  const voidBg = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(),
  );
  expect(normHex(voidBg)).toBe("#07070a");

  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "lumen");
    document.documentElement.setAttribute("data-mode", "light");
  });
  const lumenBg = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(),
  );
  expect(normHex(lumenBg)).toBe("#ffffff");
});

test("幕人格 tokens", async ({ page }) => {
  await page.goto("/zh");
  const root = page.locator("html");
  // 背景画在 body 上（globals.css：body { background: var(--bg) }），html 自身 transparent
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(7, 7, 10)",
  );
  const accent = await root.evaluate((el) =>
    getComputedStyle(el).getPropertyValue("--accent").trim(),
  );
  // hue-rotate 钩子删除后直出令牌色值（旧版包 oklch(from …) 导致整链 IACVT）
  expect(normHex(accent)).toBe("#cfe4ff");
});

test("回归门禁：.text-accent 实际渲染针脚冰蓝（不再落入 inherit）", async ({
  page,
}) => {
  await page.goto("/zh");
  // 旧缺陷：--accent 生成值 number+angle calc 非法 → 所有 accent 消费点 IACVT 继承父色；
  // 这里断言真实颜色计算结果，而非变量字面串
  await expect(page.locator(".text-accent").first()).toHaveCSS(
    "color",
    "rgb(207, 228, 255)",
  );
});
