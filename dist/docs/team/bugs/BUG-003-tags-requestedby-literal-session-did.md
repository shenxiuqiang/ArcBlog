# BUG-003: 页面写入的意图记录 `requestedBy` 是字面量 `$session.did`（未插值）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-003 |
| 严重级 | P2 |
| 发现轮次 | round-6 |
| 关联 REQ | REQ-001-tags-admin-ui（§2.1.4 / §2.1.8） |
| 状态 | ✅ **已修复并复验通过**（`requestedBy` 字段被移除，改为 `requestedVia: "console"`；证据 `docs/team/test-reports/round-6-reverify.md` §4） |

## 复现命令与最小步骤

1. 前置：dev 实例 `default`；admin 会话（本机共享调试 Chrome，CDP 9333）。
2. `?page=tags` → 表单填 `Tag = <已存在标签>`、`New name = <新名>` → 点「Queue rename / merge」→ 确认。
3. 读取界面刚写入的意图记录。

```bash
arc afs exec /blocklets/arcblog/.actions/read \
  --args '{"path":"/instance/app/arcblog/tags/intents/console.json"}' --json
```

## 期望

`requestedBy` 应是提交者的 DID（或干脆不写该字段）。REQ §2.1.8 要求界面如实记录由谁发起；一个审计字段写进一个字面模板串等于写了错数据。

## 实际

`requestedBy` 落库为字面量字符串 `"$session.did"`，**没有被运行时插值**；同一条记录里的 `requestedAt: "${generate.timeiso}"` 却正确插值了（`2026-09-27T11:58:30.046Z`），说明 `$session.*` 在 `exec` 的 `content` 内不解析、`$generate.*` 解析。这与 `CLAUDE.md`「compose 表单写 `authorDid: "$session.did"` best-effort（是否插值未 runtime-verified）」的注记一致——本轮把它 runtime 证实了。

## 证据输出

```text
$ arc afs exec /blocklets/arcblog/.actions/read --args '{"path":"/instance/app/arcblog/tags/intents/console.json"}' --json
{
  "id": "console",
  "action": "merge",
  "from": "ui_src",
  "to": "ui_new",
  "rawFrom": "ui_src",
  "rawTo": "ui_new",
  "summary": "ui_src → ui_new",
  "status": "pending",
  "message": "",
  "migrated": 0,
  "posts": [],
  "requestedBy": "$session.did",                        ← 字面量，未插值
  "requestedAt": "2026-09-27T11:58:30.046Z"             ← ${generate.timeiso} 插值正常
}
```

退出码：0

## 影响范围

- 受影响角色：admin（控制台运营者）
- 受影响链路：界面写入 intent 的审计字段（`tags/intents/*.json`）
- 数据后果：**已写入**（派生记录里的审计字段错误；不影响改名本身）。清理方式：删除对应 intent 记录或让 worker 正常消费
- 可绕过：否（只要从界面提交就会写错）。注意同一模式若被复制到其它页面的 `exec` args 里，会继续产生错误的 DID 归档

## 疑似文件

- `.aup/pages/site/tags.aup:124`（`requestedBy: $session.did`）与 `:185`（同上）
- 参考先例：`.aup/pages/admin/compose.aup` 的 `authorDid: "$session.did"`（同类写法，`CLAUDE.md` 已记为未验证）

## 复验记录（round-6 复验，2026-09-27，QA）

从界面真实提交一次改名后读回 intent 记录：

```text
{
 "id": "2026-09-27T12:52:31.585Z", "action": "merge",
 "rawFrom": "ui_keep", "rawTo": "ui_keep_two", "status": "done", "migrated": 1,
 "requestedVia": "console",                      ← 新字段（不再有 requestedBy）
 "requestedAt": "2026-09-27T12:52:31.585Z"       ← 正常插值的真实时间戳
}
$ grep -n '\$session.did' .aup/pages/site/tags.aup → no $session.did in tags.aup
```

结论：**已修复并复验通过**——字段被移除并替换为 `requestedVia: "console"`，不再写入未插值的字面量。完整证据：`docs/team/test-reports/round-6-reverify.md` §4。
