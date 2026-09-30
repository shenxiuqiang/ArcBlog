# UI-020: `?page=media` 的门禁卡标题写成了另一个页面的名字（"运维"）

| 字段 | 值 |
| ---- | -- |
| 提案号 | UI-020 |
| 状态 | 草案 → 待 Lead 裁决（裁决点 3） |
| 提出轮次 | round-26（审查 `task-23`，报告 [REVIEW-console-20260929](REVIEW-console-20260929.md) 第 2 条） |
| 上游依据 | `docs/ArcBlog-admin-ui-design.md` §2.4:148 / §9:679 / §1:23；`docs/ArcBlog-admin-ui-design.md` §2.7.7:329（门禁卡纳入生成器） |
| 实现方 | 需 Dev（`.aup/**`） |

## 1. 问题

- 现象：guest 打开 `?page=media`，门禁卡标题显示 **「运维」**，而该页的说明写「使用 DID Wallet 登录后查看媒体索引。」——标题与说明自相矛盾，且"运维"是**另一个控制台页面**（`?page=operations`）的侧栏标签。
- 证据：
  - 探针输出：`node scripts/arcblog-browser-probe.mjs 'http://arcblog.localhost:4939/?page=media' --json`
    → `"text": "ArcBlog\n运维\n使用 DID Wallet 登录后查看媒体索引。\n使用 DID Wallet 登录"`
  - 截图：`docs/team/design/screenshots/review-media.png`（渲染出的标题就是「运维」）
  - 源码：`.aup/pages/ops/media.aup:8` = `gate-title { en "Operations" zh "运维" }`，而同文件 `:20` = `title { en "Media" zh "媒体" }`
  - 侧栏对照：`.aup/locales/zh.json` → `wrapper.nav-media = "媒体"`（本页）、`wrapper.nav-operations = "运维"`（`?page=operations`）
- 依据：§2.4「页头：标题（h2）+ 一句话说明」+「标题不说废话…说明回答'这一页是干什么的'」——标题必须指本页；§9「页头：标题 + 一句话说明 + 至多一个主操作」；§1「一致：同样的信息用同样的方式呈现」。
- 影响：未登录访客/新用户从侧栏点「媒体」后，右侧大标题写着「运维」，会以为自己进错页；且与侧栏另一项重名，无法用标题自我定位。

## 2. 目标用户场景

guest（或刚被登出、会话过期的 admin）在控制台点侧栏「媒体」进入 `?page=media`，想确认这一页是干什么的；当前只看到「运维」这个属于另一页的标题，无法判断自己在哪一页，也不知道登录后能看到什么。

## 3. 方案

- 界面结构：**不改结构**，只改这一页门禁卡的标题文案来源：`gate-title` 与页面 `title` 同源（`Media` / `媒体`）。
- 使用既有 token / 组件：门禁卡片沿用页面既有的 `view … visible="!$session.authenticated"` + `h2 :gate-title level=2`（与其余 6 个 A 层页一致），不新增组件。
- 平台约束核对：
  - 文案 key 必须声明在**本页自己的** `i18n {}` 块（`media.aup:2-`）里，不能借别的页面的 key（`compose-edit` 就是反例，见 UI-021）；`arc dsl generate` 采 merge 语义，不自删 key（`arc-contracts.md` §31）。
  - 不改 id、不改 `visible` 两态结构、不动 `overflow`（§24）、不加显式 id（§25.3）。
- 与现有标准的差异：无。这是**实现与既有条款不一致**，不是标准缺口。
- 长期方案（可选，见裁决点 3 候选 B）：§2.7.7 已把「登录门禁卡 + 内容列骨架」列为"纳入同一生成器"的目标；生成器落地时让门禁卡标题**从 `title` 派生**，可同时消除本页与 `compose-edit` 的漂移。
- 不做的事：不改 `.aup/locales/*.json`（生成物，由 `arc dsl generate` 写）、不改其他 20 页、不改业务逻辑。

## 4. 涉及文件与写范围

| 路径 | 改动内容 | 实现方 |
| ---- | -------- | ------ |
| `.aup/pages/ops/media.aup:8` | `gate-title` 由 `Operations / 运维` 改为 `Media / 媒体` | **Dev**（提案） |
| `.aup/locales/{en,zh}.json` | 由 `arc dsl generate` 更新（不手改） | **Dev**（提案） |

## 5. 验收方式

| # | 验收方式（可观察行为或截图路径） |
| - | -------------------------------- |
| 1 | `node scripts/arcblog-browser-probe.mjs 'http://arcblog.localhost:4939/?page=media' --json` 的 `text` 首行标题为「媒体」（不再是「运维」） |
| 2 | 截图 `docs/team/design/screenshots/UI-020-media-gate.png`：门禁卡标题 = 「媒体」，与说明「…查看媒体索引」一致 |
| 3 | 交叉核对：`?page=operations` 的门禁卡标题仍是「运维」，两页不再重名 |
| 4 | `arc dsl validate --json` issues 为空；`npm test` 全绿（含死 locale key 门与 `arc dsl generate --check` 漂移门） |

## 6. 验证命令（实现后）

```bash
arc dsl validate --json
npm test
node scripts/arcblog-browser-probe.mjs 'http://arcblog.localhost:4939/?page=media' --json
```
