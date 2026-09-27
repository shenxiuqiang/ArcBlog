# BUG-006: `?page=hub` 同屏 4 个 primary 按钮（行内 Approve），违反"同屏恰 1 个主操作"

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-006 |
| 严重级 | P2 |
| 发现轮次 | round-7 |
| 关联 REQ | REQ-002-console-consistency-fixes（F2 同类，但 §2.1 F2 只写了 `posts` / `pages`；本条为**范围外**发现） |
| 状态 | 待裁决 |

## 复现命令与最小步骤

1. 前置：dev 实例 `default`；admin 会话（CDP 9333，`arcblog.localhost:4939`）；Hub 关系列表至少有 1 行（本机有 4 行）。
2. 打开 `?page=hub`，统计可见的 `data-variant="primary"` 元素。

```bash
node /tmp/qa-cdp.mjs nav 'http://arcblog.localhost:4939/?page=hub' 2500
node /tmp/qa-cdp.mjs eval /tmp/qa-probe-cards.js   # 内含 primaryCount / primary
```

## 期望

`docs/ArcBlog-admin-ui-design.md` §4.3「按钮层级」+ §4.4 + §9 清单第 3 条「页头：标题 + 一句话说明 + **至多一个主操作**」：
控制台一屏内只应有一个主操作（`primary`），行内批量/逐行动作应降为 `secondary`。
REQ-002 F2 已按同一口径把 `posts` 草稿行、`pages` 离线行的 Publish 从 `primary` 降为 `secondary`；`hub` 行内 Approve 是同一形态遗留。

## 实际

`?page=hub` 同屏 `primaryCount = 4`，文本全为 `Approve`（Hub 关系列表每行一个），页头没有主操作。
对照同轮已验证的页面：`?page=posts` = 1（`New post`）、`?page=pages` = 1（`Create (offline)`）、`?page=compose` = 1、`?page=tags` = 1。

## 证据输出

```text
$ node /tmp/qa-cdp.mjs eval /tmp/qa-probe-cards.js    # ?page=hub（admin 会话）
{"url":"http://arcblog.localhost:4939/?page=hub","h2":["Hub console"],"primaryCount":4,
 "primary":["Approve","Approve","Approve","Approve"], …}

$ node /tmp/qa-cdp.mjs eval /tmp/qa-probe-cards.js    # ?page=posts（同轮已修，对照）
{"h2":["Your studio","Your content"],"primaryCount":1,"primary":["New post"], …}

$ grep -n 'variant=primary' .aup/pages/ops/hub.aup
142:                    action variant=primary size=sm label=:approve confirm={title: :approve-title, …}
```

退出码：0

## 影响范围

- 受影响角色：admin
- 受影响链路：界面（按钮层级 / 主操作唯一性）
- 数据后果：无
- 可绕过：否（视觉规范问题；行内 Approve 本身可用）

## 疑似文件

- `.aup/pages/ops/hub.aup:142`（`action variant=primary size=sm label=:approve`）
