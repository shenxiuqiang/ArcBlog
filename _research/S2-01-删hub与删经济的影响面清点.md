# S2-01 删除 hub 与删除经济体系的影响面清点（概念 v2 的 Stage 2 调研）

| 字段 | 值 |
| --- | --- |
| 状态 | 草稿（v0.1，供 `docs/02-产品需求/` v2 与 `docs/06-功能开发列表/` v2 引用） |
| 版本 | v0.1 ｜ 2026-10-01 ｜ 调研员 Lead （2026-10-01 v2.1：**归档层删除**（`_docs/`、`_docs-v1/` 已移除）——清理归档引用与“归档依据”概念，结论改指现行出处或自证（人类指令）） |
| 定位 | 人类裁决"**不再有 hub 角色**""**经济体系整体作废直接删**"后，把这两句话翻译成**精确的删除范围**（页面 / 导航 / 脚本 / 工具 / schema / 授权 / 测试 / 文档），供下游阶段排期与验收。**只清点，不改任何代码** |
| 上游 | [`concept-v2-口径裁决-Lead.md §1/§3`](../../team/concept-v2-口径裁决-Lead.md)（人类裁决 + v1→v2 差异表） |
| 下游 | `docs/02-产品需求/`（哪些 `PRD-` 作废/重写）、`docs/03-产品设计/`（页面族收缩）、`docs/06-功能开发列表/`（删除项与验证项） |
| 证据基线 | 只读：`ls`/`grep`/`wc`/`python3`；`arc dsl validate --json` = `issues: []` |
| 事实标签 | 五类（唯一出处 = [`总纲 §3.1`](../../README.md)） |

---

## 1. 结论摘要

删 hub + 删经济，**总量约 2000 行运营侧脚本 + 6 个页面 + 5 个导航项 + 6 个 agent 工具 + 6 个 AFS schema**。**注意三处不是"纯删"**：

1. **`arcblog-network.mjs` 是半留半删**——`discovery publish|show` **要留**（节点自描述），`hub register|list|show|sync|remove` **要删**；
2. **`arcblog-attribution.mjs`** 服务于"Hub 归属可验证才分成" ⇒ 随经济一起消失，但**内容签名**（`--sign-key`）要留（署名可信是 v2 的前提）；
3. **`store.aup`** 是付费阅读门面 ⇒ 删；其中已知缺陷 `content.visibility` 前缀问题（v1 的 `DEF-02`）**随之消失**。

## 2. 控制台页面与导航

| 对象 | 现状 | v2 处置 |
| --- | --- | --- |
| `.aup/pages/ops/hub.aup` | Hub 关系与策展 | **删** |
| `.aup/pages/economy/access.aup` | 访问权/付费全文 | **删** |
| `.aup/pages/economy/orders.aup` | 订单 | **删** |
| `.aup/pages/economy/policy.aup` | 分成策略 | **删** |
| `.aup/pages/economy/ledger.aup` | 账本 | **删** |
| `.aup/pages/store.aup` | 公开付费门面（4035 B，含 `visibility`） | **删** |
| `.aup/pages/ops/agents.aup` | agent 审计/授权 | **留并升级**（v2 主干入口） |
| `.aup/pages/ops/factory.aup` | 工厂/节点 NFT | **留**（v2 只保留 studio） |

**导航**：`scripts/console-nav.mjs` 的 `hub` / `orders` / `policy` / `access` / `ledger` 五条**删**；`store` 若在公开面导航中亦删。
**计数**：控制台 **21 页 → 约 15 页**（`economy/` 整目录消失）。

## 3. 脚本与工具面

| 对象 | 规模 | v2 处置 |
| --- | --- | --- |
| `scripts/arcblog-economy.mjs` | **1419 行** | **删** |
| `scripts/lib/economy.mjs` | **420 行** | **删** |
| `scripts/arcblog-attribution.mjs` | 166 行 | **删**（Hub 归属分成的前提消失） |
| `scripts/arcblog-network.mjs` | — | **半删**：`hub *` 子命令删；`discovery publish|show` **留** |
| `scripts/lib/agents.mjs` | 348 行 / **19 工具** | 删 6 个经济工具（`list_products`/`get_policy`/`create_product`/`get_orders`/`get_settlements`/`get_sales`）⇒ **13 工具**；**新增**节点发现类工具（对应 v1 的 `list_studios`/`get_studio` 占位） |
| `scripts/arcblog-node-nft.mjs` | — | **留**；**新增** `listStakes` 枚举与"清空 data / 转让"（后者【未验证】） |

**内容签名要留**：`arcblog-lifecycle.mjs publish --sign-key` 与 `arcblog-verify.mjs`/`content-sign` 是**署名可信**的基础，与 hub 无关 ⇒ **留**。

## 4. AFS schema 与授权

| 对象 | 现状 | v2 处置 |
| --- | --- | --- |
| `world/access-grant.yaml`、`ledger-entry.yaml`、`order.yaml`、`product.yaml`、`settlement-policy.yaml`、`settlement.yaml` | 6 个 schema（v1 共 22） | **删** ⇒ 约 **16 个** |
| `blocklet.yaml` 的 `economy/**` 授权（`policies`/`products`/`orders`/`settlements`/`ledger`/`access-grants`/`refunds` 等约 7–8 条） | — | **删** |
| `blocklet.yaml` 的 `config-trusted-hubs`（信任 Hub 集合） | — | **删** |
| `config/roles.json` 的 `hub` 角色与 `hubNFTFactory` | — | **删 hub 角色**；**留 studio** |
| `hub/registrations/**` 路径与 `arcblog-network.mjs` 的 Hub 注册表 | — | **删** |
| `node/{discovery,health}.json` | 节点自描述 | **留并强化**（v2 的 agent 靠它 + 链上注册表） |

## 5. 文档侧影响（v1 备份 ）

| v1 文档 | 影响 |
| --- | --- |
| `02-产品需求/04-ECO-经济与付费.md`（8 条 `PRD-ECO`） | **整体作废**（v2 无此领域） |
| `02-产品需求/03-NET-发现与网络.md`（7 条） | `PRD-NET-02/03/05/07` 以 hub 为前提 ⇒ **重写或作废**；`06`（跨节点分发）**升为主干**（仍【未验证】） |
| `02-产品需求/05-ID-身份与角色.md` `PRD-ID-04` | 删"Hub mock"，只留 Studio 真链 |
| `02-产品需求/06-AGT-Agent接入.md`（5 条） | **升为主干**并扩"发现/汇总/chat/生成" |
| `02-产品需求/00-需求地图与规范.md` | 领域表：**8 领域 → 7**（ECO 消失），六态定义**保留** |
| `03-产品设计/` | 控制台骨架 / 页面族收缩；跨页契约里的经济流程删 |
| `04-UI设计规范/` | 与付费/门禁相关的条款删（待 Stage 4 逐条筛） |
| `05-开发文档/` | 经济架构与运维章节删；**平台边界**篇要**新增链上注册表机制**（引 S1-05） |
| `06-功能开发列表/` | 删经济相关 `FP`/`ENG`/`DEF`；**`DEF-02`（`store.aup` 前缀缺陷）随 store 删除而关闭**（按"废弃"记，不是"修复"） |
| `07-团队与开发规范/` | 大体沿用（与概念无关） |
| `08-其他/` | 迁移对照与停用声明需重写 |

## 6. 测试侧影响（**不是全删**）

下列 **15 个测试文件**命中 `economy|hub|order|ledger|policy|access` 关键词；**需逐个判定**属于"整文件删"、"删用例"还是"只是变量名含关键词"：

```
arcblog-agent  arcblog-attribution  arcblog-chain-worker  arcblog-clean
arcblog-content-hash  arcblog-content-sign  arcblog-economy  arcblog-network
arcblog-node-nft  arcblog-node  arcblog-permissions  arcblog-roles-settings
arcblog-roles  arcblog-settings  arcblog-ui-budget
```

**判定纪律**：① 整文件只测经济 ⇒ 删文件；② 混合文件 ⇒ 只删经济用例；③ **`npm test` 的 `FAST_TESTS` 白名单**（`scripts/run-tests.mjs`）要同步，**不得**让快层因删除而报"文件不存在"。
⚠️ **删除测试要连"覆盖损失"一起报**（v1 的惯例），并在 Stage 6 台账里登记"删掉的覆盖由谁接"。

## 7. 不清点就动手会踩的三个坑

1. **`arcblog-network.mjs` 一刀切删** ⇒ 会连带删掉 `discovery publish|show`，而 v2 的 agent 正需要它。
2. **`arcblog-attribution.mjs` 与内容签名混为一谈** ⇒ 会连带删掉 `arcblog-verify.mjs` 的署名能力。
3. **只删页面不删 `blocklet.yaml` 授权** ⇒ 留下指向不存在路径的 `replicated` 声明，**构建期或运行期静默不一致**（v1 的 `02a §F4` 类问题）。

## 8. 未核验

- **未动任何代码**：本篇是**只读清点**，删除范围需 Stage 6 立项后逐项确认。
- **测试文件影响未逐个读**：15 个文件只做了关键词命中，**未判定**每个文件的具体处置（留给 Stage 6 逐条核）。
- **`store.aup` 的 `visibility` 缺陷**归属 v1 `DEF-02`；本篇只记"随删除关闭"，**未验证**删除后是否有残余引用（须 Stage 6 用 `grep` 全仓核）。
