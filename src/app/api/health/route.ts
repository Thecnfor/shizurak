// K8s probe / Uptime-Kuma 健康检查（架构规范 §12）：连通性 + 版本，best-effort。
// cacheComponents 下 Route Handler 天然动态。
export async function GET(): Promise<Response> {
  const out: Record<string, unknown> = {
    ok: true,
    version: process.env.APP_VERSION ?? "dev",
    ts: new Date().toISOString(),
  };
  if (process.env.DATABASE_URL) {
    try {
      const { getDb } = await import("@/lib/db/client");
      const { sql } = await import("drizzle-orm");
      await getDb().execute(sql`select 1`);
      out.db = "up";
    } catch {
      out.db = "down";
      out.ok = false;
    }
  } else {
    out.db = "unconfigured";
  }
  const status = out.ok ? 200 : 503;
  return new Response(JSON.stringify(out), {
    status,
    headers: { "content-type": "application/json" },
  });
}
