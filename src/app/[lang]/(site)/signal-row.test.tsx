import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { SignalRow } from "./signal-row";

/**
 * I-2：rift-collapse 点名是本组件存在的全部理由——必须用渲染断言把
 * 「Link 收到 transitionTypes: ["rift-collapse"]」钉死（此前只靠 e2e 撞运气）。
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
});
