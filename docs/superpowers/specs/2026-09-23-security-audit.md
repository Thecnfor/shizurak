# 安全审计报告 · 2026-09-23

> 对象：shizurak main（威胁建模基线 `3cacd16`，修复落盘于同日）
> 方式：全量静态通读 + 本地 dev 只读探针 + `pnpm audit` + 仓库密钥扫描 + qodersec 云扫描（异步）
> 云扫描报告：https://qoder.com.cn/security-code-scan/reports/1002636/1022487 （main@3cacd16 提交快照）

## 结论

鉴权边界、XSS/内容枚举防护、部署密钥管理经探针与代码双重验证**扎实**；残余风险集中在**公开无鉴权入口的成本/可用性面**与**传输层基线**，本批已全部修复（下表「已修」）。整体评级：修复后**中低风险，可投产**。

## 发现与处置

| ID | 严重度 | 位置 | 问题 | 处置 |
|----|--------|------|------|------|
| F-1 | 中 | `api/admin/session/route.ts` | 登录 `token !== want` 非常量时间 + 无限流 → ADMIN_TOKEN 可爆破 | ✅ 已修：单 IP 5 次/5 分钟限流（fail-open 同全站）+ SHA-256 归一 `timingSafeEqual` |
| F-2 | 低-中 | `lib/server/session.ts` | 会话 cookie 为静态 `sha256(token::salt)`（无过期熵）；cookie 缺 `secure` | ✅ 部分修：生产 `secure: true` 已加。**残余**：HMAC(exp·rand) 无状态令牌或迁移 better-auth——session 格式变更会击穿在途 `session.test.ts`，留待 better-auth 落地（架构规范 §8 既定替换路径），不半改 |
| F-3 | 中 | `api/chat/route.ts` | `req.json()` 无体积/条数上限 → 单次超大 body DoS | ✅ 已修：256KB 双检（content-length + 实读）+ 50 条消息上限 |
| F-4 | 低 | chat/mcp IP 键 | 依赖 Traefik 覆写 `x-real-ip`；不覆写则可伪造绕限流 | 📋 运维项：ingress 确认 `XRealIP` 中间件强制覆写（rak 集群 Traefik 默认为追加语义，需核对） |
| F-5 | 低 | `api/mcp/route.ts` POST | 公开无鉴权无限流 | ✅ 已修：64KB 体积帽 + 30 次/分钟 |
| F-6 | 低 | `db/repo/agent.ts` save | `threadId` 原样入 uuid 列 → 非 UUID 触发 PG 22P02→500 | ✅ 已修：`isUuid` 门，非 UUID 静置 null |
| F-7 | 低 | `api/genui/specs` → OpenUI | 公开写入的 `spec.lang` DSL 仅结构门槛，靠客户端解析器白名单兜底（无 XSS/eval 面） | 📋 记录：lang 文法服务层校验属 Plan B/GenUI 深化范围，组件白名单+文本渲染当前已封死利用面 |
| F-8 | 低 | `next.config.ts` | 缺 HSTS、暴露 `X-Powered-By` | ✅ 已修：HSTS 两年 includeSubDomains + `poweredByHeader:false` |
| F-9 | 低 | `db/queries/posts.ts` 搜索 | LIKE `%query%` 未转义 `%`/`_` → 通配退化/扫描放大（无注入：参数化） | ✅ 已修：`\ % _` 反斜杠转义 |
| F-10 | 提示 | `Dockerfile` | 遥测禁用在 build 之后 | ✅ 已修：ENV 前移 |
| F-11 | 提示 | redis/jev 闸 | 限流与 Jev 安全闸 fail-open（无 Redis/无 key 放行） | 📋 已知设计：红线由 L2 toolApproval 兜底；上生产前 Redis 就绪即可闭环 |
| F-12 | 提示 | `esbuild@0.18.20`（drizzle-kit 传递 devDep） | GHSA-67mh-4wv8-2f99（moderate） | ✅ 判定不修：仅 `--serve` 模式受影响，drizzle-kit 走 transform API、dev-only、不进运行镜像；overrides 强升有 drizzle-kit 兼容风险 |

## 验证过、无需动作的攻击面

- 草稿/私有枚举：`getPostBySlug`/MCP `get_post`/feed/分享 spec 全部强制 `published`/`shared`（代码+探针）
- 存储型 XSS：唯一 `dangerouslySetInnerHTML` 为作者侧经 `rehype-sanitize` 管线，有拦截测试；GenUI 三引擎组件白名单、无 eval 面；搜索回显经 React 转义
- CORS：api 无 `Access-Control-Allow-*`，默认同源；proxy matcher 排除 `/api`，语言协商不可绕守卫
- 密钥卫生：tracked 仅 example 占位符；近史提交无泄漏；`.env.local` 未跟踪；K8s Secret 由 Vaultwarden 注入

## 探针记录（dev :3111，只读）

`/admin`→307 登录；`/api/admin/draft-content`→401；`/api/mcp`、`/api/admin/session` 方法墙 405；`OPTIONS /api/chat` 无 CORS 头；`search?q=<script>` 转义回显；`/api/og?title=<b>` 渲染为图片文本；修复前唯一泄露：`X-Powered-By`（已关）。
