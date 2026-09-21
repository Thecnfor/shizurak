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

/**
 * 选型守卫：⌘K 的 router.push 没有自己再包 startViewTransition——Next 已把这次
 * 提交包进 React 的路由 VT，RiftDirector 的包装挂点应当同样接得到。
 * 若本用例的 rift-tear 没出现，说明 go() 需要显式包裹（见 Task 6 报告）。
 */
test("导航命令跳转也吃 T1 撕幕（driver 覆盖 router.push）", async ({
  page,
}) => {
  await page.goto("/zh");
  await expect(page.locator("[data-command-ready]")).toBeAttached();
  const seen = page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        const has = () =>
          document.documentElement.classList.contains("rift-tear");
        if (has()) return resolve(true);
        const mo = new MutationObserver(() => {
          if (has()) {
            mo.disconnect();
            resolve(true);
          }
        });
        mo.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class"],
        });
        window.setTimeout(() => {
          mo.disconnect();
          resolve(false);
        }, 2000);
      }),
  );
  await page.keyboard.press("ControlOrMeta+k");
  await page.keyboard.type("项目");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/zh\/projects$/);
  expect(await seen).toBe(true);
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

/**
 * 单语法守卫（spec §2.2 铁律 3）：换肤 morph 不是路由切换，不得吃 T1 撕幕。
 * withThemeViewTransition 在 startViewTransition 之前同步挂 html.theme-morph，
 * globals.css 用 html:not(.theme-morph)::view-transition-*(root) 把 T1 门控回路由。
 * 探针：morph 存活期间逐帧（rAF）采样 root 伪元素的动画名——伪元素树要等
 * startViewTransition 内部排期后才建，挂类那一帧采样只会读到 "none"（实测），
 * 故必须采样整个 morph 窗口收集出现过的动画名集合。实测确认门控生效：换肤期间
 * 采到的是 Chromium UA 默认的 -ua-view-transition-fade-out，而非 rift-old。
 * 诚实探针模式同 T3 探针。
 */
function watchThemeMorph(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{
        seen: boolean;
        oldAnims: string[];
        tearSeen: boolean;
        heldMs: number | null;
      }>((resolve) => {
        const el = document.documentElement;
        const oldAnims = new Set<string>();
        const deadline = performance.now() + 2500;
        let t0 = 0;
        let tearSeen = false;
        let heldMs: number | null = null;
        const finish = () =>
          resolve({
            seen: t0 > 0,
            oldAnims: [...oldAnims],
            tearSeen,
            heldMs,
          });
        const step = () => {
          const classes = el.classList;
          if (classes.contains("rift-tear")) tearSeen = true;
          if (classes.contains("theme-morph")) {
            if (!t0) t0 = performance.now();
            oldAnims.add(
              getComputedStyle(el, "::view-transition-old(root)").animationName,
            );
          } else if (t0 && heldMs === null) {
            heldMs = performance.now() - t0;
          }
          if (heldMs !== null || performance.now() > deadline) {
            finish();
            return;
          }
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }),
  );
}

test("⌘K 换肤不吃 T1 撕幕（T1 只归路由）", async ({ page }) => {
  await page.goto("/zh");
  await expect(page.locator("[data-command-ready]")).toBeAttached();
  const probe = watchThemeMorph(page); // 不 await：探针与按键并发
  await page.keyboard.press("ControlOrMeta+k");
  await page.keyboard.type("流明");
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "lumen");
  const { seen, oldAnims, tearSeen, heldMs } = await probe;
  expect(seen).toBe(true);
  // "none" 是伪元素树建好前的空帧；真动画必须是 Chromium 的 UA 默认淡入
  // （实测 -ua-view-transition-fade-out, -ua-mix-blend-mode-plus-lighter）
  const live = oldAnims.filter((v) => v !== "none");
  expect(live.join(" ")).toContain("view-transition-fade-out");
  // 负向：T1 语法不得泄进换肤（rift-old 本身由 smoke.spec 的正向用例守）
  expect(live).not.toContain("rift-old");
  expect(tearSeen).toBe(false);
  // UA 默认 crossfade 本身就是 250ms；摘类只可能晚于此，多出的预算留给调度负载
  if (heldMs === null) {
    throw new Error("探针没拿到存活时长：theme-morph 未在 2.5s 内摘除");
  }
  expect(heldMs).toBeLessThan(700);
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
