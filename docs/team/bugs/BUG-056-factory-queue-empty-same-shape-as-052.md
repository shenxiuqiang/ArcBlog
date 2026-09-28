# BUG-056: `factory.aup` 的 `factory.queue-empty` 是 BUG-052 同形第三处（无条件空态措辞 / 仅作 `emptyText` 且平台运行期不求值）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-056 |
| 严重级 | **P3**（文案/一致性：当前**不影响渲染**——它只作 `afs-list emptyText`，而平台运行期不解析 `$t()`；但它是 BUG-052 同形的第三处，留着会让「同一类文案两种口径」长期存在） |
| 发现轮次 | round-20（Dev 在 REQ-022 §7.2 登记为候选 **C-2**；QA `task-85` 独立复核后转为 BUG 入账） |
| 关联 REQ | REQ-022-two-node-studio-hub-testbed.md §7.2 C-2；BUG-052（L-R20-4 只圈定 `media.aup` + `categories.aup`） |
| 状态 | 待裁决（PM `task-86`） |

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
