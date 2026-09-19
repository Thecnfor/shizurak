import { describe, expect, it } from "vitest";
import { isSpec, parseSpecBlock, stripSpecBlock } from "./parse-spec";

const spec = {
  root: "card",
  elements: {
    card: { type: "Card", props: { title: "Rak" }, children: ["t"] },
    t: { type: "Text", props: { text: "网络神经系统" } },
  },
};

describe("parseSpecBlock", () => {
  it("解析 ```spec``` 代码块为 Spec", () => {
    const text = `看这个：\n\`\`\`spec\n${JSON.stringify(spec)}\n\`\`\`\n完毕`;
    const out = parseSpecBlock(text);
    expect(out?.root).toBe("card");
    expect(out?.elements.card.type).toBe("Card");
  });
  it("无 spec 块返回 null", () => {
    expect(parseSpecBlock("普通文本，没有代码块")).toBeNull();
  });
  it("坏 JSON / 缺字段返回 null（安全回退）", () => {
    expect(parseSpecBlock("```spec\n{oops}\n```")).toBeNull();
    expect(parseSpecBlock('```spec\n{"foo":1}\n```')).toBeNull();
  });
  it("stripSpecBlock 去掉块保留说明文字", () => {
    const text = `前\n\`\`\`spec\n${JSON.stringify(spec)}\n\`\`\`\n后`;
    const stripped = stripSpecBlock(text);
    expect(stripped).toContain("前");
    expect(stripped).toContain("后");
    expect(stripped).not.toContain("```spec");
  });
  it("isSpec 结构守卫", () => {
    expect(isSpec(spec)).toBe(true);
    expect(isSpec({ root: 1 })).toBe(false);
    expect(isSpec(null)).toBe(false);
  });
});
