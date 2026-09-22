import type { Page } from "@playwright/test";

/**
 * 幕语法 e2e 探针库（M-3：smoke / command / collapse 共用，去重不留双份实现）。
 *
 * 共同前提——诚实探针模式：语法标记（rift-t1 / rift-t2 / rift-tear / data-focus-pull）
 * 只活一帧窗口（≤300–600ms），比一次 expect 轮询的间隔还短，事后断言必然竞态。
 * 所有探针都在**触发动作之前**装进页面、与动作并发跑，回报「出现过没 + 活了多久 +
 * 现场证据」。墙钟只当带负载余量的上限，真正的预算门禁看 CSS **声明时长**
 * （getTiming().duration），它不受机器负载污染。
 *
 * 注意：page.evaluate 的闭包不捕获 Node 侧变量，页面内的小工具（读伪元素动画名、
 * 枚举在飞的 view-transition 动画）各自内联在探针体里，不追求文件内 DRY。
 */

export interface ClassLifecycle {
  /** 该类是否出现过 */
  seen: boolean;
  /** 出现→消失的墙钟时长；未消失或从未出现为 null */
  heldMs: number | null;
  /** 出现那一帧 ::view-transition-old(root) 的动画名（伪元素树未建则为 "none"） */
  oldAnim: string | null;
  /** 出现那一帧在飞的 root 伪元素动画最大声明时长（毫秒） */
  declaredMs: number | null;
  /** 存活窗口内 old(root) 出现过的动画名集合（rAF 逐帧，只有真在飞才非空） */
  anims: string[];
  /** 存活窗口内的最大声明时长（需 declared:true） */
  declaredMaxMs: number | null;
  /** 整窗内出现过的「禁止类」（单语法互斥守卫用） */
  forbidSeen: string[];
}

/**
 * 类生命周期探针：MutationObserver 盯 <html> 的 class，出现记 t0 并现场取证
 * （伪元素动画名 + 声明时长），类消失时回报存活时长；**只在类存活的那段窗口内**
 * 逐帧采样 root 伪元素动画名——语法类是在 native startViewTransition 之前挂的，
 * 那一帧伪元素树还没建（读到 "none"），单帧取证不够；而采样又不能铺到整个导航
 * 窗口（dev 提交可吃数秒，逐帧 rAF 反而污染被测行为）。
 * 两个定时器分开算（负载解耦，实测必需）：
 * · `timeoutMs`——从未出现的判定窗口（从装探针起算）；
 * · `graceMs`——出现后没等到消失的挂死判定（从 t0 起算）。
 * 旧写法把两者共用一个绝对窗口，导航本身慢（dev 冷编译 / DB 挂死押住其它路由）时
 * 会「类正确挂上但窗口到点」，把基础设施延时误读成语法泄漏。
 */
export interface ClassLifecycleOptions {
  /** 从未出现的判定窗口（从装探针起算，默认 2500ms） */
  timeoutMs?: number;
  /** 出现后等待消失的宽限（从 t0 起算，默认 1200ms） */
  graceMs?: number;
  /** 存活窗口内逐帧枚举在飞动画拿声明时长（贵，默认 false） */
  declared?: boolean;
  /**
   * 同窗互斥守卫：这些类一旦出现就记进 forbidSeen（不提前结束探针）。
   * 拿它做「一次转场只用一种语法」的反向断言，而不是另开一个整窗监听器——
   * 后者要么绑上导航提交延时，要么得死等到自己超时。
   */
  forbid?: string[];
}

export function watchClassLifecycle(
  page: Page,
  className: string,
  opts: ClassLifecycleOptions = {},
): Promise<ClassLifecycle> {
  const {
    timeoutMs = 2500,
    graceMs = 1200,
    declared = false,
    forbid = [],
  } = opts;
  return page.evaluate(
    ([cls, ms, grace, wantDeclared, forbidden]) =>
      new Promise<ClassLifecycle>((resolve) => {
        const el = document.documentElement;
        const has = () => el.classList.contains(cls);
        const forbidSeen = new Set<string>();
        const checkForbid = () => {
          for (const f of forbidden)
            if (el.classList.contains(f)) forbidSeen.add(f);
        };
        const oldName = () =>
          getComputedStyle(el, "::view-transition-old(root)").animationName;
        // React 自己也是这样枚举伪元素动画的（见 react-dom 的 startViewTransition）
        const declaredNow = () => {
          const flying = el.getAnimations({ subtree: true }).filter((a) => {
            const p = (a.effect as KeyframeEffect | null)?.pseudoElement;
            return typeof p === "string" && p.startsWith("::view-transition");
          });
          return flying.length
            ? Math.max(
                ...flying.map(
                  (a) =>
                    Number((a.effect as KeyframeEffect).getTiming().duration) ||
                    0,
                ),
              )
            : null;
        };
        let t0 = 0;
        let oldAnim: string | null = null;
        let declaredMs: number | null = null;
        let declaredMaxMs: number | null = null;
        const anims = new Set<string>();
        let hang = 0;
        let raf = 0;
        const finish = (heldMs: number | null) => {
          mo.disconnect();
          window.clearTimeout(appear);
          if (hang) window.clearTimeout(hang);
          if (raf) cancelAnimationFrame(raf);
          resolve({
            seen: t0 > 0,
            heldMs,
            oldAnim,
            declaredMs,
            anims: [...anims],
            declaredMaxMs,
            forbidSeen: [...forbidSeen],
          });
        };
        /** 存活窗口内的逐帧采样（rAF + 一次互斥守卫扫描） */
        const watchFlight = () => {
          if (!has()) {
            finish(performance.now() - t0);
            return;
          }
          checkForbid();
          anims.add(oldName());
          if (wantDeclared) {
            const d = declaredNow();
            if (d !== null) declaredMaxMs = Math.max(declaredMaxMs ?? 0, d);
          }
          if (performance.now() - t0 > grace) return;
          raf = requestAnimationFrame(watchFlight);
        };
        const arm = () => {
          t0 = performance.now();
          oldAnim = oldName();
          declaredMs = declaredNow();
          hang = window.setTimeout(() => finish(null), grace);
          raf = requestAnimationFrame(watchFlight);
        };
        const mo = new MutationObserver(() => {
          // 互斥守卫走在判定分支之前：禁止类本身也是一次 class 变动，
          // 错过它就等于把「一次转场只用一种语法」这条铁律测了空
          checkForbid();
          if (!t0) {
            if (!has()) return;
            arm();
            window.clearTimeout(appear);
            return;
          }
          if (!has()) finish(performance.now() - t0);
        });
        mo.observe(el, { attributes: true, attributeFilter: ["class"] });
        const appear = window.setTimeout(() => finish(null), ms);
        checkForbid();
        if (has()) {
          arm();
          window.clearTimeout(appear);
        }
      }),
    [className, timeoutMs, graceMs, declared, forbid] as [
      string,
      number,
      number,
      boolean,
      string[],
    ],
  );
}

/** 只关心「有没有出现过」：并发/被打断的过渡里消失时刻不值得等。
 *  窗口要从装探针起算到导航提交之后——dev 冷编译 + 并行 worker 下提交本身可吃数秒，
 *  所以默认给 6s（正向用例不能因基础设施延时假失败）。 */
export function watchClassAppear(
  page: Page,
  className: string,
  timeoutMs = 6000,
): Promise<boolean> {
  return page.evaluate(
    ([cls, ms]) =>
      new Promise<boolean>((resolve) => {
        const el = document.documentElement;
        if (el.classList.contains(cls)) return resolve(true);
        const mo = new MutationObserver(() => {
          if (el.classList.contains(cls)) {
            mo.disconnect();
            resolve(true);
          }
        });
        mo.observe(el, { attributes: true, attributeFilter: ["class"] });
        window.setTimeout(() => {
          mo.disconnect();
          resolve(false);
        }, ms);
      }),
    [className, timeoutMs] as [string, number],
  );
}

/**
 * 「绝不出现」负向守卫：整窗监听 <html> 的 class，回报窗口内出现过的点名类。
 * 断言方期望空数组。用于换肤 morph 与 intensity===0 人格（两者都不该拿到语法类）。
 */
export function watchClassNever(
  page: Page,
  classNames: string[],
  timeoutMs = 2500,
): Promise<string[]> {
  return page.evaluate(
    ([cls, ms]) => {
      const el = document.documentElement;
      const hit = new Set<string>();
      for (const c of cls) if (el.classList.contains(c)) hit.add(c);
      return new Promise<string[]>((resolve) => {
        const mo = new MutationObserver(() => {
          for (const c of cls) if (el.classList.contains(c)) hit.add(c);
        });
        mo.observe(el, { attributes: true, attributeFilter: ["class"] });
        window.setTimeout(() => {
          mo.disconnect();
          resolve([...hit]);
        }, ms);
      });
    },
    [classNames, timeoutMs] as [string[], number],
  );
}

/** 属性生命周期探针（T3 的 data-focus-pull 挂在遮罩元素上，不是类） */
export function watchAttributeLifecycle(
  page: Page,
  attribute: string,
  timeoutMs = 1500,
): Promise<{ seen: boolean; heldMs: number | null }> {
  return page.evaluate(
    ([attr, ms]) =>
      new Promise<{ seen: boolean; heldMs: number | null }>((resolve) => {
        const has = () => Boolean(document.querySelector(`[${attr}]`));
        let t0 = 0;
        const finish = (heldMs: number | null) => {
          mo.disconnect();
          resolve({ seen: t0 > 0, heldMs });
        };
        const mo = new MutationObserver(() => {
          if (!t0) {
            if (has()) t0 = performance.now();
            return;
          }
          if (!has()) finish(performance.now() - t0);
        });
        mo.observe(document.documentElement, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: [attr],
        });
        if (has()) t0 = performance.now();
        window.setTimeout(() => finish(null), ms);
      }),
    [attribute, timeoutMs] as [string, number],
  );
}

/**
 * 延迟边界「startup tear」沉降等待：首页幕②/posts 的 <Suspense> 定稿时，
 * React 19 会把 deferred-value commit 包进一次**无点名的 options 形态**
 * startViewTransition——对 director 的形态判定（isRouteTransitionCall）来说，
 * 它和真路由过渡不可区分 → 照常挂 rift-t1。DB 不可达时定稿墙钟由两层封住：
 * 驱动层 connect/statement 封顶 + 边界内 withDeadline(3s)（I-1 定案，见
 * lib/db/queries/posts.ts），这一撕压在 goto 后 ≤3.4s（实测黑洞场景 ≈2.7s），
 * 正好落进各用例 ≤4s 的探针窗口；高并行下落地还会
 * 再漂——固定 sleep 盖不住（实测 4.5s 静置后仍撞车），故主动轮询 [data-home]
 * 里的骨架标记：data-skeleton 消失 ⇔ 边界已定稿 ⇔ startup tear 已开过；
 * 再补 400ms 让 tear 窗口（≤300ms + 调度）走完。DB 可达时定稿秒级，不多等；
 * 骨架永不消失的降级态由超时兑住（5s 上限 ≈ 边界定稿封顶 + 余量）。
 * 语法侧「路由过渡才算导航」是契约形态本身，不该为测试破例；测试侧装探针前
 * 必须先过这一沉降。调 withDeadline 须同步调这里的超时。
 */
export async function settleDeferredBoundaries(page: Page): Promise<void> {
  await page
    .waitForFunction(
      () =>
        document.querySelector("[data-home] [data-skeleton]") === null &&
        document.querySelector("[data-home]") !== null,
      undefined,
      { timeout: 5000 },
    )
    .catch(() => {
      /* 降级态骨架常驻或无 [data-home]：超时即当沉降完成 */
    });
  await page.waitForTimeout(400);
}

export interface VtWindowSample {
  /** 窗口内 old(root) 出现过的动画名集合（含伪元素树未建时的 "none"） */
  oldAnims: string[];
  /** 窗口内 new(root) 出现过的动画名集合 */
  newAnims: string[];
  /** 窗口内出现过的 <html> 类（只回报 watch 里点名的） */
  classesSeen: string[];
  /** 窗口内在飞的 root 伪元素动画最大声明时长 */
  declaredMs: number | null;
}

/**
 * rAF 逐帧采样器：语法类挂在 native startViewTransition **之前**，那一帧伪元素树
 * 还没建（读到 "none"），所以「类出现即取证」不够——必须采样整个窗口收集出现过的
 * 动画名集合。用于：
 * · 换肤 morph 的负向守卫（应见 UA 默认 fade，不见 rift-old，语法类零出现）；
 * · intensity===0 人格的路由过渡（同上）；
 * · T2 崩解的正向证据（rift-collapse-old / rift-collapse-new）。
 * 采到真动画后再空 6 帧收摊，上限 durationMs（慢编译路由由调用方放宽）。
 * 性能注意：`declared: true` 会逐帧 `getAnimations({subtree:true})`（贵）——并行 worker 下
 * 实测足以拖慢客户端路由提交，只在真需要声明时长做预算门禁时打开。
 */
export interface VtSampleOptions {
  /** 采样窗口上限（默认 2500ms） */
  durationMs?: number;
  /** 是否逐帧枚举在飞动画拿声明时长（默认 false，只要动画名） */
  declared?: boolean;
}

export function sampleVtWindow(
  page: Page,
  watch: string[],
  opts: VtSampleOptions = {},
): Promise<VtWindowSample> {
  const { durationMs = 2500, declared = false } = opts;
  return page.evaluate(
    ([cls, ms, wantDeclared]) =>
      new Promise<VtWindowSample>((resolve) => {
        const el = document.documentElement;
        const oldAnims = new Set<string>();
        const newAnims = new Set<string>();
        const classesSeen = new Set<string>();
        const deadline = performance.now() + ms;
        let liveSeen = false;
        let blankFrames = 0;
        let declaredMs: number | null = null;
        const step = () => {
          for (const c of cls) if (el.classList.contains(c)) classesSeen.add(c);
          const o = getComputedStyle(
            el,
            "::view-transition-old(root)",
          ).animationName;
          const n = getComputedStyle(
            el,
            "::view-transition-new(root)",
          ).animationName;
          oldAnims.add(o);
          newAnims.add(n);
          if (wantDeclared) {
            const flying = el.getAnimations({ subtree: true }).filter((a) => {
              const p = (a.effect as KeyframeEffect | null)?.pseudoElement;
              return typeof p === "string" && p.startsWith("::view-transition");
            });
            for (const a of flying) {
              const d = Number(
                (a.effect as KeyframeEffect).getTiming().duration,
              );
              if (Number.isFinite(d)) declaredMs = Math.max(declaredMs ?? 0, d);
            }
          }
          if (o !== "none" || n !== "none") {
            liveSeen = true;
            blankFrames = 0;
          } else if (liveSeen) {
            blankFrames += 1;
          }
          const now = performance.now();
          if ((liveSeen && blankFrames > 6) || now > deadline) {
            resolve({
              oldAnims: [...oldAnims],
              newAnims: [...newAnims],
              classesSeen: [...classesSeen],
              declaredMs,
            });
            return;
          }
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }),
    [watch, durationMs, declared] as [string[], number, boolean],
  );
}
