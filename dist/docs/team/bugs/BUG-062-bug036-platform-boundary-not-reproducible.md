# BUG-062: BUG-036 的「平台边界」结论在页面级冷载不可复现（cold == reload 且为真值）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-062 |
| 严重级 | **P3**（证据/文档口径：结论若无条件写入 `arc-contracts.md`，会把「偶发首载时序」写成「平台必然」；诚实呈现本身无害） |
| 发现轮次 | round-22（QA `task-93` 独立复验 BUG-036 / B36-1 实验结论时发现） |
| 关联 | [BUG-036](BUG-036-cold-load-projection-values-empty.md) B36-1/B36-6；REQ-029 §3.4；spec §150 |
| 状态 | 待裁决 |

## 复现命令与最小步骤

```bash
cd /Users/shenxiuqiang/workspace/ArcBlog
# admin 单 tab（CDP :9333）：新 target 直载（冷）→ 等 4.4s → 同页 Page.reload（热）
node docs/team/test-reports/raw/round-22/qa-r22-cdp.mjs - docs/team/test-reports/raw/round-22/13-cdp.json
node docs/team/test-reports/raw/round-22/qa-r22-cdp-focus.mjs
```

## 期望

Dev 的最小实验结论是：`text 模板 / 单值 prop / 数组字面量 key-value-list / 嵌套 propBind / media src+visible` 五通道在**冷载 9.6s 内全部为空且不自行恢复**，只有页级 state set 或 reload 才出值 ⇒ 平台无法保证首屏有值。

## 实际（QA 原始输出，en + zh 各 1 次新 context/新 target）

```text
# ?page=factory，新 target 直载，wait 4400ms（cold）→ 同页 reload
factory_cold_en   kvCount 18  ["NFT ArcBlogStudioNode #5","Lifecycle acquired","Endpoint https://arcblog.localhost",
                               "Adapter ocap","Network beta","Moniker ArcBlogStudioNode","Stake per node 1",
                               "Moniker ArcBlogHubNode","Capacity (studios) 1000", …]
factory_reload_en 与 cold 逐值相同；loadingOrUnavailable=true（诚实提示在页上）；数值区不是「全 —」
factory_cold_zh   kvCount 18  真值（“生命周期 acquired / 适配器 ocap / 网络 beta”…）；reload 相同

# ?page=operations，新 target 直载，wait 4400ms
operations_cold_en kvCount 5 ["Status ok","Blocklet version 0.3.7","DID did:blocklet:arcblog","Protocol arcblog","Transport afs,mcp"]
                   dashValues=0；reload 相同
operations_cold_zh kvCount 5（“状态 ok …”）；reload 相同
```

即：QA 复测条件下**冷载即有真值，cold == reload**，与 R15 的冷载全 `—` 与 Dev 的 scratch 实验（五通道全空 9.6s）都不一致。

- 可能的解释（**均为推断，未单独取证**）：(a) 重启/首次请求级的抖动，而非页面级；(b) 实验页（scratch）与真实页的绑定路径不同；(c) 时序在 4.4s 内已完成，9.6s 观测窗口内反而因某次重渲染清空。
- 因此不能据 QA 这次复测断言「平台首屏必然有值」，也**不能**把「平台无法保证首屏有值」无条件写成平台事实；应写成「首载时序在特定条件（daemon 冷启动 / 首请求）下可能为空」并附复现条件。

## 影响范围

- 若按现结论落 `arc-contracts.md`：后续实现者会据此认为「冷载不可修」而放弃排查，或把诚实提示当成永久补偿。
- 诚实呈现（`factory.render-timing` / `operations.render-timing`）本身**不阻断、不误导**（措辞为「can read / 可能显示」，并给了操作指引），故本条不否定 BUG-036 的收口。
- 数据后果：无。

## 疑似文件 / 待更正材料

- Dev 回报第 ⑥ 条（scratch 页 `probe036` 五通道 9.6s 全空）与 `docs/team/journal/round-22.md` 拟交 Lead 的平台边界条目
- 复现条件待补：**daemon 重启后的首个 `/instance` 读**（本轮 QA 未做，避免打断会话）
