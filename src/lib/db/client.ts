import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * 仅服务端的 Drizzle 客户端（postgres.js 驱动）。
 * dev HMR 用 globalThis 缓存连接池，避免热重载累积连接。
 * 组件层禁止 import 本模块（架构规范 §3 边界规则）——只经 lib/db/queries 暴露。
 */
type Db = PostgresJsDatabase<typeof schema>;

const g = globalThis as unknown as {
  __shizurakPg?: ReturnType<typeof postgres>;
  __shizurakDb?: Db;
};

export function getDb(): Db {
  if (!g.__shizurakDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL 未配置");
    // 驱动层封顶（I-1 的第一道防线，单位见 postgres.js README）：
    // - connect_timeout: 2 秒——TCP 黑洞（DB 宿主机不可达）不再拖满 ≈11s  SYN 超时；
    // - connection.statement_timeout: 2000ms——经启动包 GUC 下发，服务端杀掉
    //   慢查（postgres.js 无同名选项，任意 runtime 配置项都可经 connection 透传）；
    // - idle_timeout: 20 秒——悬挂的废连接及早回收，不占 max:5 的池位。
    // 查询级硬保证仍在 lib/db/queries/posts.ts 的边界内 withDeadline（驱动盖不到
    // 排队/协议层卡死等路径），两层合起来把 DB 故障封在 3s 内。
    g.__shizurakPg ??= postgres(url, {
      max: 5,
      prepare: false,
      connect_timeout: 2,
      idle_timeout: 20,
      connection: { statement_timeout: 2000 },
    });
    g.__shizurakDb = drizzle(g.__shizurakPg, { schema });
  }
  return g.__shizurakDb;
}
