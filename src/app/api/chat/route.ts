import { convertToModelMessages, type UIMessage } from "ai";
import { getKernel } from "@/kernel";
import type { ToolExecContext } from "@/kernel/contracts/tool";
import type { AgentService } from "@/kernel/genui/tool-loop";
import { rateLimit } from "@/lib/server/redis";

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
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return new Response("No messages", { status: 400 });
  }

  // 成本三重闸①：Redis 固定窗口（单 IP 10/min）。fail-open，无 Redis 放行。
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
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
      const userText = (last.parts ?? [])
        .filter((p) => p.type === "text")
        .map((p) => ("text" in p ? p.text : ""))
        .join("");
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
