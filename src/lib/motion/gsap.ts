import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { ThemeMotion } from "@/themes/contract";

let registered = false;

export function registerGsap(): void {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(useGSAP, ScrollTrigger);
  registered = true;
}

export function applyMotionDefaults(motion: ThemeMotion): void {
  registerGsap();
  gsap.defaults({
    ease: motion.gsap.ease,
    duration: motion.duration.ui / 1000,
  });
}

const easeCache = new Map<string, EaseFunction>();

/**
 * CSS `cubic-bezier(...)` → GSAP ease。GSAP 不解析 CSS 曲线字面量
 * （`gsap.parseEase("cubic-bezier(...)")` 返回 undefined，运行期静默回到默认缓动），
 * 而主题契约里的 easing 就是这个形状：不换算则 `motion.easing.*` 全是装饰。
 * 这里用已装依赖里的 CustomEase 折成同一条曲线（不手搓求根）。
 * 解析不出 4 个数则返回 undefined，由调用方回退到 `motion.gsap.ease`（同为 token）。
 */
export function cssEase(css: string): EaseFunction | undefined {
  const hit = easeCache.get(css);
  if (hit) return hit;
  const nums = css
    .match(/cubic-bezier\(([^)]+)\)/)?.[1]
    ?.split(",")
    .map((v) => Number(v.trim()));
  if (!nums || nums.length !== 4 || !nums.every(Number.isFinite))
    return undefined;
  registerGsap();
  gsap.registerPlugin(CustomEase);
  const [x1, y1, x2, y2] = nums;
  const ease = CustomEase.create(
    `cb-${nums.join("_")}`,
    `M0,0 C${x1},${y1} ${x2},${y2} 1,1`,
  );
  easeCache.set(css, ease);
  return ease;
}
