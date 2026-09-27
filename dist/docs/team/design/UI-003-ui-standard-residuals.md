# UI-003: `docs/ArcBlog-admin-ui-design.md` 残余漂移收口 + §4.1 平台受限说明（before/after 记录）

| 字段 | 值 |
| ---- | -- |
| 提案号 | UI-003（对齐记录，非新设计提案） |
| 状态 | 已实现（V1.2 → V1.3），待 PM / QA 复核 |
| 提出轮次 | round-8 |
| 上游依据 | Lead 2026-09-27 **D6 裁定**（先探针后降级 A→B + 第 3 条口径改写）· [REQ-005](../requirements/REQ-005-console-ui-standard-residual.md) · [BUG-007](../bugs/BUG-007-admin-ui-design-section-2-1-residual-drift.md) · [BUG-008](../bugs/BUG-008-admin-ui-design-section-9-note-not-reproducible.md) · [`docs/arc-contracts.md`](../../arc-contracts.md) §28.8 / §28.1 / §28.6 · `scripts/console-nav.mjs` · `.aup/wrapper.aup` · `.aup/pages/**` |
| 实现方 | **UI 自改**（Lead 沿用 round-7 的临时扩展授权：`docs/ArcBlog-admin-ui-design.md`，仅限事实对齐 + §4.1 本条降级说明） |
| 依据快照 | 2026-09-27，工作区 HEAD = Round 7 末（`docs/ArcBlog-admin-ui-design.md` 基线 V1.2）；**Dev（task-7 / REQ-004）开工时尚未落盘**（`git status --short` 无 `.aup/**`、`scripts/**` 改动），故本记录的源码事实是"Dev 改动前"快照 |

> 本文件只记录"文档落到实现事实上"的 before/after 与证据：**不改任何标准口径**（§4.1 原两条 / §9 十二条断言一条未动）、**不改实现**。
> 未对齐项集中在 [§5](#5-未对齐项发现但未获授权改动)，请 PM / Lead 裁决。

---

## 1. 问题

Round 7 的 REQ-003 把 §2.1 / §2.3 / §2.5 / §2.6 / §8 / §9 对齐到 B′ 实现，但留下三处：

1. **BUG-007**：§2.1 同一张骨架表自相矛盾，且把仓库里不存在的选择器当现状：
   - 「侧边栏样式」行写 **不渲染页脚**，而「侧栏页脚」行写"品牌/关于/RSS/版权收进侧栏底部"，REQ-002 **F9 已让 17 个控制台页渲染侧栏页脚** → 前者与实现事实相反；
   - 「顶栏」行写"页面内 `view console-topbar` 承载 `app-header`"——`console-topbar` 在仓库命中 **0**；
   - §2.1 正文、§2.5 两处、§3.3、§9 的 `console-scroll` 同样被当现状（`console-scroll` 命中 **0**）。
2. **BUG-008**：§2.6 / §9 的附注写「无过滤时另有 **1** 条 wrapper 品牌链接」，实测 `?page=compose` 是 **2** 条（多出 REQ-002 F9 的侧栏「关于」链接）→ 附注不可复现，且依赖另一个 REQ 是否落地。
3. **D6 第 3 条**：§4.1 缺少「平台受限 + 降级说明」——`$t()` 的 key 必须是编译期常量（`arc-contracts.md` §28.8），因此"按记录值切换本地化文案"没有可用机制；降级口径（本地化中性标签 + 原始状态值可见 + 色点）与口径改写（"不得出现裸英文枚举" → "不得出现『不同真实状态被同一句话断言』；原始枚举值可以可见，但必须有本地化上下文"）尚未落进标准。

**影响**：§2.1 是"控制台骨架"表，误导面最大——按它实现会写出与现状冲突的骨架；§9 是逐轮引用的页面验收清单，附注数字与运行期不符会让复现者把 `2` 误判成回归。受影响角色：UI / Dev / QA。

---

## 2. 逐条 before / after（含证据命令与真实输出）

### 2.1 BUG-007-A：§2.1 删掉与实现相反的「不渲染页脚」

**before**（V1.2）

```text
| 侧边栏样式 | **扁平、贴左边缘、与顶栏/视口底部零间距**：容器无边框无圆角无内边距（`padding: 0`、`gap: 0`），与右侧内容之间 1px 右分割线；**不渲染页脚**；菜单项无边框无圆角、左对齐满宽、左右内边距 `8px 20px`；… |
| 侧栏页脚 | 控制台不渲染站点页脚，品牌/关于/RSS/版权收进侧栏底部（`marginTop: auto`） |
```

**after**（V1.3，把前后矛盾的那半句整体删除，只留与实现一致的「侧栏页脚」行）

```text
| 侧边栏样式 | …与右侧内容之间 1px 右分割线；菜单项无边框无圆角、左对齐满宽、左右内边距 `8px 20px`；… |
| 侧栏页脚 | 控制台不渲染站点页脚（`app-footer`），品牌/关于/RSS/版权收进侧栏底部（容器 `marginTop: auto` + 顶部 1px 分割线），由 `scripts/console-nav.mjs` 生成进每个控制台页——是侧栏内唯一的站点级入口；「关于」`href="/?page=about"`（唯一无 `target` 的行）、「RSS」`href="/p/rss.xml"`（`target=_blank`） |
```

**依据（仓库实测）**

```text
$ grep -n 'footer' scripts/console-nav.mjs | head
158:  // F9 (REQ-002): a fixed sidebar footer — brand / About / RSS / copyright.
159:  // The console deliberately does not render the site footer (admin-ui-design
162:  // wrapper-namespace (`$t(wrapper.footer-*)`) so it is hand-kept in
166:  const footerStyle =
170:    `${pad}  view style={marginTop: auto, background: "var(--color-bg)", borderTop: "1px solid var(--color-border)", flexShrink: 0, gap: "0"} {`,
173:    `${pad}    p "$t(wrapper.footer-brand)" scale=caption intent=muted style={padding: "10px 20px 2px 32px", flexShrink: 0}`,
175:  lines.push(`${pad}    action "$t(wrapper.footer-about)" href="/?page=about"${footerStyle}`);
176:  lines.push(`${pad}    action "$t(wrapper.footer-rss)" href="/p/rss.xml" target=_blank${footerStyle}`);
178:    `${pad}    p "$t(wrapper.footer-copyright)" scale=caption intent=muted style={padding: "2px 20px 10px 32px", flexShrink: 0}`,

$ grep -rln 'wrapper.footer-brand' .aup/pages/ | wc -l
17

$ awk '/^### 2\.1 /,/^### 2\.2 /' docs/ArcBlog-admin-ui-design.md | grep -c '不渲染页脚'
0

$ awk '/^### 2\.1 /,/^### 2\.2 /' docs/ArcBlog-admin-ui-design.md | grep -c '页脚'
1          # §2.1 内只剩「侧栏页脚」这一处、且与 17 页实现一致
```

> 注：`wrapper.aup` 的 i18n 块里声明的是 `footer-brand { en "ArcBlog" zh "ArcBlog" }`（**不带** `wrapper.` 前缀），生成器/页面引用的是 `$t(wrapper.footer-brand)`——所以 `grep -c 'wrapper.footer' .aup/wrapper.aup` = **0 是正常的**（见 §3 的门命令解释）。

### 2.2 BUG-007-B：顶栏承载方式 → `.aup/wrapper.aup` 的 `view mode=shell`

**before**（§2.1 第 65 行，写成"页面内"）

```text
| 顶栏 | 页面内 `view console-topbar`（`width: 100vw` + `margin-left: calc(50% - 50vw)`）承载 `app-header`，与控制台同宽贴边 |
```

**after**

```text
| 顶栏 | 由 `.aup/wrapper.aup` 的 `view mode=shell` **一处**承载 `app-header`（所有页面共用，**不是**页面内的块）：容器 `width: 100vw` + `marginLeft: calc(50% - 50vw)`、高度钉死 `48px`；`mode=shell` 渲染为 `data-mode="shell"`，豁免运行时对 wrapper 直接子元素的 `--aup-content-max`(1200px) cap，因此真正满宽贴边（`arc-contracts.md` §27.5）。控制台页根 `height: calc(100vh - 48px)` 里的 `48px` 就是它的实测高度，改顶栏高度必须复测（§8） |
```

**依据（仓库实测）**

```text
$ sed -n '35,38p' .aup/wrapper.aup
  view style={gap: "0"} {
    view mode=shell style={width: "100vw", marginLeft: "calc(50% - 50vw)", height: "48px", minHeight: "48px", maxHeight: "48px", padding: "0"} {
      app-header site-header variant=compact brand={title: ArcBlog, href: "/"} actions=[…]
    }

$ grep -rnE 'console-topbar|console-scroll|console-shell|console-pane' .aup/ | wc -l
0

$ grep -n '"mode": "shell"' .aup/wrapper.json
14:        "mode": "shell",
```

`docs/arc-contracts.md` §27.5（1306–1307 行）原文：「wrapper 的直接子节点会被 `--aup-content-max` cap（实测 header 被压成 1136 宽、x=293），**给 header 容器加 `mode=shell`** 即可豁免该规则（cap 规则排除 `[data-mode="shell"]`）」——与 `.aup/wrapper.aup` 现状一致。

### 2.3 BUG-007-C：`console-topbar` / `console-scroll` 全篇不再被当作现状

8 处基线（B1+B2：`56/61/65/162/163/252/414/415`）的处置：

| 位置 | before | after | 处置 |
| ---- | ------ | ----- | ---- |
| §2.1 骨架图 | `console-scroll：唯一滚动区` | `内容列：唯一滚动区` | 删名 |
| §2.1 正文 | `只有右侧 console-scroll 内部滚动——详见 §2.3` | `只有右侧内容列的滚动容器内部滚动（console-scroll 只是概念名）——滚动归属详见 §2.5，实现公式见 §8` | 标概念名 + 修交叉引用（§2.3→§2.5，BUG-007 指出的 R2） |
| §2.1 顶栏行 | `页面内 view console-topbar` | wrapper `view mode=shell` 事实 | 改写（见 2.2） |
| §2.5 第 162 行 | `长列表、长表单只在 console-scroll 内滚动` | `只在右侧内容列的滚动容器内滚动（console-scroll 只是概念名，承载方式见 §8）` | 标概念名 |
| §2.5 第 163 行 | `console-scroll 的直接子项必须 flexShrink: 0` | `内容列滚动容器的直接子项必须 flexShrink: 0` | 删名 |
| §3.3 第 252 行 | `（console-scroll gap=sm 或网格 gap 14px）` | `（内容列滚动容器 gap=sm 或网格 gap 14px）` | 删名 |
| §8 第 414 行（现 421） | `顶栏由页面内的 view console-topbar 承载，公共页由各自页面承载` | `顶栏由 .aup/wrapper.aup 的 view mode=shell 一处承载（控制台与公共页共用）——console-topbar / console-scroll 都只是本文档的概念名` | 改写 + 标概念名 |
| §8 第 415 行（现 422） | 已带「概念名」范式 | **未动** | 沿用（REQ-005 B2：「第 415 行可不动」） |

**复跑**

```text
$ grep -n 'console-topbar\|console-scroll' docs/ArcBlog-admin-ui-design.md
61:…（`console-scroll` 只是本文档的**概念名**，实现里没有这个选择器）…
162:…（`console-scroll` 只是本文档的**概念名**，承载方式见 §8）…
421:…——`console-topbar` / `console-scroll` 都只是本文档的**概念名**，实现里没有这两个选择器 |
422:…实现里**没有** `console-shell` / `console-pane` / `console-scroll` 这些选择器——它们只是本文档的**概念名**…

$ awk '/^### 2\.1 /,/^### 2\.2 /' docs/ArcBlog-admin-ui-design.md | grep -nE 'console-topbar|console-scroll' | grep -v '概念名' || echo "§2.1 无未标注的概念名"
§2.1 无未标注的概念名

$ grep -rn 'console-topbar\|console-scroll' .aup scripts ; echo "exit=$?"
exit=1        # 仓库里不存在（无输出）
```

### 2.4 BUG-008：§2.6 / §9 附注改为可复现

**before**（§2.6 现第 207 行；§9 现第 466 行同形）

```text
…17/17 控制台页均为 `0`；`?page=compose` 的页面级滚动容器里另有 wrapper 的 `app-header` 品牌链接（`href="/"`，属框架 chrome，不算内容区），上面的 `!el.querySelector('.aup-app-header')` 正是把它排除掉。
```

**after**

```text
期望 `0`。实测（2026-09-27，admin 会话，视口 1803×908）：17/17 控制台页均为 `0`。**`!el.querySelector('.aup-app-header')` 不是可选项**：去掉它后 `?page=compose` 会变成 `2`，命中的两条都是**框架 chrome、不属于右侧内容区**——① wrapper 顶栏的品牌链接 `a.aup-app-header-brand-link` → `href="/"`；② 侧栏页脚的「关于」链接 `a.aup-action` → `href="/?page=about"`（REQ-002 F9 新增，见 §2.1「侧栏页脚」）。判定以「过滤后必须为 `0`」为准，不依赖这两条的条数（chrome 增减不影响结论）。对照页 `?page=posts` / `?page=tags` 带不带过滤都是 `0`（原始输出见 BUG-008）。
```

**为什么这版可复现**：不再声称"另有 1 条"，而是列出**两条具名元素** + 明确指出"判定不看条数"（未来 framework chrome 增减不会让这段过期），并链到带原始输出的 BUG-008。**§9 的断言表达式与期望值 `0` 未动。**

**运行期数字的来源与边界（如实标注）**：`2` 这一数字引用 **QA 在 round-7 的实测**（[BUG-008](../bugs/BUG-008-admin-ui-design-section-9-note-not-reproducible.md)「证据输出」：`{"withHeaderExclusion":0,"withoutHeaderExclusion":2,"scrollRootCount":1}`，另附两条命中的 `<a>` 明细）。**UI 本轮没有浏览器会话，未独立复跑**——round-8 的运行期复跑按 REQ-005 §3 A4 由 **QA-003（`task-9`）** 执行。

**文档侧的静态旁证（UI 实跑，2026-09-27；只证明"两条链接的源码存在"，不代表运行期计数）**

```text
$ grep -n 'page=about' .aup/pages/admin/compose.aup
109:            action "$t(wrapper.footer-about)" href="/?page=about" style={border: none, borderRadius: "0", padding: "4px 20px 4px 32px", justifyContent: flex-start, flexShrink: 0}
        # 无 target → 计入 a:not([target])

$ grep -n 'brand=' .aup/wrapper.aup
37:      app-header site-header variant=compact brand={title: ArcBlog, href: "/"} actions=[…]
        # app-header 的品牌链接由运行时渲染为 a.aup-app-header-brand-link → href="/"

$ grep -n '另有 wrapper' docs/ArcBlog-admin-ui-design.md ; echo "exit=$?"
exit=1        # 旧的不完整表述已清零
```

### 2.5 D6 第 3 条：§4.1 追加「平台受限 + 降级说明」

在既有两条（双编码、Error 具体原因）**之后**追加一段，共 4 条，原文见文档 §4.1；要点：

1. **平台受限三条**（引用既有实测，不自造结论）：`$t()` key 必须编译期常量（`arc-contracts.md` §28.8）、`visible` 只支持同步 `$session.*`（§28.1）、`afs-list.emptyText` 四种写法全无效（§28.6）。
2. **降级口径**：本地化中性标签 + **原始状态值以可见文本呈现** + 色点；例：`deleted` → 「草稿 · deleted」；hub 的 `relation`/`direction`/`freshness` 同口径（`Freshness: offline`、`Relation: inbound`）。
3. **三条硬边界**：不得只把真实值放进 `title`；不得把不同真实状态断言成同一句话；列表后必须有常驻 dim 说明。
4. **口径修订**：原「不得出现裸英文枚举」→「不得出现『不同真实状态被同一句话断言』；原始枚举值可以可见，但必须有本地化上下文」；并**逐字保留**第 284 行的双编码原句（**未重写、未删**）。

**复跑（REQ-005 §3 A5）**

```text
$ awk '/^### 4\.1 /,/^### 4\.2 /' docs/ArcBlog-admin-ui-design.md | grep -c '状态点与文字必须同时出现（双编码）'
1                                   # 原句逐字保留
$ awk '/^### 4\.1 /,/^### 4\.2 /' docs/ArcBlog-admin-ui-design.md | grep -c '§28\.8'   # 2
$ awk '/^### 4\.1 /,/^### 4\.2 /' docs/ArcBlog-admin-ui-design.md | grep -c '§28\.1'   # 2
$ awk '/^### 4\.1 /,/^### 4\.2 /' docs/ArcBlog-admin-ui-design.md | grep -c '§28\.6'   # 2
$ awk '/^### 4\.1 /,/^### 4\.2 /' docs/ArcBlog-admin-ui-design.md | grep -nE 'title'
17:* **三条硬边界**：① **不得**只把真实值放进 `title`（hover 才可见 ≈ 没有双编码）；…
$ awk '/^### 4\.1 /,/^### 4\.2 /' docs/ArcBlog-admin-ui-design.md | grep -nE '原始(枚举|状态)值|可见文本'
16:* **降级口径（诚实优先于全本地化）**：一行状态 = **本地化中性标签** + **原始状态值以可见文本呈现** + **色点**。…
18:* **口径修订（只改这一条）**：…**不得出现『不同真实状态被同一句话断言』；原始枚举值可以可见，但必须有本地化上下文**…
$ grep -n '同一句话' docs/ArcBlog-admin-ui-design.md
291:* **三条硬边界**：…② **不得**把**不同真实状态**断言成**同一句话**；…
292:* **口径修订（只改这一条）**：…「**不得出现『不同真实状态被同一句话断言』**；原始枚举值可以可见，但必须有本地化上下文」…
```

**采用的口径版本（REQ-005 §4 要求回报）**：默认按 **`arc-contracts.md` §28.8 + D6 路径 B** 写。
**依据与风险**：`docs/team/journal/round-8.md` §「单向信息依赖」明确"`task-8` 的 §4.1 降级说明默认按 D6 路径 B + §28.8 写"。UI 开工时（2026-09-27）**Dev `task-7` 尚未落盘任何探针证据**（`git status --short` 无 `.aup/**`/`scripts/**` 改动），因此**路径 A 是否可行本轮未经 UI 复验**；文档已用"（§28.8，Round 7 探针实测；R8 会重跑探针复核，若与新证据出入以新证据为准）"显式挂上这一不确定性。**若 Dev 探针证明路径 A 可用**：需 **Lead 先修订 §28.8**、PM 追加指令，UI 再重写 §4.1 第 1 条——**本轮未预先断言 A 不可行**。

### 2.6 文档版本号

**before** `**文档版本：** V1.2（…§2.1 / §2.3 / §2.5 / §2.6 / §8 / §9…）`
**after** `**文档版本：** V1.3（2026-09-27：收口 §2.1 残余漂移——顶栏/滚动容器改写成实现事实、删掉与 17 页实现相矛盾的「侧栏无页脚」旧句；§2.6 / §9 附注改为可复现；§4.1 追加「平台受限 + 降级说明」。逐条 before/after 见 docs/team/design/UI-003-ui-standard-residuals.md，上一轮见 UI-002）`

---

## 3. 验收命令与真实输出（REQ-005 §3 A1–A7）

### A1 通用门（必过）

**运行 #1（UI 文档改动落盘后、Dev `task-7` 尚未落盘时，2026-09-27）**

```text
$ arc dsl validate --json
{ … "issues": [] }
VALIDATE_EXIT=0

$ npm test
ℹ tests 28
ℹ pass 28
ℹ fail 0
ℹ duration_ms 1231.538875
fast tier passed — this is the gate. …
EXIT=0

$ node scripts/arcblog-console-nav.mjs --check
{
  "ok": true,
  "action": "check",
  "pages": 17
}
NAV_EXIT=0
```

**运行 #2 / #3（同轮稍后，Dev 的路径 A 探针落盘后，现场红 —— 归因见下）**

```text
$ arc dsl validate --json
issues = []                 # 仍为空
VALIDATE_EXIT=0

$ npm test
✖ no locale key is dead
ℹ tests 28
ℹ pass 27
ℹ fail 1
TEST_EXIT=1

$ arc dsl lint
ERROR: Failed DSL lint (1 changed)
  files: 46
  changed: .aup/pages/admin/zzstatusprobe.aup
  ERROR format_changed .aup/pages/admin/zzstatusprobe.aup: File is not formatted. Run arc dsl format --write.
LINT_EXIT=5
```

**归因（不是 UI 引入）**：`scripts/arcblog-i18n.test.mjs` 的 "no locale key is dead" 以 `arc dsl lint` 的 JSON 为输入；Dev（`task-7`）为 BUG-005 的路径 A 探针新增了 `.aup/pages/admin/zzstatusprobe.aup` 并注册进 `.aup/app.json`（`git status --short`：` M .aup/app.json`、`?? .aup/pages/admin/zzstatusprobe.aup`），该文件**尚未格式化** → lint 直接失败、无 JSON 输出 → 该测试红。这类红与 UI-002 §6.2 记录的是同一模式（并行 Dev 在飞）。**UI 的改动只有 `docs/**`，而 lint 的输入是 `.aup/**`（46 个文件）**——UI 不改 `.aup/**`（写范围禁止），故不回滚、不代改；**Dev 落定后必须由 Lead / QA 复跑 `npm test` 取最终门**。

> 本项 **docs-only，未改 `.aup/**`/`scripts/**` → 不需要 `arc blocklet build`**；未跑全量 `npm run test:live`（用户 2026-09-27 精简轮裁定）；未跑 `arc dsl lint --fix`（会误删运行时寻址 id）。

### A2 / A3 / A4 / A5

见 §2.1 / §2.3 / §2.4 / §2.5 的复跑输出：A2 `不渲染页脚`=0、§2.1 内 `页脚`=1、17 页实现事实不变；A3 §2.1 无未标注概念名 + `.aup/` 命中 0；A4 `另有 wrapper` 命中 0、`品牌链接` 有命中、§9 断言表达式未动；A5 原句 count=1 + 三条 §28.x 引用 + `title`/可见文本/同一句话 判据齐全。

### A6 零副作用 / 写范围

```text
$ git status --short
 M docs/ArcBlog-admin-ui-design.md                    ← UI（本项唯一被跟踪改动）
 M docs/arc-contracts.md                              ← Lead（D5 续 / §28.8）
 M docs/team/backlog.md                               ← PM（task-6）
 M docs/team/journal/README.md                        ← Lead
 M docs/team/requirements/REQ-002-console-consistency-fixes.md   ← PM
 M docs/team/requirements/REQ-003-admin-ui-design-alignment.md   ← PM
 M docs/team/requirements/REQ-004-console-round7-defect-closure.md ← PM
?? dist/docs/dsh-workflow-and-ralph.md                ← 非本项（他人）
?? docs/dsh-workflow-and-ralph.md                     ← 非本项（他人）
?? docs/team/journal/round-8.md                       ← PM
?? docs/team/requirements/REQ-005-console-ui-standard-residual.md ← PM（本项 REQ）
?? docs/team/design/UI-003-ui-standard-residuals.md   ← UI（本记录）

$ git diff --stat -- docs/ArcBlog-admin-ui-design.md
 docs/ArcBlog-admin-ui-design.md | 31 +++++++++++++++++++------------
 1 file changed, 19 insertions(+), 12 deletions(-)
```

`git diff --name-only` 不含 `.aup/**`、`scripts/**`、`dist/**`、`docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md`、`CLAUDE.md`、`docs/arc-contracts.md`（由上表可核对：这些文件的改动分别是 Dev / PM / Lead 的，非 UI）。A6 通过。

### A7 受限项（如实标注，不得推断为通过）

- **UI 未跑浏览器**：BUG-008 的 `withoutHeaderExclusion=2` 与 17/17 页 `0` 引用 QA round-7 的原始输出；round-8 的独立复跑由 **QA-003** 执行（REQ-005 §3 A4）。本记录不把该数字写成"UI 实测"。
- **路径 A 未复验**：见 §2.5 末段。
- **最终 `npm test` 现场红**：运行 #1 为 28/28（Dev 未落盘时），运行 #2/#3 为 27/28，唯一红 = `scripts/arcblog-i18n.test.mjs` 的 "no locale key is dead"，根因是 Dev 在飞的未格式化探针页 `format_changed .aup/pages/admin/zzstatusprobe.aup`（详见 §3 A1「归因」）。UI 无法在写范围内消除它；**Dev 落定后由 Lead / QA 复跑取最终门**。
- **未跑全量 live / 未 build**：docs-only，符合精简轮门规。

---

## 4. 涉及文件与写范围

| 路径 | 改动内容 | 实现方 |
| ---- | -------- | ------ |
| `docs/ArcBlog-admin-ui-design.md` | §2.1（骨架图/正文/顶栏/侧边栏样式/侧栏页脚）、§2.5（2 行）、§2.6（附注）、§3.3（1 行）、§4.1（追加说明段）、§8（第 414 行）、§9（附注）+ 版本号 V1.2→V1.3 | **UI**（Lead 临时扩展授权） |
| `docs/team/design/UI-003-ui-standard-residuals.md` | 本记录 | **UI** |
| `.aup/**`、`scripts/**`、`world/**`、`pages/**`、`.web/**`、`blocklet.yaml`、`dist/**`、`seed/**` | **未改**（`git status --short` 可证） | — |
| `docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md`、`CLAUDE.md`、`docs/arc-contracts.md`、`docs/team/roles/**`、`docs/team/requirements/**`、`docs/team/bugs/**`、`docs/team/test-reports/**` | **未改** | Lead / PM / QA |

---

## 5. 未对齐项（发现但未获授权改动）

| # | 位置 | 现状 | 仓库/文档事实 | 建议（待授权） |
| - | ---- | ---- | ------------- | -------------- |
| U1 | §2.5 代码块（现第 155 / 157 行）与 §3.3 第 254 行 | 把 `console-pane` / `console-shell` 当作实现名 | `.aup/` 命中 **0**（同 BUG-007 一类；UI-002 §6.1 的 R3 仍在） | 标为「概念名」，与 §8 第 422 行的既有范式一致。**REQ-005 授权清单只列了 `console-topbar` / `console-scroll`，故本轮未动** |
| U2 | §7 第 401 行 | 「桌面为"页面固定 + 内容区内滚动"（**§2.3**）」 | 该口径在 **§2.5**（§2.3 现在是控制台结构） | 交叉引用改指 §2.5（UI-002 R4，未获授权） |
| U3 | §2.6 表格（现第 189 / 190 行） | 「非 HTML 资源：RSS / `llms.txt`」两行内容重复（措辞微差） | 同一条规则写了两遍 | 删掉重复行（纯编辑；UI-002 R6，未获授权） |
| **U4** | `.aup/pages/admin/compose.aup`、`.aup/pages/admin/appearance.aup` | 内容列**没有**内层 `overflowY: auto` 滚动容器（只有侧栏有） | 其余 **15/17** 控制台页有（命令见下）；§2.5「页面固定、只有内容列滚动」与 §8 第 422 行「内容列内 `view size={flex: 1} style={overflowY: auto}` 是唯一滚动容器」在这 2 页上**无对应实现** | **这是实现侧疑点，不是文档漂移**——UI 按 REQ-005 §2.2 第 7 条**停手上报**：请 PM / Lead 裁决是"文档需加例外"还是"实现该补滚动容器"。运行期未复跑（属 QA-003 的浏览器断言范围） |

U4 的静态证据（UI 实跑，2026-09-27；只证明源码结构，不代表运行期行为）：

```text
$ grep -rln 'size={flex: 1} style={overflowY: auto}' .aup/pages/ | wc -l
15
$ grep -rln 'wrapper.footer-brand' .aup/pages/ | wc -l
17
$ for f in $(grep -rln 'wrapper.footer-brand' .aup/pages/); do grep -q 'size={flex: 1} style={overflowY: auto}' "$f" || echo "  $f"; done
  .aup/pages/admin/appearance.aup
  .aup/pages/admin/compose.aup

$ grep -n 'overflow' .aup/pages/admin/compose.aup
29:  view gap=lg style={height: "calc(100vh - 48px)", overflow: visible} {
37:        view size={width: "clamp(200px, 15vw, 280px)", … overflowY: auto, …} visible=$session.authenticated {
        # 内容列（第 114 行 view gap=md size={flex: 1} style={paddingTop: "14px", paddingBottom: "14px", minHeight: 0}）无 overflowY

$ sed -n '113,118p' .aup/pages/admin/dashboard.aup      # 摘两行，114–117 为页头/说明卡，略
113:        view gap=md size={flex: 1} style={paddingTop: "14px", paddingBottom: "14px", minHeight: 0} {
…
118:          view gap=sm size={flex: 1} style={overflowY: auto} {     ← 对照页有内层滚动容器
```

> **与 BUG-008 的关系（旁证，不作为结论）**：`?page=compose` 缺内层滚动容器，与 QA 实测"compose 唯一命中的滚动根含 `.aup-app-header`（故带过滤 = 0、不带过滤 = 2）、而 posts/tags 两种写法都是 0"在静态结构上一致。UI **未**据此改文档断言，也未据此断言实现有错——只作为 U4 的线索记录。

---

## 6. 未决问题

1. **路径 A 的最终口径**（最高不确定项）：§4.1 现按 §28.8 + 路径 B 写。若 `task-7` 探针证明平台可按记录值切换文案 → **Lead 修订 §28.8 + PM 追加指令 → UI 重写 §4.1 第 1 条**。
2. **U1–U3**（`console-pane`/`console-shell` 概念名、两处交叉引用、重复行）仍无授权：REQ-005 只授权了 `console-topbar`/`console-scroll` 与 §2.1 骨架表。请 PM / Lead 决定是否追加一轮纯文档事实对齐。
3. **U4**（compose / appearance 缺内容列滚动容器）：需 PM / Lead 判定"文档例外"还是"实现补齐"；若判为实现，应在 `.aup/**`（Dev 写范围）另立条目。
4. **QA-003 运行期复跑**：BUG-008 的 `?page=compose` 两写法计数（期望 `0` / `2`）与 §9 十七条断言，由 QA 在 admin 会话执行；若 Dev 的本轮 `.aup` 改动改变了 chrome 条数，按 §2.4 新写法"判定不看条数"仍成立。
