# BUG-061: BUG-037 的平台边界结论被证伪 —— `media` **会**渲染 `data:image/svg+xml;base64`（naturalWidth 480）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-061 |
| 严重级 | **P3**（证据/文档口径：若按 Dev 结论落 `arc-contracts.md`，会写入一条**错误的平台事实**；当前无功能损坏） |
| 发现轮次 | round-22（QA `task-93` 独立复验 BUG-037 / B37-4 时发现） |
| 关联 | [BUG-037](BUG-037-factory-nft-svg-placeholder.md) B37-4「平台边界登记（交 Lead）」；REQ-029 §3.5；spec §150「不臆造平台能力」 |
| 状态 | 待裁决（**落 `arc-contracts.md` 前必须更正**） |

## 复现命令与最小步骤

```bash
cd /Users/shenxiuqiang/workspace/ArcBlog
# admin 单 tab（CDP :9333），直载 ?page=factory&locale=en，wait ≥4.4s
node docs/team/test-reports/raw/round-22/qa-r22-cdp.mjs - docs/team/test-reports/raw/round-22/13-cdp.json
node docs/team/test-reports/raw/round-22/qa-r22-cdp-focus.mjs
```

## 期望

若结论是「平台边界：`media` 不接受 `data:` URI → 只能渲染 placeholder」，则 `[data-aup-id="factory-nft-svg"]` 内不应出现 `img`。

## 实际（QA 原始输出）

```text
$ node …/qa-r22-cdp-focus.mjs
"factoryImg": {
  "hasImg": true,
  "srcScheme": "data:image/svg+xml;base64,PHN2",
  "naturalWidth": 480,
  "naturalHeight": 300,
  "complete": true,
  "alt": "NFT card",
  "simulatedContexts": ["… | Node hub · fact kind | SIMULATED — mock adapter, never chain truth | …"],
  "dashOnly": 11
}

$ node …/qa-r22-cdp.mjs   # factory_cold_en / factory_cold_zh
"mediaHTML": "<div class=\"aup-media\" data-aup-id=\"factory-nft-svg\"><img src=\"data:image/svg+xml;base64,PHN2ZyB4bWxucz0i…\"></div>"
```

即：`media` 组件**成功渲染** `nodes.studio.svg`（`data:image/svg+xml;base64,…`），图片解码完成（480×300）。BUG-037 首登时的 `aup-placeholder` 更可能是 **`src` 为空**（冷载空投影，即 BUG-036 现象）导致的占位，而**不是** data URI 被平台拒绝。此因果判断标注为**推断**（原始记录未同时抓 `src` 快照），但「data URI 不被接受」这一**平台事实断言已被直接观测否证**。

## 影响范围

- 若落入 `arc-contracts.md`：会误导后续实现（例如为了「绕过平台限制」而改卡片结构或放弃 SVG 图示），并可能让 QA/Dev 把真问题（绑定时序）判成平台限制。
- `?page=factory` 的 NFT 卡当前显示的是 **studio（ocap，真链）** 卡的 SVG；`nodes.hub`（mock）卡不在此元素中呈现 —— 与 REQ-023 A4「页面不得出现代币符号」无冲突（SVG 内文本不进入 DOM 文本节点，且页面侧 `ABT` 命中仍为 0）。
- 数据后果：无。

## 疑似文件 / 待更正材料

- Dev 回报第 ⑥⑦ 条中的「平台边界：`media` 不吃 `data:` URI」表述
- [BUG-037](BUG-037-factory-nft-svg-placeholder.md) 末尾「平台侧：`.aup-media` 对 `data:` URI 的处理（建议 `arc-contracts.md` 记一条「media 不接受 data URI → placeholder」）」
- `docs/team/journal/round-22.md` §1.3 / §2 中拟交 Lead 的平台边界条目
