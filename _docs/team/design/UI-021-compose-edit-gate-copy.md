# UI-021: `?page=compose-edit` 门禁卡借用 compose 的文案，且不言明"编辑"

| 字段 | 值 |
| ---- | -- |
| 提案号 | UI-021 |
| 状态 | 草案 → 待 Lead 裁决 |
| 提出轮次 | round-26（审查 `task-23`，报告 [REVIEW-console-20260929](REVIEW-console-20260929.md) 第 3 条） |
| 上游依据 | `docs/ArcBlog-admin-ui-design.md` §2.7.4:296 / §9:679 / §1:23；`CLAUDE.md`「`$t(page.key)` 写在别的页面里 = 引用但未声明」；`arc-contracts.md` §31（locale 生成语义） |
| 实现方 | 需 Dev（`.aup/**`） |

## 1. 问题

- 现象：`?page=compose-edit` 的**门禁卡**（未登录态）渲染出的是 `?page=compose`（新建文章）的标题与说明：探针两个 URL 的 `text` **逐字相同**（"用钱包发布 / 使用 DID Wallet 登录以解锁编辑器。草稿保存在私有草稿目录中，直到发布。"）。编辑页读不出"这是编辑一篇既有草稿"。
- 证据：
  - `.aup/pages/admin/compose-edit.aup:27-28`：
    `p "$t(compose.gate-title)" level="2" style={fontSize: "var(--type-body)"}` /
    `p "$t(compose.gate-desc)" intent=muted`
    —— 跨页引用 `compose` 的 key；本页 `i18n{}`（`:2-23`）**没有** `gate-title` / `gate-desc`。
  - 探针：`node scripts/arcblog-browser-probe.mjs 'http://arcblog.localhost:4939/?page=compose-edit' --json` 与 `…?page=compose` 的 `text` 完全相同；截图 `screenshots/review-compose-edit.png` ≡ `screenshots/review-compose.png`。
  - 7 个 A 层页中唯一不用 `h2 :gate-title` 的一页（其余 6 页均 `h2 … level=2`）。
  - 本页自身文案是齐的：`:22 title = "Edit post / 编辑文章"`、`:5 desc = "Edit this draft, then save it back…"`、`:15 not-found`，说明作者知道这页是编辑页 —— **只有门禁卡漏了**。
- 依据：§2.7.4「**单一用途**：页面说明必须是一句能回答『操作者在这里干什么』的话」；§9 页头条；`CLAUDE.md` i18n 规则（跨页 key 属引用未声明）。
- 影响：从 `?page=posts` 行内「编辑」进入 `/edit/<slug>`（记录绑定页面，按 §2.6 新标签页打开）的用户，若会话过期，看到的是"新建文章"的门禁文案；他无法确认点进来的这篇草稿还在不在、登录后会回到哪一页。

## 2. 目标用户场景

admin 在 `?page=posts` 的草稿行点「编辑」，浏览器新标签页打开 `/edit/<slug>`；此时钱包会话过期，页面退回控制台（`?page=compose-edit`）。他要判断"登录后我是回到编辑这篇草稿，还是丢掉当前上下文"。当前门禁文案答的是"解锁编辑器"，没有回答这个问题。

## 3. 方案

- 界面结构：不改结构；在 `compose-edit` 自己的 `i18n{}` 里补两个 key，并把门禁卡的两个 `p` 改成与其余 6 页一致的 `h2 :gate-title level=2`：
  - `gate-title`: `"Edit post" / "编辑文章"`（与 `:22 title` 同源）
  - `gate-desc`: `"Sign in with DID Wallet to edit this draft; save it back to the private drafts or publish it." / "使用 DID Wallet 登录后编辑这篇草稿，可存回私有草稿或直接发布。"`
- 使用既有 token / 组件：沿用页面既有门禁卡结构与 `intent=muted`，不新增组件、不新增 token。
- 平台约束核对：
  - key 必须声明在**本页** `i18n{}`（`arc-contracts.md` §31：`generate` 采 merge、不删 key；跨页 `$t()` 会变成"引用但未声明"，是既有平台陷阱）。
  - `h2` 与 `p` 在本平台**都渲染为 `DIV.aup-text`**（`.agents/skills/aup-dsl/SKILL.md:66`），因此本改动**不是**可访问性修复，只是源码一致性；报告中不得按 a11y 缺陷上报。
  - 不改 id、不改 `overflow`（§24）、不加显式 id（§25.3）。
- 与现有标准的差异：无。
- 长期方案：§2.7.7 的门禁卡生成器落地后，`gate-title` 从 `title` 派生，`gate-desc` 可在生成器里给一个"编辑类页面"的模板句 —— 本提案可作为该轮的先行止血。
- 不做的事：不改 `?page=compose`（它的文案是对的）、不改 `/edit/<slug>` 路由与 `propBind`、不改 `not-found` 逻辑。

## 4. 涉及文件与写范围

| 路径 | 改动内容 | 实现方 |
| ---- | -------- | ------ |
| `.aup/pages/admin/compose-edit.aup:2-23` | 新增 `gate-title` / `gate-desc` 两个 key | **Dev**（提案） |
| `.aup/pages/admin/compose-edit.aup:27-28` | `p "$t(compose.gate-*)"` → `h2 :gate-title level=2` + `p :gate-desc` | **Dev**（提案） |
| `.aup/locales/{en,zh}.json` | 由 `arc dsl generate` 更新（不手改） | **Dev**（提案） |

## 5. 验收方式

| # | 验收方式（可观察行为或截图路径） |
| - | -------------------------------- |
| 1 | `node scripts/arcblog-browser-probe.mjs 'http://arcblog.localhost:4939/?page=compose-edit' --json` 的 `text` 与 `?page=compose` 的 `text` **不再相同**，且标题为「编辑文章」 |
| 2 | 截图 `docs/team/design/screenshots/UI-021-compose-edit-gate.png`：门禁文案说明"编辑这篇草稿" |
| 3 | 全仓 `grep -rn '\$t(compose\.' .aup/pages/` 在 `compose-edit.aup` 上**无命中**（跨页 key 引用清零） |
| 4 | `arc dsl validate --json` issues 为空；`npm test` 全绿（含死 locale key 门：新 key 有引用、无死键） |
| 5 | 登录态走查（**受限**，需 admin 会话）：`/edit/<slug>` 登录后仍落在编辑页且表单预填正常（`value="${state.post.*}"` 范式，`arc-contracts.md` §19） |

## 6. 验证命令（实现后）

```bash
arc dsl validate --json
npm test
node scripts/arcblog-browser-probe.mjs 'http://arcblog.localhost:4939/?page=compose-edit' --json
grep -rn '\$t(compose\.' .aup/pages/admin/compose-edit.aup || echo "no cross-page key reference"
```
