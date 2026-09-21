"use client";

import { gsap } from "gsap";
import { cssEase } from "@/lib/motion/gsap";
import type { ThemeMotion } from "@/themes/contract";

/**
 * 把一次会改变 DOM 的同步变更包进原生 View Transition（整站跨主题 morph）。
 * 特性检测 + reduced-motion 尊重：不支持或用户偏好少动画时直接执行，绝不报错。
 * 换肤 morph 走回调形态 startViewTransition(mutate)——RiftDirector 的语法派发
 * 只认 options 形态（isRiftRouteTransition），morph 因此永远拿不到 rift 语法类，
 * 天然落回 UA 默认交叉淡入（一次转场一种语法，spec §2.2 铁律 3）。
 * 旧 `.theme-morph` 负向门控类已随「正向语法类」架构上线而退役：它没有别的
 * 消费方（全局检索仅 CSS 门控与本文件），删类删到连测试期望一起。
 * 见设计规范 §6.4。
 */
export function withThemeViewTransition(mutate: () => void): void {
  if (typeof window === "undefined") {
    mutate();
    return;
  }
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !document.startViewTransition) {
    mutate();
    return;
  }
  void document.startViewTransition(mutate);
}

/** T1 撕幕总预算（spec §7 红线：T1 ≤300ms）；时长 = min(300, ui+20) */
const T1_BUDGET_MS = 300;
/** T2 崩解总预算（spec §2.2 给 400–600ms 区间，取上界为封顶）；
 *  时长 = min(600, duration.section)，与 CSS --rift-t2-duration 同源写入 */
const T2_BUDGET_MS = 600;

/**
 * rift-layer 挂载后经 window.__rift 暴露的 uniform 状态机（T1 取 tear/shift，
 * T2 取 collapse；三条通道各自独立，可并发）。
 */
type RiftDriverScope = {
  __rift?: {
    setTear(p: number): void;
    setShift(v: number): void;
    setCollapse(p: number): void;
  };
};

/** React/Next 路由过渡的调用形态：startViewTransition({ update, types })。
 *  types 按规范是 iterable<字符串>（Next 传 Set、手写代码常传数组），两边都得吃。 */
type RiftTransitionArg =
  | ViewTransitionUpdateCallback
  | (Omit<StartViewTransitionOptions, "types"> & {
      types?: Iterable<string> | null;
    });

/** 取 options 里的 types（数组/Set 归一化成 string[]；无则空数组） */
function readTypes(arg: RiftTransitionArg): string[] {
  const types = (arg as { types?: unknown }).types;
  if (Array.isArray(types)) return types.map(String);
  if (
    types &&
    typeof (types as Iterable<string>)[Symbol.iterator] === "function"
  )
    return [...(types as Iterable<string>)].map(String);
  return [];
}

/** 纯形态判定：是不是「React 路由过渡」那次调用（options 形态且有 update 回调）。
 *  我们自己的过渡（主题 morph 等）走回调形态，一律不吃幕语法。 */
export function isRouteTransitionCall(arg?: RiftTransitionArg): boolean {
  if (!arg || typeof arg === "function") return false;
  return typeof arg.update === "function";
}

/** T1 默认语法的资格：路由过渡 且 types 里没点名任何 rift-*。
 *  rift-* 前缀是「这次过渡自带语法诉求」的信号（Link 的 transitionTypes，
 *  或 React 具名 <ViewTransition> 生成的类型），T1 让路。
 *  导出供单测直拷断言各调用形态（M-5）。 */
export function isRiftRouteTransition(arg?: RiftTransitionArg): boolean {
  if (!isRouteTransitionCall(arg)) return false;
  return !readTypes(arg).some((t) => t.startsWith("rift-"));
}

/** 语法正向类名（globals.css 门控锚点）：T1 定格撕幕 / T2 信号崩解。 */
export type RiftGrammar = "rift-t1" | "rift-t2";

/** Link 的 transitionTypes 值 → 语法类（T2 目前只有崩解一种点名） */
const COLLAPSE_TYPE = "rift-collapse";

/** 语法闸门输入：每次 startViewTransition 调用时从 store 现取 */
export interface RiftGate {
  reduced: boolean;
  /** resolved.effects.rift.intensity：幕语法总开关，0 = 任何语法类都不挂 */
  intensity: number;
}

/**
 * 在 native startViewTransition **调用之前**同步判定该挂哪个语法类——硬时序
 * 约束：root 伪元素树建立时即查询 animation-name，类必须彼时就位，ready 之后
 * 再挂就来不及（rift-tear 是 JS 驱动锚点，不承担这个职责）。
 * 派发顺序即两条铁律的执行点：先形态（只有路由过渡可能有语法），再烈度/减少动画
 * 门（lumen、paper 等 intensity===0 的人格与 reduced 一律不挂类），最后按 types
 * 点名挑语法：rift-collapse → rift-t2；其它 rift-* → 让路（null）；无点名 → rift-t1。
 * 不挂类也意味着对应 shader 时间线根本不起跑——修掉负向门控时代
 * 「K=0 人格照跑 tear 窗口」的窗口错位缺陷。纯函数，导出供单测。
 */
export function riftGrammarFor(
  arg: RiftTransitionArg | undefined,
  gate: RiftGate,
): RiftGrammar | null {
  if (!isRouteTransitionCall(arg)) return null;
  if (gate.reduced || gate.intensity <= 0) return null;
  const types = readTypes(arg);
  if (types.includes(COLLAPSE_TYPE)) return "rift-t2";
  if (types.some((t) => t.startsWith("rift-"))) return null;
  return "rift-t1";
}

/** 导演每次过渡现取的运行时快照（来自 theme store 的 resolved） */
export interface RiftDriverSnapshot {
  motion: ThemeMotion;
  riftIntensity: number;
}

/**
 * 幕语法导演：包装 `document.startViewTransition`，每次过渡——
 * 1. riftGrammarFor 在 native 调用前同步决定语法正向类（rift-t1 / rift-t2），
 *    finished（含跳过/异常）即摘；并发过渡按类计数，归零才摘。语法类绝不许永久
 *    粘在 <html> 上，所以 finished 之外再加一道看门狗（预算 +1500ms）兜底。
 * 2. T1：动画真正起跑（ready）时再挂 `rift-tear`（样式/测试钩子），
 *    若 rift-layer 存活（window.__rift），GSAP 时间线同步驱动 shader uniform：
 *    uTear 0→1；前 1/4 程（300ms 预算 ≈ 4–5 帧）uRGBShift 逐帧翻号制造
 *    RGB 分离抖动，1/4 程后归位收束——spec「RGB 分离 2 帧收束」落为按
 *    时长比例的这一实现，不是字面固定 2 帧（诚实注记，M-2）。
 * 3. T2：同样以 ready 为起算锚（与 CSS 伪元素动画同起点，不然 shader 与画面错位），
 *    驱动 uCollapse：0→峰值占时长 45%（正对 CSS 里旧幕消失/新幕现身的交叠窗口），
 *    再 1→0 收在时长尾（碎屑聚合回新幕）；tween 归该 transition 的闭包所有
 *    （T1/T2 可并发，全局单 tween 会互相干掉对方的动画）。
 * 4. finished 后归零。React 不持有动画状态（铁律）；reduced-motion 在
 *    语法闸第一步就被拦掉（CSS 侧另有 animation:none 一键静态化，
 *    这里是计时源层面的尊重）。
 *
 * 挂接点选型（实测 headless Chromium 153 / Next 16 / React 19.2）：
 * 原计划用 document 级 `viewtransition` 事件——该构建里事件根本不存在
 * （`"onviewtransition" in document === false`，手动 startViewTransition 也计到 0 次派发），
 * 监听器方案直接否掉。改为包装 `document.startViewTransition`：React 在
 * `ownerDocument.startViewTransition({ update, types })` 处**按调用时属性查找**取用
 * （见 next/dist/compiled/react-dom 的 startViewTransition()），故水合后装上的包装
 * 能同时接住 Link 点击与 router.push（⌘K go()）两条路径——实测各计到 1 次调用。
 * 代价：改的是 document 实例属性，须保证只装一次且可还原（下方 __riftDriver 幂等标记）。
 *
 * @param getSnapshot 取当前生效 resolved 快照（每次过渡时调用，拿 store 最新值）
 * @returns 还原函数（卸掉包装）
 */
export function installRiftTransitionDriver(
  getSnapshot: () => RiftDriverSnapshot,
): () => void {
  if (typeof window === "undefined") return () => {};
  const native = document.startViewTransition;
  if (typeof native !== "function") return () => {};
  if ((native as { __riftDriver?: boolean }).__riftDriver) return () => {};

  // 并发/被打断的过渡共用一个标记：每类计数到 0 才摘类
  const held: Record<RiftGrammar, number> = { "rift-t1": 0, "rift-t2": 0 };
  // T1 的 tear 时间线是全局共用的最新一条（同一时刻只有一幕在撕）；
  // T2 的 collapse 时间线不在这里挂账——每条过渡自己持有（见 driveCollapse）
  let active = 0;
  let tween: { kill(): void } | null = null;

  const release = (grammar: RiftGrammar) => {
    held[grammar] -= 1;
    if (held[grammar] <= 0) {
      held[grammar] = 0;
      document.documentElement.classList.remove(grammar);
      // T2 时长 var 随类同计数归零：并发两条 T2 时，先结束的那条不许提前抽掉
      // 后一条还在消费的门控变量（否则 CSS 退回默认 600ms，与在飞时间线错位）
      if (grammar === "rift-t2")
        document.documentElement.style.removeProperty("--rift-t2-duration");
    }
  };

  function driveTear(transition: ViewTransition, motion: ThemeMotion) {
    const root = document.documentElement;
    const rift = (window as unknown as RiftDriverScope).__rift;
    let animating = false;

    // 起算点＝ ready 落地（快照已拍、DOM 已换、CSS 动画正起跑），不从 startViewTransition
    // 调用点起算：那里还夹着 RSC 取数与 Suspense 解挂，可能白等数百 ms 而无动画
    void transition.ready.then(
      () => {
        animating = true;
        active += 1;
        root.classList.add("rift-tear");
        // 时长从 motion token 推导（ui+20 是「撕幕比常规 UI 更重一点」的语义小加量），
        // Math.min 封顶守 §7 红线（motionSpeed=0.5 时同样被封顶），
        // 并与 globals.css 的 animation-duration: 300ms 同窗
        const duration = Math.min(T1_BUDGET_MS, motion.duration.ui + 20) / 1000;
        tween?.kill();
        const state = { p: 0 };
        let shiftSign = 1;
        tween = gsap.to(state, {
          p: 1,
          duration,
          ease: cssEase(motion.easing.rift) ?? motion.gsap.ease,
          onUpdate() {
            rift?.setTear(state.p);
            // 前 1/4 程每帧翻一次符号（±1 交替的 RGB 分离），之后归位
            if (state.p < 0.25) {
              shiftSign = -shiftSign;
              rift?.setShift(shiftSign);
            } else {
              rift?.setShift(0);
            }
          },
        });
      },
      () => {
        // ready 拒绝 = 过渡被跳过（没画面变化）：无动画可不导演
      },
    );

    const settle = () => {
      if (!animating) return;
      animating = false;
      active -= 1;
      if (active > 0) return; // 还有别的过渡在飞
      active = 0;
      tween?.kill();
      tween = null;
      root.classList.remove("rift-tear");
      rift?.setTear(0);
      rift?.setShift(0);
    };
    void transition.finished.then(settle, settle);
  }

  /**
   * T2 崩解时间线：驱动 uCollapse（块状崩解→聚合）。
   * 起算锚同样选 ready——那一时刻快照已拍、DOM 已换、CSS 侧 rift-collapse-*
   * 刚起跑；从 startViewTransition 调用点起算会夹进 RSC 取数/解挂（实测可达秒级），
   * shader 先起碎屑而画面尚未换。
   * tween 归本条过渡的闭包：并发两条 T2（或 T1+T2）各自记账，互不干掉对方的动画。
   */
  function driveCollapse(
    transition: ViewTransition,
    motion: ThemeMotion,
    totalMs: number,
  ) {
    const rift = (window as unknown as RiftDriverScope).__rift;
    const ease = cssEase(motion.easing.rift) ?? motion.gsap.ease;
    const state = { p: 0 };
    let flight: { kill(): void } | null = null;
    let started = false;

    void transition.ready.then(
      () => {
        started = true;
        // 两段一条：0→峰占 45%（CSS 侧旧幕至 55% 完全隐去、新幕从 45% 起显现，
        // 交叠窗口是 [45%,55%]：峰值正落在窗口起点 45%，即新幕开始现身、碎屑最盛处），
        // 峰→0 占余下 55%，
        // 总时长与 CSS 动画同窗；onUpdate 挂在时间线上，每帧只回写一次 uniform
        flight = gsap
          .timeline({
            onUpdate() {
              rift?.setCollapse(state.p);
            },
          })
          .to(state, { p: 1, duration: (totalMs * 0.45) / 1000, ease })
          .to(state, { p: 0, duration: (totalMs * 0.55) / 1000, ease });
      },
      () => {
        // ready 拒绝 = 过渡被跳过（没画面变化）：无动画可不导演
      },
    );

    const settle = () => {
      flight?.kill();
      flight = null;
      if (started) rift?.setCollapse(0);
    };
    void transition.finished.then(settle, settle);
  }

  const patched = function (this: Document, arg?: RiftTransitionArg) {
    const snapshot = getSnapshot();
    const grammar = riftGrammarFor(arg, {
      reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      intensity: snapshot.riftIntensity,
    });
    const root = document.documentElement;
    // T2 时长在挂类前同步落到 <html>，与下面 GSAP 时间线同源：
    // motionSpeed（或 section 本身）改变时 CSS/JS 不会错位，而 CSS 默认值 600ms
    // 保证即便导演未跑也不会断链
    const collapseMs = Math.min(T2_BUDGET_MS, snapshot.motion.duration.section);
    if (grammar) {
      held[grammar] += 1;
      if (grammar === "rift-t2")
        root.style.setProperty("--rift-t2-duration", `${collapseMs}ms`);
      root.classList.add(grammar);
    }
    let transition: ViewTransition;
    try {
      transition = native.call(this, arg);
    } catch (err) {
      if (grammar) release(grammar);
      throw err;
    }
    if (grammar) {
      if (grammar === "rift-t1") driveTear(transition, snapshot.motion);
      else driveCollapse(transition, snapshot.motion, collapseMs);
      // 语法类只能同窗存在：永久粘住会把整站钉在一条已结束的幕语法上。
      // finished 在正常路径里必到（跳过也 resolve），看门狗只作为放弃/挂死的保险
      const budget = grammar === "rift-t2" ? collapseMs : T1_BUDGET_MS;
      let settled = false;
      let watchdog = 0;
      const done = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(watchdog);
        release(grammar); // T2 的 --rift-t2-duration 清理在 release 的归零分支里，与类同计数
      };
      watchdog = window.setTimeout(done, budget + 1500);
      void transition.finished.then(done, done);
    }
    return transition;
  };
  (patched as { __riftDriver?: boolean }).__riftDriver = true;
  document.startViewTransition = patched;

  return () => {
    if (document.startViewTransition === patched)
      document.startViewTransition = native;
  };
}
