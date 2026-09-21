"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/motion/reduced";
import { useThemeStore } from "@/stores/theme-store";

/**
 * 幕环光标（spec §2.1 G3）：1px 圆环 rAF lerp(0.16) 惯性跟手；
 * 悬停 a/button/[role=dialog] 时 data-hot → CSS 放大 2.1× 转 warning 描边。
 * 铁律「动效不写 React state」：位置直接写 DOM 的 translate 属性，
 * CSS 只管 transform: scale —— 两通道不碰撞。pointer:coarse 由 CSS 隐藏。
 */
export function CursorRing() {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let x = 0;
    let y = 0;
    let tx = 0;
    let ty = 0;
    let raf = 0;
    const move = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      const t = e.target as HTMLElement | null;
      el.current?.setAttribute(
        "data-hot",
        String(!!t?.closest?.("a,button,[role=dialog]")),
      );
    };
    const loop = () => {
      x += (tx - x) * 0.16;
      y += (ty - y) * 0.16;
      if (el.current) el.current.style.translate = `${x}px ${y}px`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("mousemove", move);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("mousemove", move);
      cancelAnimationFrame(raf);
    };
  }, []);
  return <div ref={el} data-cursor-ring className="cursor-ring" aria-hidden />;
}

/**
 * hum 门控：resolved tremor>0 且 !reduced 才挂幕环光标。
 * hum 关闭联动：nav/footer 为服务端组件读不到 store，hum-tremor 类常渲染，
 * 故 off 时给 <html> 挂 .hum-off，由 globals.css `.hum-off .hum-tremor` 停颤。
 */
export function HumGate() {
  const tremor = useThemeStore((s) => s.resolved.effects.hum.tremor);
  const reduced = usePrefersReducedMotion();
  const off = tremor <= 0 || reduced;
  // 幕环只在水合后挂载：SSR 无从得知 prefers-reduced-motion，
  // 若首帧直判会 SSR 渲染/客户端 null （或反之）→ hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    document.documentElement.classList.toggle("hum-off", off);
    return () => document.documentElement.classList.remove("hum-off");
  }, [off]);
  if (!mounted || off) return null;
  return <CursorRing />;
}
