# 启动词（Bootstrap Prompt）

> 所有者：**Lead** ｜ 用法：在 **ArcBlog 目录**下开一个 dsh 会话（`cd ~/workspace/ArcBlog && dsh`），把 [§2 启动词](#2-启动词整段发给-lead) 整段发给 Lead。
> 事实以 [`CLAUDE.md`](../../CLAUDE.md)（实现与命令）和 [`README.md`](README.md)（工作手册）为准；两者与本文冲突时，以它们为准并回来改本文。

**怎么读这份文档**

| 你是 | 看哪几节 |
| --- | --- |
| 人类（发起者） | §1 启动前确认 → §2 启动词（整段复制发给 Lead） |
| Lead | 全部；日常回看 §0 速查 + §5 门与节奏 + §6 收口 runbook |
| 开发 agent | §3 模板（由 Lead 填好发给你）+ §4 并发纪律 + §5 门 + §7 提交保护 |

**单一事实源原则（本文的写作规则，改文档时也遵守）**：每条规则**只在**下表的权威小节里写一次，别处只留指针。
2026-09-29 的审计发现同一条规则被复制到 4 处，于是 `arc blocklet build` 的过时口径在角色卡里活了下来（泄漏密钥，BUG-067）。

| 规则 | 权威位置 |
| --- | --- |
| 门是什么、跑什么、多久跑一次 | **§5 门与节奏** |
| 谁可以写哪个文件、并发几路 | **§4 波次模型与并发配额** |
| 收口七步（generate/prune/baseline/build/提交） | **§6 收口 runbook** |
| 未提交改动如何保护、跨会话如何共存 | **§7 提交保护与跨会话共存** |
| 浏览器怎么验、标签页纪律 | **§9 浏览器验证配方** |

---

## 0. 速查（先看这张表）

| 问题 | 答案 |
| --- | --- |
| 一轮有几个人在写？ | **开发类 ≤10 并行** + PM/QA/Lead 各 1；见 §4 |
| 谁提交？ | **Lead**（并发回滚风险下可一次性授权作者只提交自己那一个文件）；见 §7 |
| 改完一个文件跑什么？ | `arc dsl validate --json` + 单文件 `node --test`（或 `npm test -- --changed`）；页面类再过 `arcblog-ui-budget.mjs`；见 §5 |
| 什么时候跑全量 `npm test`？ | **每波收口一次**（~1 s，10 文件，自带耗时表与超时终止）；见 §5 |
| 全量 `npm run test:live`？ | **永不例行跑**（~21 min、写共享实例）；见 §5 |
| 改了 `.aup` 谁 build？ | **Lead 收口时**跑 `npm run build`（= build + `scrub:dist-secrets`）；**永不裸 `arc blocklet build`**（BUG-067 泄漏密钥）；见 §6 |
| 一个产物做完第一步做什么？ | `cp` 到 `/tmp` 副本 + 回报 sha256（未提交改动会被跨会话收口清掉，BUG-079）；见 §7 |
| QA 什么时候来？ | **批次末一次**（用户裁定 2026-09-29）；见 §4 |
| 并发超过 10 路 / 要动链和资金？ | 停下来问人类；见 §2 纪律 |

---

## 1. 启动前必须确认（五条，否则必翻车）

1. **确认写者是谁**。本会话的写者 = Lead + 本波开发 agent（≤10）+ PM/QA；
   再叠加一个**不受控的写者**（另一个 dsh 会话、别的工具）就会互相覆盖。
   ```bash
   ps aux | grep -iE "kimi-code|codex|claude|cursor|zed|dsh" | grep -v grep
   git log --oneline -3 && git status --short
   ```
   工作区在波次中间**本来就该是脏的**——脏不是停手信号。要停手的是**对不上本波 `write_scopes`** 的增量：
   逐个路径核对，对不上就问人类，**绝不 `git add -A`**。
   （历史教训：曾把 Lead 自己的并行会话误判为"别的工具在写"——先认领再指控。）

2. **门是活的**。开始前跑一次，确认不是环境坏了：
   ```bash
   arc service status                 # daemon 在跑吗（dev 实例 arcblog.localhost:4939）
   arc dsl validate --json            # issues 必须为空
   npm test                           # 快层：10 文件 / 只读 / ~1 s（见 §5）
   ```

3. **看残留**。live 测试会往实例写记录，且只在**通过后**自动清理：
   ```bash
   node scripts/arcblog-clean.mjs             # 干跑：报告残留数量与分布
   node scripts/arcblog-clean.mjs --confirm   # 确认后再删（测试红时保留现场）
   ```

4. **定并发额度与分配**（详见 §4）：开发类 ≤10，一个 agent 一个不相交写范围，共享文件唯一写者。
   超过 10 条就排队。

5. **确认跨会话风险**（详见 §7）：另一个会话可能在同一工作区"还原非本轮改动"（BUG-079 抹掉过 4 个页面，
   且 `dist/` 副本同时失效）⇒ 产物**落地即留 `/tmp` 副本 + 尽快提交**。

---

## 2. 启动词（整段发给 Lead）

```text
你是 ArcBlog 项目的 Lead（虚拟公司的 CEO）。按 docs/team/README.md 的工作手册组织开发。
先读：CLAUDE.md、docs/team/README.md、docs/team/backlog.md、docs/ArcBlog-feature-checklist.md、
docs/team/bootstrap.md（重点：§0 速查、§4 并发配额、§5 门与节奏、§6 收口 runbook、§7 提交保护）。

请依次执行：

1. 建一个长时目标（create_goal）：按**波次**持续推进 ArcBlog 的 🟡/⬜ 项 —— 每波 = 一组写范围互不相交的
   任务并行实现 → 收口门 → 提交；直到 backlog 没有可交付项、或我明确叫停。max_goal_rounds = 3。
2. 建共享任务板：从 docs/team/backlog.md 的「本轮」取条目逐项 team_task_create —— **每条必须带 write_scopes**；
   写范围相交的条目**合并给同一个 agent 或串行**；QA 任务 blocked_by 整批实现任务（QA 分批，见第 4 步）。
3. 按 §4 的配额拉起开发 agent（开发类 ≤10；PM/QA/Lead 各 1、不占额度），提示词用 §3 的 teammate 模板，
   逐项写清：工作目录、必读顺序、自己的写范围与禁止事项、自检命令、i18n 键清单要求、/tmp 副本要求、回报格式。
   **共享文件只有唯一写者（默认你）**：.aup/locales/**、dist/**、scripts/console-nav.mjs + arcblog-console-nav.mjs、
   scripts/ui-budget-baseline.json、blocklet.yaml、spec、checklist、backlog、journal。
4. 跑一波：
   ① PM 规划（REQ + 可执行验收标准）→ ② 开发 ≤10 并行实现（各自落盘 + /tmp 副本 + 回报）
   → ③ **Lead 收口**：按 §6 的七步走完（validate + 全量 npm test + generate --write + locale prune +
   baseline 重录 + npm run build + 按 write_scopes 精确提交）
   → ④ **批次末 QA 一次独立验证**（用户裁定 2026-09-29：逐轮 QA 暂停）
   → ⑤ PM 裁决 + journal 结果节 + 下波候选。
5. 门与节奏**照 §5 执行**（增量用单文件 / `npm test -- --changed`；全量快层每波一次；永不例行跑全量 live；
   改 .aup 由你在收口时跑 `npm run build`，绝不用裸 arc blocklet build；格式用 `arc dsl format`，永不 `arc dsl lint --fix`）。
6. 每波结束向我汇报：本波交付、QA 结论（放行/不放行）、清单 ✅/🟡/⬜ 变化、commit、下波计划、
   未决问题与需要我点头的事。

纪律：每个 agent 同一时刻 ≤1 个 in_progress 任务；黑名单命令（git push/reset、改 spec、删 node.key/.env.local）
一律禁止；**Lead 是唯一提交者**（并发回滚风险下可一次性授权作者只提交自己那一个文件）；结论必须落到 docs/team/
下的文件，消息只做「叫醒 + 摘要」；并发超过 10 路、要改架构、要动真实链或资金时停下来问我。
```

---

## 3. teammate 提示词模板（Lead 按任务填空后发给 spawn_teammate）

```text
你是 ArcBlog 虚拟团队的 <角色>（见 docs/team/roles/<角色>.md）。你是本波 <N> 个并行开发 agent 之一，
只负责任务板上这一条任务；**你的写范围与其他人不相交，这是并行的前提**。

工作目录：/Users/shenxiuqiang/workspace/ArcBlog（bash 一律传 workdir，文件一律用绝对路径）。
必读顺序：AGENTS.md → CLAUDE.md → docs/team/README.md → 你的角色卡 → 你的任务（任务板 id / REQ）。
开工前先 `git status --short`：**不是自己 scope 的 M 文件一律不碰、不回滚、不 add**（可能有另一个会话在改）。

你的写入范围：<照抄任务板的 write_scopes>。超出范围不要写，给 PM/Lead 发消息说明「要改什么、为什么」。
禁止：git commit / git push / git reset --hard（**唯一例外**：Lead 在回滚风险下逐一授权作者提交自己那一个文件）；
改 docs/ArcBlog-product-technical-spec.md；删 node.key / .env.local；碰别人的写范围；
**跑 npm run build**；**跑 arc dsl generate --write**；**碰 .aup/locales/**。

自检（每次改动后，详见 bootstrap.md §5）：
  arc dsl validate --json                          # issues 必须为空（他人在途的 stale locale 除外，须注明归属）
  arc dsl format <你的文件> --write                # 永不 arc dsl lint --fix（会删运行期寻址的 id）
  node --test scripts/<相关>.test.mjs              # 或 npm test -- --changed：只跑与当前 diff 相关的套件
  node scripts/arcblog-ui-budget.mjs --json        # 页面类任务：本页七项 + over + 棘轮
  写实例的路径才用：npm run test:file -- scripts/<x>.test.mjs（先写 docs/team/.gate-lock，跑完删锁）
**不要**跑全量 npm test（Lead 收口时跑一次）、**不要**跑 npm run test:live。

i18n 纪律：可以改本页 `i18n {}` 块，但**必须在回报里列全删掉/新增的键名**；locales 由 Lead 收口时
统一 `generate --write` + 逐键 prune，你不要碰。

研究纪律：不要臆造 ARC API（spec §150），先 arc <cmd> --help / explain / 读 docs/arc-contracts.md；
平台不支持的能力写进 arc-contracts.md 并给降级路径。任何新增的 AFS 路径若被脚本/测试使用，
必须用环境变量可覆盖（否则测试会覆盖生产记录）。

交付：产物文件路径 + 你实际跑过的验证命令与输出 + 未决问题 + **仓库外副本**
（`cp <文件> /tmp/<task>-<name>` + sha256，见 §7）。完成后给 PM 和 Lead 各发一条
「产物路径 + 验证命令 + 实际结果 + 副本路径」，并把任务板上的任务置 completed。
```

---

## 4. 波次模型与并发配额（开发 ≤10）

**一轮的默认形态是波次（wave）**，不是单条 REQ：

| 相位 | 谁 | 上限 | 产物 |
| --- | --- | --- | --- |
| ① 规划 | PM | 1 | backlog「本轮」表 + 每条一个 REQ（含可执行验收标准）+ `journal/round-N.md` 计划节 |
| ② 实现 | **开发类 agent** | **≤10 并行** | 源码（`dist/` 由 Lead 收口时统一 build） |
| ③ 收口 | **Lead（唯一写者）** | 1 | 按 §6 七步：generate + prune + baseline + `npm run build` + 精确提交 |
| ④ 验证 | QA | 1 | `test-reports/<batch>.md`（+ 有缺陷才写 BUG） |

**QA 分批（用户裁定 2026-09-29）**：逐轮 QA 暂停，独立 QA 在**批次末一次做完**（或人类点名）；
实现期间仍由 Lead 每波跑门（§5）——门不会被跳过，只是 QA 的独立复核合并。

**额度**：开发类 agent（Dev / UI / 调研）**最多 10 个并行**；只读任务不占写额度，但总数建议 ≤12。
10 是**上限不是目标**：2026-09-29 实测 7 路页面波次的瓶颈已经从"没人干活"变成 `.aup/locales/**`、`dist/`、
生成器这些**共享文件**，**6–8 路通常是收益拐点**。

**分配规则（按任务切，不按人多）**

1. **一个 agent 一个不相交写范围**（任务板必须写 `write_scopes`）。两个任务的 scope 相交 ⇒
   **合并给同一个 agent 或串行**，不允许"两个人都改同一个文件再祈祷"。
2. **共享文件只能有唯一写者**（默认 = Lead）：`.aup/locales/**` · `dist/**`（build） ·
   `scripts/console-nav.mjs` + `scripts/arcblog-console-nav.mjs`（生成器） · `scripts/ui-budget-baseline.json` ·
   `blocklet.yaml` · `docs/ArcBlog-product-technical-spec.md` · `docs/ArcBlog-feature-checklist.md` ·
   `docs/team/backlog.md` · `journal/**`。
3. **一个页面任务 = 一个 agent**（`.aup/pages/<dir>/<page>.aup` + 其 `.aup/man/<page>*.yaml`）——
   页面之间天然不相交，是本仓库最适合并行的单位。
4. **优先级用数据排**：`node scripts/arcblog-ui-budget.mjs --json` 按 `over` 个数排序，先做超限最多的页
   （2026-09-29 首波：`hub` 5 项、`diagnostics` 4 项、`media` 4 项）。
5. **超过 10 条就排队**（任务板 `pending`，完成一个补一个）；**绝不**为了"都开起来"让两个 agent 共用一个文件。
6. **可并行三类**：① 页面重构 ② 独立脚本/CLI（写范围 = 自己的 `.mjs` + 自己的测试）
   ③ 只读调研/探针（写范围 = 一个文档小节或 `/tmp` 隔离副本）。
   **不可并行**：`npm run build`、`generate --write`、改生成器/菜单/locales、改 `baseline`。

**参考配额（12 页波次）**：8 路页面 + 1 路脚本/CLI + 1 路只读探针 = 10；
生成器 / 菜单 / locales / build / baseline 由 **Lead 串行收口**，不占开发额度。

**开发 agent 的纪律**（与 §5 门、§7 保护、§3 模板同源，此处只列要点，不重复正文）：
一个 agent 同时 ≤1 个 in_progress 任务 · 只写自己的 scope · 不 build / 不 generate / 不碰 locales ·
开工先 `git status` 认领在途文件 · 目视类验收留给批次末 QA。

---

## 5. 门与节奏（**规则唯一权威位置**）

**门 = 快层。** `arc dsl validate --json`（issues 空）+ `npm test`（快层，10 文件，只读，不写实例）。
按用途分档，**全量只跑一次/波**：

| 场景 | 命令 | 频率 |
| --- | --- | --- |
| 增量自检（开发 agent） | `node --test scripts/<相关>.test.mjs`，或 `npm test -- --changed`（按 diff 选套件） | 每次改动后 |
| 页面类自检 | `node scripts/arcblog-ui-budget.mjs --json`（本页七项 + `over` + 棘轮） | 每次改动后 |
| **波次收口（Lead）** | **`npm test`** —— 全量快层，~1 s | **每波一次** |
| 改动涉及 CLI / AFS 记录 / 链适配器 / daemon 路由 | `npm run test:file -- scripts/<x>.test.mjs`（写实例：先写 `docs/team/.gate-lock`，跑完删锁） | 定向，不跑全量 |
| 全量 live 层 | **不做**（用户裁定 2026-09-27：~21 min 且写共享实例；Round 7 实测 212 pass/1236 s） | 仅人类点名 |
| 改了 `.aup` | 由 Lead 在收口时 `npm run build`（见 §6） | 每波一次 |

**runner 自带的能力（`scripts/run-tests.mjs`，别自己写计时/超时脚本）**

1. **逐文件耗时表**（最慢在前）+ 总计，并单独汇总**三个 spawn `arc` 的套件**（`i18n` / `console-nav` /
   `dist-secrets`）——它们是全场瓶颈（实测 CPU 合计 ~2.4 s，靠并发压到墙钟 ~1 s）。
2. **超时与总预算**：fast 层默认 **25 s/文件 + 30 s 总预算**；超时即 `SIGKILL` 并打 `TIMEOUT`，
   总预算耗尽则**不再启动后续文件**并列出未跑清单；两种情况都**退出码 1**（挂死绝不伪装成"慢"）。
   覆盖：`ARCBLOG_TEST_TIMEOUT_MS` / `ARCBLOG_TEST_BUDGET_MS` / `ARCBLOG_TEST_CONCURRENCY`
   （live 层默认 10 min/文件、无总预算、并发 1）。
3. **`--changed`**：只跑"守卫文件命中当前 diff"的套件（守卫表 = 同文件 `GUARDS`）；
   **没有守卫条目的套件永远选中**——沉默不允许假装有覆盖。
4. **`--json`**（人读信息走 stderr）：`node scripts/run-tests.mjs fast --json` →
   `{tier, elapsedMs, budgetHit, files:[{name,ms,code,pass,fail,timedOut}], skipped, failed, timedOut}`。
   别用 `npm test -- --json` 喂脚本（npm 会在 stdout 前插 banner）。

**纪律**：新写的测试文件**默认算 live**（单跑），除非显式加进 `FAST_TESTS`；
`docs/team/.gate-lock` 保护一切**写实例**的动作（`arc` / AFS / 定向单文件），快层不需要锁、也不该因慢被跳过；
**红门不得提交**。

实测基线（2026-09-29）：串行 1.9 s → 并发 4 **~1.0 s**；最慢 `arcblog-i18n` ~1.0–1.3 s（spawn 两次 `arc dsl`），
其次 `dist-secrets`（0.6–0.7 s）、`permissions`（0.5 s，HTTP 只读）。

---

## 6. 收口 runbook（Lead 在波次末执行，七步）

并行改写会让三类共享文件成为冲突点，顺序错了就会产生死键或假绿。**严格按序**：

| 步 | 命令 | 为什么必须由 Lead 做 |
| --- | --- | --- |
| 1 | 确认所有实现任务已 `completed` 且产物已提交；`git status --short .aup/pages/` 干净 | 未提交产物既会被回滚清掉（§7），也会让 generate 写到一半的旧状态 |
| 2 | 等 `.aup/locales/**` 的**其他写者**（别的会话）停止 | locales 是共享文件，唯一写者原则（§4） |
| 3 | `arc dsl generate --write` | 把各页新键合进 locales；实测它**会重写页面前缀键集**，但只对**当时**的工作区状态生效 |
| 4 | 按 `arc dsl lint --json` 的 `dead_locale_keys` **逐键手删**（en+zh 都要） | `generate` 不裁剪残留键；**禁用 `arc dsl lint --fix`**：它会删掉运行期寻址的 id（tab 切换会静默失效） |
| 5 | `node --test scripts/arcblog-runtime-ids.test.mjs` | 上一步若误伤运行期 id，必须在这里暴露 |
| 6 | `node scripts/arcblog-ui-budget.mjs --write-baseline` → 再 `--json` 复核 | 页面变轻后基线必须跟着降；**例外上调**必须同时满足：① 全部指标仍在 §2.7.2 阈值内 ② 该页 `over` 集合严格变小 ③ 留痕写明"上调什么、换来了什么" |
| 7 | `arc dsl validate --json` → **`npm test`** → **`npm run build`** → 按 `write_scopes` 精确提交 | 全绿才算收口；build 必须走 `npm run build`（含 `scrub:dist-secrets`），**裸 `arc blocklet build` 会把 `node.key`/`.env.local` 复制进 `dist/`**（BUG-067） |

**已知例外（不算失败）**：`stale_generated_locale_json`（步骤 3 之前必然存在） ·
`unreferenced_explicit_id`（warning，分页列表的显式 id，REQ-030 要求保留） ·
`content_dropped` **不算例外**——那是真实结构错误（arc-contracts §45），谁的文件谁修。

> UI-016 §5.1 是同一份 runbook 的摘要视图；冲突时以本节为准。

---

## 7. 提交保护与跨会话共存（BUG-079 的教训）

**事实**：2026-09-29 另一个会话的轮次收口把 `.aup/pages/**` **还原到 HEAD 三次**（13:16:01 / 13:17:04 /
13:17:52）并从还原后的源重生成 locales；`dist/` 与 `~/.arc/pages` 部署产物里的副本**同时被覆盖**，
`git fsck` 的悬空对象也只是更旧的版本 ⇒ **4 个页面重构被抹且无副本可恢复**。记录：`docs/team/bugs/BUG-079-*.md`。

**因此本波起强制执行**：

1. **产物落地即留仓库外副本**：`cp <文件> /tmp/<task>-<name>` + 回报 sha256（本次靠它救回了 `hub`、`diagnostics`）。
2. **尽快提交**：Lead 在每个产物落地后立即提交（只加该产物路径）；并发窗口大时，Lead 可**一次性授权作者
   提交自己那一个文件**（仅该文件、仅本波）——这是"Lead 是唯一提交者"的**唯一**例外。
3. **绝不 `git add -A`**；提交信息写清「产物 + 验证命令 + 结果」。
4. **共享文件唯一写者**（§4 第 2 条）；每波开始先 `git log --oneline -3` + `git status --short` 看清别人在做什么。
5. **不要长时间"只写不提交"**：未提交的改动没有任何保护。

**根治建议（需要人类裁决）**：两个会话共用工作区时，按目录分区，或改用 `git worktree` / 不同分支；
任何"还原非本轮改动"的动作必须先确认是否属于另一个在跑的会话。

---

## 8. 高频踩坑（已实测，别再重新发现）

1. **测试隔离**：任何被测试/脚本使用的新 AFS 路径都要能由环境变量覆盖（本仓库已有 `ARCBLOG_*_PATH` 一族）。
   历史事故：测试直接写生产 `config/nft-factories.json` 与 `config/roles.json`，把真记录清空/写冲突。
2. **guest 浏览器点不动 admin-only 写**：`config/**`、`node/**` 的写需要 admin 角色，调试 Chrome 里是 guest——
   点击会被拒（fail-closed）。这类"点击执行"只能用 CLI 模拟同形写入验证，或问人类要属主会话，
   **不要声称已在浏览器端到端验证**。
3. **跨页导航要绝对 URL**：`-> page X` / `set {page}` 只改查询串、保留当前 path；在绑定路由
   （`/posts/<slug>`、`/store`）上会产生错误 URL。跨应用页一律 `href: "/?page=…"`（arc-contracts §27.6）。
4. **`-> set` 的 args 不解析 `${entry.content.*}`**（`exec` 的会）→ 页内数据更新用
   「行内 `exec` 写 AFS + `propBind` 面板重渲染」（arc-contracts §27.5）。
5. **`arc service restart` 不重新配置**（只按记录重启）。改了 manifest（如 `mounts`）要 `arc service stop` + `start`。
6. **永不 `arc dsl lint --fix` 全量**：它会删掉只有运行时寻址的 id（`scripts/arcblog-runtime-ids.test.mjs` 守着，§25.4）。
7. **build 只能走 `npm run build`**：裸 `arc blocklet build` 会把仓库根的 `node.key`/`.env.local` 复制进 `dist/`
   并写进 `dist/.afs/manifest.json`（BUG-067，平台无排除开关）。**开发 agent 不 build**（`dist/` 单一写者）→ §6 第 7 步。
8. **未提交的改动会被跨会话收口清掉**（BUG-079）→ 见 §7，本文不重复。
9. **`arc dsl format` 会改结构，不只会排版**（arc-contracts §45 / arc#2764）：`h2 "文本" level=2` 触发
   `content_dropped`（改用 `level="2"`）；裸 `afs-dropzone` + 紧随兄弟会被合并成**臆造的 `content=` prop**
   （把 dropzone 独占一层并放末尾）。format 后复核 `arc dsl lint --json` 的 `content_dropped`。
10. **`generate --write` 不是"只合并"**：它会重写页面前缀键集 ⇒ 收口顺序必须是「页面全部提交 → generate
    → 再核死键」（§6）；波次中途 generate 会留下新的死键（media 的 41 个就是这么来的）。
11. **AUP 没有可用的跨页片段**：`include` 解析通过但运行期拒绝；共享只有"生成 + `--check` 漂移门"一种形态
    （侧栏就是先例）。别试图用 `component`/`use` 跨页复用外壳（arc-contracts §16/§22）。
12. **大记录不进 `where`**：AFS 查询层只对 **≤ ~1.8 KB** 的内联记录可靠，超过就 `content IS NULL` ⇒
    `where` 静默漏、`select` 静默 `{}`、`aggregate.total` 是**组行数**（arc-contracts §44）。列表用目录边界或 `afs-list`。

---

## 9. 浏览器验证配方（UI / 页面类任务）

```bash
# 共享调试 Chrome（被 kill 过就重启；端口 9333）
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9333 --user-data-dir=/tmp/arcblog-chrome-test --no-first-run about:blank
```

- 用 `list_pages` 拿当前 pageId（**每次会话都可能变，别硬编码**），再 `navigate_page` + `evaluate_script` 量几何/取文本。
- **标签页纪律（必守，本文唯一权威位置）**：**整个 sweep 复用同一个标签页**（`Page.navigate` 换页），
  跑完关闭自己开的 target。2026-09-28 实测事故：18 页 × 多脚本的探针把调试 Chrome 攒到 **53 个 page target**，
  Chrome 濒临崩溃——人类看到的现象是「每点一个菜单就冒出一个新窗口」，**那不是链接问题**（控制台侧栏每行都是
  `action "$t(wrapper.nav-*)" -> page <page>` 的页内切换），而是脚本每页新开了 tab。
  每波结束（以及 Lead 收口时）跑一次清理，只留 1 个页面：

  ```bash
  # 列出：page 数量应保持个位数
  curl -s http://127.0.0.1:9333/json/list | python3 -c 'import json,sys;print(len([t for t in json.load(sys.stdin) if t.get("type")=="page"]))'
  # 清理：只保留最近使用的 1 个 page，其余全部关闭
  curl -s http://127.0.0.1:9333/json/list | python3 -c "
  import json,sys,urllib.request
  pages=[t for t in json.load(sys.stdin) if t.get('type')=='page']
  for t in pages[1:]:
      urllib.request.urlopen('http://127.0.0.1:9333/json/close/'+t['id']).read()
  print('closed', len(pages)-1)
  "
  ```
- 截图必须**内联**（`filePath` 会被拒）；要留下来时写到仓库外的临时目录。
- 页面地址：`http://arcblog.localhost:4939/?page=<name>`（公共页：`/`、`/posts/<slug>`、`/store`）。
- 判绿标准：`SESSION INIT FAILED` 不出现；要量的元素有非零几何；关键文案/链接在 DOM 里可断言。
- guest 会话的权限边界见 §8 第 2 条；**目视类验收按 §4 的 QA 分批，在批次末做**。

---

## 10. workflow 模式变体（把 teammate 换成 workflow 子 agent）

人类要求「用 workflow 模式跑 bootstrap」时，**不 spawn_teammate**，改用一个 workflow 脚本按相位编排
（脚本里的 `agent()` 就是各角色）：

```text
phase ①  PM     → backlog/REQ/journal 计划（写 docs/team/**）
phase ②  开发并行 ≤10 个 agent（parallel / pipeline；每个任务一个不相交写范围：
                  页面类 = 各一个 .aup/pages/**；脚本类 = 各自的 scripts/*.mjs + 测试；只读探针 = /tmp + 一个文档小节；
                  共享文件（locales/dist/生成器/baseline/spec/checklist/backlog）一律不交给开发子 agent）
phase ③  收口    Lead（唯一写者）→ §6 七步：generate + locale prune + baseline 重录 + npm run build + 精确提交
phase ④  QA     → 批次末一次：快层 + 定向单文件（.gate-lock）+ 浏览器尽力验证；报告 + BUG
条件   若 QA 判不放行且有阻断缺陷：Dev 修复 → QA 反向复验（仍是一次一个 agent）
return Lead 收口所需的事实（verdict / 剩余阻断 / 产物路径）
```

与 teammate 模式的差异（写进提示词，别指望子 agent 知道）：

- 子 agent **没有** `team_task_*` 工具：任务板由 Lead 建好，提示词里告知 task id 与 `write_scopes`，子 agent 按 schema 回报。
- 子 agent **没有持久记忆**：每个提示词自带工作目录、必读顺序、写入范围、禁止事项、门命令、报告格式。
- 子 agent 返回 `null` = 该相位失败。R8 实测：QA 相位在**返回结构化结果时**失败，但报告与 BUG 已落盘 ⇒
  Lead 先核验落盘产物是否完整、能否读出机读结论（如报告末行 `VERDICT=pass, BLOCKING=0`）；完整则以**落盘产物为准**
  补跑后续相位，并在轮次结论里如实记录；残缺则重跑该相位。**任何情况下都不许把 null 当成通过。**
- 轮末仍由 **Lead** 跑门、更新 checklist、按 `write_scopes` 精确提交。

---

## 11. 变体与维护

**只跑一波，不自动续波**：把启动词第 1 步的长时目标去掉，改成"先只跑本波，跑完停下等我确认"。

**纯 UI / 文档波（不碰 CLI、AFS、链）**：收口门 = 快层 + 浏览器/静态复核；在结论里**显式**写明
「本波未跑 live 层」（按裁定，非纯文档波也一样不跑全量 live）。

**加一个角色**（例如「安全审计」）：复用 `docs/team/roles/qa.md` 的骨架新建角色卡 + 写范围，
再 `spawn_teammate` 一个新名字并在任务板上给它建任务。**不要**让两个角色共用同一个写范围。

**换一波做什么**：只改 `docs/team/backlog.md` 的「本轮」表，然后对 Lead 说"读 backlog 的当前本轮，按 §4 开跑"。
Lead 不需要重新建团队——teammate 是持久的。

**暂停**：对 Lead 说"本波收口后停机"。已完成的轮次留在 `journal/` 与 git 历史里；下次用同一段启动词继续。

**维护本文**：改前先读 §0 的「单一事实源原则」——新增规则要放进对应权威小节，别处只加指针；
`arc blocklet build`、`npm test` 之类**命令与数字**一律从 `CLAUDE.md` / 脚本实测取，不要凭记忆写。
