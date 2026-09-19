import { desc, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getDb } from "@/lib/db/client";
import { posts } from "@/lib/db/schema";
import { ADMIN_COOKIE, verifySessionCookie } from "@/lib/server/session";
import { deletePostAction, logoutAction, publishPostAction } from "./actions";

// cacheComponents：cookies()/DB 属 runtime 数据，收进 Suspense 动态体；外壳静态可预渲染。

function Row({ p }: { p: typeof posts.$inferSelect }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-border py-3">
      <div className="min-w-0">
        <p className="truncate text-sm text-ink">{p.title}</p>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
          {p.status} · {p.locale} · /{p.slug}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {p.status !== "published" ? (
          <form
            action={async () => {
              "use server";
              await publishPostAction(p.id);
            }}
          >
            <button
              type="submit"
              className="rounded-sm border border-border-strong px-2 py-1 text-xs text-accent"
            >
              发布
            </button>
          </form>
        ) : null}
        <form
          action={async () => {
            "use server";
            await deletePostAction(p.id);
          }}
        >
          <button
            type="submit"
            className="rounded-sm border border-border px-2 py-1 text-xs text-ink-muted"
          >
            删除
          </button>
        </form>
      </div>
    </li>
  );
}

async function AdminBody() {
  if (!verifySessionCookie((await cookies()).get(ADMIN_COOKIE)?.value)) {
    redirect("/admin/login");
  }
  let rows: (typeof posts.$inferSelect)[] = [];
  if (process.env.DATABASE_URL) {
    rows = await getDb()
      .select()
      .from(posts)
      .where(isNull(posts.deletedAt))
      .orderBy(desc(posts.updatedAt))
      .limit(50);
  }
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="flex items-center justify-between">
        <h1 className="font-mono text-xs uppercase tracking-widest text-ink-muted">
          shizurak · admin
        </h1>
        <div className="flex gap-2">
          <Link
            href="/admin/new"
            className="rounded-sm border border-border-strong bg-bg-elevated px-3 py-1 text-xs text-accent"
          >
            ＋ 新文章
          </Link>
          <form
            action={async () => {
              "use server";
              await logoutAction();
            }}
          >
            <button
              type="submit"
              className="rounded-sm border border-border px-3 py-1 text-xs text-ink-muted"
            >
              登出
            </button>
          </form>
        </div>
      </header>
      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-ink-faint">
          暂无内容{process.env.DATABASE_URL ? "" : "（未配置 DATABASE_URL）"}。
        </p>
      ) : (
        <ul className="mt-8">
          {rows.map((p) => (
            <Row key={p.id} p={p} />
          ))}
        </ul>
      )}
    </main>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-3xl px-6 py-16">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
            loading…
          </p>
        </main>
      }
    >
      <AdminBody />
    </Suspense>
  );
}
