# BUG-066: `?page=policy` 新建商品不做记录级校验 —— `type=subscription` + `periodDays=0` 可正常落库，`validateProduct` 判非法

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-066 |
| 严重级 | **P1** |
| 发现轮次 | round-24 |
| 关联 REQ | [REQ-031](../requirements/REQ-031-round24-console-completion.md) §3 / W3（负例 fail-closed） |
| 状态 | ✅ **QA 复验通过（round-24f，task-104）—— 可关闭**（待 PM 确认） |

> **两条表现属同一根因**（页面 `exec "/.actions/write"` 是裸写，既不调用 `scripts/lib/economy.mjs` 的 `validateProduct`，也没有把交叉字段规则表达成平台可强制的 prop）：主表现是**普通用户可达**的 `subscription + periodDays 0`；次表现是 `eVisibility` 受控 `select` 缺 `required=true`，被外部置空后同样落库。

## 复现命令与最小步骤

1. 前置：arc 实例 `default`（`arc service list` → `default 4939 up`）；已有一个 admin 浏览器会话（`login_token` cookie）；`.aup` 已 build/restart（本轮 Dev 已做）。
2. 打开 `http://arcblog.localhost:4939/?page=policy`，在 **New product** 表单里：`id` = `qa24-sub-<stamp>`、`creatorDid` = `did:blocklet:arcblog`、`priceAmount` = `1.00`、`priceAsset` = `USDC`、`settlementPolicy` = `active`，**`type` 选 `subscription`，`periodDays` 保持默认 `0`**。
3. 点 **Create product**。
4. 读回记录并跑仓库自己的校验器。

```bash
# 最小复现（探针见 docs/team/test-reports/raw/round-24/qa-r24-probe.mjs，phase=neg/n5）
arc afs exec /blocklets/arcblog/.actions/read --args \
  '{"path":"/instance/app/arcblog/economy/products/qa24-sub-<stamp>.json"}'

node --input-type=module -e "
import { validateProduct } from './scripts/lib/economy.mjs';
import { readFileSync } from 'node:fs';
const rec = JSON.parse(JSON.parse(readFileSync('/tmp/rec.json','utf8')).content);
console.log(validateProduct(rec));"
```

## 期望

- `world/product.yaml` 的 `periodDays` 注释 + `scripts/lib/economy.mjs:160` 的规则：**`type=subscription` 时 `periodDays` 必须为正**；非法组合应像 `priceAmount=abc` / 缺必填一样被**拒绝且零改动**（REQ-031 W3「负例 fail-closed」；`docs/team/roles/qa.md` §2.3）。
- CLI 路径的行为就是基准：`node scripts/arcblog-economy.mjs product add --type subscription --period-days 0` 由 `validateProduct` 拒绝。

## 实际

- 页面**没有拦**：`data-aup-invalid` 为空，点击后 toast 走成功分支。
- 记录**真的落库**（`economy/products` 54 → 55 → 56 …），`validateProduct` 对该记录返回 `["periodDays must be a positive number for a subscription"]`。
- 同一表单的 `eVisibility`（`type=select`）**没有 `required=true`**：把它的值强制设成词汇表外的字符串（浏览器端可做）后值为 `""`，点 Create product 会落库 `"visibility": ""`，`validateProduct` 返回 `["visibility must be public or private"]`。

## 证据输出

`docs/team/test-reports/raw/round-24/qa-r24-all.json` → `steps.neg.n5`（原始探针输出 `qa-r24-all.log`）：

```text
$ # 填表：type=subscription、period=0（其余合法），点 "Create product"
selectValues: {"type":"subscription","period":"0","required":[
  {"name":"ePid","required":true},{"name":"eCreator","required":true},{"name":"ePrice","required":true},
  {"name":"eAsset","required":true},{"name":"ePolicy","required":true},
  {"name":"eType","required":false},{"name":"eVisibility","required":false},{"name":"ePeriod","required":false}]}
click        : "clicked:Create product"
invalid      : "[]"                       # 平台没有报任何无效字段
read         : {"id":"qa24-sub-1790645607381.json", … "content":"{… \"type\": \"subscription\", … \"periodDays\": \"0\", …}"}
validator    : {"issues":["periodDays must be a positive number for a subscription"]}
countAfter   : 57                          # 从 55 → 56 → 57（n3 的 visibility:"" 也已落库）

# 同一轮次的表现 2（eVisibility 置空）
$ actions/read /instance/app/arcblog/economy/products/qa24-hidden-1790645607381.json
{ … "priceAmount": "1.00", "priceAsset": "USDC", "visibility": "", "settlementPolicy": "active", … }
validator    : {"issues":["visibility must be public or private"]}
```

对照：同一表单的 `priceAmount=abc`（n1）与空 `id`（n2）**被平台拦下**（`data-aup-invalid=true`，零新增），说明平台级 `required`/`pattern` 可用，缺的是**交叉字段规则**与 `select` 的 `required`。

退出码：0（探针；`validator` 子命令 status 0）

## 影响范围

- 受影响角色：admin（页面书写）
- 受影响链路：经济 —— 商品目录（`economy/products`）
- 数据后果：**已写入**；本轮 QA 创建的 `qa24-sub-*` / `qa24-hidden-*` 记录已在探针末尾定向删除，`economy/products` 回到 **54**
- 可绕过：CLI（`product add` 走 `validateProduct`）不受影响；后果是 `economy/products` 里会存在**CLI 拒绝创建、仓库校验器判非法**的记录（`type=subscription` 且 `periodDays=0` / `visibility=""`），后续按 `type`/`periodDays`/`visibility` 结算、续期或 access 判定的读侧行为**本轮未验证**（不臆断影响面）
- 严重度依据：普通用户可达（两个受控 select 的默认组合即非法）⇒ 按 `docs/team/roles/qa.md` §4「数据写错」记 **P1**

## 疑似文件

- `.aup/pages/economy/policy.aup`（New product 表单：`eVisibility` / `eType` / `ePeriod` 的 prop，以及 `exec "/.actions/write"` 的 `content`）
- `scripts/lib/economy.mjs`（`validateProduct` —— 页面侧没有等价物）

---

## QA 复验（round-24f · task-104 独立复验 · 2026-09-29）

> 独立复验，不采信 Dev 自述。完整报告：`docs/team/test-reports/round-24f.md` §2/§3.5–3.7/§4；原始 JSON：`docs/team/test-reports/raw/round-24f/qa24f-bug066.json`（自有 harness `qa24f-bug066.mjs`，非 Dev 探针）。

**判定：可关闭（fix 已达成 L-R24F-1 的全部要求）**

| 复验点 | 结果 | 证据 |
| ------ | ---- | ---- |
| 非法态**结构性不可达** | 通过 | 运行期 DOM：`eType` required SELECT `["article","membership","digital"]`（无 subscription）；`eVisibility` required SELECT `["public","private"]`；`eSubPeriod` required SELECT `["7","30","90","365"]`。源码 `grep`：`type: subscription` 全文 ×1（仅订阅按钮）；`periodDays: "0"` ×1（仅非订阅按钮）＋ `periodDays: "${args.eSubPeriod}"` ×1（仅订阅按钮）⇒ 非订阅按钮的 type 域不含 subscription、订阅按钮的 periodDays 域不含 0，`subscription + periodDays=0` 无路径 |
| 敌意强制值 fail-closed | 通过 | 6/6 负例：强制 `eType=subscription` / `eVisibility=hidden|""` / `eSubPeriod=0|-7|""` 后 value 均变 `""`，`data-aup-invalid` 命中该字段，`products` 计数 delta=0，`recordWritten=false`（`arc afs read` 返回 `NOT_FOUND`） |
| 合法路径落库 + 仓库校验器 | 通过 | article、subscription 各 `delta=1`、11 字段、无 `${...}` 字面量；`node -e` 调 `scripts/lib/economy.mjs` 的 `validateProduct` → `{"issues":[]}`（两条） |
| 探针记录清理 | 通过 | `products` 56 → 54（回轮初基线），无 `qa24f` 残留；`targetsAfterFiltered=[]` |

**复验中的新发现（不改变本条关闭判定）**：页面创建的商品把 `periodDays` 落成**字符串**（`"0"` / `"30"`），与 `world/product.yaml` 的 `number` 及 CLI 的数字类型不一致 → 另记 **BUG-070（P2，范围外·既有）**。该类型差异不影响 `validateProduct`（内部 `Number(...)`，实测 `issues: []`）。
