import type { Spec } from "@json-render/react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GenuiRenderer } from "./genui-renderer";

const spec: Spec = {
  root: "card",
  elements: {
    card: {
      type: "Card",
      props: { title: "Rak 集群" },
      children: ["title-text", "metrics"],
    },
    "title-text": { type: "Text", props: { text: "为桌面机器人赋予呼吸感" } },
    metrics: {
      type: "MetricGrid",
      props: {
        metrics: [
          { label: "节点", value: 5 },
          { label: "文章", value: 3 },
        ],
      },
    },
  },
};

describe("GenuiRenderer（真实 json-render 渲染）", () => {
  it("渲染 Card/Text/MetricGrid 的 spec", () => {
    render(<GenuiRenderer spec={spec} />);
    expect(screen.getByText("Rak 集群")).toBeInTheDocument();
    expect(screen.getByText("为桌面机器人赋予呼吸感")).toBeInTheDocument();
    expect(screen.getByText("节点")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});
