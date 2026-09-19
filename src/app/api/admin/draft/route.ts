import { generateDraft } from "@/lib/content/agent";
import { postsRepo } from "@/lib/db/repo/posts";
import { requireAdmin, unauthorized } from "@/lib/server/admin-auth";

// 作者侧：素材 → content-agent(真 ARK) → 草稿落 PG（status=draft）。
export async function POST(req: Request): Promise<Response> {
  if (!requireAdmin(req)) return unauthorized();
  let material: string;
  try {
    material = String((await req.json()).material ?? "");
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (!material.trim() || !process.env.DATABASE_URL) {
    return new Response(JSON.stringify({ error: "bad_input" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const draft = await generateDraft(material);
  const created = await postsRepo.createDraft(draft);
  return new Response(
    JSON.stringify({ ...created, title: draft.title, tags: draft.tags }),
    { status: 201, headers: { "content-type": "application/json" } },
  );
}
