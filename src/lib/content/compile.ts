import shiki from "@shikijs/rehype";
import readingTime from "reading-time";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

export interface TocItem {
  id: string;
  text: string;
  depth: number;
}

export interface CompiledContent {
  html: string;
  toc: TocItem[];
  minutes: number;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}

/** 从已 slugged 的 HTML 解析 h2/h3 为 TOC（比插入 hast 插件更稳）。 */
function extractToc(html: string): TocItem[] {
  const re = /<h([23])\s[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g;
  return [...html.matchAll(re)].map((m) => ({
    depth: Number(m[1]),
    id: m[2],
    text: stripTags(m[3]),
  }));
}

/**
 * 发布时编译 Markdown → { html, toc, minutes }（架构规范 §6.2）。
 * 管线：remark-gfm/math → rehype-katex → shiki 双主题 → slug → stringify。
 * 运行时零编译开销：产物存 content_html，`use cache` 直读。
 */
export async function compileContent(md: string): Promise<CompiledContent> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeKatex)
    .use(shiki, {
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
    })
    .use(rehypeSlug)
    .use(rehypeStringify, { allowDangerousHtml: true });

  const html = String(await processor.process(md));
  return {
    html,
    toc: extractToc(html),
    minutes: Math.round(readingTime(md).minutes) || 1,
  };
}
