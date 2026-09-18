import { describe, expect, it } from "vitest";
import { detectTier } from "./tier";

describe("detectTier", () => {
  it("无 WebGL2 → low", () => {
    expect(detectTier({ hasWebGL2: false, deviceMemory: 16 })).toBe("low");
  });
  it("省流量 → mid", () => {
    expect(
      detectTier({ hasWebGL2: true, deviceMemory: 16, saveData: true }),
    ).toBe("mid");
  });
  it("内存充足 → high", () => {
    expect(detectTier({ hasWebGL2: true, deviceMemory: 8 })).toBe("high");
  });
  it("内存未知按 8 处理 → high", () => {
    expect(detectTier({ hasWebGL2: true })).toBe("high");
  });
  it("内存不足 → mid", () => {
    expect(detectTier({ hasWebGL2: true, deviceMemory: 4 })).toBe("mid");
  });
});
