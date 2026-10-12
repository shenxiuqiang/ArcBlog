# 01 · CNT 内容创作

| 字段 | 值 |
| --- | --- |
| 状态 | **已定稿（v1.0）** |
| 版本 | v1.0 ｜ 2026-10-01 ｜ 主笔 `doc-owner` |
| 上游 | [`00-需求地图与规范.md`](00-需求地图与规范.md)（领域图 / 编号 / 引用关系）；[`00a-需求模板与验收规范.md`](00a-需求模板与验收规范.md)（模板列与验收规范）；**已冻结** [`docs/01-产品概念/`](../01-产品概念/00-导读.md) |
| 下游 | Stage 3 页面设计（`?page=compose/posts/pages/media`）；Stage 6 台账（`FP-CNT-*`） |
| 证据基线 | 命令与产物均实测在册（脚本路径、`npm test` 快层、`grep` 计数） |
| 事实标签 | 五类（门槛 = [`docs/README.md`](../README.md) §3.1）；**本目录不写实现状态六态**（出处 = `docs/06-功能开发列表/`） |

> **领域范围**：写作与编辑、生命周期与状态、分类与标签、静态页、媒体资产、**agent 生成草稿的人审与署名**。
> **与相邻领域的分界**：不定义"怎么发到公开面"（→ `02-SITE`）；不定义"谁能写"（→ `04-ID`）。

---

## 1. 能力组

| # | 能力组 | 一句话 |
| :-: | --- | --- |
| K1 | 写作与编辑 | 草稿的产生与编辑（人工 / agent 生成 → 人审） |
| K2 | 生命周期与状态 | 草稿 → 发布 → 归档 → 再发布 → 软删 |
| K3 | 分类与标签 | 分类白名单与标签治理（含索引陈旧风险） |
| K4 | 静态页 | 独立页面的上线/下线 |
| K5 | 媒体资产 | 上传索引、引用、孤儿清理 |
| K6 | **来源与署名** | 内容的作者/生成来源可追溯（含 agent 生成稿） |

---

## 2. 需求总表（`PRD-CNT-*`）

| PRD-ID | 一句话需求 | 概念条款 | 旅程/落点 | 现状标签 | 阻塞 | 优先级 | 验收 | 证据 | 验证者 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `PRD-CNT-01` | 创作者能写一篇并发布到公开面（**走可信署名路径**） | `01 §0③`、`01 §4.1` | `03 §J1` 步 1–5；`?page=compose`、CLI `arcblog-lifecycle publish --sign-key` | 【已实现】 | 无 | P0 | `node scripts/arcblog-lifecycle.mjs publish … --sign-key node.key` → `posts/<slug>.json` 出现且含签名；`/posts/{slug}` 200 | `scripts/arcblog-lifecycle.mjs`；`scripts/arcblog-verify.mjs content --slug x` | 独立方（Stage 6 指派） |
| `PRD-CNT-02` | **页面写入的署名不得落字面量**（页面提交路径） | `01 §4.2` 缺陷 1、`04 §1` 发布 | `03 §J1` 卡点 1 | **【平台边界】**（2026-10-12 同步：探针 `U6` = **判定 B**，已结论） | 待平台能力 | P1 | **结论**：运行时**只在文本节点**（整串 `$session.<字段>`）与 `visible=` 下解析会话；`args` 词表只有 `${args.<输入名>}`/`${input.*}` ⇒ 页面提交**必然**落字面量。**降级路径（已实现）** = CLI 写署名（`arcblog-lifecycle publish … --sign-key`；`arcblog-doctor` 可查出空署名记录）；要让页面路径也带真署名 ⇒ 由 worker/CLI 回填，属**产品口径变更（需人类决定）** | 结论层 = [`05/02 B18`](../05-开发文档/02-平台能力与边界.md)；原始证据 = [`05/07 U6`](../05-开发文档/07-未决技术问题与探针计划.md) + `docs/05-开发文档/附件/arc-contracts.md` §62 | 待定（独立方） |
| `PRD-CNT-03` | 内容三态可回看：草稿/已发布/归档（含软删）与再发布 | `01 §4.1`、`04 §1` 发布 | `03 §J1`；`?page=posts` | 【已实现】 | 无 | P1 | `node scripts/arcblog-query-posts.mjs published` 与 `drafts` 目录比对；三态迁移脚本各跑一次，记录数守恒 | `scripts/arcblog-lifecycle.mjs`（`publish`/`archive`/`delete`） | 独立方（Stage 6 指派） |
| `PRD-CNT-04` | 分类白名单可治理；标签重命名/合并不留下孤儿引用 | `01 §2 P3`（越简单越好） | `03 §J1`；`?page=categories`/`tags` | 【已实现】 | 无 | P2 | `node scripts/arcblog-category.mjs list`；`arcblog-tags.mjs list` 后 `merge` → 逐篇复核 `tags` 无旧名 | `scripts/arcblog-category.mjs`、`scripts/arcblog-tags.mjs` | 独立方（Stage 6 指派） |
| `PRD-CNT-05` | **索引陈旧不得让内容"消失"**：过滤列表与实际记录一致 | **平台事实型**（见 `00a §3-A1′`）：`docs/05-开发文档/02-平台能力与边界.md`（`B5` 索引/过滤条） | `03 §J1` | 【平台边界】 | 待平台能力 | P1 | 复现：`afs-list filter` 查询编辑过的记录 → 命中缺项；**降级** = 走目录边界/`propBind`（见 `docs/05-开发文档/附件/arc-contracts.md` §15，**原始证据**） | 结论层 = `docs/05-开发文档/02-平台能力与边界.md` `B5` | 待定（独立方） |
| `PRD-CNT-06` | 静态页可上线/下线，且公开页与下线状态一致 | `01 §2 P3` | `03 §J1`；`/pages/{slug}` | 【已实现】 | 无 | P2 | `node scripts/arcblog-pages.mjs list`；下线后 `/pages/{slug}` 不可读（预期 404/空态） | `scripts/arcblog-pages.mjs` | 独立方（Stage 6 指派） |
| `PRD-CNT-07` | 媒体资产可索引、清理孤儿；**上传不可用时有 CLI 降级** | `01 §7` 平台强制层 | `03 §J1`；`?page=media` | 【已实现】（索引/清理）/【平台边界】（页内上传） | 待平台能力 | P2 | `node scripts/arcblog-media.mjs list` → 走 `refs`/`orphans`；页面不提供假上传入口（降级 = 复制命令） | `scripts/arcblog-media.mjs`；Stage 5 `02`（降级结论层） | 独立方（Stage 6 指派） |
| `PRD-CNT-08` | **agent 生成的草稿进入同一创作流程**（人审 → 署名 → 与人工稿无差别） | `01 §1`（为什么现在②）、`04 §1` agent 聚合 | `03 §J4` 步 6–7；`?page=compose-edit` | **【已实现】**（2026-10-12 同步；控制台发布路径另见 `DEF-20`） | 无 | P0 | **已跑（live 1/1）**：grant → `create_draft` 落 `drafts/` → **人审** = 只读 `arcblog-query-posts.mjs draft`（同页 agent 面 `get_post` 对草稿返回 NOT_FOUND）→ 人跑 `publish --sign-key` → `arcblog-verify.mjs content` = hash+signature true。**判定式成立**：草稿键集 **25 == 人工稿 25 == `world/post.yaml` 25 字段**（唯一额外键 `contentSignature`），只读面负向成立 | 台账 [`06/01` `PRD-CNT-08`](../06-功能开发列表/01-功能台账.md)（= 已实现待验）· `scripts/arcblog-agent-publish-flow.test.mjs` · `scripts/arcblog-agent-draft.test.mjs`（live 2/2） | 待定（独立方） |

---

## 3. 未验证与探针（**凡【未验证】必给验证方法与判定式**）

| 关联 | 未验证什么 | 验证步骤 | 判定式 | 阻塞 |
| :-: | --- | --- | --- | --- |
| `PRD-CNT-02` | ~~页面写入的**署名落库形态**（`args` 模板是否插值）~~ **已结论（`U6` = 判定 B，2026-10-12；浏览器复核降级为可选）** | ~~① 用页面表单提交一次 ② 读回 `posts/<slug>.json`~~（机制已定性；如需复核跑一次即可） | `authorDid` **必然** = 字面量 `"$session.did"`（`args` 词表无会话值）⇒ 走 CLI 降级 | **无**（离线 bundle 已定性；结论层 = [`05/02 B18`](../05-开发文档/02-平台能力与边界.md)） |
| `PRD-CNT-08` | ~~agent 生成稿的**编排**是否可直接复用创作流程~~ **已跑（2026-10-12，live 1/1）** | `npm run test:file -- scripts/arcblog-agent-publish-flow.test.mjs`（`create_draft` → 人审 → `publish --sign-key` → `verify content`） | 字段集相同（**25 == 25 == `world/post.yaml`**）、无额外私有字段（唯一额外键 = `contentSignature`）；agent 只读面看不到草稿 | 无 |

---

## 4. 不做什么（本域）

| 项 | 理由 |
| --- | --- |
| 不做页面内直接发布（应用内） | 【平台边界】：应用无运行时依赖 ⇒ 只能写意图，发布在运营侧（`01 §7`） |
| 不做内容质量/排名的自算指标 | 违背 `01 §6`（"谁被看见"不由平台决定）；计数只取平台给出的分页器 |
| 不做付费/访问控制相关的创作门 | 产品选择：不内置支付与访问控制（`01 §2 P3`） |

---

## 5. 开放问题

| # | 问题 | 影响 | 裁决人 |
| :-: | --- | --- | --- |
| C1 | `PRD-CNT-08` 是单条还是拆"生成/人审/署名"三条 | 条目粒度 | Lead |
| C2 | `PRD-CNT-02`：`U6` **已判 B（不插值）** ⇒ 页面写入是**直接禁用**（只留 CLI 路径），还是保留写入 + 由 worker/CLI 回填署名 | 产品选择 | 人类 |

---

## 变更记录

| 日期 | 版本 | 变更 |
| --- | --- | --- |
| 2026-10-01 | v1.0 | 首版 |
