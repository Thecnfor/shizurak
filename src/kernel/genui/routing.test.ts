import { describe, expect, it } from "vitest";
import { buildRoutingPrompt, resolveRoute } from "./routing";

describe("resolveRoute（引擎路由决策表）", () => {
  it("真实数据 → json-render + Data Stream", () => {
    expect(resolveRoute({ source: "chat", needsRealData: true })).toEqual({
      engine: "json-render",
      channel: "chat-data-stream",
    });
  });
  it("会话内探索 → openui + Data Stream", () => {
    expect(resolveRoute({ source: "chat", exploratory: true })).toEqual({
      engine: "openui",
      channel: "chat-data-stream",
    });
  });
  it("页内一次性 → RSC + server-action", () => {
    expect(resolveRoute({ source: "page-inline" }).engine).toBe("rsc");
    expect(resolveRoute({ source: "page-inline" }).channel).toBe(
      "server-action-rsc",
    );
  });
  it("SEO 可索引优先级最高（即使 chat + 真实数据也让位 RSC）", () => {
    expect(
      resolveRoute({
        source: "chat",
        needsRealData: true,
        seoIndexable: true,
      }).engine,
    ).toBe("rsc");
  });
  it("分享页 / OG / 首屏 → RSC", () => {
    for (const source of ["share", "og", "first-paint"] as const) {
      expect(resolveRoute({ source }).engine).toBe("rsc");
    }
  });
  it("系统提示由路由表同源生成且与决策一致", () => {
    const p = buildRoutingPrompt();
    expect(p).toContain("json-render");
    expect(p).toContain("server-action-rsc");
    expect(p).toContain("通道互斥");
  });
});
