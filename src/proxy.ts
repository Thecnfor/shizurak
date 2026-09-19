import { type NextRequest, NextResponse } from "next/server";
import { hasLocale, negotiateLocale } from "@/lib/i18n/negotiate";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // /admin：未持会话 cookie 先在边缘 307 到登录页（真验证在页面/server action 层）
  if (pathname.startsWith("/admin")) {
    if (pathname.startsWith("/admin/login")) return NextResponse.next();
    if (!request.cookies.get("shizurak-admin-session")?.value) {
      const u = request.nextUrl.clone();
      u.pathname = "/admin/login";
      u.search = "";
      return NextResponse.redirect(u);
    }
    return NextResponse.next();
  }
  const first = pathname.split("/")[1] ?? "";
  if (hasLocale(first)) return NextResponse.next();

  const locale = negotiateLocale(request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // 进 proxy 后由内部分支处理：/admin 走会话守卫，api/静态资源直接放行
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
