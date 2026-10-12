# 07 · SET 设置与外观

| 字段 | 值 |
| --- | --- |
| 状态 | **已定稿（v1.0）** |
| 版本 | v1.0 ｜ 2026-10-01 ｜ 主笔 `dev-doc` |
| 上游 | [`00-需求地图与规范.md`](00-需求地图与规范.md)（§2 领域图：**实例外壳一致性**归本域）；[`00a-需求模板与验收规范.md`](00a-需求模板与验收规范.md)；**已冻结** [`docs/01-产品概念/`](../01-产品概念/00-导读.md)（`02 §2 C/G`、`03 §J1/J6`、`04 §1` 术语与状态）；[`concept-口径裁决-Lead.md`](../team/concept-口径裁决-Lead.md) |
| 下游 | Stage 3（`?page=general`/`appearance`、控制台外壳）；Stage 4（本地化与视觉条款）；Stage 6 台账（`FP-SET-*`） |
| 证据基线 | 页面与产物在册实测：`.aup/pages/admin/general.aup`（**字段路径**：`config/general/{language,site-name,timezone}`、开关：`config/switches/{rss,comments,agent-access}`）、`.aup/pages/site/seo.aup`（写 `node/profile.json`）、`.aup/wrapper.aup:45`（`theme-bridge-frame`）、`seed/settings/arcblog/{theme,palette,tone,home}.json`、`.aup/locales/{en,zh}.json`（**880 / 880** 键）、`blocklet.yaml:218`（`config` 整树 admin）；`scripts/console-nav.mjs` 的 `CONSOLE_SECTIONS` 实测 **21**。**凡计数一律从命令取、不写死**：`grep -oE 'config/(general|switches)/[a-z-]+' .aup/pages/admin/general.aup \| sort \| uniq -c` |
| 事实标签 | 五类（门槛 = [`docs/README.md`](../README.md) §3.1）；**本目录不写实现状态六态**（出处 = `docs/06-功能开发列表/`） |

> **领域范围**：实例设置（身份 / 语言时区 / 开关）、**外观与主题**、设置项**权限边界**、**实例外壳一致性**（含控制台侧栏单一真源与构建期多份侧栏）。
> **与相邻领域的分界**：不定义"本地化文案内容"（→ Stage 4）；不定义"权限模型"（→ [`04-ID`](04-ID-身份与角色.md)）；不定义"页面结构"（→ Stage 3）。
> **本域拥有"实例外壳一致性"**（控制台侧栏单一真源 + 构建期多份侧栏）⇒ `PRD-SET-04`（概念 `00 §2` 的领域边界）。

---

## 1. 能力组

| # | 能力组 | 一句话 | 覆盖的 `PRD-` |
| :-: | --- | --- | --- |
| K1 | 实例设置 | 实例级通用设置可写 / 可读 / 可回退 | `SET-02` |
| K2 | 实例开关 | 开关状态真实，**记录型不冒充有消费方** | `SET-03` |
| K3 | 外观与主题 | 主题全站生效且**不闪错主题** | `SET-01` |
| K4 | **外壳一致性** | 控制台侧栏单一真源 + 全高布局（**含构建期多份侧栏**） | `SET-04` |
| K5 | 本地化 | 键集一致、无死键、无字面 `$t()` | `SET-05` |
| K6 | 设置项权限边界 | `config` 整树 admin，guest 不可读写 | `SET-06` |

---

## 2. 需求总表（`PRD-SET-*`）

| PRD-ID | 一句话需求 | 概念条款 | 旅程/落点 | 现状标签 | 阻塞 | 优先级 | 验收 | 证据 | 验证者 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `PRD-SET-01` | 外观主题**全站生效**，且每次导航**不闪错主题** | `02 §2 C`、`04 §1` 公开面 | `03 §J1` 步 1；`?page=appearance` | 【已实现】 | 无 | P1 | `npm test`（`arcblog-theme` **在快层**）→ 全绿；连点 3 个菜单项后读 `data-palette` 与设置一致 | `.aup/wrapper.aup:45`（`theme-bridge-frame … overlay=true`）；`seed/settings/arcblog/{theme,palette,tone}.json` | 独立方（Stage 6 指派） |
| `PRD-SET-02` | 实例级通用设置**可写/可读/可回退**，且**同一字段只有一个入口** | `02 §2 C/G` | `03 §J1`；`?page=general` | 【已实现】（写入）/【规划中】（字段归属重整） | 无 | P1 | 逐字段：写入 → 回读一致 → 改回默认；**判定式**：`?page=seo` **不再**写 `node/profile.json` 的身份字段 | `.aup/pages/admin/general.aup`（**3 个字段路径**：`config/general/{language,site-name,timezone}`；**命中数从命令取**，见证据基线）；`.aup/pages/site/seo.aup`（写 `node/profile.json`）——**同字段两个入口是待修项** | 独立方（Stage 6 指派） |
| `PRD-SET-03` | 每个实例开关的**真实状态**可见；**记录型**开关不冒充"有消费方" | `02 §2 G`、`04 §1` | `03 §J1`；`?page=general` | 【已实现】（记录 + 标注）/【规划中】（部分消费方） | 无 | P2 | **3 个开关**（`config/switches/{rss,comments,agent-access}`）各显示"是否有消费方"；写开关 → 回读一致；**命中数从命令取** | `.aup/pages/admin/general.aup`（开关路径见左；计数命令见证据基线） | 独立方（Stage 6 指派） |
| `PRD-SET-04` | 控制台外壳**单一真源**、全高布局、且**构建期不靠手工重复** | `02 §2 G`、`04 §1` | `03 §J1`；现 21 个控制台页（外壳） | 【已实现】（生成器）/【平台边界】（多份侧栏的成因） | **无**（降级形态 = 生成器 + `--check` 门，**已落**） | P1 | `npm test`（`arcblog-console-nav --check` **在快层**）→ 各页侧栏与模型一致；`?page=<id>` 未注册时**不静默回落首页** | `scripts/console-nav.mjs`（`CONSOLE_SECTIONS`，实测 **21**）；**多份侧栏的成因 = 平台无跨页片段**（见 [`02a`](../05-开发文档/02a-平台禁止与降级模式.md) `F4`） | 独立方（Stage 6 指派） |
| `PRD-SET-05` | 本地化**键集一致**、无死键、无字面 `$t()` | `02 §2 C` | `03 §J1`；全部页 + `.aup/locales/` | 【已实现】 | 无 | P2 | `en`/`zh` 键数相等（本轮实测 **880 / 880**）；`arc dsl lint` 的 `dead_locale_keys` 计数**从命令取**，**不得写死** | `python3 -c` 读 `.aup/locales/{en,zh}.json` → 880 / 880；`npm test`（`arcblog-i18n` **在快层**） | 独立方（Stage 6 指派） |
| `PRD-SET-06` | 设置项**权限边界**正确：`config` 整树 admin，guest 读写皆拒 | `02 §2 G`、`01 §2 P1` | `03 §J6`；`?page=general` | 【已实现】 | 无 | P1 | `npm test`（`arcblog-permissions` **在快层**）；guest 读 `config/**` → `Forbidden`（**须匹配 `below readRole`**，避免把"未声明路径"当成"已授权"） | `blocklet.yaml:218`（`canonical: instance/app/arcblog/config/*`，整树 admin） | 独立方（Stage 6 指派） |

---

## 3. 未验证与探针（**凡【未验证】必给验证方法与判定式**）

| 关联 | 未验证什么 | 验证步骤 | 判定式 | 阻塞 |
| :-: | --- | --- | --- | --- |
| `PRD-SET-02` | **字段归属重整**后，"实例身份"是否只剩一个入口 | ① 在 `?page=general` 改身份字段 ② 在 `?page=seo` 查同名字段 ③ 回读 `node/profile.json` | 同一字段**只有一个**写入者；`seo` 页不再写 `node/profile.json` | 无（可在本仓直接改 + 回读验证） |
| `PRD-SET-04` | 未注册 page id 是否**静默回落首页** | 访问 `?page=__nonexistent__` | **不得**静默落到公开首页（应给出可辨识的空态/说明） | 无（只读访问） |

> **两条都不是"已跑过"**：上表是**待做**的验证，写在本节是为了让 Stage 6 有可执行判据。

---

## 4. 不做什么（本域）

| 项 | 理由 |
| --- | --- |
| 不做"本地化文案内容"的规范 | 归 Stage 4（文案与 i18n）；本域只管**键集与机制** |
| 不做权限模型的设计 | 归 [`04-ID`](04-ID-身份与角色.md)；本域只声明"设置项的边界" |
| 不做商品/付费等交易相关设置 | 产品选择：不内置支付与访问控制（`01 §2 P3`） |
| 不为"多份侧栏"引入跨页片段机制 | **【平台边界】**：平台无跨页片段（见 [`02a`](../05-开发文档/02a-平台禁止与降级模式.md) `F4`）⇒ 只能**生成器投影 + `--check` 门** |

---

## 5. 开放问题

> 下列各条**均为【决策待定】**：事实已清楚，只待人拍（【决策待定】的条目**不排期**，见 [`00a §2`](00a-需求模板与验收规范.md)）。

| # | 问题 | 影响 | 裁决人 |
| :-: | --- | --- | --- |
| S1 | `PRD-SET-02` 的字段归属重整是**一步做完**还是拆两条（身份字段 / 通用设置） | `SET` 条目粒度 | Lead |
| S2 | `PRD-SET-03` 的 `comments` 开关**无消费方**时，页面文案用哪种标准写法（记录型标注 vs 直接隐藏） | Stage 3/4 文案与条款 | Lead |
| S3 | 第三语言是否立项 | `SET-05` 范围 | 人类 |

---

## 变更记录

| 日期 | 版本 | 变更 |
| --- | --- | --- |
| 2026-10-01 | v1.0 | 首版 |
