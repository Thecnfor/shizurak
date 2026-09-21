"use client";

import { useEffect } from "react";
import { installRiftTransitionDriver } from "@/lib/motion/vt";
import { useThemeStore } from "@/stores/theme-store";

/**
 * T1 定格撕幕导演（spec §2.2）：包装 document.startViewTransition，只装一次，
 * 挂在 (site)/layout。Link 点击与 router.push（⌘K）的路由提交都由 React 走这个入口，
 * 所以包一层就能同时接住两条路径；回调形态的过渡（主题 morph / Task 7 的 T2）不参与。
 * （为何不用 viewtransition 事件、选型实测数据见 vt.ts 注释与 Task 6 报告。）
 * motion 每次过渡时从 store 现取（滑杆改 motionSpeed 即时生效，不重装修饰器）。
 */
export function RiftDirector() {
  useEffect(
    () =>
      installRiftTransitionDriver(
        () => useThemeStore.getState().resolved.motion,
      ),
    [],
  );
  return null;
}
