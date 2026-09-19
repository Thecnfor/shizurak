// 作者侧接口鉴权：Bearer $ADMIN_TOKEN（K8s Secret 注入；无 UI 登录时用它守门）。
// better-auth + Passkey 的完整会话登录在 /admin UI 落地时接（架构规范 §8）。
export function requireAdmin(req: Request): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${token}`;
}

export const unauthorized = () =>
  new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
