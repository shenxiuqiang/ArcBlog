# UI-022: `?page=dashboard` 的空态指引落在 `emptyText` 上，平台不求值 → 空态没有下一步

| 字段 | 值 |
| ---- | -- |
| 提案号 | UI-022 |
| 状态 | 草案 → 待 Lead 裁决 |
| 提出轮次 | round-26（审查 `task-23`，报告 [REVIEW-console-20260929](REVIEW-console-20260929.md) 第 4 条） |
| 上游依据 | `docs/ArcBlog-admin-ui-design.md` §4.4:455 / §9:681 / §2.7.1（P2 骨架）；`docs/arc-contracts.md` §20:745（平台实测）；正确范式同仓 `ops/media.aup:15`、`admin/pages.aup:33` |
| 实现方 | 需 Dev（`.aup/**`） |

## 1. 问题

- 现象：`?page=dashboard` 的两条**空态文案**都写在 `afs-list` 的 `emptyText` 上，而其中一条承载着本页唯一的"下一步"动作指引。平台实测 `emptyText` 在运行期**不求值** ⇒ 用户在空列表里只能看到运行时的默认英文 "No items to display"，看不到"用上方的『写文章』开始一篇"。
- 证据：
  - `.aup/pages/admin/dashboard.aup:155` → `afs-list dashboard-drafts-list … emptyText=:drafts-empty …`
  - `.aup/pages/admin/dashboard.aup:176` → `afs-list dashboard-published-list … emptyText=:content-empty …`
  - key 定义：`:9 drafts-empty { en "No drafts waiting. Use “Write a post” above to start one." zh "没有待处理的草稿。用上方的「写文章」开始一篇。" }`；`:4 content-empty { en "No published stories yet." }`
  - 平台事实：`docs/arc-contracts.md` §20「`emptyText=:list-empty`（编译后为 `"$t(page.list-empty)"`）在运行期**不被求值**：空列表渲染运行时默认的英文 "No items to display"…**属平台缺口，不是单页写法问题**。空态引导文案目前只能靠 `emptyText` 之外的可见元素承载（如页面级提示卡）」
  - 同仓正确范式：`.aup/pages/ops/media.aup:15 media-standing-note`（常驻说明，明确写"不能代表列表行数的断言"）、`.aup/pages/admin/pages.aup:33 queue-empty-note`（常驻说明 + 权威入口）。`admin/posts.aup:35 status-note` 也绕开了同一缺口。
- 依据：§4.4「空状态是**引导页**，不是『暂无数据』四个字…公式：**一句现状 + 一句价值 + 一个动作**。空状态永远给出下一步」；§9「状态：空状态有引导和动作」。
- 影响：新节点第一次登录（`drafts/` 与 `posts/` 都空）时，`?page=dashboard` 是落地页，用户看到两块空的默认英文提示，**不知道下一步该点哪** —— §9 要求的空态动作缺失。`dashboard` 是 A 层 7 页之一，也正是 P2 原型"一眼看清全局与待办"的门面页。

## 2. 目标用户场景

admin 刚把节点跑起来、还没有任何内容，登录后落在 `?page=dashboard`。他要完成"写第一篇"这件事；当前两个列表都只给运行时默认英文空文案，页面上唯一的主按钮「写文章」在页头上方，但没有任何空态文案把它和"现在该干嘛"连起来。

## 3. 方案

- 界面结构：**保留** `emptyText`（它无害，且平台可能在未来版本修好），**另加**一张页面级常驻说明卡，放在内容区**列表之前**，含：
  1. 一句现状 + 一句价值 + 一个动作（§4.4 公式）；
  2. 一个真实动作：`action -> page compose variant=secondary label=:empty-cta`（指向 `?page=compose`；本页的 `variant=primary` 仍是页头「写文章」，不得新增第二个 primary —— §4.3「每屏一个 primary」）；
  3. 措辞按 `media`/`pages` 的范式**如实说明这是常驻说明**，不声称"列表为空"（平台无法探测列表长度，§4.8 诚实降级）。
- 使用既有 token / 组件：卡片用页面既有的 `style={background: "var(--card-bg)", border: "var(--card-border)", borderRadius: "var(--radius-lg, 10px)", padding: "20px"}`；文案 key 声明在本页 `i18n{}`；动作按钮沿用既有 `variant=secondary` + §4.3 尺寸档。
- 预算核对（§2.7.2，`dashboard` 当前 `blocks 2 / cards 1 / styles 8 / ctrl 2 / i18n 14 / tech 0`）：
  - 新增 1 个顶层区块 → `blocks 3`（上限 3）✅；
  - 新增 1 张 `var(--card-bg)` 卡 → `cards 2`（上限 2）✅；
  - 内联 `style` 已 **8/8 用满**，因此新卡片**不得再写内联 style**：改用既有 token 或复用相邻卡片的属性；新增动作按钮**不写** `borderRadius` 内联的话会退回 32px（§4.3）——**这是与 §4.3 的冲突点，见下**；
  - ctrl `2 → 3`（上限 12）✅；i18n `14 → 16`（上限 25）✅；tech 不变 0 ✅。
  - **因此本提案与 UI-019（裁决点 1）耦合**：若裁决点 1 选候选 A（半径覆盖上移主题层），本提案可以把新按钮的 `borderRadius` 内联一并省掉，`dashboard` 仍为 `styles=8` ✅；若选候选 B（只改标准口径），则需按 B 的口径计数。
- 平台约束核对：不改 id、`overflow` 保持 `visible`（§24）、不加显式 id（§25.3）、空态文案走本页 `i18n{}`（§31）。
- 与现有标准的差异：**建议补标准**（缺口 G4）：§4.4 应写明"空态指引**不得**放在 `emptyText`，必须落在可见元素"——本轮审查已把它列为标准缺口，请 Lead 决定是否补。
- 不做的事：不改列表的 `from`/`pagination`/`sort`；不改 `drafts` 目录语义；不新增计数数字（§2.7.1 P2 诚实降级：AUP 无聚合原语，禁止页面自算数字）。

## 4. 涉及文件与写范围

| 路径 | 改动内容 | 实现方 |
| ---- | -------- | ------ |
| `.aup/pages/admin/dashboard.aup` | 内容区列表之前新增 1 张常驻空态说明卡（含指向 `?page=compose` 的次按钮）+ 本页 `i18n{}` 新增 2 个 key | **Dev**（提案） |
| `.aup/locales/{en,zh}.json` | 由 `arc dsl generate` 更新（不手改） | **Dev**（提案） |
| `docs/ArcBlog-admin-ui-design.md` §4.4 | 补一句"空态指引不得放 `emptyText`"（缺口 G4） | **Lead**（标准属 Lead 范围） |

## 5. 验收方式

| # | 验收方式（可观察行为或截图路径） |
| - | -------------------------------- |
| 1 | 登录态（需 admin 会话，**本轮受限未验证**）清空 `drafts/` 后打开 `?page=dashboard`：列表上方可见"现状 + 价值 + 动作"三要素卡片，动作可点到 `?page=compose` |
| 2 | 截图 `docs/team/design/screenshots/UI-022-dashboard-empty.png`（登录态） |
| 3 | 预算不回退：`node scripts/arcblog-ui-budget.mjs --json` 中 `dashboard.over=[]`（`blocks≤3`、`cards≤2`、`styles≤8`、`i18n≤25`） |
| 4 | 诚实降级（§4.8）：说明卡**不**断言列表为空、**不**出现 0 或绿灯；文案里明确这是常驻说明 |
| 5 | 每屏仍只有一个 primary：全页 `variant=primary` 计数不变（除门禁卡外的登录态为 1） |
| 6 | `arc dsl validate --json` issues 为空；`npm test` 全绿 |

## 6. 验证命令（实现后）

```bash
node scripts/arcblog-ui-budget.mjs --json
arc dsl validate --json
npm test
# 登录态目视（需 admin 会话；本轮审查无此条件）
node scripts/arcblog-browser-probe.mjs 'http://arcblog.localhost:4939/?page=dashboard' --json
```
