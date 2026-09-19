import { z } from "zod";
import type { ToolsService } from "@/kernel/plugins/tool-registry";

/** 无 DB（测试/降级）时的确定性公开数据。 */
export const CANNED_POSTS = [
  { slug: "rak-cluster", title: "Rak：为桌面机器人赋予“呼吸感”的网络神经系统" },
  { slug: "flowmind", title: "FlowMind：跨仪表盘 Agent 内核实践" },
  { slug: "k3s-at-school", title: "在学生宿舍跑一套生产级 k3s 集群" },
];

async function queryPosts(query: string) {
  // 有 DATABASE_URL → 真读 blog.posts（server 侧动态导入，避免 server-only 污染测试）；否则回退。
  if (!process.env.DATABASE_URL) {
    const hits = CANNED_POSTS.filter((p) =>
      query ? p.title.includes(query) || query === "" : true,
    );
    return { count: hits.length, posts: hits };
  }
  const { and, ilike, isNull, eq } = await import("drizzle-orm");
  const { getDb } = await import("@/lib/db/client");
  const { posts } = await import("@/lib/db/schema");
  const where = [eq(posts.status, "published"), isNull(posts.deletedAt)];
  if (query) where.push(ilike(posts.title, `%${query}%`));
  const rows = await getDb()
    .select({ slug: posts.slug, title: posts.title })
    .from(posts)
    .where(and(...where))
    .limit(10);
  return { count: rows.length, posts: rows };
}

export function registerDomainTools(tools: ToolsService): void {
  tools.register({
    id: "searchPosts",
    level: "L0",
    description: "按关键词检索公开文章（真实数据）",
    parameters: z.object({ query: z.string() }),
    execute: ({ query }) => queryPosts(query),
  });

  tools.register({
    id: "getSiteStats",
    level: "L0",
    description: "站点统计（文章数）",
    parameters: z.object({}),
    execute: async () => {
      if (process.env.DATABASE_URL) {
        // 真数：不被列表 limit(10) 遮蔽
        const { and, count, eq, isNull } = await import("drizzle-orm");
        const { getDb } = await import("@/lib/db/client");
        const { posts } = await import("@/lib/db/schema");
        const [row] = await getDb()
          .select({ n: count() })
          .from(posts)
          .where(and(eq(posts.status, "published"), isNull(posts.deletedAt)));
        return { posts: Number(row?.n ?? 0) };
      }
      return { posts: CANNED_POSTS.length };
    },
  });

  tools.register({
    id: "contactAuthor",
    level: "L2",
    description: "给作者发送消息（不可逆，需确认）",
    parameters: z.object({ message: z.string().min(1) }),
    // 只有经 SDK 审批层（toolApproval: user-approval）用户确认后才会被调到这里
    execute: async ({ message }, ctx) => {
      if (process.env.DATABASE_URL) {
        const { getDb } = await import("@/lib/db/client");
        const { contacts } = await import("@/lib/db/schema/agent");
        const [row] = await getDb()
          .insert(contacts)
          .values({
            message,
            threadId: ctx.threadId ?? null,
            locale: ctx.locale,
          })
          .returning({ id: contacts.id });
        return { queued: true, id: row.id };
      }
      return { queued: true };
    },
    preview: ({ message }) => ({
      title: "联系作者",
      summary: message,
      riskNote: "将向作者发送一条站外消息",
    }),
  });
}
