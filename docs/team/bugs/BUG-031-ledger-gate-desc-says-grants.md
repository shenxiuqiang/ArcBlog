# BUG-031: 账本页登录门文案写成「查看经济与授权（grants）」，与本页内容（结算与账本）不符

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-031 |
| 严重级 | **P3** |
| 发现轮次 | round-14 |
| 关联 REQ | [REQ-017-orders-and-ledger-ui](../requirements/REQ-017-orders-and-ledger-ui.md) §3.8 A7.3（登录 gate 指向真实本页） |
| 状态 | **已修复（round-14F，QA 独立复验通过 — 见文末「复验（round-14F）」）** |

## 复现命令与最小步骤

1. 前置：共享 CDP 浏览器 `127.0.0.1:9333`；**无 cookie** 的隔离浏览器上下文（guest）。
2. 打开 `?page=ledger`，读 gate 卡说明文字。

```bash
node /tmp/qa-eval.mjs --guest --url 'http://arcblog.localhost:4939/?page=ledger' --wait 3000 --expr /tmp/expr-guest-gate.js
grep -n 'gate-desc' .aup/pages/economy/ledger.aup
```

## 期望

新页 guest 登录门应描述**本页**内容（REQ-017 §2.1③ 是「结算与账本」页）：`en` 应为 “…view the economy and settlements / the ledger”，`zh` 应为「查看经济与结算与账本」一类；即 A7.3 的精神——gate 指向并说明真实本页。

## 实际

`ledger.aup:19` 直接沿用了 policy/access 的文案：

```text
$ grep -n 'gate-desc' .aup/pages/economy/ledger.aup
19:    gate-desc { en "Sign in with DID Wallet to view the economy and grants." zh "使用 DID Wallet 登录后查看经济与授权。" }

$ node /tmp/qa-eval.mjs --guest --url '…?page=ledger' … --expr /tmp/expr-guest-gate.js
{ "url": "http://arcblog.localhost:4939/?page=ledger&locale=zh",
  "bodyText": "ArcBlog\n经济\n使用 DID Wallet 登录后查看经济与授权。\n使用 DID Wallet 登录" }
```

对照同轮新增的 orders 页（写法正确）：`.aup/pages/economy/orders.aup:16` → `zh "使用 DID Wallet 登录后查看经济与订单。"`。
`grants`/「授权」在本仓库指 **access-grants**（`?page=access`）；账本页展示的是 settlements + ledger，guest 会读到错误的功能描述。

## 证据输出

```text
$ grep -hn 'gate-desc' .aup/pages/economy/*.aup
5:    gate-desc { en "Sign in with DID Wallet to view the economy and grants." zh "使用 DID Wallet 登录后查看经济与授权。" }   ← policy.aup（既有）
19:    gate-desc { en "Sign in with DID Wallet to view the economy and grants." zh "使用 DID Wallet 登录后查看经济与授权。" }  ← ledger.aup（本轮新增）
16:    gate-desc { en "Sign in with DID Wallet to view the economy and orders." zh "使用 DID Wallet 登录后查看经济与订单。" }  ← orders.aup（本轮新增，正确）
4:    gate-desc { en "Sign in with DID Wallet to view the economy and grants." zh "使用 DID Wallet 登录后查看经济与授权。" }   ← access.aup（既有，语义正确）
```

退出码：0

## 影响范围

- 受影响角色：guest（未登录访客）→ 也会被 admin 看到（gate 在未登录态）
- 受影响链路：经济 → 账本页的登录门文案
- 数据后果：无（纯文案）
- 可绕过：否（文案写死在页面）
- 范围说明：**policy.aup 也用了同一句**（语义同样偏），但那是既有页面、非本轮产物；本条只主张**本轮新增的 ledger 页**命中

## 疑似文件

- `.aup/pages/economy/ledger.aup:19`（`gate-desc`）
- `.aup/locales/{en,zh}.json` 的 `ledger.gate-desc`

---

## 复验（round-14F，QA）

**源码复核（当场 `grep -n`）**：

```text
$ grep -n 'gate-desc' .aup/pages/economy/ledger.aup
19:    gate-desc { en "Sign in with DID Wallet to view settlements and the ledger." zh "使用 DID Wallet 登录后查看结算与账本。" }
$ grep -n 'grants\|授权' .aup/pages/economy/ledger.aup
（无输出，exit=1）
```

**运行期（guest 隔离上下文，无 cookie；跑完 dispose）**：

```text
$ node /tmp/qa-eval.mjs --guest --url 'http://arcblog.localhost:4939/?page=ledger&locale=zh' \
    --wait 3000 --expr /tmp/r14f/e_guest.js
{ "lang": "zh", "initFailed": false,
  "bodyText": "ArcBlog\n经济\n使用 DID Wallet 登录后查看结算与账本。\n使用 DID Wallet 登录",
  "gateDescHasGrants": false, "gateDescHasLedger": true,
  "kvRows": 0, "listItems": 0, "afsLists": 0,
  "gateActions": [ { "text": "使用 DID Wallet 登录", "w": 175.39, "h": 38 } ] }
# pageTargets before=1 after=1
```

**结论**：**修复确认**——guest 只能看到 gate 卡，文案描述本页（结算与账本），不再出现 `grants`/「授权」，且无数据泄漏（kv/list/afs-list 均为 0），CTA 未被拉伸（175.39×38）。

**同族（UI-012-12）一并复验通过**（`grep -n` en/zh 成对核对）：
`policy.aup:4`「分成策略与商品 / the split policy and products」、`agents.aup:14`「Agent 授权与策略 / agent grants and policy」、`media.aup:5`「媒体索引 / the media index」、`operations.aup:9`「节点健康与发现 / node health and discovery」。
