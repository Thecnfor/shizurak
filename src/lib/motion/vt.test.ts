import { beforeEach, describe, expect, it, vi } from "vitest";
import { voidTheme } from "@/themes/registry";
import {
  installRiftTransitionDriver,
  isRiftRouteTransition,
  isRouteTransitionCall,
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

describe("isRouteTransitionCall（纯形态判定）", () => {
  it("只看形态，不看 types（rift-collapse 靠它拿语法）", () => {
    expect(isRouteTransitionCall(update)).toBe(false);
    expect(isRouteTransitionCall()).toBe(false);
    expect(isRouteTransitionCall({ update })).toBe(true);
    expect(isRouteTransitionCall({ update, types: ["rift-collapse"] })).toBe(
      true,
    );
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
  it("非路由形态（回调 / 无 update）→ null", () => {
    expect(riftGrammarFor(update, gate)).toBe(null);
    expect(riftGrammarFor({ types: [] } as never, gate)).toBe(null);
    expect(riftGrammarFor(undefined, gate)).toBe(null);
  });
  it("rift-collapse 点名 → rift-t2（数组与 Set 两种形状都吃）", () => {
    expect(riftGrammarFor({ update, types: ["rift-collapse"] }, gate)).toBe(
      "rift-t2",
    );
    expect(
      riftGrammarFor({ update, types: new Set(["rift-collapse"]) }, gate),
    ).toBe("rift-t2");
  });
  it("其它 rift-* 点名既不拿 T2 也不拿 T1 → null（单语法铁律的派发面）", () => {
    expect(riftGrammarFor({ update, types: ["rift-tear"] }, gate)).toBe(null);
    expect(
      riftGrammarFor({ update, types: ["rift-anything", "default"] }, gate),
    ).toBe(null);
  });
  it("烈度/减少动画门优先于点名：rift-collapse 也进不了崩解路径", () => {
    expect(
      riftGrammarFor(
        { update, types: ["rift-collapse"] },
        { reduced: false, intensity: 0 },
      ),
    ).toBe(null);
    expect(
      riftGrammarFor(
        { update, types: ["rift-collapse"] },
        { reduced: true, intensity: 0.7 },
      ),
    ).toBe(null);
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

  it("rift-collapse：挂 rift-t2 而非 T1，同步写 --rift-t2-duration，finished 归零摘类拔变量", async () => {
    const { make, transitions } = fakeNative();
    document.startViewTransition = make;
    const setCollapse = vi.fn();
    const setTear = vi.fn();
    Object.defineProperty(window, "__rift", {
      configurable: true,
      value: { setTear, setShift: vi.fn(), setCollapse },
    });
    const uninstall = installRiftTransitionDriver(() => snapshot());
    try {
      // DOM 库类型只认 string[]，而驱动的真实入口吃任意 Iterable（Next 实测传 Set）：
      // 用宽松签名调用，不在测试里把 Set 伪装成数组
      (document.startViewTransition as (arg: unknown) => ViewTransition)({
        update,
        types: new Set(["rift-collapse"]),
      });
      expect(root.classList.contains("rift-t2")).toBe(true);
      // 单语法互斥：崩解这程上 T1 的类与 shader 锚点都不存在
      expect(root.classList.contains("rift-t1")).toBe(false);
      expect(root.classList.contains("rift-tear")).toBe(false);
      // min(600, duration.section)：void 的 section=800 → 封到 600ms 上限
      expect(root.style.getPropertyValue("--rift-t2-duration")).toBe("600ms");

      transitions[0].resolveReady();
      await transitions[0].ready;
      // 崩解时间线以 ready 为锚（与 CSS 伪元素动画同起点），走真 rAF 推帧
      await frames(3);
      expect(setCollapse).toHaveBeenCalled();
      expect(setCollapse.mock.calls.at(-1)?.[0]).toBeGreaterThan(0);
      // T2 不该顺手驱动 T1 的 tear 通道
      expect(setTear).not.toHaveBeenCalled();

      transitions[0].resolveFinished();
      await transitions[0].finished;
      await microtasks();
      expect(setCollapse).toHaveBeenLastCalledWith(0);
      expect(root.classList.contains("rift-t2")).toBe(false);
      expect(root.style.getPropertyValue("--rift-t2-duration")).toBe("");
    } finally {
      uninstall();
      Reflect.deleteProperty(window, "__rift");
    }
  });

  it("崩解时长与 motion token 同源：section 缩短时 CSS 变量跟着缩", () => {
    const { make } = fakeNative();
    document.startViewTransition = make;
    const fast: RiftDriverSnapshot = {
      motion: { ...MOTION, duration: { ...MOTION.duration, section: 420 } },
      riftIntensity: 0.7,
    };
    const uninstall = installRiftTransitionDriver(() => fast);
    try {
      document.startViewTransition({ update, types: ["rift-collapse"] });
      expect(root.style.getPropertyValue("--rift-t2-duration")).toBe("420ms");
    } finally {
      uninstall();
      root.classList.remove("rift-t2");
      root.style.removeProperty("--rift-t2-duration");
    }
  });

  it("intensity===0 的崩解点名（lumen 点 Lab）：两类都不挂，setCollapse 零调用", async () => {
    const { make, transitions } = fakeNative();
    document.startViewTransition = make;
    const setCollapse = vi.fn();
    Object.defineProperty(window, "__rift", {
      configurable: true,
      value: { setTear: vi.fn(), setShift: vi.fn(), setCollapse },
    });
    const uninstall = installRiftTransitionDriver(() => snapshot(0));
    try {
      document.startViewTransition({ update, types: ["rift-collapse"] });
      expect(root.classList.contains("rift-t2")).toBe(false);
      expect(root.style.getPropertyValue("--rift-t2-duration")).toBe("");
      transitions[0].resolveReady();
      transitions[0].resolveFinished();
      await transitions[0].finished;
      await microtasks();
      expect(setCollapse).not.toHaveBeenCalled();
    } finally {
      uninstall();
      Reflect.deleteProperty(window, "__rift");
    }
  });
});

/** 等几帧真 rAF（GSAP ticker 靠它跑），给时间线一个推帧机会 */
async function frames(n: number) {
  for (let i = 0; i < n; i++)
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
}

/** 把 finished 上的 then 链（含 settle）排干 */
async function microtasks() {
  for (let i = 0; i < 6; i++) await Promise.resolve();
}
