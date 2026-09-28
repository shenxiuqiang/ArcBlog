# BUG-049: 队列里非 `.json` 的意图记录页面可见、worker 永不消费（永久 `pending`）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-049 |
| 严重级 | **P3**（`?page=categories` 意图队列的健壮性/一致性；只有直接写 AFS 才能造出来，页面自身永远写 `.json`） |
| 发现轮次 | round-18（QA `task-75` 端到端验证时误造一条无扩展名记录，顺带实测出来） |
| 关联 REQ | REQ-019-button-first-console §2.1.2（「队列 = 一条意图一个记录」）/ §3.1 A5（页面队列须与 AFS 一致） |
| 状态 | ✅ **已修复并复验通过（D38 口径）**（round-18F 复验，2026-09-28；证据 [`round-18f.md`](../test-reports/round-18f.md) §4）｜残留：页面侧无内联诊断（P3，见文末） |

## 复现命令与最小步骤

1. 前置：daemon 在跑；`?page=categories` 可达（用 admin 会话看队列卡）。
2. 往队列根写一条**没有 `.json` 后缀**的意图记录。
3. 读队列页与跑 worker，比较两边看到的条目。

```bash
cd /Users/shenxiuqiang/workspace/ArcBlog
node -e '
import("./scripts/lib/arc.mjs").then(({writeJson})=>{
  writeJson("/instance/app/arcblog/config/category-intents/qa-ext-probe",
    {id:"qa-ext-probe",action:"merge",from:"r18qa-x",to:"r18qa-y",rawFrom:"r18qa-x",rawTo:"r18qa-y",
     status:"pending",message:"",requestedVia:"qa-probe",requestedAt:new Date().toISOString()},"");
  console.log("written (no .json suffix)");
});'
node scripts/arcblog-category.mjs queue      # worker 视角
node scripts/arcblog-category.mjs apply      # 应当消费它 —— 实际不会
# 浏览器：?page=categories 的「意图队列」卡会把它显示为 pending（见下证据）
node -e 'import("./scripts/lib/arc.mjs").then(({remove,list})=>{console.log("left:",JSON.stringify(list("/instance/app/arcblog/config/category-intents","").map(x=>String(x?.id??x))));remove("/instance/app/arcblog/config/category-intents/qa-ext-probe","");console.log("cleaned")})'
```

## 期望

队列根里的记录，要么页面和 worker 都看不见，要么都被处理。页面显示的 `pending` 必须有一条真实执行路径（REQ §3.1 A5「页面所见与 `arc afs` 读到的记录一致」+ L-R18-2「不许假按钮」的同精神）。

## 实际

- 页面 `afs-list from "/instance/app/arcblog/config/category-intents"` 订阅**目录里的所有条目**，不含扩展名过滤（`.aup/pages/site/categories.aup:187`）。
- worker 的 `listIntents` → `dirFiles` **只收 `.json`**（`scripts/arcblog-category.mjs:207`），因此这样一条记录：
  - 页面队列卡里显示为 `pending`（QA 实测的那条是 `nuke` / `r18qa-src2 → r18qa-dst`）；
  - `apply` 完全不处理它（`applied: 2` 只含另外两条），记录永远停在 `pending`；
  - 只有人工点队列卡上的「清除」才能删掉。
- 页面自身写记录时总是 `${generate.timeiso}.json`，所以正常操作不会造出这种条目；但队列根是 admin 可写路径，CLI/agent/未来批次都可能写非 `.json` 名。

## 证据输出

```text
# QA 端到端脚本误写了一条无扩展名记录（r18qa-invalid）后：
$ node scripts/arcblog-category.mjs queue
{"ok":true,"path":"/instance/app/arcblog/config/category-intents","count":2,"intents":[…]}   ← 只有 .json 的两条

$ 页面「意图队列」卡真实文本（raw/REQ-019-qa-e2e.json → a5.queueText）
● merge r18qa-src → r18qa-dst 状态 applied
● remove r18qa-del → r18qa-dst 状态 applied
● remove r18qa-del → r18qa-dst 状态 noop
● merge r18qa-src2 → r18qa-nope 状态 rejected
● merge r18qa-src2 → r18qa-src2 状态 rejected
● nuke r18qa-src2 → r18qa-dst 状态 pending     ← 无扩展名那条，页面可见
$ node scripts/arcblog-category.mjs apply
{"applied":2, "intents":[ …两条 rejected… ]}   ← nuke 那条不在里面，永远 pending

$ grep -n "endsWith('.json')" scripts/arcblog-category.mjs
207:    if (name && name.endsWith('.json')) names.push(name);
$ grep -n "category-intents" .aup/pages/site/categories.aup | head -1
187:                afs-list cat-intents … from "/instance/app/arcblog/config/category-intents" {
```

退出码：0

## 影响范围

- 受影响角色：admin / CLI / agent（任何写队列根的人）
- 受影响链路：`?page=categories` 意图队列的「一条记录 = 一个可执行意图」不变量
- 数据后果：记录可写（QA 已清理自己造的那条，队列现为 0）；无数据破坏
- 可绕过：是（页面上的「清除」按钮删得掉）

## 疑似文件

- `scripts/arcblog-category.mjs:200-210`（`dirFiles` 的 `.json` 过滤）
- `.aup/pages/site/categories.aup:187`（队列订阅未过滤扩展名）
- `scripts/arcblog-tags.mjs`（同族实现，可一并检查）

> QA 不修改上述任何文件。最小修法建议：worker 侧对目录里任何条目都尝试解析（或页面侧过滤 `.json`），二者取一，避免「看得见、跑不到」。

## 复验记录（round-18F 复验，2026-09-28，QA `task-78`）—— **已解除（按 D38 口径）**

Lead 裁定 **D38**（队列根只接受 `<id>.json`；页面只写 `.json`；读取/worker 对非 `.json` 条目**显式落诊断**、不静默忽略；tags 同族一并检查）后独立复验：

1. **三处读取端都显式诊断**（QA 在三个队列根各放一条无扩展名记录，跑完删除）：
   - `node scripts/arcblog-category.mjs queue --json` → `"queueEntryIgnored":1` + `ignored:[{path:…/qa-r18f-noext, reason:"queue entries must be named <id>.json — … (D38)"}]`；`apply --json` 同。
   - `node scripts/arcblog-tags.mjs apply --json` → `"queueEntryIgnored":1` + 同形 `ignored`。
   - `ARCBLOG_CHAIN_INTENTS_PATH=<隔离队列> node scripts/arcblog-chain-worker.mjs run --json` → stderr 逐条 `queue entry ignored — <path>: <reason>` + `{"processed":[],"queueEntryIgnored":1}`（跑在**隔离队列**上，未 drain，未触发链写）。
2. **页面侧只写 `.json`**：`grep -rno 'path: "[^"]*\(intents\|chain-intents\)[^"]*"' .aup/pages/` 的 4 条队列写入路径**全部**以 `.json` 结尾（categories/tags 用 `${generate.timeiso}.json`，chain-intents 用 `pending.json`）；反查无扩展名路径为 `NONE`。
3. **tags 同族**：`scripts/arcblog-tags.mjs` 的 `readDir`/`scanQueue`（`:126-142`、`:261-279`）与 category 行为一致（已实测），`tags/items` 派生目录同样只消费 `.json`。

**残留（P3，非阻断）**：`?page=categories` 的 `afs-list` 仍订阅整个目录（无扩展名过滤），因此非 `.json` 条目**仍以 `pending` 行出现在页面上**，页面内没有内联诊断（浏览器实测：`mentionsProbe: false`、`mentionsIgnoredWord: false`，但队列卡确实渲染该行）。D38 把补救口径定为「读取/worker 显式诊断」+「页面只写 `.json`」，均已达成；这种条目只能由**直接写 AFS** 造出（页面自身永远写 `<id>.json`），故按 P3 处理。建议后续二选一：页面按扩展名过滤，或把 `queueEntryIgnored` 渲染成页内提示。

结论：**已修复并复验通过（按 D38 口径）**；页面内联诊断为 P3 残留。完整证据：[`round-18f.md`](../test-reports/round-18f.md) §4。
