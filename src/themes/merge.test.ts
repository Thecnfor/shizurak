import { describe, expect, it } from "vitest";
import type { Theme } from "@/themes/contract";
import { lumenTheme, voidTheme } from "@/themes/registry";
import { mergeTheme } from "./merge";

describe("mergeTheme（extends 浅合并）", () => {
  it("子覆写的层胜出，未覆写的从基座继承", () => {
    // child 只改 motion.duration.ui 与 meta，tokens 声明为空 → 应继承 base(lumen) 的 tokens
    const child: Theme = {
      ...voidTheme,
      extends: "lumen",
      meta: { ...voidTheme.meta, id: "phosphor" },
      tokens: {},
      motion: {
        ...voidTheme.motion,
        duration: { ...voidTheme.motion.duration, ui: 999 },
      },
    };
    const merged = mergeTheme(lumenTheme, child);
    expect(merged.meta.id).toBe("phosphor");
    expect(merged.motion.duration.ui).toBe(999); // 来自 child
    expect(merged.tokens.light).toEqual(lumenTheme.tokens.light); // 继承 base
    expect(merged.tokens.dark).toEqual(lumenTheme.tokens.dark);
    expect(merged.effects).toEqual(voidTheme.effects); // 来自 child（spread void）
  });

  it("不修改基座与子对象（返回新对象）", () => {
    const before = lumenTheme.motion.duration.ui;
    mergeTheme(lumenTheme, {
      ...voidTheme,
      meta: { ...voidTheme.meta, id: "x" },
    });
    expect(lumenTheme.motion.duration.ui).toBe(before);
  });
});
