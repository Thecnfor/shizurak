import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { type KernelContext, plugin } from "@/kernel/core";

export interface ModelsService {
  /** 返回一个真实的 AI SDK v7 LanguageModel（默认经 LiteLLM 网关；测试用 setModel 注入 mock） */
  chat(): LanguageModel;
  setModel(m: LanguageModel): void;
}

/** 默认经集群 LiteLLM 网关（OpenAI 兼容、零密钥直连）；构造不触网，调用才触网。 */
function defaultModel(): LanguageModel {
  const base = process.env.LITELLM_BASE_URL ?? "http://127.0.0.1:4000/v1";
  const id = process.env.LITELLM_CHAT_MODEL ?? "echo";
  return createOpenAICompatible({
    name: "litellm",
    baseURL: base,
    apiKey: process.env.LITELLM_KEY ?? "litellm-unused",
  }).chatModel(id);
}

export const modelAdapterPlugin = plugin(
  (ctx: KernelContext) => {
    let model = defaultModel();
    const svc: ModelsService = {
      chat: () => model,
      setModel: (m) => {
        model = m;
      },
    };
    ctx.provide("ai.models", svc);
  },
  { name: "model-adapter", provide: ["ai.models"] },
);
