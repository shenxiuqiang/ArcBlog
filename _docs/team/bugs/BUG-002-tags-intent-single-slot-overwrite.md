# BUG-002: 控制台意图队列是「单槽」——待执行的重命名被 Refresh 静默覆盖

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-002 |
| 严重级 | P1 |
| 发现轮次 | round-6 |
| 关联 REQ | REQ-001-tags-admin-ui（§2.1.4 / §2.1.6 / §2.1.8，验收标准 A4 / A5） |
| 状态 | ✅ **已修复并复验通过**（round-6 复验，2026-09-27；证据 `docs/team/test-reports/round-6-reverify.md` §2） |

## 复现命令与最小步骤

1. 前置：dev 实例 `default`；admin 会话（本机共享调试 Chrome，CDP 9333）；实例上有标签 `ui_keep`（任意已存在标签即可）；**不要**启动 `arcblog-tags.mjs watch`（页面自己写明 worker 需另行启动，这是默认状态）。
2. `?page=tags` → 表单填 `Tag = ui_keep`、`New name = ui_keep_two` → 点「Queue rename / merge」→ 确认对话框点确认 → 出现 toast「Intent queued — the local worker applies it.」。
3. **在 worker 执行之前**，点同一页右上角的「Refresh projection」。
4. `arc` 侧复读意图记录并执行 worker。

```bash
# 第 2 步之后（待执行的重命名确实在队列里）
arc afs exec /blocklets/arcblog/.actions/read \
  --args '{"path":"/instance/app/arcblog/tags/intents/console.json"}' --json
#   → {'id': 'console', 'action': 'merge', 'from': 'ui_keep', 'to': 'ui_keep_two', 'status': 'pending'}

# 第 3 步「Refresh projection」之后：同一条记录被覆盖
arc afs exec /blocklets/arcblog/.actions/read \
  --args '{"path":"/instance/app/arcblog/tags/intents/console.json"}' --json
#   → {'id': 'console', 'action': 'refresh', 'from': '', 'to': '', 'status': 'pending'}

node scripts/arcblog-tags.mjs apply     # 只执行 refresh
node scripts/arcblog-tags.mjs list      # ui_keep 仍在，ui_keep_two 不存在
```

## 期望

REQ-001 §2.1.8 要求界面「只写 intent → 本地 worker 执行」并**如实标注**；§2.1.4/§2.1.6 要求提交后计数/引用更新、且数据新鲜度可刷新。因此：

- 界面已 toast「Intent queued」，这条重命名就应该真的会被 worker 执行；
- 「Refresh projection」不得静默丢弃另一条待执行的操作；若产品只支持单槽，界面必须明确拒绝/提示冲突，而不是报成功。

## 实际

- 表单提交与「Refresh projection」写入的是**同一个 AFS 路径同一个 id**（`/instance/app/arcblog/tags/intents/console.json`，`id: console`），后者**直接覆盖**前者。
- 「Refresh projection」照样弹成功 toast，待执行的重命名**没有任何提示地消失**；`apply` 之后文章未被改写（`ui_keep` 仍在，`version` 未变）。
- 队列区在界面上列出多条记录（done/failed/noop 历史都在），看起来像队列，实际**最多只能有一条 pending**；同一路径连续提交两次改名，第一次同样被覆盖。

## 证据输出

```text
# ① UI 提交改名（真实点击）后
=== console.json after UI merge submit ===
{'id': 'console', 'action': 'merge', 'from': 'ui_keep', 'to': 'ui_keep_two', 'status': 'pending'}
（页面 toast: 'Intent queued — the local worker applies it.'）

# ② 点「Refresh projection」后（同一条记录被覆盖）
refresh toast = True
=== console.json after Refresh ===
{'id': 'console', 'action': 'refresh', 'from': '', 'to': '', 'status': 'pending'}

# ③ 执行 worker
=== apply (pending queue) ===
applied: console refresh done migrated= 0
=== 被引用文章 ===
probeU tags = ['ui_new', 'ui_keep'] version = 2      ← ui_keep→ui_keep_two 从未发生，文章未变
```

退出码：0

## 影响范围

- 受影响角色：admin（控制台运营者）
- 受影响链路：界面提交 → intent 队列 → 本地 worker（标签治理的唯一界面入口）
- 数据后果：**已写入**（`tags/intents/console.json` 被覆盖）。清理方式：`arc afs exec /blocklets/arcblog/.actions/delete --args '{"path":"/instance/app/arcblog/tags/intents/console.json"}'`；被覆盖的意图本身不可恢复，需重新提交
- 可绕过：**部分**。若 `arcblog-tags.mjs watch` 在运行，pending 会被 ~3s 内的 tick 消化，窗口变窄但**不为零**（提交后立即点 Refresh 仍会丢）；未运行 watch（页面默认提示的状态）时窗口是无限长
- 其它：同一路径连续提交两次改名同样只保留最后一条

## 疑似文件

- `.aup/pages/site/tags.aup:124`（Refresh 写 `path: "/instance/app/arcblog/tags/intents/console.json"`, `content.id: console`）
- `.aup/pages/site/tags.aup:185`（提交表单写**同一个** path + id，故互相覆盖）
- `scripts/arcblog-tags.mjs` 的 `enqueueIntent()`（CLI 侧用随机/显式 `id` 生成唯一记录，页面这条路径绕过了它，导致行为不一致）

## 复验记录（round-6 复验，2026-09-27，QA）—— P1 阻断项已解除

修复方式：界面每次写唯一 `…/intents/${generate.timeiso}.json`（id=path），`applyIntent` 按记录自身 path 回写，`enqueueIntent` 增加 pending CONFLICT 守卫。

```text
同一次页面会话：提交改名 ×2 + 点 Refresh projection（真实点击）
→ intents 目录 3 条记录，path 全部唯一：
   2026-09-27T12:52:31.585Z.json  merge   ui_keep → ui_keep_two  pending
   2026-09-27T12:52:35.081Z.json  merge   ui_src  → ui_src_two   pending
   2026-09-27T12:52:37.083Z.json  refresh --                     pending
→ node scripts/arcblog-tags.mjs apply  → applied: 3（两条 merge done + refresh done）
→ 目标文章 tags ['ui_src','ui_keep'] v1 → ['ui_src_two','ui_keep_two'] v3，contentHash 变化；
   与等价 CLI `merge` 组剥离 title/slug/时间戳/hash 后内容完全一致 : True
→ 异内容同 id 再入队：exit 1 {"code":"CONFLICT", …}，AFS 上原 pending 记录未被覆盖；
   同内容同 id 再入队：exit 0（幂等）
```

结论：**已修复并复验通过**，原缺陷（单槽 + 静默覆盖）不再复现。完整证据：`docs/team/test-reports/round-6-reverify.md` §2。残余风险（AFS 层无跨写守卫、同毫秒碰撞 UI 不可达）见该报告 §7。
