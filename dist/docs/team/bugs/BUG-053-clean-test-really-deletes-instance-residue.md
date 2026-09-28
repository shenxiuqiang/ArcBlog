# BUG-053: `scripts/arcblog-clean.test.mjs` 的最后一条用例会**真的删除**实例上全部已识别残留（204 条，含 188 条非本轮/非 QA）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-053 |
| 严重级 | **P3**（工具/测试安全：删的只是「测试指纹」记录，绝不会碰真实内容；但它让 L-R19-5 与 BUG-048 的 C6 判据互斥） |
| 发现轮次 | round-19（QA `task-81` 判 BUG-048 C6 时发现；Dev 已在 runbook 主动告警） |
| 关联 REQ | 无（范围外；关联 [BUG-048](BUG-048-cleaner-misses-live-test-residue.md) 关闭判据 **C6** 与 Lead **L-R19-5**） |
| 状态 | 待裁决（PM `task-82`） |

## 复现命令与最小步骤

1. 前置：daemon 在跑；实例上有可识别的历史测试残留（本机 204 条）。
2. 先取证 dry run（否则基线会被删掉）。
3. 按文档命令跑该测试文件。

```bash
cd /Users/shenxiuqiang/workspace/ArcBlog
node scripts/arcblog-clean.mjs            # 先取证：found=204, removed=0
npm run test:file -- scripts/arcblog-clean.test.mjs   # 最后一条用例会真删
node scripts/arcblog-clean.mjs            # 复跑 → found 骤降
```

## 期望

单元/集成测试可以验证「gate 在通过后会清理」，但**不应在默认执行路径上删除运维者实例上的历史数据**；或者至少必须显式 opt-in（环境变量 / 独立隔离实例），否则任何按文档跑该文件的人都会踩到。

## 实际

`scripts/arcblog-clean.test.mjs:101-211` 的 `the quality gate cleans residue only after a passing run` 第 3 步 `gate('live', 0)` 会让 `scripts/run-tests.mjs` 跑真实的清理分支（`findTestRecords()` + `remove()`，**扫描并删除默认实例**）。修复 BUG-048 之前它只删 ~16 条；修复后本机 **204** 条（config 132 / node 29 / drafts 43）**全部**会被删掉，其中包括 **188 条 QA/Dev 以外的历史残留**（PM 在 G8 已登记为「原样保留」）。

本轮 **L-R19-5 明令「只 dry run 或登记，不得真删非本人残留」**，因此 QA **没有**跑完整文件（改用 `--test-skip-pattern` 跳过该条），导致 BUG-048 **C6「`scripts/arcblog-clean.test.mjs` 定向单跑全绿」在本轮不可达**。

## 证据输出

```text
$ node scripts/arcblog-clean.mjs            # 修复后、QA 清理后
{"ok":true,"instance":"default","confirm":false,"found":204,"removed":0,
 "dirsScanned":20,"byDir":{"config":132,"node":29,"drafts":43},
 "byPrefix":{ … "chain-intents-worker-":15,"sign-keys-":27 … }, "removed":0}

$ node --test --test-concurrency=1 \
    --test-skip-pattern="cleans residue only after a passing run" scripts/arcblog-clean.test.mjs
ℹ tests 6   ℹ pass 6   ℹ fail 0        → 未被跳过时，第 3 步会真删
```

```text
# scripts/arcblog-clean.test.mjs:191-201（被测源码，只读引用）
// 3) success cleans: the failing run's probe must be gone afterwards. (This call
// performs the gate's real cleanup, i.e. it deletes the instance's test residue …
const passing = gate('live', 0, 300_000);
```

退出码：0（dry run）/ 0（跳过后 6/6）

## 影响范围

- 受影响角色：任何跑定向 live 的成员（Dev/QA）、实例运维者
- 受影响链路：清理自证 / `docs/team/README.md` §6.1 的 `.gate-lock` + 定向 live 约定
- 数据后果：**会删除**默认实例上所有匹配 `TEST_RECORD_PREFIXES` 的记录（本机 204 条）；真实内容、`node/factories.json`、live 队列等**不会**被匹配（BUG-048 C5 已验），但历史测试残留不可恢复
- 可绕过：是（`--test-skip-pattern` 跳过该条；或先取证再跑）——但绕过会让 BUG-048 C6 永远无法判「全绿」

## 疑似文件

- `scripts/arcblog-clean.test.mjs:101-211`（最后一条用例：`gate('live', 0)` → gate 真实清理）
- `scripts/run-tests.mjs`（live 层通过后调用清理；无「只清理本轮新增」的作用域）
- `docs/operations-runbook.md`（Dev 本轮已加告警，但告警不改变默认行为）

> QA 不修改上述文件。建议修法（仅建议）：把该用例改为「可注入清理目录 / 隔离实例」，或把「通过后清理」的验证改成对 `run-tests.mjs` 清理分支的单元级注入（不起真实 gate），或将该用例移到显式 opt-in 的门后。
