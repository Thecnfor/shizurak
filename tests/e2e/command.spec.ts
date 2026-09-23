import { expect, test } from "@playwright/test";
import {
  sampleVtWindow,
  settleDeferredBoundaries,
  watchAttributeLifecycle,
  watchClassAppear,
} from "./probes";

/**
 * 导航提交的等待窗口（不是语义放宽）：cmdk/内核已改为首按时懒载，dev 下
 * 首按 ⌘K 会并发按需编译 command-menu + cordis 内核 chunk，与 /zh/projects 的
 * 冷编译抢同一个单进程 CPU（本机 6 worker 并跑实测导航可超 10s）。
 * 断言目标本身（落到 /zh/projects、出现 rift-tear）一字不改。
 */
const NAV_COMMIT_TIMEOUT_MS = 25_000;

test("⌘K 打开面板并执行主题命令", async ({ page }) => {
  await page.goto("/zh");
  // 命令面板独立 chunk：以自身就绪探针为准（键盘监听注册同帧翻转）
  await expect(page.locator("[data-command-ready]")).toBeAttached();
  await settleDeferredBoundaries(page);
  await page.keyboard.press("ControlOrMeta+k");
  await expect(page.getByPlaceholder("搜索或输入命令…")).toBeVisible();
  await page.keyboard.type("流明");
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "lumen");
});

test("导航命令跳转", async ({ page }) => {
  await page.goto("/zh");
  await expect(page.locator("[data-command-ready]")).toBeAttached();
  await settleDeferredBoundaries(page);
  await page.keyboard.press("ControlOrMeta+k");
  // 面板真可见再敲字：负载下 cmdk 挂载/聚焦有延迟，不等会丢键→过滤空→Enter 无操作
  await expect(page.getByPlaceholder("搜索或输入命令…")).toBeVisible();
  await page.keyboard.type("项目");
  await page.keyboard.press("Enter");
  // 10s→懒载窗口：/zh/projects 在 dev 下冷编译可达 5s，全量并跑时默认 5s 会误爆，
  // 而首按 ⌘K 还要并发改编译 cmdk/内核 chunk
  await expect(page).toHaveURL(/\/zh\/projects$/, {
    timeout: NAV_COMMIT_TIMEOUT_MS,
  });
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
  // 先沉降再装探针：否则 startup tear（边界定稿的无点名 VT）会被误读成
  // “跳转也吃了 T1”的正向证据
  await settleDeferredBoundaries(page);
  // 窗口从装探针起算，覆盖「等面板可见+输入+提交」全程：负载下 dev 提交可超 6s，
  // 正例不该因基础设施延时假失败（命中即 resolve，宽窗零成本）
  const seen = watchClassAppear(page, "rift-tear", NAV_COMMIT_TIMEOUT_MS);
  await page.keyboard.press("ControlOrMeta+k");
  // 同上：面板可见再敲字（另装探针在前不矛盾——rift-tear 只在 Enter 导航后才可能挂类）
  await expect(page.getByPlaceholder("搜索或输入命令…")).toBeVisible();
  await page.keyboard.type("项目");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/zh\/projects$/, {
    timeout: NAV_COMMIT_TIMEOUT_MS,
  });
  expect(await seen).toBe(true);
});

test("⌘K 拉焦：打开时遮罩层带 data-focus-pull，且在 T3 预算内自行摘除", async ({
  page,
}) => {
  await page.goto("/zh");
  await expect(page.locator("[data-command-ready]")).toBeAttached();
  await settleDeferredBoundaries(page);
  const probe = watchAttributeLifecycle(page, "data-focus-pull", 1500); // 不 await：探针常驻页面 1.5s，让它与按键并发
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
 * 单语法守卫（spec §2.2 铁律 3）：换肤 morph 不是路由切换，不得吃幕语法。
 * 架构改造后不再靠 `html.theme-morph` + CSS :not() 负向门控（该类无其他消费方，已连测试
 * 期望一起删）：morph 走 `startViewTransition(mutate)` 回调形态，riftGrammarFor 根本不认
 * → 不挂任何语法类 → globals.css 的 `html.rift-t1::view-transition-*(root)` 块不生效
 * → root 伪元素保 Chromium UA 默认交叉淡入。
 * 探针：probes.sampleVtWindow 逐帧（rAF）采样 root 伪元素的动画名集合 + 跟踪语法类是否
 * 曾出现。为何逐帧：伪元素树要等 startViewTransition 内部排期后才建，挂类那一帧采样只会
 * 读到 "none"（实测）。预算门禁改用**声明时长**（UA crossfade 固定 250ms）：类已不存在，
 * 就没了一个可跟踪的存活区间，而声明时长不受机器负载污染，比墙钟诚实。
 */
test("⌘K 换肤不吃幕语法（morph 不拿 rift-* 类，走 UA crossfade）", async ({
  page,
}) => {
  await page.goto("/zh");
  await expect(page.locator("[data-command-ready]")).toBeAttached();
  // 首页幕②的 Suspense 边界会在 ≈3.4s 定稿并触发一次无点名 VT（startup tear），
  // 与换肤 morph 无关却会落进 4s 采样窗——先沉降再装探针（见 probes 注释）
  await settleDeferredBoundaries(page);
  const probe = sampleVtWindow(page, ["rift-t1", "rift-t2", "rift-tear"], {
    declared: true, // 本用例的预算门禁看声明时长
    durationMs: 4000,
  }); // 不 await：探针与按键并发
  await page.keyboard.press("ControlOrMeta+k");
  await page.keyboard.type("流明");
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "lumen");
  const { oldAnims, classesSeen, declaredMs } = await probe;
  // "none" 是伪元素树建好前的空帧；真动画必须是 Chromium 的 UA 默认淡入
  //（实测 -ua-view-transition-fade-out, -ua-mix-blend-mode-plus-lighter）——
  // 它同时证明这次 morph 真的跑了 VT，而不是“没动画所以没 rift-old”
  const live = oldAnims.filter((v) => v !== "none");
  expect(live.join(" ")).toContain("view-transition-fade-out");
  // 负向：语法类零出现，rift-old 不得泄进换肤（rift-old 本身由 smoke.spec 的正向用例守）
  expect(classesSeen).toEqual([]);
  expect(live).not.toContain("rift-old");
  // UA crossfade 声明时长 250ms；能拿到它就是证明确实在飞 UA 默认而不是我们的 300ms 语法
  expect(declaredMs).not.toBeNull();
  expect(declaredMs).toBeLessThanOrEqual(300);
});

test.describe("reduced-motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  test("T3 直通：不出现拉焦标记，面板直接出现", async ({ page }) => {
    await page.goto("/zh");
    await expect(page.locator("[data-command-ready]")).toBeAttached();
    await settleDeferredBoundaries(page);
    const probe = watchAttributeLifecycle(page, "data-focus-pull", 1500);
    await page.keyboard.press("ControlOrMeta+k");
    expect((await probe).seen).toBe(false);
    await expect(page.getByPlaceholder("搜索或输入命令…")).toBeVisible();
  });
});
