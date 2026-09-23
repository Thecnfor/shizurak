"use client";

import { JSONUIProvider, Renderer, type Spec } from "@json-render/react";
import { useThemeStore } from "@/stores/theme-store";
import { genuiRegistry } from "./registry";
import { GenUiSkinProvider } from "./skin";

/**
 * 渲染一份 json-render Spec。变体派发（契约 v2 catalogVariant/streamReveal）在这里
 * 完成：renderer 读主题标量 → Provider 下发给帧组件；根节点挂 data-skin 点名皮肤，
 * effect==="tear" 时带 genui-tear（一次性撕开显现，见 globals.css）。
 */
export function GenuiRenderer({ spec }: { spec: Spec }) {
  const skin = useThemeStore((s) => s.resolved.genui.catalogVariant);
  const tear =
    useThemeStore((s) => s.resolved.genui.streamReveal.effect) === "tear";
  return (
    <GenUiSkinProvider value={{ skin, tear }}>
      <div data-skin={skin} className={tear ? "genui-tear" : undefined}>
        <JSONUIProvider
          registry={genuiRegistry}
          initialState={spec.state ?? {}}
        >
          <Renderer spec={spec} registry={genuiRegistry} />
        </JSONUIProvider>
      </div>
    </GenUiSkinProvider>
  );
}
