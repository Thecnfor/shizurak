"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { publishPostAction, saveDraftAction } from "../actions";

export default function AdminNewPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [contentMd, setContentMd] = useState("");
  const [material, setMaterial] = useState("");
  const [busy, setBusy] = useState<"" | "ai" | "save">("");
  const [note, setNote] = useState("");

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="flex items-center justify-between">
        <h1 className="font-mono text-xs uppercase tracking-widest text-ink-muted">
          新文章
        </h1>
        <Link href="/admin" className="text-xs text-ink-muted hover:text-ink">
          ← 返回列表
        </Link>
      </header>

      <section className="mt-8 rounded-md border border-border bg-surface p-4">
        <p className="text-xs text-ink-muted">
          ① 素材 → content-agent（真 LLM）生成草稿
        </p>
        <textarea
          rows={3}
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
          placeholder="贴一段素材/大纲/要点…"
          className="mt-2 w-full resize-y rounded-sm border border-border bg-bg p-2 text-sm outline-none"
        />
        <button
          type="button"
          disabled={busy !== "" || !material.trim()}
          onClick={async () => {
            setBusy("ai");
            setNote("");
            try {
              const r = await fetch("/api/admin/draft", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ material }),
              });
              if (!r.ok) throw new Error(String(r.status));
              const d = await r.json();
              // 草稿已落库；回填编辑器供人工润色
              const list = await fetch(`/api/admin/draft-content?id=${d.id}`);
              if (list.ok) {
                const c = await list.json();
                setTitle(c.title ?? "");
                setSummary(c.summary ?? "");
                setContentMd(c.contentMd ?? "");
              }
              setNote(`已生成草稿 ${String(d.id).slice(0, 8)}…，可继续润色`);
            } catch {
              setNote("生成失败（网关波动或内容问题），可稍后重试");
            } finally {
              setBusy("");
            }
          }}
          className="mt-2 rounded-sm border border-border-strong bg-bg-elevated px-3 py-1.5 text-xs text-accent disabled:opacity-40"
        >
          {busy === "ai" ? "生成中…" : "✨ 生成草稿"}
        </button>
      </section>

      <section className="mt-6 space-y-3">
        <p className="text-xs text-ink-muted">
          ② 编辑（Markdown 源，保存时编译）
        </p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题"
          className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm outline-none"
        />
        <input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="摘要"
          className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm outline-none"
        />
        <textarea
          rows={16}
          value={contentMd}
          onChange={(e) => setContentMd(e.target.value)}
          placeholder="## 正文 Markdown…"
          className="w-full resize-y rounded-sm border border-border bg-surface p-3 font-mono text-sm leading-6 outline-none"
        />
      </section>

      <section className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={busy !== "" || !title.trim() || !contentMd.trim()}
          onClick={async () => {
            setBusy("save");
            const r = await saveDraftAction({ title, summary, contentMd });
            setBusy("");
            setNote(r.ok ? "已保存草稿" : "保存失败");
            if (r.ok) router.push("/admin");
          }}
          className="rounded-sm border border-border-strong bg-bg-elevated px-4 py-2 text-sm text-ink disabled:opacity-40"
        >
          {busy === "save" ? "保存中…" : "保存草稿"}
        </button>
        <button
          type="button"
          disabled={busy !== "" || !title.trim() || !contentMd.trim()}
          onClick={async () => {
            setBusy("save");
            const saved = await saveDraftAction({ title, summary, contentMd });
            if (saved.ok && saved.id) await publishPostAction(saved.id);
            setBusy("");
            router.push("/admin");
          }}
          className="rounded-sm border border-border-strong bg-surface px-4 py-2 text-sm text-accent disabled:opacity-40"
        >
          保存并发布
        </button>
        {note ? <span className="text-xs text-ink-faint">{note}</span> : null}
      </section>
    </main>
  );
}
