# BUG-077: `?page=general` 角色状态行的状态值在 zh 页面仍是英文（`granted` / `withheld` / `yes` / `no`）—— 中文页面中英混排

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-077 |
| 严重级 | **P3**（i18n/文案：不影响功能与数据；REQ-034 要求 en/zh 成对交付） |
| 发现轮次 | round-26（QA `task-112` 独立验证 REQ-034 A/B 组时发现） |
| 关联 REQ | [REQ-034](../requirements/REQ-034-roles-capabilities-settings.md) §3.1 A2/A3、§3.2 B1/B3（五态 + `configured`/`active`/原因三元，en/zh 呈现） |
| 状态 | **待裁决**（QA 未修改任何源码） |

## 复现命令与最小步骤

```bash
# 单 tab、admin context、locale=zh（`?locale=zh`），读 ?page=general 的角色状态列表
node docs/team/test-reports/raw/round-26/qa-r26-browser.mjs general
# qa-r26-general.json → general.zh.text（摘录见下）
```

## 期望

中文页面的标签与取值都应是中文（或至少与 en 页面同样可读）；本卡其余文案（标题、说明、字段名）都已成对翻译。

## 实际

zh 页面里：

- 标签是中文：`能力：` / `持有资产：` / `已配置：`
- **取值是英文**：`granted` / `withheld` / `yes` / `no`
- 扣留原因是引擎原文（REQ B2 要求「逐字」，英文原文是**刻意**的，不算本条问题）

根因位置很清楚：取值来自 worker 写进 `node/role-status/<role>.json` 的 `activeLabel` / `configuredLabel` / `assetOwnedLabel`（`'granted' | 'withheld' | 'yes' | 'no'`），页面直接插值 `${entry.content.activeLabel}`，因此不受 locale 影响。

## 证据输出

```text
$ node docs/team/test-reports/raw/round-26/qa-r26-browser.mjs general
# qa-r26-general.json → general.zh.text（逐字摘录，three rows）
角色状态（来自最近一次快照）
…
basic
none
能力： granted
持有资产： no
已配置： no
…
hub
acquired
能力： withheld
持有资产： yes
已配置： yes
…
studio
none
能力： withheld
持有资产： no
已配置： yes
```

对比 en（同一份 QA 采集）：`Capability: granted` / `Asset owned: no` / `Configured: no` —— 英文页面自洽，zh 页面中英混排。

退出码：0

## 影响范围

- 受影响角色：`?page=general` 的 zh 用户
- 受影响链路：界面文案（快照投影记录的 label 字段），不涉及写路径
- 数据后果：无
- 可绕过：无
- 复发面：`node/role-status/*` 是 **Dev 探针遗留的实例记录**（REQ-034 H6 未登记项）。若 Lead 决定删除这些记录，页面会回落到空态 —— 那时本条不可观察；若保留，则应把 label 做成 i18n（页面侧映射，或 worker 存布尔 + 页面 `$t()`）

## 疑似文件

> 线索不是结论；QA 未修改。

- `.aup/pages/admin/general.aup`（`$t(general.roles-active) ${entry.content.activeLabel}` 等三处插值）
- `scripts/lib/role-verify.mjs`（`activeLabel` / `configuredLabel` / `assetOwnedLabel` / `stakeActiveLabel` 的取值）
