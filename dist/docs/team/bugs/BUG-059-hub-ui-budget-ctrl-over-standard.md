# BUG-059: UI 预算 ratchet 基线把 `?page=hub` 的 `ctrl` 抬到 **13**（超过 UI 标准 §2.7.2 的 `ctrl ≤ 12`）而门仍全绿

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-059 |
| 严重级 | **P3**（治理/页债登记：`npm test` 的 ratchet 仍绿，但被抬升的基线已越过 `docs/ArcBlog-admin-ui-design.md` §2.7.2 写死的 `ctrl ≤ 12`；需 PM/Lead 明确裁决「接受页债」或「回收控件数」） |
| 发现轮次 | round-21（QA `task-89` 独立复核；Dev `task-88` 自报「ctrl=13 已超过 §2.7.2，交 Lead/QA 复核」） |
| 关联 REQ | REQ-019-button-first-console.md §12（第三批新增 1 卡 + 3 按钮 + 3 输入 + 折叠按钮） |
| 状态 | 待裁决（PM `task-90`） |

## 复现命令与最小步骤

```bash
cd /Users/shenxiuqiang/workspace/ArcBlog
node scripts/arcblog-ui-budget.mjs | grep -E "page|hub"
git diff scripts/ui-budget-baseline.json
grep -n "THRESHOLDS = \|ctrl: 12" scripts/arcblog-ui-budget.test.mjs
npm test 2>&1 | grep -E "ratchet|thresholds"
```

## 期望

`scripts/arcblog-ui-budget.test.mjs` 的「thresholds match UI standard §2.7.2」把标准常量钉在 `ctrl: 12`；ratchet 又声明「no page is worse than `scripts/ui-budget-baseline.json`」。两条合起来应意味着**没有任何页面的 `ctrl` 超过 12**，或超出时必须由 Lead/PM 显式登记并接受（UI 标准 §2.7.2 是验收依据之一）。

## 实际

- 基线被抬升：`hub.ctrl 4 → 13`、`cards 4 → 5`、`styles 21 → 32`、`i18n 45 → 81`、`tech 15 → 25`（本轮改动的必然结果，Dev 已自报）。
- 实测 `hub` 行为 `ctrl = 13 > 12`；ratchet 输出 `regressions vs baseline: 0`，`npm test` **35/35 全绿** —— 即**门不会因为某个页面越过 §2.7.2 的标准值而变红**（`thresholds` 用例只断言常量本身，不逐页比对标准）。
- **缓解事实（QA 复核）**：越线并非本轮独有——已提交的基线里 `heroes.ctrl = 13`、`posts.ctrl = 42`（`compose` 有 P3 豁免 ≤16，为 14）都长期高于 12，`ui-budget` 全量输出本就是 **19/22 页 over budget**。因此 hub 的 `ctrl=13` 与既有已接受页债同量级，**不构成新的功能性回归**；本条按「需显式裁决的页债」登记，而不是要求本轮回退。

## 证据输出

```text
$ node scripts/arcblog-ui-budget.mjs | grep -E "page|hub"
page                 blocks cards nest ctrl styles i18n tech   over-budget
hub                       2     5    0   13     32   81   25   cards,ctrl,styles,i18n,tech
...
19/22 page(s) over budget (UI standard §2.7.2)
regressions vs baseline: 0

$ git diff scripts/ui-budget-baseline.json
   "hub": {
     "blocks": 2,
-    "cards": 4,
+    "cards": 5,
     "nested": 0,
-    "ctrl": 4,
-    "styles": 21,
-    "i18n": 45,
-    "tech": 15
+    "ctrl": 13,
+    "styles": 32,
+    "i18n": 81,
+    "tech": 25
   },

$ grep -n "THRESHOLDS = " scripts/arcblog-ui-budget.test.mjs
45:  assert.deepEqual(THRESHOLDS, { blocks: 3, cards: 2, nested: 0, ctrl: 12, styles: 8, i18n: 25, tech: 2 });

$ npm test   → ℹ tests 35 / pass 35 / fail 0
```

退出码：0（`ui-budget.mjs` 与 `npm test` 均 0）

原始输出：`docs/team/test-reports/raw/round-21/21-build-diff.txt`（`git status`）、本文件上方即为实测；`npm test` 原始输出 `raw/round-21/27-npm-test.txt`。

## 影响范围

- 受影响角色：admin（控制台 `?page=hub` 的界面密度/可达性）
- 受影响链路：界面标准合规（`docs/ArcBlog-admin-ui-design.md` §2.7.2）；无功能/数据/权限后果
- 数据后果：无
- 可绕过：是（ratchet 基线就是「已接受页债」的登记处），但**需要 PM/Lead 明确说「接受」**，否则等于基线可以无限抬升而使 §2.7.2 失去约束力

## 疑似文件

- `scripts/ui-budget-baseline.json`（`hub` 行）
- `scripts/arcblog-ui-budget.test.mjs`（`THRESHOLDS` 与 ratchet 的语义缺口）
- `.aup/pages/ops/hub.aup`（本轮新增控件来源；**线索，不是结论**）

> **交 PM/Lead 的裁决项**：①接受该页债（在 backlog 登记 hub `ctrl=13` 为已接受例外，与 `heroes=13` / `posts=42` 同表）；②要求 R22 回收控件（把 3 个输入/按钮收进「高级」或合并）；③改 `THRESHOLDS` 的 ctrl 上限（需 Lead 裁定，属 UI 标准变更）。
