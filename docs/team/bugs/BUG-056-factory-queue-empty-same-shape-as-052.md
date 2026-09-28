# BUG-056: `factory.aup` 的 `factory.queue-empty` 是 BUG-052 同形第三处（无条件空态措辞 / 仅作 `emptyText` 且平台运行期不求值）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-056 |
| 严重级 | **P3**（文案/一致性：当前**不影响渲染**——它只作 `afs-list emptyText`，而平台运行期不解析 `$t()`；但它是 BUG-052 同形的第三处，留着会让「同一类文案两种口径」长期存在） |
| 发现轮次 | round-20（Dev 在 REQ-022 §7.2 登记为候选 **C-2**；QA `task-85` 独立复核后转为 BUG 入账） |
| 关联 REQ | REQ-022-two-node-studio-hub-testbed.md §7.2 C-2；BUG-052（L-R20-4 只圈定 `media.aup` + `categories.aup`） |
| 状态 | **QA 复验（round-21，`task-89`）：已修复 —— C1/C2/C3/C5 通过、C4 部分通过（空队列态受限未验证，原因见文末）→ 建议 PM 关闭** |

## 复现命令与最小步骤

```bash
cd /Users/shenxiuqiang/workspace/ArcBlog
grep -rn 'queue-empty' .aup/pages .aup/locales dist/.aup/pages dist/.aup/locales
grep -n 'queue-empty' .aup/pages/ops/factory.aup
```

## 期望

与 BUG-052 的裁决口径一致：空态措辞要么按「常驻说明」重写（L-R20-4 采用的形态），要么明确登记为「平台不求值 → 无渲染影响」并保持现状；不要在同一代码库里同时存在两种口径而不登记。

## 实际

- `.aup/pages/ops/factory.aup:66` 声明 `queue-empty { en "No intent yet. Press an action above." zh "还没有意图。点上面的操作按钮。" }`，仅被 `:225` 的 `afs-list … emptyText=:queue-empty` 使用；键仍存活（`arc dsl lint --json` 的 `dead_locale_keys` 为空），但 `emptyText` 运行期**不解析 `$t()`**（`docs/arc-contracts.md` §20 / CLAUDE.md「空态提示」条）→ 该文案当前不会被渲染成所写文字。
- `media.aup` / `categories.aup` 的同类文案已在 round-20 按 L-R20-4 改成无条件「常驻说明」，**factory 未改**（L-R20-4 明示只点 media + categories）。
- 因此今天它**不是**一个可见缺陷（BUG-052 的「有记录仍写空态」不会在这里发生，因为平台不渲染该串）；但它与已修复的三处形成口径不一致，且一旦平台开始求值 `emptyText`（或有人把它改成页级 `p`）就会立刻变成 BUG-052 同形缺陷。

## 证据输出

```text
$ grep -rn 'queue-empty' .aup/pages .aup/locales dist/.aup/pages dist/.aup/locales
.aup/pages/ops/factory.aup:66:    queue-empty { en "No intent yet. Press an action above." zh "还没有意图。点上面的操作按钮。" }
.aup/pages/ops/factory.aup:225:                afs-list factory-intents layout=list itemStyle=row subscribe=true showBreadcrumb=false showParent=false emptyText=:queue-empty autoSelect=false clickMode=none from "/instance/app/arcblog/config/chain-intents" {
.aup/locales/zh.json:170:  "factory.queue-empty": "还没有意图。点上面的操作按钮。",
.aup/locales/en.json:170:  "factory.queue-empty": "No intent yet. Press an action above.",
dist/.aup/pages/ops/factory.aup:66: …（同上，build 后镜像）
dist/.aup/locales/{en,zh}.json:170: …（同上）
grep_exit=0
```

对照（同轮已修的三处已无旧 key）：

```text
$ grep -rn 'queue-empty\|media-empty' .aup/pages/ops/media.aup .aup/pages/site/categories.aup .aup/locales/en.json .aup/locales/zh.json
(仅 factory.queue-empty 命中 en/zh.json)      # media / categories 已清干净
```

完整输出：`docs/team/test-reports/raw/round-20/13-nav-lint.txt`（`dead_locale_keys` 空）+ `docs/team/requirements/raw/REQ-022-bug052-dom.txt:178-187`（Dev 侧同一 grep）。

退出码：0

## 影响范围

- 受影响角色：admin（`?page=factory` 的意图队列）
- 受影响链路：界面文案一致性；**当前无渲染影响**（平台不求值 `emptyText`）
- 数据后果：无
- 可绕过：是（现状即可接受；仅口径不一致）

## 疑似文件

- `.aup/pages/ops/factory.aup:66`（`queue-empty` 声明）、`:225`（`emptyText=:queue-empty`）
- `.aup/locales/en.json:170`、`.aup/locales/zh.json:170`（`factory.queue-empty`）

> QA 不修改上述文件。建议（仅建议，交 PM 裁决）：① 与 media/categories 统一为常驻说明措辞（R21 一并做）；或 ② 明确「`emptyText` 不求值 ⇒ 不影响渲染」并保留，在 arc-contracts 里登记该口径。两条都不阻断本轮。

---

## 复验记录（round-21，QA `task-89`；**独立重跑，不采信 Dev 自述**）

> 原始输出：`docs/team/test-reports/raw/round-21/20-bug056-static.txt`（C1/C2/C3）、`17-factory-regression.txt`（C4/C5 + 21 页扫描）、`19-factory-rows.txt`（C5 AFS 对照）；探针：`raw/round-21/qa-regression-scan.mjs`、`raw/round-21/qa-factory-rows.mjs`（CDP 单 tab、每语言新 context、跑完 `leftOpen=[]`）。

**修法（静态复核，C1/C2/C3）**

- **C1 ✅**：`grep -n 'queue-empty\|queue-standing-note' .aup/pages/ops/factory.aup` → 只剩 `:66` 声明 `queue-standing-note` 与 `:251` 的**页级 `p :queue-standing-note`**（无条件、无 `visible`），`afs-list` 上的 `emptyText=:queue-empty` 已移除；全仓库（`.aup/pages`、`.aup/locales`、`dist/.aup/**`）`grep 'queue-empty'` **零命中**（`grep_exit=1`）。
- **C2 ✅**：`.aup/locales/{en,zh}.json:891` 只有 `factory.queue-standing-note`，旧键 `factory.queue-empty` 已删；`arc dsl lint --json` → `dead_locale_keys = []`（45 条 issue 全为 `unreferenced_explicit_id`）。
- **C3 ✅**：`git diff .aup/pages/ops/factory.aup` 的**新增行里没有任何 `visible`**（唯一 grep 命中是注释文字「no `visible` condition is possible」）。

**运行期 DOM（C4；CDP 单 tab，`Page.navigate` 复用）**

| 语言 | 常驻说明 | 旧空态措辞 | 队列实际非空 | `SESSION INIT FAILED` |
| ---- | -------- | ---------- | ------------ | --------------------- |
| zh | **1 条**（「凡是入队的链上意图都会出现在上方列表里…」） | **`[]`** | 是（`config/chain-intents` 6 条） | false |
| en | **1 条**（"Every queued chain intent appears in the list above…"） | **`[]`** | 同上 | false |

**C4 的空队列态 = 受限未验证（如实登记）**：`?page=factory` 的队列根是 **live `config/chain-intents`（6 条）**，其中 `pending.json` 与 5 条历史记录是 BUG-051 / REQ-021 的取证对象，**删除或搬移它们会改动链历史记录（越界）**，因此 QA 没有造「0 条」态。可替代的等效证据：该段落是**无条件页级 `p`**（C3 静态证明），与 round-20 已在 media/categories 两态实测通过的常驻说明同形；**非空态（本页唯一会出 BUG-052 同形矛盾的态）已实测通过**。

**C5（其余功能零回归）**

- `?page=factory` 队列行与 AFS 对照：6 条 `chain-intents` 记录的 `status` **6/6** 出现在页面文本（`rejected`/`applied`/`pending`，含那条 `pending` 的 `intent-mujkccy6-r1nd`）；页面**不渲染** `action`/`message` 字段是既有模板行为（行内只渲染 `status`/`role`/时间/`result.hash`/`error`），非本轮改动。
- 21 页运行期扫描（admin、zh、单 tab）：**每页 `data-active="true"` = 1、`aria-current="page"` = 1、无 `SESSION INIT FAILED`**（`raw/round-21/17-factory-regression.txt`）。
- 页面行动作仍可用：`?page=factory` 的「质押」按钮在 zh/en 两态都渲染（探针记录）；本轮**未点击**链上按钮（零链写红线）。

**判定：C1/C2/C3/C5 通过，C4 部分通过（空态受限未验证 + 原因）→ 建议 PM 关闭**。QA 未修改任何源码；探针**未写实例**（`?page=factory` 全程只读）。
