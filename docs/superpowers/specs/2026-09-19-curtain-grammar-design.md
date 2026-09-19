# 幕语法（Rift Grammar）· 全站设计语言 v2

> 项目：**shizurak**（blog.xrak.top）— 伍泽凯个人博客
> 状态：定稿候选 v1 · 2026-09-19
> 性质：本轮设计研究的产出。本文是 [`docs/specs/01-design-spec.md`](../../specs/01-design-spec.md) 的**设计语言修订**——四层主题契约架构（tokens ⊕ motion ⊕ effects ⊕ genui）不变，§0 美学公理、§2 主题规格、§5 特效目录、§6 动效语法、§7 GenUI 视觉、§8 页面级设计以本文为准替换。
> 关联：[02-architecture-spec](../../specs/02-architecture-spec.md) · [04-dependency-spec](../../specs/04-dependency-spec.md)

---

## 0. 研究结论：我们要的不是风格，是材质

七轮方向探索（视觉记录见附录 B）收敛出的判断：

**被反复否决的都是「文化皮肤」**——NASA 仪表（原 void）、黑客角色扮演（dedSec 雨幕）、文人水墨、霓虹粒子贴纸。它们共同的失败模式：把某种亚文化的视觉素材贴在页面上。

**被反复选中的都是「物理规律」**——Lusion 的执行质感（交互有重量）、中式留白（空是构图）、看门狗2 的场景过渡（撕裂/拉扯/对焦是转场词汇）、Linear 的明度阶梯（层级用亮度不用颜色）。

> **设计语言一句话**：整站是一匹悬在暗处的数字织物（幕）。**留白是幕面，转场是撕幕**。静如死物，动如裂帛。

### 0.1 三定律

| # | 定律 | 含义 |
|---|------|------|
| G1 | **留白即构图** | 每屏只允许一个信息组；空不是没设计，是给「动」留舞台 |
| G2 | **撕裂即标点** | 特效预算集中在转场的 300–600ms；日常画面接近绝对静止 |
| G3 | **底噪即呼吸** | 待机保留 ≤5% 的微弱生命感，让人知道幕是活的 |

### 0.2 拒绝清单（进 `theme:check` / code review 审计）

- ❌ 常驻粒子系统、数字雨、扫描线、仪表贴纸、发射序列演出
- ❌ 一屏同时存在两个动效焦点
- ❌ hover 大幅位移（>4px）或缩放（>1.02）
- ❌ 主题化「皮肤」（字体/配色/装饰成套模仿某种亚文化）——人格差异只允许体现在**材质的气色**（明度/色温/速度/烈度）
- ❌ 转场语法混用：一次转场只用 T1/T2/T3 之一
- ❌ 面向访客的个性化服务（账号、生成入口、分享链接）——本站是**展示**，不是服务（见 §5.6 边界）

---

## 1. Tokens 层（人格「幕」，id 保留 `void`）

### 1.1 色彩

| Token | 值 | 用途 |
|-------|-----|------|
| `bg` | `#07070a` | 幕布黑 |
| `surfaceLift` | `rgba(232,236,239,0.02)` | 玻璃纸层（文章 sheet / ⌘K 面板），**全站唯一的“卡片”概念** |
| `ink` | `#e8ecef` | 主文字 |
| `inkDim` / `inkMute` / `inkFaint` | `#a9b3bc` / `#7d8891` / `#4a525c` | 次级三档（Linear 式明度阶梯） |
| `hairline` | `#22262d` | 发丝分隔线 |
| `accent` | `#cfe4ff` | **冰蓝白「针脚」**：焦点环、阅读进度线、链接下划线。禁止用于大面积/按钮填充 |
| `riftR` / `riftC` | `#ff2a4f` / `#05d9e8` | 红/青**仅**在撕裂瞬间以 RGB 分离出现（shader uniform，不进 CSS 变量常态使用） |

原 §2.1 的 glow/warning/success/HUD 青等令牌废除（success/warning 仍为契约必填，值取低饱和版供表单/状态最小使用）。

### 1.2 排版（对比制造张力，不用装饰）

| 级别 | 规格 | 用途 |
|------|------|------|
| display | `clamp(56px, 9vw, 120px)` / 1.02 / -0.03em / 600 | 每屏一句话 |
| body | `16px` / 1.9 / Noto Sans SC 400 | 正文，内容列 `62ch` |
| micro | `10px` / mono / letter-spacing 0.2–0.6em / uppercase | 元信息、日期、标签、导航 |

- display 与 body 之间只允许 micro，禁止中间字号段落体「凑版面」
- 中文不用衬线/水墨字体；「中式留白」落在**空间的空**，不落字形
- 文章列表不是卡片：一行行「信纸」（display 行距 26px 上下留空 + hairline 分隔）

### 1.3 空间与形状

- 容器 1120px；**呼吸位 ≥18vh**；每屏（viewport）一个信息组
- 圆角仅 `0 / 2px` 两档——幕不需要圆润，撕口更不能圆
- 阴影仅 sheet 一处：`0 40px 120px rgba(0,0,0,.6)` + `inset 0 1px 0 rgba(255,255,255,.05)`

---

## 2. Motion 层

### 2.1 待机底噪（G3，共四项，纯 CSS/rAF 或 fold 进 rift-layer shader，不新增独立 WebGL 对象）

| 项 | 参数 | 说明 |
|----|------|------|
| 幕面呼吸 | 径向渐变明暗 ±1.5%，8s 周期 | 双实现：CSS 渐变版（lite 兑底）/ shader 版（rift-layer 可用时优先，见 §3），二选一不同时跑 |
| 手电柔光 | 300px 径向光跟随鼠标，lerp 0.08 | 像光掠过布面，`pointer: fine` only |
| micro 微颤 | mono 标签 0.2Hz 偶发 1px 位移 | 随机相位，禁止同步 |
| 光标幕环 | 1px 圆环 lerp 0.16 跟手，可交互元素上放大 2.1× 转金色描边 | `#cur` 惯性环 + 4px 实心点 |

原特效清单中的 starfield / nebula / hud-grid / telemetry / scanline / grain / reticle / launch-hero **全部废除**（附录 B 记录了否决理由）。

### 2.2 转场语法（G2 的全部预算）

| 语法 | 触发 | 动作序列 | 时长 |
|------|------|----------|------|
| **T1 定格撕幕** | 所有路由切换（主语法） | 定格 1 帧 → 沿对角硬边撕裂：旧幕半幅坠出（位移+微旋 ±2°），新幕合拢 → RGB 分离 2 帧收束 | ≤300ms |
| **T2 信号崩解** | 仅 首页→文章、任意页→Lab | 视口按 64px 块崩解为数字碎屑（位移+alpha 噪声），新场景自碎屑聚合 | 400–600ms |
| **T3 镜头拉焦** | 组件级：⌘K、灯箱、TOC 展开、persona 切换预览 | 整屏 `filter: blur()` 失焦 → 一道扫描线扫过 → 锁焦 | 350ms |

**编排铁律**（继承原 L1/L2/L5，废除 L3 中已不适用的部分）：

1. 一次转场一种语法；转场期间输入防抖（忽略新触发）
2. 时长/easing 一律从 `theme.motion` 取，禁魔法数字
3. T1/T2 由 GSAP timeline 驱动 `rift-layer` uniform（见 §3），React 不持有动画状态
4. 路由转场使用 View Transitions API 挂接，`rift-layer` 跨页常驻——「星空不断，幕面换景」的旧原则改写为**幕不断，幕面换**
5. reduced-motion：T1/T2 → 120ms opacity 硬切；T3 → 直接出现；底噪四项全关

### 2.3 duration 契约（幕）

`micro 100 / ui 240 / section 480 / scene 600`，easing 主曲线 `cubic-bezier(0.16, 1, 0.3, 1)`（保留），转场专用新增：`rift: 'cubic-bezier(0.85, 0, 0.15, 1)'`（进场急收）。

---

## 3. Effects 层：唯一常驻层 `rift-layer`

**架构收敛**：主题 effects 不再是「一长串可组合挂件」，而是**一个全屏单 quad 的 WebGL 层**（OGL，见 §6.2）。它只干两件事：

- **常态**：渲染 §2.1 中「幕面呼吸」的 shader 版本（与 CSS 版二选一，WebGL 可用时优先 shader 版，省一次合成层）
- **转场**：暴露 uniforms 供 GSAP 驱动——`uTear`（0→1 撕合进度）、`uBlock`（T2 崩解进度）、`uRGBShift`（帧级错位量）、`uMouse`、`uIntensity`

### 3.1 契约变化（`contract.ts`）

```ts
ThemeEffects {
  renderer: 'rift-layer' | 'none'        // 原 background 字符串枚举废除
  hum: { breath: number; flashlight: boolean; tremor: number }   // 0–1，原 overlays 废除
  rift: { tear: 'diagonal' | 'horizontal'; intensity: number }    // 0–1 烈度
  // cursor: 'reticle' 废除——幕环光标由 CSS/DOM 实现，不占 effects 预算
}
```

### 3.2 降级三级（继承 L3 纪律）

| 档 | 条件 | 行为 |
|----|------|------|
| full | WebGL2 可用 | shader 呼吸 + T1/T2 完整 |
| lite | 无 WebGL2 / saveData / tier=low | 不加载 layer：呼吸降级 CSS 渐变；T1/T2 → 硬切 + 2 帧 RGB 抖动（纯 CSS） |
| off | reduced-motion 或用户面板关闭 | 全静态 |

**预算**：shader ≤6KB（源码）；layer chunk（含 OGL）≤30KB gz，`requestIdleCallback` 后动态加载，首屏 LCP 零占用；常驻 GPU <10%，DPR ≤1.5，页面隐藏暂停 rAF。

---

## 4. 页面级设计

| 页面 | 构图（自上而下） | 转场 |
|------|------------------|------|
| **首页** | ① 一句话大标题（进站时唯一一次 T1 自撕显现）② 5 行文章信纸 ③ 项目 mono 名录（4 行）④ 单行 footer。**无 hero 演出、无遥测条、无星座** | 出站：列表→文章 T2，其余 T1 |
| **文章页** | meta 行（日期/阅读时长/标签/**AI 参与度**/**persona 理由行**）→ 62ch 正文 → 针脚进度线（页边 1px 冰蓝）→ Shiki 代码块（hairline 框）→ 文末一行 mono「问 AI 关于这篇」 | 入 T2；阅读区零动效 |
| **列表/项目/关于** | 信纸排印 + display 一句话导语，同首页密度 | T1 |
| **Lab** | GenUI 双引擎橱窗（原有定位不变：作者作品展示）。唯一允许常驻微动画的页面 | 入 T2 |
| **⌘K** | T3 拉焦：全站模糊 → 面板锁焦浮出（全站最贵的交互瞬间，保持零特效余饰） | T3 |
| **admin** | 工具属性：信息密度提高，人格跟随当前 persona，不配演出 | — |

**GenUI 皮肤**：原 `hud` 变体废除，新变体 **`stitch`（缝补）**——1px 冰蓝缝线边框（dashed hairline）的安静卡片，接收 semantic token 自动换色。流式显现：`streamReveal.effect: 'fade' | 'tear'`（tear = 4 字符宽的小块撕开 ≤80ms；原全页 `decode` 乱码字效废除——它属于终端角色扮演皮肤。**例外**：agent 回复文本的逐字打印属「agent 在场」的表达，保留 fade+打字机，归 genui 层管）。

---

## 5. 篇章人格（Article Persona）

> **生成发生在发布时，渲染发生在阅读时。读者永远零生成、零成本、看到确定结果。**

```
Obsidian 素材 → content agent：草稿 + persona（差分覆写 JSON）+ 一句生成理由
→ 审核台 diff 双栏（正文 diff ｜ persona diff，逐条采纳/拒绝）
→ 发布：persona 随文章入库（posts.meta_json），tokens CSS 增量烘进页面（ISR/构建期）
→ 读者打开：SSR 直出；切换文章 = 轻 T1 撕幕 + 气色移调（<100ms，复用双轨制）
```

### 5.1 差分而非重造——五个旋钮

`PostPersona { accentHue: -30..30（OKLCH）; bgLift: -2%..+2%（明度偏移）; hum: 0..1（底噪强度）; motionScale: 0.7..1.3（时长缩放）; riftIntensity: 0..1 }` + `reason: string`（展示用）。

基座构图（留白语法）、转场语法、字体、版式**不可变**——37 篇文章是「同一个我在不同心境下说话」。

### 5.2 诚实标注（继承铁律 L5）

文章 meta 行追加：`style: generated from content · 查看理由`（点开显示 persona diff 与理由原文）。

### 5.3 护栏同权

作者侧 persona 与未来任何生成通道共用：`validatePersona()`（纯函数：五旋钮 clamp、对比度 AA 复核、失败自动回退基座并标注「本篇样式回退」）——文章**永远可读**优先于永远好看。

### 5.4 性能承诺

读者端不加载任何 persona 生成相关 chunk；生成/校验全部发生在作者侧（admin 工作流 + CI）；SSR 稳定输出无 hydration 差异。

### 5.5 示例 prompt（人格工作室，作者侧）

原「预留主题 terminal/paper/cyber」降级为 `admin → persona studio` 的**示例 prompt 集**（如"OLED 纯黑 · 撕得更快 · 零底噪"），供生成时参考，不再是产品路线图。

### 5.6 边界重申

❌ 不做：访客侧人格生成入口、访客生成工具（`propose_theme` 不是访客 agent 工具）、人格分享 URL、任何账号化的「服务」。
✅ 保留：个性化面板仅作**本机阅读舒适设置**（底噪/烈度/速度开关，localStorage，原 spec §1.5 缩减版：色相微调随 persona 系统一并废除，访客不再需要改我的色板）。

---

## 6. 双人格分工与主题系统影响

### 6.1 人格矩阵

| | **幕**（`void` 修订） | **流明**（`lumen` 保留） |
|---|---|---|
| 定位 | 剧场态：暗场，完整转场语法 | 白昼阅读态：同版式同留白 |
| tokens | §1 全套 | 近原 §2.2（去 Apple 蓝，ink 化——accent 同样只做针脚） |
| motion | 2.3 表 | 全档缩短：转场仅 T3；T1/T2 关闭 |
| effects | renderer: rift-layer | renderer: 'none'，hum 仅光标幕环（可选） |
| genui | stitch | clean |

### 6.2 工程落点与依赖增改（04-spec 同步）

| 动作 | 库 | 理由 |
|------|----|------|
| 新增 | `ogl`（≈10KB gz，WebGL 微库） | rift-layer 只有一个 quad，three.js（~160KB gz）超预算且用不到场景图；**仍然用库不手写 GL 上下文**（材质库/Uniform 管理/降级检测齐全） |
| 保留 | `gsap`（ScrollTrigger/CustomEase）、`lenis`、`@number-flow/react`→**移除**（遥测废除后无用途）、`motion`（AnimatePresence/layout） | 分工律不变 |
| 移除 | 原 nebula/starfield 自写 shader 计划、`@number-flow/react` | 特效清单废除 |
| 新增（作者侧） | 无新库：persona 生成走既有 content-agent 管线（AI SDK v7，工具 schema = 五旋钮 Zod） | 复用 harness |

### 6.3 现有代码影响（M0 已完成面）

- `themes/void/index.ts`：按 §1/§2/§3 重写（lumen 微调）；`contract.ts`：§3.1 字段变更 + `PostPersona` 类型
- `components/fx/starfield.*`：删除（含测试）；新增 `components/fx/rift-layer.tsx`（动态 import 挂载点）+ `lib/gl/tear.ts`（shader 源码）
- `hero.tsx`：SplitText 逐字入场 → 一次 T1 自撕；`command-menu.tsx`：接入 T3；`theme-switcher`：面板内容改（§5.6）
- `scripts/theme-check.ts`：改名扩展 `validateTheme/validatePersona` 双纯函数，浏览器可 import（作者侧运行时用）
- 字典：新增幕/lumen 文案键；E2E：`fx.spec`/`theme-switcher.spec`/`command.spec` 重写，新增「转场防抖」「persona 回退」用例

---

## 7. 性能与无障碍预算（修订 01-spec §9/§10）

| 指标 | 目标 | 变化 |
|------|------|------|
| First-load JS（幕，不含 rift chunk） | ≤ 170KB gz | 特效清单收敛为单层，较原 190KB **收紧** |
| rift-layer chunk（idle 后） | ≤ 30KB gz | 原 45KB 砍半 |
| LCP / CLS / INP | ≤2.0s / ≤0.05 / ≤200ms | 不变；转场防抖保证 INP 不被 T2 击穿 |
| 转场耗时 | T1 ≤300ms · T2 ≤600ms · T3 ≤350ms | 新契约，超限视同 L2 违规 |
| 对比度 | 正文 7:1（AAA）保留 | 针脚 accent 与幕布黑 ≥4.5:1 达标才许用 |

a11y 增补：幕环光标对 `pointer: coarse` 设备禁用；T1/T2 的 2 帧 RGB 抖动在 reduced-motion 下必须为 0；信纸行 hover 的渐变背景不构成唯一状态提示。

---

## 8. 验收标准

1. `pnpm theme:check` 通过（含新契约字段与 validatePersona 单测）
2. E2E：路由切换出现 T1（截图 diff）；首页→文章出现 T2；⌘K 出现 T3；reduced-motion 下三者全为硬切且无 rAF 特效实例
3. 底噪审计：待机 60s，除四项 hum 外无其他动画节点（Performance 录制脚本化断言）
4. 篇章 persona：admin 生成一篇带 persona 的测试文章 → 发布 → 读者页 SSR 输出包含烘进的气色变量、无生成 chunk 请求；故意投毒越界 persona → 自动回退且 meta 显示回退标注
5. 预算门禁：rift chunk ≤30KB gz 进 CI size check

---

## 9. ADR 摘要（本轮新增，续 01-spec 编号）

| # | 决策 | 理由 / 被否备选 |
|---|------|------------------|
| D7 | **材质物理替代文化皮肤**（三定律+拒绝清单） | 七轮否决证明：任何风格贴纸都会被判定为「复古/小儿科」；只有规律性语法可持续 |
| D8 | 特效架构收敛为**唯一常驻 rift-layer** | 否决「特效清单拼装」：挂件堆叠正是花里胡哨的源头；单层 quad 可同时满足 R2（常驻世界）与极简 |
| D9 | 转场语法三档制（T1 主 / T2 稀 / T3 微） | 借鉴 WD2 场景过渡词汇但收敛剪辑纪律；否决混用（一次转场一种语法） |
| D10 | `ogl` 而非 three.js | 一个全屏 quad 用不上场景图；160KB vs 10KB 对预算是生死差。仍遵守「用库不造轮子」 |
| D11 | **人格生成在发布时（作者侧），阅读时只渲染** | 否决访客侧「召」入口/人格分享 URL：本站是个人展示不是 SaaS；读者成本、确定性、SSR 稳定三关全过 |
| D12 | 篇章 persona = 五旋钮差分 | 否决整站重皮肤：「不同文章不同风格」由气色移调达成，保住「同一个作者」的统一识别 |
| D13 | GenUI `stitch` 皮肤取代 `hud`；decode 字效废除（agent 在场例外） | HUD/终端感与 D7 同源被否；缝边框与「幕」材质连续 |

---

## 附录 A · 参照系（本轮研究实际取材，作为校准锚点而非抄袭对象）

| 参照 | 拿什么 | 不拿什么 |
|------|--------|----------|
| lusion.co（about 页） | 顶级交互质感的标准线：转场的重量感、缓动收尾 | 3D 场景叙事本身 |
| generated.space（Kjetil Golid） | 生成线云的「一点」密度 + 大面积空的构图胆量 | 水墨/禅意材质（明确否决） |
| 看门狗2 场景过渡 | 词汇表：定格撕帧/块状崩解/镜头拉焦 | 满屏 HUD 贴纸、数字雨皮肤 |
| Linear | 明度阶梯分层级、发丝线 | 薰衣草品牌色 |
| Resend | mono 微排版的冷静、列表排印术 | 全站无动效（我们要留底噪与转场） |
| Vercel | 「拒绝清单」式的系统纪律写法 | 无彩色墨即品牌（我们保留针脚冰蓝） |

## 附录 B · 七轮否决记录（防止后人再走弯路）

1. HUD 仪表（原 void）→ 「死板/老/复古」 2. CSS 风格卡（精工暗流/光场/编辑部）→ 「小儿科，要 three.js」 3. canvas 粒子/点云玩具 → 「不够 WD2」 4. dedSec 满屏演出 → 「还是复古（堆料）」 5. 极简排印+单件艺术品 → 指向真参照后**部分命中**（留白对了，单件不够） 6. 水墨「静」字 → 「水墨也不行，我要的是留白不是画」 7. 分析收敛：**材质物理+留白+转场重音** → 通过（+篇章人格修订）

---

*本文经用户逐节确认（2026-09-19）。实施计划由 writing-plans 基于本文生成。*
