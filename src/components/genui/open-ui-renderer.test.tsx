import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useThemeStore } from "@/stores/theme-store";
import { OpenUIRenderer } from "./open-ui-renderer";

const lang = `root = Card("Rak 概览", [
  Text("为桌面机器人赋予呼吸感", "muted"),
  Metric([{label: "节点", value: 5}])
])`;

// 只测已定义组件 + 纯文本，规避位置参数细节：用 Text 作根最稳。
const leaf = `root = Text("hello-openui")`;

describe("OpenUIRenderer（真实 openui-lang 渲染）", () => {
  beforeEach(() => {
    useThemeStore.getState().setTheme("void");
  });

  it("渲染 leaf Text", () => {
    render(<OpenUIRenderer lang={leaf} />);
    expect(screen.getByText("hello-openui")).toBeInTheDocument();
  });
  it("渲染容器树（Card + Text）", () => {
    render(<OpenUIRenderer lang={`root = Card("Rak", [Text("呼吸感")])`} />);
    expect(screen.getByText("Rak")).toBeInTheDocument();
    expect(screen.getByText("呼吸感")).toBeInTheDocument();
  });

  it("stitch 变体派发：与 json-render 同一缝补帧（dashed/直角/data-skin）", () => {
    const { container } = render(
      <OpenUIRenderer lang={`root = Card("Rak", [Text("呼吸感")])`} />,
    );
    const card = screen.getByText("Rak").closest("div");
    expect(card!.className).toContain("border-dashed");
    expect(card!.className).toContain("border-border-strong");
    expect(card!.className).toContain("rounded-none");
    expect(card!.className).not.toMatch(/shadow|glow|blur/);
    expect(
      container.querySelectorAll('[data-skin="stitch"]').length,
    ).toBeGreaterThan(0);
    // tear 显现同样镜像到 openui 根（streamReveal.effect 是全局标量）
    expect(
      container.querySelector(".genui-tear[data-skin='stitch']"),
    ).not.toBeNull();
  });

  it("clean 变体派发（lumen）：帧不动，无 genui-tear", () => {
    useThemeStore.getState().setTheme("lumen");
    const { container } = render(
      <OpenUIRenderer lang={`root = Card("Rak", [Text("呼吸感")])`} />,
    );
    const card = screen.getByText("Rak").closest("div");
    expect(card!.className).toContain("rounded-md");
    expect(card!.className).not.toContain("border-dashed");
    expect(container.querySelector(".genui-tear")).toBeNull();
    expect(container.querySelector('[data-skin="clean"]')).not.toBeNull();
  });

  void lang;
});
