import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { posts } from "@/lib/db/schema";
import { requireAdmin, unauthorized } from "@/lib/server/admin-auth";

// 读回草稿源文本（/admin 编辑器"生成→润色"回填用；Bearer 或会话 cookie）。
export async function GET(req: Request): Promise<Response> {
  if (!requireAdmin(req)) return unauthorized();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id,
    ) ||
    !process.env.DATABASE_URL
  ) {
    return new Response(JSON.stringify({ error: "bad_input" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const [row] = await getDb()
    .select({
      title: posts.title,
      summary: posts.summary,
      contentMd: posts.contentMd,
      status: posts.status,
    })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);
  return new Response(JSON.stringify(row ?? { error: "not_found" }), {
    status: row ? 200 : 404,
    headers: { "content-type": "application/json" },
  });
}
