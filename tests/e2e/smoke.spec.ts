import { expect, type Page, test } from "@playwright/test";

test("根路径按语言协商重定向", async ({ page }) => {
  // Playwright 默认 Accept-Language 为 en-US → 期望 /en
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
});

test("中文直连渲染中文标题且 html lang=zh", async ({ page }) => {
  await page.goto("/zh");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("伍泽凯");
});

test("不支持的语言 404", async ({ page }) => {
  const res = await page.goto("/jp");
  // /jp 不在 locales 中：proxy 重定向为 /zh/jp，再由 [lang] 层 404
  expect(res?.status()).toBe(404);
});

/**
 * T1 撕幕标记只活 ≤300ms（+调度余量），事后断言必然竞态。
 * 故点击**前**装 MutationObserver 探针：出现记 t0，并现场取两样硬证据——
 * a) root 伪元素的动画名（证明确实在跑 rift-old 而非默认 crossfade）；
 * b) 正在飞着的 ::view-transition-* 动画的声明时长（§7 的 300ms 红线真正归它管，
 *    墙钟受机器负载污染，声明时长不受）；类消失时回报存活时长作带负载余量的上限。
 * 诚实探针模式同 command.spec 的 T3 探针。
 */
function watchRiftTear(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{
        seen: boolean;
        heldMs: number | null;
        oldAnim: string | null;
        declaredMs: number | null;
      }>((resolve) => {
        const has = () =>
          document.documentElement.classList.contains("rift-tear");
        let t0 = 0;
        let oldAnim: string | null = null;
        let declaredMs: number | null = null;
        const mo = new MutationObserver(() => {
          if (!t0) {
            if (!has()) return;
            t0 = performance.now();
            oldAnim = getComputedStyle(
              document.documentElement,
              "::view-transition-old(root)",
            ).animationName;
            // React 自己也是这样枚举伪元素动画的（见 react-dom 的 startViewTransition）
            const vt = document.documentElement
              .getAnimations({ subtree: true })
              .filter((a) => {
                const pseudo = (a.effect as KeyframeEffect | null)
                  ?.pseudoElement;
                return (
                  typeof pseudo === "string" &&
                  pseudo.startsWith("::view-transition")
                );
              });
            declaredMs = vt.length
              ? Math.max(
                  ...vt.map(
                    (a) =>
                      Number(
                        (a.effect as KeyframeEffect).getTiming().duration,
                      ) || 0,
                  ),
                )
              : null;
            return;
          }
          if (!has()) {
            mo.disconnect();
            resolve({
              seen: true,
              heldMs: performance.now() - t0,
              oldAnim,
              declaredMs,
            });
          }
        });
        mo.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class"],
        });
        if (has()) t0 = performance.now();
        window.setTimeout(() => {
          mo.disconnect();
          resolve({ seen: t0 > 0, heldMs: null, oldAnim, declaredMs });
        }, 2000);
      }),
  );
}

test("T1 撕幕：路由切换出现 html.rift-tear 且在预算内消失", async ({
  page,
}) => {
  await page.goto("/zh");
  // 导演随水合安装（包装 document.startViewTransition）；导航必须走客户端路由才会有 VT
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const probe = watchRiftTear(page); // 不 await：探针常驻页面 2s，与点击并发
  // 目标选 /zh/projects：计划文本写 posts，但 dev 下该 ISR 路由冷编译实测要 5s（+DB 往返），
  // 会越过探针的 2s 窗口把断言耦在编译/基础设施延时上；posts 的路由可达性由 shell.spec 守
  await page
    .getByRole("link", { name: /项目|Projects/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/zh\/projects$/);
  const { seen, heldMs, oldAnim, declaredMs } = await probe;
  expect(seen).toBe(true);
  // root 快照确实在跑 T1 语法（不是浏览器默认 crossfade，也不是被剖出 root）
  expect(oldAnim).toBe("rift-old");
  // §7 红线：撕幕动画声明时长必须就是 300ms（负载无关的真门禁）
  expect(declaredMs).toBe(300);
  if (heldMs === null) {
    throw new Error("探针没拿到存活时长：rift-tear 未出现或未在 2s 内摘除");
  }
  // 墙钟上限：标记从 ready（动画起跑）挂上、finished 摘，中间夹着 promise 回调排队；
  // 6 worker 并行下实测可飘到 ~470ms，故与 T3（350ms 预算→600ms 上限）同口径
  expect(heldMs).toBeLessThan(600);
});

test.describe("reduced-motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  test("T1 硬切：导航不出现 rift-tear 标记", async ({ page }) => {
    await page.goto("/zh");
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    const probe = watchRiftTear(page);
    // 同时轮询旧幕伪元素的动画名：reduced 下 CSS 的 animation:none !important 必须压住 rift-old
    const sampled = page.evaluate(async () => {
      const names = new Set<string>();
      for (let i = 0; i < 40; i += 1) {
        names.add(
          getComputedStyle(
            document.documentElement,
            "::view-transition-old(root)",
          ).animationName,
        );
        await new Promise((r) => setTimeout(r, 20));
      }
      return [...names];
    });
    await page
      .getByRole("link", { name: /项目|Projects/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/zh\/projects$/);
    expect((await probe).seen).toBe(false);
    expect(await sampled).not.toContain("rift-old");
  });
});
