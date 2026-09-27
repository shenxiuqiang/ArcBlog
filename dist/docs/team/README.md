# ArcBlog 虚拟团队工作手册（Agent Team Playbook）

> 所有者：**Lead** ｜ 读者：Lead + PM / Dev / QA / UI 四名 teammate ｜ 写入范围：`docs/team/README.md`、`AGENTS.md`

用 dsh 的 **Agent Teams** 机制，把 ArcBlog 的开发拆成 4 个长期角色，让它们围绕**同一份任务板**和**同一套文件交接物**持续轮转。

- 产品与技术方向唯一权威：[`../ArcBlog-product-technical-spec.md`](../ArcBlog-product-technical-spec.md)
- 功能实现状态：[`../ArcBlog-feature-checklist.md`](../ArcBlog-feature-checklist.md)
- 实现事实与命令入口（先读）：仓库根 [`../../CLAUDE.md`](../../CLAUDE.md)

---

## 1. 心智模型：Lead 是 CEO，不是员工

| 层 | 谁 | 干什么 |
| --- | --- | --- |
| 决策 / 守门 | **Lead**（会话主控，1 个） | 定轮次目标、在任务板上派活、跑质量门、`git commit`、对外汇报、决定加人还是停机 |
| 员工 | **PM / Dev / QA / UI**（4 个持久 teammate） | 在自己写入范围内完成一轮的工作，把结论写成文件，并用一条消息回报 |

必须先理解的四个机制事实——它们直接决定了提示词怎么写、为什么需要 Lead 驱动：

1. **teammate 是持久会话，但一次只跑一个 turn。** turn 结束即 `inactive`，它不会自己在后台永远运行。"不停工作" = **Lead 驱动轮次循环**（§3）。配合 `create_goal` 的自动续轮，可以做到用户不发话也继续推进。
2. **所有成员共享同一个文件系统。** 所以**文件才是交接物**，`send_message` 只负责"叫醒 + 一句摘要"。不要把结论只写在消息里——消息会滚动，文件不会。
3. **每个角色同一时刻只允许 1 个 `in_progress` 任务**，且写范围不重叠（§5）。这是避免互相覆盖的唯一可靠手段——写范围只是提示性路径，**不是锁**。
4. **任务板是唯一的"当前进度"真相。** `team_task_*` 有 owner、`blocked_by` 依赖、`write_scopes` 和 revision CAS；进度看板 + 轮次日志是给人看的，任务板是给 agent 看的。

---

## 2. 四个角色

| 角色 | 一句话职责 | 独有产物（只有他写） | 明确不做 |
| --- | --- | --- | --- |
| **PM**<br>[`roles/pm.md`](roles/pm.md) | 把 spec / 清单 / QA 反馈变成**排好序的需求**，派活、跟进度、裁决缺陷 | `backlog.md`、`requirements/REQ-*.md`、`journal/round-*.md` | 不写代码、不写测试、不改 spec |
| **Dev**<br>[`roles/dev.md`](roles/dev.md) | 实现 PM 派的需求，保证仓库**始终全绿** | `.aup/`、`scripts/`、`world/`、`pages/`、`blocklet.yaml` | 不改 spec 与清单、不自行判定"通过" |
| **QA**<br>[`roles/qa.md`](roles/qa.md) | 独立验证交付物，产出**可复现**的缺陷与回归结论 | `test-reports/*.md`、`bugs/BUG-*.md` | **绝不改源码**（包括"顺手修一下"） |
| **UI**<br>[`roles/ui.md`](roles/ui.md) | 维护设计与体验一致性，产出设计规范与界面改进 | `design/*.md`、`.web/`、`logo.svg`、主题与外观资源 | 不改业务逻辑脚本与 DSL 逻辑 |

角色的完整写入范围、Definition of Done、消息规则见各自的角色卡。

---

## 3. 一个轮次（Round）长什么样

标准轮次 = 5 步。**只有 Lead 推进轮次**，员工只在自己的 turn 内完成本职并回报。

### ① 计划（PM）
读 `docs/ArcBlog-feature-checklist.md` 里的 🟡/⬜，读完上一轮 `test-reports/` 与未裁决的 `bugs/`，然后：

- 更新 `backlog.md` 的优先级；
- 为进入本轮的条目写 `requirements/REQ-*.md`（含**可执行的验收标准**）；
- 写本轮目标到 `docs/team/journal/round-N.md` 的"计划"节。

### ② 派活（Lead 或 PM）
在共享任务板上 `team_task_create`，每项都要带 `write_scopes` 与 `blocked_by`；然后 `send_message` 叫醒 owner。

派活规则：

- 同一时刻**每个成员 ≤ 1 个 `in_progress` 任务**；
- **QA 任务必须 `blocked_by` 对应的 Dev 任务**（否则会验空气）；
- 一项需求最多拆成"一个角色能独立完成的交付物"；跨角色的先由 PM 拆开；
- 写范围重叠的两项任务**不能同时开工**（view 会报 write-scope 警告）。

### ③ 并行执行（Dev / UI）
Dev 实现 REQ，UI 同时做设计提案与界面改进——两者写范围天然不重叠（Dev 逻辑，UI 呈现），可以真并行。
谁先完成谁先给 PM + Lead 发一条消息，格式固定：

```
产物路径 + 验证命令 + 实际结果
```

### ④ 验证（QA）
QA 独立重跑质量门，**不看 Dev 的自述结论**，按 REQ 的验收标准逐条验证（含至少一条负面用例），输出：

- `test-reports/round-N.md`：结论表 + 原始命令与输出摘录 + 放行/不放行；
- 发现的每个问题写成 `bugs/BUG-*.md`：最小复现 + 期望/实际 + 证据 + 疑似文件。

### ⑤ 收口（PM → Lead）
1. **PM 把 QA 反馈翻译成新需求**：每条 BUG 必须裁决为 `本轮修` / `下轮修` / `不修（写明理由与 spec 章节）`，不允许挂着不管。
2. **Lead 跑最终门并提交**：

```bash
arc dsl validate --json      # issues 必须为空
npm test                     # 全绿（含 arc dsl generate --check 漂移门）
arc blocklet build           # 改了 .aup 才需要
git add -A && git commit -m "<type>(<scope>): 本轮净结果"
```

3. 更新 `docs/ArcBlog-feature-checklist.md` 状态 + 追加变更日志行（✅/🟡/⬜ 计数要准确）。
4. PM 写 `journal/round-N.md` 的"结果 / 遗留 / 下轮候选"，然后进入下一轮。

---

## 4. 交接协议（文件就是接口）

| 交接 | 产物路径 | 谁写 | 谁读 |
| --- | --- | --- | --- |
| 优先级看板 | `docs/team/backlog.md` | PM | 全体 |
| 需求（含验收标准） | `docs/team/requirements/REQ-NNN-<slug>.md` | PM | Dev、QA、UI |
| 设计提案 | `docs/team/design/UI-NNN-<slug>.md` | UI | PM、Dev |
| 缺陷 | `docs/team/bugs/BUG-NNN-<slug>.md` | QA | PM、Dev |
| 测试报告 | `docs/team/test-reports/round-N.md` | QA | PM、Lead |
| 轮次日志 | `docs/team/journal/round-N.md` | PM | 全体、用户 |
| 进程内协作 | `send_message` | 全体 | 被叫醒者 |

模板在 [`templates/`](templates/)。**新增任何一类交接物前先确认模版存在**，不要自创格式。

---

## 5. 写范围与冲突处理

| 角色 | 可以写 | 绝不可以写 |
| --- | --- | --- |
| Lead | 全部（但只在轮末提交） | — |
| PM | `docs/team/**` | 任何源码、测试、spec |
| Dev | `.aup/**`、`scripts/**`、`world/**`、`pages/**`、`blocklet.yaml`、`dist/**`（由构建生成） | `docs/team/**`、`docs/ArcBlog-product-technical-spec.md` |
| QA | `docs/team/test-reports/**`、`docs/team/bugs/**` | 任何源码、任何测试文件 |
| UI | `docs/team/design/**`、`.web/**`、`logo.svg`、`docs/share-cards.md`（仅外观章节） | `scripts/**`、`.aup/**` 的逻辑部分 |

冲突处理：

- 发现自己需要的文件在别人写范围里 → **不要写**，给 PM 发消息说明"要改什么、为什么"，由 PM 建任务或升级 Lead。
- 两个人同时要改同一个文件 → PM 把它们排成 `blocked_by` 串行，并在任务描述里写清顺序。
- 出现"写范围重叠警告" → Lead 必须让其中一项等，不能并行。

---

## 6. 质量门（Definition of Green）

任何增量交付前必须全绿，**红仓库不允许交接**：

```bash
arc dsl validate --json     # 主质量门：issues 为空
npm test                    # scripts/*.test.mjs + 产物漂移门 + 死 locale key 门
arc blocklet build          # 仅当改了 .aup 源码（重新生成 dist/）
```

失败即回滚自己的改动，然后在回报里写明"尝试了什么 / 失败在哪 / 现在的仓库状态"。

---

## 7. 升级与停机

**必须升级给 Lead 的情况**：要加/撤 teammate、要改架构决策（`development-plan.md` 的 D1–D7）、发现 spec 与实现冲突、需要链上资金或真实密钥、质量门在本轮内无法修绿、需求范围需要扩大。

**不要在角色之间做的事**：`git commit` / `git push` / `git reset --hard`、改 `docs/ArcBlog-product-technical-spec.md`、删 `node.key` / `.env.local`。

**停机条件**（满足任一即停止轮次循环）：

1. `backlog.md` 中没有 `🟥 本轮` / `🟨 排队` 条目，且所有 🟡 都是"平台不支持已记录降级路径"；
2. 连续 2 轮 QA 都不放行且原因相同 → 停下来找用户；
3. 用户叫停。

---

## 8. 怎么启动这个团队

在 **ArcBlog 目录**下开一个 dsh 会话（`cd ~/workspace/ArcBlog && dsh`，或用 GUI 把工作目录设成它），然后把 [`bootstrap.md`](bootstrap.md) 里的启动词发给 Lead。

启动后 Lead 会：建长时目标 → 建共享任务板 → `spawn_teammate` 拉起 pm / dev / qa / ui → 跑 Round 1 → 每轮末跑门并提交。

---

## 9. 常见故障与对策

| 症状 | 原因 | 对策 |
| --- | --- | --- |
| 员工"做完就没了"，不动 | teammate 是 turn 式的，不会常驻 | 用 `send_message` 唤醒；确认 Lead 在驱动轮次（§3） |
| 两个角色互相覆盖同一文件 | 写范围重叠 | PM 拆成 `blocked_by` 串行；任务 view 里的 write-scope 警告必须处理 |
| QA 验不出问题，只是复述 Dev 的话 | QA 读了 Dev 的自述 | QA 角色卡要求"先自己重跑门，再看结论"；QA 报告必须有原始命令输出 |
| 任务板一堆 `pending` 没人动 | 只建了任务没叫醒 owner | 建任务后必须 `send_message`；`wait_agent` 只能在有人 running/provisioning 时用 |
| 上下文爆炸 / 反复寒暄 | 角色之间自由聊天 | 每轮每人主动叫醒他人 ≤ 1 次；结论一律落文件 |
| 轮次推不动 | Lead 没有明确本轮目标 | 每轮开始必须写清"本轮要交付什么、验收标准是什么" |
