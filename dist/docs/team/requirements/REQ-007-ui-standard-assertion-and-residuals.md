# REQ-007 — `docs/ArcBlog-admin-ui-design.md` 断言视口限定 + 残留文档债 U1–U3

**元信息**：REQ-007 ｜ 对应 spec 章节：**§15.1 后台信息架构 / §15.2 控制台外壳**（本项操作对象是界面标准 `docs/ArcBlog-admin-ui-design.md` 自身，其 §9 是被逐轮引用的页面验收清单）｜ checklist 行：D 组「控制台外壳（左菜单 + 右内容）」§15.2 —— 本项**不改清单状态列**（纯文档事实对齐 + 断言可执行性）｜ 优先级：**P3（BUG-011）＋ P3×3（U1–U3 文档债）** ｜ 提出轮次：**Round 9** ｜ 负责角色：**UI** ｜ 状态：**已交付并验收（`task-13`，Round 9）** —— **A1–A7 全部通过**（A7 为如实标注项）；写范围由 Lead L-R9-1 临时扩展授权，仅限四项；结果记录见 **§3.1**；**唯一新增缺陷 BUG-014（P3，文档事实漂移，裁定下轮修）**；Round 9 整体**未放行**（QA `VERDICT=fail`，阻断项为范围外 P1 **BUG-012**，与本 REQ 交付无关）

---

## 1. 背景

### 1.1 BUG-011（P3，Round 8 QA 新增 → PM 裁决「本轮修（R9）」）

- 缺陷文件：[`bugs/BUG-011-console-link-assertion-viewport-sensitive.md`](../bugs/BUG-011-console-link-assertion-viewport-sensitive.md)。
- QA 实测（原始 JSON 见 BUG-011「实际」）：**同一条断言、同一个页面，只改视口 → 两个不同结果**：
  ```text
  ### ?page=compose @1803x908 ###  { "containers":1, "withExclusion":0, "withoutExclusion":2 }
      # containers=1 就是那个包含 .aup-app-header 的整壳容器 → filtered=[] → count([])=0（空洞通过：
      # .pop()?.… ?? 0 的兜底给出 0，并未真的检查过内容列）
  ### ?page=compose @1512x765 ###  { "containers":2, "withExclusion":1, "withoutExclusion":1 }
      # .pop() 取到 i=1（侧栏页脚「关于」链接所在容器）→ 同一断言给 1，而不是文档期望的 0
  ### 对照 ?page=posts / ?page=tags @1803x908 ###  { "withExclusion":0 }
  ```
- 判据：文档写「在**任一**控制台页面执行」该断言、期望 `0`；而 REQ-005 §2.2 第 1 条**未授权**改这两个断言块 → 必须单开授权批次（本轮即 L-R9-1）。
- 后果：同一页面、同一断言、换视口给不同结论，会让下一轮实现者把 `1` 误判成**回归**；且 1803×908 下 compose 的 `0` **证明力为零**（空候选集合兜底）。
- **同源耦合**：[BUG-010](../bugs/BUG-010-compose-appearance-missing-content-scroll-container.md)（`compose` / `appearance` 内容列缺滚动容器）是 BUG-011 的 1512 复现路径来源——BUG-010 由 **REQ-006 / `task-12`** 修复，**排批首**。BUG-010 修好后该路径改变，**不是回归**；本 REQ 的文档改写与 QA-004 的复跑都必须按**新结构**判定（**不得**把旧 `1512 → 1` 写成永久事实）。

### 1.2 U1–U3（UI-003 §5 未授权项 → PM 裁决「本轮修（R9）」）

出处：[`design/UI-003-ui-standard-residuals.md`](../design/UI-003-ui-standard-residuals.md) §5；原裁决见 [`backlog.md`](../backlog.md) 🐞 区「同源但未单独开 BUG 的观察」U1/U2/U3。

| # | 位置 | 现状 | 目标 |
| - | ---- | ---- | ---- |
| **U1** | §2.5 代码块（现第 155–157 行）与 §3.3 第 254 行 | 把 `console-pane` / `console-shell` **当实现名** | 按 §8 第 422 行的既有范式**标注为「概念名」**（`.aup/` 命中 0） |
| **U2** | §7 交叉引用（授权书写「第 401 行」，实测现为**第 408 行**） | 「桌面为『页面固定 + 内容区内滚动』（**§2.3**）」——该口径在 **§2.5** | 交叉引用改指 **§2.5** |
| **U3** | §2.6 表格（现第 **189 / 190** 行） | 「**非 HTML 资源**：RSS / `llms.txt`」两行内容重复（措辞微差） | 删掉重复行（纯编辑） |

### 1.3 Lead 授权（L-R9-1，2026-09-27，Round 9 生效）

> 授权 UI 本轮修订 `docs/ArcBlog-admin-ui-design.md`，**仅限**四项：**(a)** BUG-011——把 §2.6 / §9 末条断言**限定视口**并补**只针对内容列**的等价断言，**不得放宽期望值 `0`、不得改 §9 其余条目口径**；**(b)** U1→按 §8 做法标注**概念名**；**(c)** U2→交叉引用改指 **§2.5**；**(d)** U3→§2.6 第 189/190 行 RSS 行去重。**超出此四项的标准口径修改必须停手上报。**

关联授权（同轮，Lead）：**L-R9-4（= D8）** 像素级视觉走查（排队 #6）**本轮不做**，留在队列——不在本 REQ 范围。

### 1.4 开工前实测基线（PM 只读，2026-09-27，文档 **V1.3**，531 行，工作区 `git status --short` 仅有 2 个与本轮无关的未跟踪文件）

```text
$ grep -n 'console-pane\|console-shell' docs/ArcBlog-admin-ui-design.md
155:宽度   100% 流式：console-pane flex: 1 随视口伸缩，无固定页宽，无横向滚动          ← §2.5 代码块（U1-a）
156:高度   100% 锁定：console-shell 撑满视口剩余高度，页面不出现纵向滚动条            ← §2.5 代码块（U1-a）
157:滚动   单一归属：只有右侧 console-pane 内部纵向滚动（overflow-y: auto）           ← §2.5 代码块（U1-a）
254:…内容区滚动间隔 gap=sm(10px)、`console-pane` 上下 padding: 14px…                 ← §3.3（U1-b）
441:□ 布局：…滚动只发生在 console-pane 内（无双滚动条）                              ← §9 第 2 条（**不在 L-R9-1 授权内**）
500/504/529:.console-pane { grid-area: pane; … } / 附录 A.1 的 CSS 骨架注释        ← 附录 A.1（**不在 L-R9-1 授权内**）

$ grep -c '非 HTML 资源' docs/ArcBlog-admin-ui-design.md
3                                    # 189 / 190（重复对）+ 451（§9 条目）

$ grep -n '（§2.3）' docs/ArcBlog-admin-ui-design.md
408:* 滚动归属随断点切换：桌面为"页面固定 + 内容区内滚动"（§2.3）；…     # 唯一命中

$ grep -n '内容区滚动容器内的无 target 链接数' docs/ArcBlog-admin-ui-design.md
199:…                                            # §2.6 末条断言块
458:…                                            # §9 末条断言块
$ grep -c '1803×908' docs/ArcBlog-admin-ui-design.md
3                                    # 186（§2.6 另一行）/ 207（§2.6 实测段）/ 466（§9 实测段）
$ awk '/^## 9\. /,/^## 10\. /' docs/ArcBlog-admin-ui-design.md | grep -c '^□'
12                                   # §9 十二条验收条目（本轮不得增删）
```

---

## 2. 范围

### 2.1 做

| 组 | 条目 | 内容 |
| -- | ---- | ---- |
| (a) BUG-011 | **§2.6 末条断言 + §9 末条断言** | ① 把断言的**执行条件限定视口**（写成「admin 会话、视口 1803×908」这类**可执行的前提**，并说明为何另一视口下 `.pop()` 会选到别的容器）；② **补一条只针对内容列的等价断言**——定位必须排除框架顶栏（`.aup-app-header`）**与侧栏当前项**（`[data-active="true"]`），并**要求候选容器数 ≥1**（禁止 `.pop()?.… ?? 0` 那种「空集合兜底为 0」的空洞通过）；③ **期望值 `0` 不放宽**（两条断言的判定都仍是「过滤后必须为 `0`」）。 |
| (b) U1 | **§2.5 代码块（现 155–157 行）+ §3.3（现 254 行）** | 把 `console-pane` / `console-shell` 按 §8 第 422 行的做法标注为**本文档的概念名**（实现里没有这些选择器；真正承载是 `.aup/wrapper.aup` 的 `view mode=shell` 顶栏 + 内容列 `view size={flex: 1} style={overflowY: auto}`）。**句子含义与标准口径不变**，只加限定语。 |
| (c) U2 | **§7（现第 408 行）** | 交叉引用 `（§2.3）` → `（§2.5）`（该口径确实在 §2.5「全高流式布局与滚动归属」；§2.3 是控制台结构）。 |
| (d) U3 | **§2.6 表格（现 189 / 190 行）** | 删除重复行之一；保留与实现事实一致的那条（`非 HTML 资源` → 新标签页；分发节 RSS/文章索引均 `target="_blank"`）。 |

### 2.2 明确不做（超出 L-R9-1 四项即**停手上报**）

1. **不改 §9 十二条验收条目本身**（现 `^□` 计数 **12**）——只改 §9 **末条断言块**；条目文字逐条保留。
2. **不放宽任何期望值**：两处断言的 `0` 保持；**不得**把「过滤后必须为 `0`」改成「≤N」或「视情况」。
3. **不改 §9 其余条目口径**、不改 §4.1 双编码要求（R8 的原句逐字保留）、不改 §2.1 / §8 已对齐的内容。
4. **不碰 L-R9-1 未授权的 `console-pane` 出现处**：§9 第 441 行（条目文字）与附录 A.1 的 CSS 骨架（现第 500 / 504 / 529 行）**本轮不改**——它们要么属 §9 条目口径（禁止项 1），要么是参考 CSS 的类名。**回报里必须如实列出这三类残留**（见 §3 A7）。
5. **不改实现**：`.aup/**`、`scripts/**`、`world/**`、`pages/**`、`blocklet.yaml`、`dist/**`、`seed/**` 一律不写（BUG-010 由 REQ-006 / Dev 处理）。**UI 零改实现**是本 REQ 的验收项（§3 A6）。
6. **不改** spec、checklist 状态列、`CLAUDE.md`、`docs/arc-contracts.md`、`.agents/skills/**`、`docs/team/bugs/**`、`docs/team/test-reports/**`（分别属 Lead / QA 写范围）。
7. **不做**像素级视觉走查（排队 #6；**L-R9-4 = D8：本轮不做**）。
8. **不跑**全量 `npm run test:live`；**不跑** `npm run test:live -- --update` 类动作；**不跑** `arc dsl lint --fix`。
9. **不新增**未实测的数字/断言（REQ-003/005 既有教训）；引用运行期数字必须注明「谁的实测、什么视口、何时」，并链到带原始输出的 BUG/报告。

---

## 3. 验收标准

> 本项是 **docs-only**（唯一被跟踪的改动 = `docs/ArcBlog-admin-ui-design.md` + `docs/team/design/**`）→ **不需要** `arc blocklet build`；**不需要** `.gate-lock`（不写实例）。
> 静态定位命令一律用 `awk` 锚定小节，**不依赖行号**（文档自 R7 起行号已多次漂移——U2 的授权书写「第 401 行」、实测已是 **408** 行，即是教训）。

**A1 通用门（必过；docs-only 也过快层）**
```bash
arc dsl validate --json                          # "issues": []
npm test                                         # 28/28 pass, exit 0（快层，~1s，不写实例）
node scripts/arcblog-console-nav.mjs --check     # {"ok":true,"action":"check","pages":17}
arc dsl generate --check                         # 无漂移（本项不改 .aup，应仍无漂移）
```

**A2 (a) BUG-011 —— 断言限定视口 + 只针对内容列的等价断言（期望值 `0` 不放宽）**

静态定位（两处断言块的**执行条件句**必须带视口限定）：
```bash
D=docs/ArcBlog-admin-ui-design.md

# 1) 执行条件句必须写明视口（两处；命中行不含「1803×908」或「视口」即不合格）
grep -nE '执行下面的断言|末条的可执行断言' $D | grep -vE '1803×908|视口' && echo "FAIL: 缺视口限定" || echo "OK: 两处均带视口限定"

# 2) 两处断言块仍在（注释锚点，不得删断言）
grep -c '内容区滚动容器内的无 target 链接数' $D          # 期望 2

# 3) 只针对内容列的等价断言：必须排除框架顶栏 + 侧栏当前项，
#    并且必须有「候选容器数 ≥1」的门槛（否则又是空集合兜底出 0 的空洞通过）
awk '/^### 2\.6 /,/^## 3\. /' $D | grep -c "aup-app-header"      # 期望 ≥1
awk '/^### 2\.6 /,/^## 3\. /' $D | grep -c 'data-active'        # 期望 ≥1（侧栏当前项）
awk '/^### 2\.6 /,/^## 3\. /' $D | grep -cE 'candidates'        # 期望 ≥1
awk '/^### 2\.6 /,/^## 3\. /' $D | grep -cE '>= *1|≥ *1'        # 期望 ≥1（候选数门槛）
awk '/^## 9\. /,/^## 10\. /' $D | grep -c "aup-app-header"      # 期望 ≥1
awk '/^## 9\. /,/^## 10\. /' $D | grep -c 'data-active'        # 期望 ≥1
awk '/^## 9\. /,/^## 10\. /' $D | grep -cE 'candidates'        # 期望 ≥1
awk '/^## 9\. /,/^## 10\. /' $D | grep -cE '>= *1|≥ *1'        # 期望 ≥1（候选数门槛）

# 4) §9 十二条条目未被改动（不得增删）
awk '/^## 9\. /,/^## 10\. /' $D | grep -c '^□'                 # 期望 12
```
> **原断言块可以保留**（`pop()?.… ?? 0` 的写法属 V1.3 原文，L-R9-1 只授权「限定视口 + 补等价断言」，未要求删改原断言）——但**新补的等价断言不得复用该兜底写法**，必须自证「候选容器存在」。若 UI 选择同时加固原断言（例如把 `?? 0` 换成显式 `candidates >= 1` 门槛），也**不得**放宽期望值。
**推荐的等价断言表达式**（UI 可采用本式原文，即上列锚点全部满足；也可自定措辞，但必须保留「排除顶栏 + 排除侧栏当前项 + 候选数 ≥1 + 期望 0」四个语义）：
```js
// 只针对内容列的等价断言 —— 期望 0；候选容器数必须 ≥1，不得用空集合兜底
(() => {
  const header = document.querySelector('.aup-app-header');
  const activeNav = document.querySelector('[data-active="true"]');
  const contentColumns = [...document.querySelectorAll('*')].filter(el =>
    el.scrollHeight > el.clientHeight + 2 &&
    /auto|scroll/.test(getComputedStyle(el).overflowY) &&
    !(header && el.contains(header)) &&
    !(activeNav && el.contains(activeNav)));
  return {
    candidates: contentColumns.length,       // 必须 ≥ 1（否则结论无意义）
    linksPerColumn: contentColumns.map(el => el.querySelectorAll('a:not([target])').length),
    total: contentColumns.reduce((n, el) => n + el.querySelectorAll('a:not([target])').length, 0), // 期望 0
  };
})()
```

运行期两视口复跑（**执行人 = QA-004 / `task-14`**，并入 L-R9-3 的同一次 admin 会话；UI 若自备浏览器会话可自跑，但必须在记录里写明身份来源）：
```bash
# 复用 Round 8 的 CDP 探针（/tmp/qa-cdp2.mjs 等，未入库）或等价脚本；两视口 × 两页
QA_VW=1803 QA_VH=908 node /tmp/qa-cdp2.mjs 'http://arcblog.localhost:4939/?page=compose&locale=en' /tmp/r9-a2-links.js
QA_VW=1512 QA_VH=765 node /tmp/qa-cdp2.mjs 'http://arcblog.localhost:4939/?page=compose&locale=en' /tmp/r9-a2-links.js
QA_VW=1803 QA_VH=908 node /tmp/qa-cdp2.mjs 'http://arcblog.localhost:4939/?page=posts&locale=en'   /tmp/r9-a2-links.js
QA_VW=1512 QA_VH=765 node /tmp/qa-cdp2.mjs 'http://arcblog.localhost:4939/?page=posts&locale=en'   /tmp/r9-a2-links.js
```
- 期望：**两视口**下内容列等价断言 `total === 0` 且 `candidates >= 1`（compose 与 posts 都成立）；报告必须附**原始 JSON**（不是结论复述）。
- **时序前提**：该复跑必须在 **REQ-006 / `task-12` 完成之后**（BUG-010 修好会改变 compose 的容器结构）。把旧「1512×765 → 1」当成新结构下的期望值 = 误判。
- 负面用例（至少 1 条）：在 §2.6/§9 的**原断言**上删掉 `.aup-app-header` 过滤后，`?page=compose` 应 > 0（证明过滤项不是可选的）——与 §2.4 的既有表述一致即可。

**A3 (b) U1 —— `console-pane` / `console-shell` 在 §2.5 / §3.3 被标注为概念名**
```bash
D=docs/ArcBlog-admin-ui-design.md
# §2.5 与 §3.3 内不再有「未标注的」实现名（每处命中行都要出现「概念名」或等价限定）
awk '/^### 2\.5 /,/^### 2\.6 /' $D | grep -nE 'console-pane|console-shell' | grep -v '概念名' && echo "FAIL(§2.5)" || echo "OK(§2.5)"
awk '/^### 3\.3 /,/^### 3\.4 /' $D | grep -nE 'console-pane|console-shell' | grep -v '概念名' && echo "FAIL(§3.3)" || echo "OK(§3.3)"
# 实现事实不变：.aup/ 命中 0（改的是文档，不是实现）
grep -rnE 'console-pane|console-shell' .aup/ | wc -l        # 期望 0
```
- 期望：§2.5 代码块的三行（现 155/156/157）与 §3.3 第 254 行都带概念名限定；**`.aup/` 仍然 0 命中**（UI 不改实现）。
- 授权外残留必须如实列出：§9 第 441 行、附录 A.1（现 500/504/529）——**不改**，在 `docs/team/design/UI-004-*.md` 与回报里登记（见 A7）。

**A4 (c) U2 —— §7 交叉引用改指 §2.5**
```bash
D=docs/ArcBlog-admin-ui-design.md
grep -n '（§2\.3）' $D                       # 期望：无输出（exit 1）
grep -n '（§2\.5）' $D                       # 期望：原第 408 行那处现在指 §2.5（唯一新增/修改处）
sed -n '405,412p' $D                         # 人工核对：该条只剩一个交叉引用且指向 §2.5
```

**A5 (d) U3 —— §2.6 RSS 行去重**
```bash
D=docs/ArcBlog-admin-ui-design.md
grep -c '非 HTML 资源' $D                   # 3 → 期望 2（189/190 只留 1 行 + 451 的 §9 条目不动）
awk '/^### 2\.6 /,/^## 3\. /' $D | grep -c '非 HTML 资源'    # 2 → 期望 1
awk '/^## 9\. /,/^## 10\. /' $D | grep -c '非 HTML 资源'      # 期望 1（§9 条目未动）
```

**A6 零副作用 / 写范围**
```bash
git status --short
# 期望：UI 名下只有 M docs/ArcBlog-admin-ui-design.md + ??/M docs/team/design/UI-004-*.md
git diff --name-only | grep -E '^\.aup/|^scripts/|^world/|^pages/|^blocklet\.yaml|^dist/|^seed/|^\.web/' || echo "no implementation files touched"
git diff --name-only | grep -E 'ArcBlog-product-technical-spec|ArcBlog-feature-checklist|CLAUDE\.md|arc-contracts\.md' || echo "no lead-only docs touched"
# 版本号应递进（V1.3 → V1.4），并在版本行写明本轮四项改动 + 指向 UI-004 记录
grep -n '文档版本' docs/ArcBlog-admin-ui-design.md
```
- 期望：**未改任何实现文件**；`docs/team/design/UI-004-*.md`（before/after + 证据，命名沿用 UI-002/UI-003 序列）已落盘；版本号递进。

**A7 受限项（如实标注，不得推断为通过）**
- **UI 未跑浏览器**（除非自备会话）：BUG-011 的原始数字（1803 → `0` 空洞 / 1512 → `1`）**引用 QA round-8 的原始输出**；本轮的**两视口独立复跑由 QA-004 执行**（A2）。不得把 QA 的数字写成「UI 实测」。
- **授权外残留（必须回报，不得默默改）**：§9 第 441 行 `console-pane`（§9 条目口径，禁改）、附录 A.1 CSS 骨架（现 500/504/529，参考 CSS 类名，未授权）——**本轮保留**，登记在 UI-004 §未对齐项 并请 Lead/PM 决定是否另开一轮。
- **不跑全量 live**（用户 2026-09-27 裁定）；**docs-only，未 build**——`dist/docs/**` 的镜像同步由 **Lead 轮末** `arc blocklet build` 处理（R7/R8 同款教训：build 必须晚于 PM/QA/UI 的最后一次写盘）。

### 3.1 Round 9 结果记录（PM，2026-09-28）

**交付事实（QA 独立复跑，报告 [`test-reports/round-9.md`](../test-reports/round-9.md) §2.2 / §3-C）**

| 验收项 | 结论 | 证据（三类分开） |
| ------ | ---- | ---------------- |
| **A1 通用门** | **通过** | **静态复核**：validate issues `[]`；`npm test` 28/28；`console-nav --check` `pages:17`；`generate --check` 无漂移 |
| **A2 (a) BUG-011** | **通过（静态 + 运行期）** | **静态复核**：两处断言块锚点 `grep -c` = **2**；两处均带「执行前提：admin 会话、视口 1803×908」；§2.6/§9 等价断言块**逐字相同**（QA 自建 extract 脚本，791 字符 / 847 字节）；`^□` = **12**（§9 十二条未动）；期望值 `0` 未放宽。**浏览器实测**：**17 页 × 2 视口 = 34/34** 全部 `{candidates:1, total:0}`（UI 自跑 5 页 × 2 视口，QA 扩到全量）；原断言仍单独作为反例（`?page=appearance @1512×765 → 1`），文档已明示「原断言不得单独作为验收依据」 |
| **A3 (b) U1** | **通过** | **静态复核**：`awk` 锚定 §2.5 / §3.3 后 `grep -v 概念名` 无输出；`grep -rnE 'console-pane\|console-shell' .aup/` = **0**（实现零改动） |
| **A4 (c) U2** | **通过** | **静态复核**：`（§2.3）` exit 1 无命中；`（§2.5）` 唯一命中 438 行 |
| **A5 (d) U3** | **通过** | **静态复核**：`非 HTML 资源` 3→**2**（§2.6 内 1、§9 内 1，§9 条目未动） |
| **A6 零副作用** | **通过** | **静态复核**：版本号 V1.3→**V1.4** 且写明四项改动 + 指向 UI-004；UI 名下只改该 `.md` + `docs/team/design/UI-004-*.md`（405 行）；未改任何实现文件 |
| **A7 受限项与授权外残留** | **通过（如实标注）** | **静态复核**：UI-004 §8 登记 R1–R4（§9 第 2 条条目文字 `console-pane`、附录 A.1 CSS 类名、附录三处 §2.3 交叉引用、§9 第 2 条条目内的出现处）；docs-only 未 build、未跑 live；`arc dsl lint --fix` 未跑 |
| **新增缺陷** | **BUG-014（P3）** | **浏览器实测**（负面用例 4）：去掉 `.aup-app-header` 过滤后 `?page=compose` 实测为 `0`（文档 §2.6 第 235 行 / §9 第 518 行仍写 `2`——BUG-010 之前的旧测量）。**文档事实漂移，非实现缺陷**；**裁定 = 下轮修（R10）**——修改点在 L-R9-1 授权四项之外，需新一轮授权；等价断言部分不受影响（34/34 绿） |
| **受限未验证** | 如实标注 | UI 本轮自跑 5 页 × 2 视口（身份来源已写明 CDP 9333 共享登录态）；全 17 页 × 2 视口由 **QA 独立复跑**（上表 A2 运行期）；像素级视觉走查**本轮不做**（L-R9-4 = D8） |

**授权外残留（本轮保留，Lead/PM 决定是否另开一轮）**：`docs/ArcBlog-admin-ui-design.md` §9 第 2 条条目文字内的 `console-pane`、附录 A.1 的参考 CSS 类名与 AI 提示词模板、附录里三处 `§2.3` 交叉引用（U2 同类但超授权）。详见 [UI-004](../design/UI-004-ui-standard-assertion-and-residuals.md) §8。**Lead D12（2026-09-27）：R9F 本轮不做，留 R10 另行授权** → [backlog](../backlog.md) 排队 **#12**（与像素级走查 #5 同 UI 批）。

**R9F 补充（PM，2026-09-27）**：唯一新增缺陷 **BUG-014** 已由 **Lead D10 一行授权**并入 R9F，UI（`task-17`）**只改 §2.6 / §9 的说明性实测描述**（旧测量 `2` 标注为 BUG-010 **之前**、更正为实测 `0`），**未动断言表达式、未放宽期望值 `0`、未改 §9 其余条目**；QA（`task-18`）独立复验：断言块与 round-9 另存副本**逐字节 IDENTICAL（0 diff）**、`^□` 仍 **12**、`git diff` 无 `□` 行、负面探针 6 组数字与更正后描述逐项一致、17 页 × 2 视口 **34/34** → **BUG-014 闭环**（[round-9-reverify.md](../test-reports/round-9-reverify.md) §3-E）；交付产物加 `docs/team/design/UI-005-bug014-measurement-note.md`。**本 REQ 交付本身（A1–A7）未再改动**。

---

## 4. 依赖

- **授权（前置，已解除）**：**L-R9-1**（Lead 2026-09-27）——`docs/ArcBlog-admin-ui-design.md` 的临时扩展写范围，**仅四项 (a)–(d)**；**L-R9-4 = D8**：像素级视觉走查本轮不做。越界即停手上报。
- **上游**：Round 8 QA 报告 [`test-reports/round-8.md`](../test-reports/round-8.md) §4 用例 5 / §6 / §7；[`bugs/BUG-011-…md`](../bugs/BUG-011-console-link-assertion-viewport-sensitive.md)；[`design/UI-003-ui-standard-residuals.md`](../design/UI-003-ui-standard-residuals.md) §5（U1–U3）；[`backlog.md`](../backlog.md) 「本轮：Round 9」+ 🐞 区。
- **同源耦合（不是 blocked_by，但影响判定）**：**REQ-006 / `task-12`**（BUG-010）修好后，compose 的旧 1512 复现路径消失——本 REQ 的文档改写用**实现无关**的内容列等价断言，从而在 BUG-010 前后都成立；运行期复跑必须等 `task-12` 完成。
- **下游**：**QA-004 / `task-14`**（`blocked_by task-12 + task-13`）：逐条复跑 A1–A7（A2 的运行期部分在此执行），报告 `docs/team/test-reports/round-9.md`。
- **外部条件**：无（docs-only，不需实例、不需浏览器即完成静态交付；运行期复跑需 admin 会话 + L-R9-3 的 `.gate-lock`）。

---

## 5. 涉及写范围

| 路径前缀 | 用途 | 归属 |
| -- | -- | -- |
| `docs/ArcBlog-admin-ui-design.md` | L-R9-1 四项 (a)–(d) + 版本号 V1.3→V1.4 | **UI**（Lead 临时扩展授权，**仅四项**） |
| `docs/team/design/UI-004-*.md` | 本轮 before/after + 证据 + 未对齐项（新增） | UI |
| `docs/team/test-reports/**`、`docs/team/bugs/**` | R9 验收报告（含 A2 两视口原始 JSON）与 BUG 状态 | QA |
| `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 看板 / 本 REQ / 轮次日志 | PM |
| `.aup/**`、`scripts/**`、`world/**`、`pages/**`、`blocklet.yaml`、`dist/**`、`.web/**`、`seed/**` | **本 REQ 一律不改**（BUG-010 由 REQ-006 处理；UI 零改实现） | 越界即停手上报 |
| `docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md`、`CLAUDE.md`、`docs/arc-contracts.md`、`.agents/skills/**` | **本 REQ 一律不改** | Lead |

**边界**：**超出 L-R9-1 四项的标准口径修改 → 停手上报 PM / Lead**，不得先行改动；不确定的段落只记录在 UI-004 的「未对齐项」里。
