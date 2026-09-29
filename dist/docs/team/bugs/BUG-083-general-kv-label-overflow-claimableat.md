# BUG-083: `?page=general` 角色配置卡 `studio.lifecycle.claimableAt` 标签溢出所在列 10px（记录解析完成后）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-083 |
| 严重级 | **P3**（纯视觉：页面级横向溢出仍为 0、无相邻卡相交、无文字被截断到不可读；标签列宽 161px vs 标签内容 171px） |
| 发现轮次 | round-28（批次末统一 QA，D2 复测时顺带发现） |
| 关联 REQ | 无（**范围外 / 既有**：`studio.lifecycle.claimableAt` 这一行在 HEAD 就存在——`git show HEAD:.aup/pages/admin/general.aup \| grep -c studio.lifecycle.claimableAt` = 1；R28 的 general 改动只有 D2/D8） |
| 状态 | 待裁决 |

## 复现命令与最小步骤

1. 前置：admin 会话的 CDP Chrome（`http://127.0.0.1:9333`）、`arcblog.localhost:4939`、视口 **1512×765**。
2. **同一标签页**先访问任一控制台页（让会话/记录解析进入「已解析」态），再切到 `?page=general`。
3. 量 `.aup-kv-label` 的 `scrollWidth` vs `clientWidth`。

关键条件：`roles-config-kv` 的该行带 `hideWhenEmpty: true`——**全新 context 的冷载**里 `state.roles.studio.lifecycle.claimableAt` 尚未解析，该行被隐藏 ⇒ 不溢出；记录解析后（重载 / 用页内菜单往返一次 / 同标签页二次进入）该行出现 ⇒ 溢出 10px。这也解释了「同一视口两次测量结果不同」。

```bash
# 复现脚本（QA 口径：hub 展开 → 同标签页切 general）
node /tmp/qa/kvlabel.mjs          # 见报告「复现命令全集」；核心 = navigate ?page=hub, 展开, navigate ?page=general
# 对照（全新 context 直载 general）：3/3 次 soReal = []，不溢出
node /tmp/qa/probe.mjs --pages general --locales en --viewports 1512x765 --out /tmp/qa/kv.json
```

## 期望

KV 标签列不应让标签内容溢出自身盒子（UI 标准 §4.3 / §9：无硬编码、无内容越界）；或该行与同卡其它 12 个标签一样保持 `scrollWidth == clientWidth`。

## 实际

`?page=general` @1512×765、记录已解析时，`roles-config-kv` 的 `studio.lifecycle.claimableAt` 标签 `scrollWidth=171 / clientWidth=161 / over=10`；同卡另外 12 个标签（含最长的 `studio.lifecycle.assetId`）全部 `161/161`。页面级 `documentElement` 横向溢出仍为 **0**、`>R/<L` 越界 0（不破页面骨架）。

## 证据输出

```text
$ node /tmp/qa/kvlabel.mjs        # 1512x765, ?page=hub(展开) → 同标签页 ?page=general
{'text': 'studio.lifecycle.state',     'sw': 161, 'cw': 161, 'over': 0,  'fs': '12px'}
{'text': 'studio.lifecycle.assetId',   'sw': 161, 'cw': 161, 'over': 0,  'fs': '12px'}
{'text': 'studio.lifecycle.claimableAt','sw': 171, 'cw': 161, 'over': 10, 'fs': '12px'}   ← 命中
{'text': 'hub.collectionAddress',      'sw': 161, 'cw': 161, 'over': 0,  'fs': '12px'}
…
```

```text
$ node /tmp/qa/probe.mjs --pages hub,general --locales en --viewports 1512x765 --expand hub
1512x765|en|hub      soReal= [] deOver= 0
1512x765|en|general  soReal= [{'tag':'DIV','cls':'aup-kv-label','sw':171,'cw':161,'over':10,'fullBleedAncestor':False}] deOver= 0
```

```text
# 对照：全新 context 直载 general（claimableAt 行隐藏）
run 1 soReal= [] soRealContent= [] deOver= 0
run 2 soReal= [] soRealContent= [] deOver= 0
run 3 soReal= [] soRealContent= [] deOver= 0
```

退出码：0（探针）

## 影响范围

- 受影响角色：admin（控制台读者）。
- 受影响链路：界面（`?page=general` 的「外部化配置（只读）」卡标签列）。
- 数据后果：无（只读）。
- 可绕过：否（视觉）；不影响功能与可读性判定（标签仍可读，只是视觉上多出 10px）。

## 疑似文件

- `.aup/pages/admin/general.aup:325` 的 `key-value-list roles-config-kv`（`studio.lifecycle.claimableAt` 标签）
- 平台层面：`.aup-kv-label` 固定列宽（161px @1512）未随最长标签自适应——修法需 UI 先探针（改标签文案 / 缩短 / 平台列宽是平台侧还是页面侧）

## Lead 裁决（2026-09-29，R28 合并点）

**保持 open（P3）→ 排入 R29（最后一轮）**。事实：`?page=general` @1512×765 下 `studio.lifecycle.claimableAt` 的 KV 标签溢出 10px（页面 `documentElement` 横向 over 仍为 0，故不阻断）。
修法与 D1/D3 同族（行内 `flexGrow:0, flexBasis:auto` 或 KV 标签允许换行），**不**用硬编码宽度。
