# BUG-069: `?page=policy` 策略卡的 5 个预设按钮不换行，在 1803×908 下溢出卡片 44px 并压到相邻商品卡边界

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-069 |
| 严重级 | **P3**（视觉细节；无文字遮挡、无页面级横向滚动） |
| 发现轮次 | round-24 |
| 关联 REQ | [REQ-031](../requirements/REQ-031-round24-console-completion.md) §8.1 W4（布局/无横向溢出） |
| 状态 | ✅ **QA 复验通过（round-24f，task-104）—— 可关闭**（待 PM 确认） |

## 复现命令与最小步骤

1. 前置：arc 实例 `default`；admin 会话；视口 **1803×908**（`Emulation.setDeviceMetricsOverride`）。
2. 打开 `http://arcblog.localhost:4939/?page=policy`（先访问一次 `?page=hub` 再进入，等 `propBind` 解析）。
3. 测量 5 个预设按钮所在 `row` 与相邻「Products」卡的几何。

```bash
node docs/team/test-reports/raw/round-24/qa-r24-visual.mjs
# 输出：presetRow {over:44, cw:698, sw:742, rect:{x:315,w:698,right:1014}}
#       siblingCard.rect.x = 1043  → 内容右缘 315+742 = 1057，越界 14px
```

## 期望

新增控件在自己的卡片内自适应（换行或缩宽），不越过卡片边界（REQ-031 W4「表单控件不挤坏行/无横向溢出」；`docs/team/roles/ui` 的 UI 标准同族）。

## 实际

- 5 个预设按钮（`0.80 / 0.15 / 0.05` … `1.00 / 0.00 / 0.00`）在同一个 `row gap=xs` 里**不换行**，整行 `scrollWidth=742` > `clientWidth=698`（**溢出 44px**），`overflowX: visible`。
- 相邻 Products 卡 `x=1043`，预设行内容右缘在 `x=1057` ⇒ 有 **14px 压进两卡之间的 14px 间距**（即正好贴到邻居卡片左边界；邻居卡有 14px padding，**未遮住文字**）。
- 同卡内「Set the split from the CLI」的 CLI 命令行也造成 30px 溢出（`accountRow over=30`）。
- 页面级仍正常：`documentElement.scrollWidth-clientWidth = 0`；`afs-list` 行 `maxRowOver = 0`（20/20 行不溢出）；`docScrollH=908=clientH`（单滚动容器未破）。

## 证据输出

`docs/team/test-reports/raw/round-24/qa-r24-visual.json` + 截图 `qa-r24-policy-layout.png`：

```text
presetRow   : {"over":44,"cw":698,"sw":742,"rect":{"x":315,"y":704,"w":698,"h":29,"right":1014},"overflowX":"visible"}
strategyCard: {"over":30,"cw":726,"sw":756,"rect":{"x":300,"y":277,"w":728,"right":1029},"overflowX":"visible"}
siblingCard : {"rect":{"x":1043,"y":277,"w":728,"right":1771},"text":"Products | Catalogue from economy/products. …"}
preset content right = 1057 ; sibling x = 1043 ; bleed = 14 px
doc         : {"sw":0,"sh":908,"ch":908}
```

退出码：0（探针）

## 影响范围

- 受影响角色：admin
- 受影响链路：界面（`?page=policy` 策略卡布局）
- 数据后果：无
- 可绕过：更窄视口下 `grid-template-columns: repeat(auto-fit, minmax(520px,1fr))` 会退化成单列，溢出随之消失；1803 宽双列时可见

## 疑似文件

- `.aup/pages/economy/policy.aup`（`row gap=xs { action … preset-1 … preset-5 }`；收款账户 `key-value-list` 的长 CLI 字符串）

---

## QA 复验（round-24f · task-104 独立复验 · 2026-09-29）

> 独立复验，不采信 Dev 自述。完整报告：`docs/team/test-reports/round-24f.md` §2/§3.8/§3.9；原始 JSON：`docs/team/test-reports/raw/round-24f/qa24f-layout.json`、`qa24f-nav.json`（自有 harness `qa24f-ui.mjs`）。

**判定：可关闭（L-R24F-2 达成；四组视口 over=0）**

| 视口/语言 | 预设行 | 子元素 | 整卡 | 相邻卡 bleed | 页面 doc over |
| --------- | ------ | ------ | ---- | ------------ | ------------- |
| 1803×908 en | `over=0`（cw=sw=698，`lines=2`） | maxOver=0 | over=0 | 0 | 0 |
| 1803×908 zh | `over=0`（cw=sw=698，`lines=2`） | maxOver=0 | over=0 | 0 | 0 |
| 1512×765 en | `over=0`（cw=sw=575，`lines=2`） | maxOver=0 | over=0 | 0 | 0 |
| 1512×765 zh | `over=0`（cw=sw=575，`lines=2`） | maxOver=0 | over=0 | 0 | 0 |

- 对照修复前（QA-020）：`presetRow {over:44, cw:698, sw:742}`、`bleed=14px`。现在按钮行由不换行 `row` 改为 `display:grid repeat(auto-fit,minmax(150px,1fr))`，实测折成 **2 行**，`over=0`。
- 同卡内 CLI 命令行（`accountRow`）en 实测 `over=0`；zh 因探针按英文前缀定位而为 `null`，但整卡 `card.over=0` 已把同卡全部控件限制在卡内。
- 额外扫描：21 个 console 页在 1803×908 下 `docOver=0`（含 policy），无新增页面级横向溢出；21/21 页 `active=1`、0 `SESSION INIT FAILED`。
- 说明：`worstOver` 在 21 页恒定命中同一个 `DIV.aup-view`（334px，侧边栏菜单），修复前即存在且页面级 `docOver=0`，非本轮回归。
