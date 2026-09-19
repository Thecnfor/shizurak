import { createHash, timingSafeEqual } from "node:crypto";
import { verifySessionCookie } from "./session";

// 作者侧接口鉴权：Bearer $ADMIN_TOKEN 或 httpOnly 签名会话 cookie（/admin 登录后获得）。
// better-auth + Passkey 的完整会话登录后续替换（架构规范 §8）。
// 恒时比较：两侧先 SHA-256 归一等长，短路比较与长度侧信道一并消除。
export function requireAdmin(req: Request): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const auth = req.headers.get("authorization") ?? "";
  const h = (v: string) => createHash("sha256").update(v).digest();
  if (auth && timingSafeEqual(h(auth), h(`Bearer ${token}`))) return true;
  const cookie = req.headers.get("cookie") ?? "";
  const m = /(?:^|;\s*)shizurak-admin-session=([^;]+)/.exec(cookie);
  return verifySessionCookie(m?.[1]);
}

export const unauthorized = () =>
  new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
