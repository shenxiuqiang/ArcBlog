# BUG-036: 冷启动首载时 `?page=factory` / `?page=operations` 的 propBind 数值全部渲染为平台空值 `—`（reload 后恢复）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-036 |
| 严重级 | **P2**（体验/展示；数据未丢、reload 即恢复；但会让「记录为空」被误判） |
| 发现轮次 | round-15（QA `task-63` 独立验证 REQ-024 A0 数据前提时发现） |
| 范围 | **本轮范围外 / 既有**（`?page=operations` 本轮未改；`factory.aup` 的 `value="${state.x}"` 写法不是本轮引入；本轮 REQ-024 未改这个渲染模式） |
| 关联 | REQ-024 §3.1 A0「数据前提」、REQ-024 §3.3 A2「记录里不存在的字段不得凭空出现」、[round-15 报告](../test-reports/round-15.md) §2.3/§5 |
| 状态 | 待 PM 裁决（新立 REQ 或折进 R16） |

## 环境与前提

- `http://arcblog.localhost:4939`，共享调试 Chrome `:9333`，**新浏览器上下文**（`Target.createBrowserContext`）+ 只读复制既有标签页的 `login_token`。
- 实例记录**非空**（QA 用 `arc afs exec /blocklets/arcblog/.actions/read` 直接读证）：
  `node/factories.json` = `adapter: ocap` / `network: beta` / `nodes.studio.moniker = "ArcBlogStudioNode #5"` / `state = acquired`；`updatedAt 2026-09-27T08:34:45.557Z`。

## 复现命令与最小步骤

```bash
# 探针（QA 本轮用，等价步骤见下；输出落盘 /tmp/qa-r15-cold.mjs 的 stdout）
node /tmp/qa-r15-cold.mjs
```

等价的纯手工步骤（任一浏览器）：

1. **新开一个浏览器上下文/隐私窗口**（关键：不能复用已访问过本站的标签页），带上登录态。
2. 直接访问 `http://arcblog.localhost:4939/?page=factory`，等 9 秒。
3. 观察 NFT 卡 / 工厂卡 / 链卡 → **每一项值都是 `—`**。
4. 在同一标签页 **刷新（F5 / `Page.reload`）** → 全部值出现。

同理 `?page=operations`（新上下文 → 直接访问）。

## 期望

记录里存在 `adapter=ocap` / `network=beta` / `moniker=ArcBlogStudioNode #5` 等值，页面（`propBind={summary: "/instance/app/arcblog/node/factories.json"}`）应当渲染这些值；空值才走平台占位 `—`。

## 实际（QA 原始输出）

```text
$ node /tmp/qa-r15-cold.mjs            # 每个 URL 都用「新上下文 + 直载」与「同页 reload」各测一次，wait 4.2s
COLD   /?page=factory   {"nodeKv":"NFT — 生命周期 —","chain":"适配器 — 网络 —","studio":"标识 — 每个节点质押 —","hub":"标识 — 容量（Studio 数） —"}
RELOAD /?page=factory   {"nodeKv":"NFT ArcBlogStudioNode #5 生命周期 acquired 端点 https://arcblog.localhost 区域 CN-BJ","chain":"适配器 ocap 网络 beta","studio":"标识 ArcBlogStudioNode 每个节点质押 1","hub":"标识 ArcBlogHubNode 容量（Studio 数） 1000"}

COLD   /?page=operations {"kvRows":5,"emptyRows":5,"sample":["状态 —","Blocklet 版本 —","DID —","协议 —","传输 —"]}
RELOAD /?page=operations {"kvRows":5,"emptyRows":0,"sample":["状态 ok","Blocklet 版本 0.3.7","DID did:blocklet:arcblog","协议 arcblog","传输 afs,mcp"]}

# 对照组（同一冷启动条件下 cold 与 reload 逐值相同 ⇒ 不是通用渲染问题）
COLD/RELOAD /?page=diagnostics  相等（29 行，3 行真为空）
COLD/RELOAD /?page=general      相等（0 行 kv）
COLD/RELOAD /?page=hub          相等（29 行，8 行真为空）
COLD/RELOAD /?page=orders       相等（35 行，9 行真为空）
```

补充观测（同一现象的另一面）：`?page=factory` 冷载时**点开「高级 / 技术详情」后**，高级区块内的值却是**真实值**（`Asset address zjdkuSoywKFkqiGa8c2NJsBhtLnd2tMRjXas`、`Chain host https://beta.abtnetwork.io/api/` …）。即同一份 `state.summary`，默认卡片停在 `—`，展开（触发子树重渲染）后才有值。

## 影响范围

- 首次访问/新会话进入 `?page=factory`：NFT/lifecycle/moniker/stake/capacity/adapter/network 全部显示 `—`，与页脚文案「读自 node/factories.json」矛盾；用户需刷新一次才看到真实数据。
- **对验证口径的影响**：任何在这一页做 A0 探针 / 截图 / 溢出结论的人都可能把「记录为空」当成数据前提。QA 本轮的四组结论是在**热会话**（同 tab 已加载过 console 页）下取的，与 Dev 自报一致；冷启动下默认卡片字段消失（`hideWhenEmpty`），BUG-035 的既有溢出项因此只会在热会话的展开态复现——QA 已在展开态逐项复测（见 round-15 报告 §4.3），结论不受影响。
- 非安全问题、非数据损坏：直接读 AFS 记录内容正确，`factory spec` / `status` 输出正确。

## 疑似文件（线索，QA 未改）

- `.aup/pages/ops/factory.aup`（默认卡片 `key-value-list fields=[{… value: "${state.summary.…}"}]` 与 `propBind` 的组合）
- `.aup/pages/ops/operations.aup`（同模式，本轮未改）
- 机制假设（**未证实**）：数组字面量 prop 里的 `${state.x}` 插值在挂载时求值一次，异步 `propBind` 落地后不重算；`visible="${…}"` / `src="${…}"` 这类单值 prop 会重算，所以 SVG/高级区块能拿到值。建议 Dev 用「同一 document 内先 `propBind` 后渲染」的最小实验核验，并把结论写进 `docs/arc-contracts.md`。

## 负面/对照证据

同一冷条件下的 `?page=diagnostics` / `?page=general` / `?page=hub` / `?page=orders` cold 与 reload **逐值相同** → 该现象不是「冷启动所有页面都空」，而是上述两页特有的绑定时序问题。
