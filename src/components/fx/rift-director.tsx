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
  useEffect(
    () =>
      installRiftTransitionDriver(() => {
        const { resolved } = useThemeStore.getState();
        return {
          motion: resolved.motion,
          riftIntensity: resolved.effects.rift.intensity,
        };
      }),
    [],
  );
  return null;
}
