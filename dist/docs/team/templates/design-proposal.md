# 模板：设计提案

> **所有者**：UI ｜ **上游**：spec §15 Admin UI / §17–§18 Web Device / §104–§106 Theme、`docs/ArcBlog-admin-ui-design.md`、`docs/share-cards.md`、现有 `.web/**` 与 `.aup/**` 页面 ｜ **下游**：PM（建 Dev 任务 / 裁决）、Dev（实现涉业务逻辑的部分）、QA（验证可观察行为）｜ **写入范围**：提案文件本身在 `docs/team/design/**`；UI 可直接实现 `.web/**`、`logo.svg`、主题资源

---

## 使用说明

1. 复制「骨架」到 `docs/team/design/PROP-<nnn>-<slug>.md`（编号全局唯一、顺序递增、不复用）。
2. **判断谁来实现**：纯表现层且落在 `.web/**` / `logo.svg` / 主题资源 → UI 自改；涉 `.aup/**`、`scripts/**`、`pages/**`、`world/**`、`blocklet.yaml`、`seed/**` → **必须交 PM 建 Dev 任务**，不自己动手。
3. 「验收方式」必须是**可观察行为或截图路径**，不接受"更好看""更一致"。
4. 若提案要求改动 `docs/ArcBlog-admin-ui-design.md` 的标准，必须在「方案」里显式写明并升级 Lead（UI 不单方面改标准）。
5. 引用平台约束时给章节号（如 `arc-contracts.md` §23/§24/§25），避免提出无法实现的方案。
6. 完成后 `send_message` 给 PM 一句：`PROP-<nnn> <标题>｜需 Dev: <路径>｜验收: <可观察行为>`。

---

## 骨架（可直接复制）

```markdown
# PROP-<编号>: <一句话标题>

| 字段 | 值 |
| ---- | -- |
| 提案号 | PROP-<编号> |
| 状态 | <草案 / 待 PM 派活 / 已派 Dev / 已实现 / 已否决> |
| 提出轮次 | round-<n> |
| 上游依据 | <spec §x / docs/ArcBlog-admin-ui-design.md §y / docs/share-cards.md / 现有文件> |
| 实现方 | <UI 自改 / 需 Dev> |

## 1. 问题

<!-- 填写要求：现象 + 证据（文件:行、页面名、token 值、截图路径）；引用设计标准或 spec 章节；
     不要写"感觉不好看" -->

- 现象：<…>
- 证据：`<path>:<line>`、页面 `<?page=…>`
- 依据：<spec §x / admin-ui-design §y>
- 影响：<用户完成什么任务时受阻或困惑>

## 2. 目标用户场景

<!-- 填写要求：谁（guest / 已登录 / admin / agent / Studio / Hub）、在什么情境、要完成什么 -->

<角色> 在 <情境> 下要 <完成什么>；当前因此 <遇到什么>。

## 3. 方案

<!-- 填写要求：具体到组件/文件/结构；写清与现有标准的差异；若需改标准，显式升级 Lead -->

- 界面结构：<…>
- 使用既有 token / 组件：<…>（对照 `docs/ArcBlog-admin-ui-design.md` §3/§4）
- 平台约束核对：<引用 arc-contracts.md §x / .agents/skills/aup-dsl 的哪条>
- 与现有标准的差异：<无 / 有（说明并升级 Lead）>
- 不做的事：<明确划出边界，例如"不改业务逻辑、不动 .aup 绑定">

## 4. 涉及文件与写范围

<!-- 填写要求：逐路径列出，并标明由谁实现 -->

| 路径 | 改动内容 | 实现方 |
| ---- | -------- | ------ |
| `.web/themes/<t>/tokens.json` | <…> | UI |
| `.aup/pages/<x>.aup` | <…> | **Dev**（提案） |
| `scripts/<x>.mjs` | <…> | **Dev**（提案） |

## 5. 验收方式

<!-- 填写要求：可观察行为或截图路径；每条都能被别人验证 -->

| # | 验收方式（可观察行为或截图路径） |
| - | -------------------------------- |
| 1 | <例如：控制台 15 页侧边栏当前行渲染 `data-active="true"` 且用 accent token> |
| 2 | <例如：截图存 `docs/team/design/screenshots/PROP-003.png`> |

## 6. 验证命令（若已由 UI 实现）

<!-- 填写要求：UI 自改并实现后填写；涉 Dev 部分由 Dev 填 -->

```bash
arc dsl validate --json
npm test
```
```

---

## 示例（填好的简短示例 · 演示用，非真实提案记录）

```markdown
# PROP-003: Agent 工具页空状态与列表标准不一致

| 字段 | 值 |
| ---- | -- |
| 提案号 | PROP-003 |
| 状态 | 待 PM 派活 |
| 提出轮次 | round-6 |
| 上游依据 | spec §15.8（Agent 能力与工具）、docs/ArcBlog-admin-ui-design.md §4.4 空状态 / §4.2 列表与卡片 |
| 实现方 | 需 Dev |

## 1. 问题

- 现象：控制台 `?page=agents` 的「能力与工具」列表在无数据时显示运行期默认英文文案，且没有页面级指引卡片；与其余 14 个控制台页面的空状态写法不一致。
- 证据：`.aup/pages/ops/agents.aup`；`CLAUDE.md` 记载"`emptyText` 不求值 `$t()`，空列表显示运行时默认英文"（`arc-contracts.md` §19/§20）。
- 依据：`docs/ArcBlog-admin-ui-design.md` §4.4（空状态必须给下一步指引）。
- 影响：管理员打开 Agent 页时看不到"如何授权 agent / 如何查看可用工具"的下一步，容易以为功能未实现。

## 2. 目标用户场景

admin 在控制台查看 Agent 能力与工具时，希望一眼知道当前有哪些默认关闭的工具、以及如何授权；当前只看到一行英文空文案而无从下手（对应 checklist 第 116 行「Agent 能力与工具页 🟡，AUP 界面待补」）。

## 3. 方案

- 界面结构：在 `?page=agents` 内容区加一张页面级空状态卡片（标题 + 一句说明 + 指向 `node scripts/arcblog-agent.mjs check` 的说明文字），列表本身保留。
- 使用既有 token / 组件：卡片用 admin-ui-design §4.2 的卡片样式与 §4.4 空状态规范；文案走该页 `i18n {}` 块声明的新 key（不要手写进 locales）。
- 平台约束核对：遵守 `arc-contracts.md` §19/§20（空状态放页面级卡片）、§24（根 `view` 的 `overflow` 不能是 `hidden`）、§25.3（不加显式 id）。
- 与现有标准的差异：无。
- 不做的事：不改 agent 授权逻辑、不改 `scripts/arcblog-agent.mjs`、不实现工具执行界面。

## 4. 涉及文件与写范围

| 路径 | 改动内容 | 实现方 |
| ---- | -------- | ------ |
| `.aup/pages/ops/agents.aup` | 新增空状态卡片 + 文案 key | **Dev**（提案） |
| `.aup/locales/*.json` | 由 `arc dsl generate` 生成（不手改） | **Dev**（提案） |

## 5. 验收方式

| # | 验收方式（可观察行为或截图路径） |
| - | -------------------------------- |
| 1 | `arc dsl validate --json` issues 为空；`npm test` 全绿（含死 locale key 门） |
| 2 | 打开 `?page=agents` 无数据时显示中文指引卡片，而非运行期默认英文空文案 |
| 3 | 截图存 `docs/team/design/screenshots/PROP-003.png` |

## 6. 验证命令（若已由 UI 实现）

```bash
arc dsl validate --json
npm test
```
```
