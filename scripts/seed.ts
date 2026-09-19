import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { compileContent } from "../src/lib/content/compile";
import { posts } from "../src/lib/db/schema/posts";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL 未配置");
const client = postgres(url, { prepare: false });
const db = drizzle(client, { schema: { posts } });

const SEED = [
  {
    slug: "rak-cluster",
    title: "Rak：为桌面机器人赋予“呼吸感”的网络神经系统",
    summary:
      "自建 k3s 生产集群 + 机器人网络神经系统：把云原生基础设施与具身智能连起来的实践。",
    ai: "human" as const,
    md: `## 它是什么

Rak 是我在宿舍从零搭起的一套生产级 **k3s 集群 + 机器人神经系统**，覆盖架构、技术选型、部署与运维全链路。它不是玩具：ArgoCD GitOps、CNPG、Harbor、可观测四件套都在真实跑。

## 呼吸感的来源

桌面机器人要“像活着”，关键在通信的时序与延迟。核心栈：

\`\`\`go
// 设备状态以 MQTT 心跳上报，网关按 RTT 调节插值节奏
func (g *Gateway) tick(dev Device) {
    rtt := dev.RTT()
    g.smooth.SetAlpha(clamp(1.0/rtt, 0.05, 0.5))
}
\`\`\`

延迟 $L$ 与刷新率 $f$ 的关系近似为：

$$L \\approx \\frac{1}{2f} + d_{queue}$$

## 战绩

该作品拿到 2026 网络技术挑战赛华南赛区一等奖（榜首）与中国高校计算机大赛国家二等奖。`,
  },
  {
    slug: "flowmind-kernel",
    title: "FlowMind：跨仪表盘的 Agent 内核实践",
    summary:
      "以微内核 + 声明式依赖注入组织 Agent 能力：把插件生命周期、Service 与事件总线收敛到一处。",
    ai: "assisted" as const,
    md: `## 设计

FlowMind 的地基是同构微内核：内核只做三件事——插件生命周期、声明式依赖注入、事件总线 + Service。

## 与博客的关系

shizurak 的双层内核心智直接承接 FlowMind（cross-dashboard）的生产验证经验：插件之间零 import，只经 Service 与事件通信。

\`\`\`ts
const svc = ctx.require<ToolsService>("ai.tools");
await svc.invoke("searchPosts", { query: "呼吸感" }, execCtx);
\`\`\`

## 边界

业务逻辑一律不进内核——它们是插件。这让能力可以拔插、可测、可跨端复用。`,
  },
];

async function main() {
  for (const s of SEED) {
    const c = await compileContent(s.md);
    await db
      .insert(posts)
      .values({
        slug: s.slug,
        title: s.title,
        summary: s.summary,
        contentMd: s.md,
        contentHtml: c.html,
        toc: c.toc,
        readingTime: c.minutes,
        status: "published",
        type: "post",
        locale: "zh",
        aiInvolvement: s.ai,
        publishedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [posts.slug, posts.locale],
        set: {
          title: s.title,
          summary: s.summary,
          contentMd: s.md,
          contentHtml: c.html,
          toc: c.toc,
          readingTime: c.minutes,
          status: "published",
          aiInvolvement: s.ai,
          updatedAt: new Date(),
        },
      });
    console.log(`✓ seeded ${s.slug}（${c.minutes}min · toc=${c.toc.length}）`);
  }
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
