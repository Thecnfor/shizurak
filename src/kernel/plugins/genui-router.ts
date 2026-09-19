import type {
  GenUIEngine,
  GenUIEngineId,
  GenUIIntent,
  RouteDecision,
} from "@/kernel/contracts/genui";
import { type KernelContext, plugin } from "@/kernel/core";
import { buildRoutingPrompt, resolveRoute } from "@/kernel/genui/routing";

export interface GenuiService {
  route(intent: GenUIIntent): RouteDecision;
  registerEngine(engine: GenUIEngine): void;
  engine(id: GenUIEngineId): GenUIEngine | undefined;
  engines(): GenUIEngine[];
  /** 供 agent system prompt 拼接（与路由表同源） */
  routingPrompt(): string;
}

const baseEngines: GenUIEngine[] = [
  {
    id: "json-render",
    reskin: "in-place",
    canHandle: (i) => (resolveRoute(i).engine === "json-render" ? 1 : 0),
  },
  {
    id: "openui",
    reskin: "in-place",
    canHandle: (i) => (resolveRoute(i).engine === "openui" ? 1 : 0),
  },
  {
    id: "rsc",
    reskin: "re-render",
    canHandle: (i) => (resolveRoute(i).engine === "rsc" ? 1 : 0),
  },
];

export const genuiRouterPlugin = plugin(
  (ctx: KernelContext) => {
    ctx.require("ai.models"); // 依赖就绪顺序
    const reg = new Map<GenUIEngineId, GenUIEngine>(
      baseEngines.map((e) => [e.id, e]),
    );
    const svc: GenuiService = {
      route: resolveRoute,
      registerEngine: (e) => reg.set(e.id, e),
      engine: (id) => reg.get(id),
      engines: () => [...reg.values()],
      routingPrompt: buildRoutingPrompt,
    };
    ctx.provide("ai.genui", svc);
  },
  {
    name: "genui-router",
    provide: ["ai.genui"],
    require: ["ai.models"],
  },
);
