# ArcBlog P0+P1 实现计划:收尾封面图 + 修地基

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把在途封面图功能收尾到质量门全绿(P0),并修复 P1 正确性缺陷:作者署名、单管理员权限、编辑流、预览页/工作室生命周期操作、hero 修复、归档迁移、文档诚实化。

**Architecture:** 存储不变量"位置即真相"——posts/ 只放 published,archived 移入 drafts/,阅读页绑定 posts/ 天然 404 非公开文章。UI 写入全部走 `exec "/.actions/write"`,网络层权限由 blocklet.yaml replicated collections 收紧到 admin。

**Tech Stack:** AUP DSL(`.aup/app.aup`)、Node.js CLI 脚本(node:test)、`arc` CLI(dsl validate/generate、blocklet build、afs exec)。

**Spec:** `docs/superpowers/specs/2026-09-21-arcblog-hardening-design.md`(§3 D1–D7、§4 S1–S5)

## Spike 调查结论(2026-09-21 预执行,作为计划依据)

| Spike | 结论 | 依据 |
|---|---|---|
| S1 write 是否按 world schema 校验 | **否**。`/.actions/write` 参数表(path/content/mode/ifMatch/dedupBy…)无任何 schema 校验 | `arc afs explain /blocklets/arcblog/.actions/write` 实测 |
| S2 `$session.*` 可用字段 | **did/displayName/role/isAdmin/authenticated 均存在**,模板中可插值(`p "$session.did"`) | showcase-dsl session.aup:36/41/46/70;exec args 内可用性低风险,Task 5 验证 |
| S3 编辑流表单预填 | **未决**,需运行时原型。无 load/ready 事件;已证模式=隐藏 input + events set state(hero quickadd)| 见 Task 6 原型盒 |
| S4 XML/动态 meta 输出 | **不支持**。web handler 只出 HTML shell;无静态文件服务;/rss.xml 实测返回 SPA HTML(200)| curl 实测 + seo-locale-fixture 分析。RSS 走"生成 dist/rss.xml + Pages 静态服务"降级路径(P2)|
| S5 afs-list 分页/筛选 | **支持**:`pageSize/pagination/pagerStyle/pageSizeOptions/filterTabs(带计数)`;query action 支持 where/orderBy/text | todo fixture index.aup:36;`.actions/query` explain 实测 |
| S6 可用 actions | mount/unmount/read/list/write/query/aggregate/delete/batchDelete,**无 move**;action events 数组可携带多步 set/多 exec(todo/work-board 实证)| `arc afs ls /blocklets/arcblog/.actions` 实测 |

**关键 DSL 事实(执行者必须知道):**
- AUP 表达式只支持 `||`/`&&`/`!` 和 `$session.*`/`$state.*`,**没有比较运算**,可见性规则不能写 `==`。
- `${entry.content.*}` 替换在 afs-list item 模板和 action props(含 `path="${entry.path}"`)中可用;list 的 select 事件不能 navigate(CLAUDE.md 实录)。
- 写操作必须走 `exec "/.actions/write"`,由 blocklet.yaml `replicated` collections 授权;裸 base-path 网络写被拒绝。
- 空容器 `view {}` 是校验错误:"Container type must have non-empty children"——**本计划 P0 的起因**。
- `.aup/pages/*.json` 由 `arc dsl generate` 从 app.aup 生成;`dist/` 由 `arc blocklet build` 生成。**改 app.aup 后必须 generate;每阶段结束必须 build。**

## Global Constraints

- 每个 Task 结束:`arc dsl validate --json` 零 error + `npm test` 全绿,否则不回绿不 commit。
- 每个 Task 独立 commit,commit message 结尾加 `Co-Authored-By: Claude Code <noreply@anthropic.com>`。
- 只改本计划列出的文件;工作区已有未提交的封面图改动属于 P0 范围,**不要 git checkout 丢弃**。
- app.aup 内联 i18n 与 `.aup/locales/*.json` 双轨:改任一处文案,另一处同步(en+zh 都要)。
- 不动 `dist/` 手写内容——只通过 `arc blocklet build` 再生成。

---

### Task 1: P0 — 修复 3 处空容器校验错误

**Files:**
- Modify: `.aup/app.aup:68-69`(postCover)、`:166-167`(reader-cover)、`:330-331`(preview-cover)

**Interfaces:**
- Produces: `arc dsl validate --json` 对 `.aup/app.aup` 零 error;其余 Task 依赖此基线。

三处纯装饰性封面 view 是空块 `{}`,触发校验错误。每处加一个非空子节点(`text content=" "`)。

- [ ] **Step 1: 修 postCover(app.aup:68-69)**

把:
```
          view postCover href="/posts/${entry.content.slug}" style={display: "block", width: "168px", height: "112px", flexShrink: 0, borderRadius: "var(--radius-lg, 12px)", background: "url(${entry.content.coverImage}) center / cover no-repeat, linear-gradient(135deg, var(--color-border), var(--color-dim))"} {
          }
```
改为:
```
          view postCover href="/posts/${entry.content.slug}" style={display: "block", width: "168px", height: "112px", flexShrink: 0, borderRadius: "var(--radius-lg, 12px)", background: "url(${entry.content.coverImage}) center / cover no-repeat, linear-gradient(135deg, var(--color-border), var(--color-dim))"} {
            text content=" "
          }
```

- [ ] **Step 2: 修 reader-cover(app.aup:166-167)**

把:
```
        view reader-cover visible="$state.post.coverImage" style={minHeight: "280px", borderRadius: "var(--radius-lg, 12px)", background: "var(--color-border) url(${state.post.coverImage}) center / cover no-repeat"} {
        }
```
改为:
```
        view reader-cover visible="$state.post.coverImage" style={minHeight: "280px", borderRadius: "var(--radius-lg, 12px)", background: "var(--color-border) url(${state.post.coverImage}) center / cover no-repeat"} {
          text content=" "
        }
```

- [ ] **Step 3: 修 preview-cover(app.aup:330-331)**

同样模式:空 `{}` 改为 `{ text content=" " }`。

- [ ] **Step 4: 验证**

Run: `arc dsl validate --json`
Expected: exit 0,`"issues": []` 或对 app.aup 无 error(severity=error 数量为 0)。若 `text content=" "` 仍报错,改用 `p " " scale=sm intent=muted` 重试。

- [ ] **Step 5: Commit**

```bash
git add .aup/app.aup
git commit -m "fix: non-empty children for decorative cover views (P0)"
```

---

### Task 2: P0 — 重新生成页面产物并全量验证

**Files:**
- Modify: `.aup/app.json`、`.aup/pages/*.json`(由生成器重写)

**Interfaces:**
- Consumes: Task 1 的合法 app.aup。
- Produces: 与源码一致的编译产物树。

- [ ] **Step 1: 生成**

Run: `arc dsl generate`
Expected: 无报错退出。

- [ ] **Step 2: 验证编译产物与源码一致**

Run: `arc dsl doctor`
Expected: 无 "regenerate-check" 失败。

- [ ] **Step 3: 全量质量门**

Run: `arc dsl validate --json && npm test`
Expected: validate 零 error;18/18 测试通过。

- [ ] **Step 4: 检查 diff 合理性**

Run: `git status --short && git diff --stat .aup/`
Expected: 只有 app.aup 的既有封面改动 + generate 重写的 app.json/pages/*.json;**不应出现** admin.json 被意外改写——若出现 h3/dropzone 之类结构漂移,停下来报告(说明生成器版本与上次手工树不一致,需要人工确认)。

- [ ] **Step 5: Commit**

```bash
git add .aup/
git commit -m "chore: regenerate AUP artifacts for cover feature (P0)"
```

---

### Task 3: P0 — dist 再生成并记录构建命令

**Files:**
- Modify: `dist/`(整体由 `arc blocklet build` 重写)
- Modify: `CLAUDE.md`(在 Commands 一节补一行 dist 构建命令)

**Interfaces:**
- Consumes: Task 2 的产物树。
- Produces: 与源码同步的 dist/(P4 会加一致性检查,本 Task 先消除现存漂移)。

- [ ] **Step 1: 构建**

Run: `arc blocklet build`
Expected: 无报错;`dist/.afs/manifest.json` 时间戳更新。

- [ ] **Step 2: 核对关键文件**

Run: `ls dist/.aup/wrapper.json dist/.aup/locales dist/.aup/pages/preview.json dist/pages/theme-bridge 2>&1`
Expected: 全部存在(此前 dist 缺这些)。再 Run: `grep -c "sites:" dist/blocklet.yaml`
Expected: ≥1(dist 的 blocklet.yaml 此前缺整个 sites 段)。

- [ ] **Step 3: 验证 dist 可校验**

Run: `arc dsl validate dist --json 2>&1 | tail -5` 或按 CLI 支持的目录参数验证 dist 树;失败则只记录不阻塞,在 commit message 里注明。

- [ ] **Step 4: 记录构建命令到 CLAUDE.md**

在 CLAUDE.md `## Commands` 代码块中 `npm test` 行后加一行:
```
arc blocklet build        # regenerate dist/ from source (run after .aup changes, before committing)
```

- [ ] **Step 5: Commit**

```bash
git add dist/ CLAUDE.md
git commit -m "chore: rebuild dist and document the build command (P0)"
```

---

### Task 4: P1 — 单管理员:网络层 write 权限收紧到 admin

**Files:**
- Modify: `blocklet.yaml:47-62`(replicated collections)

**Interfaces:**
- Produces: 非 admin 的 member 无法再通过 `/.actions/write` 写 posts/drafts/heroes;后续 Task 的 UI 操作默认 admin 执行。

- [ ] **Step 1: 修改 minRole**

`blocklet.yaml` 中 `replicated:` 下三个 collection(posts/drafts/heroes)的 `minRole: member` 全部改为 `minRole: admin`;同时把注释 "authorize member writes" 改为 "authorize admin writes"。`networkRead` 段不动(posts/heroes guest 可读、drafts admin 可读,已符合单管理员模型)。

- [ ] **Step 2: 验证**

Run: `arc dsl validate --json && npm test`
Expected: 全绿(blocklet.yaml 改动不影响 DSL 与脚本测试,但必须确认无回归)。

- [ ] **Step 3: Commit**

```bash
git add blocklet.yaml
git commit -m "feat: restrict replicated writes to admin role (single-admin model)"
```

---

### Task 5: P1 — 作者署名:compose 写入真实 session 身份 + 门禁文案诚实化

**Files:**
- Modify: `.aup/app.aup:136-137`(save-draft/publish-now 的 args)、`:77-78`(gate 文案)、`:99`(images-desc 文案)
- Modify: `.aup/locales/en.json`、`.aup/locales/zh.json`(同步上述 key;若无对应 key 则新增)

**Interfaces:**
- Consumes: S2 结论(`$session.did`/`$session.displayName` 字段存在)。
- Produces: 新发布记录带真实 authorDid/authorName;阅读页 byline 有值。
- 风险:exec args 内 `$session.*` 插值未经运行时验证——Step 4 做活体验证,失败则按 Fallback 调整。

- [ ] **Step 1: 改 save-draft args(app.aup:136)**

`authorDid: ""` → `authorDid: "$session.did"`,`authorName: ""` → `authorName: "$session.displayName"`。

- [ ] **Step 2: 改 publish-now args(app.aup:137)**

同样替换两处。

- [ ] **Step 3: 改门禁文案**

`gate-desc`(app.aup:78)改为:
```
{ en "Sign in with DID Wallet to unlock the editor. Drafts stay in the private drafts directory until published." zh "使用 DID Wallet 登录以解锁编辑器。草稿保存在私有草稿目录中,直到发布。" }
```
`images-desc`(app.aup:99)中 "Media is stored below your DID user space" 改为 "Media is stored in the site file space"(zh 同步改)。`checks-desc`(:81)中 "Saving an existing slug overwrites that record." 保留(真实)。

- [ ] **Step 4: 生成 + 静态验证 + 活体验证**

Run: `arc dsl generate && arc dsl validate --json && npm test`
Expected: 全绿。
活体(可选但推荐):在浏览器打开 compose,登录 DID Wallet 后存一篇草稿,然后 Run: `node scripts/arcblog-query-posts.mjs draft --limit 1`,Expected: 最新 draft 的 `authorDid`/`authorName` 非空。若为空,说明 args 不支持 `$session.*` 插值——改为在 Step 5 走 Fallback。

- [ ] **Step 5(条件 Fallback):owner 档案降级**

仅当 Step 4 活体验证失败时:把 args 中的 author 字段改回 `""`,并在 settings 目录加 owner 档案的做法记入决策——**此时停下来在计划中记录,不写半成品**(降级方案完整实现移到 P1 收尾前补做)。

- [ ] **Step 6: Commit**

```bash
git add .aup/ && git commit -m "feat: write real session authorship in compose, honest gate copy"
```

---

### Task 6: P1 — S3 原型盒:compose 编辑模式(预填)方案定型 + 实现

**Files:**
- Modify: `.aup/app.aup`(compose 页、admin 行、preview 页)
- Create: `docs/superpowers/plans/spike-s3-edit-flow.md`(决策记录)

**Interfaces:**
- Consumes: Task 2 的产物基线;已知模式:隐藏 input + `events={click/select: [{target, set: {state: {value}}}]}]`(hero quickadd, app.aup:289-305 实证)。
- Produces: 用户可从 preview/admin 进入 compose 并预填已有记录;决策记录供 P2+ 参考。

**原型盒(最多 3 个实验,每个 ≤15 分钟):**

- [ ] **Step 1: 实验 A — 页面参数可达性**

在 compose 页顶部临时加一个调试 card:`p "slug=[$args.slug]"`,然后 Run: `arc dsl generate`,浏览器访问 `/?page=compose&slug=<已知草稿slug>`。
观察:是否显示 slug。→ 记录:$args 是否从 query string 注入。

- [ ] **Step 2: 实验 B — propBind 驱动表单初值**

compose 外层 view 加 `propBind={post: "/instance/app/arcblog/drafts/$args.slug.json"}`,把一个 input 的 `state={value: ""}` 改为 `state={value: "${state.post.title}"}`。generate + 浏览器验证该输入框是否出现标题。
观察:预填是否生效。→ 记录:pattern B 可行性。

- [ ] **Step 3: 实验 C — 显式暂存(保底模式)**

复用 hero quickadd 模式:preview 页 "Edit" action 的 `events={click: [{target: <compose 隐藏input id>, set: {state: {value: "$state.post.title"}}}, ...每个字段..., {切换页面}]}`,compose 放一组 hidden input 承接。
观察:跨页 set state 是否生效(SPA 页切换是否保留 state)。→ 记录:pattern C 可行性。

- [ ] **Step 4: 决策与记录**

把三个实验结果写入 `docs/superpowers/plans/spike-s3-edit-flow.md`,格式:实验 → 观察 → 选用模式(A/B/C 中可行的最简者;若 A+B 可行选 B,C 为保底)。**删除 Step 1-3 的所有临时调试代码。**

- [ ] **Step 5: 实现编辑模式**

按决策实现(三模式的最终形态统一要求):
- compose 能拿到目标 slug(query args 或暂存字段);
- 全部字段(title/slug/category/tags/summary/coverImage/seoTitle/seoDescription/ogTitle/ogDescription/ogImage/body)预填;
- 编辑保存时**保持 createdAt、publishedAt 不重置**:args 中 `createdAt: "${state.post.createdAt}"`(或承接字段),`version` 无法自增则维持写入端现状并在文档注明(乐观并发在 UI 路径暂不兑现,P4 文档);
- admin 的 drafts 行与 preview 页加 "Edit" 入口;
- 编辑态有视觉提示(如 card 标题显示 "Editing: <slug>")。

i18n 新增 key(示例):`compose.editing { en "Editing" zh "编辑中" }`、`admin.edit { en "Edit" zh "编辑" }`、`preview.edit { en "Edit" zh "编辑" }`,en/zh 同步。

- [ ] **Step 6: 验证**

Run: `arc dsl generate && arc dsl validate --json && npm test`
Expected: 全绿。手工走查:preview → Edit → compose 预填正确 → 保存 → studio 列表数据一致。

- [ ] **Step 7: Commit**

```bash
git add .aup/ docs/superpowers/plans/spike-s3-edit-flow.md
git commit -m "feat: edit-in-compose with record prefill (S3: <选用模式>)"
```

---

### Task 7: P1 — 预览页生命周期操作(Publish / Delete / Edit)

**Files:**
- Modify: `.aup/app.aup:311-341`(preview 页)、preview i18n 块
- Modify: `.aup/locales/en.json`、`.aup/locales/zh.json`

**Interfaces:**
- Consumes: Task 6 的 Edit 入口;S6 结论(`/.actions/write`、`/.actions/delete` 可用,`${state.post.*}` 在 style/content 中已证,args 内插值与 Task 5 同风险同验证)。
- Produces: 草稿可从预览页发布/软删,不再是死胡同。

- [ ] **Step 1: Publish 操作**

preview-article 内加:
```
action preview-publish -> exec "/.actions/write" variant=primary label=:preview-publish args={path: "/instance/app/arcblog/posts/${state.post.slug}.json", content: {title: "${state.post.title}", slug: "${state.post.slug}", summary: "${state.post.summary}", body: "${state.post.body}", coverImage: "${state.post.coverImage}", images: [], tags: "${state.post.tags}", category: "${state.post.category}", seoTitle: "${state.post.seoTitle}", seoDescription: "${state.post.seoDescription}", ogTitle: "${state.post.ogTitle}", ogDescription: "${state.post.ogDescription}", ogImage: "${state.post.ogImage}", status: published, authorDid: "${state.post.authorDid}", authorName: "${state.post.authorName}", published: true, publishedAt: "${generate.timeiso}", archivedAt: "", deletedAt: "", createdAt: "${state.post.createdAt}", updatedAt: "${generate.timeiso}", version: 1}} onSuccessToast={intent: success, message: "$t(preview.published-ok)", duration: 3000}
```
i18n 新增:`preview-publish { en "Publish" zh "发布" }`、`published-ok { en "Published." zh "已发布。" }`。

- [ ] **Step 2: Delete(软删)操作**

```
action preview-delete -> exec "/.actions/write" variant=destructive label=:preview-delete args={path: "/instance/app/arcblog/drafts/${state.post.slug}.json", content: {title: "${state.post.title}", slug: "${state.post.slug}", summary: "${state.post.summary}", body: "${state.post.body}", coverImage: "${state.post.coverImage}", images: [], tags: "${state.post.tags}", category: "${state.post.category}", seoTitle: "${state.post.seoTitle}", seoDescription: "${state.post.seoDescription}", ogTitle: "${state.post.ogTitle}", ogDescription: "${state.post.ogDescription}", ogImage: "${state.post.ogImage}", status: deleted, authorDid: "${state.post.authorDid}", authorName: "${state.post.authorName}", published: false, publishedAt: "${state.post.publishedAt}", archivedAt: "${state.post.archivedAt}", deletedAt: "${generate.timeiso}", createdAt: "${state.post.createdAt}", updatedAt: "${generate.timeiso}", version: 1}} confirm={title: :preview-delete-title, message: :preview-delete-msg} onSuccessToast={intent: success, message: "$t(preview.deleted-ok)", duration: 3000}
```
i18n 新增:`preview-delete { en "Delete draft" zh "删除草稿" }`、`preview-delete-title { en "Delete this draft?" zh "删除这篇草稿?" }`、`preview-delete-msg { en "The record stays in the archive with status deleted (soft delete)." zh "记录将以 deleted 状态保留(软删除)。" }`、`deleted-ok { en "Draft deleted." zh "草稿已删除。" }`。
注意:`confirm={title: :key}` 的引用写法沿用 hero-delete(app.aup:269)的先例。

- [ ] **Step 3: Edit 入口**

按 Task 6 决策接入(通常是 `action preview-edit -> page compose` + 参数/暂存)。

- [ ] **Step 4: 验证 + Commit**

Run: `arc dsl generate && arc dsl validate --json && npm test`
Expected: 全绿。手工走查:preview 页三个操作各点一遍(发布后再回 studio 确认 posts/ 出现、drafts/ 原记录仍在——**发布不自动删草稿,删除草稿由用户显式执行,避免双 exec 链的不确定性;在 preview-publish 成功后 toast 文案补 "remove the draft from the studio when done" 提示)**。

```bash
git add .aup/ && git commit -m "feat: publish/delete/edit actions on draft preview"
```

---

### Task 8: P1 — 工作室生命周期操作(归档/重新发布/软删)

**Files:**
- Modify: `.aup/app.aup:240-262`(两个 afs-list 的行模板)、admin i18n 块
- Modify: `.aup/locales/en.json`、`.aup/locales/zh.json`

**Interfaces:**
- Consumes: Task 4(权限)、Task 6(Edit 模式)。
- Produces: lifecycle 卡片从纯文案变成真操作;"Drafts & archived" 分组语义正确。

- [ ] **Step 1: published 行加 Archive 操作**

studio-published 行模板(studioLink 之后)加:
```
action studio-archive -> exec "/.actions/write" variant=secondary size=sm label=:admin-archive args={path: "/instance/app/arcblog/drafts/${entry.content.slug}.json", content: {title: "${entry.content.title}", slug: "${entry.content.slug}", summary: "${entry.content.summary}", body: "${entry.content.body}", coverImage: "${entry.content.coverImage}", images: [], tags: "${entry.content.tags}", category: "${entry.content.category}", seoTitle: "${entry.content.seoTitle}", seoDescription: "${entry.content.seoDescription}", ogTitle: "${entry.content.ogTitle}", ogDescription: "${entry.content.ogDescription}", ogImage: "${entry.content.ogImage}", status: archived, authorDid: "${entry.content.authorDid}", authorName: "${entry.content.authorName}", published: false, publishedAt: "${entry.content.publishedAt}", archivedAt: "${generate.timeiso}", deletedAt: "", createdAt: "${entry.content.createdAt}", updatedAt: "${generate.timeiso}", version: 1}} confirm={title: :admin-archive-title, message: :admin-archive-msg} onSuccessToast={intent: success, message: "$t(admin.archived-ok)", duration: 3000}
```
**关键约束:Archive 只写 drafts/ 归档副本,不删 posts/ 原记录**——单 exec,无链式依赖;posts/ 原记录的删除由紧随的第二个操作完成(Step 2)。顺序必须为"先写副本后删原件",数据安全优先。

- [ ] **Step 2: published 行加"从公开移除"(删 posts/ 原件)**

```
action studio-unpublish -> exec "/.actions/delete" variant=destructive size=sm icon=trash label=:admin-unpublish path="/instance/app/arcblog/posts/${entry.content.slug}.json" confirm={title: :admin-unpublish-title, message: :admin-unpublish-msg} onSuccessToast={intent: success, message: "$t(admin.unpublished-ok)", duration: 3000}
```
语义:两步归档 = 先 Archive(写副本)再 Unpublish(删原件)。confirm 文案明确写 "Archive first keeps a copy in drafts"。i18n:`admin-archive { en "Archive" zh "归档" }`、`admin-unpublish { en "Remove from public" zh "从公开移除" }` 及对应 title/msg/ok 各 key(en+zh)。

- [ ] **Step 3: drafts 行加 Publish(仅 draft 态)与 Delete**

drafts 行加(两个操作的 content 字段全集与 Task 7 Step 1 相同,逐字列出如下):
```
action studio-publish -> exec "/.actions/write" variant=primary size=sm label=:admin-publish args={path: "/instance/app/arcblog/posts/${entry.content.slug}.json", content: {title: "${entry.content.title}", slug: "${entry.content.slug}", summary: "${entry.content.summary}", body: "${entry.content.body}", coverImage: "${entry.content.coverImage}", images: [], tags: "${entry.content.tags}", category: "${entry.content.category}", seoTitle: "${entry.content.seoTitle}", seoDescription: "${entry.content.seoDescription}", ogTitle: "${entry.content.ogTitle}", ogDescription: "${entry.content.ogDescription}", ogImage: "${entry.content.ogImage}", status: published, authorDid: "${entry.content.authorDid}", authorName: "${entry.content.authorName}", published: true, publishedAt: "${generate.timeiso}", archivedAt: "", deletedAt: "", createdAt: "${entry.content.createdAt}", updatedAt: "${generate.timeiso}", version: 1}} confirm={title: :admin-publish-title, message: :admin-publish-msg} onSuccessToast={intent: success, message: "$t(admin.published-ok)", duration: 3000}
action studio-delete -> exec "/.actions/write" variant=destructive size=sm icon=trash label=:admin-delete args={path: "/instance/app/arcblog/drafts/${entry.content.slug}.json", content: {title: "${entry.content.title}", slug: "${entry.content.slug}", summary: "${entry.content.summary}", body: "${entry.content.body}", coverImage: "${entry.content.coverImage}", images: [], tags: "${entry.content.tags}", category: "${entry.content.category}", seoTitle: "${entry.content.seoTitle}", seoDescription: "${entry.content.seoDescription}", ogTitle: "${entry.content.ogTitle}", ogDescription: "${entry.content.ogDescription}", ogImage: "${entry.content.ogImage}", status: deleted, authorDid: "${entry.content.authorDid}", authorName: "${entry.content.authorName}", published: false, publishedAt: "${entry.content.publishedAt}", archivedAt: "${entry.content.archivedAt}", deletedAt: "${generate.timeiso}", createdAt: "${entry.content.createdAt}", updatedAt: "${generate.timeiso}", version: 1}} confirm={title: :admin-delete-title, message: :admin-delete-msg} onSuccessToast={intent: success, message: "$t(admin.deleted-ok)", duration: 3000}
```
**不做状态条件渲染**(表达式无比较运算,无法 `visible=status==draft`);deleted 记录再点 Publish 会复活为 published——接受此行为,confirm 文案提示 "deleted records can be republished"。

- [ ] **Step 4: 更新 lifecycle 卡片文案**

lifecycle-desc(app.aup:190)改为描述真实操作:"Archive copies a post to the private drafts directory; Remove from public takes it off the public feed. Drafts can be published or soft-deleted from the row actions."(zh 同步)。

- [ ] **Step 5: 验证 + Commit**

Run: `arc dsl generate && arc dsl validate --json && npm test`
Expected: 全绿。手工走查:新建草稿 → studio 发布 → 归档两步 → 确认 /posts/<slug> 404 → drafts 出现 archived → 重新发布。

```bash
git add .aup/ && git commit -m "feat: studio lifecycle actions (archive/unpublish/publish/delete)"
```

---

### Task 9: P1 — hero 治理修复(sort 数值化 + quick-add 可编辑 sort)

**Files:**
- Modify: `.aup/app.aup:280-281`(hero 表单)、`:300-306`(quick-add)

**Interfaces:**
- Produces: hero sort 为数值语义;"10 < 2" 字符串排序问题消除。

- [ ] **Step 1: hero-add 表单 sort 输入数值化**

`input type=text label=:hero-f-sort name=heroSort state={value: "0"}` → `input type=number label=:hero-f-sort name=heroSort state={value: 0}`,写入 args 中 `sort: "${args.heroSort}"` 保持(数值输入的 arg 应为数值;运行时若不是,记录到 Task 12 收尾清单,不强求——排序键统一为数字字符串时字典序问题仅在 ≥10 条时出现,将在 P2 验证)。

- [ ] **Step 2: quick-add 加 sort 输入**

quick-add 暂存区(app.aup:300-306)加可见输入:
```
input qa-sort type=number label=:hero-f-sort name=qaSort state={value: 0}
```
confirm action args 中 `sort: "0"` → `sort: "${args.qaSort}"`。同时 select 事件的暂存列表加 `{target: qa-sort, set: {state: {value: 0}}}`?——不做:保留用户手填值,清空由用户自行处理(P3 再做体验优化)。

- [ ] **Step 3: 验证 + Commit**

Run: `arc dsl generate && arc dsl validate --json && npm test`
Expected: 全绿(type=number 若校验失败则回退 type=text 并在计划中记录)。

```bash
git add .aup/ && git commit -m "fix: numeric hero sort, editable quick-add sort"
```

---

### Task 10: P1 — 存量归档迁移脚本(posts/ 中 status≠published → drafts/)

**Files:**
- Create: `scripts/arcblog-migrate-archived.mjs`
- Test: `scripts/arcblog-migrate-archived.test.mjs`

**Interfaces:**
- Consumes: CLI 既有模式(`blockletExec` 复制一份到本脚本,与现有脚本保持一致;P4 才抽公共模块)。
- Produces: `node scripts/arcblog-migrate-archived.mjs [--dry-run] [--instance <name>]` —— 扫 posts/,凡 content.status ≠ "published" 的记录移到 drafts/(保持原内容,仅路径变化),输出迁移清单 JSON。

- [ ] **Step 1: 写失败测试**

`scripts/arcblog-migrate-archived.test.mjs`:断言 (a) `--dry-run` 不写入且报告待迁移 slug 列表;(b) 无存量时输出 `{moved: []}` 且 exit 0;(c) slugify/参数缺失时报错退出。测试用独立 `--instance arcblog-test`(若不存在则 skip 并打印说明,与现有测试同样非 hermetic 的先例一致,但优先用 test instance)。

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test scripts/arcblog-migrate-archived.test.mjs`
Expected: FAIL(模块不存在)。

- [ ] **Step 3: 实现脚本**

要点:`arc afs exec /blocklets/arcblog/.actions/list` 列 posts/ → 逐条 `read` → `JSON.parse(content)` → `status !== "published"` 则 `write` 到 drafts/ 同 slug + `delete` posts/ 记录;顺序 write→delete;每步错误收集进结果不中断;`--dry-run` 只报告。输出 `{ok: true, scanned: n, moved: [...], errors: [...]}`。

- [ ] **Step 4: 跑测试确认通过 + 全量**

Run: `node --test scripts/arcblog-migrate-archived.test.mjs && npm test`
Expected: 全绿。

- [ ] **Step 5(可选): 对默认实例 dry-run**

Run: `node scripts/arcblog-migrate-archived.mjs --dry-run`
Expected: 报告当前是否有存量(把结果记录到 Task 12 收尾清单;**先 dry-run,确认清单合理后才允许真跑**)。

- [ ] **Step 6: Commit**

```bash
git add scripts/arcblog-migrate-archived.mjs scripts/arcblog-migrate-archived.test.mjs
git commit -m "feat: migration script for archived records stranded in posts/"
```

---

### Task 11: P1 — 文档/man 诚实化(随本轮改动同步的最小集)

**Files:**
- Modify: `.aup/man/compose.yaml`(session 身份描述)
- Modify: `.aup/man/reader.yaml`(删除 "Enforce status=published before rendering" 的虚假表述,改为 "location invariant: only published records exist in posts/")
- Modify: `.aup/man/admin.yaml`(删除不存在的生命周期/过滤操作描述,改为描述 Task 8 实现的真实操作)
- Modify: `.aup/man/about.yaml`(删除五个不存在的 action 引用)
- Modify: `docs/developer-guide.md`(compose 写入空 author 的段落更新为 session 署名;drafts 位置的既有正确描述保留)

**Interfaces:**
- Consumes: Task 5–8 的最终实现状态。
- Produces: man/docs 与实现一致(P4 做全面清理,本 Task 只改 P1 触碰面)。

- [ ] **Step 1: 逐文件修订**

按上面清单改;原则:**只写已经存在的行为,删除许愿**;每个被删承诺在 git diff 中可审。

- [ ] **Step 2: 验证 + Commit**

Run: `arc dsl validate --json && npm test`
Expected: 全绿(man yaml 参与 dsl validate)。

```bash
git add .aup/man/ docs/developer-guide.md
git commit -m "docs: honest man pages for P1 lifecycle/authorship semantics"
```

---

### Task 12: P1 收尾 — dist 再生成 + 全量质量门 + 走查清单

**Files:**
- Modify: `dist/`(`arc blocklet build` 重写)

- [ ] **Step 1: 构建 dist**

Run: `arc blocklet build`

- [ ] **Step 2: 全量质量门**

Run: `arc dsl validate --json && npm test`
Expected: 全绿。

- [ ] **Step 3: 走查清单(逐项确认并记录结果)**

1. 首页 feed 正常,封面缩略图渲染;
2. 匿名访问 /preview/<slug> → not-found(drafts admin-only);
3. compose 存草稿 → studio 出现;preview → Publish → /posts/<slug> 可读;
4. Archive 两步 → /posts/<slug> 404 → drafts 出现 archived;
5. studio/compose 非 admin member 不可见/不可写(Task 4;可用另一个 DID 角色验证,无法验证则记录为待办);
6. Task 5/6/9 的活体验证遗留项逐一确认或记录;
7. `node scripts/arcblog-migrate-archived.mjs --dry-run` 结果确认。

- [ ] **Step 4: Commit**

```bash
git add dist/
git commit -m "chore: rebuild dist for P1"
```

---

## 计划自查记录

- **Spec 覆盖**:P0 = spec §5 P0 行;P1 覆盖 D1(UI 侧 + Task 10 迁移;CLI archive 已符合 D1,无需改)、D2(Task 6)、D3(Task 5)、D4/D5(S4 已决:走 P2 降级路径,不在本计划)、D6(Task 4+Task 8)、D7(S1 已决:不做运行时校验,文档诚实化归 Task 11 与 P4)。S2/S3/S5/S6 结论已记录于计划头部 spike 表。
- **明确不做(本计划)**:RSS/SEO 输出(P2)、分页/tags 展示(P2)、i18n 收单轨与落地页删除(P3)、scripts 加固与 dist 一致性检查(P4)。
- **风险**:Task 5 Step 4 / Task 6 依赖运行时行为,均有 Fallback 或决策盒;Task 8 的两步归档是有意设计(先写副本后删原件),牺牲一键流畅换数据安全。
