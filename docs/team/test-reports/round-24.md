# round-24 QA 报告 — REQ-031 控制台收尾四项独立验证（`task-101`）

| 字段 | 值 |
| ---- | -- |
| 轮次号 | **Round 24** — QA `task-101`（`blocked_by task-100`；Lead 裁定 L-R24-1…L-R24-6） |
| 日期 | **2026-09-29** |
| REQ | [REQ-031-round24-console-completion.md](../requirements/REQ-031-round24-console-completion.md)（判据 ① W1–W4 / ② D1–D3 / ③ R1–R2 / ④ S1–S3 / R3） |
| 被测产物 | 工作区 HEAD `a600fa5` + Dev `task-100` 未提交改动：`.aup/pages/economy/policy.aup`（+156/-…）、`.aup/pages/admin/dashboard.aup`（+44）、`.aup/locales/{en,zh}.json`（各 +77）、`scripts/lib/economy.mjs`（+22/-…）、`scripts/arcblog-economy.mjs`（+12/-…）、`scripts/console-nav.mjs`（+45）、`scripts/arcblog-console-nav.mjs`（+45）、`scripts/ui-budget-baseline.json`（显式重录）；`dist/**` 由 Dev `arc blocklet build` 同步 |
| 验证人 | QA（**独立复跑；不采信 Dev 自述**） |
| 方法 | 自建探针 `raw/round-24/qa-r24-{probe,reg,empty,layout,visual,text}.mjs`（CDP `:9333`；admin 用 `login_token` cookie 注入；**每身份新建 browser context + 单 tab `Page.navigate`**，结束关闭自己的 target）；写入类验收一律 **页面点击 → `arc afs exec` 前后对比**（§29.4：toast 不是证据）；证据全部落 `raw/round-24/**`；**未跑全量 `npm run test:live`**，只定向单跑 `scripts/arcblog-economy.test.mjs`（先持 `.gate-lock`） |
| 结论 | **不放行（fail）｜阻断项 2**（BUG-066 P1、BUG-068 P1） |
| 末行机读 | `VERDICT=fail, BLOCKING=2` |

---

## 0. 结论摘要

| # | 项 | 判定 | 关键证据 |
| - | -- | ---- | -------- |
| ① | 商品管理（创建 / 改价 / 上下架） | **通过** | 页面新建 → AFS 读回 **11 字段**、值与输入逐字一致、`literal_hits=0`、`createdAt/updatedAt` 为真实 ISO；改价 `1.50→2.50` **只变 `priceAmount`+`updatedAt`**（`createdAt` 保留、orders 66→66）；行内 `public⇄private` 带 confirm 双向成功且列表行重渲染 |
| ① | 负例 fail-closed（`abc`/缺必填/重复 id） | **通过** | `priceAmount=abc` → `data-aup-invalid=true` + 零新增；空 `id` → 同；重复 create 同 id → toast `Path already exists: …` + `meta.version` 逐字不变 |
| ① | 负例 fail-closed（非法类型组合 / 词表外 visibility） | **不通过** | `type=subscription`+`periodDays=0`（**普通 UI 可达**）**落库**，`validateProduct` 判 `["periodDays must be a positive number for a subscription"]`；`eVisibility` 强制置空 → 落库 `"visibility": ""` ⇒ **BUG-066（P1）** |
| ① | W4 分页 + 布局 | **通过（1 条 P3 视觉）** | `policy.aup` 恰 1 个 `afs-list`；`policy-products-list` 仍 `pagination=manual pageSize=20`：运行期 `Page 1 of 3 / Total: 54 records`，点 Next → `Page 2 of 3` 且首行变化；行 `maxRowOver=0`、`docScrollW=0`；预设按钮行溢出卡片 44px（**BUG-069 P3**） |
| ② | Adapter 动态取（D1） | **通过** | 页面选项集 `["none","manual"]` + `required=true` == `node -e import(PAYMENT_ADAPTERS)` == `policy init --help` 的 `none\|manual`；`.aup`/`dist/.aup` 里 grep 不到字面数组 `['none','manual']`；生成块由 `console-nav --check`（在 `npm test` 内）守漂移 |
| ② | 策略可写 / Adapter 可存（D2①） | **不通过** | 点预设 + Save adapter 均弹 `Forbidden at …/active.json: network write target exists without a recoverable authority sidecar`，`meta.version` 与 `content` **逐字节不变**（`presets`/adapter 全为 no-op）⇒ **BUG-068（P1）** |
| ② | D2②–⑤ 比例口径 / 不删历史 / Protocol Fee | **部分通过（受限）** | 5 个预设按钮标签即是和为 1 的完整三元组（静态 + DOM 双证，逐个 0.80/0.15/0.05…1/0/0）；`policies/` 记录数恒 1（零改动）；页面明文标注「无 `protocolRecipient` 字段，不编造」（DOM 原文）；**「合法值真的落库」受限未验证**（同 D2①） |
| ② | D3 收款账户（D-R24-1(b)） | **通过** | 页面 **0 个地址 input**（`addressInputs=[]`，全部 input 名 `eAdapter/ePid/…/eEditPrice`）；常驻文案写明无 AFS 落点 + CLI 指引；明文拒绝助记词/私钥/种子（DOM 原文命中） |
| ③ | R1 网络概览 | **通过** | 网络卡 DOM == `node/health.json.hubs` `{5,1,4}` 与 `node/discovery.json`（DID/roles/transport）逐值一致；`endpoint:""` 渲染平台破折号 `—`（**不伪造 0/绿灯**）；临时抽掉 `hubs` 造 stale 场景 → 三行全 `—`、无 `0`、无绿灯，随后 `rawEqual=true` 复原；`dashboard.aup` 新增 `.actions/write` = **0** |
| ③ | R2 异常提醒条一次点击直达 | **通过** | 三条提醒（`Hub sync`、`Settlement / ledger`、`Agent grants`）均在；真实点击 `Hub sync` → URL `/?page=hub` 且 hub 侧 `active=1/aria=1/failed=false/over=0`；新增 `visible` 条件 = **0**（`git diff` 唯一命中是解释性注释） |
| ④ | 设置-角色与能力（S1–S3） | **未交付（如实登记，按 REQ §6.4 不算 fail）** | 无 `.aup/pages/**/roles.aup`；`factory.aup` 零改动；`CONSOLE_PAGES=21`（未变 22）；全仓 grep 无 `role-verify-intents` / `lastVerifiedAt` 写入路径 |
| R3 | 门全绿 + 21 页零回归 | **通过** | `validate issues=[]`；`npm test` **36/36**（无测试文件改动，基线未降）；定向 live `scripts/arcblog-economy.test.mjs` **43/43**（残渣 46 条已逐条清回轮初）；`generate --check` 0 漂移；`console-nav --check pages 21`；build 成功且 `diff -r .aup dist/.aup` / `diff -r .web dist/.web` 均 rc=0；**21/21 页 `active=1`+`aria-current=1`、0 `SESSION INIT FAILED`、`docScrollW=0`**；R23 分页（policy/ledger/dashboard）与 R21 队列按钮/行内动作在 |
| R3 | 零密钥 / 零链写 | **通过（但发现范围外密钥面）** | `.aup/**` 无密钥内容（只命中「本页不存私钥」文案）；`node.key` 字节只出现在 `dist/node.key` 一处；本轮**零链写**（`config/chain-intents` 6 条前后不变，未跑 `run/watch`）；**范围外**：`arc blocklet build` 把 `node.key`+`.env.local` 复制进 `dist/` 并列进 `dist/.afs/manifest.json` ⇒ **BUG-067（P1，范围外·既有，不构成本轮阻断）** |

**新增 BUG**：[BUG-066](../bugs/BUG-066-policy-create-bypasses-product-validation.md)（**P1**，阻断）、[BUG-068](../bugs/BUG-068-policy-write-refused-on-cli-created-record.md)（**P1**，阻断）、[BUG-067](../bugs/BUG-067-blocklet-build-mirrors-node-key-and-env-local.md)（P1，范围外·既有，需单独裁决）、[BUG-069](../bugs/BUG-069-policy-preset-row-overflows-card.md)（P3）。**无未裁决 P0。**

---

## 1. 被测产物与 Dev 自述的核验方式

| 产物路径 | Dev 自述 | QA 核验方式 | 结论 |
| -------- | -------- | ----------- | ---- |
| `.aup/pages/economy/policy.aup` | 新建（`mode=create`，11 字段）/ 改价（`tree-merge` 只写 `priceAmount`）/ 逐行上下架（`tree-merge` 只写 `content.visibility`，带 confirm） | 源码 grep + 运行期真实点击 + `arc afs exec read` 前后逐键 diff | 通过（负例见 BUG-066） |
| 同上 · 策略卡 | 适配器由 `PAYMENT_ADAPTERS` 生成；5 个预设 = 和为 1 的三元组；Protocol Fee 诚实标注；收款账户只读 | 独立 `node -e import()` 取 `PAYMENT_ADAPTERS`；DOM 选项集/按钮标签；`policy init --help`；点击验证（拒绝文案 + version 不变） | D1 通过；D2① 不通过（BUG-068） |
| `.aup/pages/admin/dashboard.aup` | 网络卡 + 提醒条，只读零写路径 | DOM 文本 vs AFS 逐值；点击跳转；`git diff` 统计新增 `/.actions/write`/`visible`；stale 场景抽掉 `hubs` | 通过 |
| `.aup/locales/{en,zh}.json` | 新增 policy/dashboard 键 | `npm test` 的 i18n 门 + 运行期正文断言（新文案在） | 通过 |
| `scripts/lib/economy.mjs` / `scripts/arcblog-economy.mjs` | `PAYMENT_ADAPTERS` 单一真源；`PRODUCT_VISIBILITIES` 抽出（纯重构） | `node -e import()` 取真值 + `policy show`/`product list`/`product show` 只读回归 + **定向单跑 `scripts/arcblog-economy.test.mjs`**（§3.6） | 通过 |
| `scripts/console-nav.mjs` / `scripts/arcblog-console-nav.mjs` | 第二个受门禁生成块（`economy-adapters:begin/end`），`--check` 覆盖适配器漂移 | 独立跑 `adapterOptionLines(4)` 与 `.aup` 块逐字比对；`console-nav --check`（`npm test` 内） | 通过 |
| `scripts/ui-budget-baseline.json` | 显式重录 policy/dashboard | `git diff` 逐键核对 + `node scripts/arcblog-ui-budget.mjs`（`regressions vs baseline: 0`） | 通过（见 §7） |
| `dist/**` | Dev 已 `arc blocklet build` | `arc blocklet build --output /tmp/r24-build` + 三组 `diff -r`（仓库 `dist/` 未被 QA 改动） | 通过 |
| ④ 角色与能力 | **未交付**（余量不足） | `ls .aup/pages/**/roles.aup`；`git diff factory.aup`；`CONSOLE_PAGES`；grep 写入路径 | 未交付（不算 fail） |

> **QA 的 `dist` 写范围说明**：QA 角色卡不允许写 `dist/**`，因此 build 一律 `--output /tmp/r24-build`；仓库 `dist/` 本轮未被 QA 触碰（`diff -r .aup dist/.aup` 因此是「Dev 的 dist vs 源码」的核对）。

---

## 2. 逐条验收结论表

### 2.1 ① 商品管理 — W1 / W2 / W3 / W4

| # | 验收标准（REQ 原文要点） | 结论 | 证据（原始） |
| - | ------------------------ | ---- | ------------ |
| W1 | 创建真的落库且字段合规：11 字段、值 == 输入、`creatorDid` 真实 DID、literal_hits=0 | **通过** | `qa-r24-all.json` → `steps.w1`；见 §4.1 |
| W2 | 编辑 = 最小写入面：只改目标字段、其余逐字节不变、`updatedAt` 刷新、`createdAt` 保留；orders 不受影响 | **通过** | `changed=['priceAmount','updatedAt']`、`createdAt same=true`、`orders 66→66`；见 §4.2 |
| W3 | 负例 fail-closed ≥3 条，拒绝 + 说明 + 零改动 | **部分通过** | ① `abc` ✅；② `visibility=hidden` 用户不可表达（受控 select 仅两值）✅ 但**词表外置空可落库** ❌；③ 重复 create ✅；④ 另发现 `subscription+periodDays=0` 可落库 ❌ ⇒ **BUG-066**；见 §5 |
| W4 | `afs-list` 数 = 1；`pagination=manual pageSize=20`；`total>pageSize` 分页器可点；行不溢出 | **通过** | `grep -c 'afs-list' policy.aup` = 1；DOM `Page 1 of 3 / Total: 54 records` → 点 Next `Page 2 of 3` 首行变化；`maxRowOver=0`、`docScrollW=0`；见 §6.2 |

### 2.2 ② 策略与账户 — D1 / D2 / D3

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| D1 | Adapter 选项动态取、不写死；`--check` 守漂移 | **通过** | `PAYMENT_ADAPTERS=["none","manual"]`（node 导入）== `policy init --help` 的 `none\|manual` == DOM 选项集（`required=true`）；`grep` 字面数组 = 0；见 §4.3 |
| D2① | 合法三值 → 落 `active.json`，读回逐值一致 | **不通过** | 点 `0.90/0.05/0.05` → confirm → toast `Forbidden … authority sidecar`，`meta.version` 不变、`content` 逐字节不变 ⇒ BUG-068 |
| D2② | 和不合法（如 0.5/0.5/0.5）→ 拒绝 + 零改动 | **通过（结构性）** | 页面**只有 5 个固定三元的按钮，没有任何数值输入**（DOM input 名单 `eAdapter/ePid/eCreator/eType/eContent/ePrice/eAsset/eVisibility/ePolicy/ePeriod/eEditId/eEditPrice`，无数值比例输入）⇒ 非法和在本页不可表达；`validateSettlementPolicy` 的强制在 CLI 侧 |
| D2③ | 单值越界 → 拒绝 | **通过（同上）** | 同上，本页不可表达 |
| D2④ | `policies/` 记录数不减少 | **通过** | 前后 `policies` = 1（只有 `active.json`） |
| D2⑤ | `policy show` 与页面读回逐值一致 | **通过** | `policy show` 输出 `{version:v1,creator:0.8,hub:0.15,protocol:0.05,paymentAdapter:none}` == 页面 DOM 读回 == `active.json` |
| D2-PF | Protocol Fee 非 0 时展示 recipient；无字段则如实标注 | **通过** | DOM 原文：`this record has no protocolRecipient field, so the console shows the protocol share only — there is no recipient to display, and none is invented.` |
| D3 | 收款账户按 D-R24-1(b)：只读 + CLI 指引，无地址 input，明文拒绝助记词/私钥/种子 | **通过** | `addressInputs=[]`；DOM 原文含 `There is no address <input> on this page, on purpose…` 与 `This page never accepts or stores a mnemonic, private key or seed phrase.`；见 §4.4 |

### 2.3 ③ Dashboard — R1 / R2

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| R1 | 网络卡 total/fresh/offline == `health.json.hubs`；写明来源；`hubs` 缺失 → 「尚无数据」，不得 0/绿灯；零写路径 | **通过** | DOM `Hubs registered 5 / Hubs fresh 1 / Hubs offline 4` == AFS `{total:5,fresh:1,offline:4}`；`Node DID did:blocklet:arcblog`、`Roles basic`、`Transport afs,mcp` == `discovery.json`；`source` 文案在；stale 场景见 §4.5；`git diff` 新增 `/.actions/write` = 0 |
| R2 | 提醒条可点击直达（不得用 list select 导航）；不可计算的计数如实标注；新增 `visible` = 0 | **通过** | 三条均渲染（`linkHub/linkLedger/linkAgents=true`）；真实点击 `Hub sync` → `/?page=hub`；文案 `This bar counts nothing…`；`git diff` 新增 `visible=` 命中 0（唯一命中是注释 `// deliberately without any \`visible=\` condition`） |

### 2.4 ④ 设置-角色与能力 — S1 / S2 / S3（**未交付，按 REQ §6.4 判**）

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| S1 | 只读展示 `config/roles.json`，无手填地址 | **未交付** | `ls .aup/pages/**/roles.aup` → `No such file or directory`；`git diff .aup/pages/ops/factory.aup` 为空 |
| S2 | 「重新验证」真实消费路径 | **未交付** | 全仓 `grep -rn "role-verify-intents\|lastVerifiedAt"` 只命中无关文案（agents 页的「Re-run the CLI to re-verify」） |
| S3 | 方案 (a) pages 21 / (b) pages 22 + 基线显式 | **未交付**（保持 (a) 之外的现状） | `node -e "CONSOLE_PAGES.length"` = **21**；`console-nav --check` pages 21；`ui-budget-baseline.json` 无新页条目 |

> **判定**：REQ §6.4 明文「未交付（余量不足）时登记『受限未完成 + 原因』，**不算 fail**」。Dev 已在其回报里如实登记（原因：需要新增「重新验证」的真实消费路径 + 页面/侧栏落点，成本超出本轮余量）。**QA 接受该登记，不列入阻断。**

### 2.5 R3 零回归

| # | 判据 | 结论 | 证据 |
| - | ---- | ---- | ---- |
| R3-1 | 门全绿 | **通过** | §3.1–§3.5 |
| R3-1b | 受影响 live 文件定向回归 | **通过** | `npm run test:file -- scripts/arcblog-economy.test.mjs` → **43/43 / 0 fail**（654.6s）；残渣已清（§3.6） |
| R3-2 | 21/21 页恰 1 active、无 `SESSION INIT FAILED`、无横向溢出 | **通过** | `qa-r24-all.json` → `steps.audit`：21 页 `active=1 aria=1 failed=false over=0` |
| R3-3 | R23 分页不坏（含 policy/dashboard） | **通过** | policy `Page 1 of 3/54` → 点 Next `Page 2 of 3` 首行 `econ-test-fc-product-…746` → `econ-test-rf-product-…796`；ledger `1 of 5/84` → `2 of 5`；dashboard orders `1 of 7/66` → `2 of 7` |
| R3-4 | R21 队列与行内动作在 | **通过（按钮/入口存在性；未跑 worker）** | hub：`Apply/Index a Studio/Rebuild index/Approve/Intent queue` 均 true；categories：`Merge into…/Delete and migrate to…` 均 true。**未触发任何入队写**（避免污染实例；hub/categories 页面本轮零改动，`git diff` 可证） |
| R3-5 | 零链写 | **通过** | 未跑 `chain-worker run/watch`；`config/chain-intents` 前后均 6 条 |
| R3-6 | `.gate-lock` 与 dist 镜像清理 | **通过** | 见 §8.3 |

---

## 3. 执行的原始命令与结果摘录

原始输出：`raw/round-24/01-validate.json`、`02-npmtest.txt`、`03-generate-check.txt`、`04-console-nav-check.txt`、`05-build-tmp.txt`、`06-dsl-lint.txt`、`07-ui-budget.txt`、`09-economy-live.txt`。

### 3.1 `arc dsl validate --json` → `issues: []`

```text
$ arc dsl validate --json
  "issues": []
}
exit=0
```

### 3.2 `npm test` → 36/36（无测试文件改动，基线未降）

```text
$ npm test
✔ ratchet: no page is worse than scripts/ui-budget-baseline.json (0.10725ms)
ℹ tests 36
ℹ suites 0
ℹ pass 36
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1174.511834

fast tier passed — this is the gate. …
exit=0
```

**基线未降的逐文件证明**（`git diff --stat -- scripts/*.test.mjs` 为空；HEAD 与 now 逐文件 `^test(` 计数）：

```text
scripts/arcblog-console-nav.test.mjs  HEAD=7 now=7
scripts/arcblog-ui-budget.test.mjs    HEAD=7 now=7
scripts/arcblog-runtime-ids.test.mjs  HEAD=4 now=4
```

### 3.3 `arc dsl generate --check` → 0 漂移

```text
Would generate 0 file(s) (dry-run) — nothing to change
  path: /Users/shenxiuqiang/workspace/ArcBlog
  files: 7
exit=0
```

### 3.4 `node scripts/arcblog-console-nav.mjs --check` → pages 21

```json
{
  "ok": true,
  "action": "check",
  "pages": 21
}
exit=0
```

### 3.5 `arc blocklet build`（输出到 `/tmp`）+ 三组 `diff -r`

```text
$ arc blocklet build --output /tmp/r24-build
… Next: arc blocklet run /Users/shenxiuqiang/workspace/ArcBlog
exit=0

$ diff -r .aup dist/.aup      ; echo rc=$?     → （无输出）rc=0
$ diff -r .web dist/.web      ; echo rc=$?     → （无输出）rc=0
$ diff -r .aup /tmp/r24-build/.aup ; echo rc=$? → （无输出）rc=0

$ diff -rq dist /tmp/r24-build
Files dist/.afs/manifest.json and /tmp/r24-build/.afs/manifest.json differ
Only in /tmp/r24-build/docs/team: .gate-lock
Only in /tmp/r24-build/docs/team/test-reports/raw: round-24
```

> 这 3 处差异**全部由 QA 自己的临时文件造成**（QA 持 `.gate-lock` 并把证据写进 `docs/team/test-reports/raw/round-24/`），`dist/.aup`、`dist/.web`、`dist/scripts` 与源码逐字节一致（`cmp` 逐个 SAME）。**仓库 `dist/` 未被 QA 写。**

### 3.6 定向单跑 `scripts/arcblog-economy.test.mjs`（受影响 live 文件，持 `.gate-lock`）

```text
$ npm run test:file -- scripts/arcblog-economy.test.mjs     # 先写 docs/team/.gate-lock
ℹ tests 43
ℹ suites 0
ℹ pass 43
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 654591.96675
exit=0
```

与 Dev 自述（43 tests / 43 pass）逐值一致；`scripts/lib/economy.mjs` / `scripts/arcblog-economy.mjs` 的改动在 live 侧无回归。

**残渣清理（QA 自证）**：该文件写共享实例。跑前快照 `08-integrity-before-live.json` vs 跑后：新增 **46** 条（products +9 / orders +11 / settlements +6 / ledger +14 / access-grants +5 / refunds +1，全部命中时间戳 `179064[5-9]xxxxx`），逐条 `actions/delete` **并逐条 `read` 复核返回 `NOT_FOUND`**（44 + 2 条）后回到轮初：`54 / 66 / 38 / 84 / 30 / 6`，`policies 1`、`hub/registrations 5`、`config/chain-intents 6`、`active.json` `meta.version` 逐字不变（`1790161669932.8792-155467735-189`）；残留扫描 `today-stamp=0 / qa24=0`。

> **操作提示（本轮踩到）**：`arc afs exec` 会从 **stdin** 读 `--args`；在 `while read rel < list …` 循环里必须给 `arc` 加 `</dev/null`，否则它会拿到列表文本并报 `ERROR: Invalid JSON in stdin: JSON Parse error: Unexpected identifier "economy"`——QA 第一次循环 46 条「报告成功」实为**全部失败**，改用「逐条 delete + 逐条 read 复核」后重跑才真正删除。凡按 id 列表批量操作 AFS 的脚本都要注意这一点。

### 3.7 `arc dsl lint`（只读，**未用 `--fix`**）

```text
$ arc dsl lint
… WARNING unreferenced_explicit_id …       # 79 条 WARNING
$ grep -c WARNING → 79 ; grep -c dead_locale_keys → 0
exit=0
```

---

## 4. 运行期证据（页面点击 → AFS 前后对比）

探针：`raw/round-24/qa-r24-probe.mjs`（phase `all`）、`qa-r24-reg.mjs`、`qa-r24-empty.mjs`、`qa-r24-layout.mjs`、`qa-r24-visual.mjs`、`qa-r24-text.mjs`；输出 JSON 同名。**全部单 tab、每身份新 context、结束关闭自己的 target**（各 JSON 的 `targetsAfterFiltered` 均为 `[]`）。

### 4.1 W1 新建（`steps.w1`）

```text
fill  : {"id":"qa24-1790645607381","creator":"did:blocklet:arcblog","type":"article","content":"",
         "price":"1.50","asset":"USDC","visibility":"public","policy":"active","period":"0"}
click : clicked:Create product
invalid: []
before 54 → after 55 ; hasPid true ; fieldCount 11 ; literalHits 0
fields: {"id":"qa24-1790645607381","creatorDid":"did:blocklet:arcblog","type":"article","contentId":"",
         "priceAmount":"1.50","priceAsset":"USDC","visibility":"public","settlementPolicy":"active",
         "periodDays":"0","createdAt":"2026-09-29T01:33:34.603Z","updatedAt":"2026-09-29T01:33:34.603Z"}
```

（`createdAt` 是**真实 ISO 时间**，不是 `${generate.timeiso}` 字面量。）

### 4.2 W2 改价（`steps.w2`）

```text
before: priceAmount "1.50", createdAt "…01:33:34.603Z", version 1790645614610.1897-157493779-326
after : priceAmount "2.50", createdAt "…01:33:34.603Z", updatedAt "…01:33:44.023Z", version 1790645624031.0918-157493779-281
changedKeys: ['priceAmount','updatedAt']      # 其余 9 键逐字节不变
orders: 66 → 66
```

### 4.3 行内上下架（`steps.w3`）

```text
find-row: rowPage 3            # 目录已分页：qa24 排在第 3 页（total 55 时）
delist : clicked-row:Delist → confirm dialog "Take this product offline? … Cancel | Delist"
after-delist : visibility "private", diff ['visibility','updatedAt']
publish: clicked-row:Publish → confirm dialog "Publish this product? … Cancel | Publish"
after-publish: visibility "public", diff ['visibility','updatedAt']
list rerender: row text "qa24-1790645607381 | Price 2.50 USDC | type article | visibility public | just now | Publish | Delist"
```

### 4.4 ② D1–D3 运行期

```text
adapter : {"value":"none","required":true,"options":["none","manual"]}
presets : ["0.80 / 0.15 / 0.05","0.90 / 0.05 / 0.05","0.95 / 0.03 / 0.02","0.70 / 0.25 / 0.05","1.00 / 0.00 / 0.00"]
addressInputs: []
inputs  : eAdapter,ePid,eCreator,eType,eContent,ePrice,eAsset,eVisibility,ePolicy,ePeriod,eEditId,eEditPrice
protocolNote: "…this record has no protocolRecipient field, so the console shows the protocol share only — there is no recipient to display, and none is invented."
secretRefusal: "This page never accepts or stores a mnemonic, private key or seed phrase. The node key stays on the node…"
account copy : "Payout account: this platform has no AFS landing spot for an account address — world/settlement-policy.yaml declares no address field…"

预设点击 → confirm "Apply this split?" → toast:
  Forbidden at /instance/app/arcblog/economy/policies/active.json: network write target exists without a recoverable authority sidecar
  active.json version 1790161669932.8792-155467735-189 → 同（逐字不变），content 同
Save adapter（选 manual）→ 同一 toast；version 同；policies count 1 → 1
```

**独立取 `ADAPTERS`（不采信页面）**：

```text
$ node -e "import('./scripts/lib/economy.mjs').then(m=>console.log(JSON.stringify(m.PAYMENT_ADAPTERS)))"
["none","manual"]
$ node scripts/arcblog-economy.mjs policy init --help | grep payment-adapter
  … [--payment-adapter none|manual] [--update]
$ grep -rn "'none', 'manual'" .aup/ dist/.aup/   → （无匹配，rc=1）
```

### 4.5 ③ R1/R2 运行期

```text
DOM 网络卡: Hubs registered 5 / Hubs fresh 1 / Hubs offline 4 / Node DID did:blocklet:arcblog /
            Endpoint — / Roles basic / Transport afs,mcp
AFS       : health.hubs {total:5,fresh:1,offline:4}; discovery.node.did did:blocklet:arcblog;
            roles ["basic"]; transport ["afs","mcp"]; endpoint ""
点击 Hub sync → url "/?page=hub" active=1 ariaCurrent=1 sessionFailed=false docScrollW=0

stale 场景（抽掉 health.hubs，随后 rawEqual=true 复原）:
  Hubs registered — / Hubs fresh — / Hubs offline — / (discovery 值已解析) Node DID did:blocklet:arcblog / Endpoint — / Roles basic / Transport afs,mcp
  ⇒ 空值渲染平台破折号，既不是 0 也没有绿灯
  复原: {"equal":true,"rawEqual":true}；version 1790645901722.223… → 1790645922921.3152…（内容逐字节同）
```

### 4.6 `git diff` 的写入面证据

```text
$ git diff .aup/pages/admin/dashboard.aup | grep -c '^+.*\.actions/write'   → 0
$ git diff .aup/pages/admin/dashboard.aup | grep -c '^+.*visible='          → 1（唯一命中是注释）
$ git diff .aup/pages/admin/dashboard.aup | grep -n '^+.*visible'
  41:+              // deliberately without any `visible=` condition: the dashboard
$ grep -o 'path: "/instance/app/arcblog/[^"]*"' .aup/pages/economy/policy.aup | sort | uniq -c
  6 path: "/instance/app/arcblog/economy/policies/active.json"
  1 path: "/instance/app/arcblog/economy/products/${args.eEditId}.json"
  1 path: "/instance/app/arcblog/economy/products/${args.ePid}.json"
⇒ 三个落点全部在 `blocklet.yaml` 已声明的 `replicated.{economy-policy,economy-products}`（minRole: admin）内
```

---

## 5. 负例证据（fail-closed）

| # | 负例 | 期望 | 实际 | 判定 |
| - | ---- | ---- | ---- | ---- |
| N1 | `priceAmount=abc`（新 id） | 拒绝 + 零新增 | `data-aup-invalid=[{name:"ePrice",value:"abc"}]`；`read` → `NOT_FOUND`；count 55→55 | **通过** |
| N2 | 空 `id`（缺必填） | 拒绝 + 零新增 | `data-aup-invalid=[{name:"ePid",value:""}]`；count 不变 | **通过** |
| N3 | `visibility=hidden` | 拒绝 + 零改动 | 受控 select 只有 `public/private`（用户不可选 hidden）**但**强制置空后**落库 `"visibility":""`**，`validateProduct` → `["visibility must be public or private"]` | **不通过（BUG-066 次表现）** |
| N4 | 重复 create 同 id | 明确拒绝 + 记录逐字不变 | toast `Path already exists: /app/arcblog/economy/products/qa24-…json`；`meta.version` 前后同为 `1790645652500.5269-157493779-281`；`content.priceAmount` 仍 `2.50` | **通过** |
| N5 | `type=subscription` + `periodDays=0`（普通 UI 可达） | 拒绝 + 零新增 | **落库**；`validateProduct` → `["periodDays must be a positive number for a subscription"]` | **不通过（BUG-066 主表现）** |

对照（平台级 prop 是有效的）：N1/N2 证明 `required`/`pattern` 由平台强制；N3/N5 的缺口是**交叉字段规则**与 `select` 的 `required`。

---

## 6. 零回归实测

### 6.1 21/21 页

```text
audit dashboard: active=1 aria=1 failed=false over=0
audit posts / pages / compose / heroes / categories / tags / seo / feeds / appearance /
      operations / hub / media / agents / orders / policy / access / ledger / factory /
      general / diagnostics : 全部 active=1 aria=1 failed=false over=0
```

### 6.2 R23 分页（真点击）

```text
policy-products-list : "Page 1 of 3" / "Total: 54 records" → 点 "Next →" → "Page 2 of 3"，
                       first entry econ-test-fc-product-1790621430746.json → econ-test-rf-product-1790622757396.json
                       url …/?page=policy&policy-products-list.page=2
ledger-list          : "Page 1 of 5" / "Total: 84 records" → "Page 2 of 5"，first 变化
dashboard-orders-list: "Page 1 of 7" / "Total: 66 records" → "Page 2 of 7"，first 变化
```

### 6.3 R21 入口（存在性；**未入队、未跑 worker**）

```text
hub        : {"apply":true,"indexStudio":true,"rebuild":true,"approve":true,"queueTitle":true}
categories : {"merge":true,"remove":true}
```

### 6.4 布局

```text
policy page @1803×908: doc {scrollW:0, scrollH:908, clientH:908};
                        rows 20, maxRowOver 0;
                        presetRow over=44、相邻卡 bleed 14px（BUG-069 P3）
```

---

## 7. UI 预算（显式重录，可解释）

`scripts/ui-budget-baseline.json` 的 `git diff`（**只增不减口径**，无静默抬升）：

```diff
 "dashboard": { "cards": 6→8, "ctrl": 4→7, "styles": 29→36, "i18n": 26→43, "tech": 9→11 }
 "policy":    { "ctrl": 0→23, "styles": 12→28, "i18n": 12→70, "tech": 6→21 }
```

`node scripts/arcblog-ui-budget.mjs`：

```text
page                 blocks cards nest ctrl styles i18n tech   over-budget
dashboard                 2     8    0    7     36   43   11   cards,styles,i18n,tech
policy                    1     3    0   23     28   70   21   cards,ctrl,styles,i18n,tech
19/22 page(s) over budget (UI standard §2.7.2)
regressions vs baseline: 0
exit=0
```

**可解释性**：`ctrl` 的口径是「内容列里以 `action`/`input` 开头的声明行」（`scripts/arcblog-ui-budget.mjs:73/226`）。policy 从 0 到 **23** 恰为新增控件：5 个预设按钮 + 适配器 `select` + `Save adapter` + 行内 `Publish`/`Delist` 两行 + 每行隐藏 `ePath` + 新建表单 9 个 `input` + `Create product` + 改价表单 2 个 `input` + `Save price` = 23；dashboard 4→7 恰为提醒条 3 个 `action`。ratchet `regressions vs baseline: 0`。

---

## 8. 零密钥 / 零链写 / 清理自证

### 8.1 `.aup/**` 无密钥面

```text
$ grep -rniE "mnemonic|private[_ ]?key|seed ?phrase|BEGIN [A-Z ]*PRIVATE" .aup/
.aup/locales/en.json:934:  "policy.account-secret-refusal": "This page never accepts or stores a mnemonic, private key or seed phrase. …"   ← 说明性文案
.aup/pages/economy/policy.aup:7:    account-secret-refusal { … }                                                                          ← 同
$ node.key 字节扫描（.aup/ .web/ pages/ world/ scripts/）→ 0 命中；全仓唯一含 node.key 字节的文件是 dist/node.key（BUG-067）
```

**范围外发现**：`dist/node.key`（私钥）+ `dist/.env.local`（链助记词）与 `dist/.afs/manifest.json` 的条目 ⇒ **BUG-067**（详见该文件；范围外·既有，未计入本轮阻断）。

### 8.2 零链写

未执行 `chain-worker run/watch`、未执行任何 `chain`/`order pay`/`settle`。`config/chain-intents` 前后均 **6** 条；`world/**`、`node/factories.json` 未被改动（`git status` 无对应条目）。

### 8.3 清理自证

```text
$ ls docs/team/.gate-lock            → （验证结束时删除，见末行说明）
$ ls dist/docs/team/.gate-lock       → No such file or directory
$ find dist -name '.gate-lock'       → （空；build 输出到 /tmp，镜像只可能落在 /tmp/r24-build）
$ git status --porcelain | grep dist/node.key   → （空）
```

> **提交注意（非阻断）**：本轮 `arc blocklet build` 把**尚未提交的 PM/Lead 文档**镜像进了 `dist/**` —— `git status` 显示 `M dist/docs/team/backlog.md`、`M dist/docs/team/journal/README.md`、`?? dist/docs/team/journal/round-24.md`、`?? dist/docs/team/requirements/REQ-031-…md`、`?? dist/docs/dsh-workflow-and-ralph.md`（Dev 已上报，取舍由 Lead 决定）；QA 自己新增的 `docs/team/bugs/BUG-06*.md`、`docs/team/test-reports/round-24.md` 与 `raw/round-24/**` **尚未**被镜像（QA 的 build 输出到 `/tmp`），Lead 最终 build 时会自然纳入。

QA 创建的实例记录全部定向删除（**逐条 `read` 复核 `NOT_FOUND`**）：

```text
qa24-1790645607381.json / qa24-hidden-… / qa24-sub-…  → actions/delete 成功 + read 复核 NOT_FOUND
qa24-bad-…                                            → NOT_FOUND（从未创建，正是 N1 的期望）
定向 live 单跑残渣 46 条（时间戳 179064[5-9]xxxxx）    → 逐条 delete + 逐条 read 复核 NOT_FOUND
economy/products 54（轮初 54）; orders 66; settlements 38; ledger 84; access-grants 30; refunds 6;
economy/policies 1; hub/registrations 5; config/chain-intents 6（未跑链）
active.json meta.version = 1790161669932.8792-155467735-189（逐字同轮初）
node/health.json：stale 场景探针写后 rawEqual=true 复原（content 逐字节同，version 因写入而变）
```

---

## 9. 新增 BUG 列表

| BUG | 级别 | 标题 | 是否阻断本轮 |
| --- | ---- | ---- | ------------ |
| [BUG-066](../bugs/BUG-066-policy-create-bypasses-product-validation.md) | **P1** | `?page=policy` 新建商品不做记录级校验：`subscription+periodDays=0`（UI 可达）与词表外 `visibility` 均落库 | **是** |
| [BUG-068](../bugs/BUG-068-policy-write-refused-on-cli-created-record.md) | **P1** | ② 策略/适配器写路径在本实例全部零改动（平台 §29.2 拒绝 CLI 创建的 `active.json`） | **是** |
| [BUG-067](../bugs/BUG-067-blocklet-build-mirrors-node-key-and-env-local.md) | P1（范围外·既有） | `arc blocklet build` 把 `node.key`/`.env.local` 复制进 `dist/` 并列进 `dist/.afs/manifest.json` | 否（需单独裁决） |
| [BUG-069](../bugs/BUG-069-policy-preset-row-overflows-card.md) | P3 | 策略卡 5 个预设按钮不换行，1803 宽下溢出 44px 压到相邻卡边界 | 否 |

**无未裁决 P0。**

---

## 10. 受限未验证（如实登记）

| # | 项 | 原因 | 已有替代证据 |
| - | -- | ---- | ------------ |
| 1 | D2①「合法三值真的落 `active.json`」的**正例** | 本实例唯一策略记录由 CLI 创建，平台 §29.2 拒绝任何浏览器重写（实测 toast 原文）；要造正例必须删掉 `active.json` 再由页面创建，属破坏共享实例 | 反面证据完整（拒绝文案 + version/content 零改动）；页面自建商品记录的同种 `tree-merge` 写成功（W2/W3） |
| 2 | 已存在的 54 条 CLI 商品目录的**行内上下架/改价** | 同上（§29.2 只允许重写「本页自己创建」的记录）；QA 未对这 54 条点 Delist（避免误改存量），只以「`qa24-*` 自建记录写成功 vs `active.json` 被拒」作对照 | 页面已用 `policy.write-guard` 常驻文案写明该边界 + CLI 出路；Dev 自述对 CLI 商品点击得到同一 sidecar 拒绝（**未由 QA 复跑**） |
| 3 | 「`hubs` 缺失显示『尚无数据』」的**字面文案** | 页面用 `key-value-list` 的空值渲染（平台 `—`），没有自定义「尚无数据」字串；实测为 `—` 且无 0/绿灯 | stale 场景 DOM 原文 + `rawEqual=true` 复原 |
| 4 | propBind 首屏就绪性（BUG-036/062 同族） | 在本套探针里**稳定可复现**：新 context 的**第一次**导航直载 `?page=policy` / `?page=dashboard` 时，`propBind` 值全为平台破折号 `—`（`qa-r24-layout.json` 的 strategyCard 文本 7 值全 `—`；`qa-r24-empty.json` 的 pass 1） | **两步取数**（先 `?page=hub` 再目标页，或刷新）后值立即出现，且与 AFS 逐值一致：网络卡 `5/1/4`、策略卡 `v1/0.8/0.15/0.05/none`（`qa-r24-visual.json`、`qa-r24-all.json` 的 `steps.dash`）。⇒ 页面 `net-empty-note` 的「破折号 = 记录没有该值 / 绑定尚未解析，切页或刷新即出现」文案与实测一致；**该条只影响首屏时序，不影响取值真实性** |
| 5 | 运行期 `restart + 复挂 + /instance 读证明` | 会打断共享实例与其他成员；QA 未自行 restart | 运行期已生效（新页面/新文案在线）＋ Dev 记录的 pid 82171；本报告实测的 `/instance` 读全部成功 |
| 6 | R21 worker 半程（`hub network apply`） | 会写实例；hub 页面本轮零改动 | 入口存在性 + `git diff` 无 hub/categories 改动 |
| 7 | Payment Adapter 真链 / ④ 链上重新验证 | 需花钱批准（REQ-021 P2-a） | 按范围不做 |

---

## 11. 放行结论

**不放行（fail）｜阻断项 2**

1. **BUG-066（P1）** —— 新建商品表单可以持久化仓库自己的 `validateProduct` 判为非法的记录（`type=subscription`+`periodDays=0` 是**普通用户点两下 select 就能到**的组合），违反 REQ-031 W3「负例 fail-closed」与 `docs/team/roles/qa.md` §4「数据写错 = P1」。复现：`raw/round-24/qa-r24-probe.mjs neg`（`steps.neg.n5`）。
2. **BUG-068（P1）** —— REQ-031 **D2①**「合法三值 → 落 `active.json`」在本实例**未达成**：5 个预设与 Save adapter 均为 no-op（平台 §29.2 拒绝 CLI 创建的记录），只有「收款账户只读 + CLI 指引」成立。复现：`raw/round-24/qa-r24-reg.mjs` 的 `steps.preset/adapter`。**需要产品决策**（新实例由页面创建 `active.json` / 允许 delete+re-create / 队列 worker），不是纯代码修复。

**不阻断但必须进入裁决**：BUG-067（P1，范围外·既有：`dist/` 与 `dist/.afs/manifest.json` 含 `node.key` + `.env.local`）、BUG-069（P3 视觉）。④ 未交付按 REQ §6.4 登记，不算 fail。

**给 PM/Lead 的下一步**：先裁决 BUG-066（补 `required`/交叉字段校验，或把交叉规则做成页面可强制的受控选择）与 BUG-068（② 的落点产品决策）；两者都解决并复跑 `task-101` 的相同探针后，本轮才可考虑放行。

---

`VERDICT=fail, BLOCKING=2`
