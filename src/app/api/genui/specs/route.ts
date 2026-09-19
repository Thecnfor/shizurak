import { revalidateTag } from "next/cache";
import { isSpec } from "@/lib/genui/parse-spec";
import { rateLimit } from "@/lib/server/redis";

const MAX_BODY_BYTES = 64 * 1024; // spec 均为小体积 JSON，封顶防滥用

// 保存 GenUI spec → genui_specs（分享用），返回 id。
// 公开写入口 → 限流（单 IP 30/小时）+ 体积帽；内容仅经 isSpec 校验后作数据存库（非 HTML 注入面）。
export async function POST(req: Request): Promise<Response> {
  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ??
    "local";
  const rl = await rateLimit(`spec:${ip}`, 30, 3600);
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(rl.retryAfter ?? 3600),
      },
    });
  }
  if ((Number(req.headers.get("content-length")) || 0) > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: "payload_too_large" }), {
      status: 413,
      headers: { "content-type": "application/json" },
    });
  }
  let body: {
    kind?: string;
    spec?: unknown;
    themeId?: string;
    source?: string;
    shared?: boolean;
    threadId?: string;
  };
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) {
      return new Response(JSON.stringify({ error: "payload_too_large" }), {
        status: 413,
        headers: { "content-type": "application/json" },
      });
    }
    body = JSON.parse(text);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const kind = body.kind;
  if (
    (kind !== "json-render" && kind !== "openui" && kind !== "rsc") ||
    !isSpec(body.spec)
  ) {
    return new Response(JSON.stringify({ error: "invalid spec" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  if (!process.env.DATABASE_URL) {
    return new Response(JSON.stringify({ error: "db_unavailable" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }
  const { specRepo } = await import("@/lib/db/repo/agent");
  const saved = await specRepo.save({
    kind,
    spec: body.spec,
    themeId:
      body.themeId === "lumen" || body.themeId === "void"
        ? body.themeId
        : "void",
    source: body.source === "author" ? "author" : "visitor",
    threadId: body.threadId,
    shared: body.shared !== false,
  });
  revalidateTag("specs", "minutes"); // 与 queries/lab.ts 的 cacheLife 档位对齐
  return new Response(JSON.stringify({ id: saved.id }), {
    status: 201,
    headers: { "content-type": "application/json" },
  });
}
