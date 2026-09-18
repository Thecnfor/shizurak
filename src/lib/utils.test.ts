import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("合并类名并去重 Tailwind 冲突", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-ink", false && "hidden", "bg-bg")).toBe("text-ink bg-bg");
  });
});
