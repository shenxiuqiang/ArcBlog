# R2 批次验收（QA 独立核验）

> 对象：commit `b826022`（`feat(round-2): remove the hub role and the whole economy/paid layer`）
> 验收人：QA（独立跑命令，不轻信汇报）｜ 2026-10-12
> 方式：只读验收——未改任何源码/docs；未跑 live 层；未做任何 git 写操作。`npm run build` 属判据 3 明文要求，仅重写 `dist/`（跑后 `git status` 干净，dist 与源码同步）。
> **总判：门 3/3 过，反向判据 4–10 全过（无漏删），正向判据 12–14 全过，DEF-14 独立复核通过。第 11 项发现文档面漂移 3 处（应修 2 + 观察 1），集中在 CLAUDE.md。建议：无阻断，可签收；漂移派一个小型文档修订轮（主战场 = CLAUDE.md 一个文件）。**

---

## 一、门（1–3）

### 1. `arc dsl validate --json` — ✅ 过

```
  "issues": []
```
（尾部另列 theme-bridge seo 键，属正常输出。）

### 2. `npm test` — ✅ 过（10 套件全 ok，0 fail）

```
arcblog-permissions 327ms ok / console-nav 267ms ok / run-tests 180ms ok /
roles-settings 148ms ok / ui-budget 138ms ok / hero-carousel 130ms ok /
runtime-ids 121ms ok / theme 110ms ok / i18n 815ms ok / dist-secrets 619ms ok
── total 820 ms across 10 file(s)
fast tier passed — this is the gate.
```

### 3. `npm run build` — ✅ 过（rc=0，scrub 生效）

scrub 输出原样摘要：

```json
{
  "action": "scrub",
  "removed": [".env.local", "node.key"],
  "privateKeyRemoved": [],
  "manifestRemoved": [".env.local", "node.key"],
  "manifestFilesBefore": 456,
  "manifestFilesAfter": 454
}
```

独立复核：`npm run build` 无管道重跑 `rc=0`；`ls dist/node.key dist/.env.local` → 均不存在；manifest 454 条中密钥类条目 = 0（仅 `.env.example` 模板，合法）。**manifest 前后数：456 → 454**（移除的 2 条 = node.key + .env.local，与 BUG-067 预期一致）。

---

## 二、反向判据（4–11：找"没删干净"）

### 4. `grep -rn "hub" scripts/ --include=*.mjs | grep -v test | grep -v 豁免词` — ✅ 过（4 命中，逐条判定均合法保留）

| 命中 | 判定 |
| --- | --- |
| `arcblog-clean.mjs:59,70` `hubDid` | **合法**：clean 工具识别历史测试残留记录体的字段名，删了反而认不出旧残留 |
| `lib/attribution.mjs:4` | **合法**：ENG-13 删除说明注释（"there are no Hubs to attribute"） |
| `arcblog-network.mjs:14` | **合法**：ENG-12 删除说明注释（hub 子命令已删的缘起） |

另核：`scripts/lib/chain.mjs:708` 的 `glofter/hub/mock/...` 为外部仓库路径注释（豁免词内）；**docs/05/02 D1 所述 `factoryFor('studio') || factoryFor('hub')` 回退在代码中已不存在**——`factoryFor` 现实现为 `state.factories[role] ?? null`，无跨角色回退（见第 11 项观察 O2）。

### 5. `grep -rn "economy\|settlement\|ledger\|order" scripts/ ... | head -20` — ✅ 过（无漏删）

20 命中中绝大多数为英文单词误命中（"in order"、"queue order"、`orderBy`、"Key order"）。实质命中逐条判定：

| 命中 | 判定 |
| --- | --- |
| `lib/nft-factory.mjs:150,192`、`arcblog-factory.mjs:150` `settlement: 'instant'` | **合法**：这是 GLofter 节点 NFT 工厂 payload 的自有字段（链上工厂结构要求 `settlement must be instant`），与被删的 economy 结算层同名不同物 |
| `arcblog-lifecycle.mjs:372,543` | **合法**：fail-closed 报错文案（"the paid visibility went away with the economy layer"） |
| `lib/cli-flags.mjs:7` | **合法**：历史教训注释（`ledger list --type=payment` 曾是 fail-open 的反面教材） |

### 6. `grep -rn "hub\|economy\|paid\|store" .aup/pages/ .aup/wrapper.aup` — ✅ 过（页面层无残留）

全部命中为两类：**① 英文单词误命中**（`stored`/`stores` 含子串 "store"，出现在 general/posts/dashboard/saved/categories/tags/media 各页文案）；**② 合法的退役说明文案**（`ops/agents.aup:4,36`——向读者解释 settle_payment/change_wallet 已随经济面下线，属正面事实陈述）。`wrapper.aup` 0 命中。无指向已删页面/集合的残留 binding 或导航。

补充事实：`pages/economy/`、`ops/hub.aup`、顶层 `store.aup` 均不存在（删除发生在 R1 `9fa3e46`，R2 无重复劳动）；R2 本提交删了 `reader.aup` 的 paid 块与 factory/general/pages 的 hub 块。

### 7. `ls world/*.yaml | wc -l` — ✅ 过，但**实测 = 11，不是基线所述 13**（见观察 O1）

现存 11 个：`agent-grant / bookmark / category / discovery-document / media / node-health / node-identity / node / page / post / role-config`。

独立复核 git 历史：R2 前 = 20 个；本提交删除 **9 个** = 7 个 economy schema（access-grant/ledger-entry/order/product/refund/settlement-policy/settlement）+ 2 个 hub 孤儿 schema（content-index/discovery-context）。**20 − 9 = 11，删除清单与实际状态完全自洽**；提交信息里写的 "world 20 -> 13" 是算术错误（只算了 7 个 economy，漏算同提交的 2 个 hub 孤儿）。

`grep -in "hub\|economy\|order\|settlement" world/*.yaml` → **0 命中**；`role-config.yaml` 的 hub 段已删（仅存 `studio` 字段，注释明写 "studio is the only chain role"）。

### 8. `grep -c "paid\|economy\|hub" blocklet.yaml` — ✅ 过（计数 5，全部为 `github` 子串误命中）

5 命中全部是 `https://github.com/...` URL 里的 "git**hub**"。economy/paid 的 `replicated` 集合声明与 store 相关 binding 真实计数 = **0**。

### 9. CLI 行为面 — ✅ 全过

| 命令 | 实测 |
| --- | --- |
| `arcblog-roles.mjs status` | rc=0，`declaredRoles`/`statuses` = `[basic, studio]`，全输出 grep "hub" → 0 命中 |
| `arcblog-factory.mjs spec --role hub` | rc=1，`{"ok":false,"code":"VALIDATION","error":"--role must be one of: studio"}` — fail closed ✓ |
| `arcblog-node-nft.mjs status --role hub`（加测） | rc=1，同样 VALIDATION fail closed ✓ |
| `arcblog-agent.mjs tools` | rc=0，`count: 11`；逐名核对无 `settle_payment`/`change_wallet`；`defaultClosed: [change_role]`；capability 档 = read/write/publish/admin，无 `agent.economy` 空洞档 |

### 10. `arcblog-agent.mjs check` — ✅ 过

`ok: true`（声明与 `agents/` 目录无漂移），`defaultClosedTools: [change_role]`。

### 11. 一致性扫描（文档面漂移清单）— ⚠️ 发现漂移（应修 2 + 观察 1）

判据命令原样输出（4 模式精确匹配）：

```
CLAUDE.md:67: node scripts/arcblog-economy.mjs policy show ...
CLAUDE.md:68: node scripts/arcblog-economy.mjs order refund ...
CLAUDE.md:69: node scripts/arcblog-economy.mjs access read ...
docs/02-产品需求/05-AGT-Agent接入.md:51: PRD-AGT-13 行（"恰 13 条"、agent.economy）
```

加宽扫描（`hub|economy|paid|settle_payment`）后的**全量漂移清单**：

| # | 位置 | 漂移内容 | 分档 |
| --- | --- | --- | --- |
| F1 | `CLAUDE.md`（12 处命中） | Commands 段仍列出已删 CLI 为可跑命令：`arcblog-economy.mjs` ×3（:67-69）、`arcblog-attribution.mjs trusted`（:70）、`arcblog-network.mjs hub list/refresh/index rebuild`（:76-78）、`node-nft --role studio\|hub`（:55）；布局段仍写 "30 个页面" 含 `pages/ops/hub`、`pages/economy/`、`store`（:148）；存储段仍写 economy 数据层整段（:173）、`hub/registrations/`（:181）、roles.json `studio`/`hub` 双集合（:172） | **应修** |
| F2 | `docs/02-产品需求/05-AGT-Agent接入.md:51` | PRD-AGT-13 验收口径 "恰 13 条" 与现行 11 条矛盾（ENG-16 又退役 2 个），且引用 `agent.economy` capability | **应修** |
| F3 | `docs/05-开发文档/02-平台能力与边界.md:72` | D1 行描述的 `factoryFor('studio')\|\|factoryFor('hub')` 回退风险**在代码中已不存在**（QA 实测 `factoryFor` = `state.factories[role] ?? null`），风险行未标已消除 | 观察 |
| — | `README.md`、`AGENTS.md` | 4 模式 + 加宽扫描均 **0 命中**，干净 | — |
| — | `docs/06-功能开发列表/` | 多处提及 `settle_payment`/`agent.economy`/"13 条"，但均为**带 ENG-16 修订注记的历史记录**（台账的本职就是记历史与修订链），不构成漂移 | — |
| — | `docs/01/03/04` | 4 模式 0 命中；"不内置支付与访问控制" 类表述（docs/02 的 01/04/07 各 1 行）是**产品方向陈述**，与新现实一致，合法 | — |

**漂移规模结论**：主战场 = **CLAUDE.md 一个文件**（它是每个 agent 第一加载的"实现事实与命令入口"，把已删 CLI 列为可跑命令会实际误导后续 agent）；外加 2 处小修。**建议派一个小型文档修订轮（Lead 可直接执行，无需 full docs round）**，范围 = F1 + F2，顺手标 F3。

---

## 三、正向判据（12–14）

### 12. 密钥工具面 — ✅ 过

- `arcblog-verify.mjs keys` → rc=0，`{"ok":true,"count":0,"keys":[]}`（本实例无注册公钥，属正常空态）
- `arcblog-attribution.mjs --help` → 仅剩 `keygen --out <file>` 一个子命令，无 `trusted`/hub 公钥面 ✓

### 13. network / lifecycle 帮助面 — ✅ 过

- `arcblog-network.mjs --help` → 子命令仅 `discovery publish|show` + `health`，无 hub ✓
- `arcblog-lifecycle.mjs --help` → 无 `--product-id`；"paid" 唯一命中是 fail-closed 说明文案（"public (the only visibility; the paid tier went away...)"），合法 ✓

### 14. registry 页三样同现 — ✅ 过

`.aup/pages/ops/registry.aup` 存在且接线（`console-nav.mjs` 含 `nav-registry` 行）。三样同现的 grep 判据：

1. **链上质押查询说明**：`check-chain-label/value`（"list stakes where receiver = the factory address"）✓
2. **discovery CLI 引用**：`key-value-list` 内含 `node scripts/arcblog-network.mjs discovery show` ✓
3. **探针验证如实陈述**：`probe-p1-value`（2026-10-01 mock 适配器验证：返回条数=质押数、分页游标可续）✓

---

## 四、基线事实独立复核

| 基线声称 | QA 实测 | 结论 |
| --- | --- | --- |
| hub 角色面降除（roles/factory/node-nft --role hub fail closed） | 三处均 rc=1 VALIDATION；roles status 无 hub；role-config.yaml 无 hub 段 | ✅ 属实 |
| economy 数据层全删（CLI + lib + 7 world schema + blocklet.yaml） | `arcblog-economy.mjs`/`lib/economy.mjs`/`lib/chain-orders.mjs` 已删（git name-status = D）；7 schema 已删；blocklet.yaml 0 声明 | ✅ 属实 |
| 付费墙删（lifecycle 只收 public） | `--visibility` 非 public 时报错文案实测存在（:372）；help 无 --product-id | ✅ 属实 |
| settle_payment/change_wallet 退役（AGENT_TOOLS 11） | tools count=11，两名 0 命中 | ✅ 属实 |
| DEF-14（parseArgs PEM 误判）已修 | QA 独立复现：`verify content --public-key "-----BEGIN PUBLIC KEY-----..."` 不再报 unknown flag，PEM 被当值消费（走到预期的 NOT_FOUND）；`arc.mjs:73-75` 修复注释在案 | ✅ 属实 |
| man stub 5 件删除 | git 实测删 5 件：access-admin / economy-admin / hub-admin / policy-admin / store（另有 10 件 man 清理） | ✅ 属实 |
| world schema 计数 = 13 | **实测 = 11**；提交信息 "20 -> 13" 算术错误（漏算 2 个 hub 孤儿 schema），实际删除 9 个、终态 11 自洽 | ⚠️ 数字不符但状态正确（观察 O1） |

---

## 五、发现汇总（分档）

**阻断**：无。

**应修**（2 项，均文档面，建议一个小型文档修订轮）：

- **F1**：`CLAUDE.md` 12 处漂移——Commands 段把 3 个已删 CLI / 3 个已删子命令列为可跑命令，布局段页面清单（30 页 / pages/economy / ops/hub / store）与存储段（economy 层、hub/registrations、roles.json 双集合）均为历史现实。文件头部虽带"含尚未清理的历史实现"免责声明，但**命令入口段的错误是可执行的误导**（agent 照抄必败）。
- **F2**：`docs/02-产品需求/05-AGT-Agent接入.md` PRD-AGT-13 验收口径 "恰 13 条" 与现行 11 条矛盾，需随 ENG-16 修订。

**观察**（3 项，不挡签收）：

- **O1**：R2 提交信息 "world 20 -> 13" 算术错误（实际 20→11）；功能台账/后续文档若引用 "13" 需校正为 11。
- **O2**：`docs/05-开发文档/02` D1 行记载的 `factoryFor` hub 回退风险已在代码中消除，风险行宜标注"已消除"（也算半个好消息：代码比文档更干净）。
- **O3**：`arcblog-verify.mjs content` 对不存在 slug 返回 `rc=0 + ok:false(NOT_FOUND)`，与其他 CLI 的 fail-closed `rc=1` 不一致（DEF-14 复测时顺带发现；非本批改动引入，是否统一 exit code 语义由 Lead 裁定）。

**总判**：R2 代码面删除干净、门全绿、行为面 fail-closed 全部到位，**可签收**。遗留为文档面漂移，规模 = 1 个主文件 + 2 处小修，建议派小型文档修订轮。
