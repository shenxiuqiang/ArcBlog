# REQ-009 — 媒体管理页补全（§15.4）+ 两条 P3 收口（BUG-017 D13 文案 / BUG-016 D15 一次保型探针）+ D14 Publish 副本语义文案

**元信息**：REQ-009 ｜ 对应 spec 章节：**§15.4 内容 Content「媒体 Media」**（第 1003–1016 行）、**§15.1 内容管理**、**§70/§71 Hub 同步状态**；UI 标准 §4.3/§4.4/§5.1/§9 ｜ checklist 行：D 组第 **102** 行「媒体管理界面 🟡」（`media-admin.json` 只读索引列表；上传、引用视图待补），另涉第 **101** 行「页面管理 ✅」（BUG-017）与第 **110** 行「Hub 管理 ✅」（BUG-016）｜ 优先级：**🟥 本轮**（媒体页 = 功能补全；BUG-016/017 均 **P3 不阻断**）｜ 提出轮次：**Round 10**（Lead 裁定 D13/D14/D15 后开工）｜ 负责角色：**Dev** ｜ 状态：**已派发（`task-21`）**；结果记录见 **§3.1**（轮末回填）

---

## 1. 背景

### 1.1 媒体管理界面：CLI 已完整，界面只有只读索引（清单第 102 行 🟡）

- checklist 第 102 行现状：`media-admin.json 只读索引列表；上传、引用视图待补`。
- spec §15.4「媒体 Media」的**达成标准**（第 1007–1016 行原文）：媒体「必须可见、可查、可追责」——「任何媒体都能查到完整的引用列表；删除操作对有引用的媒体必须拦截或警告；未引用媒体可以被一键筛出」；功能条目为 **① 上传（拖拽 / 粘贴）、列表与网格两种视图 ② 查看引用 ③ 未引用媒体清理提示 ④ 复制地址（AFS 路径与公开 URL）**。
- **CLI 侧已完整**（不是本 REQ 要补的部分）：`scripts/arcblog-media.mjs` 提供 `add / list / show / refs / orphans / remove`；`remove` 在**被引用时拒绝**（`CONFLICT`，`--force` 覆盖）；`refs`/`orphans` 的引用判定由 `scripts/lib/media.mjs` 的 `findMediaReferences()` 扫描 `posts / drafts / pages / page-drafts / heroes` 五个目录（按「记录序列化文本包含该 AFS 路径」匹配）。
- **界面现状**（PM 静态复核，2026-09-28）：`.aup/pages/ops/media.aup` 只有一张卡 + 一个 `afs-list`（`:106`，`from "/instance/app/arcblog/media"`），行内只渲染 `id`、`mimeType`、`createdAt`；**`path` / `size` / `uploaderDid` 均未呈现**（`media.aup:108–112`），**没有**引用视图、**没有**孤儿入口、**没有**上传入口、**没有**地址呈现。

**PM 实测基线（只读；Dev/QA 开工前可原样重跑）**

```text
$ node scripts/arcblog-media.mjs list
{"ok": true, "path": "/instance/app/arcblog/media", "count": 0, "media": []}

$ node scripts/arcblog-media.mjs orphans
{"ok": true, "count": 0, "total": 0, "orphans": []}

$ node scripts/arcblog-media.mjs refs          # 负面：缺 --id
{"ok": false, "code": "VALIDATION", "error": "media id is required (--id)"}    [exit=1]

$ grep -c 'afs-dropzone' .aup/pages/ops/media.aup
0                                               # 媒体页当前没有任何上传入口
```

> **索引当前为空（`count: 0`）** ⇒ 验收必须**先造探针记录**（`arcblog-media.mjs add`），观察后清理；不能靠「页面不报错」判定通过。

**平台能力边界（本 REQ 的「不臆造 ARC API」依据；全部为实测/既有留档）**

| 能力 | 实测事实 | 出处 |
| ---- | -------- | ---- |
| 上传 | 平台原语 `afs-dropzone` **存在**，仓库已在 3 处**无参**使用：`.aup/pages/admin/compose.aup:154`、`.aup/pages/admin/compose-edit.aup:77`、`.aup/pages/site/heroes.aup:160` | `arc dsl schema --json` 的 `schema/primitives` 含 `afs-dropzone`；**其 `hovers` 只有「AUP primitive node type / Use as a page node」、无任何 prop 元数据** |
| 上传 API 文档 | `arc dsl explain afs-dropzone` → `ERROR: Unknown command: "dsl explain"`；**可用命令是 `arc dsl schema`（打印 language schema 与 primitive metadata）** | PM 实测（`arc dsl --help` 的命令表：`decompile/doctor/format/generate/language/lint/lsp/migrate-i18n/schema/validate`） |
| 上传落点 | 二进制进**每钱包**空间 `/blocklets/arcblog/users/<did>/media/<id>`；索引记录在 `/instance/app/arcblog/media/<id>.json`（**CLI 维护**） | `docs/persistence.md:29` / `:18`；`scripts/arcblog-media.mjs` 头部注释「Records index the binary; it does not move bytes」 |
| 跨集合「引用数」join | **不存在**：AUP 页面读不到 CLI 的引用计算结果；记录里没有 `refsCount`/`orphan` 字段 | `world/media.yaml` 字段清单（无引用相关字段）；AUP 表达式语言只有 `\|\|`/`&&`/`!` 与 `$session.*`/`$state.*`（`arc-contracts.md` §28.1） |
| 网格视图 | `afs-list layout=grid` **固定 6 列**（auto-fill，实测每列 226px）；`columns=2` 能过校验但运行期忽略；行内 action 被拉成卡片等高（140px） | `docs/arc-contracts.md` **§25 能力表**第 860 / 847 行 |
| 剪贴板 | 控制台**没有**复制类原语（§25.1 的 54 个已实现原语清单里无 copy） | `docs/team/design/UI-001-console-tokens-and-walkthrough.md` F8②；`docs/arc-contracts.md` §25.1 清单（`grep -ci copy` = 0） |
| 权限 | `media` 是 **admin-only**：`networkRead` 前缀 `/instance/app/arcblog/media` → `role: admin`（`blocklet.yaml:109–111`）；`replicated.media` = `minRole: admin` / `readRole: admin` / `copy: none`（`:205–210`）；guest 权限矩阵已有自动断言（`scripts/arcblog-permissions.test.mjs` 的 `ADMIN_PATHS` 含 `media`，属 `npm test` 快层） | 上述行号 + `npm test` |

### 1.2 BUG-017（P3）：旧 CLI/root 授权的公开副本存在时，页面 Bring online 被平台诚实拒绝

- 缺陷文件：[`bugs/BUG-017-pages-bring-online-legacy-root-authority-refused.md`](../bugs/BUG-017-pages-bring-online-legacy-root-authority-refused.md)；原始证据 [round-9-reverify.md](../test-reports/round-9-reverify.md) §3-F / §5 观察 2。
- 实测事实（QA 真实点击，admin 会话）：公开副本由 **AFS 直写 / CLI（root 授权）** 写就时，页面对该既有记录的 `write` 被拒 ——
  `Forbidden at /instance/app/arcblog/pages/qa-r9f-pageprobe.json: network write target exists without a recoverable authority sidecar`，**且没有写入**（`updatedAt` 保持 seed 值）；报错路径是**真实 slug**（模板求值本身已由 REQ-008 修好）。先点 **Remove public copy**（`/.actions/delete`，对任何记录可用）再点 **Bring online** → 成功且 `createdAt` 保留。
- 平台规则：`docs/arc-contracts.md` **§29.2** —— 对**已存在且由 CLI/root 写就**的记录，`replace` / `create` / `update` / `tree-merge` / `patch(op:add)` **全部被拒**；`/.actions/delete` 与「写入不存在的路径」豁免；页面自建记录（sidecar 可恢复）可重写。
- **Lead 裁定 D13（2026-09-27）= 选项 ①**：把「先 Remove public copy 再 Bring online」写进 **确认/提示文案**；**保留平台的诚实拒绝**；**不做** page-owned overlay / worker（= 不改 AFS 记录形态、不改 CLI）。

### 1.3 BUG-016（P3）：`?page=hub` 行内重写把 `sync.lastVersion` 改型

- 缺陷文件：[`bugs/BUG-016-hub-sync-lastversion-null-to-empty-type-drift.md`](../bugs/BUG-016-hub-sync-lastversion-null-to-empty-type-drift.md)；原始证据 [round-9-reverify.md](../test-reports/round-9-reverify.md) §5 观察 3。
- 实测事实（探针）：`null`（JSON null）→ `""`；数字 `7` → 字符串 `"7"`。**真实 4 条收录记录两种形态都存在**（2 条 `null` / 2 条数字）⇒ 任何一次行内 Approve / Terminate 都会改型。
- 成因（`arc-contracts.md` §29.1 + BUG-016 原文）：R9F 把行内写改成「每行 hidden input `value="${entry.content.sync.lastVersion}"` → `exec` 的 args 用 `${args.eSyncLastVersion}`」，而 **hidden input 的 value 只能是字符串**——承载不了 JSON `null`，且把数字隐式串化。旧写法（把 `sync` 整体当字面量）更坏，所以这是**修复引入的次要类型漂移**，不是功能回退；读侧按 falsy/宽松比较处理无差异。
- **Lead 裁定 D15（2026-09-27）**：允许 Dev 做**一次**「保型写入」探针（partial / merge / patch / 只写必要字段等）。**能保留 `sync.lastVersion` 原类型就修；做不到就停下不改**，把探针原始证据写进报告（后续裁决 = 「不修 + 留档」，由 Lead 写入 `docs/arc-contracts.md`）。

### 1.4 D14（2026-09-27）：文章 Publish 的「复制 vs 移动」口径

- 页面 Publish（`.aup/pages/admin/posts.aup:206`）只写 `posts/<slug>.json`，**源 `drafts/<slug>.json` 保留 `status: draft`** ⇒ **复制语义**；R9F 实测同一篇文章会同时留在「已发布」与「草稿」两组（[round-9-reverify.md](../test-reports/round-9-reverify.md) §5 观察 1）。
- CLI `node scripts/arcblog-lifecycle.mjs publish` 是**移动语义**：写 public 后 `arcDelete(privatePath(slug), instance)`（**`scripts/arcblog-lifecycle.mjs:470`**，PM 实测行号）。
- 现文案（`posts.aup:18` `admin-publish-msg`）：`en "This publishes the current draft record. Deleted records can be republished." / zh "这会发布当前草稿记录。deleted 状态记录也可以重新发布。"` —— **未说明「复制」、也未说明「源 draft 保留」**。
- **Lead 裁定 D14**：**保留**页面的「复制到公开」语义，但**必须在页面文案里写明这是复制而非移动**；**差异留档、不改 CLI**。

### 1.5 为什么三项要合成一个 REQ（而不是三个小任务）

1. **同一写范围、同一 Dev 批次**：媒体页、`pages.aup`（BUG-017）、`hub.aup`（BUG-016）、`posts.aup`（D14）全部在 `.aup/pages/**`，**同一时刻只能有一个 Dev 任务在写这批文件**（`roles/pm.md` §2 硬规则）；拆成三个任务会互相覆盖并由三次 `arc blocklet build` 各付一次成本。
2. **共享同一次实例会话与 `dist/` 构建**：媒体页验收要造索引/引用探针，BUG-016 要造 hub 探针，BUG-017 要造 page 探针，D14 要造 draft 探针 —— 都在同一次 `.gate-lock` 窗口内做，一次 build、一次源↔`dist` 核对。
3. **三条 P3 + 一条功能补全都不改变 CLI/AFS 记录形态**（D13 只要文案、D15 至多一次探针且失败即停、D14 只要文案），因此**可以整体不出 `scripts/**`**，不触发定向 live 轮次的最小面。

---

## 2. 范围

### 2.1 做

#### ① 媒体管理页补全（`.aup/pages/ops/media.aup`；清单第 102 行 🟡 → ✅ 候选）

| 组 | 条目 | 内容（**只做页面；数据面一律以 CLI 为权威**） |
| -- | ---- | -------------------------------------------- |
| **A** | **索引列表补字段** | 行内呈现每条索引的 **`id`/`title`、AFS `path`、`mimeType`、`size`、`createdAt`（相对时间，沿用既有 `time mode=display timeMode=relative`）**。`path` 是 spec「它在哪」的直接答案（**必须可见**，不得只放在 `title`）。 |
| **B** | **引用视图（按平台能力降级为 CLI 指引）** | 每行给出**可执行的引用查询命令**并用**该行真实值**插值，例如 `p "node scripts/arcblog-media.mjs refs --id ${entry.content.id}"`（`${entry.content.*}` 在文本节点求值，仓库既有写法）；卡片内给一条**常驻 dim 说明**：引用关系由 CLI 扫描 `posts/drafts/pages/page-drafts/heroes` 计算，页面只能读索引记录、**不做跨集合 join**，因此页面**不得**声称「这条有没有被引用」（除非已按 §2.1 ① F 的替代口径拿到数据）。 |
| **C** | **孤儿清单与清理入口（CLI 指引）** | 一张常驻卡片写明：`node scripts/arcblog-media.mjs orphans`（未引用记录清单）与 `node scripts/arcblog-media.mjs remove --id <id> [--force]`；并**如实写明三条语义**：① 被引用的媒体 `remove` 会被 CLI **拒绝**（`CONFLICT`），只有 `--force` 才覆盖；② `remove` 删的是**索引记录**，**不会删除二进制**；③ 清理前先 `refs --id <id>` 看清引用位置。 |
| **D** | **上传入口** | 使用平台原语 **`afs-dropzone`**（仓库既有 3 处**无参**用法即为范式），**不得**臆造上传 API、**不得**给它编造 prop。**必须实测**「上传后是否产生 `media/<id>.json` 索引记录」：在浏览器里上传一张测试图，前后各跑一次 `node scripts/arcblog-media.mjs list` 并记录原始输出与上传落点（`/blocklets/arcblog/users/<did>/media/…`）。**若索引记录不会自动产生**（预期如此：索引由 CLI 维护）：页面必须给一条常驻 dim 指引 `node scripts/arcblog-media.mjs add --path <afs-path> --id <id> [--mime …] [--size …]`，并**不得**声称「已索引」。 |
| **E** | **地址可见（spec「复制地址」的降级）** | 把 AFS `path`（及可得的公开 URL，如记录里没有就**不编**）以**可选中的完整文本**呈现 + `title` 承载完整值；控制台**没有剪贴板原语**（§25.1）⇒ **不做**复制按钮、不引入 `frame`/自定义组件（那是排队 #11 的评估项）。页面必须如实说明「手动选取复制」。 |
| **F** | **替代口径（仅在满足时可用）** | 若 Dev 能让页面**真实**呈现「引用数 / 孤儿状态」（例如记录里已有可读字段），必须给**可复现证据**（该字段从哪来、CLI 如何写入）。**一旦需要改 AFS 记录形态或 `scripts/**` → 立即停手上报**（REQ-008 §2.1 D 先例），不得擅自扩面。 |
| **G** | **i18n 与 UI 标准** | 新增文案一律走页级 `i18n {}`（en/zh），`arc dsl generate --write` 生成 locales（**不手改** `.aup/locales/**`）；内容列仍是**唯一滚动容器**（`view size={flex:1} style={overflowY:auto}`，UI 标准 §2.5/§8）；无硬编码颜色/字号；同屏 `primary` ≤ 1。 |
| **H** | **网格视图（spec §15.4 明文，按平台降级留档）** | spec 要求「列表与网格两种视图」，但 `afs-list layout=grid` **列数不可控**（固定 6 列，`columns=2` 被运行期忽略，`arc-contracts.md` 第 860 行）。**本轮不要求**实现第二视图；**必须**在页面常驻说明或回报里写明该降级结论（供 Lead 在 checklist 备注中如实记录）。 |

#### ② BUG-017（D13 选项 ①）：`?page=pages` Bring online 文案写明两步走

- 改点：`.aup/pages/admin/pages.aup` 第 **10** 行 `act-publish-msg`（**必改**），可一并调第 **11** 行 `act-publish-title`（如需）。
- 文案必须写明：**当公开副本已存在（例如由 CLI / root 授权写入的既有页面）时，平台的写入会被拒绝；请先点「Remove public copy」删除公开副本，再点「Bring online」**。en/zh 都要写。
- **保留平台的诚实拒绝**：不为该场景新增 overlay / worker / 侧车写入；`.aup/pages/admin/pages.aup:184` 的 `exec` 形态**保持**（`/.actions/write` 单写 + 诚实报错）。

#### ③ BUG-016（D15）：做**一次**「保型写入」探针，能保型就修，不能就停

- 对象：`.aup/pages/ops/hub.aup` 的 **Approve（`:147`）/ Reject（`:148`）** 两处重写（`delete + afterSuccess write`），值来自隐藏输入 `:157–161`（`eSyncLastVersion` 在 **`:159`**）。
- **做法**：在一次探针会话内尝试「保型写入」的候选形态（partial / merge / patch / 只写必要字段等），逐形态记录**原始命令与原始输出**（含平台拒绝的错误文本）。
- **成功判据**：探针点击后 `sync.lastVersion` 的**类型不变** —— JSON `null` 仍为 `null`、数字 `7` 仍为 number（且 `relation`/`removedAt`/`updatedAt` 等语义字段仍正确落库）。满足 → **修**，并把采用的写入形态写进回报。
- **失败处理**：**停下不改**（`hub.aup` 保持 R9F 之后的现状），把**全部**探针原始证据写进回报 → 后续由 PM/Lead 裁决 **「不修 + 留档」**（Lead 写 `docs/arc-contracts.md`）。
- **硬约束**：**只做这一次**；**不得**改 AFS 记录形态、**不得**改 `scripts/**`、**不得**新增 worker；**不得**为了碰对而反复试到超出「一次探针」的边界；**不得**用真实收录记录做实验（只造探针）。

#### ④ D14：页面 Publish 文案写明「复制而非移动」

- 改点：`.aup/pages/admin/posts.aup` 第 **18** 行 `admin-publish-msg`（**必改**），可一并调第 **17/19** 行 label/title 或草稿区加一条常驻 dim 说明。
- 文案必须写明三点：① 这是**复制到公开**（`posts/<slug>.json`），**源草稿记录保留**（仍留在草稿列表）；② 想移走源草稿请用 CLI；③ **CLI `publish` 是移动语义**（会删除源 draft）——页面与 CLI 的差异要如实说明。
- **不改 CLI**（`scripts/arcblog-lifecycle.mjs:470` 的删除保持原样），**不改**页面 Publish 的写入行为（仍是单写 `posts/`，无 delete 链）。

### 2.2 明确不做

1. **不改 `scripts/**`**（含 `arcblog-media.mjs`、`lib/media.mjs`、`arcblog-lifecycle.mjs`、`arcblog-network.mjs`、`arcblog-pages.mjs`）：CLI 侧已完整且语义正确。**判需改动 → 停手上报 PM/Lead**（会触发 `.gate-lock` + 定向单跑 live）。
2. **不改 AFS 记录 schema（`world/**`）、`blocklet.yaml` 权限表、链适配器、daemon 路由**；**不新增 AFS 集合**；不给 `media` / `hub/registrations` / `pages` 记录加派生字段。
3. **不做 page-owned overlay / CLI worker**（D13 已排除选项 ②）；**不接链 SDK**；**不新增导航节**（`media` 已在 `CONSOLE_SECTIONS`）。
4. **不臆造上传 API**：上传只用 `afs-dropzone`（无参用法）；`arc dsl explain` **不存在**（实测 `Unknown command: "dsl explain"`），核验渠道是 `arc dsl schema` / `docs/arc-contracts.md` §29 / 真实点击。
5. **不做剪切板/复制按钮**（无原语；排队 #11 单独评估）、**不引入 `frame` 自定义组件**。
6. **不改** `docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md` 状态列、`docs/ArcBlog-admin-ui-design.md`（属 UI/Lead）、`docs/arc-contracts.md`、`CLAUDE.md`、`.agents/skills/**`。
7. **不跑全量 `npm run test:live`**；**不跑** `arc dsl lint --fix`（会误删运行时寻址 id）。
8. **不碰真实数据**：`posts=3 / drafts=27 / hub/registrations=4` 等真实记录**不得**被探针动作改写或删除；BUG-016 只造探针，BUG-017 的复现探针必须是新造的 `qa-r10-*` 记录。
9. **不做**像素级视觉走查（排队 #5）、**不做** Agent 目录核对门（排队 #8）、**不做**标签规范化（排队 #9）。
10. **不修**任何 REQ-010 范围内的 UI 标准条目（`docs/ArcBlog-admin-ui-design.md` 属 UI；Dev 越界即停）。

---

## 3. 验收标准

> **写实例纪律（强制）**：任何真实点击 / 上传 / `arc afs` 写入前，先在 `docs/team/.gate-lock` 写一行 `owner + 时间 + 用途`；跑完**删除锁**并**逐条清理探针记录**；回报必须含「实例零残留」复核输出（`media count`、`hub/registrations=4`、`posts=3 / drafts=27`、探针 `present?` 全 false）。
> **身份来源必须在回报里写明**（沿用本机共享调试 Chrome / CDP 9333 登录态时必须注明）。
> **证据三类分开标注**：**浏览器实测** / **静态复核** / **受限未验证**（不得把静态复核写成实测）。

**A0 开工前基线（只读，可原样重跑；PM 2026-09-28 实测）**

```bash
node scripts/arcblog-media.mjs list      # {"ok":true,…,"count":0,"media":[]}
node scripts/arcblog-media.mjs orphans   # {"ok":true,"count":0,"total":0,"orphans":[]}
node scripts/arcblog-media.mjs refs      # {"ok":false,"code":"VALIDATION",…}  [exit=1]
grep -c 'afs-dropzone' .aup/pages/ops/media.aup        # 0（当前无上传入口）
grep -n 'act-publish-msg'  .aup/pages/admin/pages.aup  # :10（BUG-017 改点）
grep -n 'admin-publish-msg' .aup/pages/admin/posts.aup # :18（D14 改点）
grep -n 'eSyncLastVersion' .aup/pages/ops/hub.aup      # :159（BUG-016 值来源）
arc dsl schema --json                    # afs-dropzone 在 primitives 里、无 prop 元数据（不得编造 prop）
```

**A1 通用门（必过）**

```bash
arc dsl validate --json                          # "issues": []
npm test                                         # 快层 28/28 pass, exit 0（不写实例）
node scripts/arcblog-console-nav.mjs --check     # {"ok":true,"action":"check","pages":17}（不新增导航节）
arc dsl generate --check                         # 无漂移
arc blocklet build                               # 改了 .aup/** 必跑；随后逐文件 diff -q 源 / dist/
grep -rnE '#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?' .aup/pages/ | grep -v '\.json' || echo "no hardcoded color"
```

**A2 媒体索引列表补字段（① A；浏览器实测 + CLI 对照）**

```bash
# 0) 写锁
printf 'Dev <name> <ISO8601> — REQ-009 media probes\n' > docs/team/.gate-lock
# 1) 造两条探针：一条「被引用」、一条「孤儿」
node scripts/arcblog-media.mjs add --path /blocklets/arcblog/users/qa-r10/media/qa-r10-ref.png \
  --id qa-r10-ref --mime image/png --size 1234 --width 1200 --height 630 --uploader-did did:key:zQaR10
node scripts/arcblog-media.mjs add --path /blocklets/arcblog/users/qa-r10/media/qa-r10-orphan.png \
  --id qa-r10-orphan --mime image/png --size 4321
# 2) 造一条引用 qa-r10-ref 的草稿（引用判定 = 记录序列化文本包含该路径）
#    drafts/qa-r10-ref-draft.json：coverImage = /blocklets/arcblog/users/qa-r10/media/qa-r10-ref.png
node scripts/arcblog-media.mjs list              # count 2
node scripts/arcblog-media.mjs refs --id qa-r10-ref     # count 1（post (draft)）
node scripts/arcblog-media.mjs orphans                  # count 1（只含 qa-r10-orphan）
```

- 页面断言（`?page=media&locale=en`，admin 会话；把 `PROBE` 换成探针 id；**原始 JSON 必须贴进报告**；若实测 DOM 与下列选择器不符，**报告实测选择器**而不是判「通过」）：

```js
(() => {
  const PROBE = 'qa-r10-ref';
  const rows = [...document.querySelectorAll('div.aup-view[data-layout="row"]')];
  const mine = rows.map(r => r.textContent || '').filter(t => t.includes(PROBE));
  const text = mine[0] || '';
  return {
    probeRows: mine.length,                                  // 必须 >= 1
    hasId: text.includes(PROBE),                             // true
    hasPath: text.includes('/blocklets/arcblog/users/'),     // true（spec「它在哪」）
    hasMime: /image\/png/.test(text),                        // true
    hasSize: /1234/.test(text),                              // true
    hasTime: !!document.querySelector('time'),               // true（既有相对时间）
    // ⚠️ R10 修订（BUG-019，PM 2026-09-28）：本行选择器与平台渲染不符——实现渲染的是
    //    `div.aup-time.aup-time-display`（无 `<time>` 标签，实测 `timeTags=0`，文本 `1 minute ago`）。
    //    复验请改用 §3.1 的修订口径，**不得**据本行判「相对时间缺失」（实现正确，勿改实现）。
    rowsTextSample: text.slice(0, 300),
  };
})()
```

- 期望：`probeRows >= 1` 且 `hasId/hasPath/hasMime/hasSize/hasTime` 全为 `true`；**`path` 可见**（不是只藏在 `title`）。

**A3 引用视图与孤儿入口（① B/C；CLI 输出与页面文案逐条对照）**

```bash
node scripts/arcblog-media.mjs refs --id qa-r10-ref       # {"count":1,"refs":[{"kind":"post (draft)","slug":"qa-r10-ref-draft",…}]}
node scripts/arcblog-media.mjs orphans                    # 只列 qa-r10-orphan
node scripts/arcblog-media.mjs remove --id qa-r10-ref     # 负面：被引用 → CONFLICT, exit 1（无 --force）
```

- 页面断言（同一页）：

```js
(() => {
  const body = document.body.innerText;
  return {
    refsCommand: body.includes('refs --id qa-r10-ref'),          // 每行给出真实 id 的 CLI 指引
    orphansCommand: body.includes('media.mjs orphans'),          // 孤儿清单入口
    removeCommand: body.includes('media.mjs remove --id'),       // 清理入口
    saysRecordOnly: /索引记录|index record/i.test(body),          // 删的是索引、不动二进制
    saysRefuseIfReferenced: /拒绝|CONFLICT|--force/.test(body),   // 被引用时拒绝 / --force 语义
    claimsPerRowStatus: /未被引用|no references|orphan/i.test(body), // 若 true 必须能给出数据来源，否则见下
  };
})()
```

> ⚠️ **R10 修订（BUG-020，PM 2026-09-28）**：本行的 `body = document.body.innerText` 会把**常驻卡片的 CLI 指引文案**（`Unreferenced media & cleanup` / `no references`）一并命中 → 对被引用的 `qa-r10-ref` 也返回 `true`（**假阳性**），N1 判据因此失去鉴别力。复验请改用 **§3.1 的修订口径（只看行文本）**；`claimsPerRowStatus` 的 `true` **不再构成**「页面按行声称状态」的证据。

- 期望：`refsCommand / orphansCommand / removeCommand / saysRecordOnly / saysRefuseIfReferenced` 全为 `true`。
- **负面用例 N1（不得凭空断言）**：`qa-r10-ref` 是**被引用**的，页面**不得**把它标成「未被引用 / 孤儿」。若 `claimsPerRowStatus === true`：Dev 必须给出该状态的数据来源（记录字段或 CLI 写入）；**拿不出来 → 删除该断言、改回 CLI 指引**（即 §2.1 ① F 的替代口径不成立）。**⚠️ R10 修订（BUG-020）**：判定以**逐行文本**为准（见 §3.1），`claimsPerRowStatus` 的假阳性不再作为触发条件。
- **负面用例 N2**：`remove --id qa-r10-ref` 不带 `--force` 必须 `CONFLICT`/exit 1，且记录**仍在**（`list` count 仍含它）——证明「有引用就拦」的 CLI 语义未被页面绕过。

**A4 上传入口（① D；**必须实测**，不得只写「已加 dropzone」）**

```bash
grep -c 'afs-dropzone' .aup/pages/ops/media.aup     # >= 1
grep -nE 'afs-dropzone[[:space:]]+[^[:space:]]' .aup/pages/ops/media.aup || echo "prop-less（与既有范式一致）"
node scripts/arcblog-media.mjs list                 # 上传「前」的 count（记录原始 JSON）
# …浏览器 admin 会话在 ?page=media 上传一张测试图（拖拽或点选）…
node scripts/arcblog-media.mjs list                 # 上传「后」的 count（记录原始 JSON）
```

- 必须记录的原始证据：**上传前后的 `list` 输出**、**上传落点**（`/blocklets/arcblog/users/<did>/media/…` 或实测到的其它路径）、**DOM 里 dropzone 节点的实测选择器/类名**（例如 `[...document.querySelectorAll('*')].filter(el => /drop/i.test(el.className||'')).map(el=>el.className)` —— 不预设类名）。
- 期望（二选一，**必须在报告里写明走的是哪一支**）：
  - **(D-1) 上传不产生索引记录**（预期分支）→ 页面存在常驻 dim 指引 `node scripts/arcblog-media.mjs add --path … --id … …`，且页面**不声称**该上传已被索引；报告写明实测到的落点路径。
  - **(D-2) 上传产生索引记录** → 报告给出 `list` 前后差异的原始 JSON（新记录 id 与字段），页面文案不得与实测矛盾。
- **禁止**：给 `afs-dropzone` 编造 prop、写自定义上传/写盘 `exec`、声称「上传即可见」而无 `list` 证据。

**A5 BUG-017 / D13 —— 文案写明两步走 + 平台拒绝保留（浏览器实测）**

```bash
# 0) 写锁（与 A2 同一窗口即可，锁内容注明用途）
# 1) 造 root 授权公开副本探针（AFS 直写，模拟旧 CLI/root 记录）
#    pages/qa-r10-pageprobe.json：{slug,title:'QA R10 page probe',status:'online',body,…}
# 2) ?page=pages&locale=en → 该行 Take offline（成功，写 page-drafts/）→ 点 Bring online
```

- 期望 1（**文案**）：该行 Bring online 的**确认框文案**（页面内 modal 文本）与离线区常驻说明里，**en/zh 都**写明「公开副本已存在 / 由 CLI·root 授权写入时，平台会拒绝，请先 Remove public copy 再 Bring online」。原始 `modalText` 必须贴进报告。
- 期望 2（**保留诚实拒绝**）：第一次 Bring online **被平台拒绝**且**没有写入**（toast 含 `without a recoverable authority sidecar`；`pages/qa-r10-pageprobe.json` 的 `updatedAt` 与 seed 相同）。
  > ⚠️ **R10 修订（BUG-018，PM 2026-09-28）**：该期望是**环境相关的历史观察**（R9F 17:36Z 由**重启前**的 daemon 服务时观测到），在 R10 同实例 / 同 admin 会话 / 同类 seed 下**不可复现**（写入成功）。**复验口径以 §3.1 为准**：本项验收 **“文案已备 + 未做 overlay/worker”**，**不把「平台必然拒绝」作为通过条件**；原措辞与 R9F 历史结论保留不改写。`arc-contracts.md` §29.2 的适用条件更正属 **Lead 写范围**（`docs/team/bugs/BUG-018-…md`）。
- 期望 3（**两步走可闭环**）：点 **Remove public copy**（记录被删）→ 再点 **Bring online** → 成功，记录字段为真实值且 `createdAt` 保留。
- 期望 4（**未做 overlay/worker**）：`git diff --name-only -- scripts world blocklet.yaml` **为空**；`node scripts/arcblog-console-nav.mjs --check` 仍 `pages:17`；`git diff -- .aup/pages/admin/pages.aup` 只有文案/i18n 行（无新增 `exec` 通道、无新增 AFS 集合）。
- 收尾：删除 `pages/qa-r10-pageprobe.json`、`page-drafts/qa-r10-pageprobe.json`；`pages/` 复原到 1 条真实记录。

**A6 BUG-016 / D15 —— 一次保型探针（三态结论，浏览器实测 + AFS 直读）**

```bash
# 0) 写锁（内容注明「BUG-016 D15 保型探针」）
# 1) 造两条探针（sync.lastVersion 分别为 JSON null 与 number 7）
#    hub/registrations/qa-r10-hubprobe-null.json  {"status":"registered","relation":"applied","sync":{…,"lastVersion":null}}
#    hub/registrations/qa-r10-hubprobe-num.json   {…,"lastVersion":7}
# 2) ?page=hub&locale=en 分别对该两行点 Approve（真实点击 + 确认框）
# 3) 读回并打印类型
node -e "…read hub/registrations/qa-r10-hubprobe-null.json … console.log(JSON.stringify(v.sync), typeof v.sync.lastVersion)"
node -e "…read hub/registrations/qa-r10-hubprobe-num.json  … console.log(JSON.stringify(v.sync), typeof v.sync.lastVersion)"
```

- **成功（修）**：`typeof lastVersion === 'object'`（JSON `null`）与 `'number'`（`7`）**均未被改型**，且 `relation` 等语义字段正确落库 → 保留修复，并把采用的**写入形态**写进回报。
- **失败（停手不改）**：记录**每一个**尝试形态的原始命令/原始输出，含平台拒绝文本（参考 `arc-contracts.md` §29.2：`replace`/`create`/`update`/`tree-merge`/`patch` 对 CLI/root 授权既有记录全部被拒）。**不保留任何保型相关代码改动**（`git diff` 中 `hub.aup` 与 R9F 之后的差异必须为空或仅为无歧义的等价写法）。报告结论写「**不改，留档**」。
- **负面/边界**：真实 4 条 `hub/registrations/*.json` 的 `lastVersion` 类型**不得**被本次探针改写（探针前后各打印一次 4 条类型作为对照）。
- **唯一性**：本次探针为 D15 授权的**一次**；不得为碰对形态反复扩大尝试范围。

**A7 D14 —— Publish 文案写明复制语义 + CLI 不动（浏览器实测）**

```bash
grep -n 'admin-publish-msg' .aup/pages/admin/posts.aup     # :18 已改写（en/zh 均含"复制/保留"与 CLI 移动差异）
git diff --name-only -- scripts                            # 必须为空（CLI 未动）
```

- 页面断言（`?page=posts&locale=en` 草稿行点 Publish → 读 modal 文本）：

```js
(() => {
  const t = document.body.innerText;                     // 或 modalText（确认框）
  return {
    saysCopy: /copy|复制/i.test(t),
    saysDraftStays: /draft (record )?(stays|remains)|草稿.*保留|保留.*草稿/i.test(t),
    saysCliMoves: /CLI|arcblog-lifecycle/i.test(t),
  };
})()
```

- 期望：三条全为 `true`（en/zh 各验一次）。
- **负面/事实复核**：造一条 draft 探针 → 页面真实点击 Publish → `posts/qa-r10-pubprobe.json` 存在且字段为真实值 **且** `drafts/qa-r10-pubprobe.json` 仍 `status: draft`（**源草稿保留**）；CLI `publish` 的移动语义**只在报告里引用** `scripts/arcblog-lifecycle.mjs:470` 的既有代码与 R9F 实测，**不重复点击真实文章**。
- 收尾：删除两条探针记录，实例回 `posts=3 / drafts=27`。

**A8 回归、写范围与受限项（如实标注，不得推断为通过）**

```bash
arc dsl validate --json                     # issues []
npm test                                    # 28/28（含 guest 权限矩阵：media 仍 admin-only）
node scripts/arcblog-console-nav.mjs --check # pages:17
arc dsl generate --check                    # 无漂移
arc blocklet build                          # 改了 .aup/**；随后 diff -q 源↔dist 逐文件 same
git diff --name-only                        # 仅：.aup/pages/{ops/media.aup,ops/hub.aup,admin/posts.aup,admin/pages.aup} + .aup/locales/** + .aup/{app,wrapper}.json + dist/**（build） + docs/team/**（QA/PM）
git diff --name-only -- scripts world blocklet.yaml   # 空
```

- **guest 越权用例（必须有一条，自动化 + DOM 双证）**：
  1. **自动化**：`npm test` 的 `scripts/arcblog-permissions.test.mjs` 断言 `media` 在 `ADMIN_PATHS`（HTTP 读被拒）且 replicated 表中 `minRole/readRole = admin`；
  2. **DOM（无 cookie 访客）**：`?page=media` 访客视图 **不含**探针 id / AFS 路径 / 索引列表内容，只出现登录门（`Sign in as an administrator…`）；原始 `innerText` 摘录贴进报告。
- **定向 live（仅当触及 CLI / AFS 记录形态 / 链适配器 / daemon 路由）**：本 REQ 预期**不改 CLI**，默认**不跑**定向 live 文件；**若** D13/D15/D14 的实测过程中确实改到了记录形态或 CLI → **先停手上报**，再由 Lead 决定是否 `npm run test:file -- scripts/{arcblog-media,arcblog-network,arcblog-pages}.test.mjs`（先在 `.gate-lock` 写 owner + 时间）。**不跑全量 `npm run test:live`。**
- **受限未验证（若发生必须逐条登记 + 原因）**：`afs-dropzone` 上传的 DOM 选择器/落点若无法确定、`?page=media` 空态（无记录）与有记录态是否都验证、`Remove public copy` 的 `path=` 属性写法是否复跑等。

---

### 3.1 结果记录（轮末回填；PM / Dev / QA 各自写结论）

> **Round 10 结论（PM，2026-09-28 轮末）**：本 REQ **交付通过 + QA-005 独立复验放行**（[`test-reports/round-10.md`](../test-reports/round-10.md) §9：**`VERDICT=pass, BLOCKING=0`**）。Dev 自述与 QA 独立证据一致（QA 自造 `qa-r10-*` 探针、自己点击、自己复核 AFS/CLI，不采信自述）。**证据三类分开标注**：**浏览器实测** = A2/A3/A5/A6/A7 + 负面用例 N1–N3；**静态复核** = A1/A8 + 改动面归因 + i18n 键集；**受限未验证** = A4 的**上传行为本身**（CDP 合成/可信拖拽均未触发平台 drop handler，属工具限制，非实现缺陷）。

**PM 在本轮内执行的判据修订（均为「本轮修·判据文案」，不涉及实现）**

| 缺陷 | 修订 |
| ---- | ---- |
| **BUG-019（P3）** | A2 的 `hasTime: !!document.querySelector('time')` 与平台渲染不符（实测无 `<time>`，是 `div.aup-time.aup-time-display`）。**修订口径**：`hasTime := [...document.querySelectorAll('.aup-time.aup-time-display')].some(el => el.textContent.trim().length > 0)`，**或**判 `文字含 /ago|前/`。A2 原文已加指向本节的修订说明 |
| **BUG-020（P3）** | A3 的 `claimsPerRowStatus` 用 `document.body.innerText` → 被常驻卡片的 CLI 指引文案命中（假阳性）。**修订口径**：只看**行文本** —— `rows.map(r=>r.textContent).some(t=>/未被引用|no references|orphan/i.test(t))` 必须为 `false`（N1 仍成立：页面按行不声称状态）；A3 原文已加修订说明 |
| **BUG-018（P3）** | A5 **期望 2** 由「平台必然拒绝」重述为「**文案已备 + 平台行为不作断言**」（环境相关的历史观察；R9F 由重启前的 daemon 观测到，R10 不可复现）。期望 1/3/4 不变；`arc-contracts.md` §29.2 的更正属 **Lead** |

| 验收项 | 结论 | 证据 |
| ------ | ---- | ---- |
| A1 通用门 | **通过**（静态复核） | `arc dsl validate --json` → `"issues": []`；`npm test` → **28/28**；`console-nav --check` → `pages:17`；`arc dsl generate --check` → 0 file；源↔`dist` 逐文件 `same`；无硬编码颜色（round-10.md §3-A） |
| A2 索引列表字段 | **通过**（浏览器实测；`hasTime` 断言缺陷 → BUG-019，已修订判据） | `probeRows≥1`、`hasId/hasPath/hasMime/hasSize` 全 `true`；`path` 是可见 `div.aup-text`（`title` 承载全值，非只藏 `title`）；相对时间渲染为 `div.aup-time.aup-time-display`（round-10.md §3-B1） |
| A3 引用/孤儿入口 + N1/N2 | **通过**（浏览器实测 + CLI；`claimsPerRowStatus` 假阳性 → BUG-020，已修订判据） | `refsCommand/orphansCommand/removeCommand/saysRecordOnly/saysRefuseIfReferenced` 全 `true`；**逐行无状态声称**（`hasOrphanWord:[false]`）；N2 `remove --id qa-r10-ref`（无 `--force`）→ `CONFLICT` exit 1 且记录仍在（§3-B2/B3 + §4-N2） |
| A4 上传入口（实测分支 D-1/D-2） | **部分通过 + 上传行为受限未验证**（浏览器实测 + 受限） | 页面侧：`afs-dropzone` 无参（与 `compose.aup:154` / `compose-edit.aup:77` / `heroes.aup:160` 既有范式一致）、`add` CLI 指引常驻、页面**未**声称「已索引」；`list` 上传前 `count: 2` / 后 `count: 2`（两次 CDP 驱动均未触发 handler）→ **无法判定 D-1/D-2，也无法给出实测落点路径**（如实登记，见 round-10.md §7-1）；后续由 [REQ-011](REQ-011-media-upload-observability-and-copy-hygiene.md) 补可复现观测 |
| A5 BUG-017（D13 文案 + 拒绝保留） | **期望 1/3/4 通过；期望 2 未复现（→ BUG-018，判据已由本节重述）**（浏览器实测 + 静态复核） | en/zh modal + `offline-hint` 均写明「先 Remove public copy 再 Bring online」；两步走闭环成功且 `createdAt` 保留；`scripts/world/blocklet.yaml` 零改动、`pages.aup` 仅 2 行 i18n、`:184` `exec` 形态未动（§3-C1/C2 + §3-A） |
| A6 BUG-016（D15 保型探针 成功/停手） | **通过（走「修」分支，独立复验属实）**（浏览器实测 + AFS 直读） | `tree-merge` 只写 `{relation, removedAt, updatedAt}`：null 探针 → `lastVersion` 仍 `null`（`typeof object`）、`relation→indexed`；数字探针 → 仍 `7`（`typeof number`）、`removedAt` 落库；真实 4 条记录类型前后均 `null/null/7/1`（§3-D） |
| A7 D14 Publish 文案 | **通过**（浏览器实测 + CLI 对照） | en/zh modal + `drafts-note` 写明「复制到公开 posts/、源草稿保留、CLI `arcblog-lifecycle.mjs publish` 是移动语义」；真实点击后 `posts/qa-r10-pubprobe.json{status:published}` 与 `drafts/qa-r10-pubprobe.json{status:draft}` **并存**；`git diff -- scripts` 为空（§3-E） |
| A8 回归/范围/guest 越权 | **通过**（静态复核 + DOM） | 门全绿；`git diff --name-only -- scripts world blocklet.yaml` 空；incognito 访客 `?page=media` 只见登录门（`leaks: []`）；`npm test` 的 guest 权限矩阵断言 `media` 仍 admin-only（§3-A + §4-N3） |

**实例纪律**：写锁 + 10 条探针逐条清理，实例回 baseline（`posts=3 / drafts=27 / pages=1 / page-drafts=0 / hub/registrations=4 / media=0 / node=32`，`probe residue=[]`），真实 4 条 hub 记录 `lastVersion` 类型未变；锁已删除（round-10.md §8）。

---

## 4. 依赖

- **前置裁定（已解除，无需再等）**：Lead **D13 = 选项 ①（文案）**、**D15 = 一次保型探针（失败即停）**、**D14 = 保留复制语义 + 文案写明、不改 CLI**（均 2026-09-27）。三者未裁决前本 REQ 不得开工——现已全部裁定，故 Round 10 直接开工。
- **上游产物**：
  - [`bugs/BUG-016-hub-sync-lastversion-null-to-empty-type-drift.md`](../bugs/BUG-016-hub-sync-lastversion-null-to-empty-type-drift.md)、[`bugs/BUG-017-pages-bring-online-legacy-root-authority-refused.md`](../bugs/BUG-017-pages-bring-online-legacy-root-authority-refused.md)；
  - [`test-reports/round-9-reverify.md`](../test-reports/round-9-reverify.md) §3-B/§3-F/§5/§7；
  - [`requirements/REQ-008-console-inline-write-evaluation.md`](REQ-008-console-inline-write-evaluation.md)（模板求值与「判需改记录形态即停手上报」先例）；
  - `docs/arc-contracts.md` **§29**（`§29.1` 求值上下文 / `§29.2` 既有记录写入需可恢复 sidecar / `§29.3` `afterSuccess` 链）；`docs/arc-contracts.md` §25 能力表第 **847 / 860** 行（grid）；`docs/persistence.md:18/29`。
- **下游（复验）**：**QA-005（`task-23`，`blocked_by task-21 + task-22`）** 必须独立重跑 A2–A8（不采信 Dev 自述）：自造 `qa-r10-*` 探针、自己点击、自己复核 AFS + `arcblog-media.mjs list/refs/orphans` 输出；报告落 `docs/team/test-reports/round-10.md`；发现缺陷落 `docs/team/bugs/BUG-018+`。
- **串行约束**：与 REQ-010（`docs/ArcBlog-admin-ui-design.md`）**写范围不重叠 → 可并行**；本轮**只有一个 Dev 批次**（`task-21`），故 `.aup/pages/**` 无内部竞争。
- **外部条件**：admin 会话（本机共享调试 Chrome / CDP 9333 登录态，须在报告注明身份来源）；可写 dev 实例；`docs/team/.gate-lock`；浏览器仅用于验收要求 DOM 断言/真实点击的项（A2–A7 + guest 越权）。

---

## 5. 涉及写范围

| 路径前缀 | 用途 | 归属 |
| -- | -- | -- |
| `.aup/pages/ops/media.aup` | ① 媒体页补全（索引字段 / 引用指引 / 孤儿指引 / `afs-dropzone` / 地址可见 / 降级说明） | Dev |
| `.aup/pages/admin/pages.aup` | ② BUG-017：`act-publish-msg`（`:10`，可含 `:11`）写明两步走；**不动** `:184` 的 exec 形态 | Dev |
| `.aup/pages/ops/hub.aup` | ③ BUG-016：**仅当** D15 探针证明可保型时才改（`:147/148` ± 隐藏输入 `:157–161`）；做不到则**不改** | Dev |
| `.aup/pages/admin/posts.aup` | ④ D14：`admin-publish-msg`（`:18`，可含 `:17/:19` 或草稿区常驻说明） | Dev |
| `.aup/locales/{en,zh}.json`、`.aup/app.json`、`.aup/wrapper.json` | `arc dsl generate --write` 生成（**不手改**；新键必须声明在所属页 `i18n {}`） | Dev（生成） |
| `dist/**` | `arc blocklet build` 生成（**不手改**） | Dev（生成） |
| `docs/team/test-reports/**`、`docs/team/bugs/**` | QA-005 复验报告与新增 BUG | QA |
| `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 看板 / 本 REQ / 轮次日志 | PM |
| `docs/ArcBlog-admin-ui-design.md` | **本 REQ 不改**（属 REQ-010 / UI） | UI |
| `scripts/**`、`world/**`、`blocklet.yaml`、`.web/**`、`seed/**`、`agents/**` | **本 REQ 不改**（判需改动即停手上报） | 越界即停 |
| `docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md`、`docs/arc-contracts.md`、`CLAUDE.md`、`.agents/skills/**` | **本 REQ 一律不改** | 人类 / Lead |

**边界**：**不臆造 ARC API**（spec §150）——上传只用 `afs-dropzone`（无参、仓库既有范式）；能力核验渠道 = `arc dsl schema` / `arc-contracts.md` / 真实点击；`arc dsl explain` **实测不存在**（`Unknown command: "dsl explain"`），不得据此编造别的命令。平台不支持的能力走**如实降级 + CLI 指引 + 登记**路径，不猜、不谎报「已验证」。
