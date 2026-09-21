import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * 期限竞跑：`ms` 内未落地就抛超时（底层 promise 后台继续，无人 await 即无害）。
 * DB 段落专用：不可达时 TCP 失败回要 ≈11s（本机实测），会把流式文档的 Suspense
 * 边界收尾押到同样长度；限时后超期直接定稿骨架，页面/测试都不再被基础设施拖死。
 */
export function withDeadline<T>(
  p: Promise<T>,
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
