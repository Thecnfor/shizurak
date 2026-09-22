import type { Spec } from "@json-render/react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useThemeStore } from "@/stores/theme-store";
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

/** 把主题钉到指定人格（皮肤断言的自变量就是它）：void=stitch/tear，lumen=clean/fade */
function usePersona(themeId: "void" | "lumen") {
  useThemeStore.getState().setTheme(themeId);
}

describe("GenuiRenderer（真实 json-render 渲染）", () => {
  beforeEach(() => usePersona("void"));

  it("渲染 Card/Text/MetricGrid 的 spec", () => {
    render(<GenuiRenderer spec={spec} />);
    expect(screen.getByText("Rak 集群")).toBeInTheDocument();
    expect(screen.getByText("为桌面机器人赋予呼吸感")).toBeInTheDocument();
    expect(screen.getByText("节点")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("stitch 人格：卡框是缝补皮肤——dashed hairline/直角/无装饰，容器点名 data-skin", () => {
    const { container } = render(<GenuiRenderer spec={spec} />);
    const card = screen.getByText("Rak 集群").closest("div");
    expect(card).not.toBeNull();
    // 缝线边框：1px dashed + var(--border-strong)（Tailwind token border-border-strong）
    expect(card!.className).toContain("border");
    expect(card!.className).toContain("border-dashed");
    expect(card!.className).toContain("border-border-strong");
    // 直角 + 16px 内距（p-4）；圆角类绝不许残留
    expect(card!.className).toContain("rounded-none");
    expect(card!.className).not.toContain("rounded-md");
    // 拒绝清单：无 glow/装饰类
    expect(card!.className).not.toMatch(/shadow|glow|blur/);
    // 容器属性点名皮肤（渲染器根 + 卡框都挂，调试可见）
    expect(
      container.querySelectorAll('[data-skin="stitch"]').length,
    ).toBeGreaterThan(0);
  });

  it("tear 显现：effect==='tear' 时根节点带 genui-tear 标记", () => {
    const { container } = render(<GenuiRenderer spec={spec} />);
    expect(
      container.querySelector(".genui-tear[data-skin='stitch']"),
    ).not.toBeNull();
  });

  it("clean 人格（lumen）：原面板不动，也不挂 genui-tear", () => {
    usePersona("lumen");
    const { container } = render(<GenuiRenderer spec={spec} />);
    const card = screen.getByText("Rak 集群").closest("div");
    expect(card!.className).toContain("rounded-md");
    expect(card!.className).toContain("border-border");
    expect(card!.className).not.toContain("border-dashed");
    expect(container.querySelector(".genui-tear")).toBeNull();
    expect(container.querySelector('[data-skin="clean"]')).not.toBeNull();
  });
});
