"use server";

import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { compileContent } from "@/lib/content/compile";
import { getDb } from "@/lib/db/client";
import { postsRepo } from "@/lib/db/repo/posts";
import { posts } from "@/lib/db/schema";
import { ADMIN_COOKIE, verifySessionCookie } from "@/lib/server/session";

async function authed(): Promise<boolean> {
  return verifySessionCookie((await cookies()).get(ADMIN_COOKIE)?.value);
}

/** 手改保存为草稿（新建或按 id 覆盖，重编译 HTML/TOC/时长）。 */
export async function saveDraftAction(input: {
  id?: string;
  title: string;
  summary: string;
  contentMd: string;
}): Promise<{ ok: boolean; id?: string }> {
  if (!(await authed())) return { ok: false };
  if (!process.env.DATABASE_URL) return { ok: false };
  const c = await compileContent(input.contentMd);
  if (input.id) {
    const [row] = await getDb()
      .update(posts)
      .set({
        title: input.title,
        summary: input.summary,
        contentMd: input.contentMd,
        contentHtml: c.html,
        toc: c.toc,
        readingTime: c.minutes,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, input.id))
      .returning({ slug: posts.slug, id: posts.id });
    if (!row) return { ok: false };
    revalidateTag("posts", "hours");
    revalidateTag(`post:${row.slug}`, "days");
    return { ok: true, id: row.id };
  }
  const created = await postsRepo.createDraft({
    title: input.title,
    summary: input.summary,
    contentMd: input.contentMd,
    tags: [],
  });
  revalidateTag("posts", "hours");
  return { ok: true, id: created.id };
}

export async function publishPostAction(id: string): Promise<{ ok: boolean }> {
  if (!(await authed())) return { ok: false };
  const published = await postsRepo.publish(id);
  if (!published) return { ok: false };
  revalidateTag("posts", "hours");
  revalidateTag(`post:${published.slug}`, "days");
  return { ok: true };
}

export async function deletePostAction(id: string): Promise<{ ok: boolean }> {
  if (!(await authed())) return { ok: false };
  const [row] = await getDb()
    .update(posts)
    .set({ deletedAt: new Date() })
    .where(eq(posts.id, id))
    .returning({ id: posts.id });
  if (!row) return { ok: false };
  revalidateTag("posts", "hours");
  return { ok: true };
}

export async function logoutAction(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}
