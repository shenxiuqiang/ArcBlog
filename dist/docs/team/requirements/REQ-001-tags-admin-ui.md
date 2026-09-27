# REQ-001 — 控制台标签管理界面（Taxonomy: Tags）

**元信息**：REQ-001 ｜ 对应 spec 章节：**§15.4 内容 Content → 分类与标签 Taxonomy** ｜ checklist 行：第 103 行「分类与标签管理界面 🟡」（备注「分类在 `heroes-admin.json`；标签管理界面缺失」）｜ 优先级：**P1（Round 6 🟥）** ｜ 提出轮次：**Round 6** ｜ 负责角色：**Dev** ｜ 状态：已派发（REQ 任务 `task-1` PM；实现任务 `task-3` Dev；验证任务 `task-4` QA）

---

## 1. 背景

- spec §15.4「分类与标签 Taxonomy」把二者定义为两种不同的治理对象：**「分类是白名单（影响发布校验），标签是自由词」**，并明确要求 **「界面必须区分这两者，不混在一个表格里」**；标签侧要求 **「使用计数、合并重命名、清理零引用标签」**。
- checklist 第 103 行当前为 🟡：「分类在 `heroes-admin.json`；标签管理界面缺失」。分类管理界面已存在（`?page=categories`，配套 `scripts/arcblog-category.mjs` 的 `add`/`usage`/`merge`/`remove`），标签只有 CLI，控制台没有入口。D 组共 16✅ / 8🟡，本条是其中「CLI 已通、界面缺失」的典型项，也是本轮 Round 6 的入选理由。
- CLI 已有能力（2026-09-27 在本仓库实测）：
  - `node scripts/arcblog-tags.mjs list` → `{"ok":true,"count":3,"tags":[{"tag":"guide","count":1},{"tag":"identity","count":1},{"tag":"product","count":1}]}`（排序：计数降序，同计数按名字升序）；
  - `node scripts/arcblog-tags.mjs merge --from <tag> --to <tag>` → 跨 `posts/` 与 `drafts/` 改写所有引用该标签的记录，每篇 `version` +1、`contentHash` 重算（`scripts/lib/content-scan.mjs` 的 `scanPosts` / `rewritePost` / `writePost`）；
  - 负面行为实测：缺参数或 `--from === --to` → exit 1 + stderr `{"ok":false,"code":"VALIDATION",…}`；**不存在的标签** → exit 0 + `{"ok":true,"action":"tag-merge","migrated":0,"posts":[]}`（幂等，不是错误）。
- 数据模型事实：标签只存在于 post 记录的 `tags` 字段，**没有注册表**（`scripts/arcblog-tags.mjs:10` 注释：「Zero-reference tags cannot exist by construction — `list` is the audit」）；标签规范化由 `normalizeTag()` 完成（小写、去非法字符、空白/连字符→下划线、去首尾下划线）。
- 控制台是**一页一节**：每个 section 走 `?page=<name>` 深链，侧栏由 `scripts/console-nav.mjs`（唯一菜单模型 `CONSOLE_MENU`）+ `node scripts/arcblog-console-nav.mjs`（生成器）写入每一个控制台页面，`--check` 是漂移门（已在 `npm test` 内）。
- 上游设计标准：`docs/ArcBlog-admin-ui-design.md`（§4.4 空状态、§4.6 确认与打断、§9 页面验收清单）。本轮 `task-2`（UI-001）负责 console 设计令牌与本轮界面走查，产物在 `docs/team/design/`。

## 2. 范围

### 2.1 做

1. **入口**：控制台新增标签管理界面，深链固定为 **`?page=tags`**；侧栏位置在「站点」组内、**紧邻「分类」之后**（`CONSOLE_MENU` 是唯一菜单来源，菜单项 `wrapper.nav-tags`）。页头按 UI 标准给「标题 + 一句话说明」（说明标签是自由词、可随时合并收敛），至多一个主操作。
2. **列表 + 引用计数**：逐行显示标签名（落库形式：小写 + 下划线，如 `req001_old`）与**引用计数**（含已发布 `posts/` 与草稿 `drafts/` 两侧）；计数必须来自与 CLI `list` 相同的计算路径，不得在页面里另算一套或手填。
3. **可见引用**：能看出某个标签被哪些文章使用（至少给出文章 slug 列表或数量 + 可跳转的具体条目）。
4. **重命名 / 合并**：提供 `from`（已存在的标签）+ `to`（目标标签名）的表单：目标名不存在 = **重命名**，已存在 = **合并**；提交后计数与引用列表随之更新，结果与等价 CLI 命令一致（`version` +1、`contentHash` 重算的语义不变）。合并属不可逆动作，按 UI 标准 §4.6 给确认对话框并说明后果。
5. **空状态**：实例上没有任何标签时，显示 UI 标准 §4.4 的「现状 + 价值 + 下一步动作」引导（含可点动作：去写文章 / 去设置标签），不得只渲染运行时默认的英文 "No data"。
6. **数据新鲜度**：CLI 侧改了标签之后，界面必须能反映（订阅刷新或显式刷新入口二者至少其一）。若界面读的是派生快照，快照必须带生成时间，且该时间在界面上可见。
7. **i18n**：新增页面 key 采用 **page-scoped 平铺点号**形式（`<page>.<key>`，写在页面 `i18n {}` 块里，由 `arc dsl generate --write` 以 merge 语义落入 `.aup/locales/*.json`）；侧栏菜单串 `wrapper.nav-tags` 是唯一手写项（写进 `.aup/wrapper.aup` + 手工补 locale 字符串）。
8. **单一改写实现**：控制台发起的重命名/合并与 CLI `merge` 必须走同一实现路径，不允许出现两套改写逻辑导致 `version`/`contentHash` 分叉。若平台限制使页面只能「写 intent → 本地 CLI/worker 执行」，必须在界面上如实标注（与 `?page=factory` 对 `arcblog-chain-worker.mjs` 的标注同一诚实标准），不能让运营者以为点击即完成。

### 2.2 明确不做

1. **不做「删除单个标签（从所有文章移除）」的独立动作。** 理由：标签是自由词、无注册表，零引用标签按构造不存在（`scripts/arcblog-tags.mjs:10`），所以 spec §15.4 的「清理零引用标签」在现有模型下目标集合是空的；收敛场景由 2.1.4 的「合并 / 重命名」覆盖，真要逐篇移除时走既有的 `?page=compose-edit`。**spec 章节：§15.4**。本项同时进 `backlog.md` 的 ⛔ 表（理由 + spec 章节）。
2. 不改 post schema，不新增「标签注册表」作为第二真相来源（若实现派生投影，它必须可随时从 post 重建，且不得被当作权威记录）。
3. 不做标签别名（alias）、父子层级、标签多语言、按标签的权限/可见性、自动打标（AI/规则）——spec §15.4 未要求，属 V2+。
4. 不改发布校验：tags 仍为 lowercase_underscore、最多 10 个（见 `CLAUDE.md`「内容模型」），不新增「标签非法即阻断发布」规则。
5. 不改分类管理界面与分类 CLI 的行为；本轮只保证两者在界面上「不混在一个表格里」。
6. 不做标签列表的自定义排序/分页/搜索策略（沿用 CLI `list` 的排序语义：计数降序、同计数按名字升序）。
7. 不碰链上、Hub 索引、`node.key`、`.env.local`；不碰 UI-001 的写范围（`.web/**`、`logo.svg`、`docs/team/design/**`）。

## 3. 验收标准

> 每条都是**可直接复制粘贴的命令**或**可观察行为**。命令均在 `/Users/shenxiuqiang/workspace/ArcBlog` 下执行。界面条目以管理员身份访问 `http://arcblog.localhost/?page=tags`（若 Dev 的实际 URL 不同，必须在回报里写明）；匿名身份断言见 A10。

**A0 数据准备（可复现探针）**

```bash
SLUG="req001-tag-probe-$(date +%s)"
node scripts/arcblog-lifecycle.mjs draft --title "$SLUG" --author-did did:key:zTest --body "tag probe" --tags "Req001 Old,req001_other"
node scripts/arcblog-tags.mjs list
```

期望：`list` 输出含 `{"tag":"req001_old","count":1}`——证明输入 `Req001 Old` 被规范化为 `req001_old`。

**A1 主质量门**：`arc dsl validate --json` → 输出中 `"issues": []`（空数组）。

**A2 快层门**：`npm test` → exit 0，fast tier 全绿（内含 `arc dsl generate --check` 漂移门与死 locale key 门）。

> **验收路径说明（PM 于 `task-3` 交付后补充，2026-09-27）**：本页采用 **intent 队列 + 本机 CLI worker** 的实现（REQ §2.1.8 允许的路径）。因此：
> - 界面提交重命名/合并/刷新 → 写 `tags/intents/` 并渲染队列状态（`pending` / `failed` / `noop` / `done`）；**落库由本机执行 `node scripts/arcblog-tags.mjs apply`（或 `watch`）完成**，界面已如实标注执行者（`worker-note`）。
> - A3 的前置是投影刷新：`node scripts/arcblog-tags.mjs project`（或界面「刷新」意图 + `apply`）。
> - A4/A5 的判定 = ① 队列行出现且状态可观察；② 执行 `apply` 后结果与等价 CLI 命令**逐字段一致**（`tags` / `version` / `contentHash`）。QA **不得**因「点击后未立即落库」判为缺陷——那是设计，不是失败；只有「队列状态错误 / apply 后结果与 CLI 不等价 / 界面宣称已完成」才算缺陷。
> - Dev 已实测的等价证据（2026-09-27）：`req001_old→req001_new` 后记录 `tags` 变更、`version` 1→2、`contentHash` 变；再并入后 `count` 2+1=3 且源标签投影行被删除。

**A3 标签列表含引用计数**：界面逐行显示标签 + 引用计数；对同一实例，**界面显示的每个标签计数与 `node scripts/arcblog-tags.mjs list` 的对应 `count` 逐条相等**（至少核对 `req001_old`）。界面数据来自派生投影（`tags/index.json` + `tags/items/`），因此必须显示该投影的生成时间，并存在显式刷新入口（意图队列的 `refresh`）。

**A4 重命名可观察**：界面把 `req001_old` 重命名为 `req001_new`（目标不存在）后：

```bash
node scripts/arcblog-tags.mjs list
arc afs exec /blocklets/arcblog/.actions/read --args '{"path":"/instance/app/arcblog/drafts/'"$SLUG"'.json"}' --json
```

期望：`list` 不再含 `req001_old`、含 `req001_new`；记录里 `tags` 变为 `["req001_new","req001_other"]`，`version` 比操作前 +1，`contentHash` 与操作前不同——即与 `node scripts/arcblog-tags.mjs merge --from req001_old --to req001_new` 的结果一致。

**A5 合并可观察**：界面把 `req001_new` 合并到 `req001_other` 后，`list` 中 `req001_other.count` **等于**合并前两者计数之和，`req001_new` 消失；被引用文章同样 `version` +1。

**A6 空状态**

```bash
node scripts/arcblog-lifecycle.mjs delete --slug "$SLUG"   # 先删探针；如需无标签状态，再清理其余引用
node scripts/arcblog-tags.mjs list                         # 期望 {"count":0,"tags":[]}
grep -n '"tags\.' .aup/locales/*.json
```

期望：实例无标签时 `?page=tags` 显示引导文案（一句现状 + 一句价值 + 一个可点动作），而不是只有运行时默认英文 "No data"；引导文案的中英两条字符串都存在于 `.aup/locales/*.json`。
**替代路径（PM 于 `task-3` 交付后补充）**：dev 实例常有测试残留（soft-deleted 草稿仍带标签），无法廉价清到 `count: 0`。允许用**空投影探针**验证空态——只改派生记录（`tags/index.json` 的 `count: 0`、清空 `tags/items/`）后真实渲染，随后 `node scripts/arcblog-tags.mjs project` 复原；QA 报告里必须写明用了这条路径及其复原结果。空态文案的**本地化**证伪可以用 `grep` 覆盖。

**A7 负面用例①（非法输入 / 自合并）**

```bash
node scripts/arcblog-tags.mjs merge --from a --to a   # 期望 exit 1，stderr 含 "code": "VALIDATION"
node scripts/arcblog-tags.mjs merge                   # 期望 exit 1，stderr 含 "code": "VALIDATION"
```

期望（界面）：`from`/`to` 为空、或 `from === to` 时界面阻止提交或明确报错，**不写库**；输入含空格/大写/特殊字符（如 `Req 001 Bad!`）提交后落库为规范化形式 `req_001_bad`（`list` 中可查，原始字符串不出现）。

**A8 负面用例②（不存在的标签）**

```bash
node scripts/arcblog-tags.mjs merge --from definitely_not_a_tag_xyz --to other_xyz   # 期望 exit 0 + "migrated": 0
```

期望（界面）：对不存在的 `from` **不得显示「成功」toast**，而是如实提示「没有任何文章引用该标签」（或等价的 `migrated 0` 文案）；操作后 `list` 不变，不产生幽灵标签。

**A9 「不做单标签删除」可核验**（对应 §2.2.1）

```bash
sed -n '1,12p' scripts/arcblog-tags.mjs   # 含 "Zero-reference tags cannot exist by construction — `list` is the audit"
node scripts/arcblog-tags.mjs list        # 每一项 count >= 1
```

期望：仓库事实与注释一致，`list` 输出中不存在 `count: 0` 的标签；`backlog.md` 的 ⛔ 表含对应行（理由 + spec §15.4）。若 Dev 判定应实现「从所有文章移除」，必须先回报理由并请 PM 改判本条，不得只做一半。

**A10 深链 / 侧栏 / 权限**

```bash
node scripts/arcblog-console-nav.mjs --check
npm run test:file -- scripts/arcblog-console-nav.test.mjs
npm run test:file -- scripts/arcblog-permissions.test.mjs
```

期望：三条命令均 exit 0；`?page=tags` 是可深链的控制台页；侧栏「站点」组内出现「标签」项且当前行由平台 `active=true` 标记（无手写颜色、无显式 id）；匿名访问该页只见登录卡（guest 权限矩阵不回归）。

**A11 设计标准（Token / 状态）**

```bash
grep -nE '#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?' .aup/pages/*/tags.aup || echo "no hardcoded color"
```

期望：输出 `no hardcoded color`（或该页面文件下确无十六进制色值）；`docs/ArcBlog-admin-ui-design.md` §9 清单逐项通过，视觉走查引用 `task-2`（UI-001）落在 `docs/team/design/` 的记录——**视觉一致性由 UI 走查确认，不由 Dev 自证**。

**A12 产物同步**：改了 `.aup/**` 后已跑 `arc blocklet build`；`npm test` 内的 `arc dsl generate --check` 为绿（无产物漂移）；`git status --short` 中 `dist/` 无「源已改而产物未生成」的漂移。

**A13 回归（单文件）**

```bash
npm run test:file -- scripts/arcblog-tags.test.mjs
npm run test:file -- scripts/arcblog-runtime-ids.test.mjs
```

期望：均 exit 0。说明：`arcblog-tags.test.mjs` 属 live 层，只单跑、不在 `npm test` 内；**本轮不要求任何人跑全量 `npm run test:live`**，那是轮末 Lead/QA 在 `docs/team/.gate-lock` 保护下的一次性动作。

## 4. 依赖

- **上游**：本 REQ（`task-1`，PM）→ 实现任务 `task-3`（Dev，`blocked_by task-1`）→ 验证任务 `task-4`（QA，`blocked_by task-3`）。
- **并行**：`task-2`（UI-001，console 设计令牌与本轮走查）——A11 的视觉走查引用其产物；其写范围为 `.web/**` + `docs/team/design/**`，与本 REQ 的 `.aup/**` / `scripts/**` 不重叠。
- **既有能力**：`scripts/arcblog-tags.mjs`（`list` / `merge`）、`scripts/lib/content-scan.mjs`（`scanPosts` / `rewritePost` / `writePost`：version bump + contentHash 重算）、`scripts/console-nav.mjs` + `scripts/arcblog-console-nav.mjs`（菜单模型 + 生成器 + `--check`）。
- **外部条件**：无链上依赖、无真实资金、不需 `--adapter ocap`；需要一个可写的 dev 实例（`arc service status` 正常）。
- **实现提示（非强制，不构成验收）**：仓库已有两类先例可参考——① 派生投影 + CLI 重建（`node/factories.json`、Hub 索引 `hub index rebuild`）；② 页面只写 intent、本地 CLI worker 执行（`arcblog-chain-worker.mjs`）。Dev 可任选，但必须满足 2.1.8「单一改写实现」与 A3「计数与 CLI 一致」。

## 5. 涉及写范围

| 路径前缀 | 用途 | 归属 |
| --- | --- | --- |
| `.aup/pages/**` | 新增 `tags` 控制台页（或等价 taxonomy 区块）+ 受生成器影响的既有控制台页 | Dev |
| `.aup/locales/*.json` | 新页 page-scoped key（`generate` merge 生成） | Dev |
| `.aup/wrapper.aup` | 手写 `wrapper.nav-tags` 标签串 | Dev |
| `scripts/**` | `console-nav.mjs` 菜单项、`arcblog-tags.mjs` 扩展（如需派生投影/worker）、新增或改动测试 | Dev |
| `world/**` | 仅当需要新增派生投影的 AFS schema | Dev |
| `pages/**` | 仅当需要 SSR 绑定时 | Dev |
| `blocklet.yaml` | 仅当新增 replicated 集合 / 绑定 | Dev |
| `dist/**` | 由 `arc blocklet build` 生成，不手改 | Dev |
| `docs/team/requirements/**`、`docs/team/journal/**`、`docs/team/backlog.md` | 本 REQ / 轮次日志 / 看板 | PM |
| `docs/team/design/**`、`.web/**`、`logo.svg` | UI-001 的走查与呈现层 | UI |
| `docs/team/test-reports/**`、`docs/team/bugs/**` | Round 6 验证报告与缺陷 | QA |

**边界**：本 REQ 不授权任何人改 `docs/ArcBlog-product-technical-spec.md`，也不授权改 `docs/ArcBlog-feature-checklist.md` 的状态列；checklist 第 103 行的 ✅/🟡 由轮末（QA 结论 + Lead）统一处理。
