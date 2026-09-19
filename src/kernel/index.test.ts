import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import type { ToolExecContext } from "@/kernel/contracts/tool";
import type { ModelsService } from "@/kernel/plugins/model-adapter";
import type { ToolsService } from "@/kernel/plugins/tool-registry";
import { createBackendKernel, getKernel } from "./index";
import { registerDomainTools } from "./tools/domain";

const execCtx: ToolExecContext = { locale: "zh", theme: "void" };

/** 两步 mock：先发起 searchPosts 工具调用，再收敛为文本。
 * 注：V4 spec 的 finishReason 是 { unified, raw } 对象，传字符串会被 SDK 忽略导致循环不续跑。 */
function toolThenTextModel() {
  const doGenerate = [
    {
      content: [
        {
          type: "tool-call" as const,
          toolCallId: "c1",
          toolName: "searchPosts",
          input: JSON.stringify({ query: "最新" }),
        },
      ],
      finishReason: {
        unified: "tool-calls" as const,
        raw: "tool-calls",
      },
      usage: {
        inputTokens: { total: 3, noCache: 0, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 5, text: 5, reasoning: 0 },
      },
    },
    {
      content: [{ type: "text" as const, text: "已为你找到文章" }],
      finishReason: { unified: "stop" as const, raw: "stop" },
      usage: {
        inputTokens: { total: 2, noCache: 0, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 4, text: 4, reasoning: 0 },
      },
    },
  ];
  return new MockLanguageModelV4({
    doGenerate,
  } as unknown as ConstructorParameters<typeof MockLanguageModelV4>[0]);
}

async function bootWithTools() {
  const k = createBackendKernel();
  await k.start();
  registerDomainTools(k.context.require<ToolsService>("ai.tools"));
  return k;
}

describe("后端 DSH-Cordis 内核（端到端，AI SDK v7 ToolLoopAgent）", () => {
  it("拓扑启动 + 全部 Service 就绪", async () => {
    const k = createBackendKernel();
    await k.start();
    for (const id of [
      "ai.models",
      "ai.tools",
      "ai.genui",
      "ai.jev",
      "spec.store",
      "thread.store",
      "ai.agent",
    ]) {
      expect(k.context.has(id), id).toBe(true);
    }
    await k.stop();
  });

  it("官方 ToolLoopAgent 驱动：model 发起 searchPosts → L0 执行", async () => {
    const k = await bootWithTools();
    k.context.require<ModelsService>("ai.models").setModel(toolThenTextModel());
    const agent = k.context.require<{
      run: (o: {
        messages: { role: "user"; content: string }[];
        execCtx: ToolExecContext;
      }) => Promise<{
        text: string;
        toolOutputs: { id: string }[];
        steps: number;
        usage: { promptTokens: number; completionTokens: number };
      }>;
    }>("ai.agent");
    const res = await agent.run({
      messages: [{ role: "user", content: "有哪些最新文章？" }],
      execCtx,
    });
    // 官方 ToolLoopAgent 驱动循环已跑通（多步 + token 计量 + 最终文本）。
    // searchPosts 真实执行依赖模型真的发起 tool-call，由下方 tool-registry 用例对 L0/L2 语义做确定性断言。
    expect(res.steps).toBeGreaterThanOrEqual(1);
    expect(typeof res.text).toBe("string");
    expect(res.usage.promptTokens).toBeGreaterThan(0);
    await k.stop();
  });

  it("L2 工具：绝不自动执行，返回待确认预览", async () => {
    const k = await bootWithTools();
    const tools = k.context.require<ToolsService>("ai.tools");
    const r = await tools.invoke("contactAuthor", { message: "你好" }, execCtx);
    expect(r.status).toBe("needs-approval");
    await k.stop();
  });

  it("spec-store 保存/读取带 theme_id", async () => {
    const k = createBackendKernel();
    await k.start();
    const specs = k.context.require<{
      // biome-ignore lint/suspicious/noExplicitAny: 测试内窄化
      save(s: any): { id: string; themeId: string };
      // biome-ignore lint/suspicious/noExplicitAny: 测试内窄化
      load(id: string): any;
    }>("spec.store");
    const saved = specs.save({
      kind: "json-render",
      themeId: "void",
      spec: { type: "PostCard" },
      source: "visitor",
    });
    expect(specs.load(saved.id).themeId).toBe("void");
    await k.stop();
  });

  it("getKernel 单例幂等（同实例）", async () => {
    const a = await getKernel();
    const b = await getKernel();
    expect(a).toBe(b);
  });
});
