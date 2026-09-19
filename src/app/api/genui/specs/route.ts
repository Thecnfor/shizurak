import { isSpec } from "@/lib/genui/parse-spec";

// 保存 GenUI spec → genui_specs（分享用），返回 id。
export async function POST(req: Request): Promise<Response> {
  let body: {
    kind?: string;
    spec?: unknown;
    themeId?: string;
    source?: string;
    shared?: boolean;
    threadId?: string;
  };
  try {
    body = await req.json();
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
  return new Response(JSON.stringify({ id: saved.id }), {
    status: 201,
    headers: { "content-type": "application/json" },
  });
}
