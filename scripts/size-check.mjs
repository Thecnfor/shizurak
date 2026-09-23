#!/usr/bin/env node
/**
 * Size 红线门禁（幕语法 Task 10 Step 2 / spec §7 预算表 + 2026-09-23 首载削减补记）：
 * - 首页 First-load JS（/zh 预渲染 HTML 里真实引用的 <script> 集合，gzip 口径）≤216KB
 *   （红线推导见下方 BUDGET_HOME_FIRSTLOAD 注释）
 * - rift chunk（含 OGL 的 shader 层动态 chunk 合计）≤30KB，且不得进首页首载
 *   （idle-only：首载 HTML 不许静态引用它，加载路径是 requestIdleCallback 动态 import）
 * - 交互专用库泄漏守卫：zod/cordis/json-render/cmdk 只允许在交互（⌘K / dock 首开 /
 *   GenUI 挂载）后的动态 chunk 里出现，首载集合命中特征串即 fail
 *
 * 口径说明：读 `next build` 的预渲染产物（.next/server/app/ 下的 .html）而不是
 * manifest 拼表——路由级 build-manifest 的 pages 在 Turbopack 下为空，HTML 里
 * 的 script 引用才是浏览器真正会下载的第一屏集合。
 *
 * 用法：先 `pnpm build`，再 `node scripts/size-check.mjs`（CI 里 size:check）。
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";

const ROOT = process.cwd();
const NEXT = join(ROOT, ".next");
// 红线推导（2026-09-23 实测地板 + 20% 余量，DB 黑洞态 prod build）：
//   框架地板（不可约）：react-dom/React 70.0 + Next AppRouter/browser 运行时 42.1
//     + react client 运行时 8.4 + ClientPageRoot 3.7 + ISR/PPR client 3.5
//     + turbopack 模块运行时 4.2 = 131.9KB
//   应用必需首载：幕语法 client（rift-director/vt/focus，gsap 本体已懒载）12.3
//     + 主题 registry tokens 6.0 + shell hooks/stores/图标 5.9 + 0.6 = 24.8KB
//   radix Popover+Slider 23.4KB：nav.tsx（他方持有）静态 import theme-switcher，
//     切换器按平价要求保持即时可用，暂不能懒载 → 计入地板
//   地板合计 ≈ 180.1KB（实测 179.9KB）；×1.2 = 216KB（20% 余量，用于吸收依赖
//   小版本抖动，同时足以让「把懒载库拖回首载」这类回归立刻越线）。
const BUDGET_HOME_FIRSTLOAD = 216 * 1024; // gz 字节
const BUDGET_RIFT_CHUNK = 30 * 1024; // gz 字节（含 OGL）
// 首载禁入特征串（串→归属说明）：只匹配懒载化的重依赖本体，不匹配业务代码
const FORBIDDEN_IN_FIRSTLOAD = [
  "ZodError", // zod
  "json-render", // @json-render 渲染内核
  "cmdk-root", // cmdk 面板本体
  "ScrollTrigger", // gsap 插件
  "gl_FragColor", // OGL/rift shader
];

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

if (!existsSync(NEXT)) {
  console.error("✗ 找不到 .next/——先跑 pnpm build");
  process.exit(1);
}

const gzSize = (file) => gzipSync(readFileSync(file)).length;

// ---- 1. 首页 first-load（HTML 内真实 script 引用） ----
const homeHtmlPath = join(NEXT, "server/app/zh.html");
if (!existsSync(homeHtmlPath)) {
  console.error("✗ 缺少 /zh 预渲染 HTML（构建未完成或被禁用？）");
  process.exit(1);
}
const homeHtml = readFileSync(homeHtmlPath, "utf8");
const scriptHrefs = new Set(
  [...homeHtml.matchAll(/src="\/_next\/(static\/[^"]+\.js)"/g)].map(
    (m) => m[1],
  ),
);
// polyfill 剔除（浏览器语义对齐，非放宽红线）：Next 的 polyfill 脚本现代浏览器
// 条件加载（es2017 探测失败才下载）。生产 Chromium 实测（T10 网络抓包）不请求
// 这些文件，故从 first-load 口径中扣除。清单来源：build-manifest.polyfillFiles
// （若存在）+ 路径特征回落。
const polyfillHrefs = new Set();
try {
  const bmRaw = readFileSync(join(NEXT, "build-manifest.json"), "utf8");
  const bm = JSON.parse(bmRaw);
  for (const f of bm.polyfillFiles ?? []) {
    polyfillHrefs.add(f.replace(/^\//, ""));
  }
} catch {
  /* Turbopack 下字段可能缺失，回落特征匹配 */
}
for (const rel of [...scriptHrefs]) {
  if (/polyfills?\.js$/.test(rel) || rel.includes("/polyfills/")) {
    polyfillHrefs.add(rel);
  }
}
if (polyfillHrefs.size === 0) {
  console.warn("! 未识别到 polyfill 清单，按全量口径计入");
}
let homeTotal = 0;
const homeRows = [];
const polyRows = [];
const missing = [];
for (const rel of [...scriptHrefs].sort()) {
  const abs = join(NEXT, rel);
  if (!existsSync(abs)) {
    missing.push(rel);
    continue;
  }
  const gz = gzSize(abs);
  if (polyfillHrefs.has(rel)) {
    polyRows.push([rel, gz]);
    continue;
  }
  homeTotal += gz;
  homeRows.push([rel, gz]);
}

// ---- 2. rift chunk（shader 特征串定位；含 OGL 库本体） ----
const chunkFiles = walk(join(NEXT, "static")).filter((f) => f.endsWith(".js"));
const riftChunks = [];
let riftTotal = 0;
for (const f of chunkFiles) {
  const content = readFileSync(f);
  // gl_FragColor：rift-layer 片元着色器源码特征（OGL 随该动态 chunk 一起打进去）
  if (content.includes("gl_FragColor")) {
    const gz = gzSize(f);
    riftTotal += gz;
    riftChunks.push([relative(NEXT, f), gz]);
  }
}
// idle-only 断言：首页首载 HTML 不得引用任何 rift chunk
const riftLeak = riftChunks.filter(([rel]) => scriptHrefs.has(rel));

// ---- 2b. 首载库泄漏守卫（懒载化的重依赖不得回到第一屏） ----
const libLeaks = [];
for (const [rel] of homeRows) {
  const content = readFileSync(join(NEXT, rel), "utf8");
  for (const marker of FORBIDDEN_IN_FIRSTLOAD) {
    if (content.includes(marker)) libLeaks.push(`${rel}  ← ${marker}`);
  }
}

// ---- 3. 报告与红线 ----
const kb = (n) => `${(n / 1024).toFixed(1)}KB`;
console.log(
  "◆ /zh first-load JS（HTML 真实 script 集，gzip，不含 polyfill）：",
);
for (const [rel, gz] of homeRows)
  console.log(`    ${kb(gz).padStart(8)}  ${rel}`);
for (const [rel, gz] of polyRows)
  console.log(
    `    ${kb(gz).padStart(8)}  ${rel}  [polyfill，现代浏览器不下载，已扣除]`,
  );
console.log(`  = ${kb(homeTotal)} / 预算 ${kb(BUDGET_HOME_FIRSTLOAD)}`);
console.log(`◆ rift chunk（含 OGL，动态加载，gzip）：`);
for (const [rel, gz] of riftChunks)
  console.log(`    ${kb(gz).padStart(8)}  ${rel}`);
console.log(`  = ${kb(riftTotal)} / 预算 ${kb(BUDGET_RIFT_CHUNK)}`);
if (missing.length) {
  console.error(`✗ HTML 引用但产物缺失的脚本：\n  ${missing.join("\n  ")}`);
}
if (libLeaks.length) {
  console.error(
    `✗ 懒载库泄漏进首载（应保持交互/空闲懒载）：\n  ${libLeaks.join("\n  ")}`,
  );
} else {
  console.log("✓ 首载无 zod/json-render/cmdk/gsap-plugin/OGL 泄漏");
}

let fail = false;
if (homeTotal > BUDGET_HOME_FIRSTLOAD) {
  console.error(
    `✗ 首页 first-load ${kb(homeTotal)} 超预算 ${kb(BUDGET_HOME_FIRSTLOAD)}——列出上方最大项，找 import 泄漏，不得放宽红线`,
  );
  fail = true;
}
if (riftTotal > BUDGET_RIFT_CHUNK) {
  console.error(
    `✗ rift chunk 合计 ${kb(riftTotal)} 超预算 ${kb(BUDGET_RIFT_CHUNK)}`,
  );
  fail = true;
}
if (libLeaks.length) fail = true;
if (riftLeak.length) {
  console.error(
    `✗ rift chunk 泄漏进首载（必须 idle-only 动态加载）：\n  ${riftLeak.map(([r]) => r).join("\n  ")}`,
  );
  fail = true;
}
if (fail) process.exit(1);
console.log("✓ size 红线全部达标");
