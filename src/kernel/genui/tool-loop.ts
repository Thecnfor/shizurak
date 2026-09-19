import {
  tool as aiTool,
  type LanguageModel,
  type ModelMessage,
  stepCountIs,
  ToolLoopAgent,
  type ToolSet,
} from "ai";
import type { ToolExecContext } from "@/kernel/contracts/tool";
import type { KernelContext } from "@/kernel/core";
import type { ModelsService } from "@/kernel/plugins/model-adapter";
import type { ToolsService } from "@/kernel/plugins/tool-registry";
import { buildGenUiSpecPrompt } from "./routing";

export interface AgentRunResult {
  text: string;
  toolOutputs: { id: string; output: unknown }[];
  steps: number;
  usage: { promptTokens: number; completionTokens: number };
  finishReason: string;
}

export interface AgentService {
  run(opts: {
    messages: { role: "user" | "assistant"; content: string }[];
    system?: string;
    maxSteps?: number;
    execCtx: ToolExecContext;
  }): Promise<AgentRunResult>;
  /** 真实流式：返回 SSE Response（访客 /api/chat 用，非 mock）。 */
  stream(opts: {
    messages: ModelMessage[];
    system?: string;
    maxSteps?: number;
    execCtx: ToolExecContext;
  }): Promise<Response>;
}

/** 内核工具 → AI SDK 工具的窄化桥（避免动态工具集与 aiTool 泛型重载搏斗）。 */
type BridgeTool = (cfg: {
  description: string;
  inputSchema: unknown;
  // biome-ignore lint/suspicious/noExplicitAny: 桥接动态工具输入
  execute?: (input: any) => Promise<unknown>;
}) => ToolSet[string];
// biome-ignore lint/suspicious/noExplicitAny: 仅重签 aiTool 的参数形状，运行时行为不变
const bridgeTool = aiTool as unknown as (
  c: Parameters<BridgeTool>[0],
) => ToolSet[string];

/**
 * 访客/作者 agent —— 直接用 AI SDK v7 官方 `ToolLoopAgent`（不再手搓工具循环）。
 * 内核 `ai.tools`（领域工具注册表）桥接为 AI SDK 工具；L2 无 execute 故永不自动执行
 * （红线）。M4 接 `/api/chat` 时同一 agent `.stream()` 出 UI 流，审批经 useChat 回流。
 */
export function createAgentService(ctx: KernelContext): AgentService {
  const models = ctx.require<ModelsService>("ai.models");
  const tools = ctx.require<ToolsService>("ai.tools");
  const genui = ctx.require<{ routingPrompt(): string }>("ai.genui");

  // 内核工具 → AI SDK 工具（含 execute 副作用捕获）；L2 无 execute 永不自动执行。
  function buildAgent(
    maxSteps: number,
    execCtx: ToolExecContext,
    system?: string,
  ) {
    const toolOutputs: AgentRunResult["toolOutputs"] = [];
    const toolSet: Record<string, ToolSet[string]> = {};
    for (const d of tools.list()) {
      toolSet[d.id] = bridgeTool({
        description: d.description,
        inputSchema: d.parameters,
        execute:
          d.level === "L2"
            ? undefined
            : async (input: unknown) => {
                const r = await tools.invoke(d.id, input, execCtx);
                if (r.status === "ok") {
                  toolOutputs.push({ id: r.id, output: r.output });
                  return r.output;
                }
                throw new Error(
                  r.status === "error" ? r.error : "needs-approval",
                );
              },
      });
    }
    const agent = new ToolLoopAgent({
      model: models.chat() as LanguageModel,
      tools: toolSet as ToolSet,
      instructions:
        `${system ?? ""}\n${genui.routingPrompt()}\n${buildGenUiSpecPrompt()}`.trim(),
      stopWhen: stepCountIs(maxSteps),
    });
    return { agent, toolOutputs };
  }

  return {
    async run({ messages, system, maxSteps = 12, execCtx }) {
      const { agent, toolOutputs } = buildAgent(maxSteps, execCtx, system);
      const res = await agent.generate({
        messages: messages as ModelMessage[],
      });
      const u = res.totalUsage;
      return {
        text: res.text,
        toolOutputs,
        steps: res.steps.length,
        usage: {
          promptTokens: u?.inputTokens ?? 0,
          completionTokens: u?.outputTokens ?? 0,
        },
        finishReason: String(res.finishReason ?? "stop"),
      };
    },
    async stream({ messages, system, maxSteps = 12, execCtx }) {
      const { agent } = buildAgent(maxSteps, execCtx, system);
      const res = await agent.stream({ messages });
      return res.toUIMessageStreamResponse();
    },
  };
}
