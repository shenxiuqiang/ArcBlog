# BUG-070: `?page=policy` 新建商品把 `periodDays` 落库成**字符串**，而 `world/product.yaml` 声明 `number`、CLI 存数字（范围外 · 既有）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-070 |
| 严重级 | **P2**（数据/契约类型不一致；已验证**无功能中断**，故不按 P1 处理，理由见「影响范围」） |
| 发现轮次 | round-24f（QA task-104 复验 BUG-066 正例时发现） |
| 关联 REQ | REQ-031 §3/W3（商品新建）；schema 出处 `world/product.yaml:11`；修复轮次 REQ-032 §5（Lead L-R25-3） |
| 状态 | **QA 独立复验（round-25，`task-108`）：「可表达数字」分支成立，已修复 → 建议 PM 关闭**（复验记录见文末：page 落 `periodDays: 0` / `7` 均为 JSON **number**，探针商品已删、`economy/products` 回 54） |

## 复现命令与最小步骤

1. 前置：arc 实例 `default`（`arc service list` → `default 4939 up`）；admin 浏览器会话；`.aup` 已 build/restart。
2. 打开 `http://arcblog.localhost:4939/?page=policy`，用 **New product** 建一个 `article` 商品（`type` 保持默认），记录其 id。
3. 用 **Create subscription** 再建一个订阅（`periodDays` 选项 30），记录其 id。
4. 分别读回两条记录，对比 `periodDays` 的 JSON 类型；再读一条 CLI 创建的商品作对照。

```bash
# 页面创建的两条记录（探针会自动删除，原始输出见证据）：
node docs/team/test-reports/raw/round-24f/qa24f-bug066.mjs
python3 -c "import json;d=json.load(open('docs/team/test-reports/raw/round-24f/qa24f-bug066.json'));\
print(d['steps']['pos_article']['content']['periodDays'], type(d['steps']['pos_article']['content']['periodDays']).__name__);\
print(d['steps']['pos_subscription']['content']['periodDays'], type(d['steps']['pos_subscription']['content']['periodDays']).__name__)"

# CLI 创建的对照记录（存量）：
arc afs exec /blocklets/arcblog/.actions/read --args \
  '{"path":"/instance/app/arcblog/economy/products/econ-test-fc-product-1790621430746.json"}'
```

## 期望

同一个 `Product` 记录、同一份 schema（`world/product.yaml:11` `periodDays: number`）在两个创建入口应当落成**同一 JSON 类型**。CLI（`buildProduct`，`scripts/lib/economy.mjs:142`，`Number(input.periodDays …)`）落数字，页面也应当落数字（或明确声明该字段接受 decimal string）。

## 实际

- 页面创建的商品：`periodDays` 是**字符串** —— article 为 `"0"`，subscription 为 `"30"`。
- CLI 创建的商品：`periodDays` 是**数字** —— `0`（`int`）。
- 同一目录 `economy/products` 因此并存两种 JSON 类型，与 `world/product.yaml` 的 `number` 声明不一致。
- 该字符串类型在仓库既有实现中被容忍：`validateProduct`（`economy.mjs:163`）与 `resolveAccessExpiry`（`economy.mjs:300`）都先 `Number(...)`，所以 `validateProduct` 对页面记录仍返回 `issues: []`。

## 证据输出

`docs/team/test-reports/raw/round-24f/qa24f-bug066.json`（页面正例，探针随后定向删除了这两条记录）：

```text
$ python3 -c "…读取 pos_article / pos_subscription 的 content…"
article      content: {"id":"qa24f-art-1790648905045", … "periodDays":"0",  "createdAt":"…","updatedAt":"…"}
subscription content: {"id":"qa24f-sub-1790648905045", … "type":"subscription", … "periodDays":"30", …}
# 两条都是 str；探针内 validateProduct → {"issues":[]}

$ arc afs exec /blocklets/arcblog/.actions/read --args '{"path":"/instance/app/arcblog/economy/products/econ-test-fc-product-1790621430746.json"}'
{
 "id": "econ-test-fc-product-1790621430746",
 …
 "settlementPolicy": "v1",
 "periodDays": 0,          # ← number（CLI buildProduct 的 Number(...)）
 "createdAt": "2026-09-28T18:50:31.089Z",
 "updatedAt": "2026-09-28T18:50:31.089Z"
}

$ sed -n '11p' world/product.yaml
  periodDays: number # subscription period (spec §38); manual renewal = a new order, no auto-billing

# 说明：页面写字符串不是 R24F 新引入——R24 修复前页面就已有 create 路径，qa-r24-w1.json 里
# 旧探针创建的记录同样是 "periodDays": "0"。R24F 让该路径也能写 "30"（订阅），问题面扩大。
```

退出码：0

## 影响范围

- 受影响角色：admin（页面书写）；任何按 `world/product.yaml` 类型读 `economy/products` 的消费者
- 受影响链路：经济 —— 商品目录的**记录类型契约**
- 数据后果：已写入（均为 QA/Dev 探针记录，探针结束时已定向删除；存量 CLI 记录不受影响）
- 可绕过：CLI `node scripts/arcblog-economy.mjs product add`（落 number）
- **为什么是 P2 而不是 P1**：本仓库全部读侧（`validateProduct`、`resolveAccessExpiry`）都先 `Number(...)`，实测页面记录 `validateProduct` → `issues: []`，**未发现任何功能中断**；问题是持久化记录的 JSON 类型与声明 schema 不一致。若未来出现严格类型消费方（schema 校验、链上/结算序列化、`=== 30` 之类比较），它会升级为 P1 —— 请 PM 在裁决时明确这一前提。

## 疑似文件

- `.aup/pages/economy/policy.aup:276`（非订阅按钮 `periodDays: "0"`）与 `:285`（订阅按钮 `periodDays: "${args.eSubPeriod}"`）
- `world/product.yaml:11`（`periodDays: number`）
- `scripts/lib/economy.mjs:142`（CLI `buildProduct` 用 `Number(...)`）

---

## QA 复验记录（round-25，`task-108`，2026-09-29）——独立取证，不采信 Dev 自述

**方法与口径**：REQ-032 §5 要求**先探针**（spec §150），再判分支。QA 的探针 = 真实浏览器点击写入 → `arc afs exec … read` 读回 → `typeof`。原始产物：`docs/team/test-reports/raw/round-25/qa-r25-all.json`（`steps.products`）、`qa-r25-queue.mjs`。

**命令与真实输出**：

```text
$ node docs/team/test-reports/raw/round-25/qa-r25-queue.mjs products
PRODUCTS {"baselineCount":54,"ids":{"ART":"qa25-art-1790652644207","SUB":"qa25-sub-1790652644207"},
          "artFill":"{\"id\":\"qa25-art-1790652644207\",…,\"type\":\"article\",…}",
          "artClick":"clicked:Create product", … }

# 读回（同一 JSON）：
art  periodDays = 0            typeof = number   priceAmount = "1.50"  typeof = string
sub  periodDays = 7            typeof = number   type = "subscription"
art content {"id":"qa25-art-1790652644207","creatorDid":"did:blocklet:arcblog","type":"article","contentId":"",
             "priceAmount":"1.50","priceAsset":"USDC","visibility":"public","settlementPolicy":"active",
             "periodDays":0,"createdAt":"2026-09-29T03:33:09.033Z","updatedAt":"2026-09-29T03:33:09.033Z"}
sub content {"id":"qa25-sub-1790652644207",…,"type":"subscription",…,"periodDays":7,…}
# 订阅按钮不再来自 <select>：DOM 实测 periodSelect=false、sub7/sub30/sub90/sub365=true
# （即 "7 days"/"30 days"/"90 days"/"365 days" 四个按钮，各自写裸数字字面量）

baseline 54 → after 56 → after cleanup 54    baselineRestored = true
```

**同一探针的旁证**（队列意图的 payload 也走同一条 `exec content` 通道）：

```text
$ arc afs exec … read …/config/policy-intents/2026-09-29T03:30:53.378Z.json
"payload": { "creator": 0.95, "hub": 0.03, "protocol": 0.02 }     # typeof 三者皆 number
```

**判据结论**：

| 判据 | 结论 | 证据 |
| ---- | ---- | ---- |
| B1 先探针、有真实命令 + 原始输出 | **通过** | 上两段：页面点击 → AFS 读回 → `typeof`；未臆造平台能力 |
| B2 落 number，与 CLI 一致，`validateProduct` `issues: []`，探针删除、products 回 54 | **通过** | `periodDays` = `number`（0 / 7）；`products` 54 → 56 → 54 |
| B3（若不可表达才适用） | **不适用** | 平台**可表达**裸数字字面量；`priceAmount` 保持 string（`world/product.yaml:7` 即 `string`） |

**读侧归一化（即使 B2 成立也一并核对，作为回归保护）**：

```text
$ grep -n "Number(" scripts/lib/economy.mjs
76:    const raw = Number(policy[share]);
94/95/96: Number(input.creator|hub|protocol …)
142:    periodDays: Number(input.periodDays ?? existing?.periodDays ?? 0) || 0,   # buildProduct
163:  if (str(product.type) === "subscription" && !(Number(product.periodDays) > 0))  # validateProduct
300:  const periodDays = Number(product?.periodDays ?? 0);                        # resolveAccessExpiry
```

**残留**：探针商品 `qa25-art-*` / `qa25-sub-*` 已定向删除；`economy/products` 回到基线 54。**受限**：本轮未复验 CLI `product add` 侧的 `--period-days` 新写入（既有实现未改，且 `npm test` + 定向 live 全绿）。
