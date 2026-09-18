import { describe, expect, it } from "vitest";
import { starCount } from "./starfield";

describe("starCount", () => {
  it("与分级正相关且封顶 300", () => {
    expect(starCount(1_920 * 1_080, "high")).toBeLessThanOrEqual(300);
    expect(starCount(1_920 * 1_080, "high")).toBeGreaterThan(
      starCount(1_920 * 1_080, "mid"),
    );
  });
  it("低端设备最少", () => {
    expect(starCount(1_920 * 1_080, "low")).toBeLessThan(
      starCount(1_920 * 1_080, "mid"),
    );
  });
});
