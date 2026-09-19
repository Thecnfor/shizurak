// @vitest-environment node
// route 级回归信号：/api/chat 已知错误分支的稳定响应 + 请求 body 不可注入/提权
// execCtx 与工具循环预算（对照 tool-loop.ts 的 stepCountIs 默认预算与 L2 不自动执行红线）。
import type { UIMessage } from "ai";
import { convertArrayToReadableStream, MockLanguageModelV4 } from "ai/test";
import { afterAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { createBackendKernel, KERNEL_VERSION } from "@/kernel";
import type { ToolExecContext } from "@/kernel/contracts/tool";
import type { Kernel } from "@/kernel/core";
import type { ModelsService } from "@/kernel/plugins/model-adapter";
import type { ToolsService } from "@/kernel/plugins/tool-registry";
import { registerDomainTools } from "@/kernel/tools/domain";
import { POST } from "./route";

function postReq(body: unknown): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
};

describe("POST /api/chat —— 已知错误分支稳定响应", () => {
  it("非法 JSON → 400 Invalid JSON", async () => {
    const res = await POST(postReq("{ not-json"));
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Invalid JSON");
  });

  it("messages 缺失 / 空数组 / 非数组 → 400 No messages", async () => {
    for (const body of [
      {},
      { messages: [] },
      { messages: "not-an-array" },
    ] as const) {
      const res = await POST(postReq(body));
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(await res.text()).toBe("No messages");
    }
  });
});

describe("POST /api/chat —— body 注入不可提权 execCtx / 工具循环预算", () => {
  let kernel: Kernel | undefined;

  afterAll(async () => {
    const g = globalThis as Record<string, unknown>;
    g.__SHIZURAK_KERNEL__ = undefined;
    g.__SHIZURAK_KERNEL_VERSION__ = undefined;
    await kernel?.stop();
  });

  it("注入 maxSteps/level/execCtx 等字段：execCtx 仅白名单截断下发，stepCountIs(12) 默认预算不被覆盖，L2 依旧不自动执行", async () => {
    kernel = createBackendKernel();
    await kernel.start();
    const tools = kernel.context.require<ToolsService>("ai.tools");
    registerDomainTools(tools);

    // 测试专用 L0 探针：捕获真正到达工具执行层的 execCtx
    const captured: ToolExecContext[] = [];
    tools.register({
      id: "probeCtx",
      level: "L0",
      description: "捕获工具执行层收到的 execCtx（仅测试）",
      parameters: z.object({}),
      execute: (_input, ctx) => {
        captured.push(ctx);
        return { ok: true };
      },
    });

    // 每一步都发起 probeCtx 工具调用；远超默认预算 CALL_CAP 后才收敛（防死循环兜底）。
    // 注：V4 spec 的 finishReason 是 { unified, raw } 对象，字符串会被 SDK 忽略导致循环不续跑。
    const CALL_CAP = 25;
    let calls = 0;
    const model = new MockLanguageModelV4({
      doStream: async () => {
        calls += 1;
        return calls < CALL_CAP
          ? {
              stream: convertArrayToReadableStream([
                { type: "stream-start", warnings: [] },
                {
                  type: "tool-call",
                  toolCallId: `c${calls}`,
                  toolName: "probeCtx",
                  input: "{}",
                },
                {
                  type: "finish",
                  finishReason: { unified: "tool-calls", raw: "tool-calls" },
                  usage,
                },
              ]),
            }
          : {
              stream: convertArrayToReadableStream([
                { type: "stream-start", warnings: [] },
                { type: "text-start", id: "t1" },
                { type: "text-delta", id: "t1", delta: "收敛" },
                { type: "text-end", id: "t1" },
                {
                  type: "finish",
                  finishReason: { unified: "stop", raw: "stop" },
                  usage,
                },
              ]),
            };
      },
    });
    kernel.context.require<ModelsService>("ai.models").setModel(model);

    // 让 route 的 getKernel() 单例命中本测试内核（不触网真实 LiteLLM）
    const g = globalThis as Record<string, unknown>;
    g.__SHIZURAK_KERNEL__ = kernel;
    g.__SHIZURAK_KERNEL_VERSION__ = KERNEL_VERSION;

    const messages: UIMessage[] = [
      { id: "m1", role: "user", parts: [{ type: "text", text: "你好" }] },
    ];
    const res = await POST(
      postReq({
        messages,
        // 攻击面：以下字段一律不应改变 execCtx 白名单或工具循环预算
        maxSteps: 1000,
        level: "L0",
        threadId: "attacker",
        visitorHash: "attacker",
        execCtx: { level: "L0", autoApprove: true },
        locale: "fr",
        theme: 123,
        pageContext: { evil: true },
      }),
    );
    expect(res.status).toBe(200);
    await res.text(); // 抽干 UI 流，让 agent 工具循环真实跑完

    // ① 工具执行层确实被驱动（否则本用例是空转假绿）
    expect(captured.length).toBeGreaterThan(0);
    const ctx = captured[0];

    // ② execCtx 只有 route 构造的白名单字段，注入字段不外泄
    expect(Object.keys(ctx).sort()).toEqual(["locale", "pageContext", "theme"]);
    expect(ctx.locale).toBe("zh"); // 非法 locale 截断为 zh
    expect(ctx.theme).toBe("void"); // 非 string theme 截断为默认
    expect(ctx.pageContext).toBeUndefined(); // 非数组 pageContext 不下发
    expect("threadId" in ctx).toBe(false);
    expect("visitorHash" in ctx).toBe(false);

    // ③ 步数预算：tool-loop 默认 stepCountIs(12) 生效，body.maxSteps 不被转发；
    //    若 route 绕过 stepCountIs，循环会冲到 CALL_CAP(25) 使本断言失败。
    expect(calls).toBe(12);
    expect(calls).toBeLessThan(CALL_CAP);

    // ④ L2 红线不因请求体变化：内核级 invoke 拦断保留（needs-approval）；
    //    execute 仅经 SDK toolApproval('user-approval') 用户确认后才会被循环执行。
    expect(tools.get("contactAuthor")?.level).toBe("L2");
    const invoked = await tools.invoke(
      "contactAuthor",
      { message: "提权尝试" },
      ctx,
    );
    expect(invoked.status).toBe("needs-approval");
  });
});
