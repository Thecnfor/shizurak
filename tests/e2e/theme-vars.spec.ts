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
  // CSS 管线把 accent 包成 oklch(from <hex> l c calc(h + ...))，断言内嵌的幕人格冰蓝白 hex
  expect(accent).toContain("#cfe4ff");
});
