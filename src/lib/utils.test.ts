import { describe, expect, it } from "vitest";
import { cn, fmtDate, postMeta, withDeadline } from "./utils";

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
  it("吃非 Promise 的 thenable（drizzle 查询构建器的真实形状）", async () => {
    // 只要求 then 存在即吃：无 resolve/reject 的裸 thenable 正是 drizzle 的形状；
    // 这里故意仿它，不另包一层 Promise（那就测不到 PromiseLike 口径了）
    const thenable = {
      // biome-ignore lint/suspicious/noThenProperty: 测试目标就是 thenable 协议本身
      then(onfulfilled?: (v: string) => void) {
        setTimeout(() => onfulfilled?.("rows"), 5);
      },
    } as unknown as PromiseLike<string>;
    await expect(withDeadline(thenable, 50, "q")).resolves.toBe("rows");
  });
});

describe("fmtDate / postMeta（信纸行诚实 meta）", () => {
  it("fmtDate：UTC 前 10 位，null 给空串", () => {
    expect(fmtDate(new Date("2026-09-19T23:30:00Z"))).toBe("2026-09-19");
    expect(fmtDate(null)).toBe("");
  });
  it("readingTime 缺失时省略该段，不虚构 '?? 1 min'", () => {
    expect(
      postMeta({
        publishedAt: new Date("2026-09-19T12:00:00Z"),
        readingTime: 3,
      }),
    ).toBe("2026-09-19 · 3 min");
    expect(
      postMeta({
        publishedAt: new Date("2026-09-19T12:00:00Z"),
        readingTime: null,
      }),
    ).toBe("2026-09-19");
    expect(postMeta({ publishedAt: null, readingTime: null })).toBe("");
  });
});
