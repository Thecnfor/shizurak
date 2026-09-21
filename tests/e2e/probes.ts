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
}

/**
 * 类生命周期探针：MutationObserver 盯 <html> 的 class，出现记 t0 并现场取证
 * （伪元素动画名 + 声明时长），消失回报存活时长。
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
}

export function watchClassLifecycle(
  page: Page,
  className: string,
  opts: ClassLifecycleOptions = {},
): Promise<ClassLifecycle> {
  const { timeoutMs = 2500, graceMs = 1200 } = opts;
  return page.evaluate(
    ([cls, ms, grace]) =>
      new Promise<ClassLifecycle>((resolve) => {
        const el = document.documentElement;
        const has = () => el.classList.contains(cls);
        /** 出现那一帧的现场证据：动画名 + 在飞的 root 伪元素动画声明时长 */
        const evidence = () => {
          const anim = getComputedStyle(
            el,
            "::view-transition-old(root)",
          ).animationName;
          // React 自己也是这样枚举伪元素动画的（见 react-dom 的 startViewTransition）
          const flying = el.getAnimations({ subtree: true }).filter((a) => {
            const p = (a.effect as KeyframeEffect | null)?.pseudoElement;
            return typeof p === "string" && p.startsWith("::view-transition");
          });
          const declared = flying.length
            ? Math.max(
                ...flying.map(
                  (a) =>
                    Number((a.effect as KeyframeEffect).getTiming().duration) ||
                    0,
                ),
              )
            : null;
          return { anim, declared };
        };
        let t0 = 0;
        let oldAnim: string | null = null;
        let declaredMs: number | null = null;
        let hang = 0;
        const finish = (heldMs: number | null) => {
          mo.disconnect();
          window.clearTimeout(appear);
          if (hang) window.clearTimeout(hang);
          resolve({ seen: t0 > 0, heldMs, oldAnim, declaredMs });
        };
        const arm = () => {
          t0 = performance.now();
          ({ anim: oldAnim, declared: declaredMs } = evidence());
          hang = window.setTimeout(() => finish(null), grace);
        };
        const mo = new MutationObserver(() => {
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
        if (has()) {
          arm();
          window.clearTimeout(appear);
        }
      }),
    [className, timeoutMs, graceMs] as [string, number, number],
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
