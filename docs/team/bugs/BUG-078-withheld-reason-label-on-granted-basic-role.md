# BUG-078: `?page=general` 对**已授予**的 `basic` 角色也显示「Withheld reason（扣留原因）」标签——标签与状态语义不符

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-078 |
| 严重级 | **P3**（文案：标签错位；不涉及功能、权限或数据） |
| 发现轮次 | round-26（QA `task-112` 独立验证 REQ-034 B 组时发现） |
| 关联 REQ | [REQ-034](../requirements/REQ-034-roles-capabilities-settings.md) §3.2 B2（每个 `active=false` 的链角色显示 `reason` 原文）、B3（`configured`/`active`/原因三元） |
| 状态 | **待裁决**（QA 未修改任何源码） |

## 复现命令与最小步骤

```bash
node docs/team/test-reports/raw/round-26/qa-r26-browser.mjs general
# qa-r26-general.json → general.en.text / general.zh.text 的第一行角色是 basic
```

## 期望

`reason` 字段对 `basic` 是「为什么它是隐式授予的」（`basic capability is implicit for every instance`），不是「为什么被扣留」。标签应随角色状态变化（例如 `basic` 用「Reason」，`studio`/`hub` 用「Withheld reason」），或统一改成中性的「Reason」。

## 实际

三个角色行都无条件使用同一个标签：

```text
basic   none  Capability: granted
    …
    Withheld reason (verbatim from the role engine): basic capability is implicit for every instance
hub     acquired  Capability: withheld
    Withheld reason (verbatim from the role engine): stake state is "acquired"; chain verification is not wired yet (fail closed, spec §115)
studio  none  Capability: withheld
    Withheld reason (verbatim from the role engine): stake state is "none"; chain verification is not wired yet (fail closed, spec §115)
```

`basic` 行左侧写着 `Capability: granted`，右侧却写「Withheld reason」，自相矛盾；REQ-034 B2 的口径本身只要求 `active=false` 的链角色显示原因。

## 证据输出

```text
$ node docs/team/test-reports/raw/round-26/qa-r26-browser.mjs general
# general.en.text（逐字）
basic
none
Capability: granted
Asset owned: no
Configured: no
collectionAddress / network / assetType / lifecycle.state …: / / / none
Recorded assetId / stakeId / claimableAt …: / /
node/factories.json projection says (state / assetId) …: /
claimableAt (relative)
just now
basic capability is implicit for every instance — there is no chain record to compare
Withheld reason (verbatim from the role engine): basic capability is implicit for every instance
```

zh 页面同样：`能力： granted` … `扣留原因（逐字来自角色引擎）: basic capability is implicit for every instance`。

退出码：0

## 影响范围

- 受影响角色：`?page=general` 的 admin 用户（en/zh 均受影响）
- 受影响链路：界面文案（`roles-k-reason` 标签）
- 数据后果：无（`reason` 值本身逐字来自引擎，正确）
- 可绕过：无

## 疑似文件

> 线索不是结论；QA 未修改。

- `.aup/pages/admin/general.aup`：`p "$t(general.roles-k-reason): ${entry.content.reason}"`（无条件下同一个标签）
- 可选修法：把标签做成 `activeLabel` 的函数（如 `granted` → Reason / 否则 Withheld reason），或把标签改为中性措辞
