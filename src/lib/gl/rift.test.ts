import { describe, expect, it } from "vitest";
import { createRiftState } from "@/lib/gl/rift";

describe("rift state", () => {
  it("idle：只有 breath；tear/collapse 一次性", () => {
    const s = createRiftState({ breath: 0.6, intensity: 0.7 });
    expect(s.u.t).toBe(0);
    s.setTear(0.5);
    expect(s.u.tear).toBeCloseTo(0.35); // 0.5 × intensity
    s.setTear(0);
    expect(s.u.tear).toBe(0);
    s.setCollapse(1);
    expect(s.u.collapse).toBeCloseTo(0.7); // min(1,1) × intensity
    s.setCollapse(1.5); // 超量程先钳到 1 再乘烈度
    expect(s.u.collapse).toBeCloseTo(0.7);
    s.setShift(0.5);
    expect(s.u.shift).toBeCloseTo(0.35);
    s.setHum(0);
    expect(s.u.breath).toBe(0);
  });
});
