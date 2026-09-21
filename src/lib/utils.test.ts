import { describe, expect, it } from "vitest";
import { cn, withDeadline } from "./utils";

describe("cn", () => {
  it("合并类名并去重 Tailwind 冲突", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-ink", false && "hidden", "bg-bg")).toBe("text-ink bg-bg");
  });
});

describe("withDeadline", () => {
  it("期限内在飞的 promise 原样透传", async () => {
    await expect(withDeadline(Promise.resolve(42), 50)).resolves.toBe(42);
  });
  it("底层拒绝不被吞掉：按原错误 reject", async () => {
    const boom = new Error("boom");
    await expect(withDeadline(Promise.reject(boom), 50)).rejects.toBe(boom);
  });
  it("超期即 reject（慢 promise 不再押住调用方）", async () => {
    const slow = new Promise<number>((r) => setTimeout(() => r(1), 500));
    await expect(withDeadline(slow, 10, "signals")).rejects.toThrow(
      /signals: deadline 10ms exceeded/,
    );
  });
});
