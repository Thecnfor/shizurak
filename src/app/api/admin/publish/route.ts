import { postsRepo } from "@/lib/db/repo/posts";
import { requireAdmin, unauthorized } from "@/lib/server/admin-auth";

// 作者侧：草稿发布（status=draft→published）。真实 revalidate 由缓存生命周期处理。
export async function POST(req: Request): Promise<Response> {
  if (!requireAdmin(req)) return unauthorized();
  let id: string;
  try {
    id = String((await req.json()).id ?? "");
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (!id || !process.env.DATABASE_URL) {
    return new Response(JSON.stringify({ error: "bad_input" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const ok = await postsRepo.publish(id);
  return new Response(JSON.stringify({ ok }), {
    status: ok ? 200 : 404,
    headers: { "content-type": "application/json" },
  });
}
