# BUG-051: `chain-intents` 队列仍用第三套意图状态词（`pending|running|done|failed`），控制台原样渲染

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-051 |
| 严重级 | **P3**（体验/一致性；不影响数据正确性、权限或链上事实。按 `qa.md` §4 可放行） |
| 发现轮次 | round-18F（QA `task-78` 独立复验；Dev 已在回报中主动上报为 R19 候选） |
| 关联 REQ | **范围外** —— `REQ-019-button-first-console.md` §3.2 词表口径点原文只点名「**categories 队列** …… 并**同步 tags 口径**」；D36 明文点名的也是 tags（↔categories）两处 |
| 状态 | **QA 复验（round-19，`task-81`）：S1–S6 全过 → 建议关闭**（Lead L-R19-4 已裁定并入 D36；见文末「复验记录（round-19）」） |

## 复现命令与最小步骤

1. 前置：daemon 在跑；`config/chain-intents/` 有历史记录（本轮 live 6 条）。
2. 看写入端的词表。
3. 看页面对这些词的渲染。

```bash
cd /Users/shenxiuqiang/workspace/ArcBlog
grep -n "status: '\|status = '" scripts/arcblog-chain-worker.mjs
grep -rn 'config/chain-intents' .aup/pages/ | head
node -e 'import("./scripts/lib/arc.mjs").then(({readJson})=>console.log(JSON.stringify(Object.entries(readJson("/instance/app/arcblog/config/chain-intents","").value||{}))))'
```

## 期望

同一控制台（21 页一套侧栏）里读者不应在相邻两页看到两套「意图状态」词。D36 已在 tags / categories 落定 `pending | applied | rejected | noop`；`chain-intents` 若继续用 `done | failed`（外加 `running`），控制台上就仍有第二套终态词。

## 实际

- 写入端（`scripts/arcblog-chain-worker.mjs`）：
  - `:241` 只把 `pending` / `running` 当待处理；
  - `:246` 写 `failed`（未知 action/role）；
  - `:249` 写 `running`（在途）；
  - `:256` 写 `done`；`:266` 写 `failed`；`:296` 入队写 `pending`。
- 页面（原样渲染机器值，天然不做词表映射）：
  - `.aup/pages/ops/factory.aup:231` `p "${entry.content.status}"`（`?page=factory` 意图队列卡）；
  - `.aup/pages/admin/diagnostics.aup:262` `p "$t(diagnostics.intents-status): ${entry.content.status}"`（`?page=diagnostics`）。
- live 队列 6 条记录的实际取值：`failed×3`、`done×2`、`pending×1`（`raw/R18F-qa-afs-before.json`）。

```text
$ grep -n "status: '\|status = '" scripts/arcblog-chain-worker.mjs
241:    .filter((intent) => intent.status === 'pending' || intent.status === 'running')
246:      results.push(updateIntent(intent, { status: 'failed', error: `unsupported intent: …` }, instance));
249:    updateIntent(intent, { status: 'running', startedAt: nowIso() }, instance);
256:              status: 'done',
266:          : { status: 'failed', finishedAt: nowIso(), error: … },
296:      status: 'pending',
```

`?page=factory` 真实页面文本（`raw/R18F-qa-browser.json`）：

```text
意图队列
队列位于 config/（仅管理员）：只有 Blocklet 属主可以入队或查看链上操作。
●  状态  failed  studio  1 day ago  VALIDATION a public key is required: …      [清除]
●  状态  failed  studio  1 day ago  RUNTIME_ERROR GraphQLError: Invalid itx: …  [清除]
●  状态  done    studio  1 day ago  ABDBD742C055E3574261DE8FD4C1EEDBEE7DC34CC4C77AF4B50279BFAC50B70D  [清除]
●  状态  pending studio  1 day ago                                              [清除]
```

## 影响范围

- 受影响角色：admin（控制台操作者）、后续照抄该队列的批次
- 受影响链路：控制台整体口径一致性 / 运维可读性
- 数据后果：无（记录本身正确）
- 可绕过：是（页面有「清除」；`chain-worker run` 会消费 `.json` 条目）

## 疑似文件

- `scripts/arcblog-chain-worker.mjs:241,246,249,256,266,296`（第三套词表 + `running` 在途态）
- `.aup/pages/ops/factory.aup:225-245`、`.aup/pages/admin/diagnostics.aup:259-262`（原样渲染）
- `scripts/arcblog-chain-worker.test.mjs:109,117`（断言 `'done'`，改名须同步）

## 为什么不阻断本轮（round-18F）

1. D36 明文点名的是 tags（↔categories）两处，`chain-intents` **不在裁定范围内**；REQ-019 §3.2 的判据同样只写 categories + tags。
2. `chain-intents` 多一个 canonical 四词表**没有的 `running`（在途态）**，改名需要 Lead 先定义在途态用词（`applied` 只在终态写入，`running` 不能直接映射）。
3. 改名还对 live 6 条记录（4 failed / 2 done）需要读取端原地修复，而修复只在 drain 时发生；live 队列里存有一条 `pending` 的 claim studio 意图，**任何 drain 都会触发真实链写**，本轮明令禁止。
4. 因此 Dev 未改名、仅按 D38 补齐非 `.json` 诊断，并主动上报 —— 处置如实。

> QA 不修改上述任何文件。建议 Lead 二选一：**(A)** 认 D36 只覆盖内容队列（tags/categories），把 `chain-intents` 的在途/终态词表写进 `arc-contracts`（例如 `pending|running|applied|rejected`）并登记 R19 落地；**(B)** 本轮即视为口径未统一，立项「改名 + 读取端兼容 + 一条只读 `queue` 命令做修复（不 drain）」。

## 复验记录（round-18F，QA `task-78`）

- 上述 `grep` 与页面文本均为 QA 本轮独立实测（`raw/R18F-qa-browser.json`、`raw/R18F-qa-afs-before.json`）。
- 同批次的 tags / categories 词表统一已实测通过（见 `round-18f.md` §2）；本 BUG 只描述**第三个队列**。
- 判定：**P3，不阻断 round-18F 放行**。

## 复验记录（round-19，QA `task-81`；**独立复跑，零链写**）

> 原始输出：`docs/team/test-reports/raw/round-19/REQ-019-b2-bug051.txt`、`…-bug051-page.txt`、`bug051-before.json`。QA 实际执行的命令**只有**：`grep`（本地）、`node scripts/arcblog-chain-worker.mjs queue`（只读，live + 自建隔离队列各一次）、`node -e`（只读）、`node --test … scripts/arcblog-chain-worker.test.mjs`（mock + 隔离路径）、只读浏览器页面。**从未调用 `run` / `watch`。**

| # | 判据 | 结论 | 证据（原始） |
| - | ---- | ---- | ------------ |
| **S1** | 写入端只写 canonical；`running` 是允许的在途态 | **通过** | `grep -n "status: '\(done\|failed\)'" scripts/arcblog-chain-worker.mjs` → **0 命中**（exit 1）；5 个写入点全部 `INTENT_STATUS.*`（:262/:265/:272/:282/:312）；`INTENT_STATUSES=["pending","running","applied","rejected","noop"]`，`isTerminalStatus('running')===false`，`isInFlightStatus('running')===true` |
| **S2** | 旧 `done`/`failed` 读取端兼容 + 原地修复，记录数不变 | **通过** | **隔离队列**（QA 自建 `config/r19qa-chain-intents`：`done`/`failed`/`running`/`pending` 各 1，`queue` 后 `done→applied`、`failed→rejected`，带 `normalizedFrom`/`normalizedAt` + `message`，`running`/`pending` 不动，`4→4` 条不变）。**live 6 条**：`normalizedFrom: failed×3 / done×3`，`count:6` 不变；`normalizedAt` = **2026-09-28T16:08:30–32Z（早于 QA 会话）**，即 Dev 已执行同一只读修复；QA 复跑 `changedRecords: []`（幂等） |
| **S3** | 读取路径未 drain | **通过** | 命令清单无 `run`/`watch`；`queue` 分支切片内 `runLifecycleCommand:false / openChain:false / spawnSync:false / refreshSvg:false`；live 那条 `pending`（`intent-mujkccy6-r1nd`，acquire/studio）**仍 `pending`**（`pendingStillPending:true`） |
| **S4** | 零链写（事实层） | **通过** | `queue` 前后 `idSetsEqual:true`、`changedRecords:[]`（6 条逐字节不变）、`node/factories.json` `factoriesByteIdentical:true`；`result.assetId / hash` 原样保留 |
| **S5** | 页面不再显示旧词 | **通过** | `?page=factory` = `rejected/rejected/applied/rejected/pending/applied`，`hasDone:false hasFailed:false`；`?page=diagnostics` = `状态: rejected/applied/pending …`，`hasDone:false hasFailed:false` |
| **S6** | 门 + 单测同步 | **通过** | `arcblog-chain-worker.test.mjs` **8/8**（基线 4/4 只增不减）；断言改 canonical（`applied` 4 处；残留 4 处 `'done'` 全是旧词 fixture/`normalizedFrom` 断言）；`npm test` **35/35** |

**QA 判定：S1–S6 全过 → 本轮可关闭**（唯一注记：live 记录的原地修复发生在 QA 会话之前，属 Dev 已执行 + QA 只读复跑证明幂等，不是缺陷）。

