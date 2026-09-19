// 纯进程存活探针（liveness）：不碰任何依赖，只有进程本身死透才失败。
// 依赖健康（DB 等）归 /api/health（readiness）——DB 抖动不应触发重启风暴。
export async function GET(): Promise<Response> {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
