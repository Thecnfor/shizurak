import type { Theme } from "@/themes/contract";

/**
 * 主题继承浅合并：child 覆写的四层字段胜出，未覆写的从 base 继承。
 * tokens 按 mode 维度浅合并（child 提供某 mode 则整块替换该 mode）。
 * 纯函数，供 registry 物化 extends 链使用，也便于单测。
 */
export function mergeTheme(base: Theme, child: Theme): Theme {
  return {
    meta: child.meta,
    tokens: { ...base.tokens, ...child.tokens },
    motion: { ...base.motion, ...child.motion },
    effects: { ...base.effects, ...child.effects },
    genui: { ...base.genui, ...child.genui },
  };
}
