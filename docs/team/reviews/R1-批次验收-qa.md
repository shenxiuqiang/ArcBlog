# R1 批次验收（QA 独立核验）

> 对象：commit `9fa3e46`（`feat(round-1): concept-v2 cleanup batch — remove hub/economy surface, wire registry enumeration`）
> 验收人：QA（独立跑命令，不轻信汇报）｜ 2026-10-01
> 方式：只读验收——未改任何源码/docs；未跑 live 层；未做任何 git 写操作。`npm run build` 属判据 3 明文要求，仅重写 `dist/`。
> **总判：门 3/3 过，ENG 判据 4–11 全过，反向抽查 12–14 过；第 15 项概念扫描发现 2 处漏删（应修）。建议：修完两处漏删后签收。**

---

## 一、门（1–3）

### 1. `arc dsl validate --json` — ✅ 过

```
  "issues": []
```
（尾部另列 theme-bridge seo 键，属正常输出；issues 为空数组。）

### 2. `npm test` — ✅ 过（10 套件，56 pass / 0 fail）

| 套件 | 结果 |
| --- | --- |
| arcblog-hero-carousel | pass=4 fail=0 |
| arcblog-console-nav | pass=7 fail=0 |
| arcblog-roles-settings | pass=5 fail=0 |
| arcblog-permissions | pass=6 fail=0 |
| arcblog-run-tests | pass=5 fail=0 |
| arcblog-dist-secrets | pass=5 fail=0 |
| arcblog-theme | pass=3 fail=0 |
| arcblog-runtime-ids | pass=4 fail=0 |
| arcblog-ui-budget | pass=12 fail=0 |
| arcblog-i18n | pass=5 fail=0 |

合计 pass=56 fail=0，尾部自述 "fast tier passed — this is the gate"。

### 3. `npm run build` — ✅ 过

独立重跑确认 `BUILD_RC=0`（首次管道到 tail 时 `$?` 是 tail 的码，已用无管道方式复核）。scrub 输出摘要：

```json
{
  "action": "scrub",
  "removed": [".env.local", "node.key"],
  "privateKeyRemoved": [],
  "manifestRemoved": [".env.local", "node.key"],
  "manifestFilesBefore": 473,
  "manifestFilesAfter": 471
}
```

复核产物：`ls dist/node.key dist/.env.local` → 均不存在；`grep -c "node.key\|.env.local" dist/.afs/manifest.json` → 0 命中。密钥擦除生效。

---

## 二、ENG 判据（4–11）

### 4. agents.mjs 工具面 — ✅ 过

- `AGENT_TOOLS.length` → **13**
- 6 个被删名（create_product/get_orders/get_settlements/get_sales/list_products/get_policy）grep `scripts/lib/agents.mjs` → **0 命中**（grep_rc=1）
- `settle_payment` 在（第 10 行注释 + 第 78 行 `kind: 'closed', defaultClosed: true`，符合 spec §130 default-closed 定位）
- `grep -c "agent.economy" scripts/lib/agents.mjs` → **0**

### 5. `node scripts/arcblog-agent.mjs tools` — ✅ 过

输出 `"count": 13`，工具清单 = search_posts, get_post, list_categories, get_node_profile, get_analytics, list_studios(unavailable), get_studio(unavailable), create_draft, update_draft, publish_post, settle_payment, change_wallet, change_role。RC=0。**注意：与 `agents.aup` 页面所列表格不一致（见发现 F-1）。**

### 6. chain.mjs — ✅ 过

- `grep -c listStakes` → **3**（≥2 ✓）
- `grep -c updateAsset` → **6**（≥1 ✓）
- `factoryFor('hub')` / `factories?.hub` / `factories.hub` → **0 命中**（grep_rc=1）

### 7. 页面与 world — ✅ 过

- `ls .aup/pages/economy/` → `No such file or directory`
- `.aup/pages/ops/hub.aup`、`.aup/pages/store.aup`、`.aup/pages/store.json` → 均不存在
- `ls world/*.yaml | wc -l` → **20**
- `ls world/ | grep -i hub` → 空

### 8. CLI help 面 — ✅ 过

- `arcblog-network.mjs --help`：子命令只剩 `discovery publish/show` 与 `health`，**无 hub 子命令**，含 discovery ✓（RC=0）。实测 `node scripts/arcblog-network.mjs hub register --hub-did did:test:x` → `{ok:false, code:VALIDATION}` RC=1，fail-closed 符合预期。
- `arcblog-attribution.mjs --help`：只剩 `keygen --out <file>`（RC=0）。
- `node scripts/arcblog-verify.mjs keys` → `{ "ok": true, "count": 0, "keys": [] }`，RC=0。

### 9. console-nav — ✅ 过

- `CONSOLE_SECTIONS.length` → **17**，全量 = `dashboard, posts, pages, compose, heroes, categories, tags, seo, feeds, appearance, operations, registry, factory, media, agents, general, diagnostics`，含 registry ✓
- `node scripts/arcblog-console-nav.mjs --check` → `{ok:true, action:"check", pages:17}`，RC=0

### 10. registry.aup（BD-04）— ✅ 过

`test -f .aup/pages/ops/registry.aup` 存在。三样同现确认：

- **当前未接/半接口径**：`status-current`（"当前未接的是本页的列表渲染……这里不渲染节点列表"）+ `desc`（"列表渲染尚未接线，因此如实说明，而不是渲染一个空列表"）
- **P-1**：`probe-p1-label/value`（"探针 P-1（mock 链枚举）……已验证通过（2026-10-01, mock 适配器）"）
- **核对入口**：`check-title`（zh "核对入口"）+ `check-chain-label/value` + `check-cli-label`（指向 `arcblog-network.mjs discovery show`）

无"暂无节点"式确定性空态文案；`no-list-note` 明确解释"空列表等于声称链上零节点，本页对接 listStakes 之前无法知道"——符合 BD-04 口径。

### 11. DEF-01 / DEF-05 / DEF-02 — ✅ 过

- DEF-01：`grep -n "always on" .aup/pages/site/feeds.aup` → 空（rc=1）。`agents.aup:37` 的 "always on" 是"只读工具始终可用"的合法判别器，不算违规。
- DEF-05：`grep -rn "radius-lg, 12px" .aup/pages/` → 0 命中（现存均为 `var(--radius-lg, 10px)`）。
- DEF-02：三处 en 值全等 = "Settings"：`general.aup:98` `title` = "Settings"；`general.aup:14` `gate-title` = "Settings"；`.aup/locales/en.json:591` `"wrapper.nav-settings": "Settings"`（`wrapper.aup:26` 声明同为 "Settings"）。

---

## 三、反向抽查（12–15）

### 12. 四门套件仍在且通过 — ✅ 过

四文件均存在：`arcblog-roles-settings.test.mjs`、`arcblog-console-nav.test.mjs`、`arcblog-ui-budget.test.mjs`、`arcblog-i18n.test.mjs`；`npm test` 摘要中四门均为 pass（5/7/12/5），fail=0——是通过而不是被删。

### 13. economy CLI 仍可用 — ✅ 过

```
$ node scripts/arcblog-economy.mjs policy show --json 2>&1 | head -5
{
  "ok": true,
  "path": "/instance/app/arcblog/economy/policies/active.json",
  "policy": {
    "version": "v1",
```
RC=0，未崩溃。**含义：economy 数据层（CLI + world schema：order/product/ledger/settlement/settlement-policy/access-grant/refund 仍在 world/ 20 个内）是有意保留的，本批只删了 UI 面。** 与 reader.aup 付费提示块（见 F-5）的口径需 Lead 确认。

### 14. roles 面 hub 残留（只记录、不判不合格）

```
scripts/lib/roles.mjs:32:  export const CHAIN_ROLES = ['studio', 'hub'];
scripts/lib/roles.mjs:71:  hub: roleEntry(input, existing, 'hub'),
scripts/arcblog-roles.mjs:67-68:  hub: { collectionAddress: fromEnvOrFlag(opts, 'hub-collection', 'ARCBLOG_HUB_COLLECTION') ...
scripts/arcblog-roles.mjs:137-138: 注释（ENG-12/DEF-11：Studio↔Hub Tombstone 步骤随 hub 面一并移除……）
scripts/arcblog-roles.mjs:359:  help 仍含 [--hub-collection <addr>]
```

残留程度：**hub 角色在 roles 数据模型/CLI 参数面完整保留**（CHAIN_ROLES 双角色、roles.json 结构、init 的 `--hub-collection` 参数）。是否立项清理由 Lead 定。

### 15. 概念 v2 一致性扫描 — ⚠️ 发现漏删（2 处）

`grep -rln "经济|付费|economy|store|hub" .aup/pages/ --include=*.aup` 命中 11 文件，逐文件判定：

**漏删（应修）：**

| # | 文件 | 事实 |
| --- | --- | --- |
| F-1 | `.aup/pages/ops/agents.aup:161-172` | 手写工具表仍把 `create_product` 列为 **available · agent.economy**（:170），把 `get_orders/get_settlements/get_sales` 列为 closed（:172）——这 4 个工具本批已从 `AGENT_TOOLS` 删除（判据 4/5 实测 13 工具内无它们），`agent.economy` 能力也已从代码移除。:162 的 "declared-scopes" 文案仍称 `economy/policies/** · economy/products/**`，而实际声明文件 `agents/arcblog-agent/agent.dsl|agent.json` grep economy/hub = **0 命中**。页面与代码/声明双重漂移。 |
| F-2 | `.aup/pages/ops/operations.aup:3,17-21,138-152` | 仍渲染 **"Registered Hubs" 区块**（afs-list 读 `/instance/app/arcblog/hub/registrations`），空态文案 `hubs-empty` 指示用户运行 `node scripts/arcblog-network.mjs hub register --hub-did <did>`——该子命令本批已删（实测 RC=1 VALIDATION fail-closed）。`desc`（:3）仍写 "health, discovery, **Hubs, economy**, media and agent grants"。 |

**合法残留（与保留面一致，不判违规）：**

| 文件 | 命中 | 判定 |
| --- | --- | --- |
| `.aup/pages/admin/general.aup:91-96,301,321,323,336` | roles-k-hub-* 键、hub propBind、roles 配置含 hub.collectionAddress | 与 F-14（roles.mjs 保留 hub 角色）一致——页面展示的是真实存在的配置结构。归 Lead 的 roles 清理决策一并处理。 |
| `.aup/pages/ops/factory.aup:17,44-48,197-205,263` | Hub 节点工厂区块（`state.summary.factories.hub.*`） | chain.mjs 已删 `factoryFor('hub')`，但 roles/chain-worker 仍写 hub 角色投影（见 #14），数据源 `node/factories.json` 是否仍含 hub 节取决于 roles CLI——属同一"hub 角色保留"口径，不单判。 |
| `.aup/pages/ops/agents.aup:161` | policy-never 列 economy/* 路径 | economy AFS 集合仍在（world 20 个含 7 个 economy schema + economy CLI 可用，见 #13），agent 禁读这些路径仍是真实策略。 |
| `.aup/pages/reader.aup:6-7,29-33` | paid-title/paid-notice 付费提示块 | 由 `${state.post.previewOnly}` 门控；economy 数据层保留（#13），CLI 路径仍可产出付费文章。**但购买面（store.aup、economy 页）已删，付费读者无站内购买入口**——口径观察项（F-5）。 |
| posts.aup / dashboard.aup / tags.aup / saved.aup / categories.aup / media.aup | 全部是英文单词 "stored/stores" 误命中 | 非概念残留。 |

另查：`.aup/pages/` 与 `wrapper.aup`、`locales/en.json` 中无任何指向已删页面（store/hub/access/orders/ledger/policy）的导航或 `-> page` 链接（0 命中）；index/about/author 公共页无 store/economy/hub 字样。

---

## 四、发现列表（分档）

**阻断：无。**（三道门 + ENG 判据 4–11 全部实测通过；两处漏删是内容漂移，不构成数据/安全/门风险。）

**应修（漏删，与本批"remove hub/economy surface"目标直接冲突，建议修完签收）：**

1. **F-1** `agents.aup` 工具表漂移：页面声称 4 个已删工具存在（其一标 available）、引用已删的 `agent.economy` 能力、所述声明作用域与 `agents/arcblog-agent/` 实际声明不符。控制台 agents 页向用户展示假工具清单。
2. **F-2** `operations.aup` Hub 区块漏删：仍渲染 "Registered Hubs" 列表区 + 空态文案指向已删除的 `arcblog-network.mjs hub register` 命令（用户照做会得到 VALIDATION 错误）+ desc 残留 "Hubs, economy"。

**观察（记录，不判不合格，是否清理由 Lead 定）：**

3. **F-3** hub 角色在 roles 面完整保留（#14：CHAIN_ROLES、`--hub-collection`、roles.json hub 节）及相连的 `general.aup` hub 展示键、`factory.aup` Hub 工厂区块——同一决策项。
4. **F-5** reader.aup 付费提示块仍在（previewOnly 门控）而站内购买面已删；economy 数据层（7 个 world schema + economy CLI）保留。付费链路的现行口径（仅 CLI 付费？还是 concept v2 下待清理？）需 Lead 明示。
5. agents.aup policy-never 的 economy 路径清单（与数据层保留一致，合法，但建议随 F-1 一并复核措辞）。

---

## 五、结论

- 硬判据：**11/11 过**（门 3 + ENG 判据 8）。
- 反向抽查：12、13、14 过；15 发现 2 处漏删。
- **QA 结论：批次主体达成（工具面/链适配器/页面文件/CLI help/导航/registry 页全部符合判据），但 `operations.aup` 与 `agents.aup` 两处控制台页面仍渲染本批已删的 hub/economy 概念与已删命令指引，判"应修后签收"。**
