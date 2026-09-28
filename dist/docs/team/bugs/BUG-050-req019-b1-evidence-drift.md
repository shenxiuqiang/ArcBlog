# BUG-050: REQ-019 §9.3 的 B1 自证与实测不符（「折叠时页面上无任何 `arcblog-category.mjs` 字样」）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-050 |
| 严重级 | **P3**（文档/证据漂移：产品行为正确，Dev 的自证描述与浏览器实测不一致；先例 BUG-040「dev-report-evidence-drift」） |
| 发现轮次 | round-18（QA `task-75` 独立验证） |
| 关联 REQ | REQ-019-button-first-console §9.3 B1 / §2.1.6 |
| 状态 | 待裁决 |

## 复现命令与最小步骤

1. 前置：daemon 在跑；admin 会话；`?page=categories` 首次加载（高级区**未**展开）。
2. 读页面正文里 `arcblog-category.mjs` 的出现次数与所在行。

```bash
cd /Users/shenxiuqiang/workspace/ArcBlog
node docs/team/test-reports/raw/REQ-019-qa-e2e.mjs --keep    # 其中 A1 步即测此项
# 或直接看已归档输出：
node -e '
const j=JSON.parse(require("fs").readFileSync("docs/team/test-reports/raw/REQ-019-qa-e2e.json","utf8"));
console.log(j.a1);
console.log(j.fold);
console.log(j.visibleMentions);
'
grep -n "worker-note\|worker-hint" .aup/pages/site/categories.aup | head
```

## 期望

REQ §9.3 B1 自证行原文（`docs/team/requirements/REQ-019-button-first-console.md:254`）：

```text
| B1 CLI 折叠 | -> set cat-advanced state {open: "true"} 折叠范式（factory.aup 同款）；折叠时页面上无任何 arcblog-category.mjs 字样 | ✅ |
```

若字面成立，折叠状态下页面正文里 `arcblog-category.mjs` 出现次数应为 **0**。

## 实际

折叠状态下页面正文里 `arcblog-category.mjs` 出现 **2 次**，且这两处正是 REQ §2.1.6 **要求**出现的「已排队，由本机 worker 执行 + 给出 worker 命令」披露：

- `.aup/pages/site/categories.aup` i18n `worker-note`：「按钮只负责入队。真正的执行者是本机 worker（**node scripts/arcblog-category.mjs watch**）——浏览器不会改写文章。……」
- 同一页 `worker-hint`：「Worker：**node scripts/arcblog-category.mjs watch**」

因此：**产品行为正确（折叠的是可复制的命令卡，披露文案按 REQ 必须常驻），错的是自证里的「无任何……字样」这句断言**。折叠本身是有效的：可复制命令条目折叠时 0 条、展开后 6 条。

## 证据输出

```text
$ node -e '…REQ-019-qa-e2e.json…'
a1: {"rows":[…7 rows, each with 合并到…/删除并迁移到… + targetInputs:1…],
     "cliMentionsFolded":2, "cliCopyableRowsFolded":0, "advancedButton":true}
fold: {"copyableBeforeExpand":0,"copyableAfterExpand":6,"hideButton":"收起高级"}
visibleMentions: {"mentions":8,"lines":[
  "按钮只负责入队。真正的执行者是本机 worker（node scripts/arcblog-category.mjs watch）——浏览器不会改写文章。本平台的按钮点击无法直接执行服务端代码。",
  "Worker：node scripts/arcblog-category.mjs watch", …6 条折叠区命令（本次测量在展开之后）… ]}

$ grep -n "worker-note\|worker-hint" .aup/pages/site/categories.aup
… worker-hint { en "Worker: node scripts/arcblog-category.mjs watch" … }
… worker-note { en "Buttons only queue the action. The node's worker (node scripts/arcblog-category.mjs watch) performs it …" … }
```

退出码：0

（测量细节：`cliMentionsFolded=2` 是**首屏折叠状态**下取的；`visibleMentions=8` 是 QA 在折叠自测里点开高级区之后取的，两者不冲突——前者才是 B1 的判据。）

## 影响范围

- 受影响角色：Lead/PM（据此判断是否「已验证」）、后续批次的参考基准
- 受影响链路：文档/证据可信度；无运行期影响
- 数据后果：无
- 可绕过：不适用

## 疑似文件

- `docs/team/requirements/REQ-019-button-first-console.md:254`（自证行，非 QA/Dev 写范围 → 由 PM/Lead 修订）
- `.aup/pages/site/categories.aup`（`worker-note` / `worker-hint`，产品侧正确，**不需要改**）

> QA 不修改上述任何文件。建议：REQ §9.3 的自证措辞改为「折叠时页面上没有可复制的 CLI 命令条目（copyableBeforeExpand=0），仅保留 REQ §2.1.6 要求的 worker 披露 2 处」。
