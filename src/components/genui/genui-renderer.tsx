"use client";

import { JSONUIProvider, Renderer, type Spec } from "@json-render/react";
import { genuiRegistry } from "./registry";

/** 渲染一份 json-render Spec；皮肤随主题 CSS 变量自动换装（token 驱动）。 */
export function GenuiRenderer({ spec }: { spec: Spec }) {
  return (
    <JSONUIProvider registry={genuiRegistry} initialState={spec.state ?? {}}>
      <Renderer spec={spec} registry={genuiRegistry} />
    </JSONUIProvider>
  );
}
