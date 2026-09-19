import shiki from "@shikijs/rehype";
import readingTime from "reading-time";
import rehypeKatex from "rehype-katex";
import sanitize, { defaultSchema } from "rehype-sanitize";
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
 * 消毒 schema：defaultSchema 之上放行本管线产物必需的 —— className/style（Shiki
 * 双主题 CSS 变量）、id（锚点/TOC）、KaTeX 的 MathML 标签族、GFM 任务列表 input。
 * 仍拦掉 script/iframe/on* 事件/危险协议——纵深防御，即便素材被污染也不落毒。
 */
const mathTags = [
  "math",
  "semantics",
  "annotation",
  "annotation-xml",
  "mrow",
  "mi",
  "mo",
  "mn",
  "ms",
  "mtext",
  "mspace",
  "msup",
  "msub",
  "msubsup",
  "mmultiscripts",
  "mfrac",
  "msqrt",
  "mroot",
  "merror",
  "mpadded",
  "mphantom",
  "menclose",
  "mover",
  "munder",
  "munderover",
  "mprescripts",
  "mtable",
  "mtr",
  "mtd",
  "mlabeledtr",
  "mstyle",
  "none",
];

const schema: typeof defaultSchema = {
  ...defaultSchema,
  tagNames: [
    ...new Set([
      ...(defaultSchema.tagNames ?? []),
      "figure",
      "figcaption",
      "sup",
      "sub",
      "details",
      "summary",
      "abbr",
      "mark",
      "kbd",
      "samp",
      "var",
      "input",
      ...mathTags,
    ]),
  ],
  attributes: {
    ...defaultSchema.attributes,
    // biome-ignore lint/suspicious/noExplicitAny: hast schema 形状
    "*": [
      ...((defaultSchema.attributes?.["*"] as any) ?? []),
      "className",
      "id",
      "style",
      "title",
      "aria-hidden",
      "role",
    ],
    a: [["href", /^(?:https?:|mailto:|\/(?!\/))/i]],
    input: ["type", "checked", "disabled"],
    img: [
      ...((defaultSchema.attributes?.img as any) ?? []),
      "width",
      "height",
      "loading",
      "decoding",
    ],
    annotation: ["encoding"],
    "annotation-xml": ["encoding"],
    math: ["xmlns", "display"],
    mo: ["stretchy", "lspace", "rspace", "form", "fence", "separator"],
    mspace: ["width"],
    mpadded: ["height", "depth", "width", "lspace", "voffset"],
    menclose: ["notation"],
    mtable: [
      "columnalign",
      "columnspacing",
      "columnwidth",
      "rowspacing",
      "displaystyle",
    ],
    mstyle: ["scriptlevel", "displaystyle"],
    mtd: ["columnalign"],
    mtext: [],
  },
};

/**
 * 发布时编译 Markdown → { html, toc, minutes }（架构规范 §6.2）。
 * 管线：remark-gfm/math → rehype-katex → shiki 双主题 → slug → **sanitize** → stringify。
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
    .use(sanitize, schema)
    .use(rehypeStringify, { allowDangerousHtml: true });

  const html = String(await processor.process(md));
  return {
    html,
    toc: extractToc(html),
    minutes: Math.round(readingTime(md).minutes) || 1,
  };
}
