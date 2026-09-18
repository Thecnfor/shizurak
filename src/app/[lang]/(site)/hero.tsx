"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { useRef } from "react";
import { registerGsap } from "@/lib/motion/gsap";
import { usePrefersReducedMotion } from "@/lib/motion/reduced";
import { useThemeStore } from "@/stores/theme-store";

export function Hero({
  title,
  tagline,
  kicker,
}: {
  title: string;
  tagline: string;
  kicker: string;
}) {
  const root = useRef<HTMLElement>(null);
  const motion = useThemeStore((s) => s.resolved.motion);
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      registerGsap();
      const el = root.current;
      if (!el) return;
      if (reduced) {
        el.dataset.anim = "done";
        return;
      }
      const titleEl = el.querySelector("[data-hero-title]");
      if (!titleEl) return;
      const split = new SplitText(titleEl, { type: "chars,words" });
      gsap
        .timeline({
          defaults: {
            ease: motion.easing.entrance,
            duration: motion.duration.section / 1000,
          },
          onComplete: () => {
            el.dataset.anim = "done";
            split.revert();
          },
        })
        .from(split.chars, { autoAlpha: 0, y: 24, stagger: 0.02 })
        .from(
          el.querySelectorAll("[data-hero-fade]"),
          {
            autoAlpha: 0,
            y: 12,
            stagger: 0.08,
            duration: motion.duration.ui / 1000,
          },
          "-=0.4",
        );
    },
    { scope: root, dependencies: [motion, reduced] },
  );

  return (
    <section
      ref={root}
      data-anim="pending"
      className="mx-auto flex min-h-[70vh] max-w-[var(--container-max)] flex-col justify-center px-6"
    >
      <p
        data-hero-fade
        className="font-mono text-xs uppercase tracking-[0.3em] text-accent"
      >
        {kicker}
      </p>
      <h1
        data-hero-title
        className="mt-4 max-w-3xl text-[length:var(--text-display-size)] font-semibold leading-[var(--text-display-lh)] tracking-[var(--text-display-tracking)]"
      >
        {title}
      </h1>
      <p data-hero-fade className="mt-6 max-w-xl text-lg text-ink-muted">
        {tagline}
      </p>
    </section>
  );
}
