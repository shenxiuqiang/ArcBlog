# UI-019: 本波 2 页（posts / hub）预算回归 —— 半径覆盖上移主题层

| 字段 | 值 |
| ---- | -- |
| 提案号 | UI-019 |
| 状态 | 草案 → 待 Lead 裁决（裁决点 1） |
| 提出轮次 | round-26（审查 `task-23`，报告 [REVIEW-console-20260929](REVIEW-console-20260929.md) 第 1 条） |
| 上游依据 | `docs/ArcBlog-admin-ui-design.md` §2.7.2:278 / §2.7.7:324 / §9:693 / §4.3:445；`scripts/arcblog-ui-budget.mjs`；先例 UI-010（`.web/components/theme-bridge/` 的 `CHROME_CSS`） |
| 实现方 | 需 Dev（`.aup/**`）；标准措辞修订由 Lead 决定 |

## 1. 问题

- 现象：本波重构过的 7 页里，`?page=posts` 与 `?page=hub` **仍在 §2.7.2 硬上限之外** —— `posts` 内容列内联 `style={…}` **13 处**（上限 8），`hub` **15 处**（上限 8）、页内 i18n 键 **26**（上限 25）。
- 证据：
  - `node scripts/arcblog-ui-budget.mjs --json` → `{"page":"posts","metrics":{"styles":13,…},"over":["styles"]}`、`{"page":"hub","metrics":{"styles":15,"i18n":26,…},"over":["styles","i18n"]}`；
  - `node scripts/arcblog-ui-budget.mjs --strict >/dev/null; echo $?` → `1`；
  - **根因**：`docs/ArcBlog-admin-ui-design.md:445` 要求"圆角…运行时默认不一致（primary 8px、secondary/ghost 32px），**必须内联覆盖**"，于是每个行内 action 都带一处 `style={borderRadius: "var(--radius-md, 8px)"}`：`posts.aup:168,197,198,219,220,241,242`（内容列 7 处）、`hub.aup:159,181,182,183,207,224,228`（内容列 7 处）。
- 依据：§2.7.2「内联 `style={…}` 出现次数 ≤ **8**」「超限 = 不通过」；§9「预算（§2.7.2）：…七项全部不超限」；§2.7.7（同一段式样重复 7 次却未生成）。
- 影响：本波宣称重构完成的 7 页中有 2 页**未通过 §9 验收清单**；`scripts/ui-budget-baseline.json` 棘轮把这两页钉在超限值上，后续任何页面改动都会被判定"更差"。

## 2. 目标用户场景

admin 在 `?page=posts` 管理文章、在 `?page=hub` 管理 Studio↔Hub 收录时，页面本身是能用的；受影响的是**团队自己**——这两页在验收口径上不通过，导致下一波每次改这两页都会被棘轮判红，或者被迫在不理解原因的情况下重录基线（§2.7.6「只允许下调」）。

## 3. 方案

- 界面结构：**不改任何页面结构、不改任何文案语义**。只把"按钮圆角覆盖"从逐 action 内联上移到主题层，然后删除对应内联。
- 使用既有 token / 组件：覆盖写法沿用 §4.3 的取值 `var(--radius-md, 8px)`，**不新增 token**。
- 平台约束核对：
  - 落点用 `.web/components/theme-bridge/` 的 `CHROME_CSS`（先例 UI-010：同一位置追加 3 条覆写解决 destructive 对比度，`.aup` 零改动、回退 = 删几行）——`CHROME_CSS` 随 render 幂等重放，改版需复测（`arc-contracts.md` §21.15）。
  - 选择器必须**精确限定**：只覆盖运行时默认 32px 的次级/幽灵按钮，不影响 `variant=primary`（平台已是 8px）与侧栏（侧栏显式写 `borderRadius: "0"`）。
  - 按钮宽度规则不变（§4.3「宽度=内容宽」仍靠 `row cross=start` 包裹）。
  - 本提案**不动** `.aup` 的 id / 结构；不涉及 `active=true`、`overflow`、生成器锚点。
- 与现有标准的差异：**有**。§4.3:445 现写"必须内联覆盖"，本方案改由主题层覆盖 ⇒ 需 Lead 修订该句（裁决点 1 候选 A）。这是**标准冲突（G1）**，不是页面实现错误。
- 数字验证（可先算后做）：删掉各页 7 处内联后 `posts` `13−7=6` ✅、`hub` `15−7=8` ✅；`hub` 的 `i18n` 需再减 1 键（建议合并两个仅大小写/语序不同的 label key）。
- 不做的事：不改业务逻辑、不改 `events`/`exec`、不改文案语义、不动 `scripts/**` 的生成器、不重录基线（重录是收口动作，应由 Lead 决定）。

## 4. 涉及文件与写范围

| 路径 | 改动内容 | 实现方 |
| ---- | -------- | ------ |
| `.web/components/theme-bridge/`（`CHROME_CSS`） | 新增 1 条按钮圆角覆盖（精确限定次级/幽灵 variant） | **UI**（本表由 Dev/Lead 派活后执行；本轮审查不动） |
| `.aup/pages/admin/posts.aup` | 删除内容列 7 处 `style={borderRadius: "var(--radius-md, 8px)"}` | **Dev**（提案） |
| `.aup/pages/ops/hub.aup` | 删除内容列 7 处同上；合并 1 个 i18n 键 | **Dev**（提案） |
| `docs/ArcBlog-admin-ui-design.md` §4.3:445 | 措辞由"必须内联覆盖"改为"由主题层统一覆盖" | **Lead**（标准属 Lead 范围） |

## 5. 验收方式

| # | 验收方式（可观察行为或截图路径） |
| - | -------------------------------- |
| 1 | `node scripts/arcblog-ui-budget.mjs --json` 中 `posts.over=[]` 且 `hub.over=[]`；`posts.metrics.styles≤8`、`hub.metrics.styles≤8`、`hub.metrics.i18n≤25` |
| 2 | `node scripts/arcblog-ui-budget.mjs --strict >/dev/null; echo $?` 对这两页不再贡献失败（**注意**：其余 11 页仍会超限，`--strict` 整体仍为 1；本条只要求这两页的 `over` 为空） |
| 3 | 登录态截图 `docs/team/design/screenshots/UI-019-posts.png` / `UI-019-hub.png`：行内按钮圆角与改前一致（8px），次级/幽灵不再出现 32px 药丸 |
| 4 | `arc dsl validate --json` issues 为空；`npm test` 全绿（含 `arcblog-console-nav.test.mjs` 漂移门与预算棘轮门）→ 由 Lead 门执行 |
| 5 | 被删除的不是能力：`posts` 的 7 处覆盖对应的 7 个动作（archive / unpublish / publish / delete × tabs）仍全部可达（§2.7.4 能力保留） |

## 6. 验证命令（实现后）

```bash
node scripts/arcblog-ui-budget.mjs --json
node scripts/arcblog-ui-budget.mjs --strict >/dev/null; echo "strict exit=$?"
arc dsl validate --json
npm test
```
