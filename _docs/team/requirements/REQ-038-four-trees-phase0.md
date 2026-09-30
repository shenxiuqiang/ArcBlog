# REQ-038 — §83「用户数据」其余树（`/user/{drafts,private,preferences,agent,payment}`）阶段 0 只读探针

> **REQ 编号**：REQ-038 ｜ **对应 spec 章节**：**§83「用户数据」**（旁证 **§5.2「User Data Space」**、**§84–§86「Public / Private / Paid Content」**、**§11 Capability**、**§61 Agent 授权**、**§91–§92 账本**、**§154.5/§154.6 数据层不变式 I1–I3**）｜ **checklist 行**：**`:61`**（`DID Space 用户数据`，现状 ✅ 但备注已登记缺口①「§83 五棵树只落 1 个面」）｜ **优先级**：**B 类（需批准项）** —— 一次一棵、不打包；**新 schema / 新页面 / 新授权语义都要批准**（§7）｜ **提出轮次**：**R27**（承继 `journal/round-26.md` §5 第 2 项「§83 其余四棵树（一次一棵）」；历史归属 = REQ-028 §2.1 主动裁剪 → backlog `R16-轮末③`/`R17-14`/`R18-7`…）｜ **角色**：研究员（**并行 lane I+L，只读、docs-only**）｜ **状态**：✅ **阶段 0 探针已交付**；P1–P4 与 arc-contracts 候选**待 Lead / 用户批准**（§7/§8）
> **写范围**：**仅本文件**（`docs/team/requirements/REQ-038-four-trees-phase0.md`）。**新增文件，本仓此前不存在**；未改 spec、未改 `.aup/**`、未改 `scripts/**`、未改 `world/**`、未改 `blocklet.yaml`、未改 `docs/arc-contracts.md`。
> **结论性质声明（QA 纪律）**：每条「✅ 已验证」都附**真实命令 + 真实原始输出**（§10 附录逐条可复跑）。凡本次做不到的，一律写「**受限未验证 + 原因**」（§9）。**不臆造 ARC API**（spec §150）；spec 引用一律**逐字摘录**并标行号。
> **纪律**：零实现、**零实例写入**、零临时记录、**未启第二台 daemon**、**未跑 `npm test` / `npm run build` / `arc dsl generate` / `arc dsl validate` / 全量 `test:live`**（本路线明确禁止）。全部 AFS 命令只有 `ls` / `read` 两种形态。`docs/team/.gate-lock` **未建立**。

---

## 0. 结论摘要（TL;DR）

| 问题 | 判定 | 一句话结论 |
| --- | --- | --- |
| ① spec §83 要求什么 | ✅ **已逐字摘录** | `/user` 下 **五棵**树：`drafts` / `private` / `preferences` / `agent` / `payment`；**「用户登出以后 `/user` 不可见」**。旁证 §5.2 列出 8 类用户数据（Drafts / Private posts / Personal settings / Private media / Agent permissions / Private subscriptions / Personal payment records / User preferences） |
| ② 本仓今天有哪些 AFS 树 | ✅ **已实测** | **instance 面 20 个声明集合**（`blocklet.yaml:160-286`，20 条 `replicated` + 20 条 `networkRead`）；**user 面只有 1 条路径被真正用过**：`/user/arcblog/bookmarks/hello-arcblog.json`（三视图指向同一份，§3.2）；**`world/*.yaml` 22 个 schema，其中唯一 user-scope = `world/bookmark.yaml`**（`grep -ln "user/" world/*.yaml` 只有它） |
| ③ 「其余四棵树」这个口径对不对 | ⚠️ **不对，应更正为「五棵树 / 一棵都没落」** | REQ-028 §7.3 原文：*「§83 的 `/user/{drafts,private,preferences,agent,payment}` **五棵树只落地 1 个面**（阅读清单）。其余四棵**不是平台不支持**」*；backlog `R16 轮末③` 把它写成「**四棵**未落地 `/user` 树（`drafts/private/preferences/agent/payment`）」——**五个名字配「四棵」**。真正的 1 个面是 **`bookmarks`（§83 未列出的第 6 条路径）** ⇒ **五棵树一棵都没落**（§3.5） |
| ④ 每棵树能不能做 | ✅ **五棵都能做**（通道已被 `bookmarks` 验证），**难度与风险差别极大** | **写**：页面 `exec "/.actions/write"` + `path:"/user/arcblog/<tree>/…json"`（`saved.aup:64` 同形）+ CLI 按 DID 寻址 `/blocklets/arcblog/users/<did>/arcblog/<tree>/`（`arcblog-bookmarks.mjs:39-46`）。**读**：页面 `afs-list from "/user/arcblog/<tree>"`（`saved.aup:41` 同形）+ CLI 按 DID。**权限：`blocklet.yaml` 零改动**（session 授权，`replicated` 无 user-scope 形态）。**真正的成本 = schema + 页面 + 职责/安全边界**：`preferences` 最低、`private`/`drafts` 中、**`agent` 与 `payment` 是安全/经济决策（必须批准）** |
| ⑤ 页数会不会破 21 | ✅ **可以不破** | 五棵树都可折叠进**读者页 `?page=saved`**（实测：它不是绑定路由、无侧栏、已 gate `$session.authenticated`）或既有控制台页的只读区 ⇒ **21 页保持**；若某棵树必须新页 ⇒ **列为批准点 A3，不在本 REQ 直接做** |

**三条给 Lead 的立刻可用结论**：

1. **`/user` 是一条「不需要动权限表的私有树」**：实测 `blocklet.yaml` 有 **20 条 `replicated` + 20 条 `networkRead`，其中 user-scope 条目 = 0**（`/user` 不在任何一条里），而 `saved.aup` 依然能写 `/user/arcblog/bookmarks/…`。`arc-contracts §4.2(2)` 已给出机制：*「隔离由 session 作用域本身保证，不需要任何 `blocklet.yaml` 声明」*、*「`replicated` 没有 user-scope 的 canonical 形态，而授权来自 session —— 所以『为了用 `/user` 去放宽权限表』是错误做法」*。⇒ **五棵树的权限影响一律是「零 `blocklet.yaml` 改动」**；真正的权限问题在**语义层**（谁能写、运行时谁来读）。
2. **`agent` 树是本批唯一会改变授权语义的一棵**：今天 agent 授权记录在 `config/agent-grants/<didHash>.json`（admin-only，`blocklet.yaml:211-221` 的 `config` 整树 admin）。把它放进**调用者自己的** `/user/agent` 意味着「授权记录由被授权方的作用域承载」——在写路径上是页面按钮，在**消费侧**是 runtime `/mcp` / `arcblog-agent.mjs` 的读取顺序。这不是「加一棵树」，而是**一次授权边界变更**，必须单独批准（A4）。
3. **`payment` 树只能是派生投影，不能是真源**：spec §154.6 的不变式（`I2` 可单命令全量重建、`I3` 派生读模型**不得参与授权判定**；`journal/round-22.md` 已固化「链上=资金权威、AFS=意图权威」）⇒ `/user/payment` 必须是**从 `economy/orders|settlements|ledger` 派生**、可重建、缺哈希时**不得声称已支付**（`arc-contracts §29.4`：toast 不是证据；R21 对账四态）。若做成「支付时双写」，就会与账本的确定性 id（`<orderId>:<type>`）产生第二个真源。

---

## 1. 方法与纪律

### 1.1 daemon 基线（**未启第二台**，只读）

```console
$ arc service list
  ▄▀█ █▀█ █▀▀  Agentic Realm Computer
  █▀█ █▀▄ █▄▄  v2.0.0-beta.50 (c711b9aa) · 2026-09-10
NAME          ID                PORT   STATUS   HOME                          SOURCES
default       37a8eec1ce19687d  4939   up       /Users/shenxiuqiang           2
probe         ba9c736f19e7f60b  4942*  stopped  /Users/shenxiuqiang/.afs-probe 4
```

### 1.2 本路线**不做**的事（如实登记）

| 未做 | 原因 |
| --- | --- |
| `npm test` / `npm run build` / `arc dsl validate` / `arc dsl generate` / 全量 `test:live` | 本路线任务书**明确禁止** |
| 任何写入（`.aup/**` / `scripts/**` / `world/**` / `blocklet.yaml` / 实例） | docs-only；AFS 只有 `ls` / `read` |
| 第二台 daemon | 任务书禁止 |
| 浏览器 / CDP（`/user` 页面侧的 404 与隔离复核） | 本路线零浏览器；`/user` 隔离结论引 `arc-contracts §4.2` 的既有实测（REQ-028 + QA-012），本次只复核 **AFS 三视图** |
| `arc space sync` / `--mirror` / `rm` | 写路径（REQ-028 已裁定只 dry-run） |

### 1.3 探针登记与残留

* 探针 = `arc afs ls`（含 `--depth 2`）、`arc afs read`、`grep`/`wc`/`python3` 静态统计、`ls ~/.afs/spaces/...`（只读磁盘视图，用于 §3.2 的第三视图）。
* **测量快照**：**2026-09-29T06:01Z**（CST 14:01），基线 `HEAD = 4d9e0e7`，daemon `2.0.0-beta.50 (c711b9aa)`。本批为**并行批次**：同仓另有 lane 在改 `.aup/locales/**` / `.aup/pages/{admin/general,ops/hub}.aup` / `scripts/arcblog-ui-budget*`（**非本 lane 写入**）⇒ 实例条目数（§3.1）与 `--check` pages 21（§6）属该时刻快照。
* **零写入、零临时记录**。未在 `/user` 或 `/instance` 建任何东西；本 REQ **未产生任何临时文件**（无 `/tmp` 产物）。
* 仓库工作树：**本 lane 只新增本文件**；`git status --short` 里另有 6 个并行 lane 的改动（`.aup/locales/{en,zh}.json`、`.aup/pages/admin/general.aup`、`.aup/pages/ops/hub.aup`、`scripts/arcblog-ui-budget.mjs`、`scripts/arcblog-ui-budget.test.mjs`）与 2 个历史未跟踪文件 —— **均非本 lane 产物**。

---

## 2. spec §83 逐字摘录（不改 spec；§5.2 旁证）

### 2.1 §83「用户数据」（`docs/ArcBlog-product-technical-spec.md:3190-3211`，**全文**）

````text
# 83. 用户数据

例如：

```text
/user
├── drafts
├── private
├── preferences
├── agent
└── payment
```

用户登出以后：

```text
/user
```

不可见。

---
````

> **注意措辞**：spec 用「**例如**」引出这五棵树 ⇒ 它是**目标形态**而非封闭枚举；§5.2 的清单（8 类）比它更宽。这给「先落哪棵」留了空间（§5 的排序就是据此）。

### 2.2 §5.2「User Data Space」旁证（`:197-226`，逐字）

````text
## 5.2 User Data Space

用户自己的数据属于用户 DID 作用域。

包括：

* Drafts
* Private posts
* Personal settings
* Private media
* Agent permissions
* Private subscriptions
* Personal payment records
* User preferences

ARC 当前 session 可以根据调用者身份形成 `/user`、`/tmp`、可选 `/space` 等视图；不能简单把 DID 当成路径字符串，也不能把 Data Space 当成一个独立 SDK。

因此 ArcBlog 应该遵循：

```text
Public Node Data
        │
        └── Instance

Private User Data
        │
        └── DID Space
```
````

### 2.3 相关访问模型（§85 / §86，逐字）

```text
# 85. Private Content
私有内容：
DID Space + Identity + Session
访问控制：
Caller ↓ DID ↓ Capability ↓ AFS access ↓ Content

# 86. Paid Content
付费内容增加：Payment Proof
最终：Caller ↓ DID ↓ Payment Proof ↓ Access Grant ↓ AFS Resource
这比在前端写：if (paid) showContent 安全得多。
```

⇒ **`private` 树不是「再加一个目录」，而是 §85 的访问链在用户作用域的落点**：`Caller → DID → Capability → AFS access → Content`。今天这条链的「Capability → AFS access」在用户作用域上**只有 session 一档**（§3.3 / §4.2）。

---

## 3. 盘点：本仓今天的 AFS 树

### 3.1 instance 面（根作用域看不见，必须走 blocklet 小世界）

```console
$ arc afs ls /instance/app/arcblog
ERROR: No data found for path: /instance/app/arcblog
exit=0
$ arc afs ls /blocklets/arcblog/instance/app/arcblog
/blocklets/arcblog/instance/app/arcblog/.provenance
/blocklets/arcblog/instance/app/arcblog/categories
/blocklets/arcblog/instance/app/arcblog/config
/blocklets/arcblog/instance/app/arcblog/drafts
/blocklets/arcblog/instance/app/arcblog/economy
/blocklets/arcblog/instance/app/arcblog/heroes
/blocklets/arcblog/instance/app/arcblog/hub
/blocklets/arcblog/instance/app/arcblog/node
/blocklets/arcblog/instance/app/arcblog/posts
/blocklets/arcblog/instance/app/arcblog/tags
```

（与 `CLAUDE.md` 的既有结论一致：*「root-scope `arc afs ls` cannot see `/instance/...`」*；`paid` / `pages` / `page-drafts` / `media` **不出现在这个列表里**——`arc afs ls` 只列已物化/有内容的目录，这四个今天的条目数都是 0，故不能据此断言「目录一定不存在」，只能断言「今天没有记录」。）

逐集合条目数（`arc afs ls`，**含 live 测试残渣**，仅作量级参考）：

```console
$ for d in posts drafts paid heroes node categories tags media config economy/policies economy/products economy/orders economy/settlements economy/ledger economy/access-grants economy/refunds economy/attributions pages page-drafts hub; do n=$(arc afs ls "/blocklets/arcblog/instance/app/arcblog/$d" 2>/dev/null | grep -c .); printf "%-28s %s\n" "$d" "$n"; done
posts                        3
drafts                       46
paid                         0
heroes                       2
node                         37
categories                   3
tags                         2
media                        0
config                       145
economy/policies             1
economy/products             84
economy/orders               102
economy/settlements          55
economy/ledger               124
economy/access-grants        44
economy/refunds              9
economy/attributions         0
pages                        0
page-drafts                  0
hub                          2
```

⇒ **与五棵树「最近的东西」全在 instance 面**：`drafts/`（46）、`economy/orders`（102）/`settlements`（55）/`ledger`（124）/`access-grants`（44）、`config/`（145，含 `agent-grants`）、`paid/`（0）。这些**都是节点级、admin-only 管理面**，不是「用户自己的数据」（例外见 §4.1 的 `drafts` 辨析）。

### 3.2 user 面（今天的全部内容）

```console
$ arc afs ls /blocklets/arcblog/users
/blocklets/arcblog/users/z3hzvf2CyM1pb63TCMnFpDTeif8dJ4RykBkbP
$ arc afs ls /blocklets/arcblog/users/z3hzvf2CyM1pb63TCMnFpDTeif8dJ4RykBkbP/arcblog
/blocklets/arcblog/users/z3hzvf2CyM1pb63TCMnFpDTeif8dJ4RykBkbP/arcblog/bookmarks
$ arc afs ls /blocklets/arcblog/users/z3hzvf2CyM1pb63TCMnFpDTeif8dJ4RykBkbP/arcblog/bookmarks
/blocklets/arcblog/users/z3hzvf2CyM1pb63TCMnFpDTeif8dJ4RykBkbP/arcblog/bookmarks/hello-arcblog.json
$ arc afs read /blocklets/arcblog/users/z3hzvf2CyM1pb63TCMnFpDTeif8dJ4RykBkbP/arcblog/bookmarks/hello-arcblog.json
{
  "slug": "hello-arcblog",
  "title": "Hello ArcBlog",
  "addedAt": "2026-09-28T11:57:56.880Z"
}
```

**第三视图（磁盘） = 同一份数据**：

```console
$ find ~/.afs/spaces/z3hzvf2CyM1pb63TCMnFpDTeif8dJ4RykBkbP/blocklets/arcblog/user -type f
…/blocklets/arcblog/user/arcblog-probe/x.json            ← 2026-09-20 的旧残留（已登记，非本批产物）
…/blocklets/arcblog/user/arcblog/bookmarks/hello-arcblog.json
$ cat …/user/arcblog/bookmarks/hello-arcblog.json
{
  "slug": "hello-arcblog",
  "title": "Hello ArcBlog",
  "addedAt": "2026-09-28T11:57:56.880Z"
}
```

⇒ **三视图同源**（`/user/...` ≡ `/blocklets/arcblog/users/<did>/...` ≡ `~/.afs/spaces/<did>/blocklets/arcblog/user/...`），与 `arc-contracts §4.2(1)` 逐字一致。

**结论：`/user` 下今天只有 `arcblog/bookmarks`（+ 一个 2026-09-20 的 `arcblog-probe` 残留）——§83 的五棵树一棵都没有。**

### 3.3 `blocklet.yaml` 权限表（`replicated` + `networkRead`）

```console
$ python3 - <<'EOF'
import re
s=open('blocklet.yaml').read()
rep=s.split('replicated:',1)[1]
cols=re.findall(r'^  ([a-z][a-z0-9-]*):$', rep, re.M)
nr=s.split('networkRead:',1)[1].split('replicated:',1)[0]
paths=re.findall(r'- path: (\S+)\n\s+role: (\S+)', nr)
print('replicated collections:',len(cols)); print(cols)
print('networkRead entries:',len(paths))
print('user-scope entries:', [p for p,_ in paths if '/user' in p] or 'NONE')
print('user in replicated:', 'user' in cols)
EOF
replicated collections: 20
['posts','drafts','paid','heroes','node','categories','tags','media','config','economy-policy','economy-products','economy-orders','economy-settlements','economy-ledger','economy-access-grants','economy-refunds','economy-attributions','pages','page-drafts','hub']
networkRead entries: 20
user-scope entries: NONE
user in replicated: False
```

* **20 条 `replicated`（每条 `copy: none` + `minRole: admin`，`readRole` guest 6 条 / admin 14 条）**、**20 条 `networkRead`**（均落在 `/instance/app/arcblog/**`）；**没有任何 user-scope 条目**。
* 机制依据（`arc-contracts §4.2(2)`，逐字）：*「隔离由 session 作用域本身保证，不需要任何 `blocklet.yaml` 声明：同一个路径字符串对不同 DID 解析成**不同目录**……**`blocklet.yaml` 零改动**（`replicated` 没有 user-scope 的 canonical 形态，而授权来自 session）——所以「为了用 `/user` 去放宽权限表」是错误做法」*。
* **反例警告**（同节 `(3)` 第 2 条）：*「平台只有 guest / admin 两档角色……因此**不要**把 `networkRead` 前缀挂在私有父路径上给 guest」*。

### 3.4 `world/*.yaml`（记录 schema）

```console
$ ls -1 world/*.yaml | wc -l
22
$ grep -ln "user/" world/*.yaml
world/bookmark.yaml
```

22 个 schema：`access-grant` / `agent-grant` / **`bookmark`** / `category` / `content-index` / `discovery-context` / `discovery-document` / `hub-registration` / `ledger-entry` / `media` / `node-health` / `node-identity` / `node` / `order` / `page` / `post` / `product` / `refund` / `role-config` / `settlement-policy` / `settlement` / `trusted-hub`。

`world/bookmark.yaml`（唯一的 user-scope 范式，逐字）：

```yaml
kind: Bookmark
fields:
  slug: string
  title: string
  addedAt: datetime
# REQ-028 pilot: a reader's private reading list.
# … Storage is the caller-scoped DID Space user fragment (measured, ARC 2.0.0-beta.50):
#   /user/arcblog/bookmarks/<slug>.json                          (session view)
#   /blocklets/arcblog/users/<did>/arcblog/bookmarks/<slug>.json (same directory, root AFS view)
# Authorization comes from the SESSION, not from blocklet.yaml: `/user` is the
# caller's own projection, so there is no `replicated` collection to declare and
# nothing to widen. …
# Written by: the `?page=saved` form (exec /.actions/write) and
# `node scripts/arcblog-bookmarks.mjs add --user <did> --slug <slug>`.
```

> ⚠️ **文档漂移（顺手登记）**：checklist `:59` 写「`world/*.yaml` **21** 个 schema（`ls world/*.yaml | wc -l`）」，**实测 22**（R16 加的 `bookmark.yaml` 未回填）。本 REQ 只登记，不改 checklist（非本路线写范围）。

### 3.5 口径更正：「四棵树」还是「五棵树」

| 来源 | 原文 | 问题 |
| --- | --- | --- |
| spec §83（`:3194-3201`） | `/user ├── drafts ├── private ├── preferences ├── agent └── payment` | **五棵** |
| REQ-028 §7.3（`:301`） | *「§83 的 `/user/{drafts,private,preferences,agent,payment}` **五棵树只落地 1 个面**（阅读清单）。**其余四棵**不是平台不支持，是 REQ §2.1「只做一个试点」的主动范围裁剪」* | 同一句里 **五个名字 + 「其余四棵」**；落地的 1 个面是 **`bookmarks`**（§83 **未列出**的第 6 条路径） |
| checklist `:61` 备注① | *「§83 **五棵树**只落 1 个面（drafts/private/preferences/agent/payment **未落地**，属主动裁剪非平台不支持）」* | 与 REQ-028 同源 |
| backlog `R16 轮末③` | *「REQ-028 的**四棵**未落地 `/user` 树（`drafts/private/preferences/agent/payment`）」* | **五个名字配「四棵」** |
| backlog `R18-7` / checklist `:131` 之外的多处 | 「§83 其余四棵树」 | 沿用的简称 |

**更正后的账（建议 Lead 采用）**：

* **应落地的 = 5 棵**（`drafts` / `private` / `preferences` / `agent` / `payment`），**今天 0 棵落地**；
* **已落地的 = 1 个面**：`/user/arcblog/bookmarks`（`?page=saved` 阅读清单，REQ-028 试点）——它**不在 §83 的五棵里**，属 §5.2 清单之外的合理扩展；
* **平台边界 = 无**（`/user` 可达、可隔离、零权限改动，`arc-contracts §4.2`）⇒ 缺的全是**我们没做**（schema / 页面 / 职责决策），**不是平台不支持**；
* 若 Lead 要沿用「四棵」的说法，必须在文档里写清它指哪四个（否则下一个 agent 会按五个名字去找四个实现，或反之）。

---

## 4. 逐棵树：缺什么 / 能不能做（依据）/ 最小实现步骤 / 权限影响 / 验收 / 风险

> **共用事实（对五棵树都成立，后文不重复）**
> * **写入通道（已验证同形）**：页面 `action … events={click: {exec: "/.actions/write", args: {path: "/user/arcblog/<tree>/${args.x}.json", content: {…}}}}` —— 出处 `saved.aup:64`（现网可用，REQ-028 真实点击 + AFS 复核）。`$session.*` 在 `exec` 的 `content` 内**不插值**（`arc-contracts §28.7`）⇒ 需要 did/author 字段时用隐藏输入 + `${args.*}`。
> * **读取通道（已验证同形）**：页面 `afs-list <id> … from "/user/arcblog/<tree>"`（出处 `saved.aup:41`）；CLI 按 DID：`/blocklets/arcblog/users/<did>/arcblog/<tree>/`（出处 `arcblog-bookmarks.mjs:36-46`，`USER_ROOT = '/blocklets/arcblog/users'`）。
> * **CLI 不能直接写 `/user`**：`arc afs ls /user` → `ERROR: No data found`、`arc afs explain /user` → `TYPE unknown`（本次复核；`arc-contracts §4.2(3)` 已详列 `list`/`read`/`write` 的三种失败）⇒ CLI 侧一律按 **DID** 寻址。
> * **logout 语义（spec §83 的最后一句）**：guest 访问 `/user` → `Path not found`，隔离 context 的 DOM 零泄漏（`arc-contracts §4.2(2)` 实测）⇒ **五棵树的「登出后不可见」都由 session 投影天然满足**，不需要我们写任何条件。
> * **权限影响**：**零 `blocklet.yaml` 改动**（§3.3 + §4.2(2)）；**新增 `networkRead`/`replicated` user 条目 = 错误做法**，会破坏隔离叙事。

### 4.1 `/user/drafts` —— 读者自己的草稿

| 维度 | 内容 |
| --- | --- |
| 今天最近的东西 | `/instance/app/arcblog/drafts/*`（**46** 条，admin-only：`networkRead` admin + `replicated.drafts.minRole: admin`、`readRole: admin`）。写路径 = `?page=compose`（`exec /.actions/write` → instance drafts）；读路径 = `?page=posts` 的草稿列表 / `?page=preview`（binding `/preview/{slug}`，绑定 instance `drafts/`）。**这是「节点运营者的草稿」，不是「读者的草稿」** |
| 缺什么（字段） | **无 user-scope schema**；字段可复用 `world/post.yaml` 的子集：`title` / `slug` / `body`(markdown) / `category` / `tags`(json) / `status`(draft) / `createdAt` / `updatedAt`；若保留 `authorDid` 则受 §28.7 限制（要用隐藏输入） |
| 缺什么（权限） | **无缺口**（session 授权）；缺口在**职责**：instance `drafts/` 的 admin 边界（`blocklet.yaml:166-170` + `networkRead:90-91`）**不能**被读者树取代 |
| 缺什么（写路径） | 读者侧**没有**任何作者面（`?page=compose` 是控制台/admin 页）⇒ 需要读者页表单（可折叠进 `?page=saved`） |
| 缺什么（读取面） | 读者预览：`propBind` 支持 `$params.slug`（`propBind={d: "/user/arcblog/drafts/$params.slug.json"}` 的写法**未验证**，但路径本身是 caller-scoped ⇒ 理论可行，U3）；列表：`afs-list from "/user/arcblog/drafts"` |
| **能不能做** | ✅ **能做**（通道同形）；⚠️ **先要一个产品决策**：两份 "drafts" 是否同名共存（A6） |
| 最小实现步骤 | ① `world/user-draft.yaml`（新 schema，A2）；② 页面表单（`?page=saved` 新增「我的草稿」区，或新页 → A3）；③ CLI `scripts/arcblog-user-drafts.mjs`（`list/add/remove --user <did>`，照 `arcblog-bookmarks.mjs` 范式）；④ 可选读者预览入口（`?page=saved` 内切列表） |
| 权限影响 | `replicated`: **0 改动**｜`networkRead`: **0 改动**｜新增 schema：1 个（`.yaml`）｜**新页面 = 需批准**（若折叠则 0） |
| 验收 | ① 页面新增 → `arc afs ls /blocklets/arcblog/users/<did>/arcblog/drafts` 出现该记录；② 换一个 DID 的 `afs-list`/CLI 读不到（跨用户隔离）；③ 登出后 `?page=saved` 的该区不渲染且路径 404；④ CLI `list --user <did>` 与页面行逐条一致；⑤ `world/post.yaml` 的发布校验**不**作用于读者草稿（避免把读者的草稿与节点的发布白名单耦合） |
| 风险 | **中**：① 命名/职责冲突（与 instance drafts 混淆）；② 若让 `?page=compose` 写 `/user`，会破坏「节点草稿是 admin-only」的既有边界 ⇒ **禁止**；③ 大记录（`§44.2 F7`：>~1.8 KB 的记录不进 `where`）⇒ 列表一律用**目录边界**而不是 `filter` |

### 4.2 `/user/private` —— 读者自己的私有内容

| 维度 | 内容 |
| --- | --- |
| 今天最近的东西 | instance `paid/`（**0** 条，admin-only）是**节点售卖的付费正文**；`posts/` 的 `previewOnly` 副本；`economy/access-grants`（44 条，admin-only）是**读者购买产生的授权**。**没有一处是「读者自己的私有内容」** |
| 缺什么（字段） | 无 schema；候选 `world/user-private.yaml`：`slug` / `title` / `body`(markdown) / `visibility`(private) / `tags` / `createdAt` / `updatedAt` |
| 缺什么（权限） | 今天的「私有」是**两档角色**实现（admin-only 目录 / guest 前缀）＋主题投影；用户作用域天然私有（guest 404）⇒ **无需新授权** |
| 缺什么（写路径） | 读者页表单（同上） |
| 缺什么（读取面） | `afs-list from "/user/arcblog/private"`（列表）；单条 `propBind` + `$params.slug`（未验证，U3）；**Markdown 渲染**：平台有 `post-editor` / `afs-preview` / `text format=markdown`（`§25` 的 54 个实现原语里有 `post-editor`/`afs-preview`/`editor`），但**它们的 prop 契约未在用户作用域验证**（U4） |
| **能不能做** | ✅ **能做**（通道同形）；⚠️ 需要「私有内容编辑器」的产品定义（是否允许读者写长文） |
| 最小实现步骤 | ① `world/user-private.yaml`（A2）；② 页面（可复用 `?page=saved` 的一个区）；③ CLI `list/add/remove/show`；④ 可选的 markdown 预览（先探针 `post-editor`/`afs-preview`，U4） |
| 权限影响 | `replicated` 0 / `networkRead` 0｜新增 schema 1｜**不碰 `paid/` 与 `access-grants`**（付费内容链路的既有语义不变） |
| 验收 | ① 记录只在本人 DID 作用域；② 其他 DID 与 guest 不可见（list `[]` / `NOT_FOUND` / `404`）；③ 与付费链路**零交集**（`economy/access-grants` 与 `/user/private` 不互相授权）；④ 长文正文能读回（含 >1.8 KB 的记录，用目录列表而非 `where`） |
| 风险 | **中**：① 与 spec §85 的「Capability → AFS access」混淆——用户作用域今天**只有 session 一档**，不是 Capability 门禁；**不得**在文案里声称「按能力保护」（§4.2/§4.3）；② 大正文字节数 ⇒ `afs-list` 首屏性能与空列表抢焦点（`§28.2`）；③ 私有正文若被误放进 `posts/`（guest 前缀）就是泄漏——需在实现里**只**写 `/user/private` |

### 4.3 `/user/preferences` —— 读者自己的偏好（**最低风险、建议第一棵**）

| 维度 | 内容 |
| --- | --- |
| 今天最近的东西 | `/instance/settings/arcblog/{tone,palette,theme}.json`（`seed/settings/arcblog/*`）；theme bridge 的读路径写死 `SETTINGS_DIR = '/instance/settings/arcblog'`（`.web/components/theme-bridge/script.js:28`）；`config/{general,switches}`（admin-only）。**已有语义钩子**：`theme.json` 的描述逐字写着 *「Interface theme — **anyone can personalize their own**; admins set the default.」*（`scope: "shared"`）——**「每人自己一份」的意图今天没有存储落点** |
| 缺什么（字段） | 无 schema；候选 `world/user-preference.yaml`：`key`（tone/palette/mode/locale）/ `value` / `updatedAt`；或一文件一字段（`/user/arcblog/preferences/theme.json` 等，与既有 settings 记录形状对齐） |
| 缺什么（权限） | 无（session）；**但**要保 admin 的「默认值」语义（instance 设置仍是默认，用户设置是覆盖） |
| 缺什么（写路径） | 读者可见的偏好表单（`?page=saved` 或公共页脚设置入口）；或复用运行时 auto-surface（**平台管理员编辑面**——checklist `:113` 实测：guest 测试身份下显示 "No settings"，且该面未在浏览器验证） |
| 缺什么（读取面） | 若只存不生效：`afs-list` 就够了。若要**生效**：theme bridge 必须读 `/user/preferences` **优先于** instance 设置——`.web/**` 改动 + `window.afs` 对 `/user` 的读/订阅能力（U5，未验证） |
| **能不能做** | ✅ **能做**；建议**拆两步**：P1a「存储 + 只读回显」（今天可做，零 `.web` 风险）；P1b「让 bridge 生效」（需 `.web` 改动 + 一次浏览器探针） |
| 最小实现步骤 | ① `world/user-preference.yaml`（A2）；② `?page=saved` 加偏好区（写 `/user/arcblog/preferences/${args.key}.json`）；③ 只读回显（`afs-list from "/user/arcblog/preferences"`）；④（P1b）改 `theme-bridge/script.js` 的读取顺序 `/user` → instance 回落，并保留 `localStorage['arcblog:theme:v1']` 缓存契约（`arc-contracts §17`） |
| 权限影响 | `replicated` 0 / `networkRead` 0｜新增 schema 1｜**`.web/** 改动（P1b）⇒ UI 线** |
| 验收 | ① 写一条偏好 → 本人读到、换 DID 读不到；② **admin 默认值语义不变**（未设置的用户仍得 instance 值）；③（P1b）设置后刷新仍生效、切页不闪主题（CLAUDE.md 的 `mode` 约束）、`scripts/arcblog-theme.test.mjs` 不回归；④ 与 `config/general`/`config/switches` 的 admin-only 边界不混淆 |
| 风险 | **低**（P1a）/ **中**（P1b）：① bridge 的首屏闪主题是已知敏感点（`mode` 每次导航被运行时写入）；② `/user` 的 `afs.subscribe` 是否可用未验证（U5）；③ 别把用户偏好写回 instance 设置（会让一个读者的选择影响全站） |

### 4.4 `/user/agent` —— Agent 授权记录（**安全敏感，必须批准**）

| 维度 | 内容 |
| --- | --- |
| 今天最近的东西 | `config/agent-grants/<didHash>.json`（**admin-only**，`blocklet.yaml:211-221` 的 `config` 整树 admin；`networkRead` `:120-121` admin）；`world/agent-grant.yaml` 字段 = `agentDid` / `capabilities`(json) / `ttlMinutes` / `grantedAt` / `expiresAt` / `note` / `updatedAt`；消费方 = `scripts/arcblog-agent.mjs`（`check` / `run` / `authorize` / `grants`）+ runtime 提供的 `/mcp`（spec §129/§130） |
| 缺什么（字段） | 无 user-scope schema；字段可沿用 `world/agent-grant.yaml`，但**寻址方式变简单**：`/user/agent/grants/<slug>.json` **不需要 DID 哈希**（caller-scoped），**绕开了 `AUP 无哈希原语` 的限制**（对照 checklist `:118` 的降级登记：`config/agent-grants/<didHash>.json` 页面无法寻址） |
| 缺什么（权限） | **授权边界本身**：今天只有 admin 能写 grant；搬到 `/user` 后**任何已登录调用者都能在自己的作用域写一条** ⇒ 消费侧（`arcblog-agent.mjs` / `/mcp`）必须决定**读哪一份**（operator 的 `config/` vs caller 的 `/user/`），以及 `agent.admin` 仍然不可授予（spec §130） |
| 缺什么（写路径） | 页面按钮（`?page=agents` 是 admin 控制台页；读者侧入口需新页或折叠） |
| 缺什么（读取面） | CLI 按 DID 读 `/blocklets/arcblog/users/<did>/arcblog/agent/...`；runtime `/mcp` 的读取路径**不在本仓控制范围**（platform-provided，U6） |
| **能不能做** | ✅ **通道能做**；🟥 **语义必须批准**（A4）：这是「授权记录由被授权方承载」的边界变更，不是加目录 |
| 最小实现步骤 | ① 决策 A4（是否允许 caller-scoped grants；消费顺序；审计）；② `world/user-agent-grant.yaml`（或复用 `agent-grant`）；③ 页面「我的 Agent 授权」区（写 `/user/arcblog/agent/grants/<slug>.json`）；④ `scripts/arcblog-agent.mjs` 增加 `--user` 读取与**审计留痕**（`arcblog-audit.mjs`）；⑤ fail-closed 负例集（过期 / 撤销 / `agent.admin` / 未知 capability） |
| 权限影响 | `blocklet.yaml` **0 改动**（manifest 层）；但**授权语义**变更（谁可授予）⇒ 必须走安全评审 + 审计；**不得**把 `config` 树改成 guest 可读 |
| 验收 | ① 页面建的 grant **真的**被消费（AFS 前后对比，不以 toast 为准，`arc-contracts §29.4`）；② 跨用户隔离（B 读不到 A 的 grant）；③ 过期即失效；④ `agent.admin` 在任何路径都不可授予；⑤ 审计记录含 Caller DID（spec §62）；⑥ **operator 既有 `config/agent-grants` 路径零回归** |
| 风险 | **高**：越权/自我授权；必须 fail-closed 且默认只读（spec §61）；若做错，等于把「谁能用 Agent」交给任意登录者 |

### 4.5 `/user/payment` —— 读者自己的支付记录（**只能派生，不能成为真源**）

| 维度 | 内容 |
| --- | --- |
| 今天最近的东西 | `economy/orders`（**102**）、`economy/settlements`（**55**）、`economy/ledger`（**124**）、`economy/access-grants`（**44**）、`economy/refunds`（**9**）——**全部 admin-only**；`world/order.yaml` 字段（`id`/`kind`/`buyerDid`/`creatorDid`/`hubDid`/`productId`/`contentId`/`amount`/`asset`/`status`/`paymentAdapter`/`paymentRef`/`paidAt`/`settlementVersion`/`settledAt`/`refundedAt`…）；账本 id 确定性 `<orderId>:<type>`（spec §91–§92） |
| 缺什么（字段） | 无 user-scope schema；候选 `world/user-payment.yaml`：`orderId` / `contentId` / `amount` / `asset` / `status` / `paidAt` / `refundedAt` / `txRef`（**只做投影字段，不含结算内部字段**） |
| 缺什么（权限） | 无 manifest 缺口；缺口在**读模型纪律**：`/user/payment` 必须是**派生**（§154.6 `I2` 可单命令全量重建、`I3` **不得参与授权判定**） |
| 缺什么（写路径） | **不应该由页面写**。正确形态 = CLI `project --user <did>` 从 instance 记录派生（或支付流程的 sidecar 投影，需 A5 决策） |
| 缺什么（读取面） | `afs-list from "/user/arcblog/payment"`（读者「我的购买」）；与 `?page=orders`（会话可见的控制台页，展示买家 DID 等六问字段）**不共享授权**，读者面只投影买家自己的字段 |
| **能不能做** | ✅ **能做（只读投影）**；⚠️ 需决定投影时机与「缺失哈希怎么写」（**绝不伪造**：`arc-contracts §29.4` + R21 对账四态 `verified/mismatch/not-on-chain/no-hash`） |
| 最小实现步骤 | ① 决策 A5（投影 vs 双写；是否允许读者看金额）；② `world/user-payment.yaml`；③ CLI `arcblog-economy.mjs` 增 `project --user <did> [--all]`（从 orders 派生，幂等、可全量重建）；④ `?page=saved` 加「我的购买」只读区；⑤ 负例：未支付/退款/缺哈希三态文案 |
| 权限影响 | `replicated` 0 / `networkRead` 0｜新增 schema 1｜**不动** `economy-orders|settlements|ledger|access-grants` 的 admin 边界 |
| 验收 | ① 投影可从真源**全量重建**（删掉 `/user/payment` 再重建，逐字段一致）；② 投影**不参与**任何授权判定（唯一授权真源仍是 `economy/access-grants`）；③ 缺哈希 → `no-hash`/「未上链待验证」，**不显示「已支付/已确认」**；④ 跨用户隔离；⑤ 与 `?page=orders` 的六问口径一致（只投影买家可见字段） |
| 风险 | **高**：① **双真源**（若支付时双写，账本 append-only + 确定性 id 的语义会被打破）；② 隐私（买家 DID 与金额）；③ 把「声明式 paid」误渲染成「链上已确认」（`journal/round-17`：今天整条链路零链调用，`status:paid` 是 operator-declared） |

---

## 5. 四个分步计划 P1–P4（一次一棵、不打包；含批准点）

> **排序依据**：先做**零语义风险**的（preferences），再做**只增加存储**的（private / drafts），最后做**会改变安全/经济语义**的（agent / payment）。每步独立可交付、独立可回滚。

### P1 —— `preferences`（存储先行；生效第二步）

| 项 | 内容 |
| --- | --- |
| 依赖 | **A2**（新 schema）+ **A3**（落点：折叠 `?page=saved` 还是新页） |
| 分片 | **P1a 存储 + 只读回显**（本批可做）｜**P1b bridge 生效**（需 `.web` 改动 + 浏览器探针，U5） |
| 写范围 | `world/user-preference.yaml`（新）、`.aup/pages/saved.aup`（+ locales）、`scripts/arcblog-user-prefs.mjs`（新，照 bookmarks 范式）；P1b 另加 `.web/components/theme-bridge/script.js` |
| 验收 | 见 §4.3（本人可读、他人不可读、admin 默认语义不变、P1b 不闪主题、theme 门不回归） |
| 回滚 | 删 `/user/arcblog/preferences/` 即回到「无偏好」；P1b 回滚 = 恢复 bridge 的单一 SETTINGS_DIR |

### P2 —— `private`（读者私有内容）

| 项 | 内容 |
| --- | --- |
| 依赖 | **A2** + **A3**；另需 U4（markdown 预览原语探针） |
| 写范围 | `world/user-private.yaml`（新）、`?page=saved` 新区（+ locales）、`scripts/arcblog-user-private.mjs`（新） |
| 验收 | 见 §4.2（跨用户隔离 / 与付费链路零交集 / 长文可读回 / 不写 `posts/`） |
| 回滚 | 删 `/user/arcblog/private/`；无 instance 面改动 |

### P3 —— `drafts`（读者草稿）**先解决职责边界**

| 项 | 内容 |
| --- | --- |
| 依赖 | **A6**（两份 drafts 的边界）+ **A2** + **A3** |
| 写范围 | `world/user-draft.yaml`（新）、读者区（+ locales）、`scripts/arcblog-user-drafts.mjs`（新）；**明确不动** `?page=compose` / instance `drafts/` / `?page=preview` |
| 验收 | 见 §4.1（页面写 → AFS 出现；跨 DID 不可见；**instance drafts 的 admin-only 边界零回归**；CLI 与页面逐条一致） |
| 回滚 | 删 `/user/arcblog/drafts/`；`?page=compose`/`preview` 从未改动 ⇒ 零回归 |

### P4 —— `agent`（**安全评审**）+ `payment`（**经济/对账口径**）

| 项 | 内容 |
| --- | --- |
| 依赖 | **A4**（agent 授权边界）+ **A5**（payment 投影 vs 双写）+ **A2** + **A3**；两项**各自独立批准**，不互相阻塞 |
| 写范围 | `world/user-agent-grant.yaml` / `world/user-payment.yaml`（新）、读者/授权区、`scripts/arcblog-agent.mjs`（读侧 + 审计）、`scripts/arcblog-economy.mjs`（`project --user`） |
| 验收 | 见 §4.4 / §4.5（真实消费 + 隔离 + 过期失效 + `agent.admin` 不可授予 + 审计；投影可重建 + 不参与授权 + 缺哈希不伪造） |
| 回滚 | 删对应 `/user/arcblog/agent|payment/`；消费侧改动必须**默认关闭**（feature flag 式：只有显式 `--user` 才读用户作用域），保证 operator 路径零回归 |

**建议的批准顺序**：`A1（口径）→ A2/A3（schema + 落点）→ P1 → P2 → A6 → P3 → A4 → A5 → P4`。

---

## 6. 页数约束（**保持 21**）

| 事实 | 实测 |
| --- | --- |
| 控制台页数 | `node scripts/arcblog-console-nav.mjs --check` → `{"ok":true,"action":"check","pages":21}`；`CONSOLE_SECTIONS.length` = 21；21 个页面文件带侧栏（本次复核，与 REQ-037 同一测量） |
| 读者页 `?page=saved` | **不是** `sites[].bindings` 路由（`grep -n saved blocklet.yaml` → 无）；**不带侧栏**（`grep -c "wrapper.nav-group" .aup/pages/saved.aup` = 0）；入口 = 公共页脚链接 `?page=saved`（`.aup/pages/{index,reader}.aup`）；已用 `visible=!$session.authenticated` / `$session.authenticated` 分两态 |

⇒ **五棵树都可以折叠进 `?page=saved`**（它已经是「本人私有数据」页，且不在 21 页的侧栏计数里）**或**既有控制台页的只读区 ⇒ **页数保持 21**。
**若某棵树被判定必须新页**（例如 `private` 需要独立编辑器）⇒ **列为批准点 A3（21→22）**，**不在本 REQ 直接做**；批准后需同步 `CONSOLE_SECTIONS`、`console-nav --check`、UI 预算棘轮与 en/zh 键集门。

---

## 7. 待批准点（**未批准不启动对应计划**）

| # | 批准项 | 决策人 | 选项 | 影响 | 不批准的后果 |
| --- | --- | --- | --- | --- | --- |
| **A1** | **口径**：「五棵树 / 其余四棵」的写法更正 + 顺序（P1→P4） | PM / Lead（H2 文档） | ① 采用本 REQ §3.5 的账；② 维持旧写法但在 REQ 里写清四个名字 | 后续所有 agent 的账目基准 | 「找四个实现五个」的口径漂移继续 |
| **A2** | **新增 user-scope schema**（`world/user-{preference,private,draft,agent-grant,payment}.yaml`，最多 5 个） | Lead（`world/**` 写范围） | ① 一次批齐；② 逐棵批 | `world/*.yaml` 22→27；**零权限影响**（schema 不产生授权） | 每棵树都要临时决定 schema，易漂移 |
| **A3** | **落点**：折叠进 `?page=saved`（**页数保持 21**）还是新页（**21→22**） | 产品 / Lead | ① 全部折叠（推荐）；② `private`/`drafts` 新页；③ 逐棵定 | 页数、侧栏、UI 预算棘轮、`console-nav --check` 判据 | 实现时临时加页 = 悄悄破 21 |
| **A4** | **`agent` 树的授权边界**：是否允许 caller-scoped grants；消费侧读哪一份；审计要求 | **用户 / 安全评审** | ① 不做；② 只做「只读展示本人 grant」；③ 允许 caller 自建（fail-closed + TTL + 审计） | 改变「谁能授予 Agent 能力」 | 擅自实现 = 越权风险 |
| **A5** | **`payment` 树**：派生投影 vs 支付侧双写；读者可见字段范围（是否含金额/哈希） | **产品 / 经济线** | ① 不做；② 只读投影（推荐）；③ 双写 | 真源唯一性 / 对账口径 / 隐私 | 双真源会破坏 §154 I1–I3 与账本语义 |
| **A6** | **`drafts` 与 instance `drafts/` 的边界**：是否允许两套并存；`?page=compose` 是否保持只写 instance | Product / Dev | ① 两套并存（读者树只写 `/user`）；② 不做读者草稿 | 草稿边界（§15.4 的目录边界设计）被误解的风险 | 有人会把 `?page=compose` 改成写 `/user`，破坏 admin-only 边界 |
| **A7** | **`preferences` 是否要求 theme bridge 读 `/user`**（P1b，`.web/**` 改动） | UI / Lead | ① P1a 先上、P1b 另立；② 一起做 | bridge 的首屏闪主题风险 + theme 契约门 | 只存不生效的偏好会被当成「已实现个性化」 |
| **A8** | **`AFS_DID_SPACE_SCOPE_SECRET`**（PB-3：unset ⇒ scope 目录明文）是否在本批处理 | **用户 / 运维**（daemon 环境变量，blocklet 不能设） | ① 作为生产前置登记（维持现状）；② 本轮要求运维开启 | 用户数据在磁盘上是否反标识 | 明文目录会被误当成安全漏洞写进报告（实际是部署前置） |

---

## 8. `arc-contracts.md` 候选条目（**交 Lead 落笔**）

> 编号按任务书「**从 §54 起**」，并与同批的 REQ-037 分工：**REQ-037 = §54–§55**，**本 REQ = §56–§58**。落笔前请复核编号（该文件编号**不单调**，`## 40` 在 `## 33` 之前）：
>
> ```console
> $ grep -n "^## " docs/arc-contracts.md | tail -5
> 2516:## 50. `hub/index` 是**派生**数据：`rebuild` 会全量覆盖
> 2522:## 51. 平台**有**原生调度，但它不在 `arc` 命令面上（R26 实测）
> 2531:## 52. manifest 的 `cron:` 字段**确实存在**（官方样例 + 官方文档双证），但 `arc blocklet check` **不能**作证
> 2542:## 53. 今天生产上在跑的"周期"机制 = 两个长驻 `watch`（结构上不满足 §111 的失败语义）
> $ for n in 54 55 56 57 58 59 60; do printf "## %s: %s  " "$n" "$(grep -c "^## ${n}\." docs/arc-contracts.md)"; done
> ## 54: 0  ## 55: 0  ## 56: 0  ## 57: 0  ## 58: 0  ## 59: 0  ## 60: 0
> ```
>
> ⚠️ **编号冲突申报**：`REQ-036-scheduler-phase0.md §10` 已把 **§54–§55** 列为它自己的候选（**尚未落笔**）；本批 REQ-037 采用 §54–§55 ⇒ **若 Lead 先落 REQ-036 的 §54/§55，REQ-037/REQ-038 的候选整体顺延**（§56–§58 → §58–§60），落笔前务必先跑上面的检查命令。

### §56 候选 —— `/user` 的**小世界寻址面**与「新增子树 = 零 `blocklet.yaml` 改动」（R27 只读复核 + 引 §4.2）

- **三个视图同源**（本次实测 + `§4.2(1)`）：`/user/arcblog/bookmarks/hello-arcblog.json` ≡ `/blocklets/arcblog/users/<did>/arcblog/bookmarks/hello-arcblog.json` ≡ `~/.afs/spaces/<did>/blocklets/arcblog/user/arcblog/bookmarks/hello-arcblog.json`（记录内容逐字一致）。
- **root 作用域看不见实例面**（本次实测）：`arc afs ls /instance/app/arcblog` → `ERROR: No data found for path: /instance/app/arcblog`；必须走 `/blocklets/arcblog/instance/app/arcblog/**`（与 `CLAUDE.md`、`REQ-035 §1.2` 一致）。**但 `/user` 的小世界面是 `/blocklets/<blocklet>/users/<didHash>/…`** —— 这是新增子树时**唯一**可用的 CLI 落点。
- **CLI 无 `/user` 视图**（本次复核 + `§4.2(3)`）：`arc afs ls /user` → `ERROR: No data found`（exit 0）；`arc afs explain /user` → `PATH /user / TYPE unknown / SIDE EFFECTS - none` ⇒ **不是平台不支持 `/user`**，而是 `arc afs` 没有 AUP 会话。
- **权限结论（可复跑的量化证据）**：`blocklet.yaml` 实测 **20 条 `replicated` + 20 条 `networkRead`，user-scope = 0**；而 `?page=saved` 仍能写 `/user/arcblog/bookmarks/…` ⇒ **新增任何 `/user` 子树都不需要权限声明**；**反向禁令**：不要把 `networkRead` 前缀挂到 `/user`（`§4.2(3)` 第 2 条）。
- **用途**：五棵树的可行性判断只需看「schema + 页面 + 职责」，**权限一项恒定为零**；任何要求「先改 `blocklet.yaml` 才能用 `/user`」的方案都是错的。

### §57 候选 —— `world/bookmark.yaml` 是**唯一** user-scope schema 范式；schema 只描述记录形状、**不产生权限**

- **实测**：`ls -1 world/*.yaml | wc -l` = **22**；`grep -ln "user/" world/*.yaml` → **只有 `world/bookmark.yaml`**（其余 21 个都指向 `/instance/app/arcblog/…`）。
- **范式内容**（逐字要点）：文件头写明①两条视图路径；②*「Authorization comes from the SESSION, not from blocklet.yaml: `/user` is the caller's own projection, so there is no `replicated` collection to declare and nothing to widen.」*；③写入方 = `?page=saved` 的 `exec /.actions/write` + `arcblog-bookmarks.mjs add --user <did>`。
- **对新增五棵树的直接含义**：每棵树需要一个同形 schema（否则记录形状无单一事实源），但**schema 文件本身不改变授权**（`replicated` 是 `blocklet.yaml` 的事；`world/**` 只被 CLI/校验器读取）。
- **顺手登记（文档漂移）**：checklist `:59` 写「`world/*.yaml` **21** 个 schema」，**实测 22**（`bookmark.yaml` 未回填）——建议 Lead 落笔时一并更正。
- **用途**：任何「要不要给 `/user` 加 schema」的讨论，答案 = 要（形状可复现），但**不要**顺手往 `blocklet.yaml` 加集合。

### §58 候选 —— 口径更正：§83 是**五棵**树，**一棵都没落**；已落地的 1 个面（`bookmarks`）不在 §83 的五棵里

- **spec 原文**（`:3194-3201`）：`/user ├── drafts ├── private ├── preferences ├── agent └── payment`（**五个**）。
- **团队文档的算术滑落**：REQ-028 §7.3 *「五棵树只落地 1 个面（阅读清单）。其余四棵……」*；backlog `R16 轮末③` *「四棵未落地 `/user` 树（`drafts/private/preferences/agent/payment`）」* —— **五个名字配「四棵」**；checklist `:61` 备注① 同样写「五棵树只落 1 个面」。
- **更正**：落地的 `?page=saved` → `/user/arcblog/bookmarks/` 按 §83 原文**不属于那五棵**（spec 用「例如」引出，`bookmarks` 是 §5.2 之外的自选扩展）⇒ 正确账目 = **应落地 5 棵 / 已落地 0 棵 / 额外落地 1 个面（bookmarks）**。
- **平台边界 = 无**：`/user` 可达、可隔离、零权限改动（§4.2 / §56）；缺的是 schema、页面与职责决策。
- **用途**：① 后续 REQ 立项时按**五棵**分配，别再按「四棵」；② 任何「§83 已完成」的说法都要附「已完成的是 bookmarks，不是五棵中的任何一棵」。

---

## 9. 受限未验证清单（**受限未验证 + 原因**）

| # | 未验证项 | 原因 | 下一步 |
| --- | --- | --- | --- |
| **U1** | 页面侧 `/user` 的 **404 / 跨 DID 隔离**（本次只用 AFS 三视图复核） | 本路线零浏览器；隔离结论引 `arc-contracts §4.2(2)` 的既有实测（REQ-028 + QA-012） | 实现批的 QA（CDP 两身份 + guest） |
| **U2** | 新子树目录（`drafts`/`private`/…）的**页面写权限**是否与 `bookmarks` 逐字相同 | 只实测过 `bookmarks` 一个目录；「同一个 action + 不同目录名」是**推理**而非实测 | 每棵树落地前一次最小写入探针（`.gate-lock` + AFS 前后对比） |
| **U3** | `propBind={x: "/user/arcblog/<tree>/$params.slug.json"}`（按 slug 读本人单条） | 需改 `.aup` 建探针；本路线禁止 | 实现批的单条读取路径（或先用 `afs-list` 列表兜底） |
| **U4** | markdown 编辑器 / 预览原语（`post-editor` / `afs-preview` / `text format=markdown`）在用户作用域的 prop 契约 | `arc dsl schema` 不给 prop 契约（`journal/round-23` 已登记）；需运行期探针 | `private`/`drafts` 落地前的 UI 探针 |
| **U5** | theme bridge 能否读 / 订阅 `/user/preferences`（`window.afs` 的 user-scope 读 + `afs.subscribe`） | 需改 `.web/**` + 浏览器；本路线零浏览器 | P1b 探针（A7 批准后） |
| **U6** | runtime `/mcp` / `llms.txt` 侧是否会读 caller 的 `/user/agent` | platform-provided（spec §129），不在本仓代码面 | A4 决策时与平台文档核对（**不得臆造**） |
| **U7** | 五棵树的**真实内容体量**对 `afs-list` 首屏的影响（大记录不进 `where`，`§44.2 F7`） | 今天这些树是空的，无量可测 | `private`/`drafts` 落地后压测（长正文记录） |
| **U8** | `?page=saved` 作为「我的空间」的 UI 容量（是否塞得下 5 个区） | 本路线不做 UI 评估 | A3 + UI 线评估（UI 标准 §4 密度/预算） |

---

## 10. 附录：原始命令与输出索引（逐条可复跑）

| # | 命令 | 输出要点 | 本文位置 |
| --- | --- | --- | --- |
| P1 | `arc afs ls /instance/app/arcblog` | `ERROR: No data found for path: /instance/app/arcblog`（exit 0） | §3.1 |
| P2 | `arc afs ls /blocklets/arcblog/instance/app/arcblog` | 10 个子目录（含 `.provenance`；无 `paid`/`pages`/`page-drafts`/`media`） | §3.1 |
| P3 | `for d in …; do arc afs ls …/$d \| grep -c .; done` | posts 3 / drafts 46 / paid 0 / orders 102 / ledger 124 / access-grants 44 / config 145 …（含残渣） | §3.1 |
| P4 | `arc afs ls /blocklets/arcblog/users` | 1 个 DID 目录 | §3.2 |
| P5 | `arc afs ls …/<did>/arcblog` / `…/bookmarks` + `arc afs read …/hello-arcblog.json` | 只有 `bookmarks`；记录 = `{slug,title,addedAt}` | §3.2 |
| P6 | `find ~/.afs/spaces/<did>/blocklets/arcblog/user -type f` + `cat` | 磁盘第三视图（含 2026-09-20 旧残留 `arcblog-probe/x.json`） | §3.2 |
| P7 | `python3` 解析 `blocklet.yaml` | `replicated 20` / `networkRead 20` / `user-scope NONE` | §3.3 |
| P8 | `ls -1 world/*.yaml \| wc -l`；`grep -ln "user/" world/*.yaml` | `22`；只有 `world/bookmark.yaml` | §3.4 |
| P9 | `cat world/bookmark.yaml`；`sed -n '1,80p' scripts/arcblog-bookmarks.mjs` | user-scope 范式（两条路径 + 「授权来自 session」+ 写入方） | §3.4 / §4 |
| P10 | `grep -n "saved" blocklet.yaml`；`grep -c wrapper.nav-group .aup/pages/saved.aup`；`node scripts/arcblog-console-nav.mjs --check` | 无 binding；0 侧栏；`pages 21` | §6 |
| P11 | `sed -n '197,228p' docs/ArcBlog-product-technical-spec.md`；`sed -n '3190,3211p' …` | §5.2 八类用户数据；§83 五棵树 + 登出不可见 | §2 |
| P12 | `grep -n "^## " docs/arc-contracts.md \| tail -5` + `for n in 54…60` | 末三项 = §51/§52/§53；§54 起空闲 | §8 |
| P13 | `arc afs explain /user` | `PATH /user` / `TYPE unknown` / `SIDE EFFECTS - none` | §4（共用事实） |

---

## 11. 回报（固定格式）

| 字段 | 值 |
| --- | --- |
| **产物路径** | `docs/team/requirements/REQ-038-four-trees-phase0.md`（仅此一个文件；**新增**） |
| **验证命令** | 见 §10 的 P1–P13（全部只读：`arc afs ls`/`read`/`explain`、`grep`/`wc`/`sed`/`python3`、`node scripts/arcblog-console-nav.mjs --check`） |
| **实际结果** | ① §83 逐字摘录 = **五棵树** + 「登出后 `/user` 不可见」；② 本仓 user 面今天**只有** `/user/arcblog/bookmarks/hello-arcblog.json`（三视图同源）+ 一个 2026-09-20 旧残留；③ `blocklet.yaml` **20 `replicated` + 20 `networkRead`，user-scope = 0** ⇒ 五棵树**权限零改动**；④ `world/*.yaml` **22** 个，唯一 user-scope = `bookmark.yaml`；⑤ **口径更正**：应落地 **5** 棵、已落地 **0** 棵、额外 1 个面（bookmarks）——「其余四棵树」是五个名字配「四棵」的算术滑落；⑥ 五棵树逐棵给出「能不能做/最小步骤/权限影响/验收/风险」+ **P1–P4** 四个分步计划 + **A1–A8** 批准点 + 3 条 arc-contracts 候选（**§56–§58**，含与 REQ-036 §54/§55 的占号冲突申报）；⑦ **页数保持 21**（五棵树全部可折叠进读者页 `?page=saved`；若必须新页 → 列为 A3 批准点） |
| **未跑（如实）** | `npm test` / `npm run build` / `arc dsl validate` / `arc dsl generate` / 全量 `test:live` 均**未运行**（本路线明确禁止）；`validateIssuesEmpty` / `fastTestsPassed` / `buildRan` 三项 = **false（本路线未运行）** |
| **待 Lead** | ① 裁决 A1–A8（建议顺序 A1→A2/A3→P1→P2→A6→P3→A4→A5→P4）；② 落笔 `arc-contracts §56–§58`（先复核编号）；③ 顺手更正 checklist `:59` 的 schema 计数 21→22（非本路线写范围） |
