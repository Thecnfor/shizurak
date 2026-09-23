import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { SignalRow } from "./signal-row";

/**
 * I-2：rift-collapse 点名是本组件存在的全部理由——必须用渲染断言把
 * 「Link 收到 transitionTypes: ["rift-collapse"]」钉死（此前只靠 e2e 撞运气）。
 * 遗留批补第二条线：点击时的 declareGrammarIntent 兜底（prefetch 竞态时
 * types 丢提交，意图在驱动侧接住）——同样只能 mock 接缝断言调用，e2e 面
 * 在 DB 黑洞下拿不到首页行。
 * mock next/link 捕获 props：真 next/link 在裸 jsdom 里要 Router context，
 * 且它会丢掉 transitionTypes 这类非 DOM 属性，点名单据反而拿不到。
 */
const linkProps: Array<Record<string, unknown>> = [];

vi.mock("next/link", () => ({
  default: (props: { href: string; children?: ReactNode }) => {
    linkProps.push(props as unknown as Record<string, unknown>);
    return <a href={props.href}>{props.children}</a>;
  },
}));

const declareGrammarIntent = vi.fn();
vi.mock("@/lib/motion/vt", () => ({
  declareGrammarIntent: (type: string) => declareGrammarIntent(type),
}));

describe("SignalRow（T2 崩解点名）", () => {
  it("把 transitionTypes ['rift-collapse'] 原样传给 Link", () => {
    linkProps.length = 0;
    render(
      <SignalRow
        href="/zh/posts/hello"
        title="Hello"
        meta="2026-09-20 · 3 min"
      />,
    );
    expect(linkProps).toHaveLength(1);
    expect(linkProps[0]?.transitionTypes).toEqual(["rift-collapse"]);
    // 其余 props 不因点名而丢失
    expect(linkProps[0]?.href).toBe("/zh/posts/hello");
    expect(linkProps[0]?.className).toBe("paper-row");
  });

  it("点击时同步声明 rift-collapse 意图（竞态兜底），且不拦原生导航", () => {
    linkProps.length = 0;
    declareGrammarIntent.mockClear();
    render(
      <SignalRow
        href="/zh/posts/hello"
        title="Hello"
        meta="2026-09-20 · 3 min"
      />,
    );
    const onClick = linkProps[0]?.onClick as
      | ((e: { preventDefault(): void }) => void)
      | undefined;
    expect(typeof onClick).toBe("function");
    // 只声明不拦截：事件不许被 preventDefault（导航留在 Link 原生路径）
    const ev = { preventDefault: vi.fn() };
    onClick?.(ev);
    expect(declareGrammarIntent).toHaveBeenCalledWith("rift-collapse");
    expect(ev.preventDefault).not.toHaveBeenCalled();
  });
});
