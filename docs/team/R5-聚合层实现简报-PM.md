# R5 · agent 聚合层实现简报（PM）

> 基线 `f6010d7` ｜ 2026-10-12 ｜ PM ｜ **只读分析产物**（不改源码/docs 正文、不 git）
> **结论先行**：R5 做得到的只有**「确定性汇总 + 可解释理由」**（AGT-07）与**「工具面已通、只缺端到端彩排」**（AGT-09）。**AGT-08 的对话必然部分实现**（平台无 LLM、页面不得持 Key，只能给"确定性上下文 + 外部 LLM 接线点"）。**AGT-11 的"备份"是平台边界 + 待裁决，本轮不得写进验收。**
> **口径纪律**：判定式一律沿用台账口径（`通过`/`未通过`/`未测`/`不适用`，[`00 §2.2.1`](../06-功能开发列表/00-台账总览与规范.md)）；**"平台不行"必指到 `B*`，"本项目没接"必给接线点**（[`02 §判据①`](../05-开发文档/02-平台能力与边界.md)）；不臆造 ARC API（存疑处一律写**核验命令**）。

---

## 1. 逐条落点（要建什么 / 命令 / 判定式）

### `PRD-AGT-07` 汇总（P0，本轮主干）
**要建**：① world schema `world/summary-pick.yaml`；② `scripts/lib/summarize.mjs`（采集→预筛→评分→组合，纯函数、无网络）；③ 记录 `${INSTANCE_ROOT}/node/summaries/<id>.json`（**公开只读投影**，与 `node/registry*` 同族：[`scripts/lib/network.mjs:27,36`](../../scripts/lib/network.mjs)）；④ CLI `arcblog-summarize.mjs build|show <id>`；⑤ agent 工具 `list_summaries`（`agent.read`，`AGENT_TOOLS` [`agents.mjs:64`](../../scripts/lib/agents.mjs)）；⑥ `?page=agents` 汇总段（`afs-list` 读投影）。**采集面复用现成件**：`listStudioNodes`/`readStudioNode`（[`studio-registry.mjs:84,119`](../../scripts/lib/studio-registry.mjs)）+ `fetchNodeSurface({path:'/p/llms.txt'})`（[`node-content.mjs:72`](../../scripts/lib/node-content.mjs)）——**R4 已在施工，R5 只读不重写**。
**验收（可跑）**：
```bash
node scripts/arcblog-summarize.mjs build --from-registry --id s1 --limit 10
node scripts/arcblog-summarize.mjs show s1   # 跑两次，diff 输出
npm run test:file -- scripts/arcblog-summarize.test.mjs
```
**判定式**（不动台账原文）：同一输入两次输出**排序一致**（确定性）且每条给出**判据来源**（[`05-AGT §3`](../02-产品需求/05-AGT-Agent接入.md)）；记录带**来源节点 `stakeAddress` + `discoveredAt`**；每条附 `reason`（同 §2 `PRD-AGT-07` 验收行）。

### `PRD-AGT-08` chat（P0，**只能部分实现**）
**要建**：`summarize ask --id <summaryId> --question <q> [--json]` —— 只用**汇总记录本身**（`picks[].reason` + 权重 + 来源）组装答案，**每条断言必须回填 `cited` 字段（判据来源 ID）**；可选 `--llm <cmd>` 接线点把该上下文交给运营侧已有 LLM CLI（**本项目没接，不是平台不行**）。`?page=agents` 只渲染**可复制命令**，不渲染对话框。
**验收**：`node scripts/arcblog-summarize.mjs ask --id s1 --question "为什么这条入选" --json` → `cited[]` 非空且每条 `cited` 都能在该 `s1` 记录里找到（判定式 = "引用了汇总的实际判据，非泛泛而谈"，[`05-AGT §2`](../02-产品需求/05-AGT-Agent接入.md) `PRD-AGT-08` 行）。

### `PRD-AGT-09` 生成草稿（P0，**编排缺、工具在**）
**要建**：一条**端到端彩排**（`create_draft` → `arcblog-lifecycle.mjs draft` 已实现：[`arcblog-agent.mjs:200-206`](../../scripts/arcblog-agent.mjs)）；补一条 **字段集同构**测试：草稿记录的 key 集 == 人工稿 key 集（`world/post.yaml` 的 21 字段）。
**验收**：`node scripts/arcblog-agent.mjs run --tool create_draft --agent did:key:z… --title T --author-did did:key:z… --body-file d.md` → 落 `/instance/app/arcblog/drafts/<slug>.json`；**判定式**：字段集与人工稿**一致、无额外私有字段**（[`05-AGT §2`](../02-产品需求/05-AGT-Agent接入.md) `PRD-AGT-09` 行）；只读面不得看见草稿（`SENSITIVE_PATH_PREFIXES` [`agents.mjs:29`](../../scripts/lib/agents.mjs)）。

### `PRD-AGT-11` 记忆先本地（P1，**只实现"先本地"**）
**要建**：`scripts/lib/memory.mjs` + CLI `arcblog-memory.mjs remember|recall|list`；落点见 §4。
**验收**：`remember` 后重启进程 `recall` 仍可复述；**判定式**：记忆**不落节点 AFS**（[`05-AGT §3`](../02-产品需求/05-AGT-Agent接入.md)）＋`ls /instance/app/arcblog/node/memory* 2>/dev/null` **必须为空**（负向判据，比正向更硬）。**DID Space 备份本轮不验收**（§6）。

---

## 2. 平台可行性：**"平台不行" vs "本项目没接"**

| 事项 | 结论 | 出处 / 核验命令 |
| --- | --- | --- |
| 页面调 LLM | **平台不行（本项目层无面）**。DSL schema 无 LLM/模型原语：`arc dsl schema --json \| grep -c llm` → **0**；AUP 表达式只有 `$session.*`/`$state.*` 且**无比较/无字符串运算**，页面无法组装提示词；页面若持 API Key 即密钥入库 ⇒ 触 **B11** 邻域 | 核验：`arc dsl schema --json \| python3 -c "import sys,json;print(json.dumps(json.load(sys.stdin)).count('llm'))"` ｜降级 **P3**（可复制命令） |
| 跨节点 HTTP 读取 | **CLI 层可行**（R4 已实测 `/p/llms.txt` 200；`/api/afs/rpc` 匿名读，[`node-content.mjs:1-36`](../../scripts/lib/node-content.mjs)）；**页面层不行**——`frame` 是跨源 sandbox，且根级端点被应用壳吞掉（**B1**）⇒ 跨节点内容只能 **CLI → 记录 → 页面读记录**（**P5** 生成器投影） | 核验：`curl -s -o /dev/null -w '%{http_code}' <endpoint>/p/llms.txt`；**B1** = [`02 §2`](../05-开发文档/02-平台能力与边界.md) |
| 向量检索 / 内存 | **本项目没接**（不是平台不行）。平台检索索引 `/modules/index` 支持 FTS + **可选** vectors（技能 `index`）；本仓**零调用点**：`grep -rc "modules/index" scripts/ \| grep -v ':0'` → 空。**R5 用不到**（确定性关键词评分，理由可读） | 降级 = 关键词/标签评分；升级 = 后续批接 `index`（需先在 [`07`](../05-开发文档/07-未决技术问题与探针计划.md) 立探针号） |
| 应用内发布 | **平台不行**（**B3**） | 降级 = 可复制命令 `node scripts/arcblog-lifecycle.mjs publish … --sign-key node.key`（**P3**） |
| 名单类"共 N 条" | **平台不行**（**B5** 索引陈旧）⇒ 汇总记录**自带 `total` 并写口径**，页面禁自算 | **P6**；[`02a F5`](../05-开发文档/02a-平台禁止与降级模式.md) |
| `node/summaries/` 的匿名读 | **本项目没接**（`node/` 前缀授权**已在**，[`blocklet.yaml:144-148`](../../blocklet.yaml)；但该子目录**从无读写记录、无测试覆盖** ⇒ 只能在实例上实测，**不许推断**） | 接线点 = 匿名 `POST /api/afs/rpc` 读 `/instance/app/arcblog/node/summaries/`（脚本形态见 [`arcblog-permissions.test.mjs:14`](../../scripts/arcblog-permissions.test.mjs)）+ 把它纳入该矩阵 |
| 跨节点分发/订阅式同步 | **平台不行**（**U10**：平台不内置，`arc space sync` 未跑通） | 降级 = 只读聚合（`/p/` 出口，**P7**） |

---

## 3. 确定性从哪来 + "可解释"怎么落成字段

- **确定性三件套**：① **输入固定**（同一 `registry.json` + 同一节点集合，`--from-registry` 不重新探活）；② **固定权重常量**（源码内 `const WEIGHTS = {...}`，不读时钟、不读随机、不读 LLM）；③ **稳定排序键** = `(-score, slug, sourceStake)`——末位用**全序 tiebreaker**，杜绝 `Array.sort` 在等分下的实现相关顺序。
- **每条的 `reason` 是可读字符串 + 结构化判据两件同出**：`reason: "reachability=reachable(+2) · 标签命中 technology(+1) · 摘要非空(+1) ⇒ 4"`；`score.terms: [{key,weight,hit,note}]`、`cited: [stakeAddress, fields]`。**页面只渲染 `reason`**（无比较/字符串运算，[`network.mjs:305-311`](../../scripts/lib/network.mjs) 同前例：**能在投影里预计算的，绝不留到页面**）。
- **`discoveredAt` 不能进排序**（时间会破坏确定性）——它是**展示字段**；排序只用 `WEIGHTS` + tiebreaker。

---

## 4. 记忆落点（AGT-11）

- **存哪**：`${ARCBLOG_MEMORY_DIR:-<repo>/.arcblog/memory}/<sessionId>.jsonl`（**仓库内、AFS 之外**，与 `node.key`/`.env.local` 同为 gitignored 运营侧状态）。**为什么**：判据是"**记忆不落节点 AFS**"（[`05-AGT §2/§3`](../02-产品需求/05-AGT-Agent接入.md)）；写进 `instance/…` 就等于**节点持有用户上下文**，与已裁口径（记忆归用户）冲突。
- **边界**：记忆只存**用户侧偏好/会话**，**不得**写入节点 DID 的公开投影（`node/registry*`）；**不得**把本节点私密数据（drafts、grants、orders）带进记忆（与 `SENSITIVE_PATH_PREFIXES` [`agents.mjs:29`](../../scripts/lib/agents.mjs) 同界）。
- 每个 CLI 调用**写一条 `arcblog-audit.mjs`**（`PRD-AGT-04` 复用，不新造审计）。
- **DID Space 备份 = 【平台边界】+【未验证】**：触发方式在平台上**没有已接线对象**（`U10` 未跑通），故本轮**不进验收、不写"可备份"**；要动先立探针（[`07 §2`](../05-开发文档/07-未决技术问题与探针计划.md) 编号纪律）。

---

## 5. 分批建议（每批一个提交粒度）

| 批 | 内容 | 独立验收 | 依赖 | 风险 |
| --- | --- | --- | --- | --- |
| **R5-a** | AGT-07 全套（schema+lib+CLI+记录+测试）+ `world/summary-pick.yaml` + 汇总记录授权声明 | `npm run test:file -- scripts/arcblog-summarize.test.mjs` + 两次 `show` diff | R4 的 `registry refresh`/`list_studios` 需先落地 | **低**（纯本地、无网络、无写链）；主要风险 = 打分被做成"看起来可解释"，故 `cited` 必须机检 |
| **R5-b** | AGT-09 端到端彩排 + AGT-08 `ask`（确定性 `cited` 生成器）+ `?page=agents` 渲染与文案降级 | `run --tool create_draft` + 字段集同构测试 + `ask --json` 的 `cited` 可回溯 | R5-a（`ask` 要读汇总记录） | **中**：页面增删会红 `arcblog-console-nav`/`arcblog-ui-budget`（[`05 §3`](../05-开发文档/05-测试分层与质量门.md)）；`agents.aup` 现有 "13 tools / read 7" 硬写文案**必须同步**，否则成 **B9** 假绿灯 |
| **R5-c** | AGT-11 先本地 + `list_summaries` 工具登记（**含** `agents/arcblog-agent/agent.json` 加 `/instance/app/arcblog/node/**` 已覆盖的 `list_summaries` 读面 + `node scripts/arcblog-agent.mjs check` 的 `tool-coverage` 项，见 [`agents.mjs:122-127`](../../scripts/lib/agents.mjs)）+ 审计复用 | 重启后 `recall`；负向 `ls …/memory*` 为空；`arcblog-agent.mjs check` → `failed: []` | R5-a/b | **低**，但**落点口径需人类拍板**（下） |

**需人类拍板**：① **A4/A8 记忆落点**（运营侧 `.arcblog/` vs 用户设备）——影响验收写法（[`05-AGT §5 A4`](../02-产品需求/05-AGT-Agent接入.md)）；② **是否允许在 `ask` 里接线外部 LLM**（引入运行时依赖，触 [`05-AGT §4`](../02-产品需求/05-AGT-Agent接入.md) "不绑定外部 agent 框架"的边界）；③ **A5**：`?page=agents` 是否给"可复制发布命令"（**B3/P3**）。

---

## 6. 诚实清单（现有平台下只能部分实现）

| 条目 | 只能做到 | 降级形态 / 出处 |
| --- | --- | --- |
| `AGT-08` chat | **确定性"为什么入选"回答 + 上下文导出**；自然语言对话面**不可**在应用内实现 | 页面给 `ask` 可复制命令（**P3**，[`02a §2`](../05-开发文档/02a-平台禁止与降级模式.md)）；真实 LLM 走运营侧接线点（**本项目未接**） |
| `AGT-11` 备份 | **只有"先本地"**；DID Space 备份**无触发对象** | 【平台边界】+ `U10` 未验证；本轮"不适用"（`结果=不适用` 口径） |
| `AGT-07` 节点数/覆盖率 | **不得**宣称"全部节点" | **B5/F5/F6**：写"本投影口径 = `registry refreshedAt` 时刻的 N 条"；`registry.show` 的 `total` 为唯一数字来源 |
| `AGT-09` 发布段 | 只到草稿；发布**必然**在应用外 | **B3**；`PRD-AGT-10` 已 `平台边界` |
| 页面侧发现/chat | 页面**只读记录**，不做采集与推理 | **B1** + `P5`（生成器投影）；所有判断在 CLI 预计算（[`network.mjs`](../../scripts/lib/network.mjs) 先例） |
