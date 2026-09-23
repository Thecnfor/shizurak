import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createClientKernel } from "./index";
import type { PageContextService } from "./plugins/page-context";
import type { ActionsService } from "./plugins/ui-actions";

async function boot() {
  const k = createClientKernel();
  await k.start();
  return k;
}

describe("前端 DSH-Cordis 内核", () => {
  it("拓扑启动 + Service 就绪 + 默认主题 variant=stitch", async () => {
    const k = await boot();
    for (const id of ["actions", "pageContext", "themeBridge", "genui"]) {
      expect(k.context.has(id), id).toBe(true);
    }
    expect(k.context.require<{ variant(): string }>("genui").variant()).toBe(
      "stitch",
    );
    await k.stop();
  });

  it("page-context 栈：push 深度 / pop 回收 / snapshot 预算", async () => {
    const k = await boot();
    const pc = k.context.require<PageContextService>("pageContext");
    pc.push({ id: "page:home", type: "page" });
    pc.push({ id: "section:a", type: "section", data: { t: "x" } });
    expect(pc.stack().map((r) => r.depth)).toEqual([0, 1]);
    pc.pop("page:home");
    expect(pc.stack().map((r) => r.id)).toEqual(["section:a"]);
    expect(pc.stack()[0].depth).toBe(0);
    // 栈顶两项均可容纳；预算过小时连栈顶都放不下 → 返回空
    pc.push({ id: "card:z", type: "card", data: { k: 1 } });
    expect(pc.snapshot(30).map((r) => r.id)).toEqual(["section:a", "card:z"]);
    expect(pc.snapshot(5)).toEqual([]);
    await k.stop();
  });

  it("ui-actions：L1 执行 / L2 待确认 / 校验失败 / 未知", async () => {
    const k = await boot();
    const actions = k.context.require<ActionsService>("actions");
    let ran = false;
    actions.register({
      id: "post.filter",
      level: "L1",
      reversible: true,
      schema: z.object({ tag: z.string() }),
      execute: () => {
        ran = true;
      },
    });
    actions.register({
      id: "contact.author",
      level: "L2",
      reversible: false,
      schema: z.object({ msg: z.string() }),
      preview: ({ msg }) => ({ title: "联系作者", summary: msg }),
    });

    expect((await actions.invoke("post.filter", { tag: "k8s" })).status).toBe(
      "ok",
    );
    expect(ran).toBe(true);
    expect((await actions.invoke("contact.author", { msg: "hi" })).status).toBe(
      "pending",
    );
    expect(
      (await actions.invoke("post.filter", { tag: 123 as unknown })).status,
    ).toBe("error");
    expect((await actions.invoke("nope", {})).status).toBe("error");
    await k.stop();
  });

  it("theme-bridge：切换主题触发 theme/switched 事件", async () => {
    const { useThemeStore } = await import("@/stores/theme-store");
    const k = await boot();
    let fired = 0;
    k.context.on("theme/switched", () => {
      fired += 1;
    });
    useThemeStore.getState().setTheme("lumen");
    expect(fired).toBe(1);
    expect(k.context.require<{ variant(): string }>("genui").variant()).toBe(
      "clean",
    );
    // 复原默认，避免污染其它用例
    useThemeStore.getState().setTheme("void");
    await k.stop();
  });
});
