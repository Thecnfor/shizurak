import { generateText } from "ai";
import { getKernel } from "@/kernel";
import type { ModelsService } from "@/kernel/plugins/model-adapter";

export interface Draft {
  title: string;
  summary: string;
  contentMd: string;
  tags: string[];
}

function extractJson(text: string): unknown {
  const fence = /```json\s*([\s\S]*?)```/i.exec(text);
  const body = fence?.[1] ?? text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  return JSON.parse(body.slice(start, end + 1));
}

/**
 * 作者侧内容 Agent（架构规范 §5.3）：素材 → 结构化草稿。
 * 用内核 ai.models 的真实 LanguageModel（ARK glm），单次 generateText 出 JSON——
 * 不走工具循环（草稿任务无需工具，避免多轮 ARK 往返拖慢/超时）。
 */
export async function generateDraft(material: string): Promise<Draft> {
  const kernel = await getKernel();
  const models = kernel.context.require<ModelsService>("ai.models");
  const { text } = await generateText({
    model: models.chat(),
    temperature: 0.3,
    system:
      "你是中文技术博客编辑。把素材整理成一篇结构清晰的文章草稿。只输出一个 JSON 对象，不要任何解释、markdown 代码块围栏之外的文本，也不要任何 spec/openui 块。",
    prompt: `输出 JSON：{"title":string,"summary":string,"contentMd":string(中文 Markdown，## 小节，3-5 段、共 ≤ 400 字的精简草稿，可含一个代码块),"tags":string[]}。\n\n素材：\n${material}`,
  });
  const p = extractJson(text) as Record<string, unknown>;
  return {
    title: String(p.title ?? "未命名草稿"),
    summary: String(p.summary ?? ""),
    contentMd: String(p.contentMd ?? text),
    tags: Array.isArray(p.tags) ? p.tags.map((t) => String(t)) : [],
  };
}
