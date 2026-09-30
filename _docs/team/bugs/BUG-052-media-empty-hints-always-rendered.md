# BUG-052: `?page=media` 的空态提示**无条件渲染**（队列有 12 条记录时仍写「还没有入队的意图」）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-052 |
| 严重级 | **P2**（体验/文案：空状态显示错误，不影响功能、数据或权限） |
| 发现轮次 | round-19（QA `task-81` 独立验证 REQ-019 第二批时发现） |
| 关联 REQ | REQ-019-button-first-console.md **§11 第二批**（`?page=media`），验收判据 B3「队列状态页面可见且与 AFS 一致」 |
| 状态 | **QA 复验（round-20，`task-85`）：已修复 —— 运行期 DOM 两态 × 两语言全部通过（见文末「复验记录」）→ 建议 PM 关闭** |

## 复现命令与最小步骤

1. 前置：daemon 在跑；以 admin（blocklet 属主）登录；`?page=media` 队列里**至少有一条**意图记录（下一次真实点击即产生），媒体索引里**至少有一条**记录。
2. 用 CDP 打开 `?page=media`（单 tab），读取 `document.body.innerText`。

```bash
# 最小复现（QA 原始探针）
cd /Users/shenxiuqiang/workspace/ArcBlog
node docs/team/test-reports/raw/round-19/REQ-019-b2-sweep.mjs   # 其中 emptyHints 一段
```

## 期望

队列卡里的「还没有入队的意图。下方按钮会写入第一条。」只应在**队列为空**时出现；媒体索引卡的「如何添加：`node scripts/arcblog-media.mjs add`」只应在**索引为空**时出现（空态提示的语义；REQ-019 第二批 B3 要求页面队列区如实反映 AFS）。

## 实际

两者都**无条件渲染**：队列有 12 条记录、媒体索引有 3 条记录时，页面文本里仍然同时出现这两句。

## 证据输出

```text
$ node docs/team/test-reports/raw/round-19/REQ-019-b2-sweep.mjs
== ?page=media empty-state hints with a NON-empty queue ==
{"emptyHintLines":["还没有入队的意图。下方按钮会写入第一条。",
                   "如何添加：node scripts/arcblog-media.mjs add"],
 "queueActionRows":0}
```
（同一时刻 `node scripts/arcblog-media.mjs queue` → `count: 12`；`media list` → `count: 3`。）

退出码：0

## 影响范围

- 受影响角色：admin（控制台操作者）
- 受影响链路：界面（`?page=media` 文案 / 空状态）
- 数据后果：无（纯渲染，无写入、无权限后果）
- 可绕过：是（读队列卡的行即知真实状态）；但文案与状态矛盾，会被当成「按钮没生效」而重复点击

## 疑似文件

- `.aup/pages/ops/media.aup:210`（`p :queue-empty`，无 `visible` 条件）
- `.aup/pages/ops/media.aup:242`（`p :media-empty`，页级段落，非 `afs-list emptyText`；本轮新增）
- 相邻先例（非本 BUG）：`.aup/pages/site/categories.aup:207` 的 `queue-empty` 是上一批已接受形态 —— 本条主要针对**本轮新增**的页级 `:media-empty`，以及 `:queue-empty` 在新页面上的同一问题。

> QA 不修改上述文件。建议修法（仅建议）：给两个段落加与列表长度/队列长度绑定的 `visible` 条件；若平台无法按列表长度取反（平台无 length 原语），至少页级 `:media-empty` 应改成「常驻说明」措辞而不是空态措辞。

## 复验记录（round-20，QA `task-85`；**独立重跑，不采信 Dev 自述**）

> 原始输出：`docs/team/test-reports/raw/round-20/21-bug052-dom-empty.txt`、`22-bug052-dom-empty-en.txt`、`24-bug052-dom-nonempty.txt`、`26-bug052-categories-dom.txt`；探针：`raw/round-20/qa-media-dom.mjs`（CDP 单 tab、单 context、跑完关闭自己的 target，`tabs_left_open=[]`）。

**修法独立复核（静态）**：`.aup/pages/ops/media.aup:214` / `:248` 与 `.aup/pages/site/categories.aup:210` 的三处 `p` **无条件**（无 `visible`）——即 L-R20-4 要求的「常驻说明」，没有引入任何假条件；旧 key `media.media-empty` / `media.queue-empty` / `categories.queue-empty` 已从 `.aup/locales/{en,zh}.json` 删除（`git diff` + `grep` 实测：`.aup/pages`、`.aup/locales`、`dist/.aup` 全无命中；仅 `factory.queue-empty` 残留 → 见 BUG-056）。

**运行期 DOM（重启 `default` 取得新编译产物后；重启口径见 test-reports/round-20.md §9）**：

| 状态 | 语言 | `standingNoteLines` | `oldEmptyStateLines` | 其它 |
| ---- | ---- | ------------------- | -------------------- | ---- |
| 队列 0 条 / 索引 0 条 | zh | **2 条**（queue+media 常驻说明） | **`[]`** | `authenticated=true`、`sessionFailed=false` |
| 队列 0 条 / 索引 0 条 | en | **2 条** | **`[]`** | `lang=en` |
| 队列 **1 条**（QA 自建探针 intent，跑完已删） | zh | **2 条** | **`[]`** | 队列行文本含 `qa-r20-bug052-probe`（`probeRowPresent=true`）→ 有记录时不与状态矛盾 |
| 队列 **1 条** | en | **2 条** | **`[]`** | 同上 |
| `?page=categories` 队列 0 条 | zh / en | **1 条** | **`[]`** | 同批修复的第二页 |

**判定：通过（已修复）**。旧文案（「还没有入队的意图。下方按钮会写入第一条。」/「如何添加：…」/「No intent queued yet…」）在运行期**不再出现**；新文案在两种队列状态下都只陈述「有记录就会出现在列表里、为空只表示本机还没有入队」，不断言当前状态。

**副作用登记（QA 自清）**：为造「队列非空」态，QA 用 CLI 建了两条 intent（`qa-r20-bug052-probe`、`qa-r20-bug052-probe2`），随后用与页面 Clear 按钮相同的 `/.actions/delete` 删除，`arcblog-media.mjs queue` 回到 `count: 0`；`arcblog-clean.mjs` 复核 `found=206`（未因 QA 操作下降）。
