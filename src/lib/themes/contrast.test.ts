import { describe, expect, it } from "vitest";
import { contrastRatio, relativeLuminance } from "./contrast";

describe("contrast", () => {
  it("黑白对比为 21", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });
  it("白底相对亮度为 1", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
  });
  it("非法输入抛错", () => {
    expect(() => contrastRatio("nope", "#fff")).toThrow();
  });
});
