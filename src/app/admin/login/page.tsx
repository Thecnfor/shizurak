"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const router = useRouter();
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <h1 className="font-mono text-xs uppercase tracking-widest text-ink-muted">
        shizurak · admin
      </h1>
      <form
        className="mt-4 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(false);
          const r = await fetch("/api/admin/session", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token }),
          });
          setBusy(false);
          if (r.ok) router.push("/admin");
          else setErr(true);
        }}
      >
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ADMIN_TOKEN"
          className="flex-1 rounded-sm border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring-color)]"
        />
        <button
          type="submit"
          disabled={busy || !token}
          className="rounded-sm border border-border-strong bg-bg-elevated px-4 py-2 text-sm text-accent disabled:opacity-40"
        >
          {busy ? "…" : "登录"}
        </button>
      </form>
      {err ? (
        <p className="mt-3 text-xs text-[var(--danger)]">令牌无效</p>
      ) : null}
    </main>
  );
}
