# BUG-005: 控制台 F5「双编码」降级成常量类别词——可变枚举的状态文案全部错误、彼此不可区分

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-005 |
| 严重级 | P2 |
| 发现轮次 | round-7 |
| 关联 REQ | REQ-002-console-consistency-fixes（§2.1 F5 / 验收标准 A10） |
| 状态 | **已修复（R8 路径 B）· QA 复验通过**（见文末「R8 复验」） |

## 复现命令与最小步骤

1. 前置：dev 实例 `default`；共享调试 Chrome（CDP 9333）上的 admin 会话；`arcblog.localhost:4939` 已构建到本轮工作区（`dist/` 与源同 hash）。
2. admin 会话打开 `?page=posts`、`?page=dashboard`、`?page=hub`、`?page=tags`。
3. 读取每行"色点"元素的 `title`（它承载**真实**状态原始值），与同一行可见的本地化文字对比。
4. 若要观察 `?page=tags` 的队列行：先按下面命令写入 4 条探针意图（pending/done/noop/failed），观察后删除。

```bash
# 队列行探针（QA 已实测；跑完必须删掉这 4 条）
node -e "
import('/Users/shenxiuqiang/workspace/ArcBlog/scripts/lib/arc.mjs').then(({writeJson})=>{
  const TS=new Date().toISOString(), base='/instance/app/arcblog/tags/intents/';
  const rows=[['qa-r7-pending',{status:'pending'}],['qa-r7-done',{status:'done'}],['qa-r7-noop',{status:'noop'}],['qa-r7-failed',{status:'failed'}]];
  for(const [n,r] of rows) writeJson(base+n+'.json',{id:n,action:'merge',from:'guide',to:'qa_r7_never',summary:'guide → qa_r7_never',message:'',migrated:0,posts:[],requestedVia:'console',requestedAt:TS,...r});
});"
# 观察（CDP Runtime.evaluate，任一控制台页）
#   取每行 ● 的 title 与紧邻可见文字
```

## 期望

REQ-002 §2.1 F5 与 A10：状态必须是「色点 + **本地化状态文字**」双编码——文字要能看出该行的状态，
`posts` / `pages` / `hub` / `access` / `tags` 不再以任何形式让人看不到状态。
`admin-ui-design.md` §4.1「状态指示」要求状态不依赖颜色（`§9` 清单第 6 条「双编码：状态不只依赖颜色」）。

## 实际

本轮把可变枚举的本地化文字替换成了**常量类别词**，于是：

| 页 | 色点 `title`（真实状态） | 同行可见文字（常量） | 后果 |
| -- | ----------------------- | -------------------- | ---- |
| `?page=posts`（草稿区） | `deleted` ×26、`draft` ×1 | 全部「In drafts」 | 26 条软删除记录被显示成"在草稿区" |
| `?page=tags`（意图队列） | `merge · pending` / `refresh · done` / `merge · noop` / `merge · failed` | 全部「Queued intent」 | 已完成/失败/空操作/等待中四态视觉完全一致 |
| `?page=dashboard`（订单卡） | `paid` | 「Order」 | 已支付订单显示成"订单" |
| `?page=hub`（关系/索引行） | `registered` / `active` / `indexed` | 「Registration」/「Index entry」 | 状态不可见；同页 `freshness.state` 仍是裸英文 `offline` 文本 |
| `?page=access` | —（无点、无状态词） | — | 行内没有状态信息（该页未做双编码） |

即 A10 的字面机制（"行内同时有色点与本地化状态文字"）只在"有点、有个词"的层面成立；
**本地化词不编码该行状态**，`access` 行连词都没有。真实状态只剩 `title`（hover 才可见），
不满足「状态不只依赖颜色」。

## 证据输出

```text
$ node /tmp/qa-cdp.mjs nav 'http://arcblog.localhost:4939/?page=posts'  # admin 会话
$ node /tmp/qa-cdp.mjs eval /tmp/qa-probe-dots.js
{"url":"http://arcblog.localhost:4939/?page=posts","dotCount":30,"titleCounts":{"null":3,"draft":1,"deleted":26}}
# 同一页可见文本（节选）："Drafts & archived … ● In drafts … ● In drafts …" ×27

$ node /tmp/qa-cdp.mjs nav 'http://arcblog.localhost:4939/?page=tags'   # 探针意图写入后
{"probe":"guide → qa_r7_never","rowText":"●\nQueued intent\njust now\nguide → qa_r7_never", …}
{"probe":"refresh","leaves":[{"tag":"DIV","t":"●","fs":"12.8px","title":"refresh · done"},{"tag":"DIV","t":"Queued intent","fs":"12.8px"}, …]}
{"probe":"definitely_not_a_tag_xyz → other_xyz", … "title":"merge · noop" … "Queued intent" …}
{"probe":"a → a", … "title":"merge · failed" … "Queued intent" …}

$ node /tmp/qa-cdp.mjs eval /tmp/qa-probe-dots.js   # ?page=dashboard
{"dotCount":3,"titleCounts":{"null":1,"paid":2}}     # 可见文字 = 「Order」×2

$ node /tmp/qa-cdp.mjs eval /tmp/qa-probe-dots.js   # ?page=hub
{"dotCount":5,"titleCounts":{"registered":2,"active":2,"indexed":1}}
# hub 同页仍有裸文本 "offline"：p "${entry.content.freshness.state}" scale=sm intent=muted
```

静态佐证（`${entry.content.status}` 只出现在 `title=` 属性里，从未作为文本渲染）：

```text
$ grep -rnE '(p|span|h3) "\$\{entry\.content\.(status|freshness|state)\}"' .aup/pages/
（无输出 → 裸枚举已不再作为文本；但也没有替代它的本地化状态文字）
$ grep -rnoE '\$\{entry\.content\.(status|freshness)\}' .aup/pages/ | wc -l
9      # 全部在 title= 或 (hub) freshness.state 的可见文本里
```

退出码：0

## 影响范围

- 受影响角色：admin（控制台运营者）
- 受影响链路：界面 / i18n（状态呈现）——不影响写入、不影响数据
- 数据后果：无（只读页面渲染）
- 可绕过：部分。hover 色点可看到原始英文状态；`?page=posts` 无法区分 draft 与 deleted（26 vs 1 全部同词）

## 疑似文件

- `.aup/pages/admin/posts.aup:179-180`（草稿区行：`●` 的 `title=${entry.content.status}` + 常量 `:status-in-drafts`）
- `.aup/pages/site/tags.aup:156-157`（队列行：`●` 的 title + 常量 `:status-intent`）
- `.aup/pages/admin/dashboard.aup:163-164`、`.aup/pages/ops/hub.aup:131-133`、`.aup/pages/ops/factory.aup:191-192`
- 平台限制证据：`docs/arc-contracts.md` §28.1 补充实测（`$state.*`/`$entry.*` 不能用于 `visible`）；
  Dev 报告的「`$t(dynamic-key)` 运行期渲染字面量」**尚未写入 `docs/arc-contracts.md`**（见 D5），QA 无法独立复现（复现要改 `.aup`，QA 写范围外）

## R8 复验（QA-003，2026-09-27）

**结论：修复成立，路径 B 与 D6 第 2 条一致；HTML 文案不再把不同状态说成同一句话。**

- 采用路径：**B**（本地化中性标签 + 原始状态值可见文本 + 色点 + 列表后常驻 dim 说明）。
- 浏览器实测（admin，CDP 9333；原始输出见 [`../test-reports/round-8.md`](../test-reports/round-8.md) §3）：
  - `?page=posts` 草稿区（QA 写入 1 条 `status=draft` 探针 + 既有 27 条 `deleted`）：逐行可见文本 `Status | draft` / `Status | deleted`，两两可区分；
  - `?page=tags` 队列（QA 写入 4 条探针 intent：pending/done/noop/failed）：`Status | done` / `Status | failed` / `Status | noop` / `Status | pending`，四个互异字符串；
  - `?page=dashboard` 订单行（QA 写入 paid/refunded 两条探针 order）：`Status | paid` / `Status | refunded`；
  - `?page=hub`：`Relation | removed`、`Direction | studio`、`Status | registered|active`、`Freshness | offline`（本地化标签 + 原始值可见）；
  - `?page=access`：无行，页面有常驻 dim 说明「该页没有逐行状态…」。
  - 探针记录观察后已逐条删除（tags/intents、economy/orders、drafts 三个目录均回到"不存在"），`.gate-lock` 已释放。
- 路径 A 复核（**不得**把推断当实测，故分栏写）：
  - **静态复核**：运行时 bundle `aup.bc92de568433b0dc.js`（802,492 B，sha256 `bc92de56…aff6c1`）中 `i18n` 命中 **0**、locale 键（`wrapper.nav-console` 等）命中 **0** → i18n 不在客户端解析；`$entry` 命中 **0**；`visible` 求值器（`function Eu(e,t,r)` 反编译）只支持 ` || ` / ` && ` / 前缀 `!` / `$session.*` / `$state.*`，**无等值比较**；`arc dsl schema --json` 63 primitives / 12 aliases / 26 keywords 里 `valueMap|labelMap|statusMap|enumMap|labelField|presets|template` 全部命中 0。
  - **运行期实测（QA 自建、不改源码）**：把 `$t(wrapper.nav-console)` 写进一条 `posts/` 记录的 `title`，`?page=dashboard` 与 `?page=posts` 都**原样渲染字面量** `$t(wrapper.nav-console)`（既未查 locale 也未报错）→ "运行期拼出来的 `$t()` token 不会被解析"这一条得到独立复现；观察后记录已删除。
  - **受限未验证**：源码形式 `$t(posts.status-${entry.content.status})` 的探针页需要改 `.aup`（QA 写范围禁止），未独立复跑；另实测 `arc dsl validate` 对动态 key **不报错**（静默接受），故这属运行期解析属性而非校验期约束。未发现与 `arc-contracts.md` §28.8 冲突的证据。
