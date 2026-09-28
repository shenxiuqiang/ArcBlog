# BUG-021: `settings-general` 未登录 gate 的 `return_to`/`cancel_to` 指向不存在的 `?page=settings`，登录后落到公开首页

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-021 |
| 严重级 | **P2**（交互/导航不一致：登录后丢失目标页；不阻断功能，重新点侧栏即可到达） |
| 发现轮次 | **round-11（QA 独立验证，浏览器实测）** |
| 关联 REQ | spec §15.9 通用 General（本轮 `?page=settings-general` 新页）；对照 `docs/ArcBlog-admin-ui-design.md` §2.1 登录 gate 先例 |
| 状态 | 待裁决（建议 **本轮修**，1 行改动：`return_to`/`cancel_to` 改为 `%2F%3Fpage%3Dsettings-general`） |

## 复现命令与最小步骤

1. 前置：共享调试 Chrome（CDP 9333）、任一**未登录**上下文（`Target.createBrowserContext` 隔离上下文即可）。
2. 打开 `http://arcblog.localhost:4939/?page=settings-general`，页面上出现的唯一操作是「使用 DID Wallet 登录」。
3. 读该按钮的 `-> navigate` 目标（静态即可见），或登录后观察落点。

```bash
# 静态
grep -n "return_to" .aup/pages/admin/settings-general.aup
grep -rho "return_to=[^\"']*" .aup/pages/ | sort | uniq -c | sort -rn
# 动态（隔离上下文，等价于未登录）
node /tmp/qa11-cdp.mjs /tmp/qa11-spec-deeplink.json     # 见 round-11.md §3.D
```

## 期望

与其余 17 个控制台页一致：gate 的 `return_to`/`cancel_to` 指向**本页**（`?page=<本页名>`），登录完成后回到用户原本要进的页面。

## 实际

`.aup/pages/admin/settings-general.aup:43` 写的是 `?page=settings`——而 `settings` 不是本页的页名（本页是 `settings-general`，见 BUG/降级说明 §3.A），也不是任何存在的页：

```text
# grep -rho "return_to=[^\"']*" .aup/pages/ | sort | uniq -c
   1 return_to=%2F%3Fpage%3Dsettings&cancel_to=%2F%3Fpage%3Dsettings   ← 唯一一个指向 settings 的
   1 return_to=%2F%3Fpage%3Ddashboard&...
   ... （其余 17 条全部等于本页名）
```

`?page=settings` 在运行时**静默回落到公开首页**（无错误提示）：

```json
// 隔离上下文导航 ?page=settings
{ "url": "http://arcblog.localhost:4939/", "hasFail": false,
  "h2": ["Latest published"], "body": "ArcBlog\n▾\nLatest published\nHello ArcBlog\n…" }
```

⇒ 未登录运营者从设置页出发登录，登录成功后**落到公开站点首页**，而不是回到 General 设置页。

## 证据输出

```text
$ grep -n "return_to" .aup/pages/admin/settings-general.aup
43:        action -> navigate "/.well-known/service/login?return_to=%2F%3Fpage%3Dsettings&cancel_to=%2F%3Fpage%3Dsettings" variant=primary label=:login style={borderRadius: "var(--radius-md, 8px)"}

$ node /tmp/qa11-cdp.mjs /tmp/qa11-spec-deeplink.json      # url = .../?page=settings
{"url":"http://arcblog.localhost:4939/","hasFail":false,"hasGeneralTitle":false,
 "hasSettingsRecord":false,"h2":["Latest published"],"active":[]}

$ node /tmp/qa11-cdp.mjs /tmp/qa11-spec-a.json             # 同页 admin 会话，页名实际是 settings-general
{"url":"http://arcblog.localhost:4939/?page=settings-general","activeCount":1,"activeTexts":["General"]}
```

## 影响范围

- 受影响角色：任何未登录的运营者（gate 是设置页对未登录用户的唯一入口）
- 受影响链路：`/.well-known/service/login` 的 return 跳转
- 数据后果：无（不写数据）

## 疑似文件（线索，未改）

- `.aup/pages/admin/settings-general.aup:43`（`return_to` / `cancel_to`）
- 对照正确先例：`.aup/pages/admin/dashboard.aup:35`、`.aup/pages/ops/agents.aup:49`

---

## 复验结论（round-11-reverify，2026-09-28，QA 独立验证）

**状态：已修复（复验通过）。** 页面已改名为 `general`，gate 目标随之修正。

```text
$ grep -n "return_to" .aup/pages/admin/general.aup
54:  action -> navigate "/.well-known/service/login?return_to=%2F%3Fpage%3Dgeneral&cancel_to=%2F%3Fpage%3Dgeneral" variant=primary label=:login style={borderRadius: "var(--radius-md, 8px)"}

# admin 深链 ?page=general（CDP 1803×908）
{"url":"http://arcblog.localhost:4939/?page=general","hasFail":false,"h2":["General"],
 "activeCount":1,"activeText":["General"]}          ← 目标页真实存在、侧栏 active=1、不回落公开首页

# 旧 id 行为（登记）
?page=settings-general → {"url":"http://arcblog.localhost:4939/","active":0,"hasGeneral":false}   ← 静默回落公开首页
?page=settings         → 同上
```

**同轮新发现（同类、既有，非本 BUG 回归）**：19 个 gate 卡中 `compose-edit` 的 `return_to/cancel_to` 仍指向不存在的 `?page=admin`（运行期回落公开首页；`git show HEAD:` 同样如此）→ 已另开 [BUG-026](BUG-026-compose-edit-gate-return-to-missing-page.md)（P2）。

证据全文：`docs/team/test-reports/round-11-reverify.md` §2②。
