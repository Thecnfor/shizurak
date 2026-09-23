import { describe, expect, it } from "vitest";
import { resolveTheme } from "@/lib/themes/resolve";
import { lumenTheme } from "@/themes/lumen";
import { paperTheme } from "@/themes/paper";
import { terminalTheme } from "@/themes/terminal";
import { voidTheme } from "@/themes/void";

describe("契约 v2", () => {
  it("幕人格：renderer=rift-layer，无挂件字段", () => {
    expect(voidTheme.effects.renderer).toBe("rift-layer");
    expect(voidTheme.effects.hum).toEqual({
      breath: 0.6,
      flashlight: true,
      tremor: 0.3,
    });
    expect(voidTheme.effects.rift).toEqual({ intensity: 0.7 });
    expect(voidTheme.genui.catalogVariant).toBe("stitch");
    expect(voidTheme.motion.easing.rift).toBe("cubic-bezier(0.85, 0, 0.15, 1)");
  });
  it("lumen：renderer=none，仅拉焦", () => {
    expect(lumenTheme.effects.renderer).toBe("none");
    expect(lumenTheme.effects.rift.intensity).toBe(0);
  });
  it("genUI 变体派发覆盖全人格：terminal→stitch，paper→clean", () => {
    // T9 评审批 M：此前只赌 void/lumen 两点，stitch 分支的另一持有者
    // terminal 与 clean 分支的 paper 从未被点名，变体误改不会被发现
    expect(terminalTheme.genui.catalogVariant).toBe("stitch");
    expect(terminalTheme.genui.streamReveal.effect).toBe("tear");
    expect(paperTheme.genui.catalogVariant).toBe("clean");
    expect(paperTheme.genui.streamReveal.effect).toBe("fade");
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
