# BUG-016: `?page=hub` 行内重写把 `sync.lastVersion` 改型（`null`→`""`、数字 `7`→`"7"`；delete+write 重写引入的类型漂移）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-016 |
| 严重级 | **P3**（数据表示漂移：`null`→空串、number→string；不影响功能、不影响任何读取判定，但改变了记录的字段类型） |
| 发现轮次 | **round-9-reverify（R9F）** —— 复验 BUG-012 的 `hub.aup:147/148` 修复时，用新造探针独立测得 |
| 关联 REQ | REQ-008 §2.1 A/B（`hub.aup:147/148` 行内写动作）、§2.1 D（判需改 AFS 记录形态即停手上报） |
| 状态 | 待裁决（Dev 修：隐藏 input 无法承载 `null`，需在写入模板里区分 null 与 `""`，或接受该漂移并写进 `docs/arc-contracts.md`） |
| 写范围 | 疑似文件属 Dev（`.aup/pages/ops/hub.aup`）；QA 未改任何源码 |

## 复现命令与最小步骤

1. 前置：admin 会话（本机共享调试 Chrome / CDP 9333）；写 `.gate-lock`。
2. 造一条 hub 收录探针，`sync.lastVersion` 为 JSON `null`（与真实记录的既有形态一致）。
3. `?page=hub&locale=en` 对该探针行点击 **Approve**（或 **Terminate**）+ 页面内确认框。
4. 复核记录：`sync.lastVersion` 变成 `""`。

```bash
# 0) 写锁
printf 'QA … — hub lastVersion null-drift probe\n' > docs/team/.gate-lock
# 1) 造探针（relation: applied, sync.lastVersion: null）—— 见 round-9-reverify.md §3-B 的 /tmp/qa-r9f/seed.mjs
node /tmp/qa-r9f/seed.mjs seed
# 2) 真实点击 Approve（行匹配 'applied'，按钮 'Approve'）
node /tmp/qa-r9/click3.mjs 'http://arcblog.localhost:4939/?page=hub&locale=en' 'applied' 'Approve' 1803 908
# 3) 复核
node -e "import('/Users/shenxiuqiang/workspace/ArcBlog/scripts/lib/arc.mjs').then(m=>console.log(JSON.stringify(m.readJson(m.INSTANCE_ROOT+'/hub/registrations/qa-r9f-hubprobe.json').value.sync)))"
```

## 期望

行内 Approve / Terminate 只应改变 `relation` / `removedAt` / `updatedAt` 等语义字段；`sync.lastVersion` 的既有类型（真实记录中为 `null`）应保持不变，或被明确记录为平台/实现约定。

## 实际

`sync.lastVersion` 的值类型被改写：

- `null` → `""`（JSON null 变成空字符串）
- 数字 `7` → 字符串 `"7"`（数字变成字符串）

原因：修复采用「每行 hidden `input value="${entry.content.sync.lastVersion}"` → `exec` 的 `args` 用 `${args.eSyncLastVersion}`」，**hidden input 的 value 是字符串**——它既无法承载 JSON `null`（渲染为空串），也会把数字隐式串化。旧写法把 `sync` 整体写成字面量字符串（更坏），所以本 BUG 是修复引入的**次要类型漂移**，不是功能回退。

## 证据输出

```text
# 探针（点击前，AFS 直写，形态与真实记录一致）
hub/registrations/qa-r9f-hubprobe.json: {"status":"registered","relation":"applied","removedAt":"","lastVersion":null}

# 真实点击 Approve（admin 会话 + 页面内确认框）
ROW   {"rowFound":true,"rowText":"did:key:…bProbe Relation applied Direction studio ● Status registered Freshness never 1 minute ago Approve Terminate Purge","clicked":"Approve"}
MODAL {"modal":true,"modalText":"Approve","clicked":"Approve"}
AFTER {"toasts":["Approved — relation is indexed.", …],"modalStillThere":false}

# 点击后复核（全字段）
hub/registrations/qa-r9f-hubprobe.json: {"id":"qa-r9f-hubprobe","relation":"indexed","status":"registered","removedAt":"",
                                          "sync":{"status":"never","lastSync":"","lastVersion":"","lastHash":"","lastError":""}}
                                                                    ^^^^^^^^^^^^^^^^^^^^^^ null → ""

# 对照：仓库里 4 条真实收录记录的 lastVersion 类型并不统一（2 条 null / 2 条数字）
$ node -e "…read hub/registrations/*.json…"
42b02720d0b6bb68.json lastVersion= null
6d86a84e377ad736.json lastVersion= 7
8133a1ea682714e5.json lastVersion= null
e8f453792619a8f9.json lastVersion= 1

# 追加探针（数字类型）：seeded lastVersion = 7 (number) → 点击 Approve 后
seeded sync = {"status":"ok","lastSync":"2026-09-27T17:39:48.281Z","lastVersion":7,"lastHash":"sha256:probe","lastError":""}  typeof lastVersion = number
after Approve sync = {"status":"ok","lastSync":"2026-09-27T17:39:48.281Z","lastVersion":"7","lastHash":"sha256:probe","lastError":""}  typeof lastVersion = string
                                                                    ^^^^^ number → string
```

⇒ 任何一次行内 Approve / Terminate 都会把该字段从 `null` 写成 `""`、从数字写成字符串（真实记录中两种形态都存在）。

## 影响范围

- 受影响角色：admin（控制台运营者）
- 受影响链路：`?page=hub` 行内 Approve / Terminate 对 **已存在** 收录记录的重写（delete+write 链）
- 数据后果：**已写入**（仅该字段类型漂移；两条探针记录已由 QA 删除，实例已回到 baseline）
- 可绕过：读侧不敏感（`node scripts/arcblog-network.mjs hub refresh` 等按 falsy / 宽松比较处理 `""`/`null`/`"7"` 无差异），故不阻断

## 疑似文件

- `.aup/pages/ops/hub.aup:147` / `:148`（`content.sync.lastVersion: "${args.eSyncLastVersion}"`）
- `.aup/pages/ops/hub.aup:160`（`input type=hidden name=eSyncLastVersion value="${entry.content.sync.lastVersion}"`）
- 复验报告：`docs/team/test-reports/round-9-reverify.md` §3-F / §5 观察 3
