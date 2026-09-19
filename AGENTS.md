<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# shizurak 项目规范（作者维护，勿被工具生成块覆盖）

## 命令面入口

| 命令 | 用途 |
|------|------|
| `pnpm lint` | Biome 检查（格式化 + 静态规则） |
| `pnpm test` | Vitest 单元测试 |
| `pnpm theme:check` | 主题契约一致性校验（tokens → CSS vars 生成物） |
| `pnpm verify` | 提交门禁聚合：`lint && test && theme:check`（依次执行，任一失败即非零退出） |
| `pnpm e2e` | Playwright 端到端测试 |

**提交前必跑**：`pnpm verify`（聚合 `pnpm lint && pnpm test && pnpm theme:check`，任一失败即非零退出）；涉及 FX / 主题切换 / GenUI 渲染路径时追加 `pnpm e2e`（需浏览器环境，故不纳入 `verify`）。

## 规范路由表（docs/specs/）

| 文档 | 管辖范围 |
|------|----------|
| [01-design-spec.md](docs/specs/01-design-spec.md) | 设计美学与主题体验契约（三条公理、五条铁律、void/lumen 双主题） |
| [02-architecture-spec.md](docs/specs/02-architecture-spec.md) | 系统架构（前端内核、Harness 位置、目录分层与边界） |
| [03-state-spec.md](docs/specs/03-state-spec.md) | 状态管理六层模型（RSC / URL / Zustand / SWR / Agent / Form 各层归属） |
| [04-dependency-spec.md](docs/specs/04-dependency-spec.md) | 依赖选型原则（现成库优先、包体预算、生态一致性） |
| [05-harness-spec.md](docs/specs/05-harness-spec.md) | Agent Harness 统一规范（微内核契约、三引擎 GenUI、权限模型、成本闸） |

## 内核关键红线

- **GenUI 工具权限分层**：工具按风险分 L0 / L1 / L2 三级（契约见
  `src/kernel/contracts/tool.ts`）。L0 服务端自动执行；L1 经 client 代理执行；
  **L2 无 `execute`，永不自动执行**——桥接进 AI SDK 时 `execute` 恒为
  `undefined`（见 `src/kernel/genui/tool-loop.ts`），调用只挂起为确认卡，
  经用户审批回流后才可执行。新增任何 L2 工具必须遵守此红线，禁止在桥接层
  或下游为 L2 补 `execute`。
