import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
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
