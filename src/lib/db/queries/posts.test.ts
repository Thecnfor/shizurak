import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 空态缓存降档（T10 二审 fix 批次）：DB 故障归空态时不得以 hours 档入缓存。
 * `use cache` 运行时在 vitest 下不存在，故 mock next/cache 断言档位调用序列；
 * 「多次 cacheLife 取最小 revalidate」是 Next 16.3.5 cache-life.js 的既有语义
 * （见 posts.ts 注释），本测赌的是我们的接线，不赌上游实现。
 */
const cacheLife = vi.fn();
const cacheTag = vi.fn();
vi.mock("next/cache", () => ({
  cacheLife: (p: unknown) => cacheLife(p),
  cacheTag: (...a: unknown[]) => cacheTag(...a),
}));

let dbState: "fail" | "rows" = "fail";
const ROWS = [
  {
    slug: "hello",
    title: "Hello",
    summary: null,
    publishedAt: null,
    readingTime: 1,
  },
];

vi.mock("../client", () => ({
  getDb: () => {
    // drizzle 链式 builder 本身是 thenable：select().from().where().orderBy().limit()
    const builder: Record<string, unknown> = {};
    for (const m of ["from", "where", "orderBy", "limit"])
      builder[m] = () => builder;
    // drizzle 查询构造器本就是 thenable，这里如实 mock，必须暴露 then
    // biome-ignore lint/suspicious/noThenProperty: 模拟 drizzle 链式 thenable
    builder.then = (
      onf: (v: unknown) => unknown,
      rej: (e: unknown) => unknown,
    ) =>
      dbState === "fail"
        ? Promise.reject(new Error("connect ETIMEDOUT（黑洞 DB）")).then(
            undefined,
            rej,
          )
        : Promise.resolve(ROWS).then(onf);
    return { select: () => builder };
  },
}));

const { listPublishedPosts, searchPosts } = await import("./posts");

beforeEach(() => {
  cacheLife.mockClear();
  cacheTag.mockClear();
  dbState = "fail";
});

describe("故障空态缓存降短档", () => {
  it("listPublishedPosts：DB 拒绝 → 归空态，且追加 {revalidate:30} 短档压过顶部 hours", async () => {
    await expect(listPublishedPosts("zh")).resolves.toEqual([]);
    const calls = cacheLife.mock.calls.map((c) => c[0]);
    expect(calls).toContain("hours");
    expect(calls).toContainEqual({ revalidate: 30 });
    // 短档必须在 hours 之后调用（Next 取两者最小，顺序不影响结论但固化意图）
    const idxShort = calls.findIndex(
      (c) =>
        typeof c === "object" &&
        c !== null &&
        (c as { revalidate: number }).revalidate === 30,
    );
    expect(idxShort).toBeGreaterThan(calls.indexOf("hours"));
  });

  it("listPublishedPosts：DB 健康 → 结果原样返回，只走 hours 档", async () => {
    dbState = "rows";
    await expect(listPublishedPosts("zh")).resolves.toEqual(ROWS);
    expect(cacheLife.mock.calls.map((c) => c[0])).toEqual(["hours"]);
  });

  it("searchPosts：DB 拒绝 → 归空态 + 短档；空查询短路不触发故障档", async () => {
    await expect(searchPosts("zh", "hello")).resolves.toEqual([]);
    expect(cacheLife.mock.calls.map((c) => c[0])).toContainEqual({
      revalidate: 30,
    });

    cacheLife.mockClear();
    await expect(searchPosts("zh", "   ")).resolves.toEqual([]);
    expect(cacheLife.mock.calls.map((c) => c[0])).toEqual(["hours"]);
  });
});
