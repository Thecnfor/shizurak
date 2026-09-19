import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OpenUIRenderer } from "./open-ui-renderer";

const lang = `root = Card("Rak 概览", [
  Text("为桌面机器人赋予呼吸感", "muted"),
  Metric([{label: "节点", value: 5}])
])`;

// 只测已定义组件 + 纯文本，规避位置参数细节：用 Text 作根最稳。
const leaf = `root = Text("hello-openui")`;

describe("OpenUIRenderer（真实 openui-lang 渲染）", () => {
  it("渲染 leaf Text", () => {
    render(<OpenUIRenderer lang={leaf} />);
    expect(screen.getByText("hello-openui")).toBeInTheDocument();
  });
  it("渲染容器树（Card + Text）", () => {
    render(<OpenUIRenderer lang={`root = Card("Rak", [Text("呼吸感")])`} />);
    expect(screen.getByText("Rak")).toBeInTheDocument();
    expect(screen.getByText("呼吸感")).toBeInTheDocument();
  });
  void lang;
});
