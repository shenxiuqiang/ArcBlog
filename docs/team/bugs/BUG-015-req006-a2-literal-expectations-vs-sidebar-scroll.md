# BUG-015: REQ-006 A2 的两条字面期望（`navMoved === false`、`hasContentColumnOnly === true`）与 UI 标准 §2.5 允许的「侧栏自身滚动」及短内容页冲突——未改动的对照页 `?page=posts @1512×765` 也不满足

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-015 |
| 严重级 | **P3**（验收判据措辞缺陷：实现已按标准收口，但 A2 字面判据在合规实现上必然为红；会把「设计允许的行为」误判成 BUG-010 未收口） |
| 发现轮次 | round-9（Dev 在回报中已如实上报该冲突；QA 独立重跑 A2 探针确认，并定位到成因） |
| 关联 REQ | REQ-006 §3 A2（BUG-010 的验收判据）；判据冲突对象：`docs/ArcBlog-admin-ui-design.md` §2.5「侧边栏不独立滚动 …（极端窄高下溢出时侧边栏自身滚动（该容器 `overflowY: auto`），不撑破页面）」 |
| 状态 | 待裁决（PM 修订 A2 判据；**不是**实现缺陷，不需要 Dev 改代码——除非裁定侧栏不得自身滚动，那将改标准） |
| 写范围 | REQ 属 PM，标准属 UI；QA 未改任何文档 |

## 复现命令与最小步骤

```bash
# admin 会话；A2 的原始探针（把**所有**可滚动容器滚到底，含侧栏容器）
for page in compose appearance posts; do for vp in "1803 908" "1512 765"; do set -- $vp
  QA_VW=$1 QA_VH=$2 node /tmp/qa-cdp2.mjs "http://arcblog.localhost:4939/?page=$page&locale=en" /tmp/qa-r9/shell.js
done; done
# 容器身份（同一会话）
QA_VW=1803 QA_VH=908 node /tmp/qa-cdp2.mjs 'http://arcblog.localhost:4939/?page=appearance&locale=en' /tmp/qa-r9/containers.js
```

## 期望（REQ-006 A2 字面）

2 页 × 2 视口共 4 组：`navMoved === false`、`headerMoved === false`、`hasContentColumnOnly === true`、`pageScrollable === false`；对照 `?page=posts` **两视口同样 `navMoved:false`**。

## 实际

`headerMoved` / `pageScrollable` 在 6 组里全为 `false`（BUG-010 的实际目标已达成）；但另两条字面期望**必然为红**，且**未改动的对照页 `posts` 也红**：

```text
?page=compose    @1803×908 -> navMoved:false  headerMoved:false  contentColumnOnly:true   pageScrollable:false   containerCount:1
?page=compose    @1512×765 -> navMoved:TRUE   headerMoved:false  contentColumnOnly:true   pageScrollable:false   containerCount:2   ← 侧栏自身滚动
?page=appearance @1803×908 -> navMoved:false  headerMoved:false  contentColumnOnly:FALSE  pageScrollable:false   containerCount:0   ← 内容未溢出
?page=appearance @1512×765 -> navMoved:TRUE   headerMoved:false  contentColumnOnly:FALSE  pageScrollable:false   containerCount:1
?page=posts      @1803×908 -> navMoved:false  headerMoved:false  contentColumnOnly:true   pageScrollable:false   containerCount:1   （对照，未改动）
?page=posts      @1512×765 -> navMoved:TRUE   headerMoved:false  contentColumnOnly:true   pageScrollable:false   containerCount:2   ← 对照页也红
```

成因（`containers.js` 原始输出）：

```text
# ?page=compose @1512×765 的两个可滚动容器
{ "w":227,  "h":717, "sh":847, "ch":717, "containsHeader":false, "containsNav":true  }   ← 侧栏自身（§2.5 允许）
{ "w":1223, "h":601, "sh":1536,"ch":601, "containsHeader":false, "containsNav":false }   ← 内容列
# ?page=appearance @1803×908：可滚动容器 count=0
{ "w":1471, "h":790, "sh":790, "ch":790, "overflows":false, "overflowY":"auto", "containsHeader":false, "containsNav":false }
```

1. `navMoved:true` 只来自**侧栏容器**：A2 的探针把「所有 `scrollHeight > clientHeight` 的容器」一次性滚到底，于是 1512×765 下（17 项菜单 + 页脚在 765px 高度里溢出）侧栏按 §2.5 **允许的方式**自行滚动 130px，`[data-active="true"]` 的 `top` 随之变化（187→57 / 117→-13 / 430→300）。`headerMoved` 始终 `false`，且**没有任何可滚动容器包含 `.aup-app-header`**（6 组 `containersContainHeader` 全 `false`）——即 BUG-010 的"整壳滚走"已收口。
2. `hasContentColumnOnly:false` 只发生在 `appearance @1803×908`：内容短于一屏 → 内容列存在但不溢出（`sh===ch===790`），于是**按"当前是否溢出"过滤的可滚动容器集合为空**。这正是 UI V1.4 在 §2.6 里明确写过的那条陷阱（「内容短于一屏时 `scrollHeight > clientHeight + 2` 不成立，候选会变成 0」）；等价断言（不带溢出条件）在该页给 `candidates:1, total:0`。
3. 因此 A2 的「对照 `posts` 两视口 `navMoved:false`」在**当前标准下不可满足**：`posts` 本轮零改动（`git diff` 为空），它在 1512×765 就是侧栏自身滚动。

**滚动归属的正面证明**（QA 独立注入 2000px `flexShrink:0` 子节点后只滚内容列）：

```text
compose    @1803 -> scrollTop 2813, navMoved:false, headerMoved:false, pageScrollable:false, docScrolled:false
compose    @1512 -> scrollTop 2956, navMoved:false, headerMoved:false, pageScrollable:false
appearance @1803 -> scrollTop 1312, navMoved:false, headerMoved:false, pageScrollable:false
appearance @1512 -> scrollTop 1455, navMoved:false, headerMoved:false, pageScrollable:false
posts      @1803 -> scrollTop 3896, navMoved:false, headerMoved:false, pageScrollable:false
posts      @1512 -> scrollTop 4081, navMoved:false, headerMoved:false, pageScrollable:false
```

## 证据输出

见上（`/tmp/qa-r9/shell.js`、`/tmp/qa-r9/containers.js`、`/tmp/qa-r9/shell-inject2.js` 原始 JSON）。

## 建议（不自行改判据）

把 A2 的期望改成**可满足且仍等价**的形式（Dev 回报中的建议与之相同）：

- 「**没有任何可滚动容器包含 `.aup-app-header`**」（6/6 组实测 `false`；这是 BUG-010 的原始缺陷面）
- 「`headerMoved === false`」+「`pageScrollable === false`」（6/6 组）
- 「滚**内容列**时 `navMoved === false`」（注入式实测 6/6 组；而不是「滚所有容器」）
- 「内容列存在」用 §2.6 的等价断言 `candidates >= 1`（不依赖当前是否溢出），而不是 `hasContentColumnOnly`

## 影响范围

- 受影响角色：PM（REQ 判据）、Lead（裁决）、下一轮实现者（会把合规的侧栏滚动误读成回归）
- 受影响链路：验收判据本身；实现无缺陷（BUG-010 目标已达成）
- 数据后果：无

## 疑似文件

- `docs/team/requirements/REQ-006-console-scroll-and-agent-surface.md` §3 A2（期望 4 组 + 对照 `posts` 两视口）
- 判据冲突对象：`docs/ArcBlog-admin-ui-design.md` §2.5（侧栏溢出时自身滚动）与 §2.6 等价断言（不按溢出定位内容列）
