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
    g.__shizurakPg ??= postgres(url, { max: 5, prepare: false });
    g.__shizurakDb = drizzle(g.__shizurakPg, { schema });
  }
  return g.__shizurakDb;
}
