# S9-01 概念转向调研：AIHOT 式 agent 聚合 × AIGNE 接入 × ArcBlog 现状

| 字段 | 值 |
| --- | --- |
| 状态 | 草稿（v0.1，**待人类裁决 §8 后才进入概念 v2 提纲**） |
| 版本 | v0.1 ｜ 2026-09-30 ｜ 调研员 Lead（含两路外部深挖） |
| 定位 | 人类提出**产品概念级转向**（去 hub、去经济、agent 承担聚合）后，先把**一手事实**盘清：AIHOT 的机制、AIGNE 的能力、ArcBlog 已有的家底、以及"能不能做到"的验证门。**只给素材与判据，不改任何冻结正文** |
| 上游 | 用户口述（2026-09-30，本文件 §1）；[`_docs/`](../../../_docs/) 归档实测；冻结的 `docs/01`–`docs/08` v1.0 |
| 下游 | 概念 v2（`docs/01`–`docs/02` 重写 + `docs/03`–`docs/07` 受控修订）；§7 的三道验证门 |
| 证据基线 | 只读：AIHOT 仓库 `cf8f8d07`（文档 + `industry/` + 源码）、实例页 `aihot.news/{llms.txt,agent,hot}`、AIGNE 官方文档 14 页、`npm view`、本仓库 `ls`/`grep`/`python3` |
| 只读纪律 | **未写**冻结正文、`_docs/**`、源码；本文件为新增调研件 |
| 事实标签 | 五类（唯一出处 = [`总纲 §4`](../../README.md)）：【已实现】【规划中】【平台边界】【决策待定】【未验证】。**本篇对实现/平台状态作断言处均带标签** |

---

## 0. 结论摘要

1. **方向可落地，且比预想近**：跨节点读取通道**已存在**（`/p/` 路径 + 运行时 `/mcp` + AFS `networkRead`）；agent 读写工具面【已实现】**19 个**（含 `create_draft`/`update_draft`/`publish_post`）；studio NFT 的 `acquire/stake/claim/revoke`【已实现】。
2. **缺口只有三块**：① 把 `list_studios`/`get_studio` 从 `unavailable` 激活（**发现源未定**，见 §7-①）；② 聚合/聚簇/chat/生成的智能层（AIHOT 的"KnowHow 即提示词" + AIGNE 正好补）；③ **拆掉 hub 与整个经济体系**（文档 + 代码 + 5 个控制台页面）。
3. **最大的定义分歧不是技术，是"无 hub 之后目录从哪来"**：链上枚举 / 由某 agent 发布的公开目录 / gossip 播种——**必须先由人类拍**（§8-Q1）。
4. **三道验证门按风险排序**：发现源 → `arc space sync` 远程端点（已有编号 **`U10`**，是 `PRD-NET-06` 前置门）→ 远端 `/mcp` 可达性与鉴权（**建议新增探针**）。但**`/p/` HTTP 匿名只读这条路已被实测可用**，不必等 `U10` 才能开工。

## 1. 人类命题（原话要点，2026-09-30）

- 受 [AIHOT](https://github.com/KKKKhazix/AIHOT)（实例 <https://aihot.news/>）启发，**产品概念彻底改变**；
- **不再有 hub 角色**，**由 agent 完成聚合**；
- ArcBlog 部署后**购买 studio NFT 并质押在链上**；用户可看到**列表/订阅**，也可**开启 agent** 去发现汇总节点信息；
- 用户可**基于 agent 汇总的信息 chat、提出观点、生成新 blog 发布到自己的 ArcBlog**；
- **不再有付费阅读、分成**等内容；**产品尽可能简单**；
- 调研 [ArcBlock AIGNE Framework](https://www.arcblock.io/zh/docs/aigne-framework/) 能否与 ArcBlog 整合。

## 2. AIHOT 机制（源码级；文档只讲"怎么用"，阈值与公式在源码里）

**六步流水线**（三个进程：`api` / `worker` / `web`，业务在 `packages/backend/`，行业相关全在 `industry/`）：

| 步 | 输入 → 处理 → 输出 | LLM |
| :-: | --- | :-: |
| 1 采集 | 六种信源（rss/web_list/json_list/x_search/mp_account/external）→ 判重 + 补正文 → `articles` | 无 |
| 2 预筛 | 标题/正文 → "是不是本行业的事"（**宽召回**）→ `PASS`/`BLOCK`/`UNKNOWN` | ×1 |
| 3 评分 | **原始标题 + 全文**（**故意不喂**来源分级/来源名/一手性/门槛）→ 独立打两次 0–100 | ×2 |
| 4 写作 | 中文标题、**答案先行摘要**、推荐理由、标签 | ×1 |
| 5 结构化 | 分类、标签、主体、事件事实（**与评分并行**） | ×1 |
| 6 归组 | 新报道 + 最近候选事实 → **四类关系**判定 → 事实/事件归属 + 事件综述 | ×1（+1 复核） |
| 7 成刊 | 日报 08:00 / 周报 / 月报（北京时间） | ×1 |

**关键阈值与公式**（源码常量）：

- **两次评分**：`SCORE_CALLS=2`，**同一模型同一输入串行两次**（独立计费、独立采样，非两个模型）；门槛 `score1+score2 ≥ 2×阈值`；展示分 `Math.floor(sum/2)`（"永不让半分自己决定入选"）；分级门槛 **T1 60 / T1.5 65 / T2 76**，**无门槛的分级根本不评分**。
- **聚簇**：召回 `RECALL_DAYS=14`（按 **`discovered_at`**）、余弦 `RECALL_MIN_COSINE=0.6`、`RECALL_TOP_FACTS=10`；四类 `SAME_OCCURRENCE`/`SAME_STORY`/`UNRELATED`/`ROUNDUP`；余弦 **<0.85 必须换模型复核**；两事件合并要**两次判定（含 A/B 顺序对调）都过线**（0.75/0.8 有 370 条标注 pair 实测：precision 0.944 / recall 0.962）。
- **热度**：`heat = Σ 0.5^((t−observed_at)/24h)`，窗口 48h，**按独立参与者去重**（不是按文章），`participants ≥ 2` 且 ≥1 编采来源才入榜；与 **6 小时前**比出趋势。
- **成本**：每条新资料约 **6.1 次**模型调用（首次导入 152 条 ≈ **930 次**）；每服务**每分钟/小时/天三级预算熔断**（并发 worker 也无法超支）；付费请求**先落回执再发**，"结果不明"**不自动重发**（防重复付费）。

**"KnowHow 即提示词"**：`industry/` 是 npm workspace 包（`site.ts`/`taxonomy.ts`/`sources.json`/`prompts/` 28 个/`selection.ts`/`features.ts`）；**提示词版本 = 内容哈希**，纯提示词改动**零代码生效且不回算旧判定**；用自建 100–200 条 gold set（`eval-selection.ts`）校准，**先改标准、再动门槛**。

**五条可直接搬到跨节点聚合的设计要点**（**推断**，非 AIHOT 原话）：

1. **先定"一份公开投影"，再谈协议**——网页/RSS/API/MCP/sitemap 全读同一个公开读取层，否则汇总侧要写 N 套适配器。
2. **用 `snapshot + changes`（带游标）而非"拉 7 天再 diff"**——否则会把**撤回与改判**当新内容、也会漏掉改判过的老条目。
3. **必须携带来源节点的 `discoveredAt`，不能只带 `publishedAt`**——否则上游历史存量会被当新闻刷屏。
4. **匿名只读 + 条件请求 + 降级阶梯，比 apiKey 联盟更易真跑起来**；**Key 只留给写入侧**。
5. **抄"可解释排序 + 保守合并门槛"，别抄热度绝对数字**——形态可搬（独立来源去重 + 半衰期 + 最小证据量），**48h/24h/2 必须按自己节点频率重标定**；宁可少合并，也别把两件事焊在一起。

## 3. AIGNE 能提供什么

| 能力 | 事实 | 对 ArcBlog 的意义 |
| --- | --- | --- |
| 形态 | `@aigne/core` **1.72.0**、`@aigne/cli` **1.59.0**（`npm view` 实测）；Node ≥20 | 可直接作为依赖引入 |
| 记忆 | `DIDSpacesMemory`（`@aigne/agent-library`）：`{url, auth:{authorization:"Bearer …"}}` | **chat 记忆可落用户自己的 DID Space**，不落节点运营者 ⇒ 与"内容归创作者"同原则 |
| MCP | 双向：`McpAgent` 连外部；也能作 MCP Server / **MCP Blocklet**（示例只需 `BLOCKLET_APP_URL`，自带 `--interactive`） | **对接 ArcBlog 已有 `/mcp` 面（能力 #48）** |
| 模型 | 官方 **AIGNE Hub** 或自托管（Blocklet Store）；亦支持第三方 key | **模型费用可由用户自己的 Hub 承担**，运营者不垫钱 |
| 可观测 | `aigne observe`（本地 :7893 agent 追踪） | 与 ArcBlog 已有 `agent.*` 能力档 + **审计视图**互补 |
| 运行位置 | AUP 应用**无运行时依赖**（【平台边界】`blocklet.yaml` 只声明 AUP 资产） | AIGNE 只能落在**应用之外**：运营者脚本层 / 用户机器 / 独立 Blocklet（§8-Q3） |

> 更细的 AIGNE 字段级深挖（YAML 定义、hooks、streaming、Orchestrator、代码执行沙箱）**本轮仍在进行**，结论未回；本节只列已核项。

## 4. ArcBlog 家底盘点（三张清单）

### 4.1 【已实现】已有

| 需要 | 证据 |
| --- | --- |
| studio NFT 购买 + 质押 | `scripts/arcblog-node-nft.mjs`：`acquire`/`stake`/`claim`/`revoke`/`status`；`docs/02-产品需求/05-ID §…`（`PRD-ID-04` 五态） |
| 节点带可达地址 | `scripts/arcblog-node-nft.mjs:82-86` 记 `assetId`/`stakeAddress`/`owner`/**`endpoint`**/**`region`** |
| agent 工具面 **19 个** | `scripts/lib/agents.mjs:64-` 声明；读 8 + 写 4（`create_draft`/`update_draft`/**`publish_post`**/`create_product`）+ 管理若干 |
| 机器可读出口 | **`/p/rss.xml`**（`scripts/arcblog-rss.mjs` → `dist/.web-cache/`）、**`/p/llms.txt`**；`PRD-SITE-05` RSS 开关 |
| MCP 面 | 能力 **#48**【已实现】：`/mcp`、AFS RPC、`/p/llms.txt`；权限面 = **路径+操作+深度** |
| 发现声明 | Discovery Document（`arcblog-network.mjs discovery publish|show`）**已声明 `transport: ["afs","mcp"]`** |
| 能力档 + 审计 | `agent.read`/`agent.write`/`agent.publish`/`agent.economy`；**无 grant 即拒** + 审计视图（`PRD-AGT-02/03/04`） |

### 4.2 【规划中】半成品（当年留了位）

- **`list_studios` / `get_studio` 已声明但 `status: 'unavailable'`**，理由写明 **"no cross-node Studio registry in this platform version"**（`scripts/lib/agents.mjs`）⇒ **本命题正是激活它**。
- `arcblog-network.mjs` 的 `hub register|list|show|sync|remove`（**hub 那半要拆**）；`hub sync` 只改本机记录【平台边界】。
- 控制台 `?page=hub` 与 `?page=agents`（agent 页偏只读审计）。

### 4.3 概念 v2 必须新建

- **聚合/聚簇层**（AIHOT §2 的 KnowHow-as-prompt 模式 + SelectBench 校准）；
- **chat → 生成 → 发布** 的编排（AIGNE + 已实现的 write 工具）；
- **发现源**（§7-① 未定）；
- **订阅列表的产品面**（替代 hub 页）。

## 5. 传输通道的真相（本调研最关键的可行性结论）

| 通道 | 状态 | 证据 |
| --- | --- | --- |
| 根级自定义 HTTP（`/.well-known`、`/api/*`、`/rss.xml`、`/robots.txt`、`/sitemap.xml`） | 【平台边界】**❌ 全被 AUP 壳吞掉**（200 但 `text/html` 4,462 B） | 能力 **#49**；`_docs/arc-contracts.md:198` |
| **`/p/` 路径（Web Device / SSR 处理器）** | 【已实现】**✅ 可用**——站内 RSS 已从 `/rss.xml` 改到 **`/p/rss.xml`**，`llms.txt` 同族 | `_docs/arc-contracts.md:207-209`；`PRD-SITE-05` |
| 运行时 `/mcp` | 【已实现】运行时已有（非 AUP 页面 ⇒ **不受 #49 限制**） | 能力 **#48** |
| AFS `networkRead` + `replicated` | 【已实现】前缀授权读；**声明什么才可读什么** | 能力 #13 族；`blocklet.yaml:39-45` |
| `arc space sync` 远程端点 | 【未验证】自签证书报错 / `http://` 授权 5 分钟超时 —— **探针 `U10`**（`PRD-NET-06` 前置门） | `docs/05-开发文档/07 §1` `U10`、`§6 P11` |
| 跨节点数据搬运 | 【平台边界】**❌ 没有任何实现**（`hub sync` 只改本机；`endpoint` **只存不拨号**）；但 **F5 警示断言"平台不支持"也是错的**——有通用原语、只是未验证 | 能力 **#52**；`02a §F4/F5` |
| 真链枚举 | 适配器只有 `listFactories()` / `assetsByOwner(owner)` / `stakeState(stakeAddress)` —— **无"全局列出已质押 studio"** | `scripts/lib/chain.mjs`（ocap 适配器） |

> **结论**：**"agent 走 `/p/` 匿名只读聚合"这条路今天就成立**，不必等 `U10`；`U10` 决定的是"**搬运/订阅式同步**"能不能做（更强、但未验证）。**"发现"仍缺数据源**（§7-①）。

## 6. 影响面（概念 v2 要动什么）

| 层 | 影响 |
| --- | --- |
| `docs/02-产品需求` | `PRD-ECO-01…08`（**8 条**）整体作废；`PRD-NET-02/03/05/07` 以 hub 为前提需重写、**`PRD-NET-06` 从"立项不实施"升为主干**；`PRD-AGT-01…05` 升为主干并需扩"发现/汇总/chat/生成"；`PRD-ID-04` 删去"Hub mock" |
| `docs/01-产品概念` | 五问 ①（是什么）、④（不可替代性）、§3.2 用户优先级、`03-使用旅程` **J8** 需重写 |
| `docs/03`–`docs/07` | 控制台**至少 5 页退出**（`hub`/`orders`/`policy`/`access`/`ledger`）⇒ **21 → 16 页**；`agents` 页从审计升级为**主入口** |
| 实现 | 需新代码：聚合/聚簇/chat/生成编排；`hub` 与 `economy` 代码路径下线（**含 `store.aup:21` 的 `content.visibility` 前缀缺陷 `DEF-02`，随经济一起消失**） |
| 纪律 | 64 篇**当前均"已定稿冻结"**（sha256 已记账）⇒ **概念级变更不得直接改冻结正文**，须走"调研 → 提纲 → 人类批准 → 概念 v2 重写 → 重跑后续阶段门" |

## 7. 三道验证门（按风险排序）

**① 发现源（**待人类裁决**，非技术验证）**：`list_studios` 的数据从哪来？
- 链上枚举（需研究 NFT 合约是否可枚举 / 需事件索引）；
- **由某个 agent 发布的公开目录**（功能上仍是目录，只是运营者从"Hub 角色"变成"跑 agent 的人"）；
- **gossip 播种**（节点间互相引用 `discovery.json`）。
⇒ **建议**：先做 gossip + `/p/` 聚合（零新基建），把链上枚举作为【规划中】；避免"名义去 hub、实质留 hub"。

**② `U10`（已有编号与判定式）**：`arc space sync` 远程端点。需**写权限环境**（隔离命名实例 + 受信证书或 `--token`）；先 `--dry-run`；`--mirror`/`rm` 一律不跑。**它是 `PRD-NET-06` 的前置门。**

**③ 远端 `/mcp` 可达性与鉴权（建议新增探针）**：两个隔离实例，A 节点经 `/mcp` 读 B 节点公开只读面；核 **可达性 / 身份 / 权限面（路径+操作+深度）**。参考：AIHOT 的 MCP **做 Host 校验**（非 `SITE_URL` 域名返回 421，跨节点需 `MCP_ALLOWED_HOSTS` 加白）⇒ **同类问题在 ARC 上必须实测，不得推断**。

## 8. 待人类裁决（阻塞概念 v2 提纲）

| # | 问题 | 选项 | 影响 |
| :-: | --- | --- | --- |
| **Q1** | **发现源** | A 链上枚举 / B 允许"某 agent 发布的公开目录" / C 纯 gossip 播种 | 决定 `list_studios` 实现与"是否真的去 hub 化" |
| **Q2** | **chat 记忆归属** | A AIGNE `DIDSpacesMemory`（用户 DID Space，需凭证）/ B 先本地或节点侧 | 决定隐私承诺与上手门槛 |
| **Q3** | **聚合 agent 跑在哪** | A 运营者脚本层 / B 用户机器（MCP 客户端）/ C 独立 AIGNE Blocklet | 决定部署形态与计费方 |
| **Q4** | **旧 hub 与经济怎么处置** | A 直接删除（文档+代码）/ B 标记废弃保留一版 | 决定 `PRD-ECO` 8 条是"作废"还是"删号" |
| **Q5** | **是否 push 本地 111 个提交** | A 先 push v1 存档再开 v2 / B 本地直接演进 | 决定 v2 的起点与回滚面 |

## 9. 未核验与边界（诚实声明）

- **AIGNE 的字段级深挖未回**（YAML 定义 / hooks / streaming / Orchestrator / 代码执行沙箱 / `AIGNE Hub` 计费细节）⇒ §3 只列已核项，**未写"文档未说明"以外的推断**。
- **AIHOT 的 `/api/v1/*` 实时字段未调**（只读 `/llms.txt`、`/api/v1/agent`、`/agent`、`/hot`）⇒ v1 字段名以 `/openapi-v1.json` 为准。
- **未做任何探针**：`U10`、远端 `/mcp`、链上枚举**均未实测** ⇒ 相关结论在 §5/§7 已标【未验证】/【平台边界】。
- **未改任何冻结正文或源码**；§6 的影响面是**基于仓库实读的估算**（PRD 条数与页面数已核），不是已批准的方案。
