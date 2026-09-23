import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { rateLimit } from "@/lib/server/redis";
import { ADMIN_COOKIE, makeSessionCookie } from "@/lib/server/session";

// 登录：校 ADMIN_TOKEN → 发 httpOnly 签名会话 cookie；登出：清 cookie。
export async function POST(req: Request): Promise<Response> {
  // 登录爆破防护（审计 F-1）：单 IP 5 次/5 分钟，fail-open 与全站同口径。
  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ??
    "local";
  const rl = await rateLimit(`admin-login:${ip}`, 5, 300);
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(rl.retryAfter ?? 300),
      },
    });
  }
  let token = "";
  try {
    token = String((await req.json()).token ?? "");
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const want = process.env.ADMIN_TOKEN;
  // 恒时比较（与 admin-auth.ts/session.ts 同口径）：SHA-256 归一等长，消除长度/时序侧信道。
  const ok =
    !!want &&
    token.length > 0 &&
    timingSafeEqual(
      createHash("sha256").update(token).digest(),
      createHash("sha256").update(want).digest(),
    );
  if (!ok) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const value = makeSessionCookie();
  if (!value) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
  (await cookies()).set(ADMIN_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
    // TLS 由 Traefik 终结；生产强制 Secure（审计 F-2 残余部分）
    secure: process.env.NODE_ENV === "production",
  });
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
}

export async function DELETE(): Promise<Response> {
  (await cookies()).delete(ADMIN_COOKIE);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
}
