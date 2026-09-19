import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { hasLocale } from "@/lib/i18n/negotiate";
import enJson from "./dictionaries/en.json";
import zhJson from "./dictionaries/zh.json";

/**
 * 字典类型以中文 JSON 为唯一真源（静态导入 → 结构类型具体、可自动补全）。
 * 两份字典体量极小，静态引入无打包负担；运行时按 locale 选择。
 * 加语言 = 加一份 JSON + 扩 zhJson 结构，不改调用点。
 */
export type Dictionary = typeof zhJson;

export async function getDictionary(): Promise<Dictionary> {
  const raw = await lang();
  const locale = typeof raw === "string" ? raw : "";
  if (!hasLocale(locale)) notFound();
  return locale === "en" ? (enJson as Dictionary) : zhJson;
}
