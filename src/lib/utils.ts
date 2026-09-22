import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * 期限竞跑：`ms` 内未落地就抛超时（底层 promise 后台继续，无人 await 即无害）。
 * 入参收 PromiseLike：drizzle 的查询构建器是 thenable 而非 Promise 实例。
 * DB 段落专用，且必须在被 await 的那个 promise 的**同一层**消费（见
 * lib/db/queries/posts.ts 的边界内下推注记）；限时后超期直接定稿骨架，
 * 页面/测试都不再被基础设施拖死。
 */
export function withDeadline<T>(
  p: PromiseLike<T>,
  ms: number,
  label = "deadline",
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label}: deadline ${ms}ms exceeded`)),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/** ISO 日期（无时区戏法：取 UTC 前 10 位，与列表页既有口径一致） */
export function fmtDate(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

/**
 * 信纸行的右列元信息：日期 · 阅读时长。readingTime 缺失就省略该段——
 * 不拿 `?? 1` 虚构一个不存在的事实（诚实标注铁律）。
 */
export function postMeta(p: {
  publishedAt: Date | null;
  readingTime: number | null;
}): string {
  return [
    fmtDate(p.publishedAt),
    p.readingTime != null ? `${p.readingTime} min` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
