import type { Spec } from "@json-render/react";

/**
 * 解析助手消息里的 ```spec``` 代码块为 json-render Spec（Harness 规范 §3）。
 * 校验：有 root(string) + elements(object)；非法则返回 null（安全回退为纯文本）。
 */
export function parseSpecBlock(text: string): Spec | null {
  const m = /```spec\s*([\s\S]*?)```/i.exec(text);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[1].trim()) as unknown;
    return isSpec(obj) ? obj : null;
  } catch {
    return null;
  }
}

export function isSpec(v: unknown): v is Spec {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as { root?: unknown }).root === "string" &&
    typeof (v as { elements?: unknown }).elements === "object" &&
    (v as { elements?: unknown }).elements !== null
  );
}

/** 去掉 ```spec``` 块后的纯文本（用于展示块外的说明文字）。 */
export function stripSpecBlock(text: string): string {
  return text.replace(/```spec[\s\S]*?```/gi, "").trim();
}

/** 提取 ```openui``` 代码块内的 openui-lang 文本（无则 null）。 */
export function parseOpenuiBlock(text: string): string | null {
  const m = /```openui\s*([\s\S]*?)```/i.exec(text);
  return m ? m[1].trim() : null;
}

/** 去掉 ```openui``` 块后的纯文本。 */
export function stripOpenuiBlock(text: string): string {
  return text.replace(/```openui[\s\S]*?```/gi, "").trim();
}
