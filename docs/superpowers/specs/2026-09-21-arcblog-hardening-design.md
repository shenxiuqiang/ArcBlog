# ArcBlog 打磨完善设计文档(0.4)

日期:2026-09-21
状态:已评审通过,待分期实施
范围:P0–P4 全四期(修正确性 → 兑现承诺 → 体验打磨 → 工程卫生)

## 1. 背景与目标

ArcBlog 是 DID-native、Markdown-first 的发布型 Blocklet(Arc/AUP 栈)。v0.3.x 的深层问题不是缺功能,而是**文档与实现脱节**:man 页、roadmap、release checklist 承诺的功能大量未实现,已实现部分存在 9 处断链/假承诺/正确性缺陷,`dist/` 严重过期。

本次打磨的目标:让 ArcBlog 成为一个**所有 UI 文案与文档承诺都已兑现、质量门全绿、可长期维护**的成熟单管理员博客产品。版本目标 **0.4.0**。

## 2. 产品定位决策(本轮拍板)

1. **单管理员博客**:owner/admin 是唯一创作者。studio、compose、hero 管理、生命周期操作全部要求 admin;member 与匿名用户只读。文档中删除一切多作者协作/归属校验的暗示。
2. **删除落地页**:移除 `.web/arcblog-home/`、`pages/index/` 及其死代码。AUP posts 页继续作为首页;`.route/web` 只保留 theme-bridge。
3. **不做的能力**(明确 out of scope):评论/审核、订阅/newsletter 流、AI 辅助写作、多作者、真正的全文搜索(本期仅做力所能及的筛选)。

## 3. 核心设计决策

### D1. 存储不变量:位置即真相

- `/instance/app/arcblog/posts/` **只放 status=published**。阅读页绑定此目录——非发布文章天然 404,无需依赖 AUP 表达式比较(表达式语言仅支持 `||`/`&&`/`!`,不支持 `==`)。
- **archive = 移动记录到 drafts/**(status=archived);republish = 移回 posts/。
- Admin 列表按目录分组:"Published"读 posts/,"Drafts & archived"读 drafts/ 并用状态徽章区分 draft/archived/deleted。删除"Published"列表的状态过滤需求(不变量保证全为 published)。
- CLI `archive`/`republish`/`delete` 语义同步调整;`moveRecord` 改为原子操作(见 D9)。

### D2. 编辑流

- compose 支持编辑模式:`?slug=` 参数 + `propBind` 从 drafts/(或 posts/)载入记录到表单初始值,复用 reader/preview 已验证的 two-channel 模式。保存时保持 `createdAt`、`version` 递增。
- 预览页增加 Edit(→ compose?slug=)、Publish(写 posts/ + 删 drafts/)、Delete(软删)三个操作。
- admin 列表行增加编辑入口。
- **风险**:需 spike 验证 propBind 能否驱动表单 `state.value` 初始值。降级:预览页/列表提供"载入到 compose"的显式入口(CLI 兜底)。

### D3. 作者署名

- spike 验证 exec args 模板中 `$session.did` / `$session.displayName` 是否可用。可用 → compose 直接写入。
- 不可用 → 降级:settings 目录增加 owner 档案记录(DID + 显示名),studio 设置页可编辑,compose 服务端读取后写入。单管理员模型下此方案完全成立。
- 阅读页 byline 渲染真实作者;空作者记录(历史数据)显示站点默认名。

### D4. RSS

- spike 验证 AUP runtime 能否输出非 HTML 响应(XML content-type),以及能否将 `/rss.xml` 绑定到该输出。
- 能 → 动态 feed:读 posts/ 全量,item 含 author/category/enclosure(coverImage)/content:encoded,channel 含 lastBuildDate/language/atom:link,链接用 pretty URL `/posts/<slug>`。
- 不能 → 退化:`arcblog-rss.mjs` 生成 `dist/rss.xml`(补齐上述字段),UI 保留链接仅在生成物被宿主服务时有效,文档写明部署步骤。两条路径都以"消除死链"为底线——若 feed 无法被服务,UI 不出现 RSS 链接。

### D5. SEO/OG

- 与 D4 同一 spike:验证页面级 head 注入能否使用服务端拉取的记录字段。
- 支持 → reader 输出完整 title/description/OG/Twitter meta(用 seo*/og* 字段的 fallback 链:title → seoTitle → ogTitle)。
- 不支持 → 本期仅兑现"字段保留 + RSS 用尽字段",改写 `docs/share-cards.md` 措辞为"字段已就绪,等待运行时支持 meta 注入"。

### D6. 权限模型(网络层强制)

- `blocklet.yaml` replicated collections 的 `minRole: member` → `admin`(posts、drafts、heroes、settings 全部)。
- studio/compose 页面可见性改用管理员级 session 标志(spike 确认 `$session.*` 可用字段;若无 role 字段,则以 write 授权在网络层兜底 + 页面维持 authenticated 门禁)。
- hero quick-add 去重:写入前检查同 slug,冲突时提示;sort 改为数值并自增。

### D7. compose 护栏

- UI 侧只做表达式能力内的事:required 字段(已有)、slug 提示强化。
- world/post.yaml 补充字段约束(类型、必填、长度上限)。
- 若 spike 发现 `/.actions/write` 会按 world schema 执行校验,则 UI 路径自动获得与 CLI 同级的护栏;否则文档明确:CLI 是带完整校验的规范创作路径,UI 写入不经过 markdown 安全过滤。

### D8. 落地页删除

- 删除 `.web/arcblog-home/`、`pages/index/`(含 render.js/script.js/style.css 死代码:假链接、失效的 mode-toggle、硬编码统计)。
- `.route/web` 仅保留 `/p → theme-bridge`;`pages/` 只保留 theme-bridge。
- 删除 `blocklet.yaml` 中对落地页的任何绑定(如有)。

### D9. scripts 加固(P4)

- `moveRecord` 原子化:写 dest → 读回校验 → 删 source;失败回滚并报错。
- `slugify` 保留 CJK 字符(双语产品的硬伤:中文标题当前产出空 slug)。
- audit 脚本 slug 白名单校验(堵路径注入 `../../`)。
- 抽取公共 `blockletExec` 模块,消除 4 处复制。
- `arcblog-query-posts.mjs`:`total` 报告真实总数;未识别 status 报错退出。
- `arcblog-rss.mjs`:pretty URL、补全 item/channel 字段、pubDate 合法性。
- `arcblog-daily-report.mjs`:扫描 posts/ + drafts/,按状态真实聚合;--limit 不再导致少计。
- 测试隔离:全部测试改用独立 test instance(`--instance arcblog-test`),不污染默认实例;RSS 测试自建 fixture 不依赖真实数据。
- 版本 bump 0.4.0,补 release notes。

### D10. 文档与 dist 防漂移(P4)

- 全面清理 man 页、roadmap、release checklist、product summary 中描述不存在功能的文案(生命周期操作、过滤器、分享卡、多作者等)。
- 确定 dist 生成命令,写入 CLAUDE.md;新增质量门:dist 与源码一致性检查(至少校验 blocklet.yaml 版本与关键文件 hash)。

## 4. Spike 清单(P1 计划开头执行,每项有明确降级路径)

| # | 验证内容 | 影响决策 |
|---|---|---|
| S1 | `/.actions/write` 是否按 world/post.yaml 做 schema 校验 | D7 |
| S2 | exec args 模板中 `$session.did/displayName` 及 role 字段 | D3、D6 |
| S3 | propBind 能否驱动表单 state 初始值(编辑模式) | D2 |
| S4 | 页面级 head/meta 注入能力,能否用记录字段;能否输出 XML 并以 `/rss.xml` 服务 | D4、D5 |
| S5 | afs-list 的 search/filter 表达式能力边界(分页、模糊匹配) | P3 搜索/分页方案 |

## 5. 分期交付

| 期 | 内容 | 出口质量门 |
|---|---|---|
| **P0** | 收尾在途封面图功能:修复 3 处空容器校验错误,`arc dsl validate --json` 全绿;locales/man 同步 | validate + test 全绿 |
| **P1** | S1–S5 spike;D1 存储不变量(archive 移动、reader 404 语义);D2 编辑流(按 S3 结果);D3 署名(按 S2 结果);D6 权限(按 S2 结果);D4/D5 按 S4 结果落地;预览页操作;admin 生命周期按钮;hero 修复 | validate + test 全绿;承诺清单逐条核对 |
| **P2** | RSS 完整化;SEO/OG(S4 支持时);tags 展示与筛选;分页;错误/加载态(onErrorToast、骨架屏) | 同上 + 手工走查清单 |
| **P3** | i18n 收单轨(删孤儿 key、SEO 卡翻译);可访问性(替代文本、对比度、键盘);移动端布局;落地页删除(D8);死代码清理(未引用主题组件,如确认零引用则删) | 同上 |
| **P4** | D9 scripts 加固 + 测试隔离;D10 文档清理 + dist 同步机制;版本 0.4.0 + release notes | 全部门 + dist 一致性 |

每期一份独立实现计划(writing-plans),逐期执行;每期结束产品处于可交付状态。

## 6. 风险与开放问题

1. **S4 是最大的不确定性**:AUP runtime 若既不能输出 XML 也不能做动态 meta 注入,D4/D5 走降级路径,UI 需相应调整 RSS 链接可见性。这是产品能力边界,不是 blocker。
2. **P3 死代码清理**:~28 个默认主题组件确认零引用后删除;若部分组件被 `.web/themes/` 其他活动部分共享则保留并记录。
3. **历史数据**:P1 的 D1 变更后,存量 archived-in-posts 记录需一次性迁移到 drafts/(写一次性脚本,含测试)。
4. **测试实例**:`arcblog-test` instance 的创建/清理纳入 P4 测试改造,不依赖真实数据。

## 7. 非目标(明确不做)

- 评论、点赞、订阅/newsletter
- 多作者协作与归属校验
- AI 辅助写作
- 全文搜索(本期仅筛选)
- 商业化、支付、NFT 等 Blocklet 平台能力
