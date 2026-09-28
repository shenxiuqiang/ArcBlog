# BUG-034: `?page=hub` 关系行 @1512/en 仍溢出 92px（UI-012-05 定为 P1 的项只达成 1803）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-034 |
| 严重级 | **P2**（若 Lead 坚持 UI-012-05 的 P1 分级覆盖 1512 视口，可升级为 P1） |
| 发现轮次 | round-14F（QA 独立复验） |
| 关联 | UI-012-05（hub 关系行溢出，清单定为 **P1**）、L-R14F-3、L-R14F-5 |
| 状态 | 待裁决 |

## 复现命令与最小步骤

1. 前置：CDP `:9333`、admin、单标签页；共享 tab 用 `Emulation.setDeviceMetricsOverride 1512×765`。
2. 打开 `?page=hub&locale=en`（`?locale=` 需先 `sessionStorage.clear()` + `about:blank`）。
3. 统计含文本且 `scrollWidth > clientWidth+1` 的元素，并读 `.aup-list-template-item` 内的几何链。

```bash
node /tmp/qa-r14f-targeted.mjs --target <pageTargetId> --viewport 1512x765 \
  --steps <(echo '[{"url":"http://arcblog.localhost:4939/?page=hub&locale=en","clear":true,"expr":"FILE:/tmp/r14f/e_hubgeo.js"}]')
node /tmp/qa-eval.mjs --target <pageTargetId> --url '…?page=hub' --wait 2600 --expr /tmp/r14f/e_hubgeo.js   # 1803 对照
```

## 期望

UI-012-05 的验收：关系行溢出归零（原 1803 over 131、1512 over 255）。修复应在两个视口都成立，或明确登记为「平台固有 + 平台侧证据」后 allowlist。

## 实际

拆行修复对 **1803 完全有效（0 处溢出）**，但 **1512 未归零**：

```text
# 1512×765 / en（QA 实测）
itemW(.aup-list-template-item)=575
kvChain: .aup-kv-row  w=276.84 cw=277 sw=277 over=0  grid="140px 120.844px"
         .aup-view    w=276.84 cw=277 sw=369 over=92   ← 行内 flex 子容器
文本溢出面：10 个元素，最大 over=92（.aup-view / .aup-kv / .aup-kv-row.aup-kv-mono）

# 1803×908 / en-ZH 对照：关系行与 kv 全为 over=0
```

- 残留原因：`afs-list itemStyle=row` 下该行同时容纳「内容列（`flex:1 1 0%`）」与 **3 个 action 按钮**（approve/reject/purge）；1512 视口下行宽 575，内容列只分到 277，而其 min-content（`did:key` + `hub show/sync` 两条 CLI 命令行）≈369 → 溢出 92。
- 影响：文字溢出自身盒 **92px（en）/ 31px（zh）**；**无横向滚动条**（`docOver=0`、`hScrollers=[]`）、**无文本×按钮相交**（文本×控件扫描 hitCount=0）→ 视觉挤压/裁切，未造成点击错位。
- **与 Dev 自述不一致**：Dev 披露「hub @1512：8 条 `.aup-kv-row.aup-kv-mono` over **4–31px**」。QA 实测 **en/1512 = 92**，**zh/1512 = 31**（`cw` 分别为 277 与 338）→ 披露值只覆盖 zh 情形，遗漏了 en/1512 的更严重残留。

**平台固有性未完全成立**：溢出的确是平台 `.aup-kv-row` grid（无页内 style 入口，见 BUG-035 的 67 键白名单证据），但**容器只有 277px** 源于页内把 3 个 action 放在同一行；把 action 移出该行后内容列可拿到 ~565px > 369 → 溢出可归零。故 **不应直接 allowlist**。

## 影响范围

- 角色：admin / operator（Hub 控制台，1512 宽度视口）
- 链路：运营 → Hub console → 关系列表（`did:key` 与排障命令行可读性）
- 数据后果：无（只读展示）
- 同类：`?page=factory` 的同类残留另立 BUG-035

## 疑似文件

- `.aup/pages/ops/hub.aup:166-179`（关系行：内容列 + 3 个 action 同行；`key-value-list hub-row-cmds` 两条 mono CLI 命令）
- 平台侧：`.aup-kv-row` grid（`grid-template-columns: 140px <剩余>`，无 style 入口）

## 建议修法（由 Dev/PM 裁定）

① 页内：把 3 个 action（或至少 purge）移出关系行、单独成行（与 UI-012-05 的拆行同思路），使内容列拿到全宽；或
② 缩短 `hub-row-cmds` 的展示值（页面不伪造命令 → 不可取）；或
③ 若确认为平台限制，需补平台侧证据后再 allowlist（当前 QA 判定：平台固有性不成立）。

---

## QA Round 22 独立复验（task-93，2026-09-29；admin 单 tab，CDP）

> 原始输出：`docs/team/test-reports/raw/round-22/13-cdp.json`、`14-cdp-focus.json`。探针：`raw/round-22/qa-r22-cdp.mjs`、`qa-r22-cdp-focus.mjs`。**修前基线对照**：Dev 的只读探针输出 `/tmp/dev-r22-geom-baseline.json`（QA 用它做「有无新增溢出」的对照，不作为验收依据）。

**结论：已修复（P2 关闭）** —— 结构改法落地，四组视口关系行溢出全 0。

```text
# 静态：3 个 action 从行内移到内容列下方的 row gap=sm cross=center（.aup/pages/ops/hub.aup）
$ grep -c "wordBreak\|overflowWrap\|whiteSpace\|textOverflow" .aup/pages/ops/hub.aup
0                    # 未新增断行类 style 键（arc-contracts §29.8）；grep_exit=1

# 运行期（?page=hub；12 行 / 30 条 .aup-kv-row）
en_1803  itemW=698.28  kv over=[0×30]  kvMax=0  docOver=0
en_1512  itemW=574.59  kv over=[0×30]  kvMax=0  docOver=0
zh_1803  itemW=698.28  kv over=[0×30]  kvMax=0  docOver=0
zh_1512  itemW=574.59  kv over=[0×30]  kvMax=0  docOver=0
文本 × action 相交 hitCount=0（四组）
```

- B34-1 只能改结构：**通过**（结构移行 + 断行类键 0 命中）。
- B34-2 溢出归零：**通过**（修前 en/1512 kv over 最大 92、zh/1512 31、1803 0 → 现全 0）。
- B34-4 无新溢出 / 无横向滚动：**通过**（`docOver=0`，四组无横向滚动；页面壳层仍有 2 处 `.aup-view` `cw=1136/sw=1324 over=188`（1512）、`cw=1200/sw=1356 over=156`，与修前基线 `dev-r22-geom-baseline.json` 的 cw/sw/over **逐值相同** → 属既有平台壳层裁切，`overflowX: visible`，非本轮引入、非 scroller）。
- B34-3 三动作仍可用且真写数据：**受限未验证** —— 未做 approve/reject/purge 的真实写点击（会改写 live 收录关系记录）。静态复核：三条 `exec`（tree-merge ×2、`/.actions/delete` ×1）与 `confirm` 文案逐字保留，`arc dsl validate --json` `issues: []`。建议 Lead/Dev 决定是否在隔离实例补一次点击取证。
