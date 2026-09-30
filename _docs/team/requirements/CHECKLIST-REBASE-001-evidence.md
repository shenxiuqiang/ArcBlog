# CHECKLIST-REBASE-001 证据 —— feature checklist 重基线（Round 11）

> 元信息：`CHECKLIST-REBASE-001` ｜ 对应 spec：`docs/ArcBlog-product-technical-spec.md`（**只读，本轮未改**）｜ checklist 行：全文 100 行 + 总览 + 维护记录 ｜ 优先级：P1（文档可信度）｜ 提出轮次：Round 11 ｜ 负责角色：PM ｜ 状态：已交付（待 Lead 复核）
>
> 授权：Lead 裁定 **L-R11-1**（PM 本轮可直接编辑 `docs/ArcBlog-feature-checklist.md` 做重基线，每个状态变更必须附可执行验证命令 + 真实输出）。
>
> 写范围：`docs/ArcBlog-feature-checklist.md` + 本文件。**未改** spec / 源码 / 测试 / arc-contracts / backlog。
>
> 本轮是精简轮（用户 2026-09-27 裁定）：**未跑 `npm run test:live`**，未写实例。

---

## 0. 门与基线

| 命令 | 真实输出（摘要） | 判定 |
| ---- | ---------------- | ---- |
| `arc dsl validate --json` | 末尾 `"issues": []` | ✅ 通过 |
| `npm test` | `ℹ tests 28 / ℹ pass 28 / ℹ fail 0`，`fast tier passed — this is the gate.` | ✅ 28/28 |
| `node scripts/arcblog-console-nav.mjs --check` | 由 `npm test` 内 `arcblog-console-nav` 套件覆盖（快层 28/28 绿） | ✅ 无漂移 |
| `arc dsl generate --check` | 由 `npm test` 内漂移门覆盖（快层 28/28 绿） | ✅ 无漂移 |

本轮只改 `docs/**`（markdown），未触发 `arc blocklet build`（无 `.aup` 变更）。

**基线计数**（改动前，与正文逐行统计一致）：A 6/1/0/0=7、B 10/0/0/1=11、C 13/2/1/0=16、D 19/5/0/0=24、E 13/1/1/0=15、F 11/0/1/0=12、G 8/0/1/0=9、H 0/0/5/1=6 → **✅80 / 🟡9 / ⬜9 / ⚪2 = 100 行**。

---

## 1. 状态变更（5 行：✅ → 🟡）

判定口径（本次重基线的统一规则，写在前面便于复核）：

* D 组（管理后台）行按 spec 该节「功能」列表与「**达成标准**」判定，需要**界面/联动**到位；只有 CLI 通而界面缺失的记为 🟡，并在备注写明 CLI 与降级路径。
* 已有 **平台受限 + 明文降级路径 + QA 放行** 的行不降级（如 `?page=media` 上传、`?page=agents` 授权），因为那是既有裁决，不在本轮推翻。
* 其余组（A/B/C/E/F/G）按清单图例「代码 + 测试在位」判定。

### 1.1 清单第 103 行「分类与标签管理界面」✅ → 🟡

* **判定**：标签侧界面完整（R6 已 QA 复验）；**分类侧界面缺「排序 / 合并 / 删除迁移」**，且其删除文案自认会留下悬空分类 → 与 spec §15.4 达成标准「分类变更（改名、合并、删除）**绝不产生"悬空分类"的文章**」不符。
* **命令 / 输出**：

```bash
$ grep -n "i18n {" -A 20 .aup/pages/site/categories.aup | grep "cat-"
    cat-add / cat-added / cat-empty / cat-f-desc / cat-f-name / cat-f-slug
    cat-remove / cat-remove-msg / cat-remove-title / cat-removed / cat-slug-hint
# cat-* 键中不存在 merge / migrate / sort —— 界面只有「添加 / 删除」
$ sed -n '10p' .aup/pages/site/categories.aup
    cat-remove-msg { en "Existing posts keep their category text, but the publish validator will reject it afterwards." … }
$ node scripts/arcblog-category.mjs --help | tail -4
    remove refuses while posts still reference the category unless --migrate-to
    reassigns them (spec §15.4: never leave a dangling category). merge migrates
    all referencing posts, then removes the source category.
$ git show HEAD:docs/ArcBlog-feature-checklist.md | grep -n "分类与标签管理界面 | §15.4 | ✅ | 分类在 \`heroes-admin.json\`"
    103:| … 分类在 `heroes-admin.json`；…   （改前原文；该页现为 `.aup/pages/site/categories.aup`，B′ 后没有 `heroes-admin.json`）
```

* **来源**：spec §15.4「分类与标签 Taxonomy」功能/达成标准（spec 第 1018–1030 行）；`.aup/pages/site/categories.aup` i18n；`scripts/arcblog-category.mjs` help。
* **备注**：C 组第 88 行「分类合并 / 删除迁移 ✅」**保持 ✅**——它描述的是 CLI 能力，`usage/merge/remove --migrate-to` 齐备且自述「never leave a dangling category」；缺口在**界面**，归本行。

### 1.2 清单第 112 行「商品管理」✅ → 🟡

* **判定**：spec §15.7 商品功能列「创建 / 编辑 / 上下架」；控制台只有**只读**商品目录，三个写动作都只有 CLI。D 组（管理后台）语义下判 🟡。
* **命令 / 输出**：

```bash
$ sed -n '2,13p' world/product.yaml
    id / creatorDid / type / contentId / priceAmount / priceAsset
    visibility: string # public | private
    settlementPolicy / periodDays / createdAt / updatedAt
$ grep -n "afs-list\|product" .aup/pages/economy/policy.aup | head -3
    121:  afs-list … emptyText=:products-empty from "/instance/app/arcblog/economy/products" {
$ node scripts/arcblog-economy.mjs --help | grep "product"
    product add --id <id> --creator-did <did> [--type article] --price-amount <n> [--update]
    product list | product show --id <id>
    product remove --id <id>   # refused while orders reference it
$ grep -rn "economy/products" .aup/pages/ | grep -v "policy.aup"
    （空）—— 除 policy.aup 的只读列表外，没有第二个商品界面
```

* **来源**：spec §15.7「商品 Products」（spec 第 1141–1153 行）；`.aup/pages/economy/policy.aup` L121；`world/product.yaml`。

### 1.3 清单第 113 行「订单管理（含六问追溯）」✅ → 🟡

* **判定**：① 备注「**退款操作待补**」已过时（退款在实现轮次 1 落地，清单第 138 行自己标 ✅）；② spec 达成标准要求「任何**订单详情页**都能完整回答六个问题」，控制台**没有订单列表/详情页**，只有 dashboard 的「最近订单」卡。
* **命令 / 输出**：

```bash
$ node scripts/arcblog-economy.mjs --help | grep "order"
    order create --id <id> --product-id <id> [--buyer-did <did>] [--hub-did <did>]
    order list | order show --id <id>
    order pay --id <id> [--adapter manual] [--payment-ref <ref>]
    order refund --id <id> [--reason <text>]
$ grep -rln "economy/orders\|economy/settlements\|economy/ledger" .aup/pages/
    .aup/pages/admin/dashboard.aup
    .aup/pages/ops/agents.aup      # agents 页里的命中是 policy-never 的路径清单文本，不是订单界面
$ node -e "import('./scripts/console-nav.mjs').then(m=>console.log(m.CONSOLE_SECTIONS.join(',')))"
    dashboard,posts,pages,compose,heroes,categories,tags,seo,feeds,appearance,
    operations,hub,media,agents,policy,access,factory      # 无 orders 页
$ git show HEAD:docs/ArcBlog-feature-checklist.md | grep -n "订单管理"
    113:| 订单管理（含六问追溯） | §15.7、§50 | ✅ | 订单记录含 creator/hub/policy/amount；退款操作待补 |   （改前原文；与第 138 行「退款 ✅」自相矛盾）
```

* **来源**：spec §15.7「订单 Orders」（spec 第 1155–1167 行，含达成标准原文）；清单第 138 行（退款 ✅）；`scripts/console-nav.mjs`。

### 1.4 清单第 114 行「结算与账本（append-only）」✅ → 🟡

* **判定**：① 原行自认「类型筛选**界面**待补」却标 ✅；② 实际上**没有任何结算/账本界面**；③ CLI `ledger list` 连 `--type` 都没有 → spec §15.7 的「账本：按类型筛选，分页浏览」未实现。
* **命令 / 输出**：

```bash
$ node scripts/arcblog-economy.mjs --help | grep "ledger"
    ledger list [--order <id>] [--limit <n>|--all] [--limit <n>|--all]
    # 无 --type（spec §15.7 要 payment/tip/creator_share/hub_share/protocol_fee/refund/settlement 类型筛选）
$ node -e "import('./scripts/console-nav.mjs').then(m=>console.log(m.CONSOLE_SECTIONS.includes('ledger'),m.CONSOLE_SECTIONS.includes('settlement')))"
    false false
```

* **来源**：spec §15.7「结算与账本 Settlement & Ledger」（spec 第 1169–1181 行）；`scripts/arcblog-economy.mjs --help`。

### 1.5 清单第 121 行「设置 - 诊断与维护」✅ → 🟡

* **判定**：自检 **CLI** 在位（`arcblog-doctor.mjs`，live 测试在位）；但 spec §15.9 诊断与维护的功能是「自检 / 同步与后台任务状态（cron / Sync Scheduler §111）/ 日志查看与导出 / 数据导出·备份入口」，且存在理由明确要求「在后台点几下」。**控制台没有 settings/diagnostics 页**；`?page=operations` 的健康卡属于 §15.6/§110 Node Health，不是诊断页；日志导出、数据导出/备份无实现。
* **命令 / 输出**：

```bash
$ grep -rn "page=settings\|page=diagnostics\|settings\.aup\|diagnostics\.aup" .aup/
    （空）
$ node -e "import('./scripts/console-nav.mjs').then(m=>console.log(m.CONSOLE_SECTIONS.some(p=>/settings|diagnostics|general/.test(p))))"
    false
$ node scripts/arcblog-doctor.mjs --help | sed -n '3,12p'
    Checks: resources / node-profile / node-identity / categories / authorship /
            space-layout / space-app / de-identification
    # 无「权限矩阵」检查项；无 cron/日志/导出
$ grep -rn "cron\|scheduler" --include="*.yaml" --include="*.aup" --include="*.json" . | grep -v node_modules | grep -v "\.git/"
    （空）—— §111 的声明式周期任务未落地
$ grep -rn "backup" scripts/*.mjs | grep -v "\.test\."
    （空）—— 没有任何备份/数据导出命令（注意：`grep export` 无意义，每个 ESM 模块都有 export）
$ grep -n "health" .aup/pages/ops/operations.aup | head -1
    3:    desc { en "Live state of this node: health, discovery, Hubs, economy, media and agent grants." … }
    # 该页是 §15.6/§110 的节点健康+发现+Hub 状态页，不是诊断页
```

* **来源**：spec §15.9「诊断与维护 Diagnostics」（spec 第 1280–1293 行）；`scripts/arcblog-doctor.mjs --help`；`.aup/pages/ops/operations.aup`。
* **说明**：本轮保留 doctor 的 ✅ 部分（自检 CLI + live 测试），整行判 🟡；若后续把「诊断与维护页」立为 REQ，可在该行继续收口为 ✅。

---

## 2. 新增行（4 行，全部 ⬜）

判定依据：spec 有明确承诺（功能列表 / 硬规则 / 达成标准），清单原 100 行**无对应行**，实现侧确认为空。

### 2.1 D 组新增「菜单结构与能力驱动」｜§15.1、§15.2、§15.10

```bash
$ node -e "import('./scripts/console-nav.mjs').then(m=>{console.log('groups',m.CONSOLE_MENU.length,'pages',m.CONSOLE_SECTIONS.length);console.log(m.CONSOLE_MENU.map(g=>g.group).join(','))})"
    groups 4 pages 17
    nav-group-content,nav-group-site,nav-group-ops,nav-group-economy
$ grep -n "capability" scripts/console-nav.mjs
    （空）—— 生成器没有 capability 字段
$ grep -n "visible=" .aup/pages/admin/appearance.aup | head -2
    17:  … visible=$session.authenticated {     # 侧栏唯一的可见性条件
$ sed -n '916,920p' docs/ArcBlog-product-technical-spec.md
    └── 设置  Settings
        ├── 通用        General
        ├── 角色与能力  Roles & Capabilities
        └── 诊断与维护  Diagnostics
```

* spec §15.1 硬规则 1「**菜单由 Capability 驱动**」、2「**隐藏而不是禁用**」；§15.2 菜单树（含「设置」组）；§15.10 菜单与角色对照表。
* 实现事实：侧栏只有 4 组 17 页、无「设置」组、无 capability 过滤 → **整行 ⬜**（一行覆盖菜单结构与能力驱动两件事，避免与第 119–121 行的功能行重复计数）。

### 2.2 D 组新增「Dashboard 网络概览与异常提醒」｜§15.3

```bash
$ grep -n "i18n {" -A 27 .aup/pages/admin/dashboard.aup | grep -oE "^[0-9]+-    [a-z-]+ " | head -30
    agents / agents-empty / agents-guide / capabilities-label / content / content-empty /
    content-guide / desc / economy / economy-empty / economy-guide / gate-* / login /
    node / node-empty / node-hint / q-ops / q-settings / q-studio / q-write / quick /
    roles-label / status-note / status-order / title
    # 无 network / hub / alert / notice 一类键
```

* spec §15.3 功能列「**网络概览**（按角色）：Studio 显示已注册 Hub 数…」「**异常提醒**：同步失败、结算失败、授权即将过期——以一条可点击的提醒条呈现」；达成标准「任何异常…都能在 30 秒内被发现」。实现为空 → ⬜。
* 现有 dashboard 五块（节点+角色 / 最近发布 / 经济订单 / Agent 授权 / 快捷操作）仍由第 99 行 ✅ 覆盖，不冲突。

### 2.3 D 组新增「首页模块开关与按角色首页」｜§15.5、§55–§57

```bash
$ grep -n "i18n {" -A 4 .aup/pages/index.aup
    feed / feed-empty / desc…     # 公共首页只有「最新发布」
$ sed -n '8,10p' .aup/pages/index.aup
    frame hero-carousel-frame src="/p/en/hero-carousel/" …
    h2 :feed level=2
    afs-list … from "/instance/app/arcblog/posts"
    # 只有 hero + 最新发布，无 Featured / Latest / Topics 模块开关与排序
```

* spec §15.5「首页与推荐位」功能列「**首页模块开关**：Featured / Latest / Topics 等区块的显隐与排序」「**按角色显示**：Studio 节点配置 Studio Home，Hub 节点配置 Hub Home（§55–§57）」。Hero 轮播本体由第 105 行 ✅ 覆盖 → 本行只补模块开关与角色化首页，⬜。

### 2.4 F 组新增「Hub Sync Scheduler（周期同步）」｜§111

```bash
$ grep -rn "cron\|scheduler" --include="*.yaml" --include="*.aup" --include="*.json" . | grep -v node_modules | grep -v "\.git/"
    （空）
$ node scripts/arcblog-network.mjs --help | grep "hub sync"
    hub sync --hub-did <did> [--version <n>] [--hash <h>] [--status never|ok|stale|error]
    # 手动 CLI，无周期任务
```

* spec §111「Hub Sync Scheduler」：「Hub 需要周期同步…优先考虑 ARC 当前支持的声明式运行/cron 能力。Blocklet manifest 当前已经有 `cron` 运行时声明字段」。清单 F 组原有「Hub 同步状态」行描述状态字段，但没有周期调度这行 → 新增 ⬜。

---

## 3. 纯描述修正（6 处，状态不变）

| 清单行 | 原文（问题） | 修正后 | 命令 / 输出 |
| ------ | ------------ | ------ | ----------- |
| 50（A） | `world/*.yaml`「**18 个** schema」 | 「**21 个** schema（`ls world/*.yaml`）」 | `$ ls world/*.yaml \| wc -l` → `21`；`$ ls world/*.yaml` → access-grant, agent-grant, category, content-index, discovery-context, discovery-document, hub-registration, ledger-entry, media, node-health, node-identity, node, order, page, post, product, refund, role-config, settlement-policy, settlement, trusted-hub |
| 53（A） | `.aup/`（app.aup + **14 个页面**） | `.aup/`（app.aup + **25 个页面文件**：17 个控制台页 + 公共页） | `$ ls .aup/pages/*.aup .aup/pages/*/*.aup \| wc -l` → `25`；`$ ls .aup/pages/admin/*.aup \| wc -l` → 6、`economy` 2、`ops` 5、`site` 5、顶层 7；`CONSOLE_SECTIONS.length` → 17 |
| 78（C） | 实现位置 `.aup/pages/compose.json`、`compose-edit.json` | `.aup/pages/admin/compose.aup`、`compose-edit.aup` | `$ ls .aup/pages/compose.json` → `No such file`；`$ ls .aup/pages/admin/compose.aup` → 存在（另 `find .aup -name "*.json"` 只有 app.json / locales / wrapper.json / 7 个公共页 json） |
| 99（D） | `dashboard.json` | `.aup/pages/admin/dashboard.aup` | `$ ls .aup/pages/dashboard.json` → `No such file`；`$ ls .aup/pages/admin/dashboard.aup` → 存在 |
| 119（D） | 「**外观设置 ✅**；站点名称/语言/时区、功能总开关待补」 | 删除误挂的「外观设置 ✅」（那是 §15.5 的 `.aup/pages/admin/appearance.aup`，走 `auto-surface from /instance/settings/arcblog`）；写明 §15.9 通用实际只有「站点名称」可由 SEO 页写 `node/profile.json` | `$ sed -n '98p' .aup/pages/admin/appearance.aup` → `auto-surface "$t(appearance.title)" from "/instance/settings/arcblog"`；`$ sed -n '119p' .aup/pages/site/seo.aup` → `events={click:{exec:"/.actions/write", args:{path:"/instance/app/arcblog/node/profile.json", content:{name:"${args.name}"…`；`$ grep -rn "page=settings" .aup/` → 空 |
| 120（D） | 「角色状态只读展示 ✅；**Factory 卡片、购买、质押操作全部待补**」（已过时） | 角色状态只读 ✅（dashboard）；`?page=factory` 已有 acquire / stake / revoke / claim 一键操作 + 工厂卡 + 四步 tx；仍缺：外部化配置「重新验证」按钮、NFT data 表单、等待期倒计时、独立设置页 | `$ grep -c "act-acquire\|act-stake\|act-revoke\|act-claim" .aup/pages/ops/factory.aup` → 8（4 个按钮 + 4 个确认弹窗文案）；`$ grep -n "confirm-acquire-title\|events={click" .aup/pages/ops/factory.aup \| head -3`；`$ grep -n "claimableAt" .aup/pages/ops/factory.aup` → `factory.node-claimable` |

---

## 4. 保留原状态的行：本轮核对依据

以下行**未改状态**，核对方式与依据如下（不是"没看"，而是核对后认为与实现事实一致；标 † 者为**引用团队既有证据、本轮未独立重跑**）。

| 清单行 | 状态 | 核对依据 |
| ------ | ---- | -------- |
| 49、51、54、55（A） | ✅/🟡/✅ | `blocklet.yaml`、`world/*.yaml`、`.aup/wrapper.aup`、`pages/`、`.route/` 均存在；54 行「用户作用域 /user 待落地」与 spec §5.2 一致（本轮未实测 DID Space 写入）† |
| 52（A） | 🟡 | 描述「草稿/私域由 instance 目录边界承载」与 CLAUDE.md 存储分界一致 |
| 61–71（B） | ✅/⚪ | `config/roles.json`、`scripts/arcblog-roles.mjs`（`status`/`capabilities`/`state set`）、`scripts/arcblog-factory.mjs`、`scripts/arcblog-node-nft.mjs`、`scripts/arcblog-chain-worker.mjs` 均在位；第 70 行「链上验证仍待接」与 `roles.mjs --help` 原文一致：`The state is operator-declared until chain verification is wired`、`with --chain-verification unset every chain role reports active=false`；真链 acquire→stake→revoke→claim 的 tx 见 `docs/ArcBlog-nft-factory.md` §7.2.1（团队证据）† |
| 77、79–82、84–87、89–92（C） | ✅/🟡/⬜ | 逐行 `ls` 了实现位置文件（`arcblog-lifecycle.mjs` / `preview.aup` / `category.mjs` / `media.mjs` / `content-hash.mjs` / `content-sign.mjs` / `pages.mjs` / `tags.mjs` / `rss.mjs` 全部存在）；G 组外的 UI 细节引用既有 QA（`test-reports/round-9-reverify.md`、`round-10.md`）† |
| 83（C） | 🟡 | unlisted/members 未实现，与 spec §21 五档对照一致 |
| 88（C） | ✅ | `node scripts/arcblog-category.mjs --help` 显示 `usage/merge/remove --migrate-to`，且自述 "never leave a dangling category"（缺口在界面，见 §1.1） |
| 98、100–102、104–111、115–118（D） | ✅/🟡 | 逐页确认界面存在：`posts.aup`（Publish/Delete/Archive/Unpublish + 草稿与归档两列表）、`pages.aup`（New page / Bring online / Take offline / Remove public copy）、`media.aup`、`appearance.aup`、`heroes.aup`、`seo.aup`、`feeds.aup`、`operations.aup`、`hub.aup`、`tags.aup`、`agents.aup`、`policy.aup`；100/101/110 的 R9/R10 BUG 修复引用 `test-reports/round-9-reverify.md`（`VERDICT=pass, BLOCKING=0`）与 `round-10.md`（`VERDICT=pass, BLOCKING=0`）†；102 行的上传降级路径（CDP 无法驱动 `afs-dropzone`）见 `round-10.md` §7-1 与 §119 行「A4 部分通过 + 受限未验证」†；116/117 的授权页只读降级为平台无哈希原语（`agents.aup` L16 原文），有明文降级路径 |
| 127–141（E） | ✅/🟡/⬜ | `node scripts/arcblog-economy.mjs --help` 逐条对上：policy/product/order/tip/settle/ledger/access 与 `order refund`；`world/{product,order,settlement,settlement-policy,ledger-entry,access-grant,refund,trusted-hub}.yaml` 全部存在 |
| 147–158（F） | ✅/⬜ | `node scripts/arcblog-network.mjs --help` 逐条对上（`discovery publish/show`、`health`、`hub register/add/approve/reject/list/show/sync/remove`、`hub index rebuild/list/search`）；`world/{discovery-document,node-health,hub-registration,content-index}.yaml` 存在 |
| 164–172（G） | ✅/⬜ | `agents/arcblog-agent/`、`scripts/arcblog-agent.mjs`、`scripts/arcblog-audit.mjs` 在位；工具分类与 `?page=agents` 页面文案一致（`test-reports/round-9-reverify.md` 覆盖 A3 工具清单）† |
| 178–183（H） | ⬜/⚪ | V2+ 边界行，spec §121–§133/§139/§144 一致 |

---

## 5. 未本轮独立验证清单（**保留原状态，不臆断**）

严格说：以下内容本轮**没有**独立可执行证据，只有静态存在性检查或团队既有报告，故**一律保留原状态**并把原因写明：

1. **B 组链上真实验证范围**（第 64/66/67/68/69 行）：本机无 ARC 依赖 / 链 / 资金钱包，本轮**未跑** `--adapter ocap`，也**未跑**对应 live 文件（`npm run test:file -- scripts/arcblog-node-nft.test.mjs` 会写实例，本轮任务明令禁止写实例）。状态照旧；证据来源 `docs/ArcBlog-nft-factory.md` §7.2.1（团队成员既有真链记录）†。
2. **DID Space `/user` 作用域**（第 52 行）：只做了描述一致性核对，未查实例内 `/user` 数据。
3. **Dashboard 与各类界面的浏览器实测**（第 99–118 行多数）：本轮是精简轮，**未启动浏览器**，未逐页 DOM 断言；只做静态（i18n 键 / `afs-list` / `exec` 形态）核对 + 引用 `test-reports/round-{6,7,8,9,10}*.md` 的既有实测结论†。
4. **E 组经济行为语义**（第 128/135/138/139 行）：只核对 CLI 命令与 schema 存在，未跑 `order refund`/attribution 的 live 用例（写实例）。
5. **G 组 Agent 工具实时目录与静态镜像一致性**（第 116 行已知限制）：清单自己写明「`npm test` 不覆盖页面工具名 vs CLI 实时输出一致性」，本轮未新增覆盖。
6. **第 104 行「外观」的多主题选择**：`.web/themes/` 下有 `default / editorial / mono / organic` 四个目录，但本轮**未在浏览器验证**主题切换是否经 `auto-surface` 真正可选，故不改状态（保持 ✅，因为 `arcblog-settings.mjs` + bridge 的既有实测在 `test-reports/round-4`/CLAUDE.md 记录）†。

标记 †：证据来自团队既有产物（`docs/team/test-reports/**`、`docs/ArcBlog-nft-factory.md`、`CLAUDE.md`、变更日志），**非本 agent 本轮重跑**；作为文档判定的辅助依据引用，标注来源。

---

## 6. 计数自检（改后）

| 分组 | ✅ | 🟡 | ⬜ | ⚪ | 小计 | 正文行数实测 |
| ---- | -- | -- | -- | -- | ---- | ------------ |
| A | 6 | 1 | 0 | 0 | 7 | 7 |
| B | 10 | 0 | 0 | 1 | 11 | 11 |
| C | 13 | 2 | 1 | 0 | 16 | 16 |
| D | 14 | 10 | 3 | 0 | 27 | 27 |
| E | 13 | 1 | 1 | 0 | 15 | 15 |
| F | 11 | 0 | 2 | 0 | 13 | 13 |
| G | 8 | 0 | 1 | 0 | 9 | 9 |
| H | 0 | 0 | 5 | 1 | 6 | 6 |
| **合计** | **75** | **14** | **13** | **2** | **104** | **104** |

变化：✅ 80→75（5 条 D 组降级）、🟡 9→14（+5）、⬜ 9→13（**+4 新增行**）、⚪ 2 不变；总行数 100→104。

自检命令（对改后文件）：

```bash
$ node -e "const fs=require('fs');const L=fs.readFileSync('docs/ArcBlog-feature-checklist.md','utf8').split('\n');let g='',c={};for(const l of L){const m=l.match(/^## ([A-H])\. /);if(m){g=m[1];c[g]=c[g]||{t:0}}if(/^\| /.test(l)&&!/^\| (-{2,}|功能|分组)/.test(l)){c[g]&&c[g].t++}}console.log(c)"
```

（Lead 可复制该命令复核正文字数；总览表须与之逐项相等。）

---

## 7. 结论与遗留

* 结论：清单状态/描述与实现事实一致，并补上 4 个此前无行的 spec 承诺；总览计数与正文逐项对齐。
* 遗留（供 Lead 决定是否转化）：
  1. §15.9「设置」组（通用/角色与能力/诊断与维护三页）**整组无界面**——本轮只如实标 🟡/⬜，未派 REQ。若要补，建议单独立 REQ（含 §15.2 菜单组 + §15.9 三页）。
  2. §15.4 分类界面缺「排序 / 合并 / 删除迁移」——已由第 103 行 🟡 记录，建议进 backlog 候选。
  3. 商品/订单/账本界面缺失（D 组 3 行 🟡）——同上。
  4. §15.1/§15.10 能力驱动菜单、§111 Sync Scheduler、§15.5 首页模块开关为新增 ⬜ 行，需 PM 在 backlog 里排优先级。
