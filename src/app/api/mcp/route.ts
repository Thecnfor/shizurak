import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";

// blog-as-MCP：把公开内容暴露为 MCP 工具（roadmap），供任何 MCP 客户端/Agent 直连。
// 无状态 Streamable HTTP：每请求一个 server+transport；enableJsonResponse 免 SSE。
// 只读、零密钥；无 DATABASE_URL 时回退 canned 数据。

function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

async function dbOr<T>(run: () => Promise<T>, fallback: () => T): Promise<T> {
  if (!process.env.DATABASE_URL) return fallback();
  try {
    return await run();
  } catch {
    return fallback();
  }
}

async function listPosts(limit = 20) {
  return dbOr(
    async () => {
      const { and, desc, eq, isNull } = await import("drizzle-orm");
      const { getDb } = await import("@/lib/db/client");
      const { posts } = await import("@/lib/db/schema");
      return await getDb()
        .select({
          slug: posts.slug,
          title: posts.title,
          summary: posts.summary,
          locale: posts.locale,
          publishedAt: posts.publishedAt,
        })
        .from(posts)
        .where(and(eq(posts.status, "published"), isNull(posts.deletedAt)))
        .orderBy(desc(posts.publishedAt))
        .limit(limit);
    },
    () => [
      {
        slug: "rak-cluster",
        title: "Rak：为桌面机器人赋予“呼吸感”的网络神经系统",
        summary: null as string | null,
        locale: "zh",
        publishedAt: null as Date | null,
      },
    ],
  );
}

function buildServer(): McpServer {
  const server = new McpServer({
    name: "shizurak",
    version: "0.1.0",
  });
  server.registerTool(
    "list_posts",
    {
      description: "列出站点已发布文章（最新在前）",
      inputSchema: { limit: z.number().int().min(1).max(50).optional() },
    },
    async ({ limit }) => textResult(await listPosts(limit ?? 20)),
  );
  server.registerTool(
    "search_posts",
    {
      description: "按关键词搜索文章标题/摘要/正文",
      inputSchema: {
        query: z.string(),
        locale: z.enum(["zh", "en"]).optional(),
      },
    },
    async ({ query, locale }) => {
      const rows = await listPosts(50);
      const hits = rows
        .filter(
          (r: { title: string; summary: string | null; locale?: string }) =>
            (!locale || r.locale === locale) &&
            (r.title.includes(query) || (r.summary ?? "").includes(query)),
        )
        .slice(0, 10);
      return textResult(hits);
    },
  );
  server.registerTool(
    "get_post",
    {
      description: "获取单篇文章全文（Markdown 源）",
      inputSchema: {
        slug: z.string(),
        locale: z.enum(["zh", "en"]).optional(),
      },
    },
    async ({ slug, locale }) => {
      const data = await dbOr(
        async () => {
          const { and, eq, isNull } = await import("drizzle-orm");
          const { getDb } = await import("@/lib/db/client");
          const { posts } = await import("@/lib/db/schema");
          const [row] = await getDb()
            .select({
              title: posts.title,
              summary: posts.summary,
              contentMd: posts.contentMd,
              readingTime: posts.readingTime,
            })
            .from(posts)
            .where(
              and(
                eq(posts.slug, slug),
                eq(posts.status, "published"),
                eq(posts.locale, locale ?? "zh"),
                isNull(posts.deletedAt),
              ),
            )
            .limit(1);
          return row ?? null;
        },
        () => null,
      );
      return data ? textResult(data) : textResult({ error: "not_found" });
    },
  );
  server.registerTool(
    "site_stats",
    {
      description: "站点统计（已发布文章数）",
      inputSchema: {},
    },
    async () => textResult({ posts: (await listPosts(50)).length }),
  );
  return server;
}

export async function POST(req: Request): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // 无状态
    enableJsonResponse: true,
  });
  const server = buildServer();
  await server.connect(transport);
  return transport.handleRequest(req);
}

// 无状态模式不需要会话：GET/DELETE 明确拒绝（避免误用 SSE 流）
export async function GET(): Promise<Response> {
  return new Response("stateless endpoint; use POST", { status: 405 });
}
export async function DELETE(): Promise<Response> {
  return new Response("stateless endpoint; no session to delete", {
    status: 405,
  });
}
