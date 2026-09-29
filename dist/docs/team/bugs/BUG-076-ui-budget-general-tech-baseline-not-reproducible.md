# BUG-076: `ui-budget-baseline.json` 的 `general.tech` 由 20 抬到 32，而实测值是 14 —— 该重录无法用 `--write-baseline` 复现（REQ-034 H9「禁止静默抬升」未满足）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-076 |
| 严重级 | **P3**（门禁完整性：棘轮被放宽而不是被记录；当前不掩盖任何已有超预算，但会放任 `general` 未来最多 +18 个 tech 节点不被拦下） |
| 发现轮次 | round-26（QA `task-112` 审查 REQ-034 H9 / 新基线） |
| 关联 REQ | [REQ-034](../requirements/REQ-034-roles-capabilities-settings.md) §3.8 **H9**（允许**显式**重录 + **逐控件说明**，**禁止静默抬升**，须给 `git diff` 片段）；R23 L-R23-5 先例 |
| 状态 | **待裁决**（QA 未修改任何源码；`scripts/ui-budget-baseline.json` 属 Dev 写范围） |

## 复现命令与最小步骤

```bash
# 1) 基线在本轮被改动的位置（只有两页：policy.i18n 降 1；general 五项抬升）
git diff scripts/ui-budget-baseline.json
# -    "i18n": 95,   → +    "i18n": 94,   （policy）
# -    "cards": 4, "ctrl": 11, "styles": 30, "i18n": 45, "tech": 20
# +    "cards": 5, "ctrl": 14, "styles": 44, "i18n": 87, "tech": 32   （general）

# 2) 实测值（同一实现 measure()；--write-baseline 写的就是这个快照）
node scripts/arcblog-ui-budget.mjs | grep -E "^(page|general|policy)"
# general   2   5   0  14  44  87  14   …

# 3) 逐指标比对：**除 tech 外 general 全部与基线相等**，tech 实测 14 vs 基线 32
node --input-type=module -e "
import { checkBudget } from './scripts/arcblog-ui-budget.mjs';
import { readFileSync } from 'node:fs';
const b=JSON.parse(readFileSync('./scripts/ui-budget-baseline.json','utf8'));
for (const r of checkBudget()) { const d={}; for (const k of Object.keys(r.metrics)) if (b[r.page] && b[r.page][k]!==r.metrics[k]) d[k]=[b[r.page][k],r.metrics[k]]; if (Object.keys(d).length) console.log(r.page, JSON.stringify(d)); }"
# dashboard {"tech":[11,4]} … general {"tech":[32,14]} … policy {"tech":[36,21]} …（22/22 页 tech 全部偏高）
```

## 期望

`scripts/ui-budget-baseline.json` 是「当前实测快照」（`--write-baseline` 就是 `writeFileSync(BASELINE_PATH, JSON.stringify(report.metrics))`），因此重录后每个指标应与实测**逐值相等**；REQ-034 H9 还要求在报告里给出重录的 `git diff` 片段与逐控件说明。

## 实际

- `general` 的 `cards/ctrl/styles/i18n` 与实测**逐值相等**（5/14/44/87），说明这四项确是按当前页面重录的；
- `general.tech` 却是 **32**，实测 **14**：该值既不是本次实测，也**不是**基线原值（原值 20），无法解释为「记录新增节点的成本」；
- `-` 方向也异常：`--write-baseline` 会把它写成 14。也就是说这个 32 是**手改**的，且**在 22 个页面里 `tech` 基线全部高于实测**（既有漂移：`tech` 的 WIRING 收紧后从未重录），本轮把 `general` 又抬高了 12；
- REQ-034 H9 要求的「逐控件说明 + `git diff` 片段」在已落盘产物里**不存在**（Dev 未回结构化结果；`docs/team/journal/round-26.md` §3 / REQ-034 §6 仍为 ⬜ 预留），因此这次抬升在交付物里是**静默**的。

> 结论：H9 **部分达标**——「显式重录」形式上做了，「逐控件说明 / 可复现」不成立。技术后果有限（棘轮对 `general.tech` 被放宽 18），但门禁完整性问题应记录并由 Lead 决定补录方式。

## 证据输出

```text
$ node scripts/arcblog-ui-budget.mjs | grep -E "^(page|general|policy)"
page                 blocks cards nest ctrl styles i18n tech   over-budget
policy                    1     5    0   29     43   94   21   cards,ctrl,styles,i18n,tech
general                   2     5    0   14     44   87   14   cards,ctrl,styles,i18n,tech

$ python3 -c "import json;b=json.load(open('scripts/ui-budget-baseline.json'));print('general',b['general']);print('policy',b['policy'])"
general {'blocks': 2, 'cards': 5, 'nested': 0, 'ctrl': 14, 'styles': 44, 'i18n': 87, 'tech': 32}
policy {'blocks': 1, 'cards': 5, 'nested': 0, 'ctrl': 29, 'styles': 43, 'i18n': 94, 'tech': 36}

$ git diff scripts/ui-budget-baseline.json | grep -c '^+.*tech'
0        # 新增行里没有独立 tech 行——32 与 20 是同一段 hunk 的整行改写，更说明是手改
```

退出码：0（`npm test` 的棘轮用例只断言「不比基线更差」，因此这个放宽**不会**让它变红）

## 影响范围

- 受影响角色：任何依赖 `ui-budget` 棘轮防「控件静默膨胀」的人（UI/Dev/QA）
- 受影响链路：`scripts/ui-budget-baseline.json` → `scripts/arcblog-ui-budget.test.mjs`（fast tier）
- 数据后果：无
- 可绕过：不适用（记录性质）
- 建议：由 Lead 补录「逐控件说明 + diff 片段」进 R26 报告，或要求 Dev 用 `--write-baseline` 重录并解释 `tech` 的既有 22 页漂移（是否要一并重录 `tech`）

## 疑似文件

> 线索不是结论；QA 未修改。

- `scripts/ui-budget-baseline.json`（`general.tech`）
- `scripts/arcblog-ui-budget.mjs`（`measure()` 的 `tech` 口径；`--write-baseline` 实现）
