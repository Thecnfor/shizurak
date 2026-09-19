import { cacheLife, cacheTag } from "next/cache";
import type { SavedSpec } from "../repo/agent";

export interface SharedSpecSummary {
  id: string;
  kind: string;
  themeId: string;
}

/** 已分享 spec 列表（缓存，标签 specs；保存时 revalidate）。 */
export async function listSharedSpecs(): Promise<SharedSpecSummary[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("specs");
  const { specRepo } = await import("../repo/agent");
  return specRepo.listShared();
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
