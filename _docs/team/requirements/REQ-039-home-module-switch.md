> 编号更正（Lead，合并点）：本文件原与 lane I+L 的 `REQ-037-menu-capability-hiding-phase0.md` 撞号；现改为 **REQ-039**（REQ-038 = §83 五棵树探针）。

# REQ-037 — 首页模块开关与按角色首页（§15.5 / §55–§57）可达性探针与口径

> **REQ 编号**：REQ-037 ｜ **对应 spec 章节**：**§15.5「站点 Site」→「首页与推荐位 Home & Heroes」**（「首页模块开关：Featured / Latest / Topics 等区块的显隐与排序」「按角色显示：Studio 节点配置 Studio Home，Hub 节点配置 Hub Home（§55–§57）」）、**§55**、**§56**、**§57** ｜ **checklist 行**：`docs/ArcBlog-feature-checklist.md:133`（`首页模块开关与按角色首页`，现状 ⬜）｜ **提出轮次**：Round 26 lane J（并行 lane）｜ **角色**：Dev ｜ **状态**：✅ **可达性探针已交付 + 数据半边已落地**；**渲染半边判定为「本平台当前版本不可真实表达」**，故**未在公共首页添加任何开关控件**（见 §3 / §7）
> **写范围（lane J 裁定 J-1）**：仅 `.aup/pages/index.aup`（**本轮零改动**）、`seed/settings/arcblog/**`（**新增 `home.json`**）、`docs/team/requirements/REQ-037-*.md`（本文件）。**未碰** `admin/general.aup`、`ops/hub.aup`、`scripts/**`、`blocklet.yaml`、`.aup/locales/**`、`world/**`、spec、checklist。
> **结论性质声明（QA 纪律）**：本文每条「实测」都附**真实命令 + 真实原始输出**（§4 逐条对应）；凡本次做不到的一律写「**受限未验证 + 原因**」（§8）。**不臆造 ARC API**（spec §150）；**未改 spec 一字**（§1 的引用为逐字摘录并标行号）。
> **门禁纪律声明**：本轮**未跑** `arc dsl generate`、**未跑** `npm test`、**未跑** `npm run build`、**未跑**全量 `npm run test:live`、**未 `arc service restart`**（lane J 明令禁止 —— 并行 lane 在改其它页面与 locale，合并点由 Lead 统一跑）。只跑了 `arc dsl validate --json` 与**只读浏览器探针**（CDP，单 tab、每语言/身份新 context、结束关闭 target）。因此 `dist/` 未同步、`.aup/locales/*.json` 未重新生成 —— **本轮没有任何 `.aup` 改动**，故不存在 `stale_generated_locale_json` 类漂移（见 §8）。
> **实例写纪律**：唯一一次实例写入 = 一条探针记录 `/instance/settings/arcblog/home.json`（J-1 授权范围内），**读回验证后已删除**，实例已回到基线（§4.5 三态输出）。零链写、零 `config/**` 改动、零 `node.key` / `.env.local` 触碰。

---

## 0. 结论摘要（TL;DR）

| 问题 | 判定 | 一句话结论 |
| --- | --- | --- |
| ① 「首页模块开关」（记录驱动区块**显隐**）可否表达 | ❌ **不可表达** | 唯一"有数据才显示/无数据才隐藏"的语义载体是 `visible`；**实测 `visible` 挂在 `propBind` 绑定的 `$state.*` 上无效**：`reader.aup:17` 的封面块在 `coverImage=""` 时**照样渲染**（`background: url()`，1136×280 占位），`reader.aup:29` 的付费卡在 `previewOnly=false` 时**照样渲染**（§4.2/§4.3）。与 `docs/arc-contracts.md` **§28.1**、**BUG-001** 裁定一致：**只有同步的 `$session.*` 是可依赖的条件** |
| ② 「首页模块开关」的**排序**可否表达 | ❌ **不可表达** | AUP 无"动态重排静态兄弟节点"的原语：`for` 只吃字面量数组，表达式只有 `!`/`&&`/`||`（无比较、无算术、无字符串操作）；`afs-list` 的**渲染器真正读的节点 prop 仅 `id`/`page`/`pageSize`/`total`**，无文档化的排序 prop（排序只在 `hero-carousel` 这类自定义组件 JS 里实现，见 `.web/components/hero-carousel/`，超出 J-1 写范围） |
| ③ 是否**存在**真实生效的记录驱动闸门 | ✅ **存在，但在另一个上下文** | `afs-list` **行内**（entry 上下文）的 `visible="${entry.content.<字段>}"` **真实生效**：公共首页 feed 3 行中，`hello-arcblog`（`coverImage` 非空）缩略图节点**在**（240×174、`url(https://picsum…)`），`paid-test`/`sign-test`（`coverImage=""`）缩略图节点**不在 DOM**（§4.1）。⇒ **可表达的最小形态** = **「模块 = 一条 guest 可读记录 + `afs-list` 行内 entry 闸门」**（§3.2），但需要 `blocklet.yaml` 声明一个 guest 可读集合（**不在 J-1 写范围**） |
| ④ 「按角色首页」（Studio Home / Hub Home）可否表达 | ❌ **不可表达（受限 + 原因）** | 角色是**异步记录**（`node/role-status/*.json`），而 `visible` 唯一可靠的上下文是**同步** `$session.*`；实测 `$session.*` 只有 `authenticated` / `did` / `displayName`（全仓 92+13+5 处引用，无角色字段），且表达式语言**没有比较/映射**，无法 `did → role` 求值。⇒ 页面级按角色切换**无载体**；角色差异只能落在**记录权限**（`replicated.readRole`）而不是页面渲染 |
| ⑤ settings 记录能不能当开关载体 | ⚠️ **可以读，但不能当闸门** | 平台 settings 挂载是**封闭注册表**：guest `afs.list('/instance/settings/arcblog')` **只返回打包过的 3 条**（`palette/theme/tone.json`）；CLI 运行时写入的第 4 条 `home.json` 对挂载**不可见**（guest 读回 `Path not found: /arcblog/home.json`，§4.5）。⇒ 记录要能被页面读到**必须**先由 `seed/settings/arcblog/**` 打包 + `arc dsl generate`/`build`/`deploy` 注册（**合并点动作**）；但即便读到，①的结论仍成立 —— **读到值 ≠ 能藏区块** |

**给 Lead 的三条立刻可用结论**：

1. **不要按 J-2 的示例形态（`home` 记录 + 首页按它渲染/隐藏区块）落实现** —— 该形态在本平台当前版本**不成立**，落地即成假开关。checklist 行 133 应保持 ⬜，并在描述里补一句「平台受限：记录驱动的区块显隐/排序不可表达（REQ-037）」。
2. **可表达的最小形态是"目录 + 行内闸门"**（§3.2）：模块写成 guest 可读集合里的记录，首页用 `afs-list` 列出、用 `visible="${entry.content.<flag>}"` 按行显隐、用记录顺序表达排序（排序需自定义组件或用 `query` 的 `orderBy` 在 CLI 侧排序后投影）。它需要**两件本轮没有的东西**：`blocklet.yaml` 的集合声明（写范围外）+ 一次 `generate`/`build`/`restart` 后的 DOM 复验（arc-contracts **§34(5)**：`.aup` 改动对运行中的 daemon 不生效，"已修好"必须在重启后证明）。
3. **本轮交付的是数据半边 + 口径**：`seed/settings/arcblog/home.json`（打包后注册；记录形态与 `tone/palette/theme` 完全一致，向后兼容 §6）。它是**记录**不是控件 —— 页面上**没有**任何按钮/开关指向它，其 `description` 逐字写明"目前没有消费方以及为什么"（沿用 `admin/general.aup` 的 `sw-comments-consumer` 诚实范式）。

---

## 1. 口径（本轮要判定什么）

lane J 的 J-2 原文要求：读 spec §15.5/§55–§57 原文与 `seed/settings/arcblog/`、`/instance/settings/arcblog/` 现状，确定「首页模块开关」在这套平台上**可表达的最小形态**，**不得臆造 ARC API**。

spec 原文（逐字摘录）：

- `docs/ArcBlog-product-technical-spec.md:1062`：`* 首页模块开关：Featured / Latest / Topics 等区块的显隐与排序`
- `docs/ArcBlog-product-technical-spec.md:1063`：`* 按角色显示：Studio 节点配置 Studio Home，Hub 节点配置 Hub Home（§55–§57）`
- `docs/ArcBlog-product-technical-spec.md:1057`（达成标准）：`配置始终与节点角色匹配（Studio 节点不会出现 Hub 首页模块）`
- `docs/ArcBlog-product-technical-spec.md:2464/2482/2499`：§55 Studio 页面结构（Home/Featured/Latest/Popular/Topics/Archive/About/Support）、§56 Hub 页面结构（Featured/Latest/Trending/Topics/Studios/Search/About Hub）、§57 切换首页（Basic→Blog Home；Studio→Studio Home；Hub→Hub Home；Studio+Hub→Studio Home + Explore）

因此本轮把「模块开关」拆成**两个可分别判定的子问题**：**(a) 按记录显隐区块**、**(b) 按记录排序区块**；外加 **(c) 按角色首页**。

现状（本轮开工前）：`.aup/pages/index.aup` 共 **31 行**，只有 `frame hero-carousel-frame`（第 8 行）+ `h2 :feed`（第 9 行）+ `afs-list feed-list`（第 10–27 行）；`seed/settings/arcblog/` 只有 `tone/palette/theme.json` 三条；`/instance/settings/arcblog/` 实测 3 条（§4.5）。

---

## 2. 探针方法与基线（先探针，后落笔）

### 2.1 基线（只读）

```console
$ arc dsl validate --json        # 开工时基线，未改任何文件
… "issues": []                    # issues 为空（完整输出见 §4.6）

$ lsof -nP -iTCP:4939 -sTCP:LISTEN
arc-darwi 76734 shenxiang  … TCP 127.0.0.1:4939 (LISTEN)     # daemon cwd = /Users/shenxiuqiang/workspace/ArcBlog

$ curl -s -m 5 http://127.0.0.1:9333/json/version
{ "Browser": "Chrome/153.0.8010.54", … }                     # 复用既有 CDP 探针浏览器（未新起浏览器/未起第二台 daemon）
```

站点：`http://arcblog.localhost:4939`（daemon `default`，**未** `service start/stop/restart`）。

### 2.2 探针纪律

- 复用本仓既有探针范式 `scripts/arcblog-roles-probe.mjs`（CDP `:9333`、`Target.createBrowserContext` + 单 tab + `Page.navigate` + 结束 `Target.closeTarget` / `Target.disposeBrowserContext`）。
- 探针脚本本轮写在 `/tmp/lane-j-probe{,2,3,4,5}.mjs`（**不落仓**：`scripts/**` 不在 J-1 写范围，且未获授权新增仓库文件）。关键采集闭包逐字摘录在 §4 各条。
- 判据只用 **DOM 事实**（节点是否存在、`getBoundingClientRect()`、内联 `style`）与 **AFS 读回**；**不采信 toast/文案**。
- 每个身份/语言**独立 context + 单 tab**，本轮创建的 target 全部 `Target.closeTarget` + `Target.disposeBrowserContext` 关闭（§4 各条 `closedTargets`）。**关闭机制单独复验过**：新建一个 context（非默认 context 计数 45→46）→ close+dispose → 计数回到 45、该 context 不再列出 ⇒ 机制真实有效。探针收工时 CDP 上仍有 **11 个 page target / 45 个非默认 context**，但**其中 `?locale=zh` 等 URL 不在本轮任何探针的访问集合内**，判定为本轮之前既存（其它 lane / QA 的残留）；**非本轮创建的 target 一律不关**（避免误伤在跑的探针）。

### 2.3 判定「闸门是否生效」的四组对照

| 组 | 页面（**已部署、今天的 build**） | DSL（源文件） | 绑定通道 | 期望（若闸门有效） |
| --- | --- | --- | --- | --- |
| ① entry 上下文 | `/?page=index` | `index.aup:23` `visible="${entry.content.coverImage}"` | `afs-list` 行 | 有封面→块在；空→块不在 |
| ② page-state | `/posts/<slug>` | `reader.aup:17` `visible="${state.post.coverImage}"`；`reader.aup:29` `visible="${state.post.previewOnly}"` | 页级 `propBind` | 空→块不在；`previewOnly=false`→块不在 |
| ③ page-state（取反） | `/?page=factory` | `ops/factory.aup:191` `visible="${state.summary.nodes.studio.svg}"` / `:192` `visible="!${…svg}"` | 页级 `propBind` | 两者互斥（一在则另一不在） |
| ④ 正向对照 | `/?page=general` | `general.aup:302` `visible="!${state.verification.lastVerifiedAt}"` + `:303` 绑定时间戳 | 页级 `propBind` | 快照存在 → 提示不在、时间戳在 |

四组都打在**同一份已部署 build** 上，故结论是平台行为，不是单个页面的写法差异。

---

## 3. 结论：可表达的最小形态

### 3.1 判定

| 子问题 | 判定 | 依据 |
| --- | --- | --- |
| (a) 记录驱动区块**显隐**（`visible` + `propBind`） | **不可表达** | §4.2 / §4.3 / §4.4 + arc-contracts §28.1 + BUG-001 |
| (b) 记录驱动区块**排序** | **不可表达** | 无动态兄弟重排原语；`for` 只吃字面量；表达式无比较/算术；`afs-list` 渲染器真正读的节点 prop 只有 `id`/`page`/`pageSize`/`total`（`.agents/skills/aup-dsl/references/primitives.md:89`）；排序能力只存在于自定义组件 JS 与 provider `query.orderBy`（CLI 侧） |
| (c) **按角色**首页（Studio/Hub） | **不可表达（受限）** | `$session.*` 实测只有 `authenticated`/`did`/`displayName`；角色是异步记录；表达式无比较/映射 ⇒ 页面无法由角色分支（§5） |
| (d) **存在**的真实闸门通道 | ✅ **entry 上下文** | §4.1：`visible="${entry.content.<字段>}"` 在 `afs-list` 行内真实生效（双向） |

**平台行为模型（推断，非实测隔离）**：`visible` 的插值结果为空串时**不隐藏**（fail-open，元素保持默认可见），只有求值出**非空/false** 的布尔语义时才隐藏 —— 这能同时解释：①（entry、值非空→显示；值空→**隐藏**，与模型冲突 ⇒ 说明 entry 上下文走的是另一条判定路径）；② 空值仍显示；④ 取反时非空值→false→隐藏。**该机制未被隔离验证**，故 §3.1 的判定只依赖**可观察结论**，不依赖该模型。

### 3.2 可表达的最小形态（**本轮未实现**，供 Lead 决定是否开新一轮）

> 模块 = **一条 guest 可读记录**；页面用 `afs-list` 列出该目录；**行内**用 `visible="${entry.content.<flag>}"` 决定该模块是否出现（实测生效通道）；排序用记录自有字段在**写入侧**排好（或自定义组件内排序）。

前提（**都超出 lane J 写范围或本轮验证能力**）：

1. `blocklet.yaml` 要新增一个 guest 可读集合（`networkRead` + `replicated`，`readRole: guest`、`minRole: admin`）—— J-1 写范围不含 `blocklet.yaml`；`config/**` 是 admin-only，**公共首页读不到**（blocklet.yaml:211–221 的注释已说明"绝不把公开子节点嵌在私有父节点下"）。
2. 平台 settings 挂载**不可**当该集合：封闭注册表（§4.5），且是**扁平**的字段注册表，没有"每个模块一条记录 + 排序字段"的语义。
3. 完成后必须**重启实例复验**（arc-contracts **§34(5)**：`.aup` 改动对运行中的 daemon 不生效，`arc blocklet run` 不是 reload 路径；"已修好"必须在 `arc service restart` 后证明）。

### 3.3 因此本轮**不加控件**（J-3）

- `.aup/pages/index.aup` **零改动**：任何 `visible="${state.home…}"` 形态要么恒显示（开关失效=假开关），要么恒隐藏（首页空掉=回归）。按 J-3「开关必须真实生效，否则不要加控件（禁止假按钮）」，本轮不加。
- 交付 `seed/settings/arcblog/home.json` 作为**数据半边**（打包后注册、CLI 可读、向后兼容），并在其 `description` 与本文里**逐字声明"目前没有消费方"**——不是控件、不谎称已接线。

---

## 4. 证据

### 4.1 ① entry 上下文：闸门**真实生效**（公共首页 feed）

采集闭包（`/tmp/lane-j-probe4.mjs`，逐字）：

```js
const rows = Array.from(document.querySelectorAll('.aup-list-template-item'));
const pick = (r) => {
  const nodes = Array.from(r.querySelectorAll('[data-aup-id]'));
  const thumb = nodes.find((n) => /-view-2$/.test(n.getAttribute('data-aup-id') || ''));
  const st = thumb ? (thumb.getAttribute('style') || '') : null;
  const rect = thumb ? (() => { const b = thumb.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) }; })() : null;
  return { rowId: r.getAttribute('data-aup-id') || null, thumbNodePresent: !!thumb, thumbRect: rect,
           thumbHasUrlValue: st ? /url\([^)]+\)/.test(st) : null, thumbStyleTail: st ? st.slice(-70) : null };
};
```

原始输出（guest，`/?page=index&locale=en`，两次 `Page.navigate` 以避开 `propBind` 首载时序）：

```json
{ "rowCount": 3, "hasLatestHeading": true, "rows": [
  { "rowId": "feed-list-row-1--hello-arcblog.json", "thumbNodePresent": true,
    "thumbRect": { "w": 240, "h": 174 }, "thumbHasUrlValue": true,
    "thumbStyleTail": "otos/seed/arcblog-overview/1600/900\") center center / cover no-repeat;" },
  { "rowId": "feed-list-row-1--paid-test-1790472790603.json", "thumbNodePresent": false, "thumbRect": null },
  { "rowId": "feed-list-row-1--sign-test-1790502598928.json", "thumbNodePresent": false, "thumbRect": null } ] }
```

记录侧对照（CLI 读回，证明"空"确实是空）：`hello-arcblog.coverImage = "https://picsum.photos/seed/arcblog-overview/1600/900"`、`paid-test.coverImage = ""`、`sign-test.coverImage = ""`。

⇒ **`visible="${entry.content.coverImage}"` 在 `afs-list` 行内按记录值真实隐藏/显示节点**（行数 3 不变，缺封面的两行**没有**缩略图节点）。

### 4.2 ② page-state：闸门**无效**（读者页封面）

`reader.aup:16-17`：

```aup
view gap=md visible=$state.post {
  view style={… background: "var(--color-border) url(${state.post.coverImage}) center / cover no-repeat"} visible="${state.post.coverImage}" {
```

原始输出（guest，两次 navigate；`/tmp/lane-j-probe3.json`）：

```json
"hello":    { "bgUrlNodes": [ { "rect": { "w": 1136, "h": 280 },
              "style": "… background: var(--color-border) url(https://picsum.photos/seed" } ] },
"signTest": { "bgUrlNodes": [ { "rect": { "w": 1136, "h": 280 },
              "style": "… background: var(--color-border) url() center / cover no-repeat" } ] },
"paidTest": { "bgUrlNodes": [ { "rect": { "w": 1136, "h": 280 },
              "style": "… background: var(--color-border) url() center / cover no-repeat" } ] }
```

⇒ `coverImage=""` 的两篇，**封面块照样占位 1136×280**，只是 `url()` 为空。**绑定的值确实插值进来了**（值非空时 `url(https://picsum…)`），**但闸门没有隐藏节点**。

### 4.3 ② page-state：闸门**无效**（`previewOnly=false` 仍渲染）

`reader.aup:29`：`view gap=md … visible="${state.post.previewOnly}"`。
三篇的 DOM 中该节点 id（`reader-view-1-view-1-view-3-view-5`）**三篇都在**（`/tmp/lane-j-probe3.json` 的 `aupIds`），其中 `sign-test.previewOnly=false`、`paid-test.previewOnly=true`、`hello-arcblog` 无该字段。

### 4.4 ③ page-state（取反）：正向/取反**互斥失效**

`/?page=factory&locale=en`（admin，`/tmp/lane-j-probe2.json`）：

```json
{ "svgNodePresent": true, "svgRect": { "w": 1441, "h": 100 }, "svgImgSrcLen": null,
  "emptyNoteNodes": [], "kvNodePresent": true, "kvTextLen": 17,
  "advNodePresent": false, "txNodePresent": false }
```

`ops/factory.aup:191` 正向闸门的节点**在**（但绑定的 svg 值未解析 ⇒ 里面没有 `<img>`），`:192` 的 `visible="!${…svg}"` 节点**不在**。按"取反"语义，两者应互斥且**至少有一个成立**；实测结果与 `arc-contracts` §28.1 记录的"取反条件永不显示 / 表达式形式只求值一次"同族。

**④ 正向对照**（`/?page=general&locale=en`，admin，两次 navigate，`/tmp/lane-j-probe4.json`）：

```json
{ "sessionFailed": false, "noSnapshotNodePresent": false, "boundTimestampRendered": true,
  "boundTimestamps": ["2026-09-29T05:49:11.977Z"], "rolesCardFound": true }
```

⇒ **`propBind` 通道本身是好的**（`node/role-verification.json` 的 `lastVerifiedAt` 真的渲染进了 DOM），同一张卡上取反闸门的节点不在。⇒ 结论不是"绑定坏了"，而是"**闸门语义不可靠**，不能拿来做开关"。

### 4.5 ⑤ settings 挂载是**封闭注册表**（决定性，且与 general-settings.mjs 的既有注释一致）

三态（`/tmp/lane-j-probe5.json` + `arc afs exec` 读回）：

```console
# (1) 写入前：guest 浏览器列目录（无 login_token，独立 context）
{ "listShapes": { "list(pathString)": { "ok": true, "type": "array",
    "ids": ["palette.json", "theme.json", "tone.json"] } },
  "homeRead": { "ok": false, "error": "Error: Path not found: /arcblog/home.json" } }

# (2) CLI 写入（scripts/lib/arc.mjs writeJson —— scripts/arcblog-settings.mjs 用的同一条路径）
BEFORE absent
WRITE {"id":"home.json","path":"/instance/settings/arcblog/home.json","createdAt":"2026-09-29T06:04:22.443Z",…}
READBACK {"label":"Home modules",…,"value":"hero,latest"} ifMatch= 1790661862443.253-157633349-884

# (3) 写入后：同名 guest 探针（新 context）
{ "listShapes": { "list(pathString)": { "ok": true, "ids": ["palette.json", "theme.json", "tone.json"] } },
  "homeRead": { "ok": false, "error": "Error: Path not found: /arcblog/home.json" } }

# (4) 清理（恢复基线）
BEFORE present
DELETE {"path":"/instance/settings/arcblog/home.json"}
AFTER absent
```

⇒ **CLI 能读能写的 `/instance/settings/arcblog/home.json`，对运行期 settings 挂载完全不可见**（列表仍只有打包过的 3 条、按路径读 `Path not found`）。这与 `scripts/lib/general-settings.mjs` 顶部注释（"closed registry…stays invisible to the settings surface…even after `arc blocklet build` + `arc service restart`"）**互相印证**：新字段**必须**由 `seed/settings/arcblog/**` 打包注册。

顺带取得挂载记录的**运行期形态**（对设计有用）：`afs.tryRead` 返回包装对象 `{id, path, content: "<记录 JSON 字符串>", meta:{accessMode:"readonly", visible, editable, scope, version}}`；实测 `tone/palette`（`scope:instance`）`meta.visible=false`、`theme`（`scope:shared`）`meta.visible=true`。**推断**（仅 2 个数据点，未隔离）：挂载单元的 `meta.visible` 由 `scope` 决定 —— 新增的 `home.json` 取 `scope:instance`，与 tone/palette 同类，故预期 `meta.visible=false`（**未复验**，依赖 §8#1 的注册）。访客侧 `meta.editable=false`、`meta.accessMode="readonly"` 三条一致。

### 4.6 门禁与自检（本轮真实跑过的）

> ⚠️ **共享工作树警告**：本 lane 与其它并行 lane 共用同一个工作目录，`git status` / `git diff --stat`（全树）**必然**包含别的 lane 的在途改动（本轮实测：`.aup/pages/admin/general.aup`、`.aup/pages/ops/hub.aup`、`.aup/locales/{en,zh}.json`、`scripts/arcblog-ui-budget*`、`scripts/ui-budget-baseline.json`、`docs/team/bugs/BUG-0{34,76,77,78}*`）。因此自证**一律按路径收窄**，只看 J-1 授权路径：

```console
$ arc dsl validate --json                 # 收工时（新增 seed 文件后；含其它 lane 在途改动）
… "issues": []                             # issues 为空

$ git diff --stat -- .aup/pages/index.aup .aup/pages/about.aup seed/settings/arcblog/
                                           # （空输出 = J-1 路径内已跟踪文件零改动）

$ git status --porcelain -- .aup/pages/index.aup .aup/pages/about.aup seed/settings/arcblog/ docs/team/requirements/REQ-039-home-module-switch.md
?? docs/team/requirements/REQ-039-home-module-switch.md
?? seed/settings/arcblog/home.json         # 仅这两个新文件属于本轮

$ git log -1 --format='%h %an'
4d9e0e7 shenxiuqiang                       # 未提交证据（Lead 统一提交；本轮无 git 写操作）

$ wc -l .aup/pages/index.aup
31 .aup/pages/index.aup                    # 未变短（本轮零改动）

$ shasum -a 256 seed/settings/arcblog/home.json docs/team/requirements/REQ-039-home-module-switch.md
41ceba104022e583…  seed/settings/arcblog/home.json
9991b57e2f0953d3…  docs/team/requirements/REQ-039-home-module-switch.md
```

> **注意（给 Lead）**：`docs/team/requirements/REQ-037-menu-capability-hiding-phase0.md` 是**另一条 lane** 的新文件，与本文件**共用 REQ-037 编号**（不同 slug）。Dev 未改它，编号归一请 Lead 裁定。

---

## 5. 「按角色首页」：受限 + 原因（J-3 要求如实标注）

**结论**：Studio Home / Hub Home 的页面级切换**在本平台当前版本不可表达**。原因三条，均可复核：

1. **唯一的可靠条件通道是同步 `$session.*`**（`arc-contracts` §28.1；本文 §4.2–§4.4 复现）。实测 `$session.*` 在本仓只出现三种字段：`$session.authenticated`（92 处）、`$session.did`（13 处）、`$session.displayName`（5 处）——**没有角色字段**（上下文字段清单见 `.agents/skills/aup-dsl/references/language.md:139`：「`$session.*`（`authenticated`、`did`、`displayName`…）」）。
2. **角色状态是异步记录**：`node/role-status/{basic,studio,hub}.json`（由 `scripts/arcblog-roles.mjs verify apply` 派生）与 `config/roles.json`（admin-only）。要按角色分支，就要在页面里读它们并做比较/映射 —— 而表达式语言**只有 `!`/`&&`/`||`，无比较、无算术、无映射**（`language.md:143`），`state.*` 上的 `visible` 又不可靠（§4.2–§4.4）。
3. **平台的角色差异落在记录权限而不是页面渲染**：`blocklet.yaml` 的 `replicated.<collection>.readRole/minRole` 是权威闸门；页面级只有 `visible=$session.authenticated` 这一个可用开关（全仓控制台页面都是这个用法）。

**未做（明确不做）**：不把 `$session.authenticated` 冒充成"按角色"（那是"按登录状态"，会误导运营者与 QA）；不加"Studio Home / Hub Home"占位控件。

**可行的降级路径（供 Lead 选择，非本轮实现）**：

- 把 Studio/Hub 的差异落成**两条不同路由的静态首页**（例如 `/hub-home`），由运维在**节点角色确定后**选择绑定/菜单指向（`blocklet.yaml` bindings 无角色字段，故只能是静态绑定选择，不是运行期分支）。这需要 `blocklet.yaml` + 可能新页面（均超出 J-1）。
- 或在首页渲染**"本节点声明的角色"这一行文字**（`node/role-status/*.json` 的 `stakeState` 是真实可读值、绑定的插值通道已验证 §4.4），但**只做陈述、不做分支**——且必须逐字写出 `active=false` / `chainVerification=false`（fail closed），不能暗示角色已激活。

---

## 6. 交付物与向后兼容

| 产物 | 说明 |
| --- | --- |
| `seed/settings/arcblog/home.json` | **新增**。平台 settings 记录（与 `tone/palette/theme.json` **同一形态**：`label` / `description` / `scope` / `type` / `options` / `value`）。`scope: instance`（与 tone/palette 同类 ⇒ 挂载 `meta.visible=false`，仅管理员）；`type: select` + `options` 白名单（fail closed）；`value: "hero,latest"`（= 现状，**默认行为不变**） |
| `docs/team/requirements/REQ-039-home-module-switch.md` | 本文件 |
| `.aup/pages/index.aup` | **零改动**（31 行）—— 见 §3.3 |
| `world/**` | **零改动**。理由：平台 settings 挂载**不是** `world/*.yaml` 的 AFS 资源（`world/` 是 `/instance/app/arcblog/**` 的资源 schema；settings 走 `/instance/settings/<blocklet>/` 的平台注册表），本轮无新记录集合。J-1 的"仅当确需"不成立 |

**向后兼容性核对（读源码，未跑测试）**：

- `scripts/arcblog-settings.mjs` 只遍历自己的 `KEYS = {tone,palette,theme}`（第 47–51 行）→ 新增第 4 条**不影响** `show`/`set` 的输出形状与 `--help` 文案。
- `scripts/lib/general-settings.mjs` 的 6 条 General 记录在 `config/**`，与 settings 挂载无关 → 不受影响。
- `.web/components/theme-bridge/script.js` 只读 `tone/palette/theme.json`（`FILES`）→ 不受影响。
- 快层测试耦合面（grep 结果）：`scripts/arcblog-theme.test.mjs` 只读 `seed/settings/arcblog/theme.json`；`scripts/arcblog-roles-settings.test.mjs` 只做静态文本断言；**没有任何测试枚举该目录的文件数**（`grep -rn "seed/settings" scripts/` 只命中 `general-settings.mjs` / `arcblog-settings.mjs` 的注释与 `arcblog-theme.test.mjs` 的单文件路径）→ 新增文件**不触发**既有断言。
- **受限未验证**：`npm test` / `npm run build` 本轮按 lane 规定**未跑**，故"门全绿"由 Lead 在合并点确认；新增 settings 字段对 `arc blocklet build` 的 manifest 与运行期 `auto-surface` 的**可见效果未经复验**（R10 曾测得 `auto-surface from "/instance/settings/arcblog"` 渲染 "No settings"，故预期无可见变化，属**推断**）。

---

## 7. 明确不做（禁止假开关）

- ❌ 不在 `index.aup` 添加任何 `visible="${state.home…}"` 形式的模块闸门（实测无效 ⇒ 会是假开关）。
- ❌ 不添加任何"模块开关"按钮/下拉（页面上没有可真实生效的写入→渲染闭环）。
- ❌ 不把 `$session.authenticated` 包装成"按角色首页"。
- ❌ 不改 `blocklet.yaml` 新增集合（写范围外）、不改 `admin/general.aup`（J-1 明令）、不改 `scripts/**`（写范围外，故未给 `arcblog-settings.mjs` 增加 `home` 子命令）。
- ❌ 不跑 `arc dsl generate` / `npm test` / `npm run build` / 全量 `test:live` / `arc service restart`。

---

## 8. 交接残留与「受限未验证」清单

| # | 项目 | 状态 | 原因 / 需要的动作 |
| --- | --- | --- | --- |
| 1 | `seed/settings/arcblog/home.json` 的**注册生效性** | **受限未验证** | 需合并点 `arc dsl generate` + `npm run build` + 部署/重启后，`afs.list('/instance/settings/arcblog')` 应出现第 4 条（§4.5 已证明运行期写入无效，只有打包注册有效） |
| 2 | 首页模块闸门的 **DOM 复验** | **受限未验证** | 本轮零 `.aup` 改动，故无 DOM 变化可验；若 Lead 决定走 §3.2 的"目录 + 行内闸门"，须先改 `blocklet.yaml` 并在 `arc service restart` 后复验（arc-contracts §34(5)） |
| 3 | `auto-surface` 是否显示新字段 | **受限未验证（推断为否）** | 依赖 #1；R10 测得该 surface 对已注册字段也渲染 "No settings" |
| 4 | 运行时写入的第 4 条记录 | **已清理** | 探针记录已删除，实例回到 3 条基线（§4.5 第 (4) 段）。**未留临时记录/临时目录**（探针脚本在 `/tmp`，不在仓库内） |
| 5 | `dist/` 与 `.aup/locales/*.json` | **本轮无漂移** | 本轮没有任何 `.aup/**` 改动 ⇒ 不存在 `stale_generated_locale_json`；`dist/` 的 mtime 变化属并行 lane 的构建动作，非本轮 |
| 6 | `npm test` / `build` / 全量 `test:live` | **未跑（按 lane 明令）** | 由 Lead 在合并点统一跑；本轮只跑 `arc dsl validate --json` + 只读 CDP 探针 |

---

## 9. 清单影响建议（由 Lead 决定，Dev 不改 checklist）

- `docs/ArcBlog-feature-checklist.md:133`「首页模块开关与按角色首页」：**建议保持 ⬜**，并在该行描述里追加受限口径：
  「〔Round 26 lane J / REQ-037〕平台受限：记录驱动的区块**显隐**（`visible` 挂 `$state.*` 实测无效，见 §28.1 / BUG-001）与**排序**（无动态兄弟重排原语）均不可表达；**按角色首页**亦不可表达（`$session.*` 无角色字段、角色为异步记录）。本轮交付数据半边 `seed/settings/arcblog/home.json`（recorded-only，页面无控件），未加假开关。可表达的最小形态 = guest 可读**集合 + `afs-list` 行内 entry 闸门**，需 `blocklet.yaml` 授权 + 重启后复验。」
- 若 Lead 认为「可表达的最小形态」值得立项，建议新建 REQ（写范围含 `blocklet.yaml` + `world/**` + `index.aup`），并把它作为「首页模块开关」的真正载体；本轮不予实现。

---

## 10. 附录：原始证据

| 文件 | 内容 | 关键字段 |
| --- | --- | --- |
| `/tmp/lane-j-probe-1.json` | ① `?page=general` 取反闸门；guest settings 读 | `noSnapshotNoteRendered=false` / `snapshotTsOnPage=2026-09-29T05:49:11.977Z` / guest 三文件 `ok:true` |
| `/tmp/lane-j-probe2.json` | ③ `?page=factory` 正向/取反对照 | `svgNodePresent=true`（`svgImgSrcLen=null`）/ `emptyNoteNodes=[]` |
| `/tmp/lane-j-probe3.json` | ② 读者页三篇对照 | 空 `coverImage` 仍渲染 `url()`；`view-5` 三篇均在 |
| `/tmp/lane-j-probe4.json` | ① entry 闸门（决定性）+ ④ 正向对照 + guest 挂载形态 | `rows[]` / `boundTimestampRendered=true` / `meta{accessMode,visible,editable,scope,version}` |
| `/tmp/lane-j-probe5.json` | ⑤ settings 挂载封闭注册表（写前/写后同一 guest 探针） | `ids:[palette,theme,tone]` / `Path not found: /arcblog/home.json` |

探针脚本（`/tmp`，未落仓；CDP 样板与 `scripts/arcblog-roles-probe.mjs` 同构）：`/tmp/lane-j-probe.mjs`、`/tmp/lane-j-probe2.mjs`、`/tmp/lane-j-probe3.mjs`、`/tmp/lane-j-probe4.mjs`、`/tmp/lane-j-probe5.mjs`；实例读写脚本 `/tmp/write-home.mjs`、`/tmp/delete-home.mjs`（均只调用 `scripts/lib/arc.mjs` 的 `writeJson`/`readJson`/`remove`）。

**外部/仓库内引用**：`docs/arc-contracts.md` §15（编辑后索引失效）、§19/§20（`emptyText` 不解析 `$t()`）、§21.11（局部刷新三级 + 首屏竞态）、§28.1（异步 `visible` 不可靠）、§34(5)（`.aup` 改动对运行中 daemon 不生效，必须重启复验）、§37(2)（`data:` URI 可渲染）；`docs/team/bugs/BUG-001-*.md`（空态互斥不可实现）；`.agents/skills/aup-dsl/references/{language.md,primitives.md,runtime-gotchas.md}`。
