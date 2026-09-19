import type { ReactNode } from "react";
import "../globals.css";

// /admin 独立根分支（不在 [lang] 下，robots 已 disallow）：自带 html 壳 + token 皮肤。
export const metadata = { title: "admin · shizurak", robots: { index: false } };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh" data-theme="void" data-mode="dark" suppressHydrationWarning>
      <body className="bg-bg text-ink antialiased">{children}</body>
    </html>
  );
}
