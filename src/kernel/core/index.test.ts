import { describe, expect, it, vi } from "vitest";
import { defineKernel, type KernelContext, KernelError, plugin } from "./index";

describe("DSH-Cordis 微内核核心", () => {
  it("按 require/provide 拓扑序启动（声明顺序无关）", async () => {
    const order: string[] = [];
    const a = plugin(
      (ctx: KernelContext) => {
        order.push("a");
        ctx.provide("svc.a", 1);
      },
      { name: "a", provide: ["svc.a"] },
    );
    // b 依赖 a，但声明在前 → 仍应后启动
    const b = plugin(
      (ctx: KernelContext) => {
        ctx.require("svc.a");
        order.push("b");
      },
      { name: "b", require: ["svc.a"] },
    );
    const k = defineKernel("t", [b, a]);
    await k.start();
    expect(order).toEqual(["a", "b"]);
    await k.stop();
  });

  it("依赖缺失：抛出含未满足 Service 的错误", async () => {
    const k = defineKernel("t", [
      plugin(() => {}, { name: "x", require: ["svc.missing"] }),
    ]);
    await expect(k.start()).rejects.toThrow(KernelError);
    await expect(
      defineKernel("t2", [
        plugin(() => {}, { name: "x", require: ["nope"] }),
      ]).start(),
    ).rejects.toThrow(/nope/);
  });

  it("事件总线 on/emit/once/off", async () => {
    const k = defineKernel("t", []);
    const h = vi.fn();
    const off = k.context.on("ping", h);
    await k.context.emit("ping", 1, 2);
    expect(h).toHaveBeenCalledWith(1, 2);
    off();
    await k.context.emit("ping", 9);
    expect(h).toHaveBeenCalledTimes(1);

    const once = vi.fn();
    k.context.once("hi", once);
    await k.context.emit("hi");
    await k.context.emit("hi");
    expect(once).toHaveBeenCalledTimes(1);
  });

  it("stop 逆序执行 disposer（可逆副作用）", async () => {
    const seq: string[] = [];
    const k = defineKernel("t", [
      plugin(
        () => () => {
          seq.push("d1");
        },
        { name: "p1" },
      ),
      plugin(
        () => () => {
          seq.push("d2");
        },
        { name: "p2" },
      ),
    ]);
    await k.start();
    await k.stop();
    expect(seq).toEqual(["d2", "d1"]);
    expect(k.started).toBe(false);
  });

  it("同 id 重复提供抛错", async () => {
    const k = defineKernel("t", [
      plugin(
        (ctx) => {
          ctx.provide("dup", 1);
        },
        { name: "a", provide: ["dup"] },
      ),
      plugin(
        (ctx) => {
          ctx.provide("dup", 2);
        },
        { name: "b", provide: ["dup"] },
      ),
    ]);
    await expect(k.start()).rejects.toThrow(/dup/);
  });

  it("require 未提供的 Service 抛错", async () => {
    // cordis 契约：依赖应通过 meta.require 声明（预检会拦截，见上条）；
    // 此处断言对 context 直接 require 未知服务的守卫。
    const k = defineKernel("t", []);
    await k.start();
    expect(() => k.context.require("ghost")).toThrow(/ghost/);
    await k.stop();
  });
});
