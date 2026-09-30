# BUG-025: `settings-general` 同屏 3 个 `primary` 按钮（全页 6 个），违反控制台「每屏一个 primary」

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-025 |
| 严重级 | **P2**（视觉层级/交互一致性，与 UI-007 §1.2「primary 每屏 ≤1」基线冲突；不阻断功能） |
| 发现轮次 | **round-11（QA 独立验证，CDP 视口内几何实测）** |
| 关联 REQ | spec §15.9 通用 General；判据 `docs/ArcBlog-admin-ui-design.md` §4.3 第 347 行「层级｜每屏一个 `primary`；次级用 `secondary`」 |
| 状态 | 待裁决（建议 **本轮修**：`On`/`Save` 中最多保留一个 primary，其余降为 `secondary`/`ghost`） |

## 复现命令与最小步骤

```bash
# admin 会话，1803×908，统计 data-variant=primary 且在视口内的按钮
node /tmp/qa11-cdp.mjs /tmp/qa11-spec-primary.json   # 见 round-11.md §3.F / /tmp/qa11-probe-primary.js
```

## 期望

`docs/ArcBlog-admin-ui-design.md` §4.3（第 347 行）：「**每屏一个 `primary`**；次级用 `secondary`（accent 淡底）或 `ghost`」。
UI-007 §1.2 已把该规则作为基线核过 17 页：**17/17 页 ≤ 1**。

## 实际

本页视口内同时有 **3 个 `primary`「Save」**（三张基础信息行各一个），全页共 **6 个 primary**（3×Save + 3×On）：

```text
### ?page=settings-general @1803x908 ###
{ "inViewTotal": 26, "primaryInView": 3,
  "primaries": [ {"t":"Save","top":395}, {"t":"Save","top":622}, {"t":"Save","top":869} ],
  "primaryOnPage": 6 }

### 对照 ?page=posts ###      { "primaryInView": 1, "primaries":[{"t":"New post","top":71}], "primaryOnPage": 1 }
### 对照 ?page=factory ###    { "primaryInView": 1, "primaries":[{"t":"Buy / mint","top":251}], "primaryOnPage": 1 }
```

## 证据输出

```text
$ node /tmp/qa11-cdp.mjs /tmp/qa11-spec-primary.json     # url=.../?page=settings-general
{"url":"http://arcblog.localhost:4939/?page=settings-general","vh":908,"inViewTotal":26,
 "primaryInView":3,"primaries":[{"t":"Save","top":395},{"t":"Save","top":622},{"t":"Save","top":869}],
 "primaryOnPage":6}
$ # 同探针在 posts / factory
{"primaryInView":1,"primaries":[{"t":"New post","top":71}],"primaryOnPage":1}
{"primaryInView":1,"primaries":[{"t":"Buy / mint","top":251}],"primaryOnPage":1}
```

（所有按钮圆角均为标准 8px、尺寸只用默认档与 `size=sm` 两档——本页在按钮**几何**上是对的，问题只在 `primary` 的**数量/层级**。）

## 影响范围

- 受影响角色：运营者（6 个同等强度的主按钮，视觉上无法判断「主要动作」）
- 受影响链路：仅呈现
- 数据后果：无

## 疑似文件（线索，未改）

- `.aup/pages/admin/settings-general.aup:153`（Save，`variant=primary`）
- `.aup/pages/admin/settings-general.aup:184`、`:185`（On，`variant=primary`；Off 已是 `secondary`）

---

## 复验结论（round-11-reverify，2026-09-28，QA 独立验证）

**状态：已修复（复验通过）。** 行内动作全部改为 `secondary`/默认档（列表行无法静态标「仅第一行」），任何数据下每屏 ≤ 1。

```text
# admin 1803×908，CDP 统计 data-variant=primary（页内 / 视口内）
?page=general → {"primaryOnPage":0,"primaryInView":0}       ← 修复前 primaryOnPage=6 / primaryInView=3
对照 posts 1/1、factory 1/1、dashboard 1/1、categories 1/1、agents 0/0、compose 0（视口外）
```

证据全文：`docs/team/test-reports/round-11-reverify.md` §2④。
