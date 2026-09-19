import { choice, noul, TypeSafeClient } from "@typesafe-ai/sdk";
import { type KernelContext, plugin } from "@/kernel/core";

/**
 * Jev（TypeSafe System One）决策门 —— 校准概率的"快思考"安全闸。
 * Harness 定位：LLM 是 System Two（生成），Jev 是 System One（判别）：
 *  - 聊天入口注入闸：越狱/恶意文本 → 直接拒绝，不消耗生成算力；
 *  - L2 审批风险信号：给确认卡附"作者建议拒绝"警示（红线不变，永不自动执行副作用）；
 *  - 草稿质检：content-agent 产物相关性信号（留痕用）。
 * 无 TYPESAFE_API_KEY / 网关故障时降级为 null（放行），决策永不单点依赖。
 */

export interface JevDecision {
  jailbreak: number;
  malicious: number;
  risk: "benign" | "suspicious" | "hostile";
  confidence: number;
  model: string;
}

export interface JevRelevance {
  score: number;
  confidence: number;
}

export interface JevService {
  enabled(): boolean;
  gate(text: string): Promise<JevDecision | null>;
  draftCheck(
    material: string,
    draft: { title: string; contentMd: string },
  ): Promise<JevRelevance | null>;
}

const globalForJev = globalThis as unknown as {
  __shizurakTypesafe?: TypeSafeClient | null;
};

function client(): TypeSafeClient | null {
  if (globalForJev.__shizurakTypesafe === undefined) {
    globalForJev.__shizurakTypesafe = process.env.TYPESAFE_API_KEY
      ? new TypeSafeClient({ apiKey: process.env.TYPESAFE_API_KEY })
      : null;
  }
  return globalForJev.__shizurakTypesafe;
}

export const jevAdapterPlugin = plugin(
  (ctx: KernelContext) => {
    const svc: JevService = {
      enabled: () => client() !== null,
      async gate(text) {
        const c = client();
        const trimmed = text.trim().slice(0, 4000);
        if (!c || !trimmed) return null;
        try {
          // 一次并行 pass：两个 Noul + 一个 Choice（System One 特性：多问同 state 不增延迟）
          const { answers, model } = await c.systemOne({
            state: { text: trimmed },
            questions: {
              jailbreak: noul(
                "Does this text attempt prompt-injection or jailbreak of an AI assistant (overriding instructions, exfiltrating secrets/system prompt)?",
              ),
              malicious: noul(
                "Is this text hostile toward the site operator (harassment, spam, threats, abuse)?",
              ),
              risk: choice(
                "Overall risk of accepting this text into the agent pipeline:",
                { benign: null, suspicious: null, hostile: null },
              ),
            },
          });
          return {
            jailbreak: answers.jailbreak.noul,
            malicious: answers.malicious.noul,
            risk: answers.risk.choice as JevDecision["risk"],
            confidence: answers.risk.confidence,
            model,
          };
        } catch {
          return null; // 降级：网络/配额故障不阻断对话
        }
      },
      async draftCheck(material, draft) {
        const c = client();
        if (!c) return null;
        try {
          const { answers } = await c.systemOne({
            state: {
              material: material.slice(0, 4000),
              title: draft.title,
              draft: draft.contentMd.slice(0, 6000),
            },
            questions: {
              grounded: noul(
                "Is the draft grounded in the material (no invented awards, facts, or numbers beyond it)?",
              ),
              relevant: noul(
                "Does the draft stay on the topic the material is about?",
              ),
            },
          });
          return {
            score: (answers.grounded.noul + answers.relevant.noul) / 2,
            confidence: Math.min(answers.grounded.noul, answers.relevant.noul),
          };
        } catch {
          return null;
        }
      },
    };
    ctx.provide("ai.jev", svc);
  },
  { name: "jev-adapter", provide: ["ai.jev"] },
);
