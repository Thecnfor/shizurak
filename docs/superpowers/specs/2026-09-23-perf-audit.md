# 生产性能审计 — 2026-09-23

- **基线**：HEAD `a85505c`（perf(bundle): 首载削减——zod/json-render/cmdk 懒载化），/zh first-load **179.9KB gz**
- **现实口径**：DB 黑洞（端口不通），全部页面以降级形态测量——这正是生产故障态要承受的体验
- **站点**：`pnpm build` + `PORT=3100 pnpm start`（standalone prod），本地回环
- **工具链**：Lighthouse 12.8.2（`npx --yes lighthouse@12`，未动 package.json）× simulated throttling（mobile 默认档 + desktop 预设档），CHROME_PATH 用 playwright chromium-1243 全量版；深挖用 Playwright CDP 探针（`.remember/tmp/` 下 ad-hoc 脚本，不入库）

---

## 1. Lighthouse 总表（before = a85505c 原样 / after = 本次修复后）

### Mobile simulated（Moto G Power 模型：4x CPU throttle，150ms RTT/1.6Mbps）

| 页面 | Perf 前→后 | CLS 前→后 | LCP 前→后 | TBT 前→后 | FCP 前→后 | 请求 前→后 | 传输 KB 前→后 |
|---|---|---|---|---|---|---|---|
| /zh (home) | 0.77 → 0.84 | 0 → 0 | 3344 → 3312ms | 575 → 363ms | 928 → 925ms | 30 → 34 | 419 → 425 |
| /zh?theme=lumen | 0.85 → **0.88** | **0.0069 → 0** | 3297 → 3297ms | 327 → 254ms | 914 → 916ms | 29 → 33 | 404 → 410 |
| /zh/posts | 0.87 → 0.86 | 0 → 0 | 3283 → 3298ms | 269 → 300ms | 907 → 913ms | 32 → 35 | 419 → 428 |
| /zh/projects | 0.87 → 0.87 | 0 → 0 | 3293 → 3297ms | 258 → 291ms | 913 → 918ms | 31 → 35 | 417 → 431 |
| /zh/about | 0.87 → 0.89 | 0 → 0 | 3297 → 3296ms | 266 → 220ms | 914 → 914ms | 31 → 35 | 417 → 431 |
| /zh/lab | 0.88 → 0.88 | 0 → 0 | 3303 → 3296ms | 231 → 248ms | 917 → 910ms | 31 → 35 | 423 → 431 |
| /zh/search | 0.88 → 0.87 | 0 → 0 | 3286 → 3297ms | 238 → 260ms | 908 → 919ms | 32 → 34 | 430 → 435 |

### Desktop simulated（1350×940，40ms RTT/10Mbps，1x CPU）

| 页面 | Perf 前→后 | CLS 前→后 | LCP 前→后 | TBT 前→后 | 请求 前→后 | 传输 KB 前→后 |
|---|---|---|---|---|---|---|
| /zh (home) | 1.00 → 0.99 | 0 → 0 | 654 → 649ms | 40 → 94ms | 31 → 34 | 424 → 430 |
| /zh?theme=lumen | 1.00 → 1.00 | **0.0168 → 0** | 753 → 741ms | 2 → 0ms | 30 → 33 | 409 → 415 |
| /zh/posts | 1.00 → 1.00 | 0 → 0 | 640 → 761ms | 5 → 3ms | 31 → 34 | 423 → 430 |
| /zh/projects | 1.00 → 1.00 | 0 → 0 | 664 → 762ms | 10 → 32ms | 31 → 35 | 417 → 433 |
| /zh/about | 1.00 → 1.00 | 0 → 0 | 648 → 658ms | 45 → 28ms | 31 → 35 | 417 → 433 |
| /zh/lab | 1.00 → 1.00 | 0 → 0 | 745 → 663ms | 0 → 20ms | 31 → 34 | 423 → 430 |
| /zh/search | 1.00 → 1.00 | 0 → 0 | 650 → 752ms | 44 → 27ms | 32 → 34 | 430 → 435 |

**读表须知**：

- 除 lumen CLS（0.0069/0.0168 → **0**，确定性修复，见 §3.1）外，其余差异均在 simulated 模式的 run-to-run 噪声带内（TBT ±60ms、LCP ±120ms、desktop home 0.99 是一次 94ms TBT 外推）。请求 +3~4 为 Next 对 nav 链接的 `_rsc` 视口预取，两轮都有、数量随预取时机波动，非产物变化（size-check 恒 179.9KB 佐证）。
- **INP 列全空**：simulated/lab 无 field INP（CrUX 无此本地源数据）；lab 代理见 §4。
- TBT 是 simulated 下 INP 的弱代理，本报告用 CDP 真事件测量补位。

---

## 2. 深挖一：LCP 3.3s 之谜 —— clip-path reveal 无罪，是模型外推

首页 mobile LCP ~3.3s 是全集最差数字，嫌疑对象是 hero h1 的 `clip-path` reveal（`globals.css` `.hero-reveal` 300ms 动画）。用 Playwright + CDP 三档取证：

| 测量档 | FCP | LCP | 结论 |
|---|---|---|---|
| 无节流直连（prod 3100） | 88ms | **88ms（=FCP）** | 文字首帧即 painted，clip-path 动画不 gate LCP 候选 |
| devtools 真节流（Lighthouse `--throttling-method=devtools`，mobile 预设） | 1645ms | **1645ms（=FCP）** | Perf 94 / TBT 86ms |
| simulated（默认回归模型） | 928ms | 3344ms | Perf 77 / TBT 575ms |

- LCP 元素全程是 `h1.hero-title`，三档一致；LH JSON 中全部 7 页 `observedLCP == observedFCP`（含无动画页）——LCP 从未晚于首次内容绘制。
- simulated 3.3s 的来源：Lighthouse 回归模型把 hydration 期主线程长任务（react-dom chunk 上 3.3s 处一个 339ms longtask）**外推**进 LCP。这是模型对"文本 LCP 且首帧即绘"页面的已知系统性夸大。
- **处置：不动 hero CSS**。clip-path reveal 无需迁移到 wrapper——它本就不延迟 LCP。真实网络下的预算参考值是 devtools 档 1645ms（LCP 良好线 2.5s 内）。

**真正值得治的主线程成本是 hydration 长任务本身**（react-dom 70.0KB gz 是首载最大单项，a85505c 后无进一步切割点）→ follow-up §5.3。

## 3. 深挖二/三：CLS 与字体

### 3.1 骨架→内容 CLS：黑洞现实下为 0，两处防御性修复

- **黑洞口径实测**：/zh 幕②信纸骨架在**构建期烘焙**进预渲染 HTML（DB 失败 → `catch` 空态 → `cacheLife({revalidate:30})` 短档），运行时零交换，15 个 `data-skeleton` 全程原位，CLS=0。/zh/posts 同理交付"还没有"空态。**即：DB 故障现实没有骨架交换 CLS 可修**——修的是 DB 恢复后 Suspense 边界定稿那一瞬间。
- **修复 A（已应用）**：`src/app/[lang]/(site)/paper-row.tsx:47` — `PaperRowsSkeleton` 标题 span 补 `leading-snug`，与真行 `h3`（同文件 :23，`text-[1.05rem] font-medium leading-snug`，行盒 ≈23.1px）对齐；骨架 span 原先继承 1.5 行高（≈25.2px），每行 ~2.1px 位移 ×5 行，恢复态下列表定稿即产生。
- **修复 B（已应用，实测归零）**：`src/lib/themes/init-script.ts:27-28` — 防闪烁脚本增加 **URL `?theme=` 白名单优先档**（先于 localStorage，与 `theme-provider.tsx:60` 的 `URL > localStorage` 顺序对齐）。此前分享链 `?theme=lumen` 要等水合后 ThemeProvider 效应才改 `data-theme`，lumen 的 display 字阶/字族变化把 hero 段顶下去：实测 CLS **0.0069（mobile）/ 0.0168（desktop）**，源 `section.mx-auto > p.mt-6`。脚本首帧前预写后水合零 DOM 变化 → 修复后两轮（移动+桌面）lumen CLS **= 0**。测试补齐 3 例（优先/白名单拒绝回落/独立生效）：`src/lib/themes/init-script.test.ts` 8/8 绿。
- **回滚项（诚实记录）**：曾试 command-gate 模块级 import 预温以压冷按 ⌘K，重建后 LH 请求 +5、mobile LCP 外推恶化、冷按无改善 → 已回滚，源码与 HEAD 一致。

### 3.2 字体策略：规格 §3.1 合规缺口确认，本轮只文档化

设计规格 §3.1 强制：**Noto Sans SC Variable 经 cn-font-split 按 unicode-range 分片自托管，每片 ≤100KB，首屏片 preload**。现状审计：

- `src/app/[lang]/layout.tsx`（禁改）只引 `next/font/google` 的 Geist/Inter **latin 子集**——对 CJK 零覆盖，也不阻塞 CJK 渲染；
- `src/themes/*/index.ts` 字体栈为 `var(--font-geist-sans), "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`——中文实际走**系统字体**，跨平台字形不一致（Android/无 Noto 的 Linux 落 sans-serif 默认）；
- 产物 `<link>` 中无任何 CJK webfont：**没有** eager-blocking 的全量 CJK 字体（这是好消息——3.3s LCP 与字体无关，§2 已证），代价是规格要求的字形一致性未兑现。
- **可编辑文件内的最廉价合规改善**评估：无。字体声明在 layout（禁改）与 themes registry 字体栈，分片产物需要构建步骤 + `cn-font-split` devDependency（package.json，禁改）。→ 完整落地方案见 follow-up §5.1，不 hack。

### 3.3 缓存/CDN 头（黑洞现实）

- HTML（故障短档生效）：`Cache-Control: public, max-age=0, s-maxage=30, stale-while-revalidate=86370` —— DB 不可达时 `cacheLife({revalidate:30})` 降级档把共享缓存压到 30s；DB 健康时会是长档。**副作用**：故障期 CDN 每 30s 穿透一次源站（雪崩防护依赖源站自身的并发合并）。
- `/_next/static/*`：`public, max-age=31536000, immutable` ✓
- 本轮无法改服务器/ingress 头 → §5.2。

## 4. INP lab 代理（Playwright CDP，CPU 4x 节流，prod 3100，LH 批次完成后单独无并发复测）

| 交互 | 结果 | 判定（INP 红线 200ms / 良好 100ms） |
|---|---|---|
| **冷按 ⌘K**（首个按键，cmdk chunk 未载） | 按键→面板可见 **816ms**（ready 探针 @2277ms 之前按下）；期间 longtask 124ms@1839ms 属启动 hydration 尾巴，非按键处理 | **超 300ms**——成本几乎全是 chunk 网络+求值等待（网络等待不计入 INP 定义，但用户等待是真实的） |
| **热按 ⌘K**（idle 预取完成后） | **88ms**，零 longtask | ✓ idle-prefetch（`command-gate.tsx` requestIdleCallback + 2s timeout）缓解**有效**：实测预热后按 816→88 |
| 主题滑杆拖拽（16 pointermove，4x CPU） | 最差 drag 帧 104ms；一个 61ms longtask 出现在拖拽结束后（theme persist） | 边缘（>100ms 良好线，<200ms 红线） |
| 导航点击 /zh/posts（T1 撕幕） | 路由换页 166ms，**交互处理期零 >50ms longtask** | ✓ 幕语法未引入长任务 |

**结论**：交互处理本体全部健康；唯一用户可感知的迟钝是**冷按 ⌘K 的 816ms chunk 等待**，且 idle-prefetch 已把稳态压到 88ms。冷按窗口只存在于 load 后 ~2.3s 内且未预取完成前，与启动 hydration 重叠——与 §2 同源（长任务挤压 idle 窗口）。

## 5. Follow-ups（不可在本轮 editable 范围落地的项，含精确指令）

### 5.1 字体：cn-font-split Noto Sans SC 分片自托管（规格 §3.1 补课）

需动 `package.json`（devDep）+ `src/app/[lang]/layout.tsx`（禁改，另会话持有）：

1. `pnpm add -D cn-font-split` ；源字体：Google Fonts `NotoSansSC[wght].ttf`（variable）
2. `postcss` 前置脚本（或 `prebuild` step）：`cn-font-split -o public/fonts/noto-sans-sc <src.ttf> --chunkSize 100 --css fontFamilyOverride:"Noto Sans SC"`，产出 ~100 个 ≤100KB woff2 子集 + 自带 `@font-face` CSS（unicode-range 声明）
3. layout 改 `import "./fonts/noto-sans-sc/counter.css"` 或手写 `<link rel="preload" as="font" type="font/woff2" crossorigin>` 指向**首屏常用片**（CJK 常用字表 §3.1 指定的那 1-2 片，由渲染文本的 unicode-range 反查确定）
4. themes/*.ts 字体栈把 `"Noto Sans SC"`（自托管名，注意与系统 Noto Sans CJK SC 区分，可用 `familyNames` 覆写）插到 `var(--font-geist-sans)` 之后、系统 CJK 之前
5. 验收：Lighthouse `font-display` 审计零 swap 候选、预渲染页 `<link rel=preload>` 命中 ≤2 片、首载增重 ≤120KB gz（两片实测各 ~40-80KB raw）

### 5.2 缓存头：ingress/CDN 层（k8s/argocd 现实）

- 在 argocd-apps 的 ingress 清单为 `/_next/static/*` 显式 `Cache-Control` 覆盖注解（CDN 层 pin `immutable`），HTML 路径维持源站档位语义；故障短档（s-maxage=30）是否放宽到 60-120s 由 SRE 结合源站抗压定——**不要**在应用层改（那是 DB 恢复时间的直接函数）。
- 若上 CDN（现状直连 ingress）：对 5xx/连接失败配 stale-while-revalidate 强制服务过期骨架，黑洞期用户看到的就是本轮测的降级页而不是错误页。

### 5.3 hydration 长任务（simulated LCP/TBT 外推的真实根源）

- 最大杠杆在已落地的 a85505c（341.4→179.9KB）之后继续削 react-dom 同步水合：候选是幕③信区/交互岛改按需水合边界（`<Suspense>` client boundary 细化），以及 `babel-plugin-react-compiler` 产物中仍存的手动 memo 清理。目标：devtools 真节流档 TBT<50ms（现 86ms）。
- 不做也许可接受：真节流 LCP 1645ms 达标，simulated 数字仅作趋势参考。

### 5.4 冷按 ⌘K 816ms

- 现 idle-prefetch 已覆盖稳态。若要消灭首按窗口：把 prefetch 的 `requestIdleCallback` timeout 从 2000ms 收到 800ms（`command-gate.tsx:44`，可编辑，但实测收益受启动长任务挤压不明显，且提前抢带宽会推高 simulated LCP——本轮回滚实验的同款教训），**暂不改**；或接受为"启动后 2 秒内首按偶发慢"。

### 5.5 /posts/[slug] 死链的 HTTP 状态码：200，非 bug 可修（遗留批结论，2026-09-24）

**现象**：`GET /zh/posts/<不存在的 slug>` 返回 `200 OK`（body 是站内的
「坐标丢失」not-found 视图），而非 404。页面文件（`[slug]/page.tsx`，他人在管）里的
`if (!post) notFound()` 看起来执行了，状态码却没跟上。

**根因（文档依据 + 本地实码核对，Next 16.3.5）**：`next/dist/docs/01-app/02-guides/streaming.md`
§The HTTP contract——流一旦开始，状态码已随首块发出，不可回改；mid-stream 的
`notFound()` 只能以「注入 robots noindex」代替 404。本站 `next.config.ts` 开着
`cacheComponents: true`，且 `(site)/layout.tsx` 把整个内容区包在 `<Suspense>` 里：
文章存在性只有 await DB 才知道，而 await 必在 Suspense 边界内挂起 → 壳先交付（200）
→ `notFound()` 落在流里。文档给的唯一合规模式是「notFound() 在任何 await/Suspense
之前」，但存在性检查本身就要读 DB，对本路由不成立。

**实测（黑洞 DB + dev 127.0.0.1，curl）**：浏览器 UA 与 Googlebot UA 均 `200`，
`x-nextjs-prerender: 1`；响应头无 X-Robots-Tag，dev 实测 body 里**没出现**文档说的
`<meta name="robots" content="noindex">`（注入点在 `make-get-server-inserted-html.js`
的 HTTPAccessFallbackError 分支，普通 `notFound()` 是否同路未经 prod 构建复核，
诚实存疑：若 SEO 坐实漏索引，补救是在可编辑的 `robots.ts`/sitemap 层保证不把未发布
slug 交给爬虫，而不是改路由）。另：黑洞期所有存在性检查都「查不到」→ 全量 slug 都是这个
 200-not-found，与生产 DB 恢复后的行为同一口径（同一条流式约束，不是黑洞特例）。

**外部修法逐一否决（均不 hack）**：
- `proxy.ts` 早拒：中间件要按请求查 DB 才能知道 slug 存在性——黑洞期要么 fail-open
  （问题原样存在）要么 fail-closed（误杀全部文章页），且每次阅读多一跳串行 DB 往返，
  把流式首字节的收益倒贴回去。不合规。
- `next.config.ts` redirects：静态规则无从知道 slug 集合。不可行。
- `generateStaticParams` + `dynamicParams=false`：非建表期 slug 在路由层真 404，但
  新发文章必须重建才能访问；且黑洞 DB 下 generateStaticParams 只剩哨兵 slug（T9 评审批 C
  的设计初衷），等于全站文章 404。后果不可接受。
- ingress/nginx 改写：状态码在应用流内，入口层看不到 body 里的 not-found 语义。不可行。

**结论**：在本架构（cacheComponents + 流式 + DB 存在性）下，200-not-found 是 Next 产
品契约行为，无「页面文件之外」的合法修复点。真正的修复只能在 `[slug]/page.tsx` 解冻后
配合「非挂起的存在性检查源」做（候选：发布时维护一份静态 slug 清单供页前同步读），
记此处待需；日常 SEO 风险已由「站内链只指向真文章」控制。不伪造上游 issue 号；
这一约束在 Next 官方 streaming 文档中是明示设计而非 bug。

## 6. 修复清单（本轮已提交）

| # | 文件:行 | 内容 | 验证 |
|---|---|---|---|
| 1 | `src/lib/themes/init-script.ts:27-28` | 防闪烁脚本 URL `?theme=` 白名单优先档 | lumen CLS 0.0069/0.0168 → 0（LH 两轮×7 页复测）；单测 +3 例（8/8） |
| 2 | `src/lib/themes/init-script.test.ts:61-95` | URL 优先/白名单拒绝/独立生效 3 用例 | vitest 绿 |
| 3 | `src/app/[lang]/(site)/paper-row.tsx:47` | 骨架标题 span `leading-snug` 锁行高（防御 DB 恢复态交换 CLS） | size-check 179.9KB 不变；黑洞 CLS 恒 0 不回归 |
| — | `src/components/command/command-gate.tsx` | （试验后回滚，零变化） | 见 §3.1 |

## 7. 门禁与测量卫生

- `pnpm verify` / `pnpm e2e`：见提交时运行结果（e2e 跑 dev 3000，与本审计 prod 3100 无冲突）
- 所有 LH/探针串行执行，无并发负载；after 批次在干净重建（不含回滚项）后采集
- 产物口径核对：`node scripts/size-check.mjs` 全绿（179.9KB/216KB、rift 13.9KB/30KB、零懒载泄漏）
- 引用：bundle 削减数字来自 `git show a85505c`（提交信息内嵌分解表）
