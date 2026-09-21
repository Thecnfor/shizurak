import { expect, type Page, test } from "@playwright/test";

/**
 * T3 拉焦标记只活 ≤350ms，比一次 expect 轮询的窗口还短 —— 事后断言必然竞态。
 * 故按键**前**在页面里装 MutationObserver 探针：出现即记 t0，消失即回报存活时长；
 * 时长同时兼任 T3 预算门禁（真实计时，不为可测性拉长动画）。
 */
function watchFocusPull(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ seen: boolean; heldMs: number | null }>((resolve) => {
        const has = () => Boolean(document.querySelector("[data-focus-pull]"));
        let t0 = 0;
        const mo = new MutationObserver(() => {
          if (!t0) {
            if (has()) t0 = performance.now();
            return;
          }
          if (!has()) {
            mo.disconnect();
            resolve({ seen: true, heldMs: performance.now() - t0 });
          }
        });
        mo.observe(document.documentElement, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ["data-focus-pull"],
        });
        if (has()) t0 = performance.now();
        window.setTimeout(() => {
          mo.disconnect();
          resolve({ seen: t0 > 0, heldMs: null });
        }, 1500);
      }),
  );
}

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

test("⌘K 拉焦：打开时遮罩层带 data-focus-pull，且在 T3 预算内自行摘除", async ({
  page,
}) => {
  await page.goto("/zh");
  await expect(page.locator("[data-command-ready]")).toBeAttached();
  const probe = watchFocusPull(page); // 不 await：探针常驻页面 1.5s，让它与按键并发
  await page.keyboard.press("ControlOrMeta+k");
  const { seen, heldMs } = await probe;
  expect(seen).toBe(true);
  // 350ms 预算（spec §7）+ 浏览器调度余量；超时即视为被人为拉长或标记没摘
  if (heldMs === null) {
    throw new Error("探针没拿到存活时长：标记未出现或未在 1.5s 内摘除");
  }
  expect(heldMs).toBeLessThan(600);
  // 面板照常可用（拉焦不得抢走交互）
  await expect(page.getByPlaceholder("搜索或输入命令…")).toBeVisible();
});

test.describe("reduced-motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  test("T3 直通：不出现拉焦标记，面板直接出现", async ({ page }) => {
    await page.goto("/zh");
    await expect(page.locator("[data-command-ready]")).toBeAttached();
    const probe = watchFocusPull(page);
    await page.keyboard.press("ControlOrMeta+k");
    expect((await probe).seen).toBe(false);
    await expect(page.getByPlaceholder("搜索或输入命令…")).toBeVisible();
  });
});
