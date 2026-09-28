# SPEC-APPROVAL-001 — 需要用户批准才能落笔的 spec 修订清单（L-R11-3）

> **用途**：本文件是 **Lead 可直接呈给用户** 的批准清单。依据 **Lead 裁定 L-R11-3**：`docs/ArcBlog-product-technical-spec.md` **只有人类可改**，PM 只产出 **diff-ready 的修订提议**，**不得直接编辑该文件**。
> **轮次** Round 11（精简轮，2026-09-28）｜**角色** PM（`task-29`）｜**上游** [`SPEC-REVIEW-001-feasibility-and-operability.md`](SPEC-REVIEW-001-feasibility-and-operability.md) §C（11 条原始提议，含**可直接替换的 markdown 原文**）+ 本轮 R11 实测更正（该文件 §E）
> **写范围** 本文件。**未改** spec / 源码 / 测试 / checklist / `arc-contracts.md` / `admin-ui-design.md`。
> **怎么用**：用户在下方「批准勾选表」逐条勾 ✅/❌；勾 ✅ 的条目由**人类**改 spec（或授权 Lead 代改并留 diff）；本文件不代替任何实现任务。

---

## 0. 一句话结论

- 原审查（`SPEC-REVIEW-001` §C）给出 **11 条** diff-ready 提议；PM 本轮**新增 3 条**（R11 实测发现，编号 C-12…C-14）→ 合计 **14 条**。
- **其中 3 条是「与实测直接冲突」（P0/P1，不修则后续每个 agent 都可能按错误前提写代码）**：C-01（HTTP 端点）、C-02（Web Device 前提）、C-03（控制台落点）。
- **1 条必须由用户做产品/法务决策**：C-08（spec §140 建议 Apache-2.0，而 `blocklet.yaml:33` 是 `license: UNLICENSED`，仓库无 `LICENSE` 文件）。
- **其余为口径诚实化/字段映射（P2/P3）**：不修不会写坏代码，但会让「按 spec 配的 URL / 字段 / 集合」与实现事实对不上。
- **不需要改 spec、只需改团队文档的 4 项**见 §3（由 Lead/授权写入方处理，不必占用用户决策）。

证据分级沿用 `SPEC-REVIEW-001` §0：`[E1]` 本轮实测命令 + 真实输出；`[E2 §n]` `docs/arc-contracts.md` 实测小节；`[E3 path:line]` 源码/清单行号；`[E4]` 推断（显式标注）。

---

## 1. 批准勾选表（呈给用户：每条只需「改 / 不改」）

| # | 优先级 | 章节 | 一句话问题 | 建议 | 影响面 | 用户决定 |
| --- | --- | --- | --- | --- | --- | --- |
| **C-01** | **P0** | §46 / §68 / §110 / §117（+§101） | spec 写 `GET /api/health` 等 HTTP 端点，实测全部返回 AUP 壳 HTML（平台 root 路由被 `handler: aup` 吞掉） | 每处**插入一段平台约束 + AFS 等价实现**（`node/discovery.json` / `node/health.json` / `economy/attributions/*`）；`endpoints` 保留形状但默认留空、`transport:["afs","mcp"]` | 无功能回退（AFS 形态已实现）；不改 → 运营者会按 spec 配死链。**checklist 行不动**（147/148 已 ✅） | ☐ 改 ☐ 不改 |
| **C-02** | **P0** | §17 / §18 / §84 / §106 / §127 / §151 规则 4 | spec 承诺「公开 Blog 用 Web Device」，实测 Web Device 页面**服务端与客户端都没有 AFS 通道**，content-site 烘焙路径不可达 | 把「公开站点」拆为**静态面（Web Device）**与**动态内容面（AUP + `sites[].bindings]`）**；§151 规则 4 限定为「public **static** site content」；逐条静态 HTML + per-route SEO 记为平台受限（POST-MVP） | 影响 §17/§18/§84/§106/§127/§151 六节措辞；**checklist 行不动**（54/55 ✅ 只承诺静态承载） | ☐ 改 ☐ 不改 |
| **C-03** | **P1** | §15.1（spec L855） | 写「单个 AUP 页面 + 15 节 + hash 深链 + `console-bridge` + 旧页名别名页」，实测是**一事一页** `?page=`（本轮已 **5 组 18 页**、无 bridge、无别名页） | **整段替换**为 B′ 口径（17→以 `CONSOLE_SECTIONS.length` 为准、生成器 + `--check`、平台原生 `active=true`） | 影响 §15.1 一段；不改 → 每个 agent 都会按 hash 版控制台找不存在的组件。**checklist 第 98 行不动** | ☐ 改 ☐ 不改 |
| **C-04** | **P1** | §124 / §125 | spec 写 `/rss.xml`、`/atom.xml`；实测 root 静态文件不可达，feed 实际是 **`/p/rss.xml`** 且为**部署期静态快照**，Atom **未生成** | 补平台约束段（`/p/rss.xml` + 部署期生成 + Atom 可同法生成） | 影响 §124/§125；**checklist 第 90 行**备注应写实际 URL 与「Atom 未生成」 | ☐ 改 ☐ 不改 |
| **C-05** | **P1** | §21 | 承诺五档可见性，实测 AFS 读权限只有 `guest`/`admin`、**无 per-DID 读** → `members` 平台无路径 | 列表后插入**实现边界**：`public`/`private`/`paid` 已实现；`unlisted` 可用目录边界实现；**`members` 记为平台受限** | **checklist 第 83 行** 🟡 保持，备注把 `members` 从「待实现」改为「平台受限」 | ☐ 改 ☐ 不改 |
| **C-06** | P2 | §99 / §102 | spec 写 `src/{core,content,…}` 项目结构；ARC 包是 DSL + 资产形态，无 Node 服务入口，Adapter 实际是 `scripts/lib/arc.mjs` | 节首加「实现映射」限定句，余下内容作为**目标形态**保留 | 纯文档；checklist 不动 | ☐ 改 ☐ 不改 |
| **C-07** | P2 | §126 | 承诺逐条静态 HTML + per-route SEO；content-site 烘焙在 blocklet 面不可达 | 节末加「可达性」段：站点级默认 + 文章级 OG 字段可做，**逐条静态 SEO 记为平台受限** | **checklist 第 91 行** 🟡 保持，备注改为「站点级已做 / 逐条静态 = 平台受限」 | ☐ 改 ☐ 不改 |
| **C-08** | **P2（需产品/法务决策）** | §140 | spec 建议 **Apache License 2.0**，而 `blocklet.yaml:33` = `license: UNLICENSED`，`ls LICENSE` → **No such file**（`[E1-13][E1-15]`） | 二选一：**(a) 落地开源**（补 `LICENSE` Apache-2.0 全文 + 改 manifest）；**(b) 改 spec**（改为「许可证待定，当前 `UNLICENSED`」） | 影响仓库根 `LICENSE` + `blocklet.yaml`（**Lead/人类**）；checklist 无许可证行 | ☐ (a) 落地开源 ☐ (b) 改 spec |
| **C-09** | P3 | §20 | spec front-matter 字段名（`author`/`date`/`layout`/`economy.mode`）与 AFS 记录字段（`authorDid`/`authorName`/`publishedAt`/`productId`）不一致 | 加一句**记录形态映射**（逐字段对应；`layout` 属 Web Device/V2） | 纯文档；checklist 不动 | ☐ 改 ☐ 不改 |
| **C-10** | P3 | §40 | spec 列 8 个经济集合（含 `payments`/`tips`/`subscriptions`），实际是 7 个目录（`payments` 并入 order、`tips` = `order.kind`、`subscriptions` = `product.type`） | 加映射表 | 纯文档；checklist 不动 | ☐ 改 ☐ 不改 |
| **C-12（本轮新增）** | P2 | §15.10 | spec 要求「菜单 × 角色对照（按 Capability 显隐）」，但平台 `visible` **只支持同步 `$session.*` 表达式**，异步单记录渲染有首屏竞态（`[E2 §28.1/§21.11]`） | 在 §15.10 补一句**平台边界 + 两条降级路径**（A：插值 `visible="${state.x}"` + 单记录 `propBind`，须先探针；B：生成器按角色产出多份侧栏） | 影响 §15.10；**checklist 新增第 122 行 ⬜**（本重基线新增）的备注可写「降级路径 A/B」 | ☐ 改 ☐ 不改 |
| **C-13（本轮新增）** | P2 | §15.9（诊断与维护） | spec 的「达成标准」隐含「在后台点几下完成自检」，但 AUP 按钮**无法执行任意服务端代码**（provider 挂载是唯一机制且**当前未生效**，`[E2 §26.1/§26.2]`） | 在 §15.9 诊断节补一句**诚实形态**：「诊断页 = **结果可视化 + 命令一键复制**（`key-value-list copyable`），不是假装的『页面内一键诊断』」 | 影响 §15.9 达成标准的可验收口径；**checklist 第 121 行** 🟡 的备注引用此口径 | ☐ 改 ☐ 不改 |
| **C-14（本轮新增）** | **P1** | §111 | spec 原文声称「Blocklet manifest 当前**已经有** `cron` 运行时声明字段」；实测：`arc dsl schema` **不含 cron**、`grep -rn cron blocklet.yaml .aup/app.aup docs/development-plan.md` **0 命中**（`[E1-14]`），而 **daemon 级** `/scheduler` 真实存在（`[E1-9]`，平台自带 `index-follower` cron 任务） | 把该句改为**待验证**：「daemon 级 scheduler 已实测存在（`/scheduler/schedules/*`）；**blocklet manifest 声明自己的 cron 未验证**，需一次探针（`arc afs write /scheduler/schedules/*` 能否由 blocklet 注册）」 | 影响 §111 与 F 组「Hub Sync Scheduler」**新增第 161 行 ⬜**；不改 → 后续会按不存在的 manifest 字段写实现 | ☐ 改 ☐ 不改 |

> **C-11 不在本表**：它是**非 spec 文件**的三处实测数字/结论已过期（`arc-contracts.md` / `CLAUDE.md` 的 lint 计数、§29.2 的口径），**由 Lead/授权写入方更正，不需要用户批准**——见 §3。

---

## 2. 逐条详情（章节 + 现状问题 + 建议改法 + 影响面）

> **可直接使用的替换文字全文**在 [`SPEC-REVIEW-001`](SPEC-REVIEW-001-feasibility-and-operability.md) §C（每条都给了 markdown 引用块）；本轮新增的 C-12…C-14 的建议文字见本文件上表「建议」列，PM 可随时补成同样格式的引用块。此处只给**决策所需的四个要素**。

### C-01（P0）§46 / §68 / §110 / §117（+§101）— HTTP 端点写成平台真实形态
- **章节**：§46（L2211–L2229）、§68（L2780–L2804）、§110（L3959–L3975）、§101（L3723）、§117（L4105）。
- **现状问题**：`GET /api/economy/discovery`（L2216）、`GET /.well-known/arcblog`（L2797）、`GET /api/health`（L3964）、`GET /api/article/full`（L4110）——实测四路径 + `/api/profile` + `/llms.txt` **全部 200 `text/html` 4809 B（AUP 壳）**，`/p/llms.txt` 才是 200 `text/plain`（`[E1-8]`、`[E2 §7]`）。平台无 root 自定义 HTTP 端点能力。
- **建议改法**：每处插入「平台约束 + AFS 等价实现」段（全文见 SPEC-REVIEW-001 §C-01）。
- **影响面**：AFS 等价物**已实现**（`node/discovery.json` / `node/health.json` / `economy/attributions/*`）→ **无功能回退**；不改则运营者/后续 agent 会配死链。checklist 147/148 不动。

### C-02（P0）§17 / §18 / §84 / §106 / §127 / §151 规则 4 — Web Device 前提
- **章节**：§17（L1368–L1388）、§18（L1392–L1419）、§84（L3213）、§106（L3858）、§127（L4325）、§151 第 4 条（L5129）。
- **现状问题**：L1370「ArcBlog 的公开 Blog 应使用 Web Device.」——Web Device 页面**既无服务端 AFS 通道也无客户端 AFS 通道**（不启动 AUP runtime、无 `window.afs`）；content-site 烘焙（`cms-write`/`cms-publish`）在 blocklet 面不可达（content space 闭网）（`[E2 §3.3/§8]`）。
- **建议改法**：拆分「静态面（Web Device 承载 theme-bridge/robots/sitemap/llms.txt）」与「动态内容面（AUP 动态页 + `sites[].bindings]`）」；§151 规则 4 限定为 **static**。
- **影响面**：§17/§18/§84/§106/§127/§151；checklist 54/55 ✅ 不动（只承诺静态承载）。

### C-03（P1）§15.1 — 控制台实现落点
- **章节**：§15.1（L853–L875，痛点 L855）。
- **现状问题**：spec 描述 hash 版控制台（单页 + 15 节 + `console-bridge` + 别名页），实测 B′ **一事一页** `?page=<name>`、**5 组 18 页**（本轮 PM 实测 `pages 18` / `nav-group-settings` 新增）、无 bridge、无别名页（`[E1-3/E1-6/E1-7]`、`[E2 §16/§23]`、`scripts/console-nav.mjs:1-18`）。
- **建议改法**：整段替换为 B′ 口径，页数一律「以 `CONSOLE_SECTIONS.length` 为准，不写死」。
- **影响面**：§15.1 一段；checklist 第 98 行不动。

### C-04（P1）§124 / §125 — RSS/Atom 地址与生成时机
- **章节**：§124（L4269–L4282，痛点 L4274/L4275）、§125（L4284–L4304）。
- **现状问题**：`/rss.xml` 不可达（root 被 AUP 吞掉），实际 **`/p/rss.xml`** 且是**部署期静态快照**；`ls .web-cache/` 无 `rss.xml`（需脚本生成）；**Atom 未生成**（`[E2 §3.4/§11]`）。
- **影响面**：checklist 第 90 行「RSS / Atom ✅」备注须写实际 URL + Atom 未生成（**状态列可保持 ✅**，因为 RSS 本体已实现并经 QA 复验）。

### C-05（P1）§21 — 五档可见性
- **章节**：§21（L1481–L1491，痛点 L1483）。
- **现状问题**：五档承诺 vs 平台只有 `guest`/`admin` 两角色、**无 per-DID 读**（`[E2 §13]`）；`world/post.yaml` 的 `visibility: public | paid` 仅两值。
- **影响面**：checklist 第 83 行 🟡 保持 + 备注改「`members` = 平台受限」。

### C-06（P2）§99 / §102 — 项目结构与 Adapter 位置
- **现状问题**：`src/…` 与 `src/adapters/arc/` 在 DSL/资产包里不存在；唯一 Adapter 是 `scripts/lib/arc.mjs`（`[E2 §2]`、`development-plan.md:17-28`）。
- **影响面**：纯文档，无。

### C-07（P2）§126 — 逐条静态 SEO 可达性
- **现状问题**：逐条静态 HTML + per-route SEO 依赖 content-site 烘焙，blocklet 面不可达（`[E2 §8/§3.4]`）；`/p/sitemap.xml`、`/p/robots.txt`、`/p/llms.txt` 由平台生成（不含文章条目）。
- **影响面**：checklist 第 91 行 🟡 备注改「站点级已做 / 逐条静态 = 平台受限」。

### C-08（P2，需产品/法务）§140 — 许可证
- **现状问题**：spec L4666 建议 Apache-2.0；`blocklet.yaml:33 = license: UNLICENSED`；无 `LICENSE` 文件（`[E1-13][E1-15]`）。
- **两条路**：(a) 补 `LICENSE`（Apache-2.0 全文）+ manifest 改 `Apache-2.0`，spec 不动；(b) spec 改为「许可证待定」。
- **影响面**：仓库根 + manifest（Lead/人类）；checklist 无该行。

### C-09（P3）§20 — 文章元数据字段名
- **现状问题**：front-matter 示例字段与 AFS 记录不一致（`author`→`authorDid`/`authorName`；`date`→`publishedAt`；`economy.mode`→`productId`；`layout` 属 Web Device/V2）。
- **影响面**：纯文档。

### C-10（P3）§40 — 经济集合映射
- **现状问题**：8 个逻辑集合 vs 7 个实际目录；`payments` 并入 order、`tips` = `order.kind: tip`、`subscriptions` = `product.type: subscription`。
- **影响面**：纯文档。

### C-12（P2，本轮新增）§15.10 — 能力驱动菜单的平台边界
- **现状问题**：spec 要求「按 Capability 显隐」；平台 `visible` **只支持同步 `$session.*`**（`[E2 §28.1]`），异步 `$state.*` 条件渲染失效（首屏竞态 `[E2 §21.11]`），生成器当前**无 capability 字段**（`grep -n capability scripts/console-nav.mjs` 空）。
- **建议改法**：补平台边界 + 两条降级路径（A 探针优先 / B 构建期多份侧栏）。
- **影响面**：checklist **新增第 122 行 ⬜**（菜单结构与能力驱动）。

### C-13（P2，本轮新增）§15.9 诊断与维护 — 「后台点几下」的诚实形态
- **现状问题**：AUP 页面**不能执行任意服务端代码**；provider 挂载是唯一机制且**当前未生效**（`[E2 §26.1/§26.2]`）。spec 的达成标准会被读成「页面内一键自检」。
- **建议改法**：写明诊断页 = **结果可视化 + 命令一键复制**；不引入通知/告警系统（spec 只要求 Dashboard 提醒条）。
- **影响面**：checklist 第 121 行 🟡 的备注与 REQ 验收口径。

### C-14（P1，本轮新增）§111 — manifest `cron` 字段是否存在
- **现状问题**：spec 声称 manifest「当前已经有 `cron` 运行时声明字段」；实测 **0 命中** + `arc dsl schema` 无 cron（`[E1-14]`），但 daemon **`/scheduler` 真实存在**且平台自带 cron 任务（`[E1-9]`）。
- **建议改法**：把「已经有」改为**待验证**（daemon scheduler 已实测 / manifest 声明未验证），并列出探针做法。
- **影响面**：F 组 checklist **新增第 161 行 ⬜**（Hub Sync Scheduler）；R12 路线表的 §111 探针依赖此口径。

---

## 3. 不需要用户批准、但需要 Lead/授权写入方更正的团队文档（4 项，一并呈报）

| # | 文件 | 原文 | 本轮实测 | 建议 |
| --- | --- | --- | --- | --- |
| **C-11a** | `docs/arc-contracts.md` §25.4（L1182） | 「现在仓库里保留 **24 条** `unreferenced_explicit_id` 警告」 | `arc dsl lint --json` → **16**（全部 `unreferenced_explicit_id`；PM 本轮实跑） | 改为「以 `arc dsl lint` 实测为准（2026-09-28 = 16）」 |
| **C-11b** | `CLAUDE.md`（L79） | 「10 `unreferenced_explicit_id` as of 2026-09-27」 | 同上 **16** | 同上（并去掉写死数字） |
| **C-11c** | `docs/arc-contracts.md` §29.2（L1479–L1496） | R9F 的「既有记录写入一律被拒」（同节 L1485–L1494 已自我更正为「与记录来源/写入模式/daemon 状态相关」） | R10 复测同实例写入成功；R11 六条 CLI seed 记录从页面写入**全部成功**（QA round-11 §3.D-1） | 按 **backlog D16（R10 遗留）** 限定适用条件或整条标为历史观察；**该节同时是 BUG-022 的判据来源** |
| **C-11d** | `.aup/man/settings.yaml` | 历史遗留存根（`page: settings`，引用不存在的 action id `arcblog-settings-card-1-action-3`） | 无对应页面（真实页名 `settings-general`） | **删除或改名**为 `settings-general`；`.aup/man/**` 不属 Dev/PM 写范围 → **Lead 处理** |

> 另：`docs/ArcBlog-admin-ui-design.md` 的 D1–D5 文档缺口（[UI-007](../design/UI-007-console-pixel-walkthrough.md) §7.4）**需要 Lead 授权**（改的是口径/期望值，不是事实错误），不属「用户批准 spec」范畴，但与上表同批呈报更省事。L-R11-2 只授权了 UI 改**事实错误**（本轮已改 1 处：§2.1 两行 + 版本 V1.5→V1.6）。

---

## 4. 批准后的落地顺序（建议）

1. **先批 3 条与实测冲突项（C-01 / C-02 / C-03）**：它们是后续每个 agent 的**前提**，不批则 R12–R15 的界面/网络/文档工作都建在错误前提上。
2. **再批 C-14（§111）与 C-05（§21 members）**：直接决定 R12 两个立项（调度探针、可见性降级）的口径。
3. **C-08（许可证）单独走产品/法务**：与代码无关，但影响「自托管 + 可携带」的对外叙事（spec §140–§141）。
4. **C-04 / C-07 / C-12 / C-13 随对应轮次批**（RSS/SEO/菜单/诊断页），不阻塞。
5. **C-06 / C-09 / C-10 为文字级**（可一次性批量批）。
6. **§3 的 4 项不急**，但 **C-11c（§29.2）建议在本轮就改**——它是 BUG-022 的判据来源，页面文案已在等它定稿。

---

## 5. C-15（已授权并落笔）：数据层设计入 spec（2026-09-28）

**授权来源（人类所有者，本会话原文）**：「最终程序是发布到应用商店，用户一键部署，目标服务器应该是单实例；目前 ArcBlock 公司正在改造迁移 store 应用基于 arc；应用采用SQLite 后，有很多数据是不是都可以考虑存在数据库？**将最终研究设计方案写入产品技术文档，拆分任务列表到文档。**」

- **性质**：属本文件 §3 所说的「授权 Lead 代改并留 diff」路径（不占用 C-01…C-14 的逐条勾选）。
- **落笔内容**：
  - `docs/ArcBlog-product-technical-spec.md` 新增 **§154**（数据层最终方案：部署前提 / 平台事实 F1–F10 / 三层数据模型 / 数据分类表「哪些数据可以进 DB」/ 七条不变式 I1–I7 / 正文是否拆分 / Hub 形态 / 运维契约 / 待实测 P0–P2）与 **§155**（阶段 0–5 任务拆分 T0-1…T5-5 + 依赖图与任务板映射）。
  - 同文件 **§6** 与 **§98** 各加一条指向 §154/§155 的引用；**未删除、未重写任何既有条款语义**。
  - 镜像：`docs/ArcBlog-feature-checklist.md` 新增 **I 组 6 行 ⬜** + 维护记录一行 → **✅82 / 🟡7 / ⬜19 / ⚪2 = 110**。
- **复核命令**：`git diff --stat docs/ArcBlog-product-technical-spec.md docs/ArcBlog-feature-checklist.md`；`grep -n '^# 154\.\|^# 155\.' docs/ArcBlog-product-technical-spec.md`。
- **后续追认项**：§154.7 保留的「正文拆成独立 `.md`」若触发（产品需要可移植 `.md` / AFS 侧也需 `where` 查询），应按正常流程另立 **C-16** 并重新评估签名、付费门禁与媒体引用三处改动。
- **补丁 1（同日，阶段 0 只读调研回收，2026-09-28）**：spec §154.3 追加事实 **F11–F18**（provider 契约 / import 阶段禁令 / **无文档化 per-provider 本地目录** / `build` 是否复制 `providers/**` **未证明** / beta.50 **无 `arc blocklet publish`** / SQLite 由 native addon 供应且 ESM 解析依赖 Bun / provider 第三方依赖解析未文档化）；§154.2 增加「依赖面必须最小」约束；§154.9 增加「**DB 落点与持久性**」行（持久化不是正确性前提 → 首选每实例可重建的 SQLite）；§154.10 探针表扩为 P0-1…P0-7、P1-1…P1-3、P2-1；§155 的 T0-2 重写并新增 **T0-5 / T0-6**，T1-1 增加「零依赖 + 句柄只在 `onMount`」。平台事实同步沉淀到 `docs/arc-contracts.md` **§33**；checklist I 组首行备注已同步。
- **补丁 2（同日，阶段 0 两项探针实跑回收，2026-09-28）**：**T0-5 通过** —— `arc blocklet build` 确实把 `providers/**` 打包进 `dist/` 与 `.afs/manifest.json`，并把 `mounts` 展平进 `dist/blocklet.dist.json`（spec F15 由"未证明"改为已证）；**T0-2 前半通过** —— 运行时为 Bun 1.4.2，`bun:sqlite`（SQLite 3.51.0 / FTS5 / 文件库持久 / 聚合）全部可用，`node:sqlite` 备选，native addon 不作依赖（spec F17 更新、P0-2 与 P0-4 标 ✅、§155 的 T0-2/T0-5 标已完成）。平台实测沉淀 `docs/arc-contracts.md` §33(9)。**仍待**：T0-1（挂载在部署形态是否真的加载，需在共享 daemon 注册一个探针 blocklet）、T0-3（`sqlite://` 挂载，需批准写 `.afs-config`）、T0-4、T0-6。探针均在 `/tmp`，**未写仓库、未动共享实例**。

---

## 6. C-16（已授权并落笔）：管理后台菜单 IA 修订（2026-09-28）

**授权来源（人类所有者，本会话原文）**：「对管理后台菜单重新进行规划，根据功能类型、使用习惯重新命名、归类、排序，你有什么好的建议」→ Lead 呈报提案后，人类回复「**授权、直接执行 task-12**」（授权 = 按 §3 的既定流程代改 spec 并留 diff）。

- **性质**：先由 Lead 出提案 [`docs/team/design/UI-017`](../design/UI-017-console-menu-information-architecture.md)（含逐项 before/after、验收标准、风险与顺序约束），人类授权后落笔 spec。**未实施**代码改动（实施 = 任务板 `task-18`，插入 `task-12 → task-18 → task-13` 链路）。
- **落笔内容**：`docs/ArcBlog-product-technical-spec.md` **§15.2 菜单结构总览整节重写** —— 由旧的 6 组形态（含 `商品`/`账户 Wallets`/`角色与能力`/`节点身份`/`审计日志`/「分类与标签」合并项等**从未实现**的行）改为「**已实现 + 已批准目标**」的 5 组 21 行；补「六类运营心智 → 5 组」映射、四条规则（一行一用途 / 组名不得与行名同词 / 低频只读面折叠且能力不删 / 节数不写死）。
- **明确登记**：**`?page=` 名、组 key、行 key 全部不变**；只改显示文案、归组与顺序。旧 §15.2 与实现的差异是**文档自身的历史漂移**（实现一直是 5 组 21 行），本次一并纠正。
- **镜像**：`docs/ArcBlog-feature-checklist.md`「菜单结构与能力驱动（§15.1/§15.2/§15.10）」行的备注补记本次目标 IA 与实施任务（状态列**不变** —— 能力驱动菜单仍未实现）。
- **复核命令**：`grep -n '^## 15.2' docs/ArcBlog-product-technical-spec.md`；`node -e "import('./scripts/console-nav.mjs').then(m=>console.log(m.CONSOLE_SECTIONS.length))"`（=21）；`git diff docs/ArcBlog-product-technical-spec.md`。
- **后续追认项**：UI-017 **提案 B**（行数 21→17 的合并）未授权、未实施；实施前需另立条目。
