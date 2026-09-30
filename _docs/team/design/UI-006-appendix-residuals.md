# UI-006: `docs/ArcBlog-admin-ui-design.md` 授权外残留事实对齐（L-R10-1 · §9 第 2 条 + 附录 A.1 + 附录三处 §2.3）——before/after 记录

| 字段 | 值 |
| ---- | -- |
| 提案号 | UI-006（对齐记录，非新设计提案） |
| 状态 | 已实现（**V1.4 → V1.5**），待 PM / QA-005 复核 |
| 提出轮次 | round-10 |
| 上游依据 | [REQ-010](../requirements/REQ-010-ui-standard-appendix-residuals.md) §1.2 / §2.1（L-R10-1 三项授权）· [UI-004](UI-004-ui-standard-assertion-and-residuals.md) **§8**（R1/R2/R4 原始登记）· [REQ-007](../requirements/REQ-007-ui-standard-assertion-and-residuals.md)（四项既有授权与红线口径）· `docs/ArcBlog-admin-ui-design.md` §2.5 / §8（「概念名」既有范式） |
| 实现方 | **UI 自改** `docs/ArcBlog-admin-ui-design.md`（Lead **L-R10-1** 仅事实对齐授权，**只此三项 (a)(b)(c)**） |
| 写范围越界 | **无**——UI 归因的改动只有 `docs/ArcBlog-admin-ui-design.md`（+ 本记录）；`git diff` 里 `.aup/**`、`dist/**`、`backlog.md` 均为 **Dev（task-21 / REQ-009）** 与 **PM** 的在飞产物，非 UI |
| 依据快照 | **改动前**：`docs/ArcBlog-admin-ui-design.md` 与 `HEAD 64e6a16` **逐字节相同**（`git diff --stat` 空）；**改动后**：8 insertions / 6 deletions，净 +1 行 |
| 版本行 | 按 REQ-010 §1.2「按既有惯例升 V1.5」（若 Lead 认为版本行超出 L-R10-1 → 见 §9 第 1 条，回退只需改回第 5 行一行） |

> 本项**只做事实对齐**：`git diff` 中**不动**任何期望值、不动 §9 十二条的条目口径与结构、不动两个等价断言块（逐字节证明见 §6）。
> 证据类型：全部为**静态复核**（grep / diff / 逐字节比对）；**未**启浏览器、**未**写实例、**未**跑 `npm run test:live`、**未** build（`dist/**` 的镜像由 Lead 轮末统一处理）。

---

## 1. 问题（授权外残留，UI-004 §8 原始登记）

| 编号 | 位置（V1.4 现行号） | 现状 | 与实现的事实冲突 |
| ---- | ------------------- | ---- | ---------------- |
| **R1** | §9 第 2 条（V1.4 第 **471** 行） | `□ 布局：…滚动只发生在 console-pane 内（无双滚动条）` —— 把 `console-pane` 当**实现名** | `.aup/` / `scripts/` 命中 **0**；与 §2.5（155–157 行）/§3.3（284 行）/§8（452 行）已按「概念名」标注的口径**不一致** |
| **R2** | 附录 A.1（V1.4 第 **554 / 558 / 583** 行） | `:554` `.console-pane { … }`；`:558` `row console-shell` ≈ `.app-shell`；`:583` 自检「滚动只发生在 console-pane」 | 这三处是**与框架无关的 CSS 骨架 / 提示词模板**里的类名（A.1 自己说是「喂给 AI 的原材料」），但读者会误读成本仓库实现名 |
| **R4** | 附录三处 `§2.3` 交叉引用（V1.4 第 **532 / 562 / 581** 行） | `:532`「§2.3 是标准」；`:562`「正好是 §2.3 禁止的双滚动条」；`:581`「标准：… §2.3 + 附录 A.1」 | 双滚动条禁令与滚动归属的**实际口径在 §2.5**（§7 那一处已在 R9 按 U2 改为 §2.5）；§2.3 是「控制台结构（一节一页）」 |

**影响**：不改行为，但会让 Dev / AI 去找不存在的选择器、让读者把布局标准记到错的章节号。受影响角色：UI / Dev / QA。

---

## 2. (a) §9 第 2 条 —— `console-pane` 补「本文档的概念名」限定语

**before（V1.4，第 471 行）**

```text
□ 布局：宽高 100% 流式；页面固定无纵向滚动条，滚动只发生在 console-pane 内（无双滚动条）
```

**after（V1.5，第 471 行，行号未漂移）**

```text
□ 布局：宽高 100% 流式；页面固定无纵向滚动条，滚动只发生在 console-pane（本文档的概念名，实现里没有这个选择器）内（无双滚动条）
```

- **只加限定语**，措辞与 §2.5（155–157）/§3.3（284）/§8（452）**同范式**（「本文档的概念名，实现里没有这个选择器」）。
- 条目判据三点**语义一字未变**：① 宽高 100% 流式 ② 页面固定无纵向滚动条 ③ 无双滚动条（滚动单一归属）。
- 条目编号、顺序、`^□` 条数均未动（§7 A2 有原始输出）；第 481–482 行「点击去向」条目未动。

**diff 关键行（`git diff -U0`）**

```text
-□ 布局：宽高 100% 流式；页面固定无纵向滚动条，滚动只发生在 console-pane 内（无双滚动条）
+□ 布局：宽高 100% 流式；页面固定无纵向滚动条，滚动只发生在 console-pane（本文档的概念名，实现里没有这个选择器）内（无双滚动条）
```

---

## 3. (b) 附录 A.1 —— 参考 CSS 类名 / 提示词模板里的 `console-pane` / `console-shell` 同范式标注

### 3.1 落笔方式（以及一处**有意识的取舍**）

| 出现点（V1.4 行号） | 处理 | 理由 |
| ------------------- | ---- | ---- |
| `:554` `.console-pane { grid-area: pane; overflow-y: auto; min-height: 0; }` | **不碰 CSS 行**，用紧随其后的**后置说明**（新增第 560 行 blockquote）覆盖 | REQ-010 §2.1(b) 允许「可加行内注释或**后置说明**」；REQ-010 §2.1 明确要求「A.1 的 **CSS 骨架本身**（选择器名、属性、`min-height: 0` 等）**不改**」→ 优先保骨架逐字节不变 |
| `:558` `…`row console-shell` ≈ `.app-shell`，`view console-pane` ≈ `.console-pane`…` | **不碰该行**，同一句后置说明**逐字点名**这两处并写明「结构类比、非仓库选择器」（见下） | 该行含 `style={overflowY: "auto"}`。REQ-010 A5 的启发式 grep 会把**任何**含 `overflowY` 的 `+/-` 行判成「断言表达式被改动」（假阳性）；改它会让 A5 那条命令直接印 `FAIL`。后置说明放在紧邻位置、逐字引用同一对写法，事实对齐效果等同 |
| `:583` 自检条目「滚动只发生在 console-pane」 | **行内标注**（该行不含任何 A5 敏感 token） | 提示词模板是**复制走**的东西，模板自身必须自带限定语 |

> 取舍已如实登记：若 PM / QA 认为 `:554` / `:558` 必须逐行内联标注，请裁决——那时 A5 的 grep 需要先修成「只扫两个 `js` 块的行区间」（见 §8），否则会稳定假红。

### 3.2 before → after

**新增（V1.5 第 560 行，紧随 :558 之后，覆盖 554 / 558 / 583 三处）**

```text
> 本节的参考 CSS 类名（`.app-shell` / `.console-nav` / `.console-pane` / `.page-head`）与上面这段的 `row console-shell` ≈ `.app-shell`、`view console-pane` ≈ `.console-pane` **都是本文档的概念名，不是仓库里的选择器**（`grep -rnE 'console-pane|console-shell' .aup/ scripts/` 命中 0）：`.app-shell` / `.console-pane` 是**与框架无关的 CSS 骨架**类名（本节是喂给 AI 的原材料，不描述本仓库实现），`row console-shell` / `view console-pane` 表达的是**结构类比、非仓库选择器**，AUP 落地对应的是结构而不是这段 CSS（§8）；A.3 自检条目里的 `console-pane` 同此口径。
```

**`:583`（V1.4）→ 第 585 行（V1.5）**

```text
-交付后自检：① 页面无纵向滚动条 ② 无横向滚动 ③ 滚动只发生在 console-pane
+交付后自检：① 页面无纵向滚动条 ② 无横向滚动 ③ 滚动只发生在 console-pane（本文档的概念名，实现里没有这个选择器）
```

**未改动项（逐字节，见 §7 A3-C）**：

- `:536` 的 `docs/reference/console-shell-layout.html` 引用：**只在**，文件未删未改名（7990 字节，与 UI-004 R3 实测一致）。
- A.1 的 CSS 骨架（现 538–556 行，`html, body` / `.app-shell` / `.app-header` / `.console-nav` / `.console-pane` / `.page-head`）：与 `HEAD` **逐字节相同**。
- `:532` 的「喂给 AI 的原材料」定位不变（该行只改 (c) 的章节号，见 §4）。

---

## 4. (c) 附录三处 §2.3 交叉引用 —— 改准为「§2.3 结构 + §2.5 滚动」/ §2.5

| 位置（V1.4 行号） | 上下文是否确指控制台外壳 | before | after（V1.5） |
| ----------------- | ------------------------ | ------ | ------------- |
| `:532`（A.1 前言，现 532 行） | 是——它给整份**布局**附录定标准 | `§2.3 是标准，本附录是**喂给 AI 的原材料**。` | `§2.3 结构 + §2.5 滚动是标准，本附录是**喂给 AI 的原材料**。` |
| `:562`（A.1「三个错」第 1 条，现 564 行） | 是——双滚动条禁令在 §2.5（正文 167 行） | `…正好是 §2.3 禁止的双滚动条。` | `…正好是 §2.5 禁止的双滚动条。` |
| `:581`（A.3 提示词模板，现 583 行） | 是——模板教 AI 搭控制台外壳 | `标准：docs/ArcBlog-admin-ui-design.md §2.3 + 附录 A.1。` | `标准：docs/ArcBlog-admin-ui-design.md §2.3 结构 + §2.5 滚动 + 附录 A.1。` |

- 两处用 **REQ-010 §2.1(c) 明确允许的复合口径**「§2.3 结构 + §2.5 滚动」——既改准了滚动/双滚动条的实际口径，又不删掉 §2.3 的结构定位（纯事实对齐，无信息丢失）。
- `:562` 用**直指 §2.5**：该条描述的缺陷机理（漏 `min-height: 0` → 双滚动条）与 §2.5 第 167 行一一对应，加复合口径反而绕。
- **§2.3 章节正文（标题现第 95 行起，到 `### 2.35` 之前）零改动**（§7 A4 的 `diff` 有原始输出）。

---

## 5. 版本行（REQ-010 §1.2「按既有惯例」）

**before（V1.4，第 5 行）**：描述 BUG-011 / U1 / U2 / U3，尾链 `上一轮见 [UI-003]`。
**after（V1.5，第 5 行）**：改述为 Round 10 的 (a)(b)(c) 三项，尾链 `逐条 before/after 见 [UI-006]…，上一轮见 [UI-004]…`。

```text
$ grep -n '文档版本' docs/ArcBlog-admin-ui-design.md | head -1
5:**文档版本：** V1.5（Round 10 · 2026-09-28 落盘（授权书 2026-09-27，**L-R10-1 事实对齐**）：…
$ grep -c 'V1\.5' docs/ArcBlog-admin-ui-design.md   →  1
$ grep -c 'V1\.4' docs/ArcBlog-admin-ui-design.md   →  0
```

> ⚠️ **授权边界自陈**：Lead 的 Round 10 派词只点名 (a)(b)(c)；版本行是 **REQ-010 §1.2 按 V1.3→V1.4 既有惯例**预授权的，且该 REQ 写了「若 Lead 认为版本行不在 L-R10-1 授权内 → 停手上报」。本轮**未被叫停**故按惯例执行；若 Lead 判定超出，**回退只需把第 5 行改回原文**（在本记录 §6 与 `git show HEAD:docs/ArcBlog-admin-ui-design.md` 都有逐字原文）。见 §9 第 1 条。

---

## 6. 声明未改动项（逐字节）

### 6.1 两个等价断言块（REQ-010 A5 的最重要一条）

```text
$ python3（提取两处以 `// 只针对内容列的等价断言` 开头的代码块，围栏剥离后比对）
marker_lines= [218, 501] identical=True
full_bytes=  857   full_sha256= 8f7e535963101a8530ca1574dac056784406cfa891a41975f8f87cae7986e1bd
inner_raw_bytes= 847   inner_raw_sha256= 4fb8e29bb72811a588472c953cc5f960dbb4dc9d935041105bf1879bf4db08d5
inner(eqBytes,rstrip)= 846   sha256= 3ff23301bad27627321198ade80539ba3a7f5a19c25350ae20d9ea3c63d2de6a
```

- `full_bytes=857` 与 `full_sha256=8f7e5359…` 与 **REQ-010 §1.3 的基线逐字符相同** → 断言块的**围栏与内容整体未动**。
- 两个块**逐字节 IDENTICAL** 保持不变。
- `inner_raw_bytes=847 / sha 4fb8e29b…` 正是 REQ-010 §1.3 里写的那颗 sha；`inner(eqBytes,rstrip)=846` 正是 round-9-reverify §3-E / 本 REQ 写的 846。**同一份基线里 846 与 4fb8e29b 属两个口径**（847 带尾换行 vs 846 去尾换行）——这是 REQ 基线的口径混用，不是本项造成的差异；详见 **§8 第 2 条**。

### 6.2 期望值与 §9 条目结构

```text
$ grep -c '期望 `0`\|期望 0' docs/ArcBlog-admin-ui-design.md     →  6     （改动前 = 改动后）
$ awk '/^## 9\. /,/^## 10\. /' docs/ArcBlog-admin-ui-design.md | grep -c '^□'   →  12
$ git diff -U0 -- docs/ArcBlog-admin-ui-design.md | grep -E '^[+-]□' | grep -v '^[+-]□ 布局'
   （无输出）→ 只有第 2 条被动过，且只加了限定语
```

- `total` 期望 `0`、`candidates ≥ 1` 门槛、`aup-app-header` / `data-active` / `isFormControl` / `linksPerColumn` / `pop()` / `overflowY` 等断言 token：**`git diff` 命中 0**（§7 A5 原始输出）。
- §9 十二条**一条不增不删、顺序不变**。

### 6.3 UI 归因改动清单（净结果）

```text
$ git diff --stat -- docs/ArcBlog-admin-ui-design.md
 docs/ArcBlog-admin-ui-design.md | 14 ++++++++------
 1 file changed, 8 insertions(+), 6 deletions(-)
```

- 7 处落笔 = 6 处行内替换（版本行 / §9:471 / 附录:532 / :562 / :581 / :583）+ 1 处新增行（附录 A.1 后置说明，第 560 行）。
- UI **未**编辑 `.aup/**`、`scripts/**`、`world/**`、`pages/**`、`.web/**`、`blocklet.yaml`、`dist/**`、`seed/**`、`agents/**`、spec、checklist、`arc-contracts.md`（`git diff` 里这些路径的改动全部归因 Dev `task-21` / PM）。

---

## 7. 验收命令与真实输出（REQ-010 A1–A7）

### A1 通用门（必过）

**先说明一件事**：本轮 UI 动笔期间，Dev（`task-21` / REQ-009）正在**同一工作区**并行写 `.aup/pages/ops/media.aup` + `.aup/locales/*.json`，共享树的门一度是**红**的（见 A1-b 的归因）。为了不把"别人的在飞状态"混进本项结论，UI 用 `git archive HEAD` 做了一份**只含本项 doc 改动**的隔离快照复跑全部门；随后共享树也回到全绿。

**A1-a 隔离快照 = `HEAD` + **仅**本项 doc 改动**（`/tmp/ui-iso`，只读 HEAD 归档，不写共享实例）：

```text
$ arc dsl validate --json
ok= True  issues= []

$ npm test
ℹ tests 28   ℹ pass 28   ℹ fail 0
TEST_EXIT=0

$ node scripts/arcblog-console-nav.mjs --check
{ "ok": true, "action": "check", "pages": 17 }
NAV_EXIT=0

$ arc dsl generate --check
Would generate 0 file(s) (dry-run) — nothing to change
GEN_EXIT=0
```

**A1-b 共享树（Dev 落盘 `arc dsl generate --write` 之后，同一套命令）**：

```text
$ arc dsl validate --json                                    →  ok= True  issues= []      VALIDATE_EXIT=0
$ npm test                                                   →  28/28 pass, exit 0
$ node scripts/arcblog-console-nav.mjs --check               →  ok:true, pages:17
$ arc dsl generate --check                                   →  Would generate 0 file(s) (dry-run) — nothing to change
```

**A1-c 归因证据（共享树曾红，与本项无关）**——为排除"是不是我改的"，做了两件事：

```text
# ① 红的原因指向 Dev 的在飞文件，不是 docs
$ arc dsl validate --json（当时）
issues= [ stale_generated_locale_json @ .aup/pages/ops/media.aup, stale_generated_locale_json @ .aup/pages/ops/media.aup ]

$ npm test（当时）
ℹ pass 27   ℹ fail 1
✖ no locale key is dead → AssertionError: arc dsl lint produced no JSON payload
$ arc dsl lint
ERROR: Failed DSL lint (1 changed)  changed: .aup/pages/ops/media.aup
  ERROR format_changed .aup/pages/ops/media.aup: File is not formatted. Run arc dsl format --write.

# ② 纯 HEAD 快照（git archive HEAD → /tmp/arcblog-head-check，不含任何 working-tree 改动）
$ arc dsl validate --json
ok= True   HEAD_VALIDATE_EXIT=0
```

→ 结论：`HEAD` 是绿的；那段时间的红完全来自 `task-21` 在飞的 `.aup` 改动（`media.aup` 未格式化 / 未重新生成 locale）。Dev 落盘后共享树复绿，A1-b 为准。**UI 零改实现**。

### A2 (a) §9 第 2 条

```text
$ grep -n '^□ 布局' docs/ArcBlog-admin-ui-design.md
471:□ 布局：宽高 100% 流式；页面固定无纵向滚动条，滚动只发生在 console-pane（本文档的概念名，实现里没有这个选择器）内（无双滚动条）

$ awk '/^## 9\. /,/^## 10\. /' docs/ArcBlog-admin-ui-design.md | grep -c '^□'                     →  12
$ awk '/^## 9\. /,/^## 10\. /' docs/ArcBlog-admin-ui-design.md | grep -c 'console-pane'           →  1
$ awk '/^## 9\. /,/^## 10\. /' docs/ArcBlog-admin-ui-design.md | grep '^□ 布局' | grep -c '概念名' →  1
$ git diff -U0 -- docs/ArcBlog-admin-ui-design.md | grep -E '^[+-]□' | grep -v '^[+-]□ 布局' \
  || echo "只有第 2 条被动过（且仅加限定语）"
只有第 2 条被动过（且仅加限定语）
```

### A3 (b) 附录 A.1

```text
$ grep -nE 'console-pane|console-shell' docs/ArcBlog-admin-ui-design.md
5    版本行（V1.5 变更描述）
155 / 156 / 157 / 160   §2.5 既有标注（R9，未动）
284                    §3.3 既有标注（R9，未动）
452                    §8 既有标注（R9，未动）
471                    ← (a) 已标注
536                    docs/reference/console-shell-layout.html（真实文件名，未动）
554 / 558              ← (b) CSS 与结构类比两行本身未改，由第 560 行的后置说明覆盖
560                    ← (b) 新增后置说明（概念名）
585                    ← (b) A.3 自检条目已标注

$ grep -rnE 'console-pane|console-shell' .aup/ scripts/ | wc -l     →  0      （实现事实不变）
$ grep -n 'console-shell-layout.html' docs/ArcBlog-admin-ui-design.md   →  536:（引用仍在）
$ wc -c docs/reference/console-shell-layout.html                   →  7990   （未删未改名）

# A3-C：A.1 的 CSS 骨架（现 538–556 行）与 HEAD 逐字节比对
$ diff <(git show HEAD:docs/ArcBlog-admin-ui-design.md | awk 'NR>=538 && NR<=556') \
       <(awk 'NR>=538 && NR<=556' docs/ArcBlog-admin-ui-design.md)
（无输出）→ OK: CSS 骨架逐字节未动

# A3 原命令的反直觉点（如实登记，见 §8 第 1 条）
$ diff <(git show HEAD:D | awk '/^# 附录 A/,/^### A\.2 /') <(awk '/^# 附录 A/,/^### A\.2 /' D) | … 
OK: A.1 只有概念名标注          ← 该命令的 awk 起始模式 `/^# 附录 A/` 与真实标题 `## 附录 A` 不匹配 → 两边都是空 → 恒 OK（空检查）
```

### A4 (c) 三处 §2.3

```text
$ grep -n '§2\.3' docs/ArcBlog-admin-ui-design.md
5:  （版本行变更描述里提到「§2.3 结构」）
532:§2.3 结构 + §2.5 滚动是标准，本附录是**喂给 AI 的原材料**。…
583:标准：docs/ArcBlog-admin-ui-design.md §2.3 结构 + §2.5 滚动 + 附录 A.1。
（:562 已不再出现 §2.3 → 现为 §2.5）

# §2.3 章节正文（现 95 行起 → ### 2.35 之前）与 HEAD 逐字节比对
$ diff <(git show HEAD:D | awk '/^### 2\.3 /,/^### 2\.35 /') <(awk '/^### 2\.3 /,/^### 2\.35 /' D)
（无输出）→ OK: §2.3 正文零改动

# hunk 行号不落在 §2.3（95–125）
$ git diff -U0 -- docs/ArcBlog-admin-ui-design.md | grep -E '^@@'
@@ -5 +5 @@          （版本行）
@@ -471 +471 @@      （§9 第 2 条）
@@ -532 +532 @@      （附录 A 前言）
@@ -559,0 +560,2 @@  （A.1 新增后置说明）
@@ -562 +564 @@      （A.1 三个错 第 1 条）
@@ -581 +583 @@      （A.3 模板）
@@ -583 +585 @@      （A.3 自检）
```

### A5 断言块与期望值逐字节不变

```text
$ python3 - <<'PY'   # REQ-010 A5 的脚本，逐字照跑
…
marker_lines= [218, 501] identical=True
full_bytes= 857 inner_bytes(eqBytes)= 855
full_sha256= 8f7e535963101a8530ca1574dac056784406cfa891a41975f8f87cae7986e1bd
```

⚠️ **注意**：REQ-010 A5 的脚本按字面跑会印 `inner_bytes(eqBytes)= 855`，与它自己写的期望 `846` 不符——**这是脚本的口径 bug（`full[1:-1]` 切的是字符不是围栏行），不是断言块变了**。同一份脚本里 `full_bytes=857` 与 `full_sha256=8f7e5359…` 与基线**完全一致**；用正确的围栏剥离口径重算：

```text
inner(eqBytes, 围栏剥离 + 去尾换行) = 846 字节   sha256= 3ff23301bad27627…
inner(raw, 围栏剥离 保留尾换行)     = 847 字节   sha256= 4fb8e29bb72811a5…   ← REQ-010 §1.3 写的那颗
两个块逐字节 IDENTICAL = True
```

详见 §8 第 2 条（REQ-010 §1.3 的基线与 A5 脚本需要修口径，否则 QA-005 会稳定假红）。

```text
$ awk '/^## 9\. /,/^## 10\. /' docs/ArcBlog-admin-ui-design.md | grep -c '^□'        →  12
$ grep -c '期望 `0`\|期望 0' docs/ArcBlog-admin-ui-design.md                          →  6
$ git diff -U0 -- docs/ArcBlog-admin-ui-design.md \
  | grep -E '^[+-].*(aup-app-header|data-active|isFormControl|candidates|linksPerColumn|total|overflowY|pop\(\))' \
  && echo "FAIL: 断言表达式被改动" || echo "OK: 断言表达式零改动"
OK: 断言表达式零改动
```

### A6 版本行 + 零副作用

```text
$ grep -n '文档版本' docs/ArcBlog-admin-ui-design.md | head -1     →  5:**文档版本：** V1.5（Round 10 …）
$ grep -c 'V1\.5' docs/ArcBlog-admin-ui-design.md                  →  1
$ grep -c 'V1\.4' docs/ArcBlog-admin-ui-design.md                  →  0
$ git diff --stat -- docs/ArcBlog-admin-ui-design.md
 docs/ArcBlog-admin-ui-design.md | 14 ++++++++------
 1 file changed, 8 insertions(+), 6 deletions(-)

$ git diff --name-only -- .aup scripts world pages blocklet.yaml .web seed agents
（非空，但逐条均为 Dev task-21 / PM 的在飞文件：）
  .aup/locales/en.json  .aup/locales/zh.json  .aup/pages/admin/pages.aup
  .aup/pages/admin/posts.aup  .aup/pages/ops/media.aup
```

### A7 负面用例 N1–N4

| # | 负面操作 | 期望 | 实际 |
| - | -------- | ---- | ---- |
| **N1** | 改 §9 十二条任一条的期望/判据文字 | 不得发生 | ✅ 未发生：`git diff` 除第 2 条限定语外 `^[+-]□` 行为空；`^□` = **12** |
| **N2** | 改断言块任一 token | 不得发生 | ✅ 未发生：`full_sha256=8f7e5359…` 与基线全等、两块 `identical=True`、A5 启发式 grep 命中 0 |
| **N3** | 「顺手」修 §2.3 正文或 `console-shell-layout.html` | 不得发生 | ✅ 未发生：§2.3 正文 `diff` 零差异；该 HTML 仍在（7990 字节） |
| **N4** | 顺手做像素级走查 / 一键复制（排队 #5 / #11） | 不得发生 | ✅ 未发生：UI 本轮产物只有本 `.md` + `UI-006-*.md` |

---

## 8. 检查脚本自身的两处口径缺陷（**发现，非本项改动**；需 PM / QA 裁决）

> 这两条不是"UI 做了什么"，而是 UI 在复跑 REQ-010 验收命令时发现的**检查不可用**问题。本项**不改** REQ-010（PM 写范围），只登记。

**8-1（A3）`awk '/^# 附录 A/,/^### A\.2 /'` 的起始模式匹配不到真实标题 → 该子检查恒为"OK"（空集）**

- 真实标题是 `## 附录 A：布局参考范本（给 AI 实现时的参照）`（**两个 `#`**）；`^# 附录 A` 要求第一个 `#` 后紧跟空格，永不匹配 → 两边都输出空 → `diff` 无输出 → 落进 `|| echo "OK: A.1 只有概念名标注"`。
- 后果：**A3 的"标注之外零改动"永远通过**，不能证明任何事。
- 修正建议：起始模式改 `^## 附录 A`；或直接把范围写成 `### A\.1 `→`### A\.2 `（真正要守的表面）。注意改成 `## 附录 A` 后，(c) 的 `:532` 行会落进该区间并在 token 过滤里现形——需把 (c) 的行显式排除，或把过滤条件加上 `§2\.` 白名单。

**8-2（A5）`inner=''.join(full[1:-1]).rstrip('\n')` 切的是**字符**不是围栏行；且 §1.3 基线的 846 与 sha 属两个口径**

- `full` 是**字符串**，`full[1:-1]` 去掉首尾各一个字符（首字符是 ``` ` ```，尾字符是换行），于是得到 **855** 字节而非 846；REQ 自己的期望写 846 → **逐字照跑必红**。
- 正确写法是切 `lines` 列表：`''.join(lines[s+1:e])`（= 847，带尾换行）或再加 `.rstrip('\n')`（= 846，即 QA 的 `eqBytes`）。
- 另外 REQ-010 §1.3 同一段里 `inner(bytes)=846（去围栏、去尾换行）` 配的 sha 是 `4fb8e29b…`，而那颗 sha 对应的是 **847 字节（带尾换行）**；846 字节的 sha 是 `3ff23301…`。两者都对（`full_sha256` 与基线全等），但**基线行必须二选一写清口径**，否则 QA-005 无法判定。
- 修正建议：把 A5 脚本改成 `inner=''.join(lines[s+1:e]).rstrip('\n')`，期望 `inner_bytes=846`、`inner_sha256=3ff23301bad27627321198ade80539ba3a7f5a19c25350ae20d9ea3c63d2de6a`，并保留 `full_bytes=857 / full_sha256=8f7e5359…` 作为整体护栏。
- **本项的结论不受影响**：`full_bytes/full_sha256` 与两块 `identical=True` 已足以证明断言块逐字节未动。

**8-3（A5 启发式 grep）`overflowY` 出现在断言块之外的正文里 → 假阳性**

- `:558` 的正文含 `style={overflowY: "auto"}`。只要有人触碰该行，A5 的第二条命令就会印 `FAIL: 断言表达式被改动`——而真正要守的 `overflowY` 只在两个 `js` 块内。
- 本项因此**选择不碰** `:558`（见 §3.1 的取舍表），于是该命令当前印 `OK`。
- 修正建议：把 grep 的输入限制在两个断言块的行区间内（用 A5 的 `bounds()` 算出来），而不是整份 `git diff`。

---

## 9. 未决问题（交接）

1. **版本行是否在 L-R10-1 授权内**：按 REQ-010 §1.2「既有惯例」升 V1.5（V1.3→V1.4 同款）。若 Lead 判定超出，回退 = 把第 5 行还原为 `git show HEAD:docs/ArcBlog-admin-ui-design.md` 的第 5 行；本记录 §6 已给逐字原文与全部复跑命令，回退后可原样重跑验收。
2. **`:554` / `:558` 用"后置说明"而不是行内标注**（§3.1）：因 A5 的启发式 grep 会对 `overflowY` 行假阳性。若 PM / QA 要求逐行内联，请**先**按 §8-3 修 A5 的 grep，再派一次小改。
3. **REQ-010 A3 / A5 的两处检查缺陷（§8）需 PM 修 REQ 脚本**，否则 QA-005 会：A3 永久空通过、A5 印 `855 ≠ 846` 假红。
4. **`dist/docs/ArcBlog-admin-ui-design.md`** 是 build 生成的镜像（Dev 本轮已 build，镜像已含 V1.5）；**不是** UI 手写，归因见 `git diff`。R7/R8 教训：build 必须晚于 PM/QA/UI 最后一次写盘——若 QA-005 之后还有人改 doc，需 Lead 再 build 一次。
5. **未跑**全量 `npm run test:live`（用户 2026-09-27 精简轮裁定）；**未跑** `arc dsl lint --fix`（会误删运行时寻址 id）；本项 docs-only、不写实例 → **不需要** `.gate-lock`、**未**启浏览器（REQ-010 无 DOM 断言要求）。
