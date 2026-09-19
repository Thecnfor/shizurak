import "server-only";
import { eq } from "drizzle-orm";
import type { Draft } from "@/lib/content/agent";
import { compileContent } from "@/lib/content/compile";
import { getDb } from "../client";
import { posts } from "../schema";

function slugify(title: string): string {
  const ascii = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return ascii || `post-${Date.now().toString(36)}`;
}

export const postsRepo = {
  async createDraft(draft: Draft): Promise<{ id: string; slug: string }> {
    const c = await compileContent(draft.contentMd);
    const [row] = await getDb()
      .insert(posts)
      .values({
        slug: slugify(draft.title),
        title: draft.title,
        summary: draft.summary,
        contentMd: draft.contentMd,
        contentHtml: c.html,
        toc: c.toc,
        readingTime: c.minutes,
        status: "draft",
        type: "post",
        locale: "zh",
        aiInvolvement: "generated",
      })
      .returning({ id: posts.id, slug: posts.slug });
    return row;
  },
  async publish(id: string): Promise<{ slug: string } | null> {
    const [row] = await getDb()
      .update(posts)
      .set({
        status: "published",
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(posts.id, id))
      .returning({ slug: posts.slug });
    return row ?? null;
  },
};
