import { describe, expect, it } from "vitest";
import { resolveTheme } from "@/lib/themes/resolve";
import { lumenTheme } from "@/themes/lumen";
import { voidTheme } from "@/themes/void";

describe("契约 v2", () => {
  it("幕人格：renderer=rift-layer，无挂件字段", () => {
    expect(voidTheme.effects.renderer).toBe("rift-layer");
    expect(voidTheme.effects.hum).toEqual({
      breath: 0.6,
      flashlight: true,
      tremor: 0.3,
    });
    expect(voidTheme.effects.rift).toEqual({
      tear: "diagonal",
      intensity: 0.7,
    });
    expect(voidTheme.genui.catalogVariant).toBe("stitch");
    expect(voidTheme.motion.easing.rift).toBe("cubic-bezier(0.85, 0, 0.15, 1)");
  });
  it("lumen：renderer=none，仅拉焦", () => {
    expect(lumenTheme.effects.renderer).toBe("none");
    expect(lumenTheme.effects.rift.intensity).toBe(0);
  });
  it("overrides 只认三个旋钮", () => {
    const r = resolveTheme(voidTheme, "dark", {
      hum: 0,
      riftIntensity: 1,
      motionSpeed: 2,
    });
    expect(r.effects.hum.breath).toBe(0);
    expect(r.effects.hum.flashlight).toBe(false);
    expect(r.effects.rift.intensity).toBe(1);
    expect(r.motion.duration.ui).toBe(voidTheme.motion.duration.ui * 2);
  });
});
