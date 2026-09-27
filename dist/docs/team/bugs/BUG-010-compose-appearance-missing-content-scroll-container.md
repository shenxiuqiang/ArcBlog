# BUG-010: `compose` / `appearance` 没有内容列滚动容器——`?page=compose` 滚动时整壳（顶栏 + 侧栏）一起滚走

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-010 |
| 严重级 | **P2**（体验/交互不一致；不阻断功能，内容仍可达） |
| 发现轮次 | round-8（**范围外 · pre-existing**：`.aup/pages/admin/compose.aup` 本轮 `git diff` 为空） |
| 关联 REQ | 无（REQ-005 §2.2 第 7 条 / UI-003 §5 **U4** 已停手上报；判据在 `docs/ArcBlog-admin-ui-design.md` §2.5 / §8 / §9 第 2 条） |
| 状态 | 待裁决（PM/Lead：改实现补滚动容器，还是给标准加例外？） |

## 复现命令与最小步骤

```bash
# 1) 静态：内容列滚动容器的覆盖度（15/17 有，compose / appearance 无）
grep -rn 'size={flex: 1} style={overflowY: auto}' .aup/pages/ | wc -l     # 15
grep -rl 'overflowY: auto' .aup/pages/ | wc -l                            # 17
grep -n 'overflowY: auto' .aup/pages/admin/compose.aup .aup/pages/admin/appearance.aup
#   → 两页的 `overflowY: auto` 都只出现在**侧栏**那一行，内容列没有

# 2) 运行期（admin 会话；共享 Chrome CDP 9333；脚本在 /tmp，未入库）：
#    /tmp/qa-cdp2.mjs <url> /tmp/qa-probe-fixed-shell.js —— 固定视口，把所有可滚动容器滚到底，
#    比较侧栏当前项（[data-active="true"]）与 .aup-app-header 的 top 是否移动
QA_VW=1803 QA_VH=908 node /tmp/qa-cdp2.mjs 'http://arcblog.localhost:4939/?page=compose&locale=en'     /tmp/qa-probe-fixed-shell.js
QA_VW=1512 QA_VH=765 node /tmp/qa-cdp2.mjs 'http://arcblog.localhost:4939/?page=compose&locale=en'     /tmp/qa-probe-fixed-shell.js
QA_VW=1803 QA_VH=908 node /tmp/qa-cdp2.mjs 'http://arcblog.localhost:4939/?page=posts&locale=en'       /tmp/qa-probe-fixed-shell.js   # 对照
```

## 期望

`docs/ArcBlog-admin-ui-design.md`：

- §2.5「页面固定，内容区滚动」：顶栏、console-nav 侧边栏、页头**始终静止**；长列表、长表单只在右侧**内容列**的滚动容器内滚动。
- §8 第 422 行：内容列内 `view size={flex: 1} style={overflowY: auto}` 是**唯一**滚动容器。
- §9 第 2 条：页面固定无纵向滚动条，滚动只发生在内容列内（无双滚动条）。

## 实际

`?page=compose`（admin，1803×908）**只有一个**可滚动容器，且它**同时包含** `.aup-app-header` 与侧栏当前项：滚它 = 整壳滚动。

```text
### ?page=compose @1803x908 ###
{ "url":".../?page=compose", "vw":1803,"vh":908, "windowScrollable":false, "containerCount":1,
  "containersContainNav":[true], "containersContainHeader":[true],
  "before": { "nav":{"top":187}, "header":{"top":0} },
  "after":  { "nav":{"top":-592}, "header":{"top":-778} }, "navMoved":true }

### ?page=compose @1512x765 ###
{ "containerCount":2, "containersContainHeader":[true,false],
  "before": { "nav":{"top":187}, "header":{"top":0} },
  "after":  { "nav":{"top":-865}, "header":{"top":-921} }, "navMoved":true }

### ?page=posts @1803x908（对照，合规） ###
{ "containerCount":1, "containersContainNav":[false], "containersContainHeader":[false],
  "after": { "nav":{"top":117}, "header":{"top":0} }, "navMoved":false }
```

静态覆盖度：`size={flex: 1} style={overflowY: auto}` 命中 **15** 行 / 17 个控制台页；`overflowY: auto` 共 17 页，缺的两页是 `compose.aup`、`appearance.aup`，且它们的 `overflowY: auto` 只在**侧栏**：

```text
$ grep -n 'overflowY: auto' .aup/pages/admin/compose.aup .aup/pages/admin/appearance.aup
.aup/pages/admin/compose.aup:37:        view size={width: "clamp(200px, 15vw, 280px)", flexShrink: 0, height: "100%"} style={padding: "0", …, overflowY: auto, …} visible=$session.authenticated {
.aup/pages/admin/appearance.aup:17:        view size={width: "clamp(200px, 15vw, 280px)", flexShrink: 0, height: "100%"} style={padding: "0", …, overflowY: auto, …} visible=$session.authenticated {
```

补充（同批实测，非独立缺陷）：`appearance` 内容短，1803×908 下无任何可滚动容器（`containerCount:0`），未观察到内容被裁；`compose` 内容长，滚到底后 Publish 按钮可达（`top:1433 → 512`），因此**功能未断**，问题在"整壳滚动"与标准/其余 15 页不一致。

## 证据输出

见上（`qa-cdp2.mjs` 原始 JSON 逐字拷贝）。退出码 0。

## 影响范围

- 受影响角色：admin（控制台运营者）
- 受影响链路：界面布局（§2.5 固定外壳 / §9 第 2 条）；不影响数据与写入
- 数据后果：无
- 可绕过：是（滚回去即可）

## 疑似文件

- `.aup/pages/admin/compose.aup:30-37`（根 `view style={height:"calc(100vh - 48px)", overflow: visible}` 之下没有 `size={flex: 1} style={overflowY: auto}` 的内容列容器）
- `.aup/pages/admin/appearance.aup:16-17`（同形）
- 对照（合规）：`.aup/pages/admin/posts.aup`、`.aup/pages/admin/dashboard.aup:119` 等 15 页
- 文档依据：`docs/ArcBlog-admin-ui-design.md` §2.5 / §8 第 422 行 / §9 第 2 条；`docs/team/design/UI-003-ui-standard-residuals.md` §5 U4
