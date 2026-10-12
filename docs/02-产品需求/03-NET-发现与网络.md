# 03 · NET 发现与网络

| 字段 | 值 |
| --- | --- |
| 状态 | **已定稿（v1.0）** |
| 版本 | v1.0 ｜ 2026-10-01 ｜ 主笔 `doc-owner` |
| 上游 | [`00`](00-需求地图与规范.md)（**S2-B 裁决：注册表归 `NET`、读取归 `AGT`**）、[`00a`](00a-需求模板与验收规范.md)；**已冻结** [`docs/01-产品概念/`](../01-产品概念/00-导读.md)；[`concept-口径裁决-Lead.md`](../team/concept-口径裁决-Lead.md)（链上机制口径） |
| 下游 | Stage 3 页面设计（`?page=registry` / `?page=operations`）；`docs/05-开发文档/07` 探针；Stage 6 台账（`FP-NET-*`） |
| 证据基线 | 链上机制引 `文件:行`（`scripts/lib/chain.mjs:778-786`、`node_modules/@ocap/client/lib/node.d.ts:2422`）；**枚举已接线**（`ENG-02`/`ENG-03`：两适配器 `listStakes`，`grep -c listStakes scripts/lib/chain.mjs` = 3；`P-1` mock 全过 + `P-2` beta 真链只读 `code: OK, total: 1`），消费面 = `arcblog-network.mjs registry refresh\|show`（**2026-10-12 同步**） |
| 事实标签 | 五类（门槛 = 总纲 §3.1）；**本目录不写六态** |

> **领域范围**：**链上注册表**（质押即目录）、节点自描述（`endpoint`/`region`）、可达性与时效、**被 agent 发现的数据面**、跨节点分发的**前置**。
> **分界**：不定义"agent 读到后怎么汇总"（→ `05-AGT`）；不定义"角色资格与链上生命周期"（→ `04-ID`）。

---

## 0. 发现机制：链上注册表

**所有节点把 studio NFT 质押到同一个 factory 地址**，因此"有哪些节点在运行"= **查该地址的质押列表**（`listStakes({addressFilter:{receiver:factory}})`）——**质押即注册**，不需要任何中心登记动作。节点的可达信息写在 **NFT 的 `data.value`**（`endpoint`/`region`/`name`——**2026-10-12 受控修订**：原文写 `appName`，但工厂模板实际 mint 的键是 `name`（键集 = `name/description/endpoint/region/stake/pk/owner/roles/capabilities/protocolVersion/nodeVersion`，实测）⇒ 以 `name` 作为「应用名」槽位，**不新增冗余键**）。

| 面 | 内容 | 归属 |
| --- | --- | --- |
| **发现源** | 链上质押记录（编辑权不集中、可被第三方独立核对） | 本域 |
| **节点自描述** | NFT `data.value` 的可达字段 | 本域 |
| **读取与汇总** | agent 读到之后做什么 | [`05-AGT`](05-AGT-Agent接入.md) |
| **资格与所有权** | 谁有权购买/质押/撤销/转让 | [`04-ID`](04-ID-身份与角色.md) |

---

## 1. 能力组

| # | 能力组 | 一句话 |
| :-: | --- | --- |
| N1 | **链上注册表** | 质押即目录：一个地址 ⇒ 全部节点 |
| N2 | **节点自描述** | 可达信息（`endpoint`/`region`/`name`，原写 `appName`，2026-10-12 受控修订）写在 NFT `data.value` |
| N3 | **可达性与时效** | 节点可达性如何表达（含未知/离线） |
| N4 | **被 agent 发现的数据面** | 节点对外可读面（供 `05-AGT` 消费，**不重复定义读取逻辑**） |
| N5 | **跨节点分发前置** | 订阅式同步的通道与其**前置探针**（`U10`） |
| N6 | **下线可见性** | 撤销后"不再出现"的判定口径（**以 stake 记录为准**） |

---

## 2. 需求总表（`PRD-NET-*`）

| PRD-ID | 一句话需求 | 概念条款 | 旅程/落点 | 现状标签 | 阻塞 | 优先级 | 验收 | 证据 | 验证者 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `PRD-NET-01` | **能枚举全部在运行节点**：按 factory 地址查质押列表 | `01 §0④`、`01 §6`、`04 §1` 链上注册表 | `03 §J3` 步 5、`03 §J4` 步 2 | **【已实现】**（2026-10-12 同步：原"机制在、本项目未接"的二分**塌缩**为单一【已实现】） | 无 | P0 | **已跑**：`npm run test:file -- scripts/arcblog-network.test.mjs` → **18/18**（mock 2 质押 ⇒ `total=2`、幂等、无工厂 fail-closed）；**真链只读** `P-2`（beta）→ `code: OK, total: 1`（游标分页） | `scripts/lib/chain.mjs` 两适配器 `listStakes`（`ENG-02`/`ENG-03`）+ 消费面 `arcblog-network.mjs registry refresh\|show` → `node/registry.json` 投影 + `?page=registry`（台账 [`06/01` `PRD-NET-01`](../06-功能开发列表/01-功能台账.md)） | 独立方（Stage 6 指派） |
| `PRD-NET-02` | **节点自描述**：可达信息写入 NFT `data.value`（`endpoint`/`region`/`name`——原写 `appName`，2026-10-12 受控修订为模板实有的 `name`） | `04 §1` 节点 data | `03 §J3` 步 4 | 【已实现】（**真链写入待人类批准**，2026-10-12 同步） | **待批准**（真链 `updateAsset`） | P0 | **已跑（mock，端到端）**：`arcblog-node-nft.mjs describe` = read-merge-write ⇒ 三字段就位、mint 字段逐字保留、键集不增不减；`describe --app-name` **fail-closed**（模板无该键）；无 triple 的 ocap 调用 exit 1 且**零链上写入**。待批准命令：`describe --role studio --adapter ocap --endpoint <可达地址>` | `scripts/lib/chain.mjs` 两适配器 `updateAsset`（`ENG-05`，mock `P-4` 已过）；本域 §0 的 `name` 受控修订；台账 [`06/01` `PRD-NET-02`](../06-功能开发列表/01-功能台账.md) | 独立方（Stage 6 指派） |
| `PRD-NET-03` | **可达性时效**：区分"可达 / 陈旧 / 从未可达 / 离线"并如实展示 | `01 §4.2` 缺陷 3、`04 §1` 公开面 | `03 §J3` 步 6、`03 §J5b` 步 2 | **【已实现】**（2026-10-12 同步） | 无 | P1 | **已跑**：`node --test scripts/arcblog-network.test.mjs` → **18/18**（含 `never`/`stale` 判定式用例）；**口径**：`never`=无存活 stake 行；`stale`=有 stake 但 endpoint 两通道皆空；`reachable`=有 stake+endpoint（无探测时为兜底值，标 `reachabilityExact:''`+`offlineNeedsProbe:'true'`）；**`offline` 是唯一需 `--probe` 的态** | `scripts/lib/network.mjs`（`deriveReachability`/`isLiveStake`）+ `scripts/lib/probe.mjs` + `.aup/pages/ops/registry.aup` 四态标签；台账 [`06/01` `PRD-NET-03`](../06-功能开发列表/01-功能台账.md) | 独立方（Stage 6 指派） |
| `PRD-NET-04` | **被 agent 发现的数据面**：节点公开读取面可由任意 agent 匿名读取 | `04 §1` 公开面、`04 §1` agent 聚合 | `03 §J4` 步 3 | 【已实现】（通道） | 无 | P0 | `curl -s /p/llms.txt` **200**（`text/plain`）；无 Key、无 cookie 可读；跨节点读取不走平台中继 | `/p/llms.txt` 实测 200 的原始输出在册；读取与汇总的**定义归 `05-AGT`** | 独立方（Stage 6 指派） |
| `PRD-NET-05` | **节点下线的可见性**：撤销后该节点不再出现在注册表消费结果里 | `04 §1` 撤销清空、`03 §J5` | `03 §J5` 步 1–3、`03 §J5b` | **【已实现】**（2026-10-12 同步：真链实测成立） | 无 | P1 | **真链实测（beta）**：唯一质押行被完全撤销（raw `assets: []` + `revokedAssets:[zjduiTq…]`）后 `registry refresh --adapter ocap` → `total 0 · stakesReturned 1 · stakesLive 0 · deadStakes [zrjkV7pG…] · removed [zrjkV7pG…]` ⇒ 撤销节点**不再出现在消费结果里**；判定式 = **以 stake 记录为准**（移出 `assets`/进入 `revokedAssets`），**不靠** data 解析失败 | `node scripts/arcblog-network.mjs registry refresh --adapter ocap`（`DEF-29` 修好后**原样可跑**，无需 source）；生命周期归 [`04-ID`](04-ID-身份与角色.md)；台账 [`06/01` `PRD-NET-05`](../06-功能开发列表/01-功能台账.md) | 独立方（Stage 6 指派） |
| `PRD-NET-06` | **跨节点分发/订阅式同步** | `01 §7` 推迟层③ | `03 §J4` 步 3（远景） | **【平台边界】（主）**【未验证】【规划中】 | 无 | **P1** | **三段口径**：① **平台不内置跨节点分发** =【平台边界】；② **通用原语存在（`arc space sync`）但未验证** =【未验证】（自签证书报错 / `http` 授权超时）；③ **本项目未接** =【规划中】。**前置探针 `U10`**（**2026-10-12 决策型已结论**：人类裁决**暂不提供远端端点** ⇒ 维持只读聚合路线；**机制仍未验证**）；**判定式**：一次成功端到端同步并复核目标内容；**失败则维持**"发现 + 匿名只读聚合"路线（故本条 P1 是"**主干路线**"而非"承诺可用"） | [`docs/05-开发文档/07-未决技术问题与探针计划.md`](../05-开发文档/07-未决技术问题与探针计划.md) 的 `U10` | 待定（独立方） |
| `PRD-NET-07` | 节点自描述可被**第三方只读核对**（不依赖本项目） | `01 §6`（编辑权不集中） | `03 §J6` 步 1 | **【已实现】**（2026-10-12 同步） | 无 | P2 | **实测**：仅用公共 SDK（`@ocap/client`，**零本仓代码**）`listStakes({addressFilter:{receiver: studio 工厂}})` → `code: OK, total: 1`；`stake.address/sender/message` 均可读 ⇒ 第三方可独立核对。⚠️ 实测该质押 `assets: []`，自描述在 stake `message`（`https://arcblog.localhost`）而非 NFT `data`；应用内核对入口 = `?page=registry`（链上浏览器/SDK 指引） | 台账 [`06/01` `PRD-NET-07`](../06-功能开发列表/01-功能台账.md)（第三方复测 2026-10-12） | 独立方（Stage 6 指派） |

**条数**：本域 **7 条**（`NET-06` 是主干路线的**前置探针**：主标签仍 **【平台边界】**，`U10` 2026-10-12 已出**决策型结论** = 暂不提供远端端点 ⇒ 维持只读聚合路线）。

---

## 3. 未验证与探针（**凡【未验证】必给验证方法与判定式**）

| 探针 | 关联 | 验证步骤 | 判定式 | 阻塞 |
| :-: | --- | --- | --- | --- |
| **`P-1`（mock 枚举）** | `PRD-NET-01` | ~~① 在 mock 适配器实现"按 receiver 索引的 stake 注册表" ② 两个"节点"各质押 ③ 调 `listStakes`~~ **已跑（2026-10-01，`ENG-03`）** | 返回条数 = 质押数；未质押者不出现；游标可续 | **已过**（`scripts/arcblog-network.test.mjs` **18/18**） |
| **`P-2`（beta 真链只读枚举）** | `PRD-NET-01`/`PRD-NET-05` | ocap 适配器对 studio 工厂只读 `listStakes`（`size`+`cursor`） | `code: OK` + `total` 与质押数一致；游标可续 | **已过（2026-10-01）**：beta `code: OK, total: 1`；**只读**，零链上写入 |
| **`U10`（远端同步）** | `PRD-NET-06` | 配置 `arc space sync` 远端端点并跑一次 | 成功 ⇒ 升级；失败 ⇒ 维持只读聚合路线 | **决策型已结论（2026-10-12）**：人类裁决暂不提供远端端点 ⇒ 维持只读聚合路线；**机制仍未验证** |

> **口径提醒（2026-10-12 同步）**：`PRD-NET-01` 的**机制**与**本项目接入**今天**都已成立**——两适配器均有 `listStakes`（`ENG-02`/`ENG-03`，`grep -c` = **3**）、mock `P-1` 全过、beta 真链只读 `P-2` = `code: OK, total: 1`，消费面 `registry refresh|show` + `?page=registry` 已接 ⇒ 标 **【已实现】**；**"机制存在 ≠ 本项目已接"的规则不变**，只是本例的事实变了。

---

## 4. 不做什么（本域）

| 项 | 理由 |
| --- | --- |
| 不做中心化目录服务 / 注册申请-审核流程 | `01 §6`：编辑权不集中；质押即注册 |
| 不做平台侧排名/推荐位 | `01 §7` 产品选择层 |
| 不承诺跨节点**内容搬运**（无实现） | 【平台边界】；`PRD-NET-06` 只做**前置**探针，不承诺结果 |

---

## 5. 开放问题

| # | 问题 | 影响 | 裁决人 |
| :-: | --- | --- | --- |
| N1 | `PRD-NET-03` 四态是否需要与 Stage 3 的"诚实降级"模式统一命名（不新造词） | 与 `03-产品设计` 的一致性 | Lead |
| N2 | `PRD-NET-07` 是否属产品需求（还是归 Stage 5/7 规范） | 条目归属 | Lead |
| N3 | `PRD-NET-06`：`U10` **决策型已裁（暂不提供远端端点）** ⇒ 是否**撤下**该条（而不是长期挂【平台边界】） | 条目生命周期 | Lead + 人类 |

---

## 变更记录

| 日期 | 版本 | 变更 |
| --- | --- | --- |
| 2026-10-01 | v1.0 | 首版 |
