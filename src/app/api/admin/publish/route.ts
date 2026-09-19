import { revalidateTag } from "next/cache";
import { postsRepo } from "@/lib/db/repo/posts";
import { requireAdmin, unauthorized } from "@/lib/server/admin-auth";

// 作者侧：草稿发布（status=draft→published）+ 失效对应缓存标签。
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
  const published = await postsRepo.publish(id);
  if (!published) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }
  // 与 queries/posts.ts 的 cacheLife 档位对齐（列表 hours / 详情 days）
  revalidateTag("posts", "hours");
  revalidateTag(`post:${published.slug}`, "days");
  return new Response(JSON.stringify({ ok: true, slug: published.slug }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
