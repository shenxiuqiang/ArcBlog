# BUG-065: `.agents/skills/aup-dsl/references/primitives.md:88` 的 `pagination` prop 契约与运行期渲染器不一致

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-065 |
| 严重级 | P3（文档漂移；本轮全仓零使用该原语，因此无功能影响，但**会误导后续实现与拟写入 `docs/arc-contracts.md §38` 的结论**） |
| 发现轮次 | round-23 |
| 关联 REQ | [REQ-030-list-pagination](../requirements/REQ-030-list-pagination.md)（Q2 探针问题；Dev 报告 D2/Q2 + D5② 提出，交 Lead） |
| 状态 | 待裁决 |

## 复现命令与最小步骤

1. 前置：daemon 已挂载 `arcblog`（`http://arcblog.localhost:4939/`，bundle `aup.bc92de568433b0dc.js`）。
2. 读 skill 文档：`.agents/skills/aup-dsl/references/primitives.md` 第 87–90 行的 `pagination` 契约。
3. 只读下载线上 bundle 并定位 `pagination` 渲染器（`className="aup-pagination"`），看它从节点 props 读哪些字段。

```bash
curl -s "http://arcblog.localhost:4939/?page=ledger" -o /tmp/r23-page.html
SRC=$(grep -oE '/[^"]*aup\.[a-z0-9]+\.js' /tmp/r23-page.html | sort -u | head -1)
curl -s "http://arcblog.localhost:4939$SRC" -o /tmp/r23-bundle.js
node -e 'const s=require("fs").readFileSync("/tmp/r23-bundle.js","utf8");
const k=s.indexOf("aup-pagination"); console.log(s.slice(k-500,k+400))'
```

## 期望

skill 文档（AUP 语言的「已测量知识库」）里 `pagination` 的节点 prop 契约应与运行期渲染器读取的 props 一致；不一致时要么改文档，要么明确区分「节点 prop」与「token builder 内部结构」。

## 实际

`primitives.md:88` 写作：

```text
### `pagination`
`current`/`currentPage`, `total`/`totalPages`, `pageSize`, `nextPage`,
`previousPage`, `page` (on token click), `tokens`, `type` (`page`), plus
`boundaryCount`, `siblingCount` in the token builder.
```

运行期渲染器（QA 独立取样，`:693874` 附近）只从节点 props 读三个字段：

```js
function Yw(e){var t=e.props||{},
  r=Math.max(1,Number(t.pageSize)||10),
  a=Math.max(0,Number(t.total)||0),
  n=Math.max(1,Math.ceil(a/r)),
  o=pv({currentPage:Number(t.page),totalPages:n,siblingCount:2,boundaryCount:1}),
  i=o.currentPage, u=document.createElement("nav");
  u.className="aup-pagination"; …
  function s(y){ … Fa({nodeId:e.id||"",event:"onChange",data:{page:y}}) … }
```

⇒ **节点 prop 只有 `page` / `total` / `pageSize`（+ `id`）**；`currentPage` / `totalPages` / `siblingCount` / `boundaryCount` 是内部 token builder（`pv`）的入参，`previousPage` / `nextPage` / `tokens` / `type` 是它的**返回值结构**，不是可写的节点 prop。文档把这些混在一行，读者会照抄 `current=` / `totalPages=` 而得到 `data-page="1" data-total-pages="1"`（Dev 报告 D2/Q2 的运行期对照正是这一现象）。

## 证据输出

```text
$ grep -n "pagination" -A 4 .agents/skills/aup-dsl/references/primitives.md
87:### `pagination`
88:`current`/`currentPage`, `total`/`totalPages`, `pageSize`, `nextPage`,
89:`previousPage`, `page` (on token click), `tokens`, `type` (`page`), plus
90:`boundaryCount`, `siblingCount` in the token builder.

$ node -e '…bundle 定位 aup-pagination…'
e){var t=e.props||{},r=Math.max(1,Number(t.pageSize)||10),a=Math.max(0,Number(t.total)||0),
n=Math.max(1,Math.ceil(a/r)),o=pv({currentPage:Number(t.page),totalPages:n,siblingCount:2,boundaryCount:1}),
i=o.currentPage,u=document.createElement("nav");u.className="aup-pagination",
u.setAttribute("aria-label","Pagination"),u.setAttribute("data-page",String(i)),
u.setAttribute("data-total-pages",String(n));function s(y){try{var x=Fa({nodeId:e.id||"",
event:"onChange",data:{page:y}});…

# 对照：本轮 37 处 afs-list 的 manual 分支（同一 bundle）
… Ze=typeof r.pageSize=="number"&&r.pageSize>0?r.pageSize:0, wt=r.pagination||"auto", …
… if(Ze>0&&_r>0&&_r>Ze&&wt==="manual"&&!Nt){ … className="aup-list-pager" … } …
```

退出码：0

## 影响范围

- 受影响角色：后续写 `pagination` 的 Dev / UI（本轮 0 使用，无运行期影响）
- 受影响链路：文档/skill 契约；`pagination` 原语本身**能渲染**（`data-page` / `data-total-pages` 正确），只是 prop 名与文档不符
- 数据后果：无
- 可绕过：是——按运行期实测改用 `page` / `total` / `pageSize`

## 疑似文件

> 线索不是结论；这两个文件 QA 与 Dev 都无写权限，只能由 Lead 处理。

- `.agents/skills/aup-dsl/references/primitives.md:87-90`（skill 文本；按 `verification.md §6`「新测量推翻 skill 时同一变更内更新」应同步）
- `docs/arc-contracts.md`（拟新增 §38；落笔时请按上面运行期契约写，**不要**照抄 `current/currentPage/totalPages`）

## 受限未验证（QA 侧）

Dev 报告 D2 还声称「`pagination` 原语的 `onChange` 对 `set`($args.page / $args.data.page) 与 `navigate` 在本部署无可观察效果」。**QA 无法独立复现该项**：需要一个临时 `.aup` 对照页，而 QA 写范围禁止改 `.aup`（Dev 的探针页已删除）。QA 只完成了**静态**复核：`onChange` 派发形态确为 `Fa({nodeId, event:"onChange", data:{page}})`；其是否能驱动 `$state`/导航未获得运行期定论。**建议 Lead 在把「部分支持」写进 `docs/arc-contracts.md §38` 前自行复现一次，或标注为 Dev 单方运行期证据。**
