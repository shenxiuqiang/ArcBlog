# BUG-048: `arcblog-clean.mjs` 识别不到本轮 live 测试实际产生的残留（9 条只报 1 条）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-048 |
| 严重级 | **P3**（工具/清理面：不影响功能，但让「跑完全量 live 后实例干净」无法自证；本轮开锁跑定向测试即踩到） |
| 发现轮次 | round-18（QA `task-75` 独立验证） |
| 关联 REQ | 无（范围外；`docs/team/README.md §6.1` 的 `.gate-lock` + 定向 live 门约定） |
| 状态 | **QA 复验（round-19，`task-81`）：C1–C5 全过；C6 受限（见文末「复验记录」+ [BUG-053](BUG-053-clean-test-really-deletes-instance-residue.md)）→ 建议条件式关闭** |

## 复现命令与最小步骤

1. 前置：daemon 在跑；工作区 round-18 状态。
2. 先只读看 cleaner 的前缀表能不能匹配 live 测试自己写出的隔离路径名。
3. 再跑一次定向 live（QA 本轮跑的是 `npm run test:file -- scripts/arcblog-node-nft.test.mjs` 与 `… -- scripts/arcblog-chain-worker.test.mjs`，均在 `.gate-lock` 下），对比 cleaner 的 `found` 与实际新增条目。

```bash
cd /Users/shenxiuqiang/workspace/ArcBlog
node -e '
import("./scripts/lib/doctor.mjs").then(m=>{
  for (const n of ["nft-factories-test-1790602604314","node-nft-test-1790602604314","roles-test-1790602604314","mock-chain-test-1790602604314","mock-worker-1790602675663","chain-intents-worker-1790602675663"])
    console.log(n, "recognised:", m.isTestRecordId(n));
});'
node scripts/arcblog-clean.mjs            # dry run
grep -n "ARCBLOG_.*_PATH\|stamp" scripts/arcblog-chain-worker.test.mjs | head
```

## 期望

`node scripts/arcblog-clean.mjs`（默认 dry run）应能把定向 live 测试写出的记录全部列出（`found` = 实际残留数），否则「跑完删锁 + cleaner 复查 found=0」不能作为清理自证。

## 实际

- 本轮 QA 的定向 live 在 `config/` + `node/` 实际留下 **9 条**（同一个测试文件一次运行就产生 4 个前缀 + 4 个 worker 前缀 + 1 个 `pending.json`）：

```text
config/mock-chain-test-1790602604314.json
config/nft-factories-test-1790602604314.json
config/node-nft-test-1790602604314.json
config/roles-test-1790602604314.json
config/mock-worker-1790602675663.json
node/factories-worker-1790602675663.json
config/chain-intents-worker-1790602675663/  (目录，内含 pending.json)
config/nft-factories-worker-1790602675663.json
config/node-nft-worker-1790602675663.json
config/roles-worker-1790602675663.json
```

- `arcblog-clean` 当时只报 **found: 1**（仅 `mock-chain-test-*`），其余 8 条不在 `TEST_RECORD_PREFIXES` 里。
- QA 手工清理后 `arcblog-clean` 才报 `found: 0`，但实例里仍有 ~188 条历史残留（config 132、node 29、drafts 27 —— **drafts 27 条全是 `sign-keys-*` 等测试残留，非内容草稿**），cleaner 同样看不见。
- `scripts/arcblog-chain-worker.test.mjs` 没有 `after()`/`finally` 清理钩子（只创建 `*-worker-<stamp>` 隔离路径）。drafts 里没有真实草稿这件事还直接放大了本轮 worker 的耗时：`apply`/`watch` 每 tick 扫描 30 条记录、每条一次 `arc` 子进程，实测一次 tick ≈ 30s（`docs/team/test-reports/raw/REQ-019-qa-watch.txt`）。

## 证据输出

```text
$ node -e '…isTestRecordId…'
nft-factories-test-1790602604314 recognised: false
node-nft-test-1790602604314 recognised: false
roles-test-1790602604314 recognised: false
mock-chain-test-1790602604314 recognised: true
mock-worker-1790602675663 recognised: false
chain-intents-worker-1790602675663 recognised: false

$ node scripts/arcblog-clean.mjs        # 定向 live 刚跑完时
{"ok":true,"confirm":false,"found":1,"removed":0,"byDir":{"config":1},"sample":["config/mock-chain-test-1790602604314.json"]}

$ node scripts/arcblog-clean.mjs        # QA 手工清理后
{"ok":true,"confirm":false,"found":0,"removed":0}

$ node -e '…list /instance/app/arcblog/config|node|drafts…'
config: 141 条，其中 132 条匹配 /test|worker|probe/；非残留仅 9 条（chain-intents, diagnostics, general, mock-chain.json, nft-factories.json, node-nft.json, roles.json, switches, trusted-hubs）
node:   35 条，其中 29 条为 factories-test-* / factories-worker-* 历史残留
drafts: 27 条，全部为 sign-keys-* 等历史残留（非内容草稿）
```

退出码：0

## 影响范围

- 受影响角色：所有跑定向 live 的成员（Dev/QA）、实例运维者
- 受影响链路：清理自证 / `arcblog-doctor` 的 test-records 检查 / 定向 live 的耗时
- 数据后果：QA 已清理本轮自己能识别的残留（含 4 条更早会话的同类残留）；历史 ~188 条**未删**，按 Dev 的登记原样保留
- 可绕过：是（按已知前缀手工删），但每一轮都要重做

## 疑似文件

- `scripts/lib/doctor.mjs`（`TEST_RECORD_PREFIXES`，缺 `nft-factories-test-` / `node-nft-test-` / `roles-test-` / `*-worker-` / `factories-test-` / `factories-worker-` / `chain-intents-worker-`）
- `scripts/arcblog-clean.mjs`（`CLEAN_DIRS` 只含 `config`，不含 `node/`）
- `scripts/arcblog-chain-worker.test.mjs`（无清理钩子；`node-nft.test.mjs` 同族）

> QA 不修改上述任何文件。

## 复验记录（round-19，QA `task-81`；**只 dry run，从未 `--confirm`**）

> 原始输出：`docs/team/test-reports/raw/round-19/bug048-probe.json`、`bug048-clean-after.json`、`bug048-clean-final.json`、`targeted-live.txt`。

| # | 判据 | 结论 | 证据 |
| - | ---- | ---- | ---- |
| **C1** | 本 BUG 列出的已知残留全部可识别 | **通过** | 清单实测 **10 条**（原文就是 10 行），`isTestRecordId` **10/10 true**（轮初基线 **1/10**） |
| **C2** | 前缀表覆盖实测家族 | **通过** | 11/11：`nft-factories-test-` / `node-nft-test-` / `roles-test-` / `mock-worker-` / `nft-factories-worker-` / `chain-intents-worker-` / `node-nft-worker-` / `roles-worker-` / `factories-test-` / `factories-worker-` / `sign-keys-`；`TEST_RECORD_PREFIXES.length = 43` |
| **C3** | `CLEAN_DIRS` 含 `node` | **通过** | `CLEAN_DIRS.includes('node') === true`；另含 `config/category-intents` / `config/media-intents`，`dirsScanned: 20` |
| **C4** | dry run 覆盖 3 目录 + 残留目录不静默跳过 | **通过** | `node scripts/arcblog-clean.mjs` → `found:204, removed:0, confirm:false, byDir{config:132,node:29,drafts:43}`，`byPrefix` 含 `chain-intents-worker-:15`，`sample` 25 条含 `config/chain-intents-worker-1790498117031`。**口径**：PM 的 188 = 132+29+27(sign-keys)；今天 drafts 43 多出的 16 条 `cat-test-*` 是**轮初就已可见**的（PM found=16 即它们）→ 16+188=204 自洽 |
| **C5** | 不误伤真记录、不真删 | **通过** | 15 个真记录 `isTestRecordId` **全 false**（`factories.json`/`identity.json`/`profile.json`/`health.json`/`discovery.json`/`post-detail.json`/`diagnostics`/`general`/`mock-chain.json`/**`chain-intents`（目录）**/`nft-factories.json`/`roles.json`/`trusted-hubs`/`switches`/`media-orphan-candidates.json`）；live drafts 43 全是测试家族（无真实草稿）；三次 dry run 均 `confirm:false, removed:0` |
| **C6** | 门 + 单测同步（定向单跑全绿） | **部分通过 / 受限未验证** | `arcblog-doctor.test.mjs` **13/13**；`arcblog-clean.test.mjs` 跑 **6/6** + **跳过最后 1 条**（`--test-skip-pattern`）。被跳过那条会真跑 gate 清理 → 删本机 **204** 条残留（含 188 条非本轮）→ 违反 L-R19-5 → **未跑**（**[BUG-053](BUG-053-clean-test-really-deletes-instance-residue.md)**） |

**数字前后对比**

```text
轮初：found 16（byDir:{drafts:16}）/ isTestRecordId(9) = 1/9
本轮：found 204（config 132 / node 29 / drafts 43）/ isTestRecordId(10) = 10/10 / 家族 11/11 / 真记录 0 误伤
QA 自清探针后复跑：found 仍 204（removed:0）→ 未真删任何非本人残留
```

**QA 判定：C1–C5 全过、C6 因测试自身的破坏性设计不可达 → 建议条件式关闭**（识别表本身无缺陷；条件 = BUG-053 被裁决）。

