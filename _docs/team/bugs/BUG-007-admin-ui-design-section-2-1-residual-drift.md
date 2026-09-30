# BUG-007: `admin-ui-design.md` §2.1 自相矛盾且把不存在的实现名当现状（REQ-003 未收口项）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-007 |
| 严重级 | P3 |
| 发现轮次 | round-7 |
| 关联 REQ | REQ-003-admin-ui-design-alignment（D1 事实对齐；本条是 §2.1 剩余漂移，未列入 UI-002 §6.1 的 R1–R7） |
| 状态 | 待裁决 |

## 复现命令与最小步骤

1. 前置：无（纯静态文档 + 源码 grep）。
2. 读 `docs/ArcBlog-admin-ui-design.md` §2.1（第 63–73 行表格）。
3. 对照本轮已落地的 REQ-002 F9（17 个控制台页侧栏底部都有品牌/关于/RSS/版权行）。

```bash
sed -n '63,73p' docs/ArcBlog-admin-ui-design.md
grep -c 'wrapper.footer-brand' -r .aup/pages/ | wc -l        # 17
grep -rnE 'console-topbar|console-scroll' .aup/ | wc -l      # 0
```

## 期望

REQ-003 §2.1：同一张表内**不得自相矛盾**，且不得把实现里不存在的选择器（`console-topbar` / `console-scroll` / `console-pane` / `console-shell`）写成现状（要么改成实现事实，要么像 §8 那样明确标注为"概念名"）。
本轮 REQ-002 F9 已在 17 个控制台页渲染侧栏页脚，文档必须与实现一致。

## 实际

同一张 §2.1 表格里两句互相矛盾，且顶栏/滚动容器仍按不存在的选择器描述：

- 第 66 行「侧边栏样式」：`… 与右侧内容之间 1px 右分割线；**不渲染页脚**；…`
- 第 72 行「侧栏页脚」：`控制台不渲染站点页脚，品牌/关于/RSS/版权收进侧栏底部（marginTop: auto）`
- 第 65 行「顶栏」：`页面内 view console-topbar（…）承载 app-header` —— `.aup/` 里 `console-topbar` 命中 0（实现在 `wrapper.aup` 的 `view mode=shell`）
- 第 56 / 61 行仍写 `console-scroll：唯一滚动区` / 「只有右侧 `console-scroll` 内部滚动——详见 §2.3」——该选择器命中 0，且交叉引用应指 §2.5（滚动归属在 §2.5，不在 §2.3）

UI-002 §6.1 已把 R1（顶栏行）/ R2（正文 console-scroll）/ R3（§2.5 代码块概念名）列为"未获授权、停手上报"，
但 **「不渲染页脚」这一句没有被列进 R 清单**；它在 REQ-002 F9 落地后由"与第 72 行矛盾"升级为"与实现事实相反"。

## 证据输出

```text
$ sed -n '66p;72p' docs/ArcBlog-admin-ui-design.md
| 侧边栏样式 | **扁平、贴左边缘、与顶栏/视口底部零间距**：容器无边框无圆角无内边距（`padding: 0`、`gap: 0`），与右侧内容之间 1px 右分割线；**不渲染页脚**；菜单项无边框无圆角、左对齐满宽、左右内边距 `8px 20px`；… |
| 侧栏页脚 | 控制台不渲染站点页脚，品牌/关于/RSS/版权收进侧栏底部（`marginTop: auto`） |

$ grep -rl 'wrapper.footer-brand' .aup/pages/ | wc -l
17
$ grep -rnE 'console-topbar|console-scroll' .aup/ | wc -l
0
$ grep -rn 'console-topbar\|console-scroll' docs/ArcBlog-admin-ui-design.md
65:| 顶栏 | 页面内 `view console-topbar`（`width: 100vw` + `margin-left: calc(50% - 50vw)`）承载 `app-header`，与控制台同宽贴边 |
56:│ 侧栏     │  console-scroll：唯一滚动区 ⇅ │ │
61:页面整体锁定视口高度，**只有右侧 `console-scroll` 内部滚动**——详见 §2.3。

# 浏览器实测（admin，?page=posts）侧栏底部四行确实渲染：
"ArcBlog / About / RSS / © 2026 ArcBlog"
```

退出码：0

## 影响范围

- 受影响角色：UI / Dev / QA（文档是 §9 验收与实现的共同依据）
- 受影响链路：文档（下一轮实现者按 §2.1 写骨架会与现状冲突）
- 数据后果：无
- 可绕过：是（读 §2.3/§8/源码）；但 §2.1 是"控制台骨架"表，误导面最大

## 疑似文件

- `docs/ArcBlog-admin-ui-design.md:56,61,65,66,72`（§2.1）
- 对照：`docs/team/design/UI-002-admin-ui-design-alignment.md` §6.1（R1–R7 清单，未含「不渲染页脚」）
