# BUG-024: `settings-general` 9 处标题字号偏离控制台标准（6 处行标题 17px、3 处开关名 12px，标准为 15px）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-024 |
| 严重级 | **P2**（视觉/规范一致性，与 UI-007 V9 同类；不阻断功能） |
| 发现轮次 | **round-11（QA 独立验证，CDP computed style 实测）** |
| 关联 REQ | spec §15.9 通用 General；判据 `docs/ArcBlog-admin-ui-design.md` §3.4（`h2`/`h3` 卡片标题 = `var(--type-body)` 15px）与 §2.6 列表行规则（「行标题用 `h3` + `fontSize: var(--type-body)`(15px)」） |
| 状态 | 待裁决（建议 **本轮修**：给 9 个 `h3` 补 `fontSize: "var(--type-body)"`） |

## 复现命令与最小步骤

```bash
# 运行期（admin，1803×908）：读本页全部可见 h3 的 computed fontSize
node /tmp/qa11-cdp.mjs /tmp/qa11-spec-newpage.json   # 见 round-11.md §3.E / /tmp/qa11-probe-newpage.js
```

## 期望

`docs/ArcBlog-admin-ui-design.md`：

- 第 293 行：「`h2` / `h3`（卡片内）｜卡片标题、区块标题｜`fontSize: var(--type-body)`（15px）」
- 第 278 行：「行标题用 `h3` + `fontSize: var(--type-body)`(15px)」

⇒ 本页所有 `h3` 应为 15px。

## 实际

13 个可见 `h3` 中 9 个不是 15px：**6 个记录行标题**（来自 `afs-list` 的 `${entry.content.label}`，未写 `fontSize` → 运行期默认 **17px**），**3 个开关名**显式写成 `var(--type-small)` = **12px**：

```json
"h3CountBySize": { "15px": 4, "17px": 6, "12px": 3 }
"h3": [
  { "t": "What belongs here",              "fs": "15px", "style": "font-size: var(--type-body);" },
  { "t": "Site basics",                    "fs": "15px", "style": "font-size: var(--type-body);" },
  { "t": "Language",                       "fs": "17px", "style": "" },   ← 行标题（应为 15px）
  { "t": "Site name",                      "fs": "17px", "style": "" },   ← 行标题（应为 15px）
  { "t": "Timezone",                       "fs": "17px", "style": "" },   ← 行标题（应为 15px）
  { "t": "Instance switches",              "fs": "15px", "style": "font-size: var(--type-body);" },
  { "t": "Comments",                       "fs": "12px", "style": "font-size: var(--type-small);" },  ← 应为 15px
  { "t": "RSS",                            "fs": "12px", "style": "font-size: var(--type-small);" },  ← 应为 15px
  { "t": "Agent Access (master switch)",   "fs": "12px", "style": "font-size: var(--type-small);" },  ← 应为 15px
  { "t": "Agent Access",                   "fs": "17px", "style": "" },   ← 行标题（应为 15px）
  { "t": "Comments",                       "fs": "17px", "style": "" },   ← 行标题（应为 15px）
  { "t": "RSS",                            "fs": "17px", "style": "" },   ← 行标题（应为 15px）
  { "t": "Initialize records",             "fs": "15px", "style": "font-size: var(--type-body);" }
]
```

对照：`?page=posts` 的 39 个行标题全部 15px（`{"15px":39}`），即「行标题 15px」在既有页面已落实，本页是新破例。

## 证据输出

```text
$ node /tmp/qa11-cdp.mjs /tmp/qa11-spec-newpage.json     # ?page=settings-general, 1803x908, admin
{"cardPad":["14px"],"cardGap":["10px"],"cardRadius":["10px"],"cardShadow":["none"],"cardMargin":["0px"],
 "pageTitle":{"t":"General","fs":"17px"},
 "h3CountBySize":{"15px":4,"17px":6,"12px":3}}

$ node /tmp/qa11-cdp.mjs /tmp/qa11-spec-dev-posts.json    # 对照：同探针在 posts 页
"h3": {"count": 39, "bySize": {"15px": 39}}
```

（本页的**卡片样式本体是对的**：`padding 14px / gap 10px / radius 10px / shadow none / margin 0`，与 §3.3 一致；内容列 `rowGap` 10px、按钮圆角 8px 也正确——问题只在标题字号。）

## 影响范围

- 受影响角色：运营者（视觉层级与其它 17 页不一致；记录行标题比标准大一档）
- 受影响链路：仅呈现
- 数据后果：无

## 疑似文件（线索，未改）

- `.aup/pages/admin/settings-general.aup:145`、`:179`（`h3 "${entry.content.label}"`，无 `fontSize`）
- `.aup/pages/admin/settings-general.aup:161`、`:166`、`:171`（`h3 :sw-*-name … fontSize: "var(--type-small)"`）

---

## 复验结论（round-11-reverify，2026-09-28，QA 独立验证）

**状态：已修复（复验通过）。** 页面改名 `general.aup` 后，全部 `h3` 显式 `fontSize: var(--type-body)`。

```text
# admin 1803×908，CDP 读全部可见 h3 的 computed fontSize
?page=general  → {"h3Count":17,"h3BySize":{"15px":17},"h3NotBody":[]}
   （修复前：{"15px":4,"17px":6,"12px":3}，9 处偏离）

# 同类页面抽查（V9 落点）
posts 41/41 15px、compose 4/4、factory 5/5、agents 7/7、categories 3/3、dashboard 4/4 —— 全部 15px
```

证据全文：`docs/team/test-reports/round-11-reverify.md` §2④ / §2⑤（V9）。
