"use client";

import { gsap } from "gsap";
import { cssEase } from "@/lib/motion/gsap";
import type { ThemeMotion } from "@/themes/contract";

/**
 * 把一次会改变 DOM 的同步变更包进原生 View Transition（整站跨主题 morph）。
 * 特性检测 + reduced-motion 尊重：不支持或用户偏好少动画时直接执行，绝不报错。
 * morph 期间给 <html> 挂 `.theme-morph`：T1 撕幕的 root 动画被它门控成「只归路由」，
 * 换肤继续走 UA 默认交叉淡入（一次转场一种语法，spec §2.2 铁律 3）。
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
  const root = document.documentElement;
  root.classList.add("theme-morph");
  const settle = () => root.classList.remove("theme-morph");
  try {
    void document.startViewTransition(mutate).finished.then(settle, settle);
  } catch (err) {
    settle();
    throw err;
  }
}

/** T1 撕幕总预算（spec §7 红线：T1 ≤300ms）；时长 = min(300, ui+20) */
const T1_BUDGET_MS = 300;

/** rift-layer 挂载后经 window.__rift 暴露的 uniform 状态机（只取 T1 需要的两通道） */
type RiftDriverScope = {
  __rift?: { setTear(p: number): void; setShift(v: number): void };
};

/** React/Next 路由过渡的调用形态：startViewTransition({ update, types }) */
type RiftTransitionArg =
  | ViewTransitionUpdateCallback
  | StartViewTransitionOptions;

/** 只在 React 路由过渡（options 形态且未点名让路）上导演 T1；
 *  回调形态是我们自己的过渡（主题 morph、Task 7 的 T2 崩解），语法各管各的 */
function isRiftRouteTransition(arg?: RiftTransitionArg) {
  if (!arg || typeof arg === "function") return false;
  const types: unknown = arg.types;
  if (Array.isArray(types) && types.some((t) => String(t).startsWith("rift-")))
    return false;
  return typeof arg.update === "function";
}

/**
 * T1 定格撕幕导演：包装 `document.startViewTransition`，每次路由过渡——
 * 1. 动画真正起跑（ready）时给 <html> 挂 `rift-tear`（样式/测试钩子，finished 即摘）；
 * 2. 若 rift-layer 存活（window.__rift），GSAP 时间线同步驱动 shader uniform：
 *    uTear 0→1，前 1/4 程缝上 ±1 逐帧交替的 RGB 分离（spec「RGB 分离 2 帧收束」）；
 * 3. finished 后归零。React 不持有动画状态（铁律）；reduced-motion 直接不导演
 *    （CSS 侧另有 animation:none 一键静态化，这里是计时源层面的尊重）。
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
 * @param getMotion 取当前生效 motion token（每次过渡时调用，拿 store 最新值）
 * @returns 还原函数（卸掉包装）
 */
export function installRiftTransitionDriver(
  getMotion: () => ThemeMotion,
): () => void {
  if (typeof window === "undefined") return () => {};
  const native = document.startViewTransition;
  if (typeof native !== "function") return () => {};
  if ((native as { __riftDriver?: boolean }).__riftDriver) return () => {};

  // 并发/被打断的过渡共用一个标记：计数到 0 才摘类，时间线只保留最新一条
  let active = 0;
  let tween: { kill(): void } | null = null;

  function drive(transition: ViewTransition) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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
        const motion = getMotion();
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

  const patched = function (this: Document, arg?: RiftTransitionArg) {
    const transition = native.call(this, arg);
    if (isRiftRouteTransition(arg)) drive(transition);
    return transition;
  };
  (patched as { __riftDriver?: boolean }).__riftDriver = true;
  document.startViewTransition = patched;

  return () => {
    if (document.startViewTransition === patched)
      document.startViewTransition = native;
  };
}
