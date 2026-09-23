import { expect, test } from "@playwright/test";
import { sampleVtWindow, watchClassLifecycle } from "./probes";

/**
 * T2 信号崩解（spec §2.2：任意页 → Lab）。触发方式是 Link 的
 * `transitionTypes={["rift-collapse"]}` —— Next 把它交给 React 的
 * `addTransitionType`，React 在提交时以 `startViewTransition({ update, types })`
 * 落地，RiftDirector 按 types 点名派发语法类（计划里的 collapseViewTransition
 * 包装函数已被这一 Link-driven 架构取代）。
 *
 * 两处环境适配（本机实测，都是「基础设施时序」而非「语法预算」，故只放宽出现窗口）：
 * 1. /zh/lab 的分享列表依赖 dev PostgreSQL（当前不可达）。它是全站 nav 的 T2 目标，
 *    页面级 await 会把整条路由的 RSC 响应押在 DB 往返之后（实测 11.6s），React
 *    因此根本不为这次导航起 view transition——幕语法连类都拿不到。已把该取数收进
 *    <Suspense> 边界（骨架先交付），提交回到 0.3s 级；DB 的影响只剩「列表 11s 后补上」。
 * 2. transitionTypes 只在 **prefetch 已落地**的导航上存活：预取还在飞时点击，Next 复用
 *    未完成请求，DOM 由 ping 提交，React 不再带 types（实测首点 types: null →
 *    被打成 T1）。故点之前先等 /zh/lab 的预取响应。
 */

/** 类存活墙钟上限：CSS 侧 600ms，另加 native 建立快照 + React finished 的 passive-effects
 *  排队（本机实测：单 worker ≈730ms，6 worker 并行 ≈808ms）。真正的语法预算门禁
 *  是负载无关的 declaredMs===600，这条只是「类没被摘掉」的兜底，故取 2× 预算。 */
const HELD_CEILING_MS = 1200;

async function homeWithLabPrefetch(
  page: import("@playwright/test").Page,
  url = "/zh",
) {
  // 预取响应在 goto 之前就开始监听（链接进视口即预取，可能早于任何断言）
  const prefetched = page
    .waitForResponse((r) => r.url().includes("/zh/lab?_rsc"), {
      timeout: 15_000,
    })
    .then(() => true)
    .catch(() => false);
  await page.goto(url);
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await prefetched;
  // 预取条目写进 router cache 与响应落地之间仍有一拍
  await page.waitForTimeout(400);
}

function labLink(page: import("@playwright/test").Page) {
  return page
    .locator("header")
    .getByRole("link", { name: /实验室|Lab/ })
    .first();
}

test("T2 崩解：nav→Lab 出现 html.rift-t2、跑崩解动画、预算内摘除，且同窗零 T1 语法", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await homeWithLabPrefetch(page);

  const probe = watchClassLifecycle(page, "rift-t2", {
    timeoutMs: 15_000,
    graceMs: 1500,
    declared: true,
    forbid: ["rift-t1", "rift-tear"],
  }); // 不 await：探针与点击并发
  await labLink(page).click();
  await expect(page).toHaveURL(/\/zh\/lab$/, { timeout: 30_000 });

  const { seen, heldMs, anims, declaredMaxMs, forbidSeen } = await probe;
  expect(seen).toBe(true);
  // 单语法铁律（spec §2.2 铁律 3）：一次转场只认一种语法，T1 的类与锚点都不许出现
  expect(forbidSeen).toEqual([]);
  // root 快照确实在跑崩解语法（不是 T1 撕幕，也不是 UA 默认 crossfade）
  expect(anims).toContain("rift-collapse-old");
  // §7 红线：崩解动画声明时长必须就是 600ms（400–600ms 区间的上界）
  expect(declaredMaxMs).toBe(600);
  if (heldMs === null) {
    throw new Error("探针没拿到存活时长：rift-t2 未在宽限（1.5s）内摘除");
  }
  expect(heldMs).toBeLessThan(HELD_CEILING_MS);
});

test("lumen（intensity=0）点 Lab 不吃崩解语法，但转场本身仍在跑", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await homeWithLabPrefetch(page, "/zh?theme=lumen");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "lumen");
  const probe = watchClassLifecycle(page, "rift-t2", {
    timeoutMs: 8_000,
    graceMs: 1500,
    forbid: ["rift-t1", "rift-tear"],
  });
  // 反测：不挂类得靠「真的有转场」兜底，否则「没语法」可以靠根本没 VT 蒙对。
  // 窗口取 20s（6 worker 并跑实测 /zh/lab 提交可逼近 10s 级）：窗长只让反测更
  // 严（rift-* 类被看到的机会更多），同时给 UA crossfade 一个被采样到的公平窗口；
  // 属基础设施时序放宽，与文件头两处适配同源。
  const sampled = sampleVtWindow(page, ["rift-t1", "rift-t2", "rift-tear"], {
    durationMs: 20_000,
  });
  await labLink(page).click();
  await expect(page).toHaveURL(/\/zh\/lab$/, { timeout: 30_000 });
  const { seen, forbidSeen } = await probe;
  // 烈度门在派发之前：K=0 人格连崩解路径都进不来（rift-collapse 点名不改变这一点）
  expect(seen).toBe(false);
  expect(forbidSeen).toEqual([]);
  const sample = await sampled;
  expect(sample.classesSeen).toEqual([]);
  expect(sample.oldAnims.join(" ")).toContain("view-transition-fade-out");
});

test.describe("reduced-motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  test("T2 硬切：nav→Lab 不出现 rift-t2（也不出现 rift-t1）", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await homeWithLabPrefetch(page);
    const probe = watchClassLifecycle(page, "rift-t2", {
      timeoutMs: 8_000,
      graceMs: 1500,
      forbid: ["rift-t1", "rift-tear"],
    });
    await labLink(page).click();
    await expect(page).toHaveURL(/\/zh\/lab$/, { timeout: 30_000 });
    const { seen, forbidSeen } = await probe;
    expect(seen).toBe(false);
    expect(forbidSeen).toEqual([]);
  });
});
