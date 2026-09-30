# REQ-041 — 控制台创建的记录必须带真实署名（`authorDid` / `authorName`）

> `REQ 编号` REQ-041 ｜ `对应 spec` §15.4（文章 Posts / 页面 Pages；达成标准"绝不出现元数据残缺文章"）、§65–§67（content hash / Ed25519 签名覆盖 `authorDid`）、§107–§109（节点身份） ｜ `checklist 行` **:86**（文章生命周期，✅）、**:109**（文章管理，✅）、**:95**（静态页面管理，✅） ｜ `优先级` **P1**（若 Lead 判定"署名错写"即数据风险，则升 P0 并当轮上报人类 —— 见 REVIEW §5-裁决点 7） ｜ `提出轮次` 审查轮（`task-1`，2026-09-29，R29 之后） ｜ `负责角色` Dev（`.aup/**`，可能含 `scripts/` 守卫） ｜ `状态` **草案（待 Lead 裁决，见 REVIEW §5-裁决点 2）**

## 1. 背景

控制台的最高频写入路径（"写文章 → 发布"、"新建静态页"）在 `exec` 的 `content` 里写**未插值的会话模板**：

- `.aup/pages/admin/compose.aup:168`（存草稿）：`authorDid: $session.did, authorName: $session.displayName`
- `.aup/pages/admin/compose.aup:169`（直接发布）：同上
- `.aup/pages/admin/pages.aup:168`（新建静态页）：`authorDid: $session.did`

平台事实（**已实测**，不是推测）：`docs/arc-contracts.md` §28.7（`:1432-1442`）用同一条页面写入对照证明——`requestedBy: "$session.did"` **落库为字面量字符串** `"$session.did"`，而同记录的 `requestedAt: "${generate.timeiso}"` 正确插值；并给出规则「审计字段（谁发起、谁署名）要么由**服务端/CLI**补齐，要么先在页面里取到真实值再写；**不要让 `$session.*` 模板串直接落库**」。同族缺陷：`docs/team/bugs/BUG-003-tags-requestedby-literal-session-did.md`；`CLAUDE.md`「What ArcBlog is」末段亦把该写法记为已知缺口（"use the CLI when it matters… run `arcblog-doctor.mjs` to find records with an empty authorDid"）。

这不是理论风险：署名是 §65–§67 内容签名的覆盖字段之一（`scripts/lib/content-sign.mjs` 覆盖 `contentHash + slug + authorDid + version`），也是 Hub 归属与作者页（`?page=author` 读 `node/profile.json`）的依据。

**当前的可观察状态**（诚实登记）：`node scripts/arcblog-doctor.mjs --json` → `authorship: {"severity": "warn", "ok": true, "detail": "49 records, all attributed"}`——即缺陷目前是**潜伏**的（当前语料由 CLI 创建，署名完整）。但页面本身**没有任何提示或拒绝**：写成功仍弹 `onSuccessToast`（`compose.aup:168-169`），而 `arc-contracts §29.4` 明确"toast 不是证据"。

## 2. 范围

**做**

1. **先探针，后落笔**（必做第一步，禁止臆造平台能力）：在**一次可登录会话**里，用 `?page=compose` 提交 1 条草稿（title/slug/body 必填），然后
   ```bash
   arc afs exec /blocklets/arcblog/.actions/read --args '{"path":"/instance/app/arcblog/drafts/<slug>.json"}' --json
   ```
   读出 `authorDid` / `authorName` 的**真实落库形态**（字面量 `$session.did`、空串、还是真 DID），并据此选定实现路径 A 或 B。
2. **路径 A（若探针确认页面无法可靠写入真值）**：页面只写意图（`config/compose-intents/<id>.json` / `config/page-intents/` 复用），由本机 worker 用既有 CLI 落库——CLI 侧已具备真实署名（`node scripts/arcblog-lifecycle.mjs publish --author-did …`、`node scripts/arcblog-pages.mjs create --author-did …`）。范式与 `categories.aup:229-230`、`media.aup:184`、`pages.aup:189/211`、`policy.aup`、`hub.aup` 一致。
3. **路径 B（若探针证明存在可表达的真值写法）**：只改 `content` 里的署名来源（例如能同步取到 DID 的隐藏输入 / 已实测可插值的写法），**必须附探针原始输出**作为依据，不得引入"应该能"的写法。
4. **交付判据入 fast 层（防复发）**：新增一条守卫——扫描 `.aup/**` 的 `exec` 事件 `content`，出现 `$session.` 即失败（同时覆盖 `$session.did` 与 `"$session.did"` 两种形态），并在交付说明里给出它今天**能抓到的现有违规点**（`compose.aup:168/169`、`pages.aup:168`）。

**明确不做**

- **不改** `world/post.yaml` / `world/page` 类 schema（不新增字段、不改字段类型）。
- **不引入**用户系统 / DID 登录扩展 / 自定义 JS（AUP 页面内不做任意脚本）。
- **不改** 内容签名实现（§67）与 `arcblog-doctor.mjs` 的 authorship 判据（doctor 保持"发现者"角色）。
- **不改** CLI 的既有命令语义（`--author-did` 已存在）；**不动** `?page=posts` 的行内 Publish/Archive/Delete 已有写法（那是 `${args.e*}` 隐藏输入通道，`BUG-012` 家族已修）。
- **不做**历史数据回填（当前无坏记录；若探针发现坏记录，单列一次清理动作交 Lead 决定，不在本 REQ 内静默改写）。
- 不碰链、不碰资金、不改 `blocklet.yaml`。

## 3. 验收标准

1. **探针先行（可执行）**：交付说明里必须包含第 1 步的原始输出（`arc afs exec … read … authorization --json` 的 `content.authorDid`），并明确路径 A 或 B 的依据。
2. **草稿路径（可执行 + 可观察）**：登录后从 `?page=compose` 新建一条草稿（唯一 slug，如 `qa-req041-draft`）→ 回读：
   ```bash
   arc afs exec /blocklets/arcblog/.actions/read --args '{"path":"/instance/app/arcblog/drafts/qa-req041-draft.json"}' --json
   ```
   ⇒ `authorDid` 必须匹配 `^did:(key|blocklet):`，且**不等于** `$session.did` 字面量与空串；`authorName` 不得是 `$session.displayName` 字面量。
3. **页面路径（可执行 + 可观察）**：同一会话从 `?page=pages` 新建一页（如 `qa-req041-page`）→ 回读 `page-drafts/qa-req041-page.json` ⇒ 同上判据。
4. **发布路径（可执行）**：把草稿发布（`?page=posts` 行内 Publish 或 `?page=compose` 的 Publish）→ 回读 `posts/<slug>.json` ⇒ `authorDid` 仍满足验收 2 的正则（**不得**在归档/发布重写时被字面量覆盖）。
5. **doctor 保持绿（可执行）**：
   ```bash
   node scripts/arcblog-doctor.mjs --json   # authorship ok=true，且 attributed 计数 = 记录总数
   ```
6. **守卫可执行且能抓现有违规（可执行）**：
   ```bash
   # 新增的守卫测试
   npm run test:file -- scripts/<新守卫>.test.mjs    # 期望 fail（指出现存 3 处）
   # 修复后再跑 ⇒ pass
   grep -rn 'authorDid: \$session\.' .aup/pages/ | wc -l    # 修复后期望 0
   ```
7. **门（可执行）**：
   ```bash
   arc dsl validate --json                    # issues []
   npm test                                   # 快层不降（若新增守卫文件需登记 FAST_TESTS）
   arc dsl generate --check                   # 0 漂移
   npm run build                              # .aup 改动后必跑（build + scrub）
   node scripts/arcblog-console-nav.mjs --check   # pages 21
   ```
8. **零回归（可观察）**：`?page=compose` 的表单字段、`?page=pages` 的创建/上下线、`?page=posts` 的 Publish/Archive/Delete 仍可完成；21 页零 `SESSION INIT FAILED`；草稿显隐（`drafts/` 与 `posts/` 目录边界）不变。

## 4. 依赖

- 前置裁决：**REVIEW-console-pm-20260929.md §5-裁决点 2**（先 B 探针、不可表达则走 A）与 **§5-裁决点 7**（P0/P1 口径）。
- **需要一次可登录会话**（QA 或 Lead 提供；与 `arc-contracts §35` 的 restart/复挂同批），否则验收 2/3/4 无法执行。
- 平台约束（实现前必读）：`arc-contracts §28.7`（`$session.*` 不插值）、§29.2（页面重写非本页创建的记录需 authority sidecar）、§29.4（toast 不是证据）、§35（`.aup` 生效方式）。
- 既有实现参考：`arcblog-lifecycle.mjs publish --author-did`；五处意图队列范式（`scripts/lib/intents.mjs` 的统一词表 `pending|running|applied|rejected|noop`）。
- 若新增守卫文件：`scripts/run-tests.mjs` 的 `FAST_TESTS` 登记（纯静态扫描，不需要实例，属快层）。

## 5. 涉及写范围

| 路径 | 说明 |
| ---- | ---- |
| `.aup/pages/admin/compose.aup` | 存草稿 / 发布的署名来源（`:168-169`） |
| `.aup/pages/admin/pages.aup` | 新建静态页的署名来源（`:168`） |
| `.aup/locales/{en,zh}.json`（生成物） | 若新增提示/失败文案 |
| `.aup/pages/admin/*.json`、`dist/**` | `arc dsl generate` / `npm run build` 产物（不得手改） |
| `scripts/<新守卫>.mjs` + `scripts/<新守卫>.test.mjs` + `scripts/run-tests.mjs`（`FAST_TESTS`） | **仅当 Lead 采纳验收 6 的守卫**（纯静态，不改业务 CLI） |
| 若走路径 A：`scripts/arcblog-lifecycle.mjs`（或新增 worker 子命令）+ 对应 `config/*-intents/` 目录 | 需 Lead 明确授权后才动 `scripts/` |
| `docs/team/.gate-lock` | 临时，跑完删除（含 `dist/` 镜像） |

## 6. 假设（§10.3）

> 我们相信**让控制台产出的每条记录都带真实 `did:` 署名**，会让**博主/运营者**的**"发布即完整"成功率**从"依赖事后 doctor 抽查"变成"页面路径必然正确"，并让 §65–§67 的签名与 §15.4 的"元数据不残缺"在**页面路径上**成立。

## 7. 最小切片（§10.3）

**一次登录态探针 + 一个字段来源的修改**：先用最小成本把"平台能不能在 `exec` 的 `content` 里拿到真 DID"钉死（1 条草稿、1 次 AFS 读回）；如果不可表达，再只对 `compose` 的**存草稿**一条路径改走意图队列（发布路径第二批），避免一次性重写两页。

## 8. 成功指标（可观察，§10.3）

- `grep -rn 'authorDid: \$session\.' .aup/pages/` 从 **3** 处 → **0** 处。
- 页面路径新建的草稿/页面/发布记录，`authorDid` 匹配 `^did:(key|blocklet):` 的比例 = **100%**（样本 ≥3，含 1 条发布）。
- `arcblog-doctor.mjs --json` 的 `authorship.ok` 保持 `true`，且 `细节` 里的 `attributed` 计数 = 记录总数（无"未署名"）。
- 快层新增守卫能在**未修复**版本上失败、在修复版本上通过（对照实验可复跑）。

## 9. 不做什么（§10.3，与 §2 呼应）

不改 schema、不引入用户系统、不加页面内自定义脚本、不改签名实现与 doctor 判据、不静默回填历史记录、不碰链与资金。

## 10. 风险与回退（§10.3）

| 风险 | 处置 |
| ---- | ---- |
| 走路径 A 后，页面 → worker 之间出现"写入延迟/意图未消费"，用户以为没保存 | 复用既有队列的终态回写 + 页面常驻"如何读回记录"的说明（`diagnostics.aup:27` 已有范式）；交付说明必须写明"toast 不是证据，回读为准" |
| 意图队列的 `requestedBy` 又写成 `$session.did`（BUG-003 重演） | 意图作者的写法必须用 `${args.*}` 或省略；验收 6 的守卫同时覆盖 `requestedBy`/`authorDid` 两类键 |
| 新增守卫误伤合法用例（如 `visible=$session.authenticated`） | 守卫只扫描 `exec` 事件的 `content` 段，不扫 `visible`/表达式位置；先跑一遍全仓得到 3 处命中作为基线 |
| 走路径 B 的"真值写法"其实不可表达（臆造风险） | 验收 1 要求附**探针原始输出**；无输出即不得采用 B（`AGENTS.md` 铁律 1：不臆造 ARC API） |
| 探针本身在共享实例留下记录 | 探针记录用固定前缀 `qa-req041-*`，验收后按 `arcblog-lifecycle.mjs`/`pages.mjs delete` 清理并在交付说明里核对计数复原 |
| 涉及资金/链 | **无**：本 REQ 不碰经济与链 |
