import { cookies } from "next/headers";
import { ADMIN_COOKIE, makeSessionCookie } from "@/lib/server/session";

// 登录：校 ADMIN_TOKEN → 发 httpOnly 签名会话 cookie；登出：清 cookie。
export async function POST(req: Request): Promise<Response> {
  let token = "";
  try {
    token = String((await req.json()).token ?? "");
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const want = process.env.ADMIN_TOKEN;
  if (!want || token !== want) {
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
