# R3 批次验收（QA 独立核验）

> 对象：commit `1b82af7`（`feat(round-3): ENG-15 — registry page renders the on-chain registry`）
> 前一轮：R3 验收子代理中断、无报告（`docs/team/reviews/R3-批次验收-qa.md` 不存在）⇒ **本次为重新执行**。
> 验收人：QA（独立跑命令，不轻信汇报与提交信息）｜ 2026-10-12
> 方式：**只读**验收——未改任何源码/docs；**未做任何 git 写操作**（只读了 `git log/show/diff/status/ls-files`，另用 `git archive 1b82af7` 在 `/tmp` 展开一份**只读基线副本**，未触碰 `.git` 状态）。
> live：**持锁跑一次**（`docs/team/.gate-lock` 于 18:42 取、跑完即删，见 §0.2）。
> **总判：门 3/3 过；判据 2/4/5/6/7 过；判据 3「三态」静态齐备但**两处可见性闸门用的是本仓已裁决为"永不显示"的 `visible="!${…}"`⇒ 第 1 态（未生成引导）与第 3 态（节点列表）预期不渲染 = 阻断**。另有 1 应修（真链失活质押仍被计入 `total`）+ 4 观察。建议：**不签收**，先收口阻断项（一次认证渲染即可判定，见 A1「收口方式」）。**

---

## 0. 执行环境、并发事实与口径（先读）

### 0.1 验收基线 = 提交内容，不是工作区

本次验收**钉在 commit `1b82af7` 的内容**上（所有 `.aup` / `scripts` 结论均以 `git show 1b82af7:<path>` 为准）。

- 跑门时的 HEAD = `557cdae`，且 `git status --porcelain` **干净**；`git diff --stat 1b82af7 557cdae` = **仅 3 个 docs 文件**（`docs/05-开发文档/07`、`docs/06/02`、`docs/06/04`，各 1–2 行）⇒ **门 1–3 与 live 跑在源码与 `1b82af7` 逐字节相同的树上**（可复核）。
- **但验收期间另一个会话（Lead）在同一工作区持续改动**：`scripts/lib/network.mjs` 的 mtime = **18:44:32**（我的门跑在 18:42、live 跑在 18:43），此后又新增 2 个提交（`9b40aad`、`f6010d7`）与 **~600 行未提交改动**（含 `.aup/pages/ops/registry.aup` 本身）。
- ⇒ 本报告的一切「页面/投影」判定都标明是**基线 `1b82af7` 的行号**；**工作区当前内容已与验收对象不一致**，不得用工作区复核本报告的行号。
- 用户告知的「唯一未提交改动 = `docs/05-开发文档/07`」在我的窗口内已由 Lead 提交（`557cdae`）；该文件**未被计入验收对象、未被改动**。

### 0.2 锁纪律

| 项 | 事实 |
| --- | --- |
| 取锁 | 18:42 `touch docs/team/.gate-lock`（取锁前 `ls` 确认**不存在**，故**未跳过 live**） |
| 释放 | 跑完 `rm docs/team/.gate-lock`（§8 复核：已删） |
| 期间 | 持锁窗口 18:42 → 18:49，覆盖 `npm run test:file` 与全部定向探针 |
| ⚠️ 并发 | 持锁窗口内 **18:43:46 有另一个会话写了 `/instance/app/arcblog/node/registry.json`**（`adapter: ocap`，见 §6.3）——**不是我跑的**（我的 ocap 抽查全程用隔离路径 `ARCBLOG_REGISTRY_PATH/DIR`，且首次 ocap 抽查在 18:44:52）。记录为事实，供 Lead 归因。 |

### 0.3 我实际写入过什么（只读口径的完整披露）

| 写入 | 说明 |
| --- | --- |
| `dist/**` | 判据 1 明文要求 `npm run build`；`dist/` 被 `.gitignore:34` 忽略，跑后 `git status` 干净 |
| dev 实例 AFS（隔离路径） | live 层与我的定向探针写入的都是 `*-test-*` / `*-qa-r3-*` 记录，**跑完已删**（§5.4、§8 复核无残留） |
| `docs/team/reviews/R3-批次验收-qa.md` | 本报告（唯一 docs 写入） |
| `/tmp/r3-pinned/**`、`/tmp/r3-stale-cleanup-probe.mjs` | 仓库外临时物，非源码 |

**未**创建/修改/删除任何仓库源码或 docs；**未**删除 `node.key` / `.env.local`；**未**发任何链上交易（§6 全部为 `listStakes` 读查询）。

---

## 一、门（判据 1）

### 1.1 `arc dsl validate --json` — ✅ 过（rc=0）

```
  "issues": []
```
（尾部另有正常的产物文件清单，最后一行为 `"issues": []`；`arc dsl validate --json; echo rc=$?` → `rc=0`。）

### 1.2 `npm test`（快层）— ✅ 过（rc=0，10 文件 0 fail）

```
  ✔ arcblog-hero-carousel       121 ms  pass=4  fail=0
  ✔ arcblog-console-nav         244 ms  pass=7  fail=0
  ✔ arcblog-roles-settings      121 ms  pass=4  fail=0
  ✔ arcblog-permissions         342 ms  pass=6  fail=0
  ✔ arcblog-run-tests           186 ms  pass=5  fail=0
  ✔ arcblog-runtime-ids         121 ms  pass=4  fail=0
  ✔ arcblog-dist-secrets        590 ms  pass=5  fail=0
  ✔ arcblog-theme               112 ms  pass=3  fail=0
  ✔ arcblog-ui-budget           128 ms  pass=12 fail=0
  ✔ arcblog-i18n                809 ms  pass=5  fail=0
  ── total 811 ms across 10 file(s)
fast tier passed — this is the gate.
```
判定：**过**。文件数与用例数取自运行本身（未引用 prose 数字）。`arcblog-ui-budget` 12 项全过 ⇒ 本提交的 `ui-budget-baseline.json` 重锚与实现一致。

### 1.3 `npm run build` — ✅ 过（rc=0，scrub 生效）

构建尾部原样：

```
Published 458 file(s) → /Users/shenxiuqiang/workspace/ArcBlog/dist
  .afs/manifest.json  (http-mount protocol)
  blocklet.dist.json  (flat manifest)
```

scrub 摘要原样：

```json
{
  "action": "scrub",
  "distDir": "/Users/shenxiuqiang/workspace/ArcBlog/dist",
  "dryRun": false,
  "removed": [".env.local", "node.key"],
  "privateKeyRemoved": [],
  "manifestRemoved": [".env.local", "node.key"],
  "manifestFilesBefore": 458,
  "manifestFilesAfter": 456
}
```
（`BUILD_RC=0`。）

独立复核（不只信 scrub 的自述）：

| 检查 | 结果 |
| --- | --- |
| `ls dist/node.key dist/.env.local` | 两者均 `No such file or directory` |
| manifest 条数 | 456（= before 458 − 2，与 `manifestRemoved` 一致） |
| 全 manifest 扫 `PRIVATE KEY` 标记 | `privateKeyRemoved: []`，0 处 |
| `git status --porcelain`（build 后） | **干净**（dist 被忽略） |

**manifest 数口径**：458 → 456（R2 报告为 456 → 454，**+2**；见 O4）。**scrub 摘要**：恰好移除 `node.key` + `.env.local` 两条，与 BUG-067 预期一致，**无第三个密钥文件**。

---

## 二、判据 2：CLI 静态面 — ✅ 过

命令与输出（原样）：

```
$ node scripts/arcblog-network.mjs --help
Flags: --k v and --k=v are equivalent; an unknown flag fails closed (VALIDATION, exit 1).
ArcBlog node network layer (spec §68–§69, §109–§110)

Usage:
  node scripts/arcblog-network.mjs discovery publish [--base-url <url>] [--update]
  node scripts/arcblog-network.mjs discovery show
  node scripts/arcblog-network.mjs health [--publish]
  node scripts/arcblog-network.mjs registry refresh [--adapter mock|ocap]
  node scripts/arcblog-network.mjs registry show

Options:
  --instance <name>   target a named ARC instance (default: default instance)
  --adapter <name>    chain adapter for registry refresh: mock (default) | ocap
```

判定：**过**——`registry refresh` 与 `registry show` **均在**（rc=0）。补充：`--help` 中 `hub` 相关子命令仍为 0（ENG-12 未回退），与 `arcblog-network.test.mjs` 的断言一致。

---

## 三、判据 3：页面（`.aup/pages/ops/registry.aup`）— ⚠️ **静态齐备，但两态预期不渲染（阻断 A1）**

### 3.1 grep 判据（原样记录，均对 **钉住的基线**）

```
$ git show 1b82af7:.aup/pages/ops/registry.aup | grep -n '未接\|not connected\|not wired\|尚未接线\|未接线'
（无输出，rc=1）

$ grep -n '未接\|not connected\|not wired' .aup/locales/en.json .aup/locales/zh.json
（无输出，rc=1）

$ grep -rn 'no-list-note\|status-current' .aup/ dist/
dist/docs/team/reviews/R1-批次验收-qa.md:96,100   ← 仅历史报告文本（R1 QA 引用当时的键名），非活页面
（.aup/ 内 0 命中）

$ grep -n '"registry\.' .aup/locales/en.json
608–620  check-chain-label…title（旧键）
631–646  empty-note / list-title / node-* / pending-* / probe-p2-* / status-wired / sum-*（新增键）
```
判定：**过**。"当前未接/not connected" 表述在页面与两份 locale 中**全部消失**（`status-current` 与 `no-list-note` 两个旧键已删、新键 `status-wired` 落地）；唯一字面命中是 `dist/` 里 R1 历史报告的自述文本，**不是活页面**（且 `dist/` 被 gitignore）。

### 3.2 三态（静态存在性）

| 要求 | 基线 `1b82af7` 实现 | 静态 |
| --- | --- | --- |
| ① 未生成引导 | `registry.aup:134` `pending-note` + `:135` `pending-cli-label` 命令行，闸门 `visible="!${state.registry.refreshedAt}"` | ✅ 有 |
| ② `total=0` 有出处空态 | `:137` `empty-note`（"CLI 已枚举链上注册表，投影 total = 0"），闸门 `visible="${state.registry.empty}"` | ✅ 有（正插值，**预期可用**） |
| ③ 节点列表 | `:139` 包裹 `view` + `:140` `afs-list registry-nodes … from "/instance/app/arcblog/node/registry"`，闸门 `visible="!${state.registry.empty}"` | ✅ 有 |
| 核对入口保留 | `check-title` / `check-desc` / `check-cli-label`（`registry show`）/ `check-chain-label`（receiver = 工厂地址） | ✅ 保留 |

三态**在源码里齐备**，`propBind={registry: "/instance/app/arcblog/node/registry.json"}` 接线正确，`empty` 标志由 CLI 预算（AUP 不能比较数字）——设计方向正确。

### 3.3 ⛔ 阻断 A1：两个状态的闸门用了本仓实测"永不显示"的 `visible="!${…}"`

**证据（基线行号）**

```
registry.aup:134  p :pending-note … visible="!${state.registry.refreshedAt}"        ← 态①
registry.aup:135  key-value-list … visible="!${state.registry.refreshedAt}"         ← 态①
registry.aup:139  view gap=sm visible="!${state.registry.empty}" { … afs-list … }   ← 态③（列表本体）
```
三处均由本提交**新增**（`git show 1b82af7 -- .aup/pages/ops/registry.aup` diff 可见；旧版是常驻的 `status-current`/`no-list-note`）。

**本仓对 `!${…}` 的既有裁决（三处独立一致，且都晚于 / 高于 §771 的旧处方）**

1. `docs/05-开发文档/附件/arc-contracts.md:1373`（§28.1，Round 6/7 实测）：**"`visible="!${state.x}"` 这类'取反'条件永不显示"**；`:1377` 修法②：**"需要'取反'语义时不要写 `!${…}`"**；`:1381-1385`："能用于条件渲染的实际上只有同步的 `$session.*`；`$state.*`/`$entry.*`（异步）…`!${…}` 恒隐藏 ⇒ 因此'空态卡若无数据才渲染'这类互斥在本平台不可实现"。
2. `.aup/pages/admin/general.aup:320-325`（UI-018 D2，2026-09-29 **实测两遍**）："the old `roles-no-snapshot` line was gated by `visible="!${state.verification.lastVerifiedAt}"` and rendered in **NEITHER** state (measured in both cold-load and after-reload)"。
3. `_research/S4-01-归档UI标准审计.md:54,67,152`（v2.1，2026-10-01）：`visible="!${state.x}"` 空态处方 **被实测推翻**（`!${…}` 恒隐藏，BUG-001：27 条标签同时渲染空态），正确形态 = "常驻说明 + 平台破折号"。
4. 现行结论层 `docs/04-UI设计规范/03-状态与降级.md:20`：**空**态的处方是"页级**常驻说明** + 平台破折号 `—`"，负例恰是"用 `emptyText`/条件性说明承载指引" ⇒ **条件性（尤其取反）闸门不是现行处方形态**。

**预期后果（按上述裁决推演，逐态）**

| 态 | 记录状态 | 预期渲染 |
| --- | --- | --- |
| ① 未生成引导 | `registry.json` 不存在 | `!${state.registry.refreshedAt}` ⇒ `refreshedAt` 空 ⇒ 插值成 `!` ⇒ **隐藏**；正插值的汇总 KV 也隐藏；`empty-note` 隐藏；列表包裹（正插值）隐藏 ⇒ **卡片只剩 h3 标题 `Staked nodes`，无正文**（"未生成引导"实际不存在，且不是"没说"，是"说了但不显示"） |
| ② `total=0` 空态 | 记录存在、`empty='true'` | `empty-note`（`visible="${…}"` 真值）**显示** ✅；列表内层 `!${empty}` 隐藏（此处**恰好正确**） |
| ③ 节点列表 | 记录存在、有节点 | 汇总 KV 显示 ✅，但列表本体被 `!${state.registry.empty}`（`empty=''` ⇒ 插值成 `!`；`empty='true'` ⇒ `!true`=false）⇒ **两种取值都隐藏** ⇒ **节点列表永不渲染** = ENG-15 的核心交付物不可见 |

⇒ ENG-15 判据（台账 `docs/06-功能开发列表/02` 行 65）明写"页面三态（未生成引导 / `total=0` 有出处空态 / **节点列表**）" ⇒ **判据未达成**，故列**阻断**。

**我没能做的事（诚实边界）**：页面在 `visible=$session.authenticated` 之内，我这一轮**没有认证会话/浏览器**，因此 A1 是**按本仓已裁决的实测规则做的静态高置信推演，不是我自己的一次渲染观测**。

**A1「收口方式」（一次渲染即可定案，约 1 分钟）**：以 admin 会话打开 `?page=registry`，分两次看：
1. 删/移走 `node/registry.json`（或用一个不存在的 `ARCBLOG_REGISTRY_PATH`）⇒ 看**态①引导文案是否出现**；
2. 有投影（现在实例里已有，见 §6.3）⇒ 看**节点列表是否出现**。
若两次都符合我的预期（①无正文、③无列表）⇒ 确认阻断，修法 = 把 `!${…}` 换成**恒定成立的常驻说明 + 破折号**，或由 CLI 预算第二个显式标志（如 `hasNodes: 'true'|''` / `pending: 'true'|''`）后用**正插值**分别闸门（`arc-contracts §28.1` 修法②）。**若渲染证明列表实际出现，本项降为观察**——判定不依赖于信任任何一方，只依赖那一次渲染。

**⚠️ 扩散提示（给 Lead，非本次验收对象）**：
- 工作区**未提交的在飞改动**里，`registry.aup` 仍保留 `!${…}` 且**新增一处**（`visible="!${state.registry.offlineNeedsProbe}"`）⇒ 若 A1 成立，新轮次会把这个缺陷再复制一份。
- `ops/factory.aup:170,188` 用同一模式（`arc-contracts:1389` 已标注"疑为同一模式（未单独复验）"）⇒ 建议一并复验（不属 ENG-15）。

---

## 四、判据 4：投影纪律（`buildRegistryProjection`）— ✅ 过，字段白名单**零密钥字段**

代码（钉住的 `scripts/lib/network.mjs:139-155`）：

```js
export function buildRegistryProjection({ adapter, network, factory, stakes = [], now = nowIso() } = {}) {
  const nodes = (Array.isArray(stakes) ? stakes : []).map((stake) => ({
    stakeAddress: str(stake?.address),
    owner: str(stake?.sender),
    endpoint: str(stake?.message),
    assets: Array.isArray(stake?.assets) ? stake.assets.map((id) => str(id)).filter(Boolean) : [],
  }));
  return { refreshedAt: now, adapter, network, factory, total: nodes.length,
           empty: nodes.length === 0 ? 'true' : '', nodes };
}
```

**字段集（穷举 = 白名单即"逐字段构造"，不是黑名单过滤）**

| 层 | 字段 |
| --- | --- |
| 汇总记录 `node/registry.json`（7） | `refreshedAt` `adapter` `network` `factory` `total` `empty` `nodes` |
| 每个 node（4） | `stakeAddress`（链上 `address`）`owner`（链上 `sender`）`endpoint`（链上 `message`）`assets`（链上 asset id 数组） |
| 每节点明细记录 `node/registry/<stakeAddress>.json`（6） | 上述 4 + `assetCount`（`assets.length`）+ `refreshedAt` |

**密钥字段核查**：`0` 个。对写投影路径做标识符扫描：

```
$ git show 1b82af7:scripts/lib/network.mjs | sed -n 120,175p | grep -ni "key\|secret\|mnemonic\|private\|wallet\|sign"
9: * … everything here is already on the chain. No key **material**, ever.   ← 仅注释
$ git show 1b82af7:scripts/arcblog-network.mjs | sed -n 90,180p | grep -ni "key\|secret\|mnemonic\|private\|wallet\|sign"
（无输出，rc=1）
```
无 `privateKey`/`mnemonic`/`secret`/`sk`/`wallet`/签名类字段被写入。`validateRegistryProjection` 只校验必需字段与 `total === nodes.length`，**不**做"不得有多余字段"校验——但唯一写入者就是该 builder（白名单由构造成立），当前**无越界路径**（可作长期加固建议，见 O3）。

判定：**过**。

---

## 五、判据 5：live（持锁）— ✅ 过（10/10）＋ 一项由我独立补齐

### 5.1 `npm run test:file -- scripts/arcblog-network.test.mjs`（持锁）

```
> node --test --test-concurrency=1 scripts/arcblog-network.test.mjs

✔ buildDiscoveryDocument keeps the protocol shape but points at AFS
✔ buildDiscoveryDocument records an operator-provided base url
✔ validateDiscoveryDocument rejects a foreign protocol and a missing DID
✔ buildHealth reports status, version, roles and capabilities
✔ network help exits 0 and explains the AFS-over-HTTP choice
✔ network rejects unknown subcommands with VALIDATION
✔ buildRegistryProjection keeps public fields only and marks the empty state
✔ live: discovery publish/show and health (3008ms)
✔ live: registry refresh projects the mock chain stakes, then cleans up (12731ms)
✔ live: registry refresh fails closed without a studio factory (1213ms)
ℹ tests 10  ℹ pass 10  ℹ fail 0  ℹ duration_ms 17214
TESTFILE_RC=0
```

**四个重点逐条核对**

| 重点 | 证据 | 判定 |
| --- | --- | --- |
| mock 2 质押 ⇒ `total=2` | 测试内 `assert.equal(result.total, 2)` / `shown.projection.total===2` / `nodes.map(endpoint).sort()` 等于两个 endpoint；运行 pass | ✅ |
| 二次刷新幂等 | `again.total===2` 且 `list(registryDir).length===2`；实现侧 `readJson→ifMatch→writeJson` | ✅ |
| **失活节点清理** | **提交内测试并未真正覆盖**（只断言"两次刷新后仍 2 条"，**没有让任何节点失活**）⇒ 我另写独立探针补齐（§5.2） | ✅（独立补证） |
| 无 studio 工厂 ⇒ fail closed **不写投影** | 测试 `res.status===1` + `code=NOT_FOUND` + 随后 `registry show` 仍 `NOT_FOUND`；我另独立复跑（§5.3） | ✅ |

判定：**过**——但"失活清理"这一条**不是该测试文件自证的**（见 O2）。

### 5.2 独立补齐：失活节点清理（3 质押 → 撤销 1 个 → 2，且 **item 记录被删**）

`/tmp/r3-stale-cleanup-probe.mjs`（在 `1b82af7` 的 `/tmp` 只读副本语义下，用**隔离** mock 账本 + 隔离投影路径）：

```json
{ "firstStatus": 0, "firstTotal": 3, "firstRemoved": [],
  "itemsAfterFirst": ["0xs40…56.json","0xsc5…72.json","0xsfa…5.json"],
  "revoked": "0xs40615f5007837b08d64d4bef57138aac8c8a56",
  "secondStatus": 0, "secondTotal": 2,
  "secondRemoved": ["0xs40615f5007837b08d64d4bef57138aac8c8a56"],
  "itemsAfterSecond": ["0xsc5…72.json","0xsfa…5.json"],
  "judgement": { "totalDropped": true, "staleItemRemoved": true,
                 "removedReported": true, "projectionStaleFree": true } }
```
判定：✅ **失活清理真的生效**（`total` 3→2、陈旧 item 记录被删且出现在 `removed`、`registry show` 也只剩 2 节点）。
**但**：这只证明"**从 `listStakes` 掉出去的质押**"会被清理；**真链并不按 mock 的规则掉出去** ⇒ 见 §7 / 应修 A2。

### 5.3 独立复跑：无 studio 工厂的 fail-closed（钉住副本 + 隔离路径）

```
$ ARCBLOG_MOCK_STATE_PATH=…/mock-chain-qa-r3-nofactory.json \
  ARCBLOG_REGISTRY_PATH=…/registry-qa-r3-nofactory.json \
  node scripts/arcblog-network.mjs registry refresh --adapter mock
rc=1
{"ok":false,"code":"NOT_FOUND","error":"no studio factory recorded — run: node scripts/arcblog-factory.mjs create --role studio"}

$ ARCBLOG_REGISTRY_PATH=…/registry-qa-r3-nofactory.json node scripts/arcblog-network.mjs registry show
rc=1
{"ok":false,"code":"NOT_FOUND","error":"registry projection not found: … (run: registry refresh)"}
```
判定：✅ **fail closed 且不写投影**（`refresh` 在枚举前就停下，`show` 证明没有产物）。

### 5.4 残留复核

```
$ arc afs exec /blocklets/arcblog/.actions/list --path /instance/app/arcblog/node | grep -o '"id":"[^"]*\(qa-r3\|registry\)[^"]*"'
"id":"registry"        ← Lead 的 ocap 产物（§6.3），非我创建，保留
"id":"registry.json"   ← 同上
```
测试与探针自建的 `registry-test-*` / `registry-test-stale-*` / `registry-qa-r3-*` / `mock-chain-*-test-*` **均已清理**（`config/` 下仅剩历史的 `mock-chain.json`）。历史遗留 `factories-test-1790*.json`（13 个，2026-09-27 live 跑残留）**不是本轮产生**，未动（清理需人类批准）。

---

## 六、判据 6：fail-closed 抽查（`registry refresh --adapter ocap`）— ✅ 过（**无链写**）

为**免受并发改动污染**，本项在 `/tmp/r3-pinned`（`git archive 1b82af7` 展开的副本）里跑，且始终用隔离投影路径。凭据通过 `set -a; . .env.local` 注入子进程环境（未复制密钥文件）。

### 6.1 无凭据 ⇒ fail closed（`VALIDATION`，且无产物）

```
$ env -i PATH=$NODE_DIR:… ARCBLOG_REGISTRY_PATH=…/registry-qa-r3-failclosed.json \
  node scripts/arcblog-network.mjs registry refresh --adapter ocap
rc=1
{"ok":false,"code":"VALIDATION",
 "error":"--adapter ocap needs the chain triple (network/chainHost/tokenId): network is missing; chainHost is missing; tokenId is missing. Set ARCBLOG_CHAIN_ENV=beta|main to fill the defaults, or pass --network / --chain-host / --token-id (or the matching ARCBLOG_CHAIN_* env) explicitly — see docs/operations-runbook.md \"Chain environment\"."}
$ arc afs exec …/.actions/read --path /instance/app/arcblog/node/registry-qa-r3-failclosed.json
NOT_FOUND exec Path not found
```
✅ 在**读取之前**就停（三重校验），没有伪造"零节点"，也没写投影。（注：提示里的 `docs/operations-runbook.md` 在仓库中**不存在** ⇒ 观察 O3。）

### 6.2 有凭据 ⇒ **真链只读枚举成功**（rc=0）

```
$ set -a; . .env.local; set +a
$ ARCBLOG_REGISTRY_PATH=…/registry-qa-r3-ocap.json ARCBLOG_REGISTRY_DIR=…/registry-qa-r3-ocap \
  node scripts/arcblog-network.mjs registry refresh --adapter ocap
rc=0
{ "ok": true, "action": "registry-refresh",
  "path": "/instance/app/arcblog/node/registry-qa-r3-ocap.json",
  "itemsDir": "/instance/app/arcblog/node/registry-qa-r3-ocap",
  "adapter": "ocap", "network": "beta",
  "factory": "z3CtDhCcWubEnuypCFpBpSvquamJTduBc2DGo",
  "total": 1, "removed": [],
  "projection": { "refreshedAt": "2026-10-12T10:44:52.742Z", …,
    "nodes": [ { "stakeAddress": "zrjkV7pGytzgKst8SoYEtfZ6hHXzVoyPQue5",
                 "owner": "z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a",
                 "endpoint": "https://arcblog.localhost", "assets": [] } ] } }
```

**链写核查（逐条）**
- 代码面：`commandRegistryRefresh` 只调用 `resolveChainConfig` / `openChain` / `factoryFor` / `listStakes`（+ AFS 读写）；**没有任何 `stake/revoke/claim/updateAsset/mint/transfer` 调用**（`git show 1b82af7:scripts/arcblog-network.mjs | sed -n 90,180p` 无写类 API）。
- 输出面：`action: registry-refresh`、无 tx hash、无 `hash` 字段；投影里没有 tx 字段。
- 实例面：只写了我指定的**隔离**路径（跑后已删，§5.4）。
⇒ **未发生任何链写**。判定：**过**（这是一个"真链读查询成功"的正面结论，而非恰好失败）。

### 6.3 并发事实（必须记录）

`/instance/app/arcblog/node/registry.json` 在持锁窗口内 **18:43:46** 被**另一个会话**写入：

```
{"id":"registry.json", "createdAt":"2026-10-12T10:43:46.415Z", "updatedAt":"2026-10-12T10:43:46.415Z",
 "content": {"refreshedAt":"2026-10-12T10:43:45.650Z","adapter":"ocap","network":"beta",
   "factory":"z3CtDhCcWubEnuypCFpBpSvquamJTduBc2DGo","total":1,"empty":"",
   "nodes":[{"stakeAddress":"zrjkV7pGytzgKst8SoYEtfZ6hHXzVoyPQue5",
             "owner":"z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a",
             "endpoint":"https://arcblog.localhost","assets":[]}]}}
```
- **不是我跑的**（我的 ocap 首跑是 10:44:52，且路径隔离；`registry show` 只读）。
- 与我在 §6.2 独立跑出的结果**逐字段一致**（同一 factory、同一 stake、`total=1`、`assets: []`）⇒ 两条独立路径互相印证真链枚举口径。
- 该记录我**保留未删**（删除实例数据需人类批准；且它是 Lead 自己的产证）。
- 同时说明：**验收时 dev 实例上并无投影**（我 18:42 跑 `registry show` → `NOT_FOUND`）⇒ 基线 `1b82af7` 的页面在当时只能落在**态①**——而态①正是 A1 判定会渲染成"只有标题、没有正文"的那一态。

---

## 七、判据 7：反向判定（是否只含链上公开信息 / 是否泄漏 owner 隐私或密钥）

**方法**：直接 dump 真链 `listStakes` 的**原始 payload**，与投影字段逐一对照（`/tmp/r3-pinned/r3-raw-stakes-probe.mjs`，只读）：

```
factory: z3CtDhCcWubEnuypCFpBpSvquamJTduBc2DGo    code: OK    page: {"cursor":"1","next":false,"total":1}
rawStakeKeys: ["address","assets","data","genesisTime","message","nonce","receiver","renaissanceTime",
               "revocable","revokeWaitingPeriod","revokedAssets","revokedTokens","sender","slashers","tokens"]
rawStakes: [ { "address":"zrjkV7pGytzgKst8SoYEtfZ6hHXzVoyPQue5", "assets": [],
               "genesisTime":"2026-09-27T06:44:43.922Z", "message":"https://arcblog.localhost", "nonce":"",
               "receiver":"z3CtDhCcWubEnuypCFpBpSvquamJTduBc2DGo",
               "renaissanceTime":"2026-09-27T08:34:39.783Z", "revocable": true,
               "revokedAssets":["zjduiTqCMRFtDtapZru4Yxyg88RuHBmP3WrW"], "revokeWaitingPeriod": 0,
               "sender":"z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a", "slashers": [], "data": null,
               "revokedTokens": [], "tokens": [] } ]
```

### 7.1 投影 vs 原始（保留 4 / 丢弃 11）

| 原始字段（15） | 投影里 | 判定 |
| --- | --- | --- |
| `address` | → `stakeAddress` | **保留**（质押地址，链上公开） |
| `sender` | → `owner` | **保留**（质押发起方地址，链上公开） |
| `message` | → `endpoint` | **保留**（运营方自己在质押时写下的 endpoint，链上公开） |
| `assets` | → `assets`（+`assetCount`） | **保留**（asset id，链上公开） |
| `receiver` `nonce` `genesisTime` `renaissanceTime` `revocable` `revokeWaitingPeriod` `revokedAssets` `revokedTokens` `slashers` `tokens` `data` | 丢弃 | **丢弃正确**（且它们本身也非密钥——`nonce` 在这里是空字符串的业务字段，不是私钥 nonce；`data` 为 `null`） |

⇒ **投影只含链上公开信息**；**没有任何密钥/签名/mnemonic/私钥材料**（§4 独立扫描一致）。

### 7.2 "owner 隐私"的判定：**可接受**

理由（三条，缺一不可）：
1. **不是新披露**：`owner` 就是链上 stake 的 `sender`，任何人只要知道工厂地址就能用链上浏览器/通用 SDK 查到同一份列表（这正是 ENG-15 让页面做的事）。投影没有放大可查范围。
2. **口径一致**：`blocklet.yaml:146-150` 把 `node/*` 声明为 `readRole: guest`（本提交的 diff 只改了该段的**注释**，未改 role）；`node/registry.json` + `node/registry/<stakeAddress>.json` 因此**访客可读**。对一个"公开注册表投影"这是**有意为之**，不是越权（对比同文件里 `config`、`media`、`tags` 都是 `readRole: admin`，说明作者在按数据性质分别设闸）。
3. **反向即破坏功能**：若把 owner 抹掉/哈希掉，页面就无法指向"是哪个节点/哪个 DID 质押的"，注册表的可核对性（`check-chain-label`：用 receiver=工厂地址自查）也随之失效。

⇒ **判定：可接受**（公开链上事实的聚合，非隐私泄漏；密钥字段 0 个）。**唯一要求**：文档/页面对"公开"的口径要诚实——页面 `desc` 已写"carries public fields only, never key material"，与实测一致 ✅。

### 7.3 ⚠️ 但反向检查顺带查出一个**正确性**问题（应修 A2）

原始 payload 显示：这条**被真链 `listStakes` 列出来的** stake，`assets: []` 且 `revokedAssets: ["zjduiTqCMRFtDtapZru4Yxyg88RuHBmP3WrW"]` ⇒ **它当前没有任何存活（未撤销）资产 = 已失活**。而 `mock` 适配器的 `listStakes` 会**过滤掉**这种 stake（`chain.mjs:564` `.filter(s => s.assets.some(id => !s.revokedAssets.includes(id)))`），**真链不会**。

后果：
- 真链上 `total` 会把"已撤销的质押"算成**节点**：当前实例的投影就是 `total: 1`、页面上 `sum-total`=1、`Staked nodes` 列表里有一条 `assets`/`assetCount` = 0 的行 ⇒ **页面在声称一个已经不存在的节点**（与 ENG-15 判据"仅在查询返回 `total=0` 时才允许空列表文案"同一族的口径风险：这里不是假 0，而是**假 1**）。
- §5.2 的"失活清理"只在**从 `listStakes` 掉出去**时触发；真链不会掉 ⇒ 该节点会**永久留在**投影与页面里。
- 与探针 P-1 的记录也有缝隙：`docs/05-开发文档/07 §1` 的 P-1 只验证了"**未质押**的不出现"，**没有**覆盖"**已撤销/已失活**的仍会出现"；mock 的行为（过滤）与真链（不过滤）**不同**，mock 因此不是真链的忠实替身。

判定：**应修（A2）**——需在投影侧（或 `listStakes` 消费侧）**显式定义"存活"判据**（如 `assets.length > 0` / `assets` 与 `revokedAssets` 求差），并把 mock 与真链在这一轴上的差异写清；否则 `total` / 列表 / `empty` 三个数字在真链上都可能高估。

---

## 八、发现分档

### 阻断（1）

**A1 · 页面态①与态③用了 `visible="!${…}"` ⇒ 预期永不渲染（ENG-15 的"节点列表"不可见）**
- 位置：基线 `1b82af7` 的 `.aup/pages/ops/registry.aup:134,135`（态①引导）与 `:139`（态③列表包裹）。
- 判据：`arc-contracts §28.1:1373,1377,1381-1385`；`general.aup:320-325`（UI-018 D2，实测两遍，**NEITHER state**）；`_research/S4-01:54,67,152`（BUG-001 裁决）；现行 `docs/04-UI设计规范/03:20`（空态 = 常驻说明 + 破折号）。
- 影响：ENG-15 判据的三态里，态① 退化为"只有 h3 的空卡片"，**态③（核心交付）不渲染**。
- 收口：一次 admin 渲染 `?page=registry`（有/无投影各一次）。修法 = 改常驻说明 + 破折号，或 CLI 预算第二个显式标志（`pending` / `hasNodes`）后用**正插值**分别闸门。
- 边界：**静态高置信推演，非我本人的渲染观测**（页面在 `$session.authenticated` 内，本轮无浏览器会话）。
- 扩散：在飞未提交改动里 `registry.aup` 仍保留 3 处并**新增 1 处**；`ops/factory.aup:170,188` 同模式待复验。

### 应修（1）

**A2 · 真链"已失活质押"仍被枚举 ⇒ `total` / 列表高估（mock 与真链语义不一致）**
- 证据：§7 原始 payload（`assets: []` + `revokedAssets` 非空，仍被 `listStakes` 返回）；`chain.mjs:564` 的 mock 过滤；实例投影 `total: 1` + `assets: []`。
- 影响：页面把"已撤销的节点"显示为 1 个质押节点；"失活清理"（§5.2 已验证有效）在真链上**永不触发**。
- 定位：`buildRegistryProjection` 的存活判据 / `arcblog-network.mjs` 的枚举消费 / mock↔真链口径；`docs/05-开发文档/07 §1` P-1 的覆盖描述需补"已撤销/已失活"这一轴。

### 观察（4）

**O1 · `dist/` 里除 `node.key`/`.env.local` 外还打包了本地非源码物（R2 报告口径需修正）**
`dist/.afs/manifest.json` 的 456 条里有 git 未跟踪条目：`.node-pk.pem`、`logs/combined.log`（1045 B）、`logs/error.log`（0 B）、`tmp/{p1-mock-liststakes,p2-liststakes-probe,p4-mock-updateasset,u18-minheight}.mjs`、`.afs/preflight.json`、`.web-cache/*`。
- 独立扫描：这些文件 **0 处 `PRIVATE KEY` 标记、0 处 mnemonic 型串**；`.node-pk.pem` 经 `openssl pkey -pubin -text` 确认为 **ED25519 公钥**（`.gitignore:47` 忽略，`.env.local:9` 指向它）⇒ **不是私钥/密钥泄漏**。
- 但仍属 BUG-067 同类（平台无 ignore 开关，`arc blocklet deploy` 会连这些一起发布）：`scripts/arcblog-dist-secrets.mjs:30` 的 `SECRET_BASENAMES` 只含 `node.key`/`.env.local`。**R2 报告"manifest 中密钥类条目 = 0（仅 `.env.example`）"的表述不完整**（漏了 `.node-pk.pem` + logs/tmp）。建议把 `logs/`、`tmp/`、`.node-pk.pem` 纳入 scrub 或在 build 前移出。

**O2 · "失活节点清理"在提交内的测试里**没有**被真正断言**
`scripts/arcblog-network.test.mjs` 的 live 用例只断言"两次刷新后仍 2 条"，**没有让任何节点失活**；"stale 清理"是靠实现与提交信息自证的。我用独立探针补证有效（§5.2）。建议补一条 3→撤销→2 的断言（现成探针逻辑可直接搬）。

**O3 · 投影校验不防"多余字段"，fail-closed 提示指向不存在的文档**
- `validateRegistryProjection` 只查必需字段 + `total===nodes.length`，不校验"不得有未列入白名单的字段"（当前唯一写入者是白名单构造的 builder，故无实际风险）。
- `--adapter ocap` 的 fail-closed 文案（`scripts/lib/chain.mjs:318`、`arcblog-factory.mjs:353` 等）仍指 `docs/operations-runbook.md "Chain environment"`，而该文件**在仓库中不存在**（现行是 `docs/05-开发文档/06-运维场景手册.md` + `04 §5`）⇒ 排查者会扑空。属既有问题，非本提交引入。

**O4 · manifest 数 458→456 与 R2 的 456→454 差 2 条，本提交无新增 dist 产物可解释**
ENG-15 未新增 dist 级文件（页面编译进既有 app.json），差异来源未定位（可能是 R2 之后新增的本地非源码物，见 O1）。**不影响门结论**（scrub 语义一致、密钥 0 处）。

---

## 九、结论摘要（发回 Lead）

- **对象** = `1b82af7`（ENG-15）；所有结论钉在提交内容上。**跑门时 HEAD=`557cdae`（仅 3 个 docs 文件差异），工作区干净** ⇒ 门与 live 的内容等价于 `1b82af7`。**验收期间 Lead 在同工作区改动 `scripts/lib/network.mjs`（18:44:32）并留下 ~600 行未提交改动（含 `registry.aup`）** ⇒ 工作区已 ≠ 验收对象，复核请用 `git show 1b82af7:<path>`。
- **门 3/3 过**：`issues: []`；`npm test` 10 文件 0 fail（811 ms）；`npm run build` rc=0，scrub 移除 `node.key`+`.env.local`，manifest **458→456**，`dist/` 无密钥（`privateKeyRemoved: []`）。
- **判据 2 过**：`--help` 含 `registry refresh` / `registry show`。
- **判据 4 过**：白名单 = 汇总 7 字段 + 节点 4 字段（+明细 `assetCount`/`refreshedAt`），**密钥字段 0 个**；原始链 payload 15 字段只取 4。
- **判据 5 过（10/10，17.2 s）**，并**独立补证**了测试没覆盖的"失活清理"（3→撤销→2，陈旧 item 被删且 `removed` 上报）与"无工厂 fail closed 不写投影"。
- **判据 6 过**：无凭据 ⇒ `VALIDATION` 且无产物；有凭据 ⇒ **真链只读枚举成功（rc=0，beta，factory `z3CtDhCcWubEnuypCFpBpSvquamJTduBc2DGo`，total=1）**，**无任何链写**。
- **判据 7：可接受**——投影只含链上公开信息（质押地址 / owner 地址 / endpoint / asset id），无密钥；owner 是链上公开的 `sender`，把它放进 `readRole: guest` 的 `node/*` 投影**不构成新披露**。
- **但结论 = 不签收**：**A1 阻断**（态①/态③用 `!${…}`，按本仓三处已裁决的实测规则预期永不渲染 ⇒ ENG-15 的"节点列表"不可见）；**A2 应修**（真链把已失活的质押仍算作节点 ⇒ `total` 假 1）；**O1–O4 观察**。
- **下一步（最小代价）**：① 一次 admin 渲染 `?page=registry` 收口 A1（收口前不得把 ENG-15 从"已实现待验"推进）；② 决定 A2 的"存活"判据落点；③ O1 建议同轮把 `logs/`/`tmp/`/`.node-pk.pem` 纳入 scrub 或移出 build。

### 复核用命令清单

```bash
arc dsl validate --json                       # issues: []
npm test                                      # fast tier, 10 files / 0 fail
npm run build                                 # rc=0; scrub 458→456; dist 无密钥
node scripts/arcblog-network.mjs --help       # registry refresh | registry show
git show 1b82af7:.aup/pages/ops/registry.aup | grep -n 'visible="!'    # 134,135,139 ← A1
npm run test:file -- scripts/arcblog-network.test.mjs                   # 10/10 under .gate-lock
node /tmp/r3-stale-cleanup-probe.mjs          # A2/§5.2 独立失活清理探针（隔离路径，自清理）
```
