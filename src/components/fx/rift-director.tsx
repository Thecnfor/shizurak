"use client";

import { useEffect } from "react";
import { installRiftTransitionDriver } from "@/lib/motion/vt";
import { useThemeStore } from "@/stores/theme-store";

/**
 * 幕语法导演（spec §2.2）：包装 document.startViewTransition，只装一次，
 * 挂在 (site)/layout。Link 点击与 router.push（⌘K）的路由提交都由 React 走这个入口，
 * 所以包一层就能同时接住两条路径；回调形态的过渡（主题 morph）不参与语法派发。
 * （为何不用 viewtransition 事件、选型实测数据见 vt.ts 注释与 Task 6 报告。）
 * motion 与 rift 烈度每次过渡从 store 现取成快照（滑杆改 motionSpeed/riftIntensity
 * 即时生效，不重装修饰器）——烈度是正向语法类的闸门：intensity 为 0 的人格
 * （lumen/paper）路由过渡不挂 rift-* 类，直接落回 UA 默认交叉淡入。
 */
export function RiftDirector() {
  useEffect(() => {
    const un = installRiftTransitionDriver(() => {
      const { resolved } = useThemeStore.getState();
      return {
        motion: resolved.motion,
        riftIntensity: resolved.effects.rift.intensity,
      };
    });
    // gsap 已拆出首载（T10 补记）：空闲预温一次，让首撕/首崩解的 shader 时间线
    // 不被 chunk 拉取打断。两个闸门：reduced 下任何幕时间线都不跑；烈度 0 的人格
    // （lumen/paper）根本进不了语法派发——都不该花这个请求。
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let warmed = false;
    const warmWhenEligible = (intensity: number) => {
      if (warmed || reduced || intensity <= 0) return;
      warmed = true;
      const warm = () => {
        void import("@/lib/motion/gsap").catch(() => {});
      };
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(warm, { timeout: 3000 });
      } else {
        window.setTimeout(warm, 1500);
      }
    };
    warmWhenEligible(useThemeStore.getState().resolved.effects.rift.intensity);
    // 换肤把烈度从 0 抬起来时（lumen→void）补一次预温，之后的过渡不裸奔
    const unsubTheme = useThemeStore.subscribe((s, prev) => {
      if (
        s.resolved.effects.rift.intensity !==
        prev.resolved.effects.rift.intensity
      )
        warmWhenEligible(s.resolved.effects.rift.intensity);
    });
    return () => {
      unsubTheme();
      un();
    };
  }, []);
  return null;
}
