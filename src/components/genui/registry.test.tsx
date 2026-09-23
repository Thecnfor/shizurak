import type { Spec } from "@json-render/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import type { Kernel } from "@/kernel/core";
import { createClientKernel } from "@/lib/kernel";
import type { ActionsService } from "@/lib/kernel/plugins/ui-actions";
import { KernelProvider } from "@/lib/kernel/react";
import { useThemeStore } from "@/stores/theme-store";
import { GenuiRenderer } from "./genui-renderer";

/**
 * ActionButton 状态线（遗留批）：invoke 在飞 = busy（禁用 + aria-busy + 转圈），
 * promise 落定才解；L2 转确认后是静态提示而非永挂 spinner；校验失败就地披露。
 * 用真内核（createClientKernel + KernelProvider）而不是 mock service：
 * 这条状态线的语义一半在 ui-actions 插件的返回/事件上，mock 会把它测成自证。
 */

function actionSpec(actionId: string, label: string, params?: unknown): Spec {
  return {
    root: "btn",
    elements: {
      btn: {
        type: "ActionButton",
        props: { actionId, label, ...(params ? { params } : {}) },
      },
    },
  } as Spec;
}

async function renderBtn(spec: Spec, kernel: Kernel) {
  return render(
    <KernelProvider kernel={kernel}>
      <GenuiRenderer spec={spec} />
    </KernelProvider>,
  );
}

describe("ActionButton pending 状态线", () => {
  let k: Kernel;
  let actions: ActionsService;

  beforeEach(async () => {
    useThemeStore.getState().setTheme("void");
    k = createClientKernel();
    await k.start();
    actions = k.context.require<ActionsService>("actions");
  });

  afterEach(async () => {
    await k.stop();
  });

  it("L1 在飞：禁用 + aria-busy + spinner；execute 落定后全部解除", async () => {
    let done!: () => void;
    const gate = new Promise<void>((r) => (done = r));
    actions.register({
      id: "post.pin",
      level: "L1",
      reversible: true,
      schema: z.object({}),
      execute: () => gate,
    });
    await renderBtn(actionSpec("post.pin", "钉住"), k);
    const btn = screen.getByRole("button", { name: "钉住" });
    expect(btn).toBeEnabled();
    fireEvent.click(btn);
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    // spinner：mono 字符 ◌（aria-hidden，不混进无障碍名）
    expect(btn.querySelector(".animate-spin")).not.toBeNull();
    done();
    await waitFor(() => expect(btn).toBeEnabled());
    expect(btn).not.toHaveAttribute("aria-busy");
    expect(btn.querySelector(".animate-spin")).toBeNull();
  });

  it("L2 落定：spinner 让位于静态「已转确认」提示（不等不存在的事件）", async () => {
    actions.register({
      id: "contact.author",
      level: "L2",
      reversible: false,
      schema: z.object({ msg: z.string() }),
      preview: ({ msg }) => ({ title: "联系作者", summary: msg }),
    });
    await renderBtn(actionSpec("contact.author", "发邮件", { msg: "hi" }), k);
    const btn = screen.getByRole("button", { name: "发邮件" });
    fireEvent.click(btn);
    await waitFor(() =>
      expect(screen.getByText("已转确认 · 等待授权")).toBeInTheDocument(),
    );
    expect(btn).not.toHaveAttribute("aria-busy");
    expect(btn).toBeEnabled(); // 无确认面把按钮锁死（诚实：spinner 永挂是要避免的缺陷）
  });

  it("事件线：其它入口派发的 pending/invoked 驱动本按钮（不依赖本按钮点击）", async () => {
    actions.register({
      id: "draft.publish",
      level: "L2",
      reversible: false,
      schema: z.object({ id: z.string() }),
      preview: ({ id }) => ({ title: "发布", summary: id }),
    });
    await renderBtn(actionSpec("draft.publish", "发布", { id: "p1" }), k);
    const btn = screen.getByRole("button", { name: "发布" });
    expect(screen.queryByText("已转确认 · 等待授权")).toBeNull();
    // 不经按钮点击，从服务面直接派发同名动作：pending 事件应点亮提示行
    await actions.invoke("draft.publish", { id: "p1" });
    await waitFor(() =>
      expect(screen.getByText("已转确认 · 等待授权")).toBeInTheDocument(),
    );
    expect(btn).not.toHaveAttribute("aria-busy");
    // 落定信号（ui.action.invoked 同 id）到达 → 提示清场
    await k.context.emit("ui.action.invoked", { id: "draft.publish" });
    await waitFor(() =>
      expect(screen.queryByText("已转确认 · 等待授权")).toBeNull(),
    );
    // 异名动作的落定不许误清：重新点亮后发别的 id，提示仍在
    await actions.invoke("draft.publish", { id: "p2" });
    await waitFor(() =>
      expect(screen.getByText("已转确认 · 等待授权")).toBeInTheDocument(),
    );
    await k.context.emit("ui.action.invoked", { id: "someone-else" });
    await Promise.resolve();
    expect(screen.getByText("已转确认 · 等待授权")).toBeInTheDocument();
  });

  it("校验失败：错误就地披露，busy 不悬空", async () => {
    actions.register({
      id: "post.tag",
      level: "L1",
      reversible: true,
      schema: z.object({ tag: z.string() }),
      execute: () => {},
    });
    await renderBtn(actionSpec("post.tag", "打标", { tag: 123 }), k);
    const btn = screen.getByRole("button", { name: "打标" });
    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByText(/tag: /)).toBeInTheDocument());
    expect(btn).not.toHaveAttribute("aria-busy");
    expect(btn.querySelector(".animate-spin")).toBeNull();
  });
});
