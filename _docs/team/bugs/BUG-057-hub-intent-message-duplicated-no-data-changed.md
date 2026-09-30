# BUG-057: `hub-intents` 空 DID 的终态 `message` 把「— no data changed」重复了两次

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-057 |
| 严重级 | **P3**（文案：终态原因里出现重复后缀，不影响分类、退出码与数据；但这条 `message` 会原样渲染在 `?page=hub` 队列卡上） |
| 发现轮次 | round-21（QA `task-89` 独立验证 REQ-019 第三批 → H2① 负例时发现） |
| 关联 REQ | REQ-019-button-first-console.md §12.5 **H2①**（空 / 缺失 DID → `rejected` + `VALIDATION` + `message` 非空） |
| 状态 | 待裁决（PM `task-90`） |

## 复现命令与最小步骤

1. 前置：daemon 在跑（`default`）；`config/hub-intents` 可为空。
2. 用页面 `?page=hub` 的「主动收录」按钮在 `hubDid` 为空时点击并确认（等价于下面的 CLI 两步：`request` 写一条 `hubDid: ""` 的 `add` 意图，再由 worker `apply`）。

```bash
cd /Users/shenxiuqiang/workspace/ArcBlog
node scripts/arcblog-network.mjs request --action add --intent-id qa-r21-bug057
node scripts/arcblog-network.mjs apply
arc afs exec /blocklets/arcblog/.actions/read --path /instance/app/arcblog/config/hub-intents/qa-r21-bug057.json
node scripts/arcblog-network.mjs queue   # 清场前先看终态
# 清场（与页面 Clear 同一动作）
arc afs exec /blocklets/arcblog/.actions/delete --path /instance/app/arcblog/config/hub-intents/qa-r21-bug057.json
```

（QA 实际走的是页面路径：CDP 单 tab、admin、zh，`hubDid` 置空后点「主动收录」→ 确认框 → 记录 `2026-09-28T19:27:05.903Z.json`，再由 `apply` 落终态。）

## 期望

空 DID 的拒绝原因**只出现一次**「no data changed」后缀，例如：
`add: a hub did is required (hubDid) — no data changed`（REQ-019 §12.5 H2① 只要求「`message` 非空 + 零改动」，重复后缀属实现瑕疵）。

## 实际

终态 `message` 为 `"add: a hub did is required (hubDid) — no data changed — no data changed"`——后缀重复两次。
根因（仅线索，不在 QA 写范围）：`validateIntent()` 抛出的文案本身以「— no data changed」结尾（`scripts/arcblog-network.mjs` 的 `validateIntent`），而 `applyIntent()` 的 `catch` 又统一追加一次「— no data changed」。

对照：**畸形 DID** 与**重复登记**两条负例的 `message` 没有重复（它们的原始文案不以「— no data changed」结尾）。

## 证据输出

```text
$ arc afs exec /blocklets/arcblog/.actions/read --path /instance/app/arcblog/config/hub-intents/2026-09-28T19:27:05.903Z.json
{
  "id": "2026-09-28T19:27:05.903Z",
  "action": "add",
  "hubDid": "",
  "status": "rejected",
  "message": "add: a hub did is required (hubDid) — no data changed — no data changed",
  "changed": [],
  "counts": null,
  "elapsedMs": null,
  "requestedVia": "console",
  "code": "VALIDATION",
  ...
}
```

对照（不重复）：

```text
# 畸形 DID
"message": "register: hub did \"not-a-did\" is not a recognizable DID — expected did:<method>:<id> or the platform's z… account form (text shape only; this check does not resolve the DID on any chain) — no data changed"
# 重复登记
"message": "hub already registered: did:key:zR21QA… (relation applied, direction studio, updated …) — pass update to overwrite (CLI: --update); no data changed"
```

退出码：0（记录读取成功；意图本身按 `rejected` 落地，页面渲染该 `message`）

完整原始输出：`docs/team/test-reports/raw/round-21/14-hub-e2e.txt`（`== H2 empty DID ==` 段）。

## 影响范围

- 受影响角色：admin（`?page=hub` 的意图队列）
- 受影响链路：界面文案（队列卡 `p "${entry.content.message}"`）；不影响分类、退出码、数据
- 数据后果：无（终态记录本身是合法的 `rejected`）
- 可绕过：是（读者忽略重复后缀）

## 疑似文件

- `scripts/arcblog-network.mjs`（`validateIntent` 的空 DID 文案 + `applyIntent` 的 `catch` 追加逻辑；**线索，不是结论**）

---

## QA Round 22 独立复验（task-93，2026-09-29；**自建 intent、AFS 为准、自清场**）

> 原始输出：`docs/team/test-reports/raw/round-22/12-bug057-probe.txt`、`13-cdp.json`。探针：`raw/round-22/qa-bug057-probe.sh`（独立 id 前缀 `qa-r22-b57-*`，跑完逐条删除）。
> 静态：`scripts/arcblog-network.mjs` 新增 `withNoDataChanged()`（幂等后缀）+ `NO_DATA_CHANGED`，`:467` 文案不再追加、`applyIntent` 的 `catch` 改走该函数；`sed -n '583,589p'` 显示 `next.message = withNoDataChanged(err.message);`。

**结论：已修复（P3 关闭）**。

```text
# ① 空 DID 意图（我自己的 id）→ apply → 读终态记录
$ arc afs exec /blocklets/arcblog/.actions/read --args '{"path":"…/hub-intents/qa-r22-b57-empty-<ts>.json"}'
{"status":"rejected","code":"VALIDATION","changed":[],"elapsedMs":null,
 "suffixCount":1,"message":"add: a hub did is required (hubDid) — no data changed"}     ← 修前 = 2 次

# ② 畸形 DID
{"status":"rejected","code":"VALIDATION","suffixCount":1,
 "message":"register: hub did \"not-a-did\" is not a recognizable DID — … — no data changed"}

# ③ 重复登记
dup1 {"status":"applied","suffixCount":0}
dup2 {"status":"rejected","code":"CONFLICT","suffixCount":1,
      "message":"hub already registered: did:key:zQA22DupProbe… — pass update to overwrite (CLI: --update); no data changed"}

# ④ hub/registrations 前后逐字节对比：diff -r 为空（唯一差异是我自建的合成登记，已在下一步删除）
# ⑤ 清场自证：4 条 intent 全部 read → NOT_FOUND；合成登记 delete → 登记数回到 5（与原值一致）

# ⑥ 页面渲染（CDP ?page=hub en，独立造一条 rejected 意图后测量）
{"needle":"add: a hub did is required (hubDid) — no data changed","count":1,"hasSuffixTwice":false}
```

- B57-1 根因修法（静态）：**通过**（`withNoDataChanged` 幂等，两者不叠加）。
- B57-2 运行期 + 零改动：**通过**（suffixCount 1；`changed:[]`；registrations 逐字节不变）。
- B57-3 对照不回归：**通过**（畸形 DID `VALIDATION`、重复登记 `CONFLICT`，各 1 次后缀）。
- B57-4 页面可见文案：**通过**（页面文本中该 message 恰出现 1 次，无 `no data changed — no data changed`）。
- B57-5 定向单跑：**通过**（`.gate-lock` 下 `arcblog-network.test.mjs` **24/24**，基线未降）。
