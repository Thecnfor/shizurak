import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

// /admin 的轻量会话：ADMIN_TOKEN 登录 → httpOnly 签名 cookie。
// better-auth + Passkey 落地时替换（架构规范 §8）；当前用它守住 /admin 与 /api/admin/*。
export const ADMIN_COOKIE = "shizurak-admin-session";

function expected(): string | null {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return null;
  return createHash("sha256")
    .update(`${token}::shizurak-admin-session`)
    .digest("hex");
}

/** 登录成功后写入 cookie 的值（不含 token 本体）。 */
export function makeSessionCookie(): string | null {
  return expected();
}

export function verifySessionCookie(value: string | undefined): boolean {
  const want = expected();
  if (!want || !value) return false;
  const a = createHash("sha256").update(value).digest();
  const b = createHash("sha256").update(want).digest();
  return timingSafeEqual(a, b);
}
