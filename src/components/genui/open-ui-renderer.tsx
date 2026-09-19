"use client";

import { Renderer } from "@openuidev/react-lang";
import { openUiLibrary } from "./open-ui-library";

/** 渲染一段 openui-lang 文本（整块）；皮肤随主题 token 自动换装。 */
export function OpenUIRenderer({
  lang,
  isStreaming = false,
}: {
  lang: string;
  isStreaming?: boolean;
}) {
  return (
    <Renderer
      response={lang}
      library={openUiLibrary}
      isStreaming={isStreaming}
    />
  );
}
