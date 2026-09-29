# BUG-075: 角色状态行的 `claimableAt` 为空时仍渲染相对时间 `just now`（无值 ≠「现在可领取」），且有值时没有绝对时间 `title` —— REQ-034 B4 部分达标

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-075 |
| 严重级 | **P2**（体验/文案：三个角色的等待期字段读起来都像「现在可领取」；不涉及数据、权限或链写） |
| 发现轮次 | round-26（QA `task-112` 独立验证 REQ-034 B4） |
| 关联 REQ | [REQ-034](../requirements/REQ-034-roles-capabilities-settings.md) §3.2 **B4**（「等待期可见」：`claimableAt` 有值时显示该时间值 + 相对时间原语，**不承诺秒级倒计时**）；spec §15.9（等待期倒计时可见） |
| 关联裁定 | L-R26-1（设置-角色与能力落地 `?page=general`） |
| 状态 | **待裁决**（QA 未修改任何源码） |

## 复现命令与最小步骤

```bash
# 1) 前置：`config/roles.json` 三个角色的 claimableAt 当前都是空串（studio=测试形残留、
#    basic 无链记录、hub 未撤回过）——直接读原始记录即可确认：
arc afs exec /blocklets/arcblog/.actions/read --args \
  '{"path":"/instance/app/arcblog/node/role-status/studio.json"}'
# → "claimableAt": ""

# 2) 单 tab、admin context，读 ?page=general 的「角色状态（来自最近一次快照）」列表：
node docs/team/test-reports/raw/round-26/qa-r26-browser.mjs general
# → 三个角色的 DOM 都出现（原始输出见下）
```

## 期望

`claimableAt` 为空时**不应**渲染任何可读时间（该字段语义是「等待期结束时刻」）；有值时按 REQ B4 至少给出相对时间原语，并尽量给出绝对时间（`title`）。

## 实际

1. **空值渲染成 `just now`**：`basic` / `studio` / `hub` 三行的 `claimableAt` 记录值都是空串 `""`，但每行都渲染出 `claimableAt (relative)` + **`just now`**（zh：`claimableAt（相对时间）` + `just now`）。对 `studio`（`state=none`，记录里根本没有等待期）而言，这读起来像「现在就能取回」。
2. **有值时没有绝对 `title`**：页面源码给该原语的参数是 `time mode=display value="${entry.content.claimableAt}" timeMode=relative`，**没有任何 `title`**；当前 DOM 里 `<time>` 元素也没有 title/dateTime（Dev 探针在 `revoking` + 过去时刻的造态下测到 `relativeNode: "1 minute ago"` 但 `timeTitles: []`，与本条一致——该半程引用 Dev 原始输出，QA 未复制造态）。

> 因此 REQ-034 B4 判为**部分达标**：相对原语这一半成立，空值语义与绝对时间这一半不成立。

## 证据输出

```text
$ arc afs exec /blocklets/arcblog/.actions/read --args '{"path":"/instance/app/arcblog/node/role-status/studio.json"}'
… "claimableAt": "", "checkedAt": "2026-09-29T04:52:05.568Z" …

$ node docs/team/test-reports/raw/round-26/qa-r26-browser.mjs general
# qa-r26-general.json → general.en.text（逐字摘录，three rows）
basic  none  Capability: granted  Asset owned: no  Configured: no
  … collectionAddress / network / assetType / lifecycle.state …: / / / none
  … Recorded assetId / stakeId / claimableAt …: / /
  claimableAt (relative)
  just now
hub  acquired  Capability: withheld …
  …: 0xa5ed65ce34c5c62da786bdbc10efb57ebacd2f4 / /
  claimableAt (relative)
  just now
studio  none  Capability: withheld …
  …: asset-test-1 / stake-test-1 /
  claimableAt (relative)
  just now

$ grep -n "claimableAt" .aup/pages/admin/general.aup
… time mode=display value="${entry.content.claimableAt}" timeMode=relative   ← 无 title
```

退出码：0

## 影响范围

- 受影响角色：`?page=general` 的 admin 用户；按 spec §15.9「等待期倒计时可见」验收的人
- 受影响链路：界面文案（角色状态行），不涉及 `config/roles.json`、`node/role-status/**` 的写路径
- 数据后果：无
- 可绕过：无（用户无法关掉该行）
- 判据影响：REQ-034 **B4 只能记「部分达标」**

## 疑似文件

> 线索不是结论；QA 未修改。

- `.aup/pages/admin/general.aup`（角色状态行 `p "$t(general.roles-k-claimable)"` + `time … value="${entry.content.claimableAt}"`）
- 可选修法：给 `time` 加插值式 `visible="${entry.content.claimableAt}"`，或在空值时回退为显式的「—（无等待期）」；若平台支持，同时补绝对 `title`
