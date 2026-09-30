# BUG-043: `node/factories.json` 在 `adapter:"ocap"` 头部下混入 mock 事实（`nodes.hub`）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-043 |
| 严重级 | **P2**（公开可读投影里的**真实性**问题：模拟事实与真链事实同文件、同头部；L-R17-4「mock/manual 绝不可声称链上已验证」） |
| 发现轮次 | round-17（Dev `task-70` 于 REQ-021 §9.5 首次观察并请 QA 编号；QA `task-71` 独立复核 + 补影响面） |
| 关联 REQ | **范围外（既有，非本轮引入）**；REQ-021 §9.5 / §12.3 U5；`arc-contracts` 候选 #11 |
| 状态 | 待裁决 |

## 复现命令与最小步骤

1. 前置：daemon 在跑；`node/factories.json` 已由历史 factory 流程写入。
2. 只读记录并比对头部 `adapter` 与每个节点的字段形态。

```bash
# 最小复现（只读 AFS）
cd /Users/shenxiuqiang/workspace/ArcBlog
node -e '
import("./scripts/lib/arc.mjs").then(({readJson})=>{
  const f=readJson("/instance/app/arcblog/node/factories.json","").value;
  console.log("header adapter:", f.adapter, "| network:", f.network);
  for (const [role,n] of Object.entries(f.nodes||{}))
    console.log(role, "owner=",n.owner, "assetId=",n.assetId, "acquireTx=",n.acquireTx);
});'
```

（QA 原文输出：`docs/team/test-reports/raw/REQ-021-qa-afs-audit.json`。）

## 期望

`node/factories.json` 是**公开投影**（guest 可读，见 CLAUDE.md「Content model and storage split」），页面 `?page=factory` 的文案把它描述为「链上公开值（地址与交易哈希）」（`.aup/pages/ops/factory.aup:40`）。因此文件里的每条 `*Tx`／`owner`／`assetId` 都应当**可回溯到真实链事实**；若某节点是 mock/manual 产物，必须能被读者区分（`adapter` 字段逐节点标注，或明确标为 simulation/operator-declared），**不得**在文件头统一写 `adapter:"ocap"` 而让模拟值看起来像链上值。

## 实际

同一文件里**头部声明 `adapter: "ocap"` / `network: "beta"`**，`nodes.studio` 四个哈希可在 beta 链上查验（QA 已用 `getTx` 全部命中），但 **`nodes.hub` 是 mock 残留**：

- `owner: "0xhubowner"`、`assetId: "0xa5ed65ce34c5c62da786bdbc10efb57ebacd2f4"`、`acquireTx: "0xte32482c95fb67c26b0834619c44ac321b5428e"`（非十六进制哈希、链上 `getTx` 返回 `{code:"OK",info:null}`）；
- `config/roles.json` 的 fixture 侧同样残留 `hub.collectionAddress:"0xHubCollection"`、`hub.lifecycle.assetId:"0xa5ed…"`（同源 mock 流程）。

**当前影响面（QA 补测）**：`?page=factory` **只渲染 `nodes.studio`** 的字段（QA `grep -n "nodes.hub" .aup/pages/ .web/` → 无命中；页面只引用 `${state.summary.nodes.studio.*}`），因此**今天没有页面把 hub 的 mock 值当链上值展示**；风险在于**该文件是公开接口**，任何按文件头 `adapter` 决定「是否查链/是否可信」的消费者（未来的 CLI、对账、外部 agent 读取）都会把 mock 当成链上事实。

## 证据输出

```text
$ node -e '…readJson("/instance/app/arcblog/node/factories.json")…'
factories.json updatedAt = 2026-09-27T08:34:45.194Z ; adapter = "ocap" ; network = "beta"
nodes.studio = {"state":"acquired","assetId":"zjdkuSoywKFkqiGa8c2NJsBhtLnd2tMRjXas",
                "stakeAddress":"zrjkV7pGytzgKst8SoYEtfZ6hHXzVoyPQue5",
                "owner":"z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a",
                "acquireTx":"ABDBD742C055E3574261DE8FD4C1EEDBEE7DC34CC4C77AF4B50279BFAC50B70D", …}
nodes.hub    = {"state":"acquired","assetId":"0xa5ed65ce34c5c62da786bdbc10efb57ebacd2f4",
                "stakeAddress":"","owner":"0xhubowner","endpoint":"https://hub.example.com",
                "acquireTx":"0xte32482c95fb67c26b0834619c44ac321b5428e","stakeTx":"","acquireAt":"2026-09-27T06:42:22.125Z"}

# 链上核验（只读 getTx）：studio 的 hash 命中、hub 的 hash 不存在
studio.acquireTx  → code=OK infoIsNull=False
hub.acquireTx("0xte32482c…") → code=OK infoIsNull=True

# 页面侧（静态复核）：只渲染 studio
$ grep -rn "nodes.hub" .aup/pages/ .web/     → （无命中）
$ grep -n  "summary.nodes.studio" .aup/pages/ops/factory.aup | wc -l
6
```

退出码：0（完整原文见 `raw/REQ-021-qa-afs-audit.json`、`raw/REQ-021-qa-gettx.json`）

## 影响范围

- 受影响角色：guest（该记录公开可读）、外部消费者 / 未来的对账与 CLI、admin（读同一投影的 console）
- 受影响链路：链事实投影 / 对账（REQ-021 A11）；**今天不影响任何渲染页面**
- 数据后果：只读复现；记录本身由历史 factory 流程写入（成因未定位 → REQ-021 U5）
- 可绕过：是 —— 以**逐条链上核验**取代「按文件头 adapter 决定是否查链」（Dev 在 `arc-contracts` 候选 #11 给出的口径正确）

## 疑似文件

- `/instance/app/arcblog/node/factories.json`（AFS 记录，**非仓库文件**）
- `scripts/arcblog-factory.mjs:69`（写 `NODE_FACTORY_SUMMARY_PATH`）
- `scripts/arcblog-node-nft.mjs:92`（同上；hub 的 mock 值来源需读 `config/chain-intents` 历史，属阶段二/QA 取证）
- `/instance/app/arcblog/config/roles.json`（同源 mock fixture；见 backlog **F-3**）
- `.aup/pages/ops/factory.aup:40`（把该投影描述为「链上公开值」的文案）

> QA 不修改上述任何文件。修法建议（属阶段二）：① 每次写入投影时**逐节点**记录 `adapter`，或把 mock/manual 值移入独立的 simulation 段；② 页面/CLI 显示时按**逐条链上核验**标注「未上链 / 待验证」，而不是按文件头；③ 定位并清理 hub 的 mock 残留（需 Lead 授权 + `.gate-lock`）。
