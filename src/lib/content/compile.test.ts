import { describe, expect, it } from "vitest";
import { compileContent } from "./compile";

const md = `# 标题

## 网络神经系统

正文一段，含行内 \`code\`。

\`\`\`ts
const rak = 1 + 1;
\`\`\`

### 更深一层

公式：$E=mc^2$
`;

describe("compileContent（真实 unified/shiki/katex 管线）", () => {
  // shiki 首次加载主题/语法有冷启动开销，并行全量下易触顶默认超时 → 放宽。
  it("编译出 HTML + TOC + 阅读时长", { timeout: 30000 }, async () => {
    const out = await compileContent(md);
    expect(out.html).toContain("<h2");
    expect(out.html).toContain("网络神经系统");
    // shiki 双主题产物：带 --shiki-dark CSS 变量与 token spans
    expect(out.html).toMatch(/shiki|--shiki-dark/);
    // TOC 收集 h2/h3（有 id）
    expect(out.toc.map((t) => t.text)).toEqual(
      expect.arrayContaining(["网络神经系统", "更深一层"]),
    );
    expect(out.toc.every((t) => t.id.length > 0)).toBe(true);
    expect(out.minutes).toBeGreaterThanOrEqual(1);
  });
});
