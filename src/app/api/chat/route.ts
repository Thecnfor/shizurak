import { convertToModelMessages, type UIMessage } from "ai";
import { getKernel } from "@/kernel";
import type { ToolExecContext } from "@/kernel/contracts/tool";
import type { AgentService } from "@/kernel/genui/tool-loop";
import type { JevService } from "@/kernel/plugins/jev-adapter";
import { rateLimit } from "@/lib/server/redis";

// 体积/条数双闸（安全审计 F-3）：限流只约束次数，不约束单次体积。
const MAX_CHAT_BYTES = 256 * 1024;
const MAX_MESSAGES = 50;

// 访客 agent 真实流式端点：内核 ai.agent（AI SDK v7 ToolLoopAgent + 真实 ARK 模型 + 领域工具）
// cacheComponents 下 Route Handler 天然动态，无需 runtime/dynamic 段配置。
export async function POST(req: Request): Promise<Response> {
  let body: {
    messages?: UIMessage[];
    id?: string;
    pageContext?: unknown;
    theme?: string;
    locale?: string;
  };
  try {
    if ((Number(req.headers.get("content-length")) || 0) > MAX_CHAT_BYTES) {
      return new Response(JSON.stringify({ error: "payload_too_large" }), {
        status: 413,
        headers: { "content-type": "application/json" },
      });
    }
    const raw = await req.text();
    if (raw.length > MAX_CHAT_BYTES) {
      return new Response(JSON.stringify({ error: "payload_too_large" }), {
        status: 413,
        headers: { "content-type": "application/json" },
      });
    }
    body = JSON.parse(raw);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0 || messages.length > MAX_MESSAGES) {
    return new Response(
      messages.length === 0 ? "No messages" : "Too many messages",
      { status: 400 },
    );
  }

  // 成本三重闸①：Redis 固定窗口（单 IP 10/min）。fail-open，无 Redis 放行。
  // IP 键优先取代理注入的 x-real-ip；否则取 XFF 最右段（客户端不可伪造自增段）。
  const xff = req.headers.get("x-forwarded-for");
  const ip =
    req.headers.get("x-real-ip") ?? xff?.split(",").pop()?.trim() ?? "local";
  const rl = await rateLimit(`chat:${ip}`, 10, 60);
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(rl.retryAfter ?? 60),
      },
    });
  }

  const kernel = await getKernel();
  const agent = kernel.context.require<AgentService>("ai.agent");
  const modelMessages = await convertToModelMessages(messages);
  const last = messages[messages.length - 1];
  const userText = (last.parts ?? [])
    .filter((p) => p.type === "text")
    .map((p) => ("text" in p ? p.text : ""))
    .join("");

  // System One 入口闸（Jev）：高置信越狱/敌意直接 403，不消耗生成算力；降级放行。
  const jev = kernel.context.require<JevService>("ai.jev");
  const verdict = await jev.gate(userText);
  if (
    verdict &&
    (verdict.jailbreak > 0.85 ||
      (verdict.risk === "hostile" && verdict.confidence > 0.85))
  ) {
    return new Response(
      JSON.stringify({ error: "input_rejected", by: verdict.model }),
      { status: 403, headers: { "content-type": "application/json" } },
    );
  }
  const execCtx: ToolExecContext = {
    locale: body.locale === "en" ? "en" : "zh",
    theme: typeof body.theme === "string" ? body.theme : "void",
    pageContext: Array.isArray(body.pageContext) ? body.pageContext : undefined,
  };

  // 真实线程持久化（best-effort，仅当 DATABASE_URL 存在）
  if (process.env.DATABASE_URL) {
    try {
      const { threadRepo } = await import("@/lib/db/repo/agent");
      const threadId = await threadRepo.ensure(body.id, ip);
      await threadRepo.appendMessage({
        threadId,
        role: "user",
        parts: [{ type: "text", text: userText }],
      });
    } catch {
      /* 持久化失败不阻断对话 */
    }
  }

  return agent.stream({
    // biome-ignore lint/suspicious/noExplicitAny: convertToModelMessages 输出口径
    messages: modelMessages as any,
    execCtx,
  });
}
