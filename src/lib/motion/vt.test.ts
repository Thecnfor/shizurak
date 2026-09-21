import { beforeEach, describe, expect, it, vi } from "vitest";
import { voidTheme } from "@/themes/registry";
import {
  installRiftTransitionDriver,
  isRiftRouteTransition,
  type RiftDriverSnapshot,
  riftGrammarFor,
} from "./vt";

/** 直接用 void 契约的 motion token（真实时长/easing，不为测试自一套数值） */
const MOTION = voidTheme.motion;

const update = () => {};

describe("isRiftRouteTransition（调用形态识别）", () => {
  it("无参数 → false（手写的裸 startViewTransition()）", () => {
    expect(isRiftRouteTransition()).toBe(false);
  });
  it("回调形态 → false（主题 morph 走这条，永远拿不到语法）", () => {
    expect(isRiftRouteTransition(update)).toBe(false);
  });
  it("options 形态（Next 路由过渡）→ true", () => {
    expect(isRiftRouteTransition({ update })).toBe(true);
  });
  it("types 为空 Set/数组 → 仍 true", () => {
    expect(isRiftRouteTransition({ update, types: [] })).toBe(true);
    expect(isRiftRouteTransition({ update, types: new Set(["default"]) })).toBe(
      true,
    );
  });
  it("types 含 rift-* → false（该过渡自带语法诉求，通用 T1 让路）", () => {
    expect(
      isRiftRouteTransition({ update, types: ["rift-collapse", "other"] }),
    ).toBe(false);
    // Set 是规范里的实际形状（Next 传 Set），必须同样认
    expect(
      isRiftRouteTransition({ update, types: new Set(["rift-collapse"]) }),
    ).toBe(false);
  });
  it("options 但没有 update 函数 → false", () => {
    expect(isRiftRouteTransition({ types: [] } as never)).toBe(false);
  });
});

describe("riftGrammarFor（正向语法闸门）", () => {
  const gate = { reduced: false, intensity: 0.7 };
  it("void 人格的路由过渡 → rift-t1", () => {
    expect(riftGrammarFor({ update }, gate)).toBe("rift-t1");
  });
  it("intensity===0（lumen/paper）→ null：不挂类，落回 UA crossfade", () => {
    expect(riftGrammarFor({ update }, { reduced: false, intensity: 0 })).toBe(
      null,
    );
  });
  it("reduced-motion → null", () => {
    expect(riftGrammarFor({ update }, { reduced: true, intensity: 0.7 })).toBe(
      null,
    );
  });
  it("非路由形态（回调 / rift-* types）→ null", () => {
    expect(riftGrammarFor(update, gate)).toBe(null);
    expect(riftGrammarFor({ update, types: ["rift-collapse"] }, gate)).toBe(
      null,
    );
  });
});

/** 造一个可控的假 native startViewTransition，回报每次调用与 promised 时钟 */
function fakeNative() {
  const calls: unknown[] = [];
  const transitions: {
    ready: Promise<void>;
    resolveReady(): void;
    finished: Promise<void>;
    resolveFinished(): void;
  }[] = [];
  const make = vi.fn((arg?: unknown) => {
    calls.push(arg);
    let resolveReady = () => {};
    let resolveFinished = () => {};
    const ready = new Promise<void>((r) => (resolveReady = r));
    const finished = new Promise<void>((r) => (resolveFinished = r));
    transitions.push({
      ready,
      resolveReady,
      finished,
      resolveFinished,
    });
    // jsdom 无 ViewTransition 类型实现，驱动只吃 ready/finished 两条 promise
    return { ready, finished } as unknown as ViewTransition;
  });
  return { make, calls, transitions };
}

describe("installRiftTransitionDriver（挂载/还原/类生命周期）", () => {
  const root = document.documentElement;

  beforeEach(() => {
    root.className = "";
    vi.restoreAllMocks();
  });

  const snapshot = (riftIntensity = 0.7): RiftDriverSnapshot => ({
    motion: MOTION,
    riftIntensity,
  });

  it("装两次不叠加包装（幂等），还原后回到原生函数", () => {
    const { make } = fakeNative();
    document.startViewTransition = make;
    const un1 = installRiftTransitionDriver(() => snapshot());
    const wrapped = document.startViewTransition;
    const un2 = installRiftTransitionDriver(() => snapshot());
    expect(document.startViewTransition).toBe(wrapped); // 第二次没再包一层
    un2();
    un1();
    expect(document.startViewTransition).toBe(make);
  });

  it("无 native 实现时是空操作，还原函数可安全调用", () => {
    const original = document.startViewTransition;
    // @ts-expect-error 故意造不支持 VT 的环境
    document.startViewTransition = undefined;
    const uninstall = installRiftTransitionDriver(() => snapshot());
    expect(() => uninstall()).not.toThrow();
    document.startViewTransition = original;
  });

  it("void 人格路由过渡：native 调用前就已挂 rift-t1，finished 后摘除", async () => {
    const { make, calls, transitions } = fakeNative();
    document.startViewTransition = make;
    const uninstall = installRiftTransitionDriver(() => snapshot());
    try {
      document.startViewTransition({ update, types: [] });
      // 硬时序：伪元素树建立时就要查到 animation-name，类必须早于 native 返回就位
      expect(calls).toHaveLength(1);
      expect(root.classList.contains("rift-t1")).toBe(true);
      transitions[0].resolveReady();
      await transitions[0].ready;
      expect(root.classList.contains("rift-tear")).toBe(true); // shader 锚点随 ready 挂上
      transitions[0].resolveFinished();
      await transitions[0].finished;
      await Promise.resolve();
      await Promise.resolve();
      expect(root.classList.contains("rift-t1")).toBe(false);
      expect(root.classList.contains("rift-tear")).toBe(false);
    } finally {
      uninstall();
    }
  });

  it("intensity===0：类不挂，且即使 __rift 在场也不起 tear 时间线（M-1）", async () => {
    const { make, transitions } = fakeNative();
    document.startViewTransition = make;
    const setTear = vi.fn();
    const setShift = vi.fn();
    Object.defineProperty(window, "__rift", {
      configurable: true,
      value: { setTear, setShift },
    });
    const uninstall = installRiftTransitionDriver(() => snapshot(0));
    try {
      document.startViewTransition({ update, types: [] });
      expect(root.classList.contains("rift-t1")).toBe(false);
      transitions[0].resolveReady();
      transitions[0].resolveFinished();
      await transitions[0].finished;
      await Promise.resolve();
      expect(setTear).not.toHaveBeenCalled();
      expect(setShift).not.toHaveBeenCalled();
    } finally {
      uninstall();
      Reflect.deleteProperty(window, "__rift");
    }
  });

  it("native 抛错（不支持 VT 的运行期）→ 语法类立即回收，不泄漏在 html 上", () => {
    const boom = vi.fn(() => {
      throw new Error("not supported");
    });
    document.startViewTransition = boom;
    const uninstall = installRiftTransitionDriver(() => snapshot());
    try {
      expect(() => document.startViewTransition({ update })).toThrow();
      expect(root.classList.contains("rift-t1")).toBe(false);
    } finally {
      uninstall();
      Reflect.deleteProperty(window, "__rift");
    }
  });

  it("并发两次过渡共用计数：前一条 finished 不该摘掉后一条的类", async () => {
    const { make, transitions } = fakeNative();
    document.startViewTransition = make;
    const uninstall = installRiftTransitionDriver(() => snapshot());
    try {
      document.startViewTransition({ update });
      document.startViewTransition({ update });
      expect(root.classList.contains("rift-t1")).toBe(true);
      transitions[0].resolveFinished();
      await transitions[0].finished;
      await Promise.resolve();
      await Promise.resolve();
      expect(root.classList.contains("rift-t1")).toBe(true); // 第二条还在飞
      transitions[1].resolveFinished();
      await transitions[1].finished;
      await Promise.resolve();
      await Promise.resolve();
      expect(root.classList.contains("rift-t1")).toBe(false);
    } finally {
      uninstall();
    }
  });
});
