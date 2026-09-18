"use client";

import { useEffect, useRef } from "react";
import type { FxProps } from "@/lib/fx/registry";
import { usePrefersReducedMotion } from "@/lib/motion/reduced";

export function starCount(area: number, tier: FxProps["tier"]): number {
  const factor = tier === "high" ? 1 : tier === "mid" ? 0.5 : 0.25;
  return Math.min(300, Math.max(24, Math.round((area / 12000) * factor)));
}

interface Star {
  x: number;
  y: number;
  r: number;
  speed: number;
  phase: number;
}

function makeStars(count: number, w: number, h: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 1.2 + 0.3,
    speed: Math.random() * 0.02 + 0.005,
    phase: Math.random() * Math.PI * 2,
  }));
}

export function Starfield({ intensity, tier }: FxProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    let raf = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      stars = makeStars(starCount(w * h, tier), w, h);
    };

    const draw = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const twinkle = 0.55 + 0.45 * Math.sin(t * 0.001 + s.phase);
        ctx.globalAlpha = intensity * twinkle * 0.9;
        ctx.fillStyle = "#e8ecf1";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    resize();
    window.addEventListener("resize", resize);

    if (reduced) {
      draw(0); // 静态一帧
      canvas.dataset.static = "true";
      return () => window.removeEventListener("resize", resize);
    }

    let last = 0;
    const loop = (t: number) => {
      const dt = last ? (t - last) / 1000 : 0;
      last = t;
      for (const s of stars) {
        s.y += s.speed * dt * 60;
        if (s.y > h + 2) s.y = -2;
      }
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = 0;
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intensity, tier, reduced]);

  return (
    <canvas
      ref={ref}
      data-fx="starfield"
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}
