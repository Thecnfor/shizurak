# 显影语法（Development Grammar）· 全站设计语言 v3

> 项目：**shizurak**（blog.xrak.top）— 伍泽凯
> 状态：定稿候选 v1 · 2026-09-27
> 性质：本站设计语言的**第三次整体重写**。本文取代 [幕语法 v2](./2026-09-19-curtain-grammar-design.md)
> 全文，并取代 [`docs/specs/01-design-spec.md`](../../specs/01-design-spec.md) 的
> §0 设计哲学、§2 主题规格、§5 特效目录、§6 动效语法、§7 GenUI 视觉、§8 页面级设计。
> 四层主题契约架构（tokens ⊕ motion ⊕ effects ⊕ genui）**不变**，本文是其上的一次人格重铸。
> 关联：[02-architecture-spec](../../specs/02-architecture-spec.md) ·
> [03-state-spec](../../specs/03-state-spec.md) · [05-harness-spec](../../specs/05-harness-spec.md)

---

## 0. 一句话

**整站是一次显影**：滚动是药水，内容是影像，读者的经过就是它变清楚的过程。

"显影"（development）在这里是三件事同时成立：摄影化学里影像从乳剂里长出来、
一个人在时间里的发育、以及"把一件事从头到尾展开"的那个动作。三义共用一个词，
所以它不需要再做第二个隐喻——这也正是本站拒绝"核心主题"之后唯一可接受的命名：
**它不是一种皮肤，是一个过程的名字。**

### 0.1 三条公理（取代幕语法 G1–G3）

| # | 公理 | 含义 | 可验证的形式 |
|---|------|------|--------------|
| **D1** | **只有装置与结果，没有物本身**（玻尔） | 我们不说"这条内容是什么"，只说"用什么装置读它"。同一批内容有两种互斥的装置：**波**（顺着流读，是日记）与**粒**（检索/引用它，是笔记）。切换装置是全站唯一的结构性交互 | ⌘K = 观测行为本身：一次调用把流坍缩成索引，反之亦然 |
| **D2** | **亮度是时间，色温是情绪** | 滚动深度驱动曝光曲线：往下滚 = 从灯下熬到天亮。黑不是装饰性的"高级感"，是"还没到时候" | `--t` ∈ [0,1] 单变量驱动全部颜色；CCT 2400K→6500K |
| **D3** | **旧的东西有权继续坏** | 记录有衰变曲线，界面诚实地显示它。三年前的记录边缘该有锈，被反复批注的记录该更软 | `rust = clamp((now − occurredAt) / 1095d)`，驱动锈层与柔度 |

### 0.2 拒绝清单 v3（进 `theme:check` / code review 审计）

- ❌ **任何形式的"分区陈列"**：项目名录、能力清单、实验室、"我用过的技术栈"。
  先进技术只允许**长在正文里**（需要时生成一段可视化），不允许有橱窗。
- ❌ **冷黑**（hue 180°–270° 的背景）。恐怖的从来不是暗，是色相：蓝黑是监视器和停尸房，
  琥珀黑是灯下和旧纸。暗端背景 hue 必须落在 **20°–45°**。
- ❌ **从天而降的硬边光**（舞台追光、边缘锐利的光带）。光源必须在画面内、必须漫射。
- ❌ **常驻雪花 / 常驻噪点动效 / 常驻扫描线**。雪花只在分相与 L2 审批两处出现，各 ≤240ms。
- ❌ **jump scare 语法**：白闪、震屏 >2px、颗粒突然停止（"静默"改用减速，不用停止）。
- ❌ **用彩色区分语义**（绿=成功、红=危险）。全站唯一彩度是粉，其余靠明度阶与形状。
- ❌ **工程师时钟**："3 天前" / "更新于 2026-09-20" 不得出现在读者界面（后台除外）。
  相对时间必须带季节或年份的肉身："那年冬天"。
- ❌ **手写字体**冒充手书。手书必须是真实笔迹的矢量采集。
- ❌ **一屏两个动效焦点**、**一次转场混用两种镜头语**、**hover 位移 >4px / 缩放 >1.02**
  （继承幕语法 G2/拒绝清单，仍然成立）。
- ❌ 动效写进 React state、时长/easing 硬编码（继承原铁律 L1/L2，仍然成立）。

---

## 1. 光路图：十二个零件的装配位置

用户的清单不是风格列表，是一台相机的零件表。零件必须各就各位，否则互相踩
（雪花盖掉手书、毛玻璃吃掉黑、歇斯底里毁掉通透）。

| 层 | 零件 | 装配规定 | 技术落点 |
|----|------|----------|----------|
| **光** | 明暗法（改写：拧灯） | 第一眼 85% 黑，但光是**画面内一盏台灯**的漫射锥，边缘随滚动呼吸；被照亮是偶然，不是权利 | `--t` + `--lamp`，见 §2 |
| **光** | 黑白（夜视，去恐怖化） | 全站默认无彩度：只有明度阶 + 光晕 bloom + 细颗粒。**去掉**绿味、管畸变、扫描干涉带 | 内容层禁彩色；粉是唯一例外（§2.4） |
| **光** | 黑洞边缘（只取引力透镜） | 光在黑边**弯过来**：所有浮层边缘给 1px 暖光溢出，**取消描边** | `--bloom`，`border` 仅保留在焦点环 |
| **镜** | 极致运镜 | 四种合法镜头语：推轨变焦（眩晕）/ 甩镜（运动模糊）/ 急推 / 长焦压缩。**一次转场只用一种** | `--camera`，§3.2 |
| **时** | 老电视雪花 | 只在**分相点**与 **L2 审批**出现，各 ≤240ms。是标点，不是底噪 | `exposure-layer` uniform `uSnow` |
| **时** | 定格动画 | 8–12fps 步进，**只给手书与涂鸦**。数字元素保持 60fps——两种时间质感并存才有"人" | `animation-timing-function: steps(n)` |
| **时** | 曝光斜坡 | 滚动 = 一次显影：`t` 从 0 走到 1，中途**必有一次极性反转** | CSS scroll-driven animation，§2.2 |
| **手** | 手书质感 | 作者真实笔迹（一次性采集笔画存 SVG，按记录引用）。出现在页边批注、划掉重写 | `<svg>` + `stroke-dashoffset`，`steps()` 播放 |
| **手** | 意识流滤镜 | 条目之间允许**无过渡的并置**（上一秒在集群，下一秒在母亲的电话）；禁止用面包屑或标签解释跳转 | feed 混合渲染，§4 |
| **介质** | 黑白毛玻璃 + 微弱跃动 | AI-Native 的**唯一**视觉签名：生成中的面板是磨砂的，里面有什么在动（≤1px、0.9Hz）。静下来 = 已定稿 | `--gen-live`，§5.1 |
| **介质** | 淡粉 | 语义固定为"**被观测到了**"：指针下的可交互物、AI 正在生成的边、你刚写下的一行。别的一律灰 | `--accent±` 极性感知，§2.4 |
| **信** | cult 音效（无声） | 用亮度演声音：撞击→光晕在液面扩散；riser→浮尘密度爬升；低鸣→遮幅呼吸；静默→**颗粒变慢** | §3.3 foley 映射表 |
| **尺度** | 宏大 / 荒诞 / 歇斯底里 | **宏大**=尺度（人只占画面 2%，但是暖的）；**荒诞**=内容（并置与文案）；**歇斯底里**=只在晨昏带内 300ms 合法 | `register` 三档，§3.4 |

---

## 2. Tokens 层：曝光曲线

### 2.1 唯一真源是一个标量 `t`

不再"先选色板再排版"。**全站颜色是一个 0→1 标量的输出**：
`t = 滚动进度`（经主题的起点与斜率映射，§2.5）。停靠点（S0–S7）是曲线的取样，
不是可任意挑用的色板——组件只准引用语义变量，不准引用停靠点。

| 停靠点 | `t` | 背景 | hue | 正文墨 | 实测对比 | 用途 |
|--------|:---:|------|:---:|--------|:--------:|------|
| **S0 幕前** | 0.00 | `#0b0907` | 30° | `#efe7db` | **16.2:1** | 首页第一眼，只有灯和一句立场 |
| **S1 灯下** | 0.14 | `#14100b` | 33° | `#efe7db` | 15.4:1 | 第一批记录的边缘可见 |
| **S2 木** | 0.28 | `#221b14` | 30° | `#efe7db` | 13.9:1 | 记录开始成排 |
| **S3 烟** | 0.42 | `#4a4036` | 30° | `#efe7db` | 8.2:1 | **白墨可读完的最后一段** |
| **S± 晨昏带** | 0.46–0.58 | `#6b6055 → #8b8175` | 30° | — | 白 5.0→3.1 / 黑 3.0→4.9 | **禁段落**：只允许 display 大字、过门、雪花。极性交叉在 `#7d7266` |
| **S4 灰** | 0.62 | `#a89f93` | 34° | `#17120e` | 7.1:1 | 黑墨接管，列表与元信息 |
| **S5 天光** | 0.78 | `#d9dee3` | **210°** | `#17120e` | 13.7:1 | 色相在此翻冷：进入正文密度区 |
| **S6 通透** | 0.90 | `#eef1f4` | 210° | `#17120e` | 16.4:1 | **长文正文落点** |
| **S7 旧纸** | 1.00 | `#f5f1e8` | 42° | `#17120e` | 16.5:1 | 局部表面：手稿、旁批、批注卡 |

**这张表最要紧的一条**：底色一路走到冷（天光 210°），但"纸"始终是暖的（42°）。
所以长文的观感是**天亮时坐在窗边读一封旧信**——冷环境 × 暖载体，本身就是一台互补装置：
天光是当下，旧纸是来路。

对比度为 WCAG 2.x 相对亮度公式实算（`pnpm theme:check` 会重算并断言）。
正文停靠点全部 ≥7:1（AAA）；晨昏带**故意**不做可读性保证，因此禁止承载段落（§6 门禁）。

### 2.2 技术实现：意识流 = 一条 scroll-driven CSS 变量插值

这是"用网站技术表达意识流"的核心机关，且**零 JS**（继承铁律 L1：动效不写进 React state）：

```css
/* 1) 注册为可插值类型，颜色与数字才能原生补间 */
@property --t      { syntax: '<number>'; inherits: true;  initial-value: 0 }
@property --bg     { syntax: '<color>'; inherits: true;  initial-value: #0b0907 }
@property --ink    { syntax: '<color>'; inherits: true;  initial-value: #efe7db }
@property --lamp   { syntax: '<color>'; inherits: true;  initial-value: #e0a99d }  /* 色温因子 */
@property --grain  { syntax: '<number>'; inherits: true;  initial-value: .035 }
@property --bloom  { syntax: '<number>'; inherits: true;  initial-value: 1 }

/* 2) 一条 scroll 时间线驱动，keyframes 落在 S0…S7 */
@keyframes develop {
  0%    { --t: 0;    --bg: #0b0907; --ink: #efe7db; --lamp: #d98f5f; --grain: .035 }
  42%   { --t: .42;  --bg: #4a4036; --ink: #efe7db; --lamp: #e0a99d; --grain: .022 }
  58%   { --t: .58;  --bg: #8b8175; --ink: #17120e; --lamp: #e8c9b4; --grain: .014 }
  90%   { --t: .90;  --bg: #eef1f4; --ink: #17120e; --lamp: #dfe7ef; --grain: .006 }
  100%  { --t: 1;    --bg: #f5f1e8; --ink: #17120e; --lamp: #e8d7bd; --grain: .004 }
}

html[data-ramp="develop"] body {
  animation: develop linear both;
  animation-timeline: scroll(root block);   /* 原生，无 JS，无 rAF */
  animation-range: entry 0% exit 100%;
  background: var(--bg);
  color: color-mix(in oklab, var(--ink) 100%, var(--lamp) calc(var(--t) * 6%));
}
```

- 所有派生色一律用 `color-mix(in oklab, …, var(--lamp) X%)` 表达，于是**色温是一个旋钮**
  而不是几十处硬编码：改 `--lamp` 全站换情绪，改 `--t` 全站换时间。
- **降级路径**：`@supports not (animation-timeline: scroll())` → 冻结在 `t=.72`（可读态），
  并在页尾给一行手书"这页在你的浏览器里不会显影"。不做 JS 兜底滚动监听（会抢主线程，
  且与 L1 冲突）。
- 首屏 SSR 直出 `t=0` 的解析值（不依赖动画启动），**零 FOUC / 零 CLS**。

### 2.3 光模型（谁照亮谁）

- 主光：**画面内的一盏灯**。用一层径向渐变（圆心在左下容器缘外 8%，半径 120vh），
  浓度随 `--t` 从 1 → 0；即"灯亮着，然后天亮，灯就不再需要了"。这是全站最强的一个动作。
- 补光：读者的光标。光标周围 260px 的极缓提亮（lerp 0.06），像俯身看。`pointer: fine` only。
- **bloom 取代描边**：`box-shadow: 0 0 0 1px color-mix(in oklab, var(--lamp) 22%, transparent)`；
  真正的 `border` 仅保留给焦点环（焦点环必须 ≥3:1，不得靠 bloom 表达可聚焦）。
- 禁止：`filter: drop-shadow` 常驻、`backdrop-blur` 全屏（性能与"通透"的语义冲突）。

### 2.4 粉（唯一彩度）：极性感知

同一个角色在曲线两端必须是不同的值，否则在亮端会死（实测 `#f0cfc6` 在天光底只剩 1.28:1）：

| | 暗端（t < 0.5） | 亮端（t ≥ 0.62） |
|---|---|---|
| UI / 边 / 焦点 | `#f0cfc6`（黑底 **13.7:1**） | `#8e5a50`（纸底 **5.0:1**） |
| 强调文字 | `#e0a99d`（9.8:1） | `#7d4b43`（6.3:1） |
| 语义 | 被观测到了 | 被观测到了 |

`--accent` 在运行时按 `t` 取哪一组，机制固定为：**停靠点由 §2.2 的 keyframes 同时插值
`--accent` 本身**（`@property --accent { syntax:'<color>' }`，在 `develop` 的 42% 帧写
`#f0cfc6`、58% 帧写 `#8e5a50`），因此颜色在晨昏带内自动补间，不需要 `light-dark()`
也不需要 JS 分支。组件层永远只写 `var(--accent)`，**极性是装置的事，不是组件的事**（D1）。

> **`--lamp` 与 `--accent` 的分工**（两者都是暖色，容易混淆）：`--lamp` 是**色温因子**，
> 只进 `color-mix()` 参与所有灰的调色，永不做前景；`--accent` 是**语义色**，只标"被观测到了"，
> 永不参与大面积染色。交叉使用即违反彩度唯一闸。

### 2.5 主题 = 曲线的参数，不是皮肤（对旧"双重人格"的重铸）

原来的"同一内容两种宇宙"（void/lumen 两套视觉）废除——那仍然是围绕主题做皮肤。
新的定义：**一个主题 = 一条曝光曲线的（起点 t₀，斜率 k，色温域）**。

| 主题 id | 保留 | 新定义 | t₀ | 说明 |
|---|---|---|---|---|
| `void` → 展示名「夜行」 | ✅ id 不变（避免迁移） | 从灯下出发，走完整条坡 | 0.00 | 默认。`prefers-color-scheme: dark` |
| `lumen` → 展示名「晨行」 | ✅ | 从窗边出发，跳过暗端 | 0.52 | `prefers-color-scheme: light` 自动落此 |
| `paper` | 由 reserved 转正式候选 | 固定在纸端，坡长仅 0.14 | 0.86 | 长文阅读模式 |
| `terminal` | ❌ 撤回 reserved（删除） | 终端绿违反"冷黑/唯一彩度"两条 | — | 从未实现，直接删定义 |

主题切换器随之降格为**"从几点开始"**（一枚 240° 的日晷，三档），不再是"换肤"。
这既是取消核心主题，又保住了四层契约里 `tokens ⊕ motion ⊕ effects ⊕ genui` 的结构。

**契约字段的连带变更（明确写死，不留歧义）**：

- `ThemeMeta.modes: Array<'light'|'dark'>` **作废删除**——明暗不再是二维开关，它被 `t₀` 吸收
  （`void`=夜起、`lumen`=晨起）。`<html data-mode>` 与 next-themes 的 mode 通道一并撤下，
  `prefers-color-scheme` 改由服务端解析为 `t₀` 的默认值（cookie 仍可覆盖）。
- `ThemeTokens.color` 的静态值（bg/surface/ink…）**降级为 `t=t₀` 处的快照**，仅供 OG 图与
  无 JS/无 `animation-timeline` 环境直出使用；运行时真源永远是 §2.2 的那组 `@property`。
- `ThemeEffects.renderer: 'rift-layer'` → 改名 `'exposure-layer'`（管线复用，uniform 新增
  `uSnow`/`uBloom`，`uTear` 删除）。

---

## 3. Motion / 转场 / 无声音效

### 3.1 分相（phase inversion）——全站最重要的一刻

`t` 跨过 **0.52** 的那一瞬间叫**分相**（摄影术语：负片翻正片）。它必须被看见：

```
分相过门（唯一合法序列，总时长 240ms）
  0–40ms   颗粒密度 ×2.4（uSnow → .38），亮度不动      ← 「雪花起来了」
  40–120ms 极性交叉：白墨→黑墨、灯色→天光色，一次插值；
           bloom 从"文字"扩散到"整幅"（半径 0 → 100vw）  ← 不是白闪，是光晕散开
  120–240ms 雪花退去（uSnow → .02），列表显影为可读文字
```

- **每页至多一次**。触发条件是本次会话内 `t` 实际穿越 0.52——首页必然穿越；
  内页（起点已在 0.62+）永不穿越，因此永不见雪。**克制越久，那一次越有效。**
- 触发点不可被滚动反向重复播放（方向锁：每次进入页面 `armed = true`，触发或反向越界即 `false`）。
- reduced-motion：整段替换为 120ms 明度交叉，零雪花。

### 3.2 四种镜头语（继承"一次转场只用其一"）

| 镜头 | 用途 | 实现 | 预算 |
|---|---|---|---|
| **推轨变焦**（眩晕） | 进入一条记录的正文 | 背景 `scale(1→1.14)` 同时容器 `perspective` 拉远；主体不动而空间弯 | ≤380ms |
| **甩镜** | 跨年份跳转（"那年冬天"→"第二年春"） | `skewX(-9deg)` + `blur(14px)` 一进一出，6 帧步进 | ≤220ms |
| **急推** | 观测行为（⌘K 回车选中一条） | `scale(1→1.055)` 单程，无回弹 | ≤140ms |
| **长焦压缩** | 索引页（粒子性读法）的行密度 | 行高 `1.9→1.45` 与字距收紧同时发生，像拉近 | ≤300ms |

一次转场一种；转场期间输入防抖；时长一律从 `theme.motion` 取，禁魔法数字。
跨路由仍走 View Transitions（`rift-layer` 管线复用为 **`exposure-layer`**，跨页常驻——"底片不断，药水里换"）。

### 3.3 无声 foley 映射（cult 片的"感觉之上"）

**不引入任何音频**（无声是承诺，不是缺失）。用亮度与颗粒演一套声音设计，
规则是一张表，不是自由发挥：

| 声音事件 | 视觉对应 | 参数 |
|---|---|---|
| **撞击**（门、键盘、心跳） | 光晕在液面扩散 | bloom 半径 0→48px，260ms，`cubic-bezier(.16,1,.3,1)`；**不用白闪、不用震屏** |
| **riser**（渐强的引子） | 浮尘密度爬升 | `--grain` .012→.030，跨 1.2s |
| **低鸣**（持续低频） | 整幅亮度下压 2.4% + 遮幅微收 | 3% 幅度以内，循环 ≤2 次 |
| **电流声**（不安） | 光标环抖动 0.6px，0.9Hz | 与 `--gen-live` 共用 jitter 源 |
| **静默**（最狠的一招） | 颗粒**减速**（不是停止），8fps→2fps | 240ms 内完成，随后恢复 |
| **咔哒**（定格/切换） | 单帧步进 + 一帧暗角收缩 | `steps(1)`，16ms |

`prefers-reduced-motion: reduce` → 撞击/咔哒降为纯 opacity 微调；riser/低鸣全关。

### 3.4 三档 register（宏大 / 荒诞 / 歇斯底里各得其所）

| register | 允许什么 | 出现在哪 |
|---|---|---|
| **宏大**（默认底色） | 尺度对比：人 ≤2% 画面、留白 40vh、地平线式横向光 | 首页 S0–S2、每条记录的开场 |
| **荒诞**（内容层） | 并置、错位、自嘲、无解释的跳转；**只在文案与素材里** | feed 相邻条目、旁批 |
| **歇斯底里**（受限） | 重复、堆叠、失控的字距与密度、字体大小跳到 3× | **只允许在晨昏带内 300ms**；其余任何位置违规 |

规则：**register 之间不得混合渲染**（一屏之内只能有一种），且歇斯底里每次会话总时长 ≤1.2s。

---

## 4. 意识流的数据模型（把"流"写成表）

### 4.1 一条记录，不是一篇文章

废除"文章 / 项目 / 关于"三个名词。读者面前只有**记录（entry）**。
`kind` 仍然存在，但它只决定**渲染可供性**（要不要代码块底、要不要图片遮幅），
**永不**出现在界面上作为分类——一分类就又变成实验室了。

```ts
// src/lib/db/schema/entries.ts（新；取代 posts 的读者侧语义）
export const entries = pgTable('entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  lang: text('lang').notNull(),
  kind: entryKind('kind').notNull().default('note'),
  // 'thought' 一句话 | 'note' 技术笔记 | 'footage' 影像/截图 | 'letter' 长文
  // ★ 'spec' 不在此表内：生成物快照仍是独立存储（queries/spec.ts → /spec/[id]），
  //   一条记录要"引用"某次生成，走 annotations(author='agent', bodyMd 含 specId)，
  //   不新增 kind——避免"实验室"从后门爬回来。
  occurredAt: timestamp('occurred_at').notNull(),   // ★ 发生时刻，不是发布时间
  publishedAt: timestamp('published_at'),           // 可选：允许"发生了但很久以后才写"
  title: text('title'),                             // ★ 可为空！thought 常常没有标题
  bodyMd: text('body_md').notNull(),
  location: text('location'),                       // 可空；有就用来给"那年冬天"配地名
  weather: text('weather'),                         // 可空；一行就够，人味来自具体
  supersedesId: uuid('supersedes_id').references((): AnyPgColumn => entries.id),
  // ★ 划掉重写：旧条不删，正文渲染为被划掉的样子，新条挂在它下面
  pinnedAs: text('pinned_as'),                      // 'who-am-i' —— 「关于」是一条记录（§4.4）
  aiInvolvement: entryAi('ai').notNull().default('human'),   // 诚实化，铁律 L5 仍在
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),   // 沿用既有审计列语义
})
// 索引：(occurred_at DESC, lang)；GIN(body_md)；partial where published_at is not null
```

```ts
// src/lib/db/schema/annotations.ts（新）——旁批是这张站的一等公民
export const annotations = pgTable('annotations', {
  id: uuid('id').primaryKey().defaultRandom(),
  entryId: uuid('entry_id').notNull().references(() => entries.id, { onDelete: 'cascade' }),
  anchor: text('anchor').notNull(),          // 被批的原文片段（精确匹配，非偏移量：不怕改版）
  author: annotAuthor('author').notNull(),   // 'self' 作者后来写 | 'agent' AI 回应 | 'reader' 评论
  bodyMd: text('body_md').notNull(),
  writtenAt: timestamp('written_at').notNull(),      // ★ 与正文的 occurredAt 差值 = 这条旁批的"年龄差"
  strokeAssetId: text('stroke_asset_id'),            // self → 真实笔迹 SVG；agent/reader → 排版体
  retractedAt: timestamp('retracted_at'),            // 允许"后来我又划掉了自己"
})
```

**"年龄差"是这套模型的心脏**：一条 2023 年的记录边上，有一条 2026 年写的旁批——
界面上把差值写出来（"三年后我回来看这句"），这就是意识流的时间厚度，
而不是把日记和笔记分成两个栏目。

### 4.2 锈（D3 的可计算形式）

```
rust(entry)      = clamp((now − occurredAt) / 1095d, 0, 1)          // 三年锈透
freshness(note)  = clamp(1 − (now − writtenAt)   /  45d, 0, 1)      // 旁批 45 天内算"新墨"
```

`rust` 驱动三件事，全部低开销（CSS 变量，无逐元素 JS）：
1. **边缘锈层**：`rust > .35` 起，卡片右下角一层极淡的赭色氧化（`::after` + 单张噪声纹理），
   最大不透明度 `rust * .10`；
2. **字色退墨**：铁胆墨会褪——正文墨随 `rust` 向 `--lamp` 混入最多 7%；
3. **声调降速**：foley 的 `低鸣/静默` 事件更慢更稀（旧记录的动作更沉）。

`rust` 不做成徽章、不做成进度条。它必须像真的旧东西一样：说不清哪儿不一样，但没有一处更新。

### 4.3 路由表（删与立）

| 路由 | 处置 | 说明 |
|---|---|---|
| `/[lang]` | **重写**：一条长坡 + 意识流 feed | 全站唯一的入口，也是唯一的"首页" |
| `/[lang]/e/[slug]` | 新（取代 `/posts/[slug]`） | 散文电影式正文（§7.2） |
| `/[lang]/then/[year]` | 新 | 回看某一年（"那年冬天"的落点）；SEO 可索引 |
| `/[lang]/marginalia` | 新 | 所有旁批的**粒子性**读法：一页密集的注，像对开本末页勘误表 |
| `/[lang]/index` | 新（⌘K 的回车落点） | 与 marginalia 同数据，不同装置（索引 vs 注） |
| `/[lang]/posts`、`/projects`、`/about` | **删除** | 「关于」转为一条 pinned entry（§4.4）；项目转为若干条记录 |
| `/[lang]/search` | 保留 URL，**内容改**为索引页 | 旧地址 301 → `/index`；不做搜索"页"，观测就是坍缩 |
| `/spec/[id]` | 保留为分享落点，**无导航入口** | 沿用 v2.2 的决定，不变 |
| `/[lang]/lab`、`/lab/s/[id]` | 已撤（v2.2）——本文补记：源码中 `queries/lab.ts` 更名 `queries/spec.ts`，清除"实验室"这个词的所有残留 | |
| `/admin/**` | 保留 | 后台不受设计语言约束（工具属性），但共用 tokens |

### 4.4 「关于」是一条在腐烂的记录

不设关于页。**「关于」是 feed 里一条 2023 年写的记录**，被你自己批注、划掉、
重写过四五次；它的锈值最高，页边最挤。读者点它的旁批，能顺着你三年的犹豫回到你身上。
这比任何"简介"都更像一个人——也是"人文主义"在数据结构上的唯一诚实实现。

---

## 5. GenUI 与 Agent 的隐入（有质感的 AI-Native）

先进技术不做橱窗（v2.2 决定，本文彻底执行）。**AI 在这张站上的唯一形态是"页边的那只手"。**

### 5.1 生成物 = 磨砂玻璃里长出的一段正文

- 生成中：该块是**黑白毛玻璃**（`backdrop-filter: blur(9px) saturate(.85)` + 一层颗粒），
  里面有 ≤1px、0.9Hz 的跃动（`--gen-live: 1`）——**看不清是特性**，不是加载遮羞布。
- 定稿：磨砂退去、跃动停止、文字落定，并把这一段的 `annotations` 记为 `author: 'agent'`。
- 事后回看：agent 旁批永远比作者旁批**多一道 1px 粉 bloom**，但字号行距完全一致。
  → 透明性（原铁律 L5）由此达成：**不靠徽章，靠光**。

### 5.2 agent dock 撤除，改为段侧提问

浮动球 + 480px 抽屉取消（它是"橱窗"，也是屏幕上的第二个焦点，违反 D3 与拒绝清单）。
新交互：正文任意段落 hover/focus → 段左缘出现一枚针脚（粉，1px）→ 点开是**写在这一段旁边**的输入框
→ 回答以旁批形态出现（同一形态，见 5.1）。**AI 不占有屏幕，它借页边站着。**

- 全站检索/导览类问题仍然能问：把它写在页首那行"给这一页留句话"里即可，不另设入口。
- L2 工具（`tool.ts` 契约，`execute` 恒 `undefined` 的红线）**不变**：仍挂起为确认卡，
  仍经用户审批回流。确认卡是**第二处合法雪花**（与分相等长 ≤240ms），
  措辞从"需要你的确认 / 确认执行"改为**"你确定要这样吗 / 就这样 / 不了"**。
- 三引擎路由（json-render / OpenUI / RSC）与唯一 catalog 真源不变（[05-harness-spec](../../specs/05-harness-spec.md) §3–§5）；
  `catalogVariant` 的 `'hud'` 语义彻底废弃，只保留 `'stitch' | 'clean'`，皮肤随 `t` 取色（hud 感已死）。

---

## 6. 版面：首页那条坡，与内页那封旧信

### 6.1 首页 = 一次完整的显影（`t: 0 → 1`）

```
S0  t=0.00  灯下。只有一句立场 + 出处小字。没有导航、没有 logo 咬合、没有滚动提示。
            「没有被写下来的，不算发生过。」
            —— 右上角一枚极小的日晷（主题切换器），其余全空
S1  t=0.14  第二行：「所以我写。凌晨三点也写。」 + 页边一条秒针刻度开始走
S2  t=0.28  第一批记录从黑里浮出（首行只显日期与一行字，标题还没看清——显影未完成）
S3  t=0.42  feed 成排：思想 / 技术笔记 / 影像定格 / 一封信，平权混排（意识流并置）
S±  t=.46-.58  晨昏带：这里允许一次歇斯底里（300ms）—— 密度、重复、字距失控，然后分相
S4  t=0.62  黑墨接管。同一条 feed，但读得清了（刚才在暗处读过的条目在此"被重新认出"）
S5  t=0.78  索引出现：⌘K 的说明、年份的门（"那年冬天"）
S6  t=0.90  通透：一句对读者的话 ——「天亮了。你可以从这里读起。」
S7  t=1.00  纸：页脚。© 伍泽凯 · 这页正在慢慢显影 · 灯：2400K · RSS
```

- feed 条目**不用卡片**：一行行的"信纸"继承 v2（hairline 分隔 + 上下留空），
  但行内允许**混排异构介质**：一张定格的图（遮幅 2.39:1）、一段代码（首行是命令，像屏幕截图）、
  一句手写（真笔迹 SVG，8fps 描出来）。
- **不解释跳转**：相邻两条可以毫无过渡地从集群跳到母亲的电话。不给 tag、不给面包屑、
  不写"技术笔记："。读者会自己完成缝合——这是意识流在版面上唯一正确的实现方式。
- 页边**秒针刻度**（真实时间，1s 步进）：一条 1px 竖线，走针。整站唯一的常驻"音效"就是它。

### 6.2 内页 = 散文电影（起点已在亮端）

```
①  标题卡（t=0.08，纯暗，display 大字，≤300ms 后随滚动升起）
    —— 这就是"分幕"：每进入一条记录，灯灭一次，然后天亮
②  正文（t=0.78–0.90；68ch；行高 1.9；Shiki 代码块底随 t 取墨；KaTeX/Mermaid 不变）
③  页边旁批栏（右 22%，S7 旧纸底）：你自己的、agent 的、读者的，同一形态，粉 bloom 区分来源
④  生锈的脚注：这条记录的 occurredAt、当时所在地、天气、以及"它已经生锈 rust=0.62"
    —— 用一行小字，不做徽章，不做进度条
⑤  「后来我又写」：supersedes 链，旧句划掉、新句跟在后面（划掉是内容，不是删除）
⑥  页尾：相关三年内的两条（按 occurredAt 邻近，不按 tag）
```

内页**永不见雪花**（起点在 0.62 以上，不穿越 0.52）。阅读中途唯一会动的是秒针与退墨。

---

## 8. 文案：重写全部 microcopy

判分标准（这三条是本节的全部依据）：
① 第一句必须是**立场**，不是描述；② 允许改写经典，但必须是**被生活磨过的引用**，
不是掉书袋；③ **首页不承担"看懂"的义务**——看不懂是钩子。禁止工程师口号。

### 8.1 `dictionaries/zh.json`（新）

```jsonc
{
  "site": {
    "statement": "没有被写下来的，不算发生过。",
    "secondLine": "所以我写。凌晨三点也写。",
    "atDaybreak": "天亮了。你可以从这里读起。",
    "title": "静水 · 伍泽凯"
  },
  "nav": { "flow": "流", "index": "索引", "then": "那年", "marginalia": "旁批" },
  "dial": { "night": "夜行", "dawn": "晨行", "paper": "纸" },        // 原主题切换器
  "clock": { "aria": "这一页已经走了多久" },                          // 秒针刻度
  "feed": {
    "emptyNight": "今晚还没有新的。那就先看看旧的。",
    "rusty": "这条已经生锈了——它写于 {n} 个冬天以前。",
    "laterMe": "三年后我回来看这句",
    "crossedOut": "我后来划掉了它"
  },
  "observe": {
    "hint": "⌘K · 观测",
    "placeholder": "观测一条记录（它会因此固定下来）",
    "collapse": "流坍缩成索引的那一刻",
    "empty": "没有被观测的，暂时两种可能都是真的。"
  },
  "margins": {
    "ask": "在段落的边上写点什么",
    "agentWriting": "有人在页边想一会儿",
    "agentDone": "写完了",
    "confirmTitle": "你确定要这样吗",
    "confirmYes": "就这样",
    "confirmNo": "不了"
  },
  "notFound": {
    "title": "这条没有被写下。",
    "body": "所以按本站的信条，它不存在。但你可能只是想找个地方待一会儿。",
    "back": "回到灯下"
  },
  "footer": {
    "rights": "© 2026 伍泽凯",
    "developing": "这页正在慢慢显影",
    "lamp": "灯：{cct}K",
    "rss": "想带着走的话"
  },
  "entry": {
    "occurred": "发生在 {date} · {weather} · {location}",
    "aiHuman": "人写的", "aiAssisted": "有人陪着写的", "aiGenerated": "机器先写的，我看了一遍",
    "relatedThen": "那时候他还写了"
  }
}
```

### 8.2 `dictionaries/en.json`（与 zh **同一键集**，逐键落地，不得只上半套）

```jsonc
{
  "site": {
    "title": "Shizurak — WUZEKAI",
    "statement": "What isn't written down didn't happen.",
    "secondLine": "So I write. Even at three in the morning.",
    "atDaybreak": "It's daylight. You can start reading here."
  },
  "nav": { "flow": "Flow", "index": "Index", "then": "That Year", "marginalia": "Margins" },
  "dial": { "night": "Nightfall", "dawn": "Daybreak", "paper": "Paper" },
  "clock": { "aria": "How long this page has been awake" },
  "feed": {
    "emptyNight": "Nothing new tonight. Look at the old things, then.",
    "rusty": "This one has rusted — it was written {n} winters ago.",
    "laterMe": "Years later I came back to this line",
    "crossedOut": "I crossed it out later"
  },
  "observe": {
    "hint": "⌘K · Observe",
    "placeholder": "Observe a record (it will settle because you looked)",
    "collapse": "The moment the flow collapses into an index",
    "empty": "Unobserved — both possibilities are still true."
  },
  "margins": {
    "ask": "Write something in the margin",
    "agentWriting": "Someone is thinking in the margin",
    "agentDone": "Written",
    "confirmTitle": "Are you sure?",
    "confirmYes": "Do it",
    "confirmNo": "Never mind"
  },
  "notFound": {
    "title": "That one was never written.",
    "body": "So by this site's creed it doesn't exist. But you may just have wanted somewhere to sit.",
    "back": "Back to the lamp"
  },
  "footer": {
    "rights": "© 2026 WUZEKAI",
    "developing": "This page is still developing",
    "lamp": "Lamp: {cct}K",
    "rss": "If you want to carry it"
  },
  "entry": {
    "occurred": "Happened {date} · {weather} · {location}",
    "aiHuman": "Written by hand",
    "aiAssisted": "Written with someone beside me",
    "aiGenerated": "The machine wrote first; I read it",
    "relatedThen": "Back then they also wrote"
  }
}
```

两个语言**键集完全相等**（`dictionaries.ts` 的契约测试断言键集同构，缺一个键即红）；
`en` 行高 1.6 / 段落 72ch 的分语言细则（原 01-spec §3.3）继续适用。

### 8.3 命名禁令

`文章/项目/关于/实验室/搜索/主题/明暗/精选信号/项目名录` 这些词从读者界面全部消失。
新词只有：**流、索引、那年、旁批、灯下、天亮、晨昏、分相、观测、显影**。
一次引入一个词表内的新词，同一屏内不超过两个生词（否则是黑话，不是诗）。

---

## 9. 性能 / 无障碍 / 降级

### 9.1 预算（继承 01-spec §10 数字，此处只记增减）

| 指标 | 新目标 | 变化理由 |
|---|---|---|
| 首页 first-load JS | **≤150KB gz**（红线 190KB） | 曝光斜坡走 CSS scroll-driven，滚动主路径**零 JS**；GSAP 退出滚动驱动（现存 341KB 债务顺带解决大半） |
| `exposure-layer`（WebGL，idle 后） | ≤48KB gz | 沿用 rift-layer 管线，加 `uSnow` uniform |
| 真笔迹 SVG（每条含手书的记录） | ≤6KB / 条 | 路径简化 + `stroke` 而非轮廓；只在该条进入视口时取 |
| 锈层纹理（全站一张） | ≤18KB | 单张噪声 + 复用，禁止逐元素滤镜 |
| LCP / CLS / INP | 2.0s / 0.02 / 200ms | 不变；SSR 直出 `t=0` 解析值保 LCP |
| 主题（日晷）切换 | <40ms | `--t` 起点改变是纯 CSS 变量写回 |

### 9.2 降级表（每一样都必须有三级路径）

| 特效 | 高端 | 低端 | 无能力 | `prefers-reduced-motion` |
|---|---|---|---|---|
| 曝光斜坡 | scroll-driven `@property` 插值 | 离散 4 档（S0/S3/S5/S7，`@container style()` 切） | 冻结 `t=.72` + 页边一行手书说明 | 斜坡保留（用户驱动，非自动播放）但改离散 4 档 |
| 颗粒 / 浮尘 | 8fps 步进（定格气质的极轻版） | 静态单帧 | 无 | **关** |
| 分相雪花 | 240ms | 120ms 单帧灰底 | 无 | 120ms 明度交叉，零雪花 |
| bloom 光晕 | 真扩散 | 单层阴影 | `border` 兜底（**必须仍可见**） | 静态 1px |
| 手书描出 | 8fps `steps()` | 直接显示 | 直接显示 | 直接显示 |
| 光标补光 | lerp 0.06 | lerp 0.12 | `pointer: coarse` 关 | **关** |
| 镜头语（四种） | 全量 | 去 blur，保位移 | opacity 交叉 | 120ms opacity |

### 9.3 无障碍硬约束

- **正文对比度**：所有承载段落的停靠点 ≥7:1（S0–S4 白墨 7.1–16.2，S5–S7 黑墨 7.1–16.5，实测）。
- **晨昏带不得承载段落**：靠 token 白名单强制——`--bg` 在 `t∈[.44,.60]` 区间内不得与
  `--ink` 组合出现在 `<p>/<li>` 的祖先上（`theme:check` 断言：禁用色值集合 + 该带内只允许
  `text-[length:var(--text-display-size)]` 与 `mono-micro`）。
- **焦点可见**：焦点环独立于 bloom，实色 2px，≥3:1，`outline-offset: 2px`。
- **`prefers-contrast: more`**：冻结 `t=.90`、关 bloom 与颗粒、恢复 1px 实描边。
- **键盘**：`t` 由滚动驱动，键盘滚动同样驱动（不绑鼠标）；feed 每条是一个 tab 停靠位。
- **屏幕阅读器**：分相与雪花 `aria-hidden`；旁批用 `<aside>` + `aria-label="三年后的批注"`；
  生成中区域 `role="status"` + 定稿才播报一次（不逐 token）；秒针刻度 `aria-hidden`（另给一处
  可读的时间文本）。
- **色觉**：粉不作唯一区分手段——来源（作者/agent/读者）另有文字标与形状差（针脚 vs 短横 vs 折角）。

---

## 10. `theme:check` 新增门禁

1. **色相闸**：`t < .5` 的所有背景 hue ∈ **[20°, 45°]**（冷黑一票否决）；`t ≥ .78` 的背景
   或 hue ∈ [195°, 225°] 或为纸（[38°, 46°]），二者不得混用于同一表面。
2. **极性闸**：正文墨必须按 `t` 分段（暗端白墨 / 亮端黑墨）；任何"白墨压在 t>0.45 的底"或
   "黑墨压在 t<0.55 的底"的组合 → 失败（实测 <4.5:1 的排列组合全灭）。
3. **彩度唯一闸**：内容层除 `--accent±` / 锈赭（`#8e5a50`–`#b87f74` 域内）外，任何饱和度 >6%
   的色值 → 失败（粉只准用两个，多一个就又是皮肤）。**`--lamp` 不得出现在前景色属性上**
   （见 §2.4 分工）。
4. **晨昏带禁段落**：**唯一定义** `t ∈ [0.46, 0.58]`（§2.1 表与本文其余各处以此为准；
   门禁扫描时可放宽到 `[0.44, 0.60]` 作为保守超集，但放宽只严不松）。规则见 §9.3。
5. **雪花配额闸**：`uSnow` 的赋值只允许出现在分相与 L2 确认卡两个模块（静态扫描 import 图）。
6. **词汇闸**：`§8.3` 的旧词（文章/项目/关于/实验室/搜索/主题/明暗/精选信号）出现在
   `dictionaries/*.json` 的读者键里 → 失败。
7. **斜坡零 JS 闸**：禁止在滚动路径上新增 `addEventListener('scroll')` / GSAP ScrollTrigger
   用于曝光驱动（性能与 L1 双保）。
8. **文案闸**：第一屏不得出现人称介绍句（"我是…"/"建设中"）；每个页面必须有且只有一句立场句。

（共 **八** 项；`theme:check` 现有断言——token 完整性、对比度、OKLCH 全角度、焦点可见性、
hover-only 检测——全部保留，八项是叠加而非替换。）

---

## 11. 清除清单（本轮必须消失的东西）

| 目标 | 动作 |
|---|---|
| 仓库根目录 `实验室` 文件 | 删除（它是 `/zh/lab;` 的一次 404 HTML 转储，被误存成文件） |
| `src/lib/db/queries/lab.ts` | 更名 `queries/spec.ts`，导入点同步 |
| `[lang]/(site)/projects/page.tsx`、`about/page.tsx` | 删除（关于转为 pinned entry） |
| `dictionaries.*.home.{signals, directoryTitle, directory}` | 删除（"精选信号 / 项目名录"两幕作废） |
| `hero.tsx` 的 kicker「个人站点 · 建设中」 | 删除（违反文案闸） |
| `src/themes/terminal/` | 撤回 reserved，删除定义（终端绿违反色相闸与彩度闸） |
| `paper-row.tsx` / `signal-row.tsx` | 改造而非删：`paper-row` 保留为记录行基底（重命名 `entry-row`）；`signal-row` 的"精选信号"语义作废，其 ViewTransition 点名机制转给 `entry-row` |
| `src/components/site/agent-dock*.tsx` | 删除，改为段侧 `margin-ask`（§5.2） |
| 幕语法 v2 的 T1 撕幕 / T2 崩解 / T3 拉焦 | 作废；`rift-layer` 管线改名 `exposure-layer` 复用，"撕"的字面全删 |
| `docs/specs/01-design-spec.md` §0/§2/§5/§6/§7/§8 与幕语法交叉指针 | 加 v3 指针（保留历史正文，标注作废） |
| `.superpowers/`（头脑风暴产物） | 已在 `.gitignore`，不动 |

### 11.1 实施分期（交给 writing-plans 时沿用，不得抖成一次提交）

| 期 | 内容 | 为何这个顺序 |
|---|---|---|
| **P1** | `@property` + 曝光斜坡 + `--lamp`/`--accent` 双变量；删 `modes` 轴 | 地基：十一件零件全读 `t`，先定它才能并行 |
| **P2** | 数据模型迁移（`entries`/`annotations`/`occurredAt`/`supersedes`）+ 存量 posts 回填 | 文案与版面都依赖"旁批是一等公民"，晚做会二次改译 |
| **P3** | 首页长坡 + feed 并置 + 秒针刻度 | 验收 1/2 的主体，最早能拿到"一眼"证据 |
| **P4** | 分相 + 四种镜头语 + foley（`rift-layer`→`exposure-layer`、加 `uSnow`） | 依赖 P1 的 `t` 与 P3 的真实滚动幅度 |
| **P5** | 内页散文电影 + 旁批栏 + 手书采集 + 锈 | 依赖 P2；手书需你配合录一次笔迹（单次 5 分钟） |
| **P6** | AI 隐入：段侧 `margin-ask`、agent 旁批 bloom、L2 雪花；删 agent dock | 依赖 P2/P5 的旁批形态 |
| **P7** | 全量文案重写（zh/en 同键集）+ 路由删除与 301 + 执行清除清单 | 词汇闸放最后，避免中途 CI 长期红 |
| **P8** | 八项门禁 + e2e + 三档降级实测 + 验收证据归档 | "做完"的定义在 §12，不在代码里 |

---

## 12. 验收：什么样才算做完了

不做"代码写了 = 做完了"。逐条要有证据（截图 / 录屏 / 实测数字 / e2e 断言）：

1. **首屏一眼**：关掉声音、拿给一个不认识你的人看 3 秒，他能说出"暗，但有个人在灯下"
   ——说"这是技术博客"或"有点吓人"即失败。
2. **一条坡走完**：录屏首页从 `t=0` 滚到 `t=1`，中途**恰好一次**分相；`--bg` 实测经过
   `#0b0907 → #4a4036 → 晨昏 → #a89f93 → #eef1f4 → #f5f1e8`；滚动全程主线程无 JS 参与
   （Performance 面板：scroll 期间 0 个 JS 任务由曝光驱动引起）。
3. **无橱窗**：全站找不到任何"AI 能力 / 技术栈 / 实验室"的展示位；生成物只以旁批出现。
4. **词的消失**：`rg '文章|项目|关于|实验室|精选信号' src/app/[lang]` 在读者文案里为空命中。
5. **对比度**：`pnpm theme:check` 八项新门禁 + 存量断言全绿，含色相闸（无冷黑）与极性闸。
6. **降级**：`prefers-reduced-motion` / `prefers-contrast: more` / 无 `animation-timeline`
   三种条件下，正文均可读（≥7:1）且无内容缺失。
7. **锈**：一条 ≥3 年的记录与一条 <30 天的记录并排，截图放大能测出边缘色差
   （`Δrgb` ≥2 且不透明度 ≤.10），但没有徽章。
8. **手书是真的**：`annotations.strokeAssetId` 指向的 SVG 路径来自采集，非字体轮廓
   （检查生成方式与 `d` 串来源）。
9. **e2e**：`pnpm e2e` 覆盖——分相一次且仅一次、⌘K 波↔粒互切换、段侧提问产生旁批、
   L2 雪花配额、晨昏带无段落。
10. **它得让人心里动一下**：把首页那句"没有被写下来的，不算发生过"和页脚那句
    "这页正在慢慢显影"放在一起读，如果不觉得这是一个人而不是一个产品，就还没做完。

---

## 附：设计决策记录（ADR 摘要）

| # | 决策 | 理由 | 被否决的替代 |
|---|------|------|--------------|
| E1 | 设计语言 = 一个标量 `t` 的函数，不是一份色板 | 用户拒绝"围绕核心主题"；把人格降为一个参数，皮肤就不可能复活 | 三套"氛围预设"（否决：仍是换肤） |
| E2 | 滚动 = 显影（灯下 → 晨昏 → 天亮） | 一举解决"电影感要黑 / 长文要亮"的唯一真冲突，且把它变成叙事而非妥协 | 双主题各管一头（v2 旧路，否决：仍是分区） |
| E3 | 曝光斜坡用 CSS scroll-driven `@property` | 零 JS、零主线程、与铁律 L1 一致；顺带压掉 first-load 债务 | JS 监听 scroll 写 CSS 变量（否决：抢主线程 + 违反 L1） |
| E4 | 恐怖感来自色相，不来自亮度 | 实测：`#040507`(220°) vs `#0b0907`(30°)，亮度差 3 倍而情绪反转；于是"暖"变成可门禁的数值 | 靠减暗、加留白来"柔和"（否决：治不了病根） |
| E5 | 粉是唯一彩度，且**极性感知**（两端不同值） | 单一彩度是"高级感"的来源；不做极性则亮端 1.28:1 直接不可用 | 全局一个粉（数学上不可行） |
| E6 | 音效不做成音频，做成亮度映射表 | 声音会打断阅读、要用户手势、且是新的"橱窗"；亮度映射保留 cult 的**感觉**且零成本 | `<audio>` + 音量开关（否决：没人会打开，还污染包体） |
| E7 | 「关于」= feed 里锈得最重的一条 | 人文主义要在数据结构上成立，否则只是文案；三年的犹豫比一份简介可信 | 独立 about 页（删除） |
| E8 | AI 只借页边站着（旁批形态） | 与"技术笔记的边上有人"同构；透明性靠 1px 粉 bloom 而非徽章 | agent dock 抽屉（否决：第二焦点 + 橱窗） |
| E9 | 手书必须真笔迹 SVG，禁手写字体 | 字体是假的，读者闻得出来；真笔迹还能承载 8fps 定格气质 | LXGW / 手写 webfont（否决） |
| E10 | 主题切换器降格为"从几点开始"（日晷三档） | 保住四层契约与既有 store/SSR 通道，同时消灭"换肤"语义 | 删除主题切换（否决：`prefers-color-scheme` 仍需落点） |
| E11 | 词汇表即门禁（旧词进 CI 失败） | 文案滑坡是渐进的；只有门禁能守住"不写工程师口号" | 靠 review 记律（否决：会累、会漏） |
