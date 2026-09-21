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
  it("setHum：挂载后热更新口径——直接接收 resolved breath（绝对值）", () => {
    const s = createRiftState({ breath: 0.6, intensity: 0.7 });
    s.setHum(0.3);
    expect(s.u.breath).toBeCloseTo(0.3);
    s.setHum(0);
    expect(s.u.breath).toBe(0);
  });
  it("setIntensity：烈度热更，tear/collapse/shift 按新 K 缩放", () => {
    const s = createRiftState({ breath: 0.6, intensity: 0.7 });
    s.setTear(0.5);
    expect(s.u.tear).toBeCloseTo(0.35);
    s.setIntensity(1);
    s.setTear(0.5);
    expect(s.u.tear).toBeCloseTo(0.5);
    s.setCollapse(1);
    expect(s.u.collapse).toBeCloseTo(1);
    s.setShift(0.5);
    expect(s.u.shift).toBeCloseTo(0.5);
    s.setIntensity(0);
    s.setTear(1);
    expect(s.u.tear).toBe(0);
  });
});
