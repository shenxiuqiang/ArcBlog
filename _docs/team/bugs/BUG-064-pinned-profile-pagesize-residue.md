# BUG-064: 共享 Chrome profile 残留 7 个 `aup-list-pagesize:<id>` 探针键（会静默覆盖节点 pageSize）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-064 |
| 严重级 | P3 |
| 发现轮次 | round-23 |
| 关联 REQ | [REQ-030-list-pagination](../requirements/REQ-030-list-pagination.md)（Dev 报告 D5③ 已提示该 localStorage 机制） |
| 状态 | 待裁决 |

## 复现命令与最小步骤

1. 前置：本机 pinned Chrome（CDP `:9333`）的默认 profile（团队共用，admin 已登录）打开任一 `arcblog.localhost:4939` 页面。
2. 读该 profile 的 localStorage 键。

```bash
node /tmp/arcblog-cdp.mjs "http://arcblog.localhost:4939/?page=ledger&locale=en" \
  "(() => JSON.stringify(Object.keys(localStorage).filter(k=>/aup-list-pagesize/.test(k)).map(k=>k+'='+localStorage.getItem(k))))()"
```

## 期望

探针（Dev A1 的 pageSize 对照）结束后，共享浏览器 profile 不应残留会影响运行期渲染的键；至少该残留应被记录/清理，而不是留待后续轮次静默改变行为。

## 实际

共享 profile 残留 **7 个** `aup-list-pagesize:<id>` 键，值全为 `20`：

```text
aup-list-pagesize:ledger-settlements-list=20
aup-list-pagesize:access-grants-list=20
aup-list-pagesize:tags-items-list=20
aup-list-pagesize:ledger-list=20
aup-list-pagesize:posts-drafts-list=20
aup-list-pagesize:orders-list=20
aup-list-pagesize:policy-products-list=20
```

这 7 个 id 与 Dev 报告 A1 做高度对照的 7 个列表**完全一致**（见 round-23 报告 §7-4 / BUG-063）。

**当前影响 = 0**（7 个值都等于节点声明值 20，渲染与声明一致）；**风险**：该键在运行期**覆盖**节点 `pageSize`（bundle：`ir="aup-list-pagesize:"+id`，有值即用它），因此**一旦后续轮次把某个列表的 `pageSize` 改小/改大，这个旧键会静默赢过新声明**，且页面无法察觉——这会污染后续 QA 的「rendered ≤ pageSize」类断言。

## 证据输出

```text
$ node /tmp/arcblog-cdp.mjs "http://arcblog.localhost:4939/?page=ledger&locale=en" "(() => { const keys=Object.keys(localStorage).filter(k=>/aup-list-pagesize/.test(k)); return { pinnedProfileKeys: keys.map(k=>k+'='+localStorage.getItem(k)), keyCount: keys.length }; })()"
{
  "pinnedProfileKeys": [
    "aup-list-pagesize:ledger-settlements-list=20",
    "aup-list-pagesize:access-grants-list=20",
    "aup-list-pagesize:tags-items-list=20",
    "aup-list-pagesize:ledger-list=20",
    "aup-list-pagesize:posts-drafts-list=20",
    "aup-list-pagesize:orders-list=20",
    "aup-list-pagesize:policy-products-list=20"
  ],
  "keyCount": 7
}
```

退出码：0

> QA 本轮自己的 CDP 探针**未**产生任何 profile 残留：每个阶段都新建 browser context（admin 用 cookie 注入、guest 无 cookie），阶段结束 `Target.closeTarget` + `Target.disposeBrowserContext`，各阶段均报 `leftoverByThisRun: []`（`qa-r23-*.json` 的 `cleanup` 节）。

## 影响范围

- 受影响角色：任何使用该共享 profile 做运行期验证的成员（Dev / UI / QA / Lead）
- 受影响链路：运行期界面渲染（`afs-list` 每页条数），无数据写入
- 数据后果：无（仅浏览器 localStorage）
- 可绕过：是（见下）

## 疑似文件

- 浏览器 profile 的 `localStorage`（非仓库文件）；相关运行期机制在 `aup.bc92de568433b0dc.js` 的 `afs-list` 渲染器（`aup-list-pagesize:<id>`）
- 仓库侧线索：`scripts/ui-budget-baseline.json`（无关）、`.aup/pages/**` 的 list id（键名来源）

## 建议清理（一行，需在共享 Chrome 的默认 profile 里执行）

```js
Object.keys(localStorage).filter((k) => k.startsWith('aup-list-pagesize:')).forEach((k) => localStorage.removeItem(k));
```

之后重新加载页面，`?page=ledger` 应回到 `pageSize=20 / Page 1 of 5`（QA 实测：无覆盖时即为该状态）。QA 未自行清理，因为那是用户/团队共用的浏览器 profile 状态，不属于 QA 写范围。
