import { expect, test } from "@playwright/test";

/**
 * T10-D 底噪审计（spec §8 验收项）：/zh 非 low 档 settle 5s 后，仍在 running 的
 * 命名 CSS 动画必须 ⊆ 白名单——幕语法的常驻底噪只有 hum-tremor（5s steps(1)
 * 心跳级）；rift-breath 仅 low 档 CSS 兜底 canvas 允许；hero-reveal/genui-tear
 * 是瞬态入场（both 填充，5s 后为 finished，running 过滤天然排除）。
 * 口径边界：rift 的 shader rAF 是 JS 循环，不在 document.getAnimations() 面内，
 * 由 C 用例的网络/挂载断言兜住；GSAP 走自身 ticker，同理不在面内。
 */
test("/zh（非 low 档）settle 后无白名单外的运行中 CSS 动画", async ({
  page,
}) => {
  await page.goto("/zh?fxtier=high");
  await page.waitForTimeout(5000);

  const running: string[] = await page.evaluate(() => [
    ...new Set(
      document
        .getAnimations()
        // 只收 CSSAnimation（有 animationName），排除 CSSTransition
        .filter(
          (a) =>
            a.playState === "running" &&
            typeof (a as CSSAnimation).animationName === "string" &&
            (a as CSSAnimation).animationName !== "none",
        )
        .map((a) => (a as CSSAnimation).animationName),
    ),
  ]);

  const hasCssFallbackCanvas =
    (await page.locator('canvas[data-rift="css"]').count()) > 0;
  const allowed = new Set<string>(["hum-tremor"]);
  if (hasCssFallbackCanvas) allowed.add("rift-breath");

  expect(running.filter((n) => !allowed.has(n))).toEqual([]);
  // 非 low 档走 GL 路径：CSS 呼吸底噪不得出现
  expect(running).not.toContain("rift-breath");
});
