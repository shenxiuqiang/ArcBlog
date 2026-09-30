# BUG-026: `compose-edit` 未登录 gate 的 `return_to`/`cancel_to` 指向不存在的 `?page=admin`，登录后落到公开首页

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-026 |
| 严重级 | **P2**（交互/导航不一致：登录后丢失目标页；不阻断功能，重新导航即可；与 BUG-021 同类） |
| 发现轮次 | **round-11F（QA 独立复验 BUG-021 时顺带扫描全部 19 个 gate 卡发现）** |
| 关联 REQ | spec §15.9 通用 General（页面 id 真实性）；判据 `docs/ArcBlog-admin-ui-design.md` §2.1 登录 gate 先例 |
| 状态 | 待裁决（建议修 1 行：改为 `%2F%3Fpage%3D` + 一个**真实存在**的返回页，例如 `posts`（compose-edit 的入口）或 `general` 之外的本页 id） |
| 既有性 | **非本轮回归**：`git show HEAD:.aup/pages/admin/compose-edit.aup` 中同样是 `page%3Dadmin`，本轮只改了 `row cross=start` 包裹（V1），未改目标 |

## 复现命令与最小步骤

```bash
$ grep -rn "page%3Dadmin" .aup/pages/
.aup/pages/admin/compose-edit.aup:34:  action -> navigate "/.well-known/service/login?return_to=%2F%3Fpage%3Dadmin&cancel_to=%2F%3Fpage%3Dadmin" variant=primary label=:login

# 所有 gate 目标 vs 真实页名
$ grep -rho "return_to=[^\"']*" .aup/pages/ | sed 's/.*page%3D//;s/&.*//' | sort -u
access admin agents appearance categories compose dashboard factory feeds general heroes hub media operations pages policy posts seo tags
$ find .aup/pages -name '*.aup' | sed 's#.*/##;s#\.aup##' | sort | tr '\n' ' '
about access agents appearance author categories compose compose-edit dashboard factory feeds general heroes hub index media operations page-view pages policy posts preview reader seo store tags
```

`admin` 不在任何真实页名里（`?page=admin` 不是页面）。

## 期望

与其余 18 个 gate 卡一致：`return_to`/`cancel_to` 指向**真实存在**的页 id（`?page=<real-id>`），登录完成后回到用户原本要进的页面。

## 实际

运行期实测（`?page=admin`，admin 会话，CDP 1803×908）：静默回落到**公开首页**，无错误提示：

```json
{"url":"http://arcblog.localhost:4939/","hasFail":false,"h2":["Latest published"],
 "active":0,"hasEditPost":false}
```

⇒ 未登录运营者从 compose-edit 的 gate 出发登录，登录成功后落到公开站点首页；且 `?page=admin` 本身也不是可导航页。

## 证据输出

```text
# QA round-11F 全 19 个 gate 卡扫描：18 个 = 本页名，1 个 = admin（不存在）
targets: access admin agents appearance categories compose dashboard factory feeds general heroes hub media operations pages policy posts seo tags

$ node /tmp/qa11r-cdp.mjs /tmp/qa11r-spec-pageadmin.json
{"url":"http://arcblog.localhost:4939/","hasFail":false,"h2":["Latest published"],"active":0}

$ git show HEAD:.aup/pages/admin/compose-edit.aup | grep return_to
        action -> navigate "/.well-known/service/login?return_to=%2F%3Fpage%3Dadmin&cancel_to=%2F%3Fpage%3Dadmin" …   ← 既有
```

## 影响范围

- 受影响角色：任何未登录、从 compose-edit 触发的运营者
- 受影响链路：`/.well-known/service/login` 的 return 跳转
- 数据后果：无（不写数据）

## 疑似文件（线索，未改）

- `.aup/pages/admin/compose-edit.aup:34`（`return_to` / `cancel_to`）
- 对照正确先例：`.aup/pages/admin/general.aup:54`（本轮已修为 `page%3Dgeneral`）、`.aup/pages/admin/dashboard.aup`

## 复验结论（round-11-reverify）

本条为**本轮新开**（既有缺陷），无「修复」可复验；证据见 `docs/team/test-reports/round-11-reverify.md` §2② / §7。
