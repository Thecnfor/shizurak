// 仅供服务端 Route Handler 使用（不加 server-only 标记，以免 route 测试在 Node 环境导入时抛错）。
import { Redis } from "ioredis";

/** 集群 Redis 懒连接（globalThis 复用）；无 REDIS_URL 时降级为不限流。 */
const g = globalThis as unknown as { __shizurakRedis?: Redis };

function redis(): Redis | undefined {
  const url = process.env.REDIS_URL;
  if (!url) return undefined;
  if (!g.__shizurakRedis) {
    g.__shizurakRedis = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: false,
      lazyConnect: false,
    });
    g.__shizurakRedis.on("error", () => {});
  }
  return g.__shizurakRedis;
}

export interface RateResult {
  ok: boolean;
  retryAfter?: number;
}

/** 固定窗口令牌桶（成本三重闸①，架构规范 §5.1 / Harness 规范 §7）。 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateResult> {
  const r = redis();
  if (!r) return { ok: true }; // 无 Redis → 放行（开发/降级）
  try {
    const k = `blog:rl:${key}`;
    const n = await r.incr(k);
    if (n === 1) await r.expire(k, windowSec);
    if (n > limit) {
      const ttl = await r.ttl(k);
      return { ok: false, retryAfter: ttl > 0 ? ttl : windowSec };
    }
    return { ok: true };
  } catch {
    return { ok: true }; // Redis 故障不致命（fail-open）
  }
}
