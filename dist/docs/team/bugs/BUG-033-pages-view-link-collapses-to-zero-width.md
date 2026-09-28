# BUG-033: `?page=pages` 列表行的 `View` 链接被压成 0 宽，文字溢出并实测压住 `Take offline` 按钮

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-033 |
| 严重级 | **P2** |
| 发现轮次 | round-14F（QA 独立复验时发现；UI-012 全面走查未列入清单） |
| 关联 | UI-012-06 采用的平台事实（`itemStyle=row` 给行子元素 `flex: 1 1 0%`）；L-R14F-5「溢出与重叠是验收项」 |
| 首次存在 | **HEAD `9a06261` 已存在**（`git show HEAD:.aup/pages/admin/pages.aup` 同样写着 `flexGrow: 0`）→ 非本轮引入，属既有缺陷 |
| 状态 | 待裁决 |

## 复现命令与最小步骤

1. 前置：共享 CDP 浏览器 `127.0.0.1:9333`、admin 会话、单标签页。
2. 打开 `?page=pages`（1803×908 或 1512×765，en 或 zh 均可复现）。
3. 读列表行里的 `View`（zh：`查看`）链接几何，并扫描「文本矩形 × 可点控件矩形」相交。

```bash
node /tmp/qa-r14f-targeted.mjs --target <pageTargetId> --viewport 1803x908 \
  --steps <(echo '[{"url":"http://arcblog.localhost:4939/?page=pages&locale=en","expr":"FILE:/tmp/r14f/e_pages.js"}]')
node /tmp/qa-r14f-targeted.mjs --target <pageTargetId> --viewport 1512x765 \
  --steps <(echo '[{"url":"http://arcblog.localhost:4939/?page=pages&locale=en","expr":"FILE:/tmp/r14f/e_textbtn.js"}]')
grep -n 'flexGrow' .aup/pages/admin/pages.aup
```

## 期望

列表行内的 `View` 链接应完整可见、可点击，命中区 ≥24×24（`docs/ArcBlog-admin-ui-design.md` §4.3/§9），且不得与同行按钮重叠。

## 实际

`.aup/pages/admin/pages.aup:173` 的 `view layout=inline href="/pages/${entry.content.slug}" … style={…, flexGrow: 0}` 位于 `afs-list itemStyle=row` 的行内：平台规则给行子元素 `flex: 1 1 0%`，页内再写 `flexGrow: 0` 后 **flex-basis 仍是 0%** → 元素宽 **0**，其文本（31px/13px）向盒外溢出，并**实测压住同一行的 `Take offline` 按钮**。

```text
$ node … --expr /tmp/r14f/e_pages.js            # 1803×908 / en
{ "count": 2, "items": [
  { "tag": "A", "cls": "aup-view aup-view-link", "cw": 0, "sw": 31, "over": 31,
    "w": 0, "h": 19.19, "flex": "0 1 0%", "flexBasis": "0%", "flexGrow": "0",
    "parentCls": "aup-view aup-list-template-item", "parentDisplay": "flex" },
  { "tag": "DIV", "cls": "aup-text", "cw": 0, "sw": 31, "over": 31, "w": 0, "h": 19.19,
    "flex": "0 1 auto", "parentCls": "aup-view aup-view-link" } ] }

$ node … --expr /tmp/r14f/e_textbtn.js          # 1512×765 / en
{ "hitCount": 1, "hits": [
  { "target": "Take offline", "targetCls": "aup-action",
    "text": "View", "ix": 20.92, "iy": 16 } ] }

$ node /tmp/qa-r14f-zero.mjs --locale zh --viewport 1512x765
pages        zero=2 [{"tag":"A","cls":"aup-view aup-view-link","sw":13,"w":0,"h":38.38,"text":"查看", …}]
TOTAL_ZERO=2        # 全 21 控制台页中唯一一处零宽塌陷
```

`grep -n 'flexGrow' .aup/pages/admin/pages.aup` → `173: … style={cursor: pointer, color: "var(--color-dim)", flexGrow: 0} {`（HEAD 同）。

## 影响范围

- 角色：admin / operator（控制台 Pages 页）
- 链路：内容 → 独立页面 → 打开页面预览入口（命中区 0 宽 → **实际不可点**）
- 视觉：文字溢出到相邻按钮之上（实测 20.92×16 px 相交），同时命中区 <24×24
- 数据后果：无（只读展示/导航）
- 同类风险：任何 `afs-list itemStyle=row` 行内同时写 `flexGrow: 0` 的 `view href`（本轮其余 20 页未发现）

## 疑似文件

- `.aup/pages/admin/pages.aup:173`（`view layout=inline href="/pages/${entry.content.slug}" … flexGrow: 0`）
- 参照（已验证有效同法）：`.aup/pages/ops/hub.aup` 内容索引行的 `style={…, flexBasis: auto}`（UI-012-06 修复，实测溢出 28→0）

## 建议修法（由 Dev 裁定，QA 不改源码）

把 `flexGrow: 0` 换成 `flexBasis: auto`（保留 `flexGrow: 0` 或一并保留），或给该链接加 `minWidth`；两种写法都在 67 键 style 白名单内（见 BUG-035 的平台证据）。
