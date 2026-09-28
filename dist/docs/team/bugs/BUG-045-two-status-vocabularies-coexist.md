# BUG-045: REQ-019 词表判据未达成 —— 同一控制台两套意图状态词（categories `applied|rejected` vs tags `done|failed`）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-045 |
| 严重级 | **P1**（REQ 验收标准未达成：REQ-019 §3.2 口径点明写「两套并存 = fail」；属产品口径，不是渲染细节） |
| 发现轮次 | round-18（QA `task-75` 独立验证） |
| 关联 REQ | REQ-019-button-first-console §3.2 B2 口径点 / §2.1.3 / `docs/team/requirements/REQ-019-button-first-console.md:91` |
| 状态 | ✅ **已修复并复验通过**（round-18F 复验，2026-09-28；证据 [`round-18f.md`](../test-reports/round-18f.md) §2）。范围外残留见文末「复验记录」→ 已另立 [BUG-051](BUG-051-chain-intents-vocabulary-outside-d36.md)（P3） |

## 复现命令与最小步骤

1. 前置：daemon 在跑；工作区为 round-18 Dev 交付后的状态。
2. 看 categories 侧 worker 写入的终态词。
3. 看 tags 侧 worker 写入的终态词与页面图例。

```bash
cd /Users/shenxiuqiang/workspace/ArcBlog
grep -n "status = '\|status: '" scripts/arcblog-category.mjs | grep -E "applied|rejected|noop|pending"
grep -n "status = '\|status: '" scripts/arcblog-tags.mjs | grep -E "done|failed|noop|pending"
grep -n "queue-legend" .aup/pages/site/tags.aup
```

## 期望

REQ-019 §3.2（`REQ-019-button-first-console.md:91`）：「L-R18-2 用词是 `applied` / `rejected`，而仓库既有 tags 范式是 `pending | done | noop | failed`……**两套并存 = fail**」。
若采用 L-R18-2 字面词表，则 tags 侧必须同步改名（`done`→`applied`、`failed`→`rejected`，含 tags 页面文案与 `scripts/arcblog-tags.test.mjs` 断言）；否则 categories 必须改回 `done|failed`。**同一控制台只能有一套终态词。**

## 实际

两套词表**同时在线**，且都能被真实写入：

- categories（本轮新增）：`pending | applied | rejected | noop`（`scripts/arcblog-category.mjs:255/322/339/355/362`），页面图例亦为 `pending = 等待 worker · applied = 已改写文章并删除源记录 · noop = 无需执行（已经做过）· rejected = 被拒绝，未改动任何数据`（`.aup/pages/site/categories.aup` i18n `queue-legend`）。
- tags（既有）：`pending | done | noop | failed`（`scripts/arcblog-tags.mjs:214/270/276/282`），页面图例为 `queued = waiting for the worker · done = posts rewritten · noop = … · failed = rejected, no post touched`（`.aup/pages/site/tags.aup:25`）——注意 tags 侧连 `pending` 都画成 `queued`，实际是**三套叫法**。

QA 本轮在真实浏览器里读到的两页图例原文见 `docs/team/test-reports/raw/REQ-019-qa-e2e.txt`（categories 队列卡）与 `?page=tags` 页面（未改，未复验本轮）。

## 证据输出

```text
$ grep -n "status = '\|status: '" scripts/arcblog-category.mjs | grep -E "applied|rejected|noop|pending"
255:    status: 'pending',
322:    next.status = 'noop';
339:      next.status = 'noop';
355:    next.status = 'applied';
362:    next.status = 'rejected';

$ grep -n "status" scripts/arcblog-tags.mjs | sed -n '1,30p'
214:    status: 'pending',
225:  if (existing && existing.status === 'pending') {
270:      next.status = result.migrated.length ? 'done' : 'noop';
276:      next.status = 'done';
282:      next.status = 'failed';

$ grep -n "queue-legend" .aup/pages/site/tags.aup
25:    queue-legend { en "queued = waiting for the worker · done = posts rewritten · noop = no article referenced the source tag, nothing written · failed = rejected, no post touched" zh "…" }
```

退出码：0（`grep` 命中即 0；现象是词表并存，不是命令失败）

浏览器侧（本轮 categories 队列卡真实文本，`raw/REQ-019-qa-e2e.json` → `a5.queueText`）：

```text
pending = 等待 worker · applied = 已改写文章并删除源记录 · noop = 无需执行（已经做过）· rejected = 被拒绝，未改动任何数据
● merge r18qa-src → r18qa-dst 状态 applied
● merge r18qa-src2 → r18qa-nope 状态 rejected
```

## 影响范围

- 受影响角色：admin（控制台操作者）、后续所有批次（REQ-019 后续页会照抄这一批的判据）
- 受影响链路：控制台 UI 一致性 / 运维可读性；不涉及数据正确性、权限或链上事实
- 数据后果：无（记录本身正确，只是词表不统一）
- 可绕过：否 —— 这是 REQ 自己写死的验收判据

## 疑似文件

- `scripts/arcblog-category.mjs:255,322,339,355,362`（本轮新增词表）
- `scripts/arcblog-tags.mjs:214,270,276,282`（既有词表）
- `.aup/pages/site/tags.aup:25`（tags 页面图例）
- `scripts/arcblog-tags.test.mjs`（词表断言，改名时须同步）
- `docs/team/requirements/REQ-019-button-first-console.md:91`（判据原文；QA/Dev 均不改）

> QA 不修改上述任何文件。放行需要 Lead 的一句话：① 认 L-R18-2 字面 → R19 统一 tags；或 ② 认既有 tags 词表 → categories 改回 `done|failed`。在此之前该判据按 REQ 原文记「不通过」。

## 复验记录（round-18F 复验，2026-09-28，QA `task-78`）—— **已解除**

Lead 裁定 **D36**（canonical = `pending | applied | rejected | noop`；tags 的 `done`/`failed` 全部改名、页面图例 `queued` → `pending`、读取端兼容旧记录、写入端只写新词）后独立复验：

1. **写入端零字面量**：`scripts/arcblog-tags.mjs` / `scripts/arcblog-category.mjs` 的状态赋值**全部**走共享模块 `scripts/lib/intents.mjs` 的 `INTENT_STATUS.*`（无 `'done'`/`'failed'` 字面量）。
2. **图例 canonical**：`?page=tags` 与 `?page=categories` 浏览器实测图例分别为 `pending = 等待 worker · applied = 已改写文章 · noop = … · rejected = …` / `pending = … · applied = 已改写文章并删除源记录 · noop = … · rejected = …`；三枚正则探针（`queued =` / `done =` / `failed =`）全为 `false`。
3. **live 双路径**：`tags request → apply` 实测一条 `pending → applied`（`migrated:1`，草稿 `tags` 真的改写、`version 1→2`，AFS 原文见报告 §2.3）；负例 `--from == --to` 落 `rejected` + `message:"--from and --to must differ"` + `posts:[]`（未改数据）。
4. **旧记录兼容**：live 放入 `done`（空 message）/`failed`（空 message）两条旧记录，读取端原地修复为 `applied` / `rejected`，补非空 `message` + `normalizedFrom`/`normalizedAt`，且 `apply` 两次都 `applied:0` —— **绝不重放**。

结论：**已修复并复验通过**。`?page=factory` 的第三个队列（`chain-intents`）仍用 `pending|running|done|failed`，属 **D36 点名范围之外**（REQ-019 §3.2 只写 categories + tags），Dev 已如实上报；QA 另立范围外 **P3 [BUG-051](BUG-051-chain-intents-vocabulary-outside-d36.md)**，待 Lead 裁定，**不阻断本轮**。完整证据：[`round-18f.md`](../test-reports/round-18f.md) §2、§7。
