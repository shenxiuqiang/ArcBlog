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

---

## Dev 复验（lane H · **自证，非独立 QA** · 2026-09-29）

> lane 规则只允许 `arc dsl validate --json` / `node --test <本 lane 测试>` / `arc dsl lint`；**未跑** `arc dsl generate` / `npm test` / `npm run build` / 浏览器 harness（Lead 在合并点统一跑）。下列每条都是**真实命令 + 真实输出**。

**判定：基线已确定化并可复现；`general.tech` 由 32 重录为 `15`。「同一文件两次测量不同」不成立，「基线不是任何一次测量」成立并已修。**

### 1) 根因（两条，前者是数值问题的真因）

| # | 结论 | 命令 | 真实输出 |
| - | ---- | ---- | -------- |
| a | `measure()` **是纯静态的**：两次运行逐字节相同，不读时间/随机/实例/网络 | `node scripts/arcblog-ui-budget.mjs --json 2>/dev/null \| shasum -a 256` ×2 | `093d297b5042af74…` ×2（同一哈希） |
| b | **基线与实测系统性不符**：22 页里 **20 页**至少一个指标与实测不等（共 **50** 个陈旧值），且方向全是「基线更松」 | 见 §1.1 | `pages with >=1 stale metric: 20/22 \| stale metric values: 50`；`general ctrl 14→12, styles 44→38, i18n 87→96, tech 32→15`；`hub cards 5→2, ctrl 13→9, styles 32→8, i18n 81→25, tech 25→2` |
| c | 工具、页面、基线**同属一次提交**且此后未改 | `git diff 76ddd78 HEAD -- scripts/arcblog-ui-budget.mjs .aup/pages/admin/general.aup scripts/ui-budget-baseline.json` | 空 → 提交的工具在提交的页面上测出 **15**，而基线写 **32**：32 不可能是 `--write-baseline` 的产物 |
| d | 旧基线**无法自证**（没有源码锚点） | `baselineDrift(checkBudget(), JSON.parse(execFileSync('git',['show','HEAD:scripts/ui-budget-baseline.json']) ))` | `drift entries vs the HEAD baseline: 22`、`{"page":"general","metric":"source-hash","recorded":"missing","measured":"9541003583b9cace"}` → 默认运行 **exit 1**（修复前同一页面 exit 0 且 `regressions: 0`） |

**唯一的顺序敏感路径（潜在，非本次数值来源）**：`pageFiles()` 原先用**未排序** `readdirSync` + 以页面 **stem** 为键的 last-wins `Map` —— 若两个目录存在同名页面（`admin/x.aup` + `ops/x.aup`），被测文件取决于文件系统列举顺序（跨机器可变）。实测当前**无重名**（`find .aup/pages -name '*.aup' | … | uniq -d` 空输出），故它**不是** `32` 的来源；但它已修，因为这是该工具唯一的顺序敏感输入。

**输入封闭性（正面回答「是否读了会变化的运行时/时间/顺序敏感字段」）**：`measure()` 的输入只有一条源码字符串；`checkBudget()` 只多读两样 —— `.aup/pages/**/*.aup` 的**字节**与 `scripts/console-nav.mjs` 的 `CONSOLE_SECTIONS`（页面集合与顺序）。全工具不读时钟 / 随机 / AFS 实例 / daemon / 网络：

```text
$ grep -nE "Date\.now|new Date|Math\.random|process\.env|hrtime|performance\.now" scripts/arcblog-ui-budget.mjs
（无输出，exit 1）
```

页面源码里的 `${generate.timeiso}` 对工具而言只是**字面文本**（工具不做 AUP 求值）。因此一个页面的测量只能因「该文件字节变化」或「页面集合变化」而变：前者由 `_sources` 锚定，后者由既有用例 `covers every console page plus the sidebar-less sub-page` 锚定。

### 1.1 §1 表格里 (b) 的复现命令

```bash
$ node --input-type=module -e "
import { execFileSync } from 'node:child_process';
import { checkBudget } from './scripts/arcblog-ui-budget.mjs';
const head = JSON.parse(execFileSync('git', ['show', 'HEAD:scripts/ui-budget-baseline.json'], { encoding: 'utf8' }));
let pages = 0, stale = 0;
for (const r of checkBudget()) {
  const d = Object.keys(r.metrics).filter((k) => head[r.page][k] !== r.metrics[k]);
  if (d.length) { pages++; stale += d.length; }
  if (r.page === 'general') console.log('general', d.map((k) => k + ': recorded ' + head[r.page][k] + ' -> measured ' + r.metrics[k]).join(', '));
}
console.log('pages with >=1 stale metric:', pages, '| stale metric values:', stale);
"
general ctrl: recorded 14 -> measured 12, styles: recorded 44 -> measured 38, i18n: recorded 87 -> measured 96, tech: recorded 32 -> measured 15
pages with >=1 stale metric: 20 | stale metric values: 50
```

> 注：`i18n 87→96` 里 **+18** 是本 lane 为 BUG-077/078 新增的 i18n key（同一页面，同一批工作）；其余 `-` 方向都是本轮之前就存在的陈旧值。

### 2) 修法与重录（写范围：`scripts/arcblog-ui-budget.mjs` / `.test.mjs` / `ui-budget-baseline.json`）

1. **确定性发现**：`readdirSync(dir).sort()`；同名 stem 直接**抛错**（`duplicate page stem "dup": .aup/pages/a/dup.aup and .aup/pages/b/dup.aup — one of them is never measured`），不再静默取最后一个。
2. **可复现快照**：基线新增 `_sources`（每页源码 sha256 截断）。对**源码未变**的页面，记录值必须与实测**逐值相等**——默认运行（exit 1）与快层用例同时强制；源码已变的页面交给**棘轮**（不得变差）判定。
   - **为什么不是「基线 ≡ 实测」一刀切**：并行 lane 正在改 `index.aup` / `hub.aup`，而 `ui-budget-baseline.json` 只在本 lane 写范围。一刀切会让别人的页面改动把快层染红且他们无法自救；哈希锚定把「不变页」的精确性锁死（`general` 正属此类，本次缺陷因此永久可拦），把「已变页」交给棘轮。
3. **变更留痕**：`--write-baseline` 现在打印逐页指标 diff（REQ-034 H9 的「显式重录 + 逐控件说明」由工具产出，不再依赖手写报告）。
4. **重录**：`node scripts/arcblog-ui-budget.mjs --write-baseline` → 22 页全部刷新 + `_sources` 22 条。
   - `general`：`ctrl 14→12, styles 44→38, i18n 87→96（本 lane 新增 18 个 i18n key：BUG-077/078）, tech 32→15`；
   - 其余 19 页同样收紧（例：`dashboard cards 8→1, i18n 44→14, tech 11→0`；`media cards 9→2, styles 37→7, i18n 61→22, tech 24→2`）；共消掉 50 个陈旧值。
   - 幂等自证：紧接第二次 `--write-baseline` → `change vs the previous baseline: (no metric changed)`。

### 3) 复验命令与结果

```text
$ node scripts/arcblog-ui-budget.mjs
11/22 page(s) over budget (UI standard §2.7.2)
regressions vs baseline: 0
baseline snapshot drift (unchanged pages): 0
exit=0

$ node --test scripts/arcblog-ui-budget.test.mjs
ℹ tests 12 / pass 12 / fail 0
  新增三个用例：the measurement is pure: two independent runs are byte-identical
                the baseline is the recorded snapshot — an unchanged page cannot drift (BUG-076)
                page discovery is order-independent and fails loudly on a duplicate stem

$ node scripts/arcblog-ui-budget.mjs --write-baseline   # 幂等
wrote scripts/ui-budget-baseline.json (22 pages)
  (no metric changed)
```

**受限未验证（原因）**：`arc dsl generate --check`（生成物漂移门）与 `npm test` 全量、`npm run build` **本 lane 未跑**（lane 规则禁止，Lead 在合并点统一跑）。

**交接项（Lead）**：本 lane 重录之后若别的 lane 再改页面，该页会显示为 `stale baseline entries`（**不红**，棘轮照常生效）；只有指标**变差**时才需在该页收敛后跑一次 `node scripts/arcblog-ui-budget.mjs --write-baseline`（工具会打印逐页 diff）。

