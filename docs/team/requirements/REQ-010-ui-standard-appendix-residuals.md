# REQ-010 — UI 标准附录事实对齐（L-R10-1：§9 第 2 条条目文字 + 附录 A.1 概念名 + 附录三处 §2.3 交叉引用）

**元信息**：REQ-010 ｜ 对应 spec 章节：无（UI 标准自身；其上游是 §15.1/§15.2 控制台外壳与 `docs/arc-contracts.md` §21/§24/§25 平台实测）｜ 相关条目：`docs/ArcBlog-admin-ui-design.md` **§9 第 2 条**（现第 471 行）、**附录 A.1**（现 532 / 554 / 558 / 562 / 583 行）、**附录 A.3**（现 581 行）｜ 优先级：**🟥 本轮**（纯文档债 **P3**，不阻断任何实现）｜ 提出轮次：**Round 10**（R9 时记为 D12「留 R10 另行授权」→ Lead **L-R10-1** 授权）｜ 负责角色：**UI** ｜ 状态：**已派发（`task-22`）**；结果记录见 **§3.1**（轮末回填）

---

## 1. 背景

### 1.1 这批残留的来路（Round 9 已确认，未获授权故未动）

Round 9 的 REQ-007 只拿到 Lead **L-R9-1** 的四项临时授权（(a) §2.6/§9 末条断言限定视口 + 等价断言；(b) §2.5/§3.3 概念名标注；(c) §7 交叉引用改指 §2.5；(d) §2.6 重复的 RSS 行去重）。UI-004 §8 在交付时**如实登记了授权外残留**，Round 9 轮末由 Lead **D12** 裁定「本轮不做，留 R10 另行授权」：

| UI-004 编号 | 位置（V1.4 现行号） | 现状 | 与实现的事实冲突 |
| ----------- | ------------------- | ---- | ---------------- |
| **R1** | **§9 第 2 条（现 471 行）** | `□ 布局：宽高 100% 流式；页面固定无纵向滚动条，滚动只发生在 console-pane 内（无双滚动条）` —— 把 `console-pane` 当**实现名** | `.aup/ scripts/` 里**没有**这个选择器（命中 0），与 §2.5（155–157 行）/§3.3（284 行）已标注为「本文档的概念名」的口径**不一致** |
| **R2** | **附录 A.1（现 554 / 558 / 583 行）** | `:554` `.console-pane { grid-area: pane; … }`；`:558` `row console-shell ≈ .app-shell`、`view console-pane ≈ .console-pane`；`:583` 「滚动只发生在 console-pane」 | 这三处是**与框架无关的 CSS 骨架 / 提示词模板**里的类名（A.1 前言 `:532` 自己说「喂给 AI 的原材料」），但读者会误读成本仓库的实现名（与 U1 同类） |
| **R4** | **附录三处 `§2.3` 交叉引用（现 532 / 562 / 581 行）** | `:532` 「§2.3 是标准」；`:562` 「正好是 §2.3 禁止的双滚动条」；`:581` （A.3）「标准：… §2.3 + 附录 A.1」 | 双滚动条禁令与滚动归属的**实际口径在 §2.5**（§7 那一处已按 U2 改为 §2.5）；§2.3 是「控制台结构（一节一页）」（现第 95 行标题） |

> UI-004 §8 对 R2 的原始建议是「**保持现状**（CSS 范本的类名本来就允许自定）；若要加一句说明请另开授权」，对 R1 的原始建议是「改它即动 §9 条目口径，**需单独授权**」，对 R4 的建议是「下轮一并改指 §2.5 或明确『§2.3 结构 + §2.5 滚动』」。**L-R10-1 采纳了这三项，并限定为「只做事实对齐」。**

### 1.2 L-R10-1 的授权边界（本 REQ 的全部范围）

**授权 UI 修订 `docs/ArcBlog-admin-ui-design.md` 的以下三处（仅此三处）**：

| 项 | 授权内容 |
| -- | -------- |
| **(a)** | §9 第 2 条（现 **471** 行）条目文字里的 `console-pane` —— 按 §2.5/§2.1 的**既有范式**标注为「本文档的**概念名**，实现里没有这个选择器」 |
| **(b)** | 附录 **A.1** 的 `console-pane` / `console-shell`（现 **554 / 558 / 583** 行）—— 同范式标注（或加一句覆盖整节的**边界说明**） |
| **(c)** | 附录**三处** `§2.3` 交叉引用（现 **532 / 562 / 581** 行）—— 改指 **§2.5**，或写明「**§2.3 结构 + §2.5 滚动**」 |

**「只做事实对齐」的四条红线（违反即停手上报）**：

1. **不改任何期望值**：两个等价断言块里的 `total` 期望 `0`、`candidates ≥ 1` 门槛逐字节不变。
2. **不改 §9 条目口径与结构**：`^□` 十二条**一条不增不删**、顺序不变；除 (a) 处的概念名限定语外，条目文字语义不动。
3. **不动断言表达式**：§2.6 与 §9 的两个 `js` 代码块（原断言 + 等价断言）**一行不改**。
4. **不越界到别的内容**：不改 §2.3 结构章节正文、不改 §2.5/§2.6/§8 的既有结论、不改任何实测数字与结论段。

**版本行**：按既有惯例（R9 的 V1.3 → V1.4）升 **V1.5** 并在版本行写明三项。**若 Lead 认为版本行不在 L-R10-1 授权内 → 停手上报**，不自行判断。

### 1.3 已实测的基线（PM 2026-09-28，只读；UI 开工前可原样重跑）

```text
$ grep -n 'console-pane\|console-shell' docs/ArcBlog-admin-ui-design.md
155:宽度   100% 流式：console-pane（本文档的概念名，实现里没有这个选择器）…
156:高度   100% 锁定：console-shell（本文档的概念名，实现里没有这个选择器）…
157:滚动   单一归属：只有右侧 console-pane（本文档的概念名，实现里没有这个选择器）…
160:> 上一段代码块里的 `console-pane` / `console-shell` 与 §2.1 的 `console-scroll`、§8 的 `console-topbar` 同类：**都是本文档的概念名**…
284:**控制台精修取值**：… `console-pane`（本文档的概念名，实现里没有这个选择器，承载方式见 §8）…
452:| 全高流式布局 | … 实现里**没有** `console-shell` / `console-pane` / `console-scroll` 这些选择器——它们只是本文档的**概念名**（… 命中 0） |
471:□ 布局：宽高 100% 流式；页面固定无纵向滚动条，滚动只发生在 console-pane 内（无双滚动条）  ← (a) 未标注
554:.console-pane { grid-area: pane; overflow-y: auto; min-height: 0; }     /* 关键 2：唯一滚动条 */   ← (b)
558:AUP 落地时对应的是**结构而不是这段 CSS**：`row console-shell` ≈ `.app-shell`，`view console-nav` ≈ …   ← (b)
583:交付后自检：① 页面无纵向滚动条 ② 无横向滚动 ③ 滚动只发生在 console-pane                            ← (b)

$ grep -n '§2\.3' docs/ArcBlog-admin-ui-design.md
532:§2.3 是标准，本附录是**喂给 AI 的原材料**。…                                                    ← (c)
562:1. **漏 `min-height: 0`**——…「内容区滚不动，整页反而出现滚动条」，正好是 §2.3 禁止的双滚动条。  ← (c)
581:标准：docs/ArcBlog-admin-ui-design.md §2.3 + 附录 A.1。                                       ← (c)

$ grep -c '概念名' docs/ArcBlog-admin-ui-design.md
10
$ grep -rnE 'console-pane|console-shell' .aup/ | wc -l
0                                        # 实现里确实没有这些选择器（本 REQ 不改实现）
$ awk '/^## 9\. /,/^## 10\. /' docs/ArcBlog-admin-ui-design.md | grep -c '^□'
12                                       # §9 十二条
```

**两个等价断言块的字节基线（PM 实测，供逐字节比对）**

```text
$ python3（提取以 `// 只针对内容列的等价断言` 开头的两个 ```js 块）
marker_lines= [218, 501]
identical= True
bytes= 857                # 含 ```js / ``` 围栏行的整块
sha256= 8f7e535963101a8530ca1574dac056784406cfa891a41975f8f87cae7986e1bd
inner(bytes, 去围栏、去尾换行)= 846      # = round-9-reverify §3-E 的 `eqBytes:846`（QA 同一口径）
inner sha256= 4fb8e29bb72811a588472c953cc5f960dbb4dc9d935041105bf1879bf4db08d5
```

> 口径说明：`round-9-reverify.md` §3-E 与 §3 记录的是 **`eqBytes:846`**（两个块**逐字节 IDENTICAL**）；UI-004 §2.3 写的 `docBlockBytes:791` 是**字符**口径的另一种计法（backlog 🐞 区 6-1 已登记为无缺陷差异）。本 REQ 统一以 **846 字节（去围栏、去尾换行）** 为准。

---

## 2. 范围

### 2.1 做（三项，全部在 `docs/ArcBlog-admin-ui-design.md`）

| 项 | 位置 | 改动 | 必须保留 |
| -- | ---- | ---- | -------- |
| **(a)** | §9 第 2 条，现 **471** 行 | 给 `console-pane` 加概念名限定语，措辞与 §2.5（155–157）/§3.3（284）/§8（452）**同范式**，例如 `…滚动只发生在 console-pane（本文档的概念名，实现里没有这个选择器）内（无双滚动条）` | 条目编号与顺序、`^□` 总数 = **12**、条目判据本身（宽高 100% 流式 / 页面固定无纵向滚动条 / 无双滚动条）**语义不变**、后面第 481–482 行的「点击去向」条目不动 |
| **(b)** | 附录 A.1，现 **554 / 558 / 583** 行 | 同范式标注。`554` 是 CSS 类名（可加行内注释或后置说明）；`558` 的「`row console-shell` ≈ `.app-shell`，`view console-pane ≈ .console-pane`」要写明这是**结构类比、非仓库选择器**；`583` 的自检条目同样标注 | A.1 的 **CSS 骨架本身**（选择器名、属性、`min-height: 0` 等）**不改**；`:536` 的 `docs/reference/console-shell-layout.html` 是**真实存在的文件名**（UI-004 R3 已确认，7990 字节），**不得**当残留删除或改名；`:532` 的「喂给 AI 的原材料」定位不变 |
| **(c)** | 附录，现 **532 / 562 / 581** 行 | 三处 `§2.3` 指向改为 **§2.5**，或写成「§2.3 结构 + §2.5 滚动」的复合指向 | **不改 §2.3 章节本身**（标题在现第 **95** 行「### 2.3 控制台结构（一节一页，`?page=<name>`）」，正文约 95–125 行）；不改 `:562` 描述的缺陷机理（`min-height: 0`）与 `:581` A.3 的模板其余内容 |

### 2.2 明确不做

1. **不改任何期望值 / 断言表达式**：§2.6（200–206 行原断言、218–232 等价断言）与 §9（488–493 原断言、501–515 等价断言）的 `js` 代码块**一行不改**；`total` 期望 `0`、`candidates ≥ 1` 门槛、`aup-app-header` / `data-active` / 表单控件排除项**全部原样**。
2. **不改 §9 十二条的条目口径与结构**：不新增/删除条目、不改条目顺序、不把某条拆成两条；「期望值」与「执行前提（admin 会话、视口 1803×908）」段不动。
3. **不改 §2.3 结构章节**（95–125 行）、**不改 §2.5/§2.6/§8 的既有结论与实测数字**（155–160 / 182–238 / 452 等）。
4. **不新增未实测的断言或测量结论**（REQ-003 §2.2 第 6 条的口径继续遵守）：本项**不引入任何新数字**。
5. **不改实现**：不碰 `.aup/**`、`scripts/**`、`.web/**`、`world/**`、`pages/**`、`blocklet.yaml`、`dist/**`、`seed/**`（`dist/docs/**` 的镜像由 Lead 轮末 `arc blocklet build` 处理）。
6. **不改** `docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md`、`docs/arc-contracts.md`、`CLAUDE.md`、`.agents/skills/**`、`docs/team/**` 中非 design 的产物。
7. **不跑**全量 `npm run test:live`、**不跑** `arc dsl lint --fix`、**不 build**（纯 docs 改动）；**不需要** `.gate-lock`（不写实例、不启浏览器 —— 本项无 DOM 断言要求）。
8. **不顺手**做排队 #5（像素级视觉走查）与 #11（一键复制）：本周只做 L-R10-1 三项。

---

## 3. 验收标准

> 本项为**纯文档**改动，验收 = **静态复核 + 逐字节比对**；不要求浏览器、不写实例、不加 `.gate-lock`。**证据类型**只允许写「静态复核」；若 UI 额外跑了运行期复核，须单列并注明原始输出。

**A1 通用门（必过；纯 docs 改动的最小门）**

```bash
arc dsl validate --json        # "issues": []（docs 改动不应影响，但门照跑）
npm test                       # 快层 28/28 pass, exit 0（含 generate --check 漂移门）
git diff --name-only           # UI 名下只允许 docs/ArcBlog-admin-ui-design.md + docs/team/design/UI-006-*.md
git diff --name-only -- .aup scripts world blocklet.yaml .web seed   # 必须为空（UI 零改实现）
```

**A2 (a) §9 第 2 条：概念名已标注、条目口径与结构未动**

```bash
D=docs/ArcBlog-admin-ui-design.md
grep -n '^□ 布局' $D            # 有且仅有一行；该行含「概念名」限定语
awk '/^## 9\. /,/^## 10\. /' $D | grep -c '^□'                       # 12（未增删）
awk '/^## 9\. /,/^## 10\. /' $D | grep -c 'console-pane'             # 1（条目文字）
awk '/^## 9\. /,/^## 10\. /' $D | grep '^□ 布局' | grep -c '概念名'   # 1
git diff -U0 -- $D | grep -E '^[+-]□' | grep -v '^[+-]□ 布局' || echo "只有第 2 条被动过（且仅加限定语）"
```

- 期望：`^□` = **12**；被改的行**只有**第 2 条；改动内容**只是限定语**（`git diff` 该行前后两份并排贴进报告，语义对照写明「宽高 100% 流式 / 页面固定无纵向滚动条 / 无双滚动条」三点未变）。

**A3 (b) 附录 A.1：概念名已标注、CSS 骨架与文件引用未动**

```bash
grep -nE 'console-pane|console-shell' docs/ArcBlog-admin-ui-design.md
#   期望：471（(a) 已标注）、554/558/583（(b) 已标注）、155–160/284/452（既有标注，未动）
grep -rnE 'console-pane|console-shell' .aup/ scripts/ | wc -l        # 0（实现事实不变）
grep -n 'console-shell-layout.html' docs/ArcBlog-admin-ui-design.md  # 仍在（真实文件名，未删未改名）
wc -c docs/reference/console-shell-layout.html                       # 7990（UI-004 R3 实测值，文件仍在）
# A.1 的 CSS 骨架（`## 附录 A` → `### A.2`）与 HEAD 逐字节比对：
# ⚠️ R10 修订（PM 2026-09-28）：起始模式原写 `/^# 附录 A/`，**匹配不到**真实标题 `## 附录 A`
#    → 两版都得 0 行、该子检查恒空通过。已改为 `/^## 附录 A/`。
diff <(git show HEAD:docs/ArcBlog-admin-ui-design.md | awk '/^## 附录 A/,/^### A\.2 /') \
     <(awk '/^## 附录 A/,/^### A\.2 /' docs/ArcBlog-admin-ui-design.md) \
  | grep -Ev '^[<>-]?\s*$' | grep -E '^[<>]' | grep -vE 'console-(pane|shell)|概念名|选择器' \
  && echo "FAIL: A.1 有标注之外的改动" || echo "OK: A.1 只有概念名标注"
```

- 期望：A.1 三处出现点**都**带概念名标注（或该节有一句**覆盖全节**的边界说明，且逐处可对照）；`.aup/`/`scripts/` 命中仍为 **0**；`.console-pane`/`.app-shell` 等 CSS 骨架行**未被改写或删除**。

**A4 (c) 附录三处 §2.3 交叉引用：改指 §2.5（或复合口径）**

```bash
grep -n '§2\.3' docs/ArcBlog-admin-ui-design.md
#   期望：不再出现"把 §2.3 当滚动/双滚动条标准"的三处（532 / 562 / 581）；
#   若采用复合口径，则三处均显式写明「§2.3 结构 + §2.5 滚动」
# §2.3 章节正文（标题现第 95 行起，到 ### 2.35 之前）与 HEAD 逐字节比对：
diff <(git show HEAD:docs/ArcBlog-admin-ui-design.md | awk '/^### 2\.3 /,/^### 2\.35 /') \
     <(awk '/^### 2\.3 /,/^### 2\.35 /' docs/ArcBlog-admin-ui-design.md) \
  && echo "OK: §2.3 正文零改动" || echo "FAIL: §2.3 正文被改动"
```

- 期望：三处交叉引用**都**指向 §2.5（或复合口径），且 §2.3 章节（标题现第 95 行起）**正文零改动**。
- 复核方式（可复现）：`git diff -- docs/ArcBlog-admin-ui-design.md` 的 hunk header 行号范围**不得**落在 §2.3 章节（95–125 行区间）内。

**A5 断言块与期望值逐字节不变（本 REQ 最重要的一条）**

```bash
python3 - <<'PY'
import hashlib
lines=open('docs/ArcBlog-admin-ui-design.md',encoding='utf-8').read().splitlines(keepends=True)
idx=[k for k,l in enumerate(lines) if l.startswith('// 只针对内容列的等价断言')]
assert len(idx)==2, idx
def block(i):
    s=i
    while not lines[s].startswith('```'): s-=1
    e=next(k for k in range(i,len(lines)) if lines[k].strip()=='```')
    return ''.join(lines[s:e+1])
full=block(idx[0]); assert full==block(idx[1]), 'two blocks differ'
# ⚠️ R10 修订（PM 2026-09-28）：原写 `inner=''.join(full[1:-1])` 是【字符】切片（得 855 字符），
#    与基线 `eqBytes=846`（【行】口径：去首行 ```js 与末行 ```、去尾换行）不可比。已改为行口径。
flines=full.splitlines(keepends=True)
inner=''.join(flines[1:-1]).rstrip('\n')
print('marker_lines=',[i+1 for i in idx],'identical=True')
print('full_bytes=',len(full.encode()),'inner_bytes(eqBytes)=',len(inner.encode()))
print('full_sha256=',hashlib.sha256(full.encode()).hexdigest())
PY
# 期望（与 PM 基线一致）：
#   marker_lines= [218, 501]   identical=True
#   full_bytes= 857            inner_bytes(eqBytes)= 846
#   full_sha256= 8f7e535963101a8530ca1574dac056784406cfa891a41975f8f87cae7986e1bd
awk '/^## 9\. /,/^## 10\. /' docs/ArcBlog-admin-ui-design.md | grep -c '^□'      # 12
grep -c '期望 `0`\|期望 0' docs/ArcBlog-admin-ui-design.md                          # 与改动前一致（不改期望值）
git diff -U0 -- docs/ArcBlog-admin-ui-design.md \
  | grep -E '^[+-].*(aup-app-header|data-active|isFormControl|candidates|linksPerColumn|total|overflowY|pop\(\))' \
  && echo "FAIL: 断言表达式被改动" || echo "OK: 断言表达式零改动"
```

- 期望：`identical=True`、`inner_bytes = 846`、`full_sha256` 与基线**完全一致**、`^□` = 12、断言 token 的 `git diff` 命中 **0**。
- **若 `inner_bytes` 或 sha256 变化 → 本项直接判不通过**（说明动到了断言块，超出 L-R10-1）。

**A6 版本行（按惯例）与零副作用**

```bash
grep -n '文档版本' docs/ArcBlog-admin-ui-design.md | head -1        # V1.5，且三项都有描述
grep -c 'V1\.5' docs/ArcBlog-admin-ui-design.md                      # >= 1
git status --short                                                   # UI 名下：M docs/ArcBlog-admin-ui-design.md；?? docs/team/design/UI-006-*.md
git diff --stat -- docs/ArcBlog-admin-ui-design.md                   # 行数变化应与三项相符（不含断言块）
```

- 期望：版本行升 **V1.5** 且写明 (a)/(b)/(c) 三项；`docs/team/design/**` 只新增 UI-006 before/after 记录；**不出现** `.aup/**`、`scripts/**`、`dist/**` 的 UI 归因改动（Dev 的 `.aup`/`dist` 改动必须归因给 `task-21`，不得混同）。

**A7 负面用例（不少于 2 条）**

| # | 负面操作 | 期望 |
| - | -------- | ---- |
| N1 | 把 §9 十二条任意一条的期望/判据文字改动 | **不得发生**：`git diff` 中除第 2 条的限定语外，`^[+-]□` 行为空；`^□` 仍 12 |
| N2 | 改动两个等价断言块里的任一 token（如把 `total` 改掉、把 `>= 1` 放宽） | **不得发生**：A5 的 sha256 / 846 字节比对失败即判红 |
| N3 | 「顺手」修 §2.3 章节正文或 `docs/reference/console-shell-layout.html` | **不得发生**：`git diff` 的 hunk 不落在 §2.3（95–125 行）；该 HTML 文件未删未改名 |
| N4 | 顺手做像素级走查 / 一键复制（排队 #5 / #11） | **不得发生**：本轮 UI 产物只有该 `.md` + `UI-006-*.md` |

---

### 3.1 结果记录（轮末回填；UI / QA 各自写结论）

> **Round 10 结论（PM，2026-09-28 轮末）**：本 REQ **A1–A7 全部通过**，QA-005 独立复核判通过（[`test-reports/round-10.md`](../test-reports/round-10.md) §2-REQ-010 / §3-F / §9）。**证据类型 = 静态复核 + 逐字节比对**（本项无 DOM 断言要求，未开浏览器、未加锁、未 build）。**唯一悬留项**：版本行 **V1.5** 是否在 **L-R10-1** 授权内，UI 已按 §1.2 显式上报待确认 → **由 Lead 一句话裁决**（PM 建议保留：只改第 5 行、未触断言块与期望值，符合 V1.3→V1.4 既有惯例；QA 亦判非缺陷）。

**PM 在本轮内执行的检查脚本修订（QA round-10 §7-2 登记的两处缺陷；均为文档脚本缺陷，不影响本轮结论）**

| # | 缺陷 | 修订 |
| - | ---- | ---- |
| 1 | A3 的 awk 起始模式 `/^# 附录 A/` **匹配不到**真实标题 `## 附录 A` → 两版都得 0 行、**该子检查恒空通过** | 已改为 `/^## 附录 A/`（A3 代码块内两处 + 注释）；QA 用修正模式重跑得 3 处差异（授权项 (c) 两处 + 新增节级边界说明），CSS 骨架零改动 |
| 2 | A5 的 `inner=''.join(full[1:-1])` 是**字符**切片（得 `855`），与基线 `846`（**行**口径：去 ```` ```js ```` / ```` ``` ```` 围栏、去尾换行）不可比 | 已改为行口径 `''.join(full.splitlines(keepends=True)[1:-1]).rstrip('\n')`；QA 按行口径复算得 `inner_bytes(eqBytes)=846`、`full_sha256` 与 PM 基线一致 |

| 验收项 | 结论 | 证据 |
| ------ | ---- | ---- |
| A1 通用门 + 写范围 | **通过**（静态复核） | `arc dsl validate --json` `issues: []`；`npm test` 28/28；UI 名下只有 `docs/ArcBlog-admin-ui-design.md`（`8 insertions / 6 deletions`）+ 新增 `docs/team/design/UI-006-appendix-residuals.md`（round-10.md §3-A / §3-F5） |
| A2 (a) §9 第 2 条 | **通过**（静态复核） | `:471` 加「（本文档的概念名，实现里没有这个选择器）」；`^□` = **12**；§9 内 `console-pane` 命中 1；`git diff -U0 \| grep '^[+-]□'` 除 `□ 布局` 外为空（§3-F1） |
| A3 (b) 附录 A.1 | **通过**（静态复核） | `:560` 新增一条**覆盖全节**的边界说明（覆盖 `:554` CSS 类名 / `:558` 结构类比，并声明 A.3 自检条目同此口径 → 覆盖 `:583`）；CSS 骨架与 `:536` 的真实文件引用**逐字节未动**；`.aup/`/`scripts/` 命中仍 **0**；`docs/reference/console-shell-layout.html` 仍 7990 字节（§3-F2） |
| A4 (c) 附录三处 §2.3 | **通过**（静态复核） | `:532` 与 `:583` → 「§2.3 结构 + §2.5 滚动」复合口径；`:562` 双滚动条直指 §2.5；`### 2.3 `→`### 2.35 ` 区间与 HEAD **逐字节零差异**（§3-F3） |
| A5 断言块逐字节不变 | **通过（本 REQ 最重要的一条）**（静态复核） | `marker_lines=[218,501]`、两块 `identical=True`、`full_bytes=857`、`full_sha256=8f7e535963101a8530ca1574dac056784406cfa891a41975f8f87cae7986e1bd` **与 PM 基线完全一致**；行口径 `eqBytes=846`；`^□`=12；断言 token `git diff` 命中 0（§3-F4） |
| A6 版本行 + 零副作用 | **通过**（静态复核） | 第 5 行 `V1.5`，一项一行写明 (a)(b)(c)；`grep -c 'V1\.5'` = 1；`docs/team/design/**` 只新增 `UI-006-*.md`；无 `.aup/**`/`scripts/**`/`dist/**` 的 **UI 归因**改动（§3-F5）｜**V1.5 保留与否待 Lead 一句话** |
| A7 负面用例 N1–N4 | **通过**（静态复核） | N1（改其它 `□` 条）→ 空；N2（动断言 token）→ sha256 一致；N3（动 §2.3 正文/参考 HTML）→ 零改动；N4（顺手做 #5/#11）→ 未发生（§4-N4–N7） |

---

## 4. 依赖

- **前置授权（已解除）**：Lead **L-R10-1**（2026-09-27）授权三项；R9 的 **D12** 就是「留 R10 另行授权」，故本 REQ 现在可开工。**UI 对 `docs/ArcBlog-admin-ui-design.md` 的写权限来自 L-R10-1**（角色卡默认写范围是 `docs/team/design/**` + `.web/**` + `logo.svg` + `share-cards.md` 外观章节）。
- **上游产物**：[`design/UI-004-ui-standard-assertion-and-residuals.md`](../design/UI-004-ui-standard-assertion-and-residuals.md) **§8**（R1/R2/R3/R4 原始登记与建议）、[`design/UI-005-bug014-measurement-note.md`](../design/UI-005-bug014-measurement-note.md)、[`requirements/REQ-007-ui-standard-assertion-and-residuals.md`](REQ-007-ui-standard-assertion-and-residuals.md)（§2.2 第 1/9 条与四项授权边界）、[`test-reports/round-9-reverify.md`](../test-reports/round-9-reverify.md) §3-E（`eqBytes:846`、断言块 IDENTICAL）、[`bugs/BUG-011`](../bugs/BUG-011-console-link-assertion-viewport-sensitive.md) / [`BUG-014`](../bugs/BUG-014-ui-standard-header-filter-negative-case-stale.md)（这两个缺陷**已闭环**，本 REQ 只处理它们留下的**授权外残留**）。
- **下游（复验）**：**QA-005（`task-23`）** 独立重跑 A2–A5（尤其 A5 的逐字节比对与 `^□` = 12），报告落 `docs/team/test-reports/round-10.md`。
- **串行约束**：与 REQ-009（Dev，`.aup/**`）**写范围不重叠 → 可并行**；QA 两次复验在**同一次 admin 会话**内串行执行（`task-23 blocked_by task-21 + task-22`）。
- **外部条件**：**无**（纯文档；不需要浏览器、实例、`.gate-lock`）。

---

## 5. 涉及写范围

| 路径前缀 | 用途 | 归属 |
| -- | -- | -- |
| `docs/ArcBlog-admin-ui-design.md` | 三项事实对齐（§9 第 2 条 / 附录 A.1 / 附录三处 §2.3）+ 版本行 V1.5 | UI（**仅 L-R10-1 授权**） |
| `docs/team/design/UI-006-*.md` | before/after 记录（逐项 diff + A5 原始输出） | UI |
| `docs/team/test-reports/**`、`docs/team/bugs/**` | QA-005 复验 | QA |
| `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 看板 / 本 REQ / 轮次日志 | PM |
| `.aup/**`、`scripts/**`、`world/**`、`pages/**`、`.web/**`、`blocklet.yaml`、`dist/**`、`seed/**`、`agents/**` | **本 REQ 一律不改**（越界即停手上报） | 越界即停 |
| `docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md`、`docs/arc-contracts.md`、`CLAUDE.md`、`.agents/skills/**` | **本 REQ 一律不改** | 人类 / Lead |

**边界**：本项**只做事实对齐**——不改任何期望值、不改 §9 条目口径与结构、不动断言表达式、不新增未实测结论。**超出 L-R10-1 三项 = 停手上报**（`roles/pm.md` §6.1 / `roles/ui.md` 的停手上报约定）。
