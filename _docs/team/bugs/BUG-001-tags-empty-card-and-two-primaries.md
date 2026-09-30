# BUG-001: 标签页空态引导卡常驻，且同屏出现两个 primary 按钮（admin-ui-design §4.3/§4.4）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-001 |
| 严重级 | P2 |
| 发现轮次 | round-6 |
| 关联 REQ | REQ-001-tags-admin-ui（验收标准 A6 / A11） |
| 状态 | ✅ **已修复并复验通过（按平台受限的替代口径）**｜REQ-001 A11 原条款（空态卡仅无数据时出现）在本平台不可达成，见 `docs/team/test-reports/round-6-reverify.md` §3 / §9.2 |

## 复现命令与最小步骤

1. 前置：dev 实例 `default`；已登录 admin 会话；实例上**有**标签（例如 `node scripts/arcblog-tags.mjs list` → `count = 3`）。
2. 打开 `http://arcblog.localhost:4939/?page=tags`（本机共享调试 Chrome，CDP 9333）。
3. 读取页面文本 / 按钮计算样式。

```bash
# 最小复现（CDP，本机共享调试 Chrome 9333；新开标签页，只读）
python3 - <<'PY'
# 见 docs/team/test-reports/round-6.md §3 的原始输出；等价的浏览器内脚本：
#   [...document.querySelectorAll('button')]
#     .filter(b => /Write a post|Queue rename \/ merge|Refresh projection/.test(b.innerText))
#     .map(b => ({ text: b.innerText.trim(), visible: !!b.offsetWidth, bg: getComputedStyle(b).backgroundColor, padding: getComputedStyle(b).padding }))
PY
```

等价人工步骤：滚动到右侧内容区底部 —— 先看到「No tag in use yet?」引导卡与深色 **Write a post** 主按钮，紧接着是表单卡与深色 **Queue rename / merge** 主按钮。

## 期望

- `docs/ArcBlog-admin-ui-design.md` §4.4：空状态卡只在**没有数据**时出现（「一句现状 + 一句价值 + 一个动作」），实例上有标签时不应出现。
- 同标准 §4.3：「Primary 每页最多 1 个」「每屏一个 `primary`；次级用 `secondary`」。
- REQ-001 A11：该页应通过 `docs/ArcBlog-admin-ui-design.md` §9 清单。

## 实际

- 实例有 27 个标签（列表正常渲染 27 行）时，空态引导卡 **仍然渲染**（常驻，无 `visible` 条件），文案为「No tag in use yet? / A tag shows up in the list above as soon as a post carries one…」。
- 同屏同时存在 **两个 `primary`** 按钮：「Write a post」（空态卡内）与「Queue rename / merge」（表单卡内），二者计算样式完全相同（同一主色底 `rgb(26, 26, 31)`、`padding 8px 16px`），且都 `visible`。
- 对照：UI-001 走查记录的是该页更早一版（`docs/team/design/UI-001-console-tokens-and-walkthrough.md:167` 记为「两个 `primary` 由 `visible` 互斥」）。当前文件已无该条件，故 UI 走查的「主操作互斥 ✓」结论对最终产物**不再成立**。

## 证据输出

```text
# CDP：?page=tags（admin 会话，实例 27 个标签）
matched buttons = 3
 - {'text': 'Refresh projection',   'visible': True, 'background': 'rgba(42, 110, 0, 0.08)', 'padding': '5px 12px'}   ← secondary
 - {'text': 'Write a post',         'visible': True, 'background': 'rgb(26, 26, 31)',      'padding': '8px 16px'}   ← primary
 - {'text': 'Queue rename / merge', 'visible': True, 'background': 'rgb(26, 26, 31)',      'padding': '8px 16px'}   ← primary
empty card shows while list present: True | list rendered: True

# 截图中可见（有 27 行标签的同时，下方就是 "No tag in use yet?" + 深色 "Write a post"）：
docs/team/test-reports/assets/round-6-tags-two-primary.png
```

退出码：0

## 影响范围

- 受影响角色：admin（控制台运营者）
- 受影响链路：界面（标签管理页的层级与空态诚实性）
- 数据后果：无（纯呈现）
- 可绕过：是（运营者按列表判断即可），但违反 UI 标准且误导

## 疑似文件

- `.aup/pages/site/tags.aup:170-176`（空态卡缺 `visible="${state.…count}"` 条件；`action -> page compose variant=primary`）
- `.aup/pages/site/tags.aup:185`（表单 `action variant=primary`，与上面的 primary 同屏）
- `docs/ArcBlog-admin-ui-design.md` §4.3 / §4.4（判定依据，不得修改）

## 复验记录（round-6 复验，2026-09-27，QA）

修复后按 Lead 给定的**替代口径**复验（原条款「空态卡仅无数据时出现」在本平台不可达成）：

```text
状态 A（有数据，5 个标签） / 状态 B（空投影探针）实测：
可见 primary 数量          : 1 / 1        （均为 ['Queue rename / merge']）
误导性空态「No tag in use yet?」: false / false
常驻 dim 说明渲染           : true / true  （颜色 rgb(107, 107, 120)）
整页滚动条                  : false / false（doc 908/908/908）
硬编码色值                  : no hardcoded color
```

结论：**修复已验证**（同屏 primary = 1、不再声称空态、常驻说明两态都渲染）；**A11 原条款平台受限**，是否接受替代口径由 PM 裁决、平台事实由 Lead 记入 `docs/arc-contracts.md`。完整证据：`docs/team/test-reports/round-6-reverify.md` §3 / §9.2；截图 `docs/team/test-reports/assets/round-6-reverify-single-primary.png`。
