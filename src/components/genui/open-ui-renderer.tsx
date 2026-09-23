"use client";

import { Renderer } from "@openuidev/react-lang";
import { useThemeStore } from "@/stores/theme-store";
import { openUiLibrary } from "./open-ui-library";
import { GenUiSkinProvider } from "./skin";

/**
 * 渲染一段 openui-lang 文本（整块）。镜像 GenuiRenderer 的变体派发：
 * openuiVariant 决定缝补/原面板，streamReveal.effect==="tear" 挂 genui-tear。
 */
export function OpenUIRenderer({
  lang,
  isStreaming = false,
}: {
  lang: string;
  isStreaming?: boolean;
}) {
  const skin = useThemeStore((s) => s.resolved.genui.openuiVariant);
  const tear =
    useThemeStore((s) => s.resolved.genui.streamReveal.effect) === "tear";
  return (
    <GenUiSkinProvider value={{ skin, tear }}>
      <div data-skin={skin} className={tear ? "genui-tear" : undefined}>
        <Renderer
          response={lang}
          library={openUiLibrary}
          isStreaming={isStreaming}
        />
      </div>
    </GenUiSkinProvider>
  );
}
