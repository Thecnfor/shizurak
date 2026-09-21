import { expect, test } from "@playwright/test";
import {
  sampleVtWindow,
  settleDeferredBoundaries,
  watchClassAppear,
  watchClassLifecycle,
} from "./probes";

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
 * T1 撕幕标记只活 ≤300ms（+调度余量），事后断言必然竞态——探针库
 * watchClassLifecycle 在点击**前**装 MutationObserver：出现记 t0 并现场取两样硬证据
 * （root 伪元素动画名 + 在飞动画的声明时长），类消失时回报存活时长。
 * 实现与预算口径见 tests/e2e/probes.ts。
 */
test("T1 撕幕：路由切换出现 html.rift-tear 且在预算内消失", async ({
  page,
}) => {
  await page.goto("/zh");
  // 导演随水合安装（包装 document.startViewTransition）；导航必须走客户端路由才会有 VT
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  // 先等首页边界的 startup tear 落地再装探针：否则那一撕与点击导航的受测撕幕
  // 在 6 并行下撞车，heldMs 墙钟被拖飘（实测 627ms 破 600ms 上限）
  await settleDeferredBoundaries(page);
  // 正向语法类 rift-t1 与 shader 锚点 rift-tear 同窗跟踪（rift-t1 在 native 调用前就挂，
  // 比 rift-tear 早 ready 那几十毫秒；两者都必须在预算内摘除）
  const grammar = watchClassAppear(page, "rift-t1");
  // 出现窗口放宽到 8s（dev 提交可被冷编译/并行 worker 拖住），
  // 预算门禁仍只看摘除是否宽限内（graceMs）与声明时长
  const probe = watchClassLifecycle(page, "rift-tear", {
    timeoutMs: 8000,
    graceMs: 1500,
  }); // 不 await：探针与点击并发
  // 目标选 /zh/projects：计划文本写 posts，但 dev 下该 ISR 路由冷编译要 5s（+DB 往返），
  // 会把断言耦在编译/基础设施延时上；posts 的路由可达性由 shell.spec 守
  await page
    .getByRole("link", { name: /项目|Projects/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/zh\/projects$/);
  const { seen, heldMs, oldAnim, declaredMs } = await probe;
  expect(await grammar).toBe(true);
  expect(seen).toBe(true);
  // root 快照确实在跑 T1 语法（不是浏览器默认 crossfade，也不是被剖出 root）
  expect(oldAnim).toBe("rift-old");
  // §7 红线：撕幕动画声明时长必须就是 300ms（负载无关的真门禁）
  expect(declaredMs).toBe(300);
  if (heldMs === null) {
    throw new Error("探针没拿到存活时长：rift-tear 未在宽限（1.5s）内摘除");
  }
  // 墙钟上限：标记从 ready（动画起跑）挂上、finished 摘，中间夹着 promise 回调排队；
  // 6 worker 并行下实测可飘到 ~470ms，故与 T3（350ms 预算→600ms 上限）同口径
  expect(heldMs).toBeLessThan(600);
});

/**
 * 正向门控的反例（I-2）：rift 烈度为 0 的人格不得拿到任何语法。
 * lumen 的 effects.rift.intensity === 0（契约见 src/themes/lumen），RiftDirector
 * 在 native startViewTransition 前同步判定 → 不挂 rift-t1 → root 伪元素保
 * UA 默认交叉淡入（spec §6.1「lumen：T1/T2 关闭」）。旧 :not(.theme-morph)
 * 负向门控时代这条不成立（无论烈度都跑 rift-old + tear 时间线）。
 * 用 ?theme=lumen 驱动（URL 分享码优先于 localStorage，见 theme-provider）。
 */
test("lumen（intensity=0）路由导航不吃语法：无 rift-t1 类、无 rift-old 动画", async ({
  page,
}) => {
  await page.goto("/zh?theme=lumen");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "lumen");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const grammar = watchClassLifecycle(page, "rift-t1", {
    timeoutMs: 8000,
    graceMs: 1500,
  });
  const sampled = sampleVtWindow(page, ["rift-t1", "rift-tear", "rift-t2"], {
    durationMs: 6000,
  });
  await page
    .getByRole("link", { name: /项目|Projects/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/zh\/projects$/);
  expect((await grammar).seen).toBe(false);
  const sample = await sampled;
  expect(sample.classesSeen).toEqual([]);
  expect(sample.oldAnims).not.toContain("rift-old");
  // 但过渡本身仍在跑（否则「不含 rift-old」可以靠根本没 VT 蒙对）
  expect(sample.oldAnims.join(" ")).toContain("view-transition-fade-out");
});

test.describe("reduced-motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  test("T1 硬切：导航不出现 rift-tear 标记", async ({ page }) => {
    await page.goto("/zh");
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    const grammar = watchClassAppear(page, "rift-t1");
    const probe = watchClassLifecycle(page, "rift-tear", { timeoutMs: 6000 });
    // 同时逐帧采样伪元素动画名：reduced 下语法闸第一步就拦掉（不挂类），
    // CSS 的 animation:none !important 再压一层
    const sampled = sampleVtWindow(page, ["rift-t1", "rift-tear"], {
      durationMs: 3000,
    });
    await page
      .getByRole("link", { name: /项目|Projects/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/zh\/projects$/);
    expect(await grammar).toBe(false);
    expect((await probe).seen).toBe(false);
    expect((await sampled).oldAnims).not.toContain("rift-old");
  });
});
