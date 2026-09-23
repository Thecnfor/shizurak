import { cacheLife, cacheTag } from "next/cache";
import { withDeadline } from "@/lib/utils";
import type { SavedSpec } from "../repo/agent";

export interface SharedSpecSummary {
  id: string;
  kind: string;
  themeId: string;
}

/**
 * 已分享 spec 列表（缓存，标签 specs；保存时 revalidate）。
 * DB 故障在边界**内**化归空态（T9 评审批 C，比 I-1 定案更严一档）：黑洞 DB 下
 * 实测无论页面侧 try/catch 还是边界内 withDeadline，拒绝都会被 Next 的缓存
 * 工作单元作为独立 fatal 上报、杀死构建（empty 数组可入缓存，但 cacheLife
 * 为 minutes，短暂抖动后自愈；分享列表是装饰性索引，不值得 500 也不值得挡发布）。
 */
export async function listSharedSpecs(): Promise<SharedSpecSummary[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("specs");
  try {
    return await withDeadline(
      (async () => {
        const { specRepo } = await import("../repo/agent");
        return specRepo.listShared();
      })(),
      3_000,
      "listSharedSpecs",
    );
  } catch {
    return [];
  }
}

/** 单份分享 spec（缓存，标签 spec:<id>）。仅暴露 shared=true，与列表意图一致。 */
export async function getCachedSpec(
  id: string,
): Promise<{ kind: SavedSpec["kind"]; themeId: string; spec: unknown } | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`spec:${id}`, "specs");
  // 非 UUID 直接视为不存在（否则 Postgres 对 uuid 比较抛 22P02 → 500）
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    return null;
  const { specRepo } = await import("../repo/agent");
  const row = await specRepo.load(id);
  if (!row || !row.shared) return null;
  return { kind: row.kind, themeId: row.themeId, spec: row.spec };
}
