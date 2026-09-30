# BUG-009: `?page=dashboard` 节点身份卡整卡空白（`state.nodeProfile` 无 `propBind`），F8① 在该页无对象可截断

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-009 |
| 严重级 | P2 |
| 发现轮次 | round-7 |
| 关联 REQ | REQ-002-console-consistency-fixes（A11 / F8① 的观察面；缺陷本身**范围外、pre-existing**） |
| 状态 | **已修复（R8 路径①：补 propBind）· QA 复验通过；但 A4 字面判据「≥1 个 `did:key:` 元素」在本实例无法满足（待 Lead/PM 裁定，非实现缺陷）**（见文末「R8 复验」） |

## 复现命令与最小步骤

1. 前置：dev 实例 `default`；admin 会话（CDP 9333，`arcblog.localhost:4939`）；实例上 `node/profile.json` 与 `node/health.json` 有数据。
2. 打开 `?page=dashboard`，读"Node identity, roles, taxonomy…"卡片内的可见文本与 `did:` 元素。

```bash
# 实例侧确有节点数据
arc afs exec /blocklets/arcblog/.actions/read --json --args '{"path":"/instance/app/arcblog/node/profile.json"}'
# 运行期
node /tmp/qa-cdp.mjs nav 'http://arcblog.localhost:4939/?page=dashboard' 3000
node /tmp/qa-cdp.mjs eval /tmp/qa-probe-did.js        # 期望至少 1 条 did:key
node /tmp/qa-cdp.mjs eval /tmp/qa-probe-texts.js      # 卡片可见文本
```

## 期望

`?page=dashboard` 的节点身份卡应显示 name / DID（中间截断 + `title` 完整值）/ version / roles / capabilities / health（REQ-002 A11「节点标识渲染为中间截断形式，完整值在 `title` 中可见」；`admin-ui-design.md` §5.1/§5.4）。
数据通道的既定做法是 `propBind={nodeProfile: "/instance/app/arcblog/node/profile.json"}`（`CLAUDE.md`「Reader/preview pages」同类写法）。

## 实际

- 卡片渲染出来了，但**所有绑定值都为空**：可见文本只有 `Node identity, roles, taxonomy and recent activity for this ArcBlog instance.` → `v` → `●` → `Roles` → `Capabilities`，
  没有节点名、没有 DID、没有 version、没有 roles/capabilities 内容。
- `?page=dashboard` 上 `did:key` 命中 **0** 个元素 → A11 无法在该页验证（QA 改在 `?page=hub` / `?page=access` 实测通过）。
- 根因线索：`dashboard.aup` **全文没有 `propBind`**，却直接读 `${state.nodeProfile.*}` / `${state.nodeHealth.*}`；
  另有 `visible="!${state.nodeProfile}"` 的空态卡，属 `docs/arc-contracts.md` §28.1 记录的"取反条件永不成立"模式。
- 该缺陷在本轮改动前已存在（`git show HEAD:.aup/pages/admin/dashboard.aup` 同样无 propBind），非本轮引入；Dev 已在自述里标注"属 REQ 外改动，未做，待 PM/Lead 裁决"。

## 证据输出

```text
$ arc afs exec /blocklets/arcblog/.actions/read --json --args '{"path":"/instance/app/arcblog/node/profile.json"}' | head -c 400
{"path":"/instance/app/arcblog/node/profile.json","content":"{\n  \"name\": …  (实例上数据存在)

$ node /tmp/qa-cdp.mjs eval /tmp/qa-probe-did.js      # ?page=dashboard
{"url":"http://arcblog.localhost:4939/?page=dashboard","dids":[]}

$ node /tmp/qa-cdp.mjs eval /tmp/qa-probe-texts.js    # ?page=dashboard（卡片附近）
… 27 "Dashboard" 28 "Node identity, roles, taxonomy and recent activity for this ArcBlog instance."
   29 "v" 30 "●" 31 "Roles" 32 "Capabilities" 33 "Recent published" …

$ grep -n propBind .aup/pages/admin/dashboard.aup
（无输出）

$ git show HEAD:.aup/pages/admin/dashboard.aup | grep -n 'propBind'
（无输出 → pre-existing）
```

退出码：0

## 影响范围

- 受影响角色：admin
- 受影响链路：界面（Dashboard 首屏节点身份；spec §107–§109 的"运营者一眼看到节点是谁"）
- 数据后果：无（只读渲染）
- 可绕过：是（`?page=hub` / `?page=access` 能看到 DID；`node scripts/arcblog-node.mjs check` 有 CLI 通道）

## 疑似文件

- `.aup/pages/admin/dashboard.aup:118-140`（缺 `propBind`，却读 `${state.nodeProfile.*}` / `${state.nodeHealth.*}`；`visible="!${state.nodeProfile}"`）
- 平台依据：`docs/arc-contracts.md` §28.1（`$state.*` 取反条件不成立）

## R8 复验（QA-003，2026-09-27）

**结论：卡片不再空白（走路径①补 `propBind`）；`visible="!${state.nodeProfile}"` 空态卡已删除。**

- 静态复核：
  ```text
  $ grep -n propBind .aup/pages/admin/dashboard.aup
  122: … propBind={nodeProfile: "/instance/app/arcblog/node/profile.json", nodeHealth: "/instance/app/arcblog/node/health.json"} visible="${state.nodeProfile}" {
  $ grep -rn 'visible="!${state.nodeProfile}"' .aup/            # 0 命中
  ```
- 浏览器实测（admin，`?page=dashboard`，CDP 9333）卡片可见文本（逐字）：
  ```text
  ArcBlog | did:bloc…rcblog | v0.3.7 | ● | ok | Roles | basic | Capabilities | blog.read,blog.write,blog.publish
  | Values come from node/profile.json and node/health.json.
  | If a value above is empty, run: node scripts/arcblog-node.mjs init
  ```
  与实例/CLI 对照一致：`arc afs exec …read node/profile.json` → `name=ArcBlog, did=did:blocklet:arcblog, roles=["basic"], capabilities=["blog.read","blog.write","blog.publish"], version=0.3.7`；`node/health.json` → `status=ok`；`node scripts/arcblog-node.mjs check` → `ok:true, issues:[]`。
- **A4 字面判据不满足（待裁定，非缺陷）**：REQ-004 §3 A4 路径①要求"卡内出现 ≥1 个 `did:key:` 元素"。本实例节点 DID 就是 `did:blocklet:arcblog`（blocklet 身份，`identity.json` 的 authMethod=blocklet），卡内按既有 `format=did` 惯例中间截断、完整值在 `title`（DOM：`text="did:bloc…rcblog"`、`title="did:blocklet:arcblog"`、宽 162px；`did:key:` 命中 0）。qa 无法在不改节点身份（超出写范围）的前提下满足该字面断言 → 请 Lead/PM 裁定按「真实 DID 中间截断 + `title` 全值」等价放行，或另建 key 身份后复验。
