"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/motion/reduced";
import { useThemeStore } from "@/stores/theme-store";

/**
 * 幕环光标（spec §2.1 G3）：1px 圆环 rAF lerp(0.16) 惯性跟手；
 * 悬停 a/button/[role=dialog] 时 data-hot → CSS 放大 2.1× 转 warning 描边。
 * 铁律「动效不写 React state」：位置直接写 DOM 的 translate 属性，
 * CSS 只管 transform: scale —— 两通道不碰撞。静息（追平目标）时停帧，
 * 由下一次 mousemove 唤醒；pointer:coarse 双保险：JS 不挂载 + CSS 隐藏。
 */
export function CursorRing() {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let x = 0;
    let y = 0;
    let tx = 0;
    let ty = 0;
    let raf = 0;
    const wake = () => {
      if (raf === 0) raf = requestAnimationFrame(loop);
    };
    const move = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      const t = e.target as HTMLElement | null;
      el.current?.setAttribute(
        "data-hot",
        String(!!t?.closest?.("a,button,[role=dialog]")),
      );
      wake(); // 静息停帧后的唯一唤醒源
    };
    function loop() {
      x += (tx - x) * 0.16;
      y += (ty - y) * 0.16;
      if (el.current) el.current.style.translate = `${x}px ${y}px`;
      // 追平目标即停帧：光标静止时不为一个不动的圆环白烧 rAF（底噪审计：待机无动画节点）
      if (Math.abs(tx - x) + Math.abs(ty - y) < 0.05) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(loop);
    }
    window.addEventListener("mousemove", move);
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
  useEffect(() => {
    // 幕环只在 fine 指针（鼠标/触控板）上挂：coarse 设备无光标可跟，
    // CSS 的 display:none 只藏形、不省 JS，故这里直接从源头不挂载
    if (window.matchMedia("(pointer: fine)").matches) setMounted(true);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("hum-off", off);
    return () => document.documentElement.classList.remove("hum-off");
  }, [off]);
  if (!mounted || off) return null;
  return <CursorRing />;
}
