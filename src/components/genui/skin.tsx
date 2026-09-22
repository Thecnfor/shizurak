"use client";

import { createContext, useContext } from "react";
import { cn } from "@/lib/utils";
import type { ThemeGenUI } from "@/themes/contract";

/**
 * GenUI 皮肤层（spec §4：契约 v2 的 catalogVariant/openuiVariant 落到运行时）。
 * renderer 读主题标量后经 Provider 下发，帧组件只认 context——两套引擎（json-render
 * / openui-lang）共用同一派发，组件不各自摸 store。
 *
 * stitch（缝补）：直角 + 1px dashed var(--border-strong) 缝线 + 16px 内距，
 * 颜色只出语义变量（后续篇章人格换肤零改动）。clean：既有面板帧原样不动。
 */
export interface GenUiSkinCtx {
  skin: ThemeGenUI["catalogVariant"];
  /** streamReveal.effect === "tear"：根节点挂 genui-tear 一次性撕开显现 */
  tear: boolean;
}

const SkinContext = createContext<GenUiSkinCtx>({ skin: "clean", tear: false });

export const GenUiSkinProvider = SkinContext.Provider;

export function useGenUiSkin(): GenUiSkinCtx {
  return useContext(SkinContext);
}

/**
 * 帧类解析：clean 直接返回 base；stitch 用 twMerge 以后置类覆写直角/缝线/内距。
 * strongBorder=false 供 Callout 这类「边框色即语义色调」的帧保留色调边色，
 * 只缝形状（dashed + 直角），不强制 --border-strong。
 */
export function frameClass(
  skin: GenUiSkinCtx["skin"],
  base: string,
  { strongBorder = true }: { strongBorder?: boolean } = {},
): string {
  if (skin !== "stitch") return base;
  return cn(
    base,
    "rounded-none border-dashed p-4",
    strongBorder ? "border-border-strong" : null,
  );
}
