# 05 · AGT Agent 接入（**主干**）

| 字段 | 值 |
| --- | --- |
| 状态 | **已定稿（v1.0）** |
| 版本 | v1.0 ｜ 2026-10-01 ｜ 主笔 `dev-doc` |
| 上游 | [`00-需求地图与规范.md`](00-需求地图与规范.md)（§2 领域图：`AGT` 为**主干域**；§5 **S2-B 裁决：注册表归 `NET`、读取归 `AGT`**）；[`00a-需求模板与验收规范.md`](00a-需求模板与验收规范.md)（模板列 / 验收规范 A1–A5）；**已冻结** [`docs/01-产品概念/`](../01-产品概念/00-导读.md)（`02 §2 A`、`03 §J2/J4`、`04 §1` 发现/汇总/记忆/公开面）；[`concept-口径裁决-Lead.md`](../team/concept-口径裁决-Lead.md)（§4 不变口径、§5 裁决 D1/D4/D5） |
| 下游 | Stage 3（`?page=agents` 主入口升级）；Stage 6 台账（`FP-AGT-*`）；[`03-NET`](03-NET-发现与网络.md)（注册表）、[`04-ID`](04-ID-身份与角色.md)（授权面）、[`01-CNT`](01-CNT-内容创作.md)（生成稿的人审与署名）、[`02-SITE`](02-SITE-发布与站点.md)（只读出口契约） |
| 证据基线 | 工具面与授权面逐项实测：`scripts/lib/agents.mjs:24-27`（读/写算子）、`:45`（五档能力）、`:74-75`（发现工具 2026-10-12 已 available —— `PRD-AGT-12`）、`:263`（grant 目录）；工具条数 = `AGENT_TOOLS` **12**（2026-10-12 `node -e` 实测；本条基线原记 19，值随 `PRD-AGT-13` 与去经济/去 hub、`list_summaries` 演进而更新）；通道 = `/p/llms.txt` 实测 **200**、`/p/rss.xml` 实测 **200 `application/xml`**（**部署管线步骤 3b** 生成，`DEF-28`；2026-10-12 同步） |
| 事实标签 | 五类（门槛 = [`docs/README.md`](../README.md) §3.1）；**本目录不写实现状态六态**（出处 = `docs/06-功能开发列表/`） |

> **领域范围（主干）**：agent 的**公开读取面**、**发现 → 汇总 → chat → 生成草稿 → 发布**的编排、**能力档与授权**、**记忆（先本地）**、工具面与审计。
> **与相邻领域的分界**：**注册表本身归 [`03-NET`](03-NET-发现与网络.md)**（"有哪些节点、可达信息是什么"）；本篇只写"**读到之后做什么**"。**"页面上怎么呈现"归 Stage 3**。
> **三条不变口径**：① 能力 = 角色派生 + **fail closed**；② **写工具不从 agent 面跑**；③ **发布只能落在应用之外**（运营侧 CLI）。

---

## 1. 能力组

| # | 能力组 | 一句话 | 覆盖的 `PRD-` |
| :-: | --- | --- | --- |
| K1 | 公开只读面 | 消费 `/p/llms.txt`、运行时 `/mcp`、`/p/rss.xml`（**匿名、无需 Key**） | `AGT-01`、`AGT-05` |
| K2 | **发现** | 读**链上注册表**得到节点列表，再按 `endpoint` 去读（注册表定义在 `NET`） | `AGT-06` |
| K3 | 授权与能力档 | 五档能力、**无 grant 即拒**、高风险默认关闭、`agent.admin` 不可授予 | `AGT-02`、`AGT-03` |
| K4 | 审计 | 每次 agent 操作可回溯 | `AGT-04` |
| K5 | **汇总** | 采集 → 预筛 → 评分 → 组合，**可解释** | `AGT-07` |
| K6 | **chat** | 基于汇总结果对话（"为什么这条入选"） | `AGT-08` |
| K7 | **生成草稿** | 产出草稿并交人审（与人工稿同构） | `AGT-09` |
| K8 | **发布** | 应用之外完成（运营侧 CLI，可 `--sign-key`） | `AGT-10` |
| K9 | **记忆** | 先本地；DID Space 备份后期 | `AGT-11` |
| K10 | 工具面与范围对齐 | **激活发现类工具**（P0）+ **工具面收敛到现行范围**（P2） | `AGT-12`（激活）/ `AGT-13`（收敛） |

---

## 2. 需求总表（`PRD-AGT-*`）

| PRD-ID | 一句话需求 | 概念条款 | 旅程/落点 | 现状标签 | 阻塞 | 优先级 | 验收 | 证据 | 验证者 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `PRD-AGT-01` | 未配置节点的 agent **只暴露公开只读面** | `02 §2 A①`、`04 §1` 公开面 | `03 §J4` 步 3；`?page=agents` | 【已实现】 | 无 | P0 | `node scripts/arcblog-agent.mjs tools` → 只读工具可执行、写工具在无 grant 时被拒（返回显式原因） | `scripts/lib/agents.mjs:24-27`（读/写算子）、`:30-33`（敏感路径前缀） | 独立方（Stage 6 指派） |
| `PRD-AGT-02` | 工具**按能力分级**，高风险**默认关闭**，`agent.admin` **不可授予** | `02 §2 A②`、`04 §1` 能力档 | `03 §J4` 步 1 | 【已实现】 | 无 | P0 | `node scripts/arcblog-agent.mjs tools` → 12 条各带 `capability`/`kind`；`agent.admin` 三条为 `closed` 且**不可授予** | `scripts/lib/agents.mjs:45`（五档）、`:27`（`WRITE_OPS` default-closed）；实测 `AGENT_TOOLS` = **12**（2026-10-12） | 独立方（Stage 6 指派） |
| `PRD-AGT-03` | 授权**签发/撤销/TTL**；到期即拒 | `02 §2 A②` | `03 §J4` 步 1；`?page=agents` | 【已实现】（CLI）/【规划中】（页面签发） | 无 | P1 | `node scripts/arcblog-agent.mjs authorize --agent did:key:z… --capability agent.write --ttl 30` → 落 `config/agent-grants/<didHash>.json`；过期后再用被拒 | `scripts/lib/agents.mjs:263`（grant 目录）；页面侧签发**待落** | 独立方（Stage 6 指派） |
| `PRD-AGT-04` | 每次 agent 操作**可审计**，且页面有只读审计视图 | `02 §2 G`、`03 §J4` 卡点③ | `03 §J4`；`?page=agents` | 【已实现】（CLI 审计）/【规划中】（页面视图） | 无 | P1 | `node scripts/arcblog-audit.mjs log\|read` 有记录；页面只读展示**尚未落** | `scripts/arcblog-audit.mjs`；`?page=agents` 为 agent 工作面**主入口** | 独立方（Stage 6 指派） |
| `PRD-AGT-05` | 接入面**可被发现**，且如实声明可达通道 | `02 §2 A①`、`04 §1` 公开面 | `03 §J4` 步 3；`/p/llms.txt`、`/mcp` | 【已实现】（`llms.txt`/`/mcp` **由运行时提供**；`rss.xml` 由**部署管线步骤 3b** 生成 —— 2026-10-12 同步） | 无 | P1 | `curl -s -o /dev/null -w '%{http_code}' /p/llms.txt` → **200**；`/p/rss.xml` → **200 `application/xml`**（本轮实测）；⚠️ **裸 `arc blocklet build` 会重建 `.web-cache/` 把它抹掉** ⇒ 走 `node scripts/arcblog-deploy.mjs` | 通道实测：`/p/llms.txt` 200 / `text/plain`；`scripts/arcblog-deploy.mjs` 步骤 3b + 部署后校验（`DEF-28`） | 独立方（Stage 6 指派） |
| `PRD-AGT-06` | **发现**：agent 读**链上注册表**得到全部节点，再按节点 `endpoint` 读内容 | `03 §J4` 步 2、`04 §1` 发现/链上注册表 | `03 §J4` 步 2；`?page=agents` | **【已实现】**（2026-10-12 同步） | 无 | **P0** | **已跑**：`node scripts/arcblog-agent.mjs run --tool list_studios --json` → `{ok:true, total:0, nodes:[]}`（读 `node/registry.json` 投影，`stale:false`）；`run --tool get_studio --stake-address <addr> --content --endpoint <origin>` → 只读远端；工具表 **12** 个（read **8** / write **3** / closed **1**） | `scripts/lib/studio-registry.mjs`（读投影）+ `scripts/lib/node-content.mjs`（远端只读）+ `scripts/lib/agents.mjs`（两条 `status: available`）；台账 [`06/01` `PRD-AGT-06`](../06-功能开发列表/01-功能台账.md) | 独立方（Stage 6 指派） |
| `PRD-AGT-07` | **汇总**：对多节点公开内容做采集 → 预筛 → 评分 → 组合，且**排序可解释** | `03 §J4` 步 4、`04 §1` 汇总 | `03 §J4` 步 4 | **【已实现】**（2026-10-12 同步：**确定性聚合**） | 无 | **P0** | **已跑**：`node scripts/arcblog-summarize.mjs build --from-registry --id s1` → 落 `node/summaries/s1.json`；`show s1` → `ok:true`；`npm run test:file -- scripts/arcblog-summarize.test.mjs` → **30/30**（同输入两次 deepEqual、打乱输入仍同序、`cited[]` 可回溯）。⚠️ **非空 picks 路径当前不可复现** —— 注册表投影 `0 node(s)`（beta 质押已撤销）⇒ 该路径待**活节点** | `scripts/lib/summarize.mjs`（纯函数、固定 `WEIGHTS` + 全序键 `(-score, slug, stakeAddress)`）+ `scripts/arcblog-summarize.mjs`；台账 [`06/01` `PRD-AGT-07`](../06-功能开发列表/01-功能台账.md) | 待定（独立方） |
| `PRD-AGT-08` | **chat**：基于汇总结果与用户对话，可回答"为什么这条入选" | `03 §J4` 步 5 | `03 §J4` 步 5 | **【已实现】（确定性部分）**＋**【平台边界】（LLM 对话面）**（2026-10-12 同步） | 无 | **P0** | **已跑**：`node scripts/arcblog-summarize.mjs ask --id s1 --question "why this one" --json` → `matched=pick-reason`、`basis=record`、`answerable:true`，答案**如实**说"`pickCount=0` ⇒ 没有可比对节点"（**不编造**）；`cited[]` 每条可回溯记录字段 | `scripts/lib/summarize.mjs`（`ASK_INTENTS`/`matchAskIntent`/`answerFromSummary`）；**降级（对话面）** = 确定性上下文 + 可复制命令，`--llm` 仅为运营侧接线点（**未接模型**，`--llm + --json` fail closed；平台无 LLM 原语）；台账 [`06/01` `PRD-AGT-08`](../06-功能开发列表/01-功能台账.md) | 待定（独立方） |
| `PRD-AGT-09` | **生成草稿**：agent 产出草稿 → **人审** → 与人工稿同构 | `03 §J4` 步 6、`04 §1` agent 聚合 | `03 §J4` 步 6–7；`?page=compose-edit` | **【已实现】**（2026-10-12 同步） | 无 | **P0** | **已跑（live 2/2）**：`npm run test:file -- scripts/arcblog-agent-draft.test.mjs` → 彩排落 `drafts/agent-draft-rehearsal-*.json`；**草稿键集 25 == 人工稿键集 25 == `world/post.yaml` 25 字段**（含顺序）；只读面负向：`get_post` NOT_FOUND、`search_posts` count 0 | `scripts/arcblog-agent.mjs` 的 `create_draft`（`agent.write` 授权路径）+ 字段集同构守卫 `scripts/arcblog-agent-draft.test.mjs`；跨域 = [`PRD-CNT-08`](01-CNT-内容创作.md)；台账 [`06/01` `PRD-AGT-09`](../06-功能开发列表/01-功能台账.md) | 待定（独立方） |
| `PRD-AGT-10` | **发布只能在应用之外完成**（运营侧 CLI，可签名） | `03 §J4` 步 7、`04 §1` 发布 | `03 §J4` 步 7；CLI | **【平台边界】** | 待平台能力（`B3`） | P0 | 降级 = 页面**不提供**发布按钮；命令 = `node scripts/arcblog-lifecycle.mjs publish … --sign-key node.key` | 应用无运行时依赖；平台边界 = [`docs/05-开发文档/02-平台能力与边界.md`](../05-开发文档/02-平台能力与边界.md) `B3` | 待定（独立方） |
| `PRD-AGT-11` | **记忆先本地**；DID Space 备份**后期** | `03 §J4` 步 1、`04 §1` 记忆 | `03 §J4` 步 1 | **本地【已实现】**（2026-10-12 同步）＋**备份【平台边界】** | 无 | P1 | **已跑（2/2）**：`npm run test:file -- scripts/arcblog-memory-cli.test.mjs`；落点 = `${ARCBLOG_MEMORY_DIR:-<repo>/.arcblog/memory}/<sessionId>.jsonl`（**AFS 之外**，`.gitignore` 已覆盖）；负向硬判据 = AFS 列目录 `memory*` = []、直读 = null。**降级（备份面）** = 本地 JSONL（备份面平台无原语 ⇒ 后期再议） | `scripts/lib/memory.mjs` + `scripts/arcblog-memory.mjs`（`remember\|recall\|list`）；台账 [`06/01` `PRD-AGT-11`](../06-功能开发列表/01-功能台账.md) | 待定（独立方） |
| `PRD-AGT-12` | **激活发现类工具**（`list_studios`/`get_studio` 从 `unavailable` 转可用）——**`PRD-AGT-06` 的使能条件** | `02 §2 A②`、`03 §J4` 步 2 | `03 §J4` 步 2 | **【已实现】**（2026-10-12 同步） | 无 | **P0** | **已跑**：`node scripts/arcblog-agent.mjs tools` → 两条工具均 **available**（`resource: node/registry`）；节点集合一致性已断言（`list_studios` 集合 = `registry show` 集合，live 用例 deepEqual） | `scripts/lib/agents.mjs`（两条 `status: available`）+ `scripts/lib/studio-registry.mjs`；跨需求前置 [`PRD-NET-01`](03-NET-发现与网络.md) 已落地；台账 [`06/01` `PRD-AGT-12`](../06-功能开发列表/01-功能台账.md) | 待定（独立方） |
| `PRD-AGT-13` | **工具面与产品范围对齐**（19 → 13；后随 `ENG-16` 再退役 2 个 + `list_summaries` 加回 1 个 ⇒ **现行 12**） | `02 §2 A②`、`04 §1` 能力档 | `03 §J4` 步 1 | **【已实现】**（2026-10-12 同步） | 无 | P2 | **已跑（2026-10-12）**：`node scripts/arcblog-agent.mjs tools --json` → `count: 12`，kind 分布 **read 8 / write 3 / closed 1**；被移除的**六个名字**逐个不出现，且**读面未被误删** | `scripts/lib/agents.mjs` 实测：六个名字已删（`grep -c "agent.economy"` = **0**）；⚠️ **仍须按名字核、不得按 capability 筛**（历史上 `list_products`/`get_policy` 挂在 `agent.read`）；台账 [`06/01` `PRD-AGT-13`](../06-功能开发列表/01-功能台账.md) | 待定（独立方） |

---

## 3. 未验证与探针（**凡【未验证】必给验证方法与判定式**）

| 关联 | 未验证什么 | 验证步骤 | 判定式 | 阻塞 |
| :-: | --- | --- | --- | --- |
| `PRD-AGT-06` | ~~**链上枚举**在真链的分页/延迟/上限~~ **已跑（`P-1` mock + `P-2` beta）** | ① mock 侧"按 receiver 索引的 stake 注册表" ② 两个"节点"各质押一个资产 ③ 真链只读查询（`size=10` + cursor） | 返回条数 = 质押数；**未质押的不出现**；分页游标可续（`scripts/arcblog-network.test.mjs` **18/18** + `P-2` `code: OK, total: 1`） | **无**（`P-1` 写操作只在 mock 内；真链为**只读**） |
| `PRD-AGT-07` | ~~"汇总"的**可解释排序**在跨节点输入下是否稳定~~ **已跑（30/30）** | `npm run test:file -- scripts/arcblog-summarize.test.mjs`（同输入两次 + 打乱输入序） | 同一输入两次输出**排序一致**（确定性），且每条能给出判据来源（`cited[]` 可回溯） | 无（本地可跑） |
| `PRD-AGT-11` | ~~**记忆**放哪~~ **已裁（归用户）+ 已跑（本地 2/2）**；DID Space 备份触发方式仍待验证 | `npm run test:file -- scripts/arcblog-memory-cli.test.mjs`（新进程 `recall` 复述 + AFS 负向断言） | 记忆**不落节点 AFS**（列目录空 / 直读 null）；重启进程后仍可复述 | 备份面 = **【平台边界】**（降级 = 本地 JSONL）；`U10` 未验证 |

> **状态（2026-10-12 同步）**：本节三条已从"待验证方法"变成"**已跑结果**"（mock/本地）；**仍待执行的只剩真链写批次**（见 [`04-ID §3`](04-ID-身份与角色.md)）与 `U10` 的远端同步（**决策型已裁**：暂不提供远端端点）。

---

## 4. 不做什么（本域）

| 项 | 理由 |
| --- | --- |
| 不做**平台侧**的注册表/目录服务 | 发现源是**链上注册表**（[`03-NET`](03-NET-发现与网络.md)）⇒ 不新建目录服务（概念 `02 §5`） |
| 不做平台侧集中推荐/排名 | `01 §6`：谁被看见不由平台决定；聚合权在用户 |
| 不做超出产品范围的工具与能力档 | 工具面与现行范围对齐 ⇒ `PRD-AGT-13` **按名字**移除 6 个工具；**不得按 capability 筛**（`list_products`/`get_policy` 今天挂在 `agent.read` 上） |
| 不做 `agent.admin` 类操作 | 管理类工具**不进 agent 面** |
| 不绑定外部 agent 框架（如 AIGNE） | 许可（Elastic-2.0）与依赖面属实现决策 ⇒ 走 `docs/05` + 人类批准 |
| 不在应用内发布 | **【平台边界】**（`PRD-AGT-10`） |

---

## 5. 开放问题

> 下列各条**均为【决策待定】**：事实已清楚，只待人拍（【决策待定】的条目**不排期**，见 [`00a §2`](00a-需求模板与验收规范.md)）。

| # | 问题 | 影响 | 裁决人 |
| :-: | --- | --- | --- |
| A1 | 汇总/chat/生成是**三条**还是收成一条（粒度，`00 §9 O1` 同源） | `AGT` 条目数 | Lead |
| A2 | 发现类工具的**返回形态**（节点列表 vs 逐个 `get_studio`）与分页口径 | `PRD-AGT-06` 验收 | Lead + Dev |
| A3 | 个人 agent 与**第三方 agent** 是否分档（`02 §6 R2`、`04 §4 T-Q4`） | `PRD-AGT-02/03` 的授权面 | Lead |
| A4 | 记忆的**落点**（运营侧脚本 vs 用户设备）是否要在本阶段定 | `PRD-AGT-11` 验收写法 | Lead |
| A5 | `PRD-AGT-10` 的"发布"是否需要一个**页面上可复制的命令**（而非仅写"应用外完成"） | Stage 3 落点 | Lead |
| A6 | **阻塞词表缺"待前置（依赖其它需求）"**（它**等的是另一条需求先落地**，既不是平台限制、也不是人的决策；`AGT-06`/`AGT-12`/`OPS-07` 均已于 2026-10-12 落地 ⇒ 本条**只剩词表口径**这一 Stage 2 遗留） | **词表唯一定义点在 `docs/06-功能开发列表/`** ⇒ 这是**给 Stage 6 的输入项**，`02` **不自行扩词**；本轮落法 = 阻塞写 `无`、依赖写进**验收/前置列** | 人类 / Lead（**Stage 2 遗留**） |

---

## 变更记录

| 日期 | 版本 | 变更 |
| --- | --- | --- |
| 2026-10-01 | v1.0 | 首版 |
