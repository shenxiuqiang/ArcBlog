# 启动词（Bootstrap Prompt）

> 所有者：**Lead** ｜ 用法：在 **ArcBlog 目录**下开一个 dsh 会话（`cd ~/workspace/ArcBlog && dsh`），把「启动词」整段发给 Lead。
> 本文件只讲**怎么把团队拉起来、每轮怎么跑**；事实以 [`CLAUDE.md`](../../CLAUDE.md)（实现与命令）和 [`README.md`](README.md)（工作手册）为准，两者冲突时以后者为准并回来改本文件。

---

## 启动前必须确认（五条，否则必翻车）

1. **确认写者是谁**。团队是 5 个写者（Lead + 4 员工），再加一个不受控的写者就会互相覆盖。
   ```bash
   ps aux | grep -iE "kimi-code|codex|claude|cursor|zed|dsh" | grep -v grep
   git status --short
   ```
   **注意**：Lead 自己就是写者，工作区在轮次中间**本来就应该是脏的**——脏不是停手信号。
   要停手的是**不认识**的增量（你没写过的路径/文件）。判定方法：`git status --short` 里的路径逐个对得上本轮的 `write_scopes` 吗？对不上就问用户，**不要 `git add -A`**。
   （历史教训：曾发现「另一个工具」在写 `.aup/wrapper.aup` + `docs/arc-contracts.md` + `dist/`——事后确认那是 Lead 自己的并行会话。先认领再指控。）

2. **门只有一层：快层**（2026-09-27 用户裁定，见 [`CLAUDE.md`](../../CLAUDE.md)「Quality gates」）：
   ```bash
   arc dsl validate --json    # issues 必须为空
   npm test                   # 快层：10 文件 / 全部只读、**不写实例** → 每步都跑，它就是门
                              # （2026-09-29 起快层并发 4：1.9s → ~1.0s；live 层仍串行）
   npm run test:file -- scripts/arcblog-media.test.mjs   # 定向单文件（写实例，受 .gate-lock 保护）
   ```
   **不再跑全量 `npm run test:live`**：实测约 21 分钟且写共享实例（2026-09-27 Round 7：212 pass /
   0 fail / 1236s / 清 60 条残留）。命令仍留在仓库里，**仅当你（人类）明确要求时**按需跑一次。
   改动涉及 CLI / AFS 记录 / 链适配器 / daemon 路由时，**只定向单跑受影响的那一个文件**——覆盖率不掉，
   时间从 21 分钟降到 1–2 分钟。
   `docs/team/.gate-lock` 保护一切**写实例**的动作（定向单文件 + `arc` / AFS）；快层不需要锁，也不该因为
   它慢而被跳过。新写的测试文件**默认算 live**（单跑），除非显式加进 `scripts/run-tests.mjs` 的 `FAST_TESTS`。

3. **实例与门是活的**。开始前先跑一次，确认不是环境坏了：
   ```bash
   arc service status                      # daemon 在跑吗（dev 实例 arcblog.localhost:4939）
   arc dsl validate --json                 # 主质量门：issues 必须为空
   git log --oneline -1 && git status --short
   ```

4. **残留先看清**。live 测试会往实例写记录，且只在**通过后**自动清理：
   ```bash
   node scripts/arcblog-clean.mjs          # 干跑：报告残留数量与分布
   node scripts/arcblog-clean.mjs --confirm   # 确认后再删（测试红时保留现场，别急着清）
   ```

5. **并发额度与分配先定**（详见下方「并发配额与任务分配」）：**开发类 agent ≤10**，PM/QA/Lead 各 1；
   每个 agent 一个**不相交写范围**，共享文件（`locales`/`dist`/生成器/`baseline`/`spec`/`checklist`/`backlog`）
   只有唯一写者（默认 Lead）。超过 10 条就排队。
   同时确认**跨会话风险**：另一个会话可能在同一工作区"还原非本轮改动"，因此本波的产物
   **落地即留 `/tmp` 副本 + 尽快提交**（BUG-079：2026-09-29 有 4 个页面被回滚抹掉、且 dist 副本同时失效）。

---

## 启动词（整段发给 Lead）

```text
你是 ArcBlog 项目的 Lead（虚拟公司的 CEO）。按 docs/team/README.md 的工作手册，拉起一支 4 角色
Agent Team 并持续按轮次推进开发。先读：CLAUDE.md、docs/team/README.md、docs/team/backlog.md、
docs/ArcBlog-feature-checklist.md、docs/team/bootstrap.md 的「高频踩坑」。

请依次执行：

1. 建一个长时目标（create_goal）：按 docs/team/README.md §3 的轮次循环持续推进 ArcBlog 的 🟡/⬜
   功能，直到 backlog 没有可交付项、或我明确叫停。max_goal_rounds = 3。
2. 建共享任务板：从 docs/team/backlog.md 的「本轮」取条目逐项 team_task_create —— 每条带
   write_scopes；QA 的任务必须 blocked_by 对应的 Dev 任务；写范围重叠的条目不得并行。
3. 拉起 4 名 teammate（名字固定 pm / dev / qa / ui），提示词用 bootstrap.md 的「teammate 提示词模板」，
   逐项写清：工作目录、必读顺序、自己的写入范围与禁止事项、质量门命令、完成汇报格式。
4. 跑一个 Round（以 backlog 当前「本轮」为准）：
   ① PM 规划（REQ + 验收标准）→ ② Lead/PM 派活 → ③ Dev/UI 并行实现 → ④ QA 独立验证 →
   ⑤ PM 裁决反馈 → ⑥ Lead 收口门 + 提交。
5. 质量门（一层，别自找麻烦）：
   - 每个增量自测：`arc dsl validate --json`（issues 为空）+ `npm test`（快层，~1s，不写实例）；改了
     .aup 再加 `arc blocklet build`。
   - **不跑全量 `npm run test:live`**（用户裁定 2026-09-27：不再作为门）。改动涉及 CLI / AFS 记录 /
     链适配器 / daemon 路由时，只定向单跑受影响的文件：`npm run test:file -- scripts/<file>.test.mjs`
     ——写实例，所以先在 `docs/team/.gate-lock` 写一行 owner + 开始时间，跑完删锁。
   - 提交只加本轮的产物路径，**绝不 `git add -A`**；提交信息写清「产物 + 验证命令 + 结果」。
6. 每轮结束向我汇报：本轮交付、QA 结论（放行/不放行）、清单 ✅/🟡/⬜ 变化、commit、下轮计划、
   未决问题与需要我点头的事。

纪律：每个角色同一时刻 ≤1 个 in_progress 任务；写范围重叠的不得并行；黑名单命令
（git commit/push/reset、改 spec、删 node.key/.env.local）一律禁止；结论必须落到 docs/team/ 下的
文件，消息只做「叫醒 + 摘要」；需要加人、改架构、动真实链或资金时停下来问我。
```

---

## teammate 提示词模板（Lead 按角色填空后发给 spawn_teammate）

```text
你是 ArcBlog 虚拟团队的 <角色>（见 docs/team/roles/<角色>.md）。你是本波 <N> 个并行开发 agent 之一，
只负责任务板上这一条任务；**你的写范围与其他人不相交，这是并行的前提**。

工作目录：/Users/shenxiuqiang/workspace/ArcBlog（bash 一律传 workdir，文件一律用绝对路径）。
必读顺序：AGENTS.md → CLAUDE.md → docs/team/README.md → 你的角色卡 → 你的任务（任务板 id / REQ）。
开工前先 `git status --short`：**不是自己 scope 的 M 文件一律不碰、不回滚、不 add**（可能有另一个会话在改）。

你的写入范围：<照抄任务板的 write_scopes>。超出范围不要写，给 PM/Lead 发消息说明「要改什么、为什么」。
禁止：git commit / git push / git reset --hard（**唯一例外**：Lead 在回滚风险下逐一授权作者提交自己那一个文件）；
改 docs/ArcBlog-product-technical-spec.md；删 node.key / .env.local；碰别人的写范围；
**跑 npm run build**（dist/ 是 Lead 的收口动作）；**跑 arc dsl generate --write**；**碰 .aup/locales/**。

质量门（每个增量，交回之前）：
  arc dsl validate --json      # issues 必须为空（波次期间因他人在途的 stale locale 除外，须在回报里指明归属）
  arc dsl format <你的文件> --write   # 永不 arc dsl lint --fix（会删运行期寻址的 id）
  定向断言：node --test scripts/<相关>.test.mjs   # 只跑自己那一个文件
  node scripts/arcblog-ui-budget.mjs --json       # 页面类任务：本页七项 + over + 棘轮
  npm test                     # 快层 ~1s（改 .aup 后由 Lead 统一 npm run build）
不要跑 npm run test:live（用户裁定 2026-09-27：全量 live 层不再作为门，实测 ~21 分钟且写共享实例）。
需要覆盖写实例的路径时只定向单跑那一个文件，并先在 docs/team/.gate-lock 写一行（跑完删锁）。

i18n 纪律：可以改本页 `i18n {}` 块，但**必须在回报里列全删掉/新增的键名**；locales 由 Lead 收口时
统一 `generate --write` + 逐键 prune，你不要碰。

研究纪律：不要臆造 ARC API（spec §150），先 arc <cmd> --help / explain / 读 docs/arc-contracts.md；
平台不支持的能力写进 arc-contracts.md 并给降级路径。任何新增的 AFS 路径若被脚本/测试使用，
必须用环境变量可覆盖（否则测试会覆盖生产记录）。

交付：产物文件路径 + 你实际跑过的验证命令与输出 + 未决问题 + **仓库外副本**
（`cp <文件> /tmp/<task>-<name>` + sha256 —— 未提交的改动会被别人的轮次收口清掉，BUG-079 实测）。
完成后给 PM 和 Lead 各发一条「产物路径 + 验证命令 + 实际结果 + 副本路径」，并把任务板上的任务置 completed。
```

---

## 高频踩坑（已实测，别再重新发现）

1. **测试隔离**：任何被测试/脚本使用的新 AFS 路径都要能由环境变量覆盖（本仓库已有 `ARCBLOG_*_PATH` 一族）。历史事故：测试直接写生产 `config/nft-factories.json` 与 `config/roles.json`，把真记录清空/写冲突。
2. **guest 浏览器点不动 admin-only 写**：`config/**`、`node/**` 的写需要 admin 角色，调试 Chrome 里是 guest —— 点击会被拒（fail-closed）。这类"点击执行"只能用 CLI 模拟同形写入来验证，或问用户要属主会话，**不要声称已在浏览器端到端验证**。
3. **跨页导航要绝对 URL**：`-> page X` / `set {page}` 只改查询串、保留当前 path；在绑定路由（`/posts/<slug>`、`/store`）上会产生错误 URL。跨应用页一律 `href: "/?page=…"`（`arc-contracts.md` §27.6）。
4. **`-> set` 的 args 不解析 `${entry.content.*}`**（`exec` 的会）→ 页内数据更新用「行内 `exec` 写 AFS + `propBind` 面板重渲染」（§27.5）。
5. **`arc service restart` 不重新配置**（只按记录重启）。改了 manifest（如 `mounts`）要 `arc service stop` + `start`。
6. **永不 `arc dsl lint --fix` 全量**：它会删掉只有运行时寻址的 id（`scripts/arcblog-runtime-ids.test.mjs` 守着这条，§25.4）。
7. **改 `.aup` 后必须 `npm run build`**（= `arc blocklet build` + `npm run scrub:dist-secrets`，**由 Lead 收口时统一跑**）——**不要跑裸 `arc blocklet build`**：它会把仓库根的 `node.key`/`.env.local` 复制进 `dist/` 并写进 `dist/.afs/manifest.json`（BUG-067，平台无排除开关）。开发 agent 自己不要 build，否则多种子并行时会互相覆盖 `dist/`。
8. **未提交的改动会被"别人的轮次收口"清掉**（BUG-079，2026-09-29 实测）：`.aup/pages/**` 被 `git checkout` 回 HEAD 三次，`dist/` 与 Pages 部署产物里的副本也同时被覆盖 ⇒ 救援只能靠**仓库外副本**。对策：产物落地即留 `/tmp` 副本 + 立即回报，Lead 尽快提交；不要长时间"只写不提交"。
9. **`arc dsl format` 会改结构，不只会排版**（arc-contracts §45，arc#2764）：`h2 "文本" level=2` 触发 `content_dropped`（改用 `level="2"`），裸 `afs-dropzone` + 紧随兄弟会被合并成**臆造的 `content=` prop**（把 dropzone 独占一层并放末尾）。format 后要 `arc dsl lint --json` 复核 `content_dropped`。
10. **`generate --write` 不是"只合并"**（2026-09-29 实测）：它会重写页面前缀键集；但它只对**当时**的工作区状态生效 ⇒ 收口顺序必须是「所有页面提交 → generate → 再核死键」，在波次中途 generate 会留下新的死键（media 的 41 个就是这么来的）。

---

## 浏览器验证配方（UI / 页面类任务）

```bash
# 共享调试 Chrome（被 kill 过就重启；端口 9333）
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9333 --user-data-dir=/tmp/arcblog-chrome-test --no-first-run about:blank
```

- 用 `list_pages` 拿当前 pageId（**每次会话都可能变，别硬编码**），再 `navigate_page` + `evaluate_script` 量几何/取文本。
- **标签页纪律（必守）**：**整个 sweep 复用同一个标签页**（`Page.navigate` 换页），跑完关掉自己开的 target。
  2026-09-28 实测事故：18 页 × 多脚本的探针把调试 Chrome 攒到 **53 个 page target**，Chrome 濒临崩溃，
  人类看到的现象是「每点一个菜单就冒出一个新窗口」——**那不是链接问题**（控制台侧栏每一行都是
  `action "$t(wrapper.nav-*)" -> page <page>` 的页内切换，全仓 `.aup/pages` 里 `target=_blank` 只出现在
  侧栏页脚 RSS 与少数内容链接上），而是自动化脚本每页新开了 tab。收尾清理见「精简轮次」硬约束第 7 条。
- 截图必须**内联**（`filePath` 会被拒）；要留下来时写到仓库外的临时目录。
- 页面地址：`http://arcblog.localhost:4939/?page=<name>`（公共页：`/`、`/posts/<slug>`、`/store`）。
- 判绿标准：`SESSION INIT FAILED` 不出现；要量的元素有非零几何；关键文案/链接在 DOM 里可断言。
- guest 会话的权限边界见「高频踩坑」第 2 条。

---

## 精简轮次（默认节奏，2026-09-27 起；2026-09-29 起改为波次 + 开发 ≤10 并发）

用户要求「缩短任务时间」，所以一轮的**默认形态**是**波次（wave）**而不是单条 REQ：

| 相位 | 谁 | 每人上限 | 产物 |
| --- | --- | --- | --- |
| ① 规划 | PM 1 个 | 1 | backlog「本轮」表 + 每条一个 REQ（含可执行验收标准）+ `journal/round-N.md` 计划节 |
| ② 实现 | **开发类 agent ≤10 个并行**（详见下节「并发配额与任务分配」） | 每 agent 一个不相交写范围 | 源码（`dist/` 由 Lead 收口时统一 build） |
| ③ 收口 | **Lead 1 个（唯一写者）** | 1 | `generate --write` + locales prune + baseline 重录 + `npm run build` + 提交 |
| ④ 验证（批次末） | QA 1 个 | 1 | `test-reports/<batch>.md`（+ 有缺陷才写 BUG） |

**QA 分批（用户裁定 2026-09-29）**：逐轮 QA 暂停；实现轮只跑 **Lead 门（validate + 快层 + build）**，独立 QA 在**批次结束时一次做完**（或用户点名）。

### npm test 的节奏与耗时（2026-09-29 实测，`scripts/run-tests.mjs`）

**结论：不需要每次改动都跑全量快层。** 按用途分四档，全量只跑一次/轮：

| 场景 | 命令 | 频率 |
| --- | --- | --- |
| 增量自检（开发 agent 自己） | `node --test scripts/<相关>.test.mjs`（单文件）或 `npm test -- --changed`（按 diff 选套件） | 每次改动后 |
| 页面类任务自检 | `node scripts/arcblog-ui-budget.mjs --json`（本页七项 + over + 棘轮） | 每次改动后 |
| **轮次/波次收口（Lead）** | **`npm test`** —— 全量快层，10 文件，~1 s | **每轮一次** |
| 改动涉及 CLI / AFS 记录 / 链适配器 | `npm run test:file -- scripts/<x>.test.mjs`（先写 `docs/team/.gate-lock`） | 定向，不跑全量 |
| 全量 live 层 | **不做**（用户裁定 2026-09-27：~21 min 且写共享实例） | 仅人类点名 |

runner 自带三件事（别再自己写计时/超时脚本）：

1. **逐文件耗时表**（最慢在前）+ 总计；并单独汇总**三个 spawn `arc` 的套件**（`i18n` / `console-nav` / `dist-secrets`）——它们是全场瓶颈（实测占 CPU 时间 ~2.4 s / 墙钟 ~1 s，见下）。
2. **超时与总预算**：默认 **25 s/文件 + 30 s 总预算**（fast 层）；超时即 `SIGKILL` 该子进程并打印 `TIMEOUT`，总预算耗尽则**不再启动后续文件**并列出未跑的清单；两种情况都**退出码 1**（挂死绝不伪装成"慢"）。可用 `ARCBLOG_TEST_TIMEOUT_MS` / `ARCBLOG_TEST_BUDGET_MS` / `ARCBLOG_TEST_CONCURRENCY` 覆盖（live 层默认 10 min/文件、无总预算、并发 1）。
3. **`--changed`**：只跑"守卫文件命中当前 `git status`/diff"的套件（守卫表在同文件的 `GUARDS`）。**没有守卫条目的套件永远会被选中**——沉默不允许假装有覆盖。
4. **`--json`**（机器可读，人读信息走 stderr）：`node scripts/run-tests.mjs fast --json` → `{tier, elapsedMs, budgetHit, files:[{name,ms,code,pass,fail,timedOut}], skipped, failed, timedOut}`。别用 `npm test -- --json` 喂脚本（npm 会在 stdout 前插自己的 banner）。

实测基线（2026-09-29，10 个快层文件）：串行 1.9 s → 并发 4 **~1.0 s**；最慢 `arcblog-i18n` ~1.0–1.3 s（它 spawn 两次 `arc dsl`），其次 `dist-secrets`（0.6–0.7 s，扫 `dist/` + 3 次脚本 spawn）、`permissions`（0.5 s，HTTP 只读）。

---

## 并发配额与任务分配（开发 ≤10）

**额度**：开发类 agent（Dev / UI / 调研）**最多 10 个并行**。PM、QA、Lead 各 1，不占这 10 个额度。10 是**上限不是目标**：实测（2026-09-29，7 路页面波次）瓶颈会从"没人干活"变成 `.aup/locales/**`、`dist/`、生成器这些**共享文件**，6–8 路通常是收益拐点。只读任务（调研/审计）不占写额度，但总数建议 ≤12。

### 分配规则（按任务切，不按人多）

1. **一个 agent 一个不相交写范围**。任务上必须写 `write_scopes`；两个任务的 scope 相交 ⇒ **合并给同一个 agent 或串行**，不允许"两个人都改同一个文件再祈祷"。
2. **共享文件只能有唯一写者**（默认 = Lead，或 Lead 指定的收口者）：
   `.aup/locales/**` · `dist/**`（build） · `scripts/console-nav.mjs` + `scripts/arcblog-console-nav.mjs`（生成器） · `scripts/ui-budget-baseline.json` · `blocklet.yaml` · `docs/ArcBlog-product-technical-spec.md` · `docs/ArcBlog-feature-checklist.md` · `docs/team/backlog.md` · `journal/**`。
3. **一个页面任务 = 一个 agent**：`.aup/pages/<dir>/<page>.aup` +（如需）`.aup/man/<page>*.yaml`。页面之间天然不相交，是本仓库最适合并行的单位。
4. **优先级用数据排，不靠感觉**：`node scripts/arcblog-ui-budget.mjs --json` → 按 `over` 个数 × 指标严重度排序，先做超限最多的页（2026-09-29 首波：`hub` 5 项、`diagnostics` 4 项、`media` 4 项）。
5. **超过 10 条就排队**：任务板 `pending`，完成一个补一个（滚动补位）；不要为了"都开起来"而让两个 agent 共用一个文件。
6. **可并行的三类任务**：① 页面重构（互不相交）② 独立脚本/CLI（写范围 = 自己的 `.mjs` + 自己的测试）③ 只读调研/探针（写范围 = 一个文档或 `/tmp` 隔离副本）。**不可并行**的：任何 `npm run build`、任何 `generate --write`、任何改生成器/菜单/locales 的任务。

### 参考配额（12 页波次示例）

| 路 | 任务 | 独占写范围 |
| --- | --- | --- |
| 1–8 | 8 个高预算页面 | 各一个 `.aup/pages/**/<page>.aup`（+ 其 man） |
| 9 | 一组 CLI/脚本缺陷 | 这些 `scripts/*.mjs` + 各自测试 |
| 10 | 只读探针/调研 | `/tmp/<lab>/**` + 一个 `docs/arc-contracts.md` 小节 |
| — | 生成器 / 菜单 / locales / build / baseline | **Lead 串行收口**（不占开发额度） |

### 每个开发 agent 的硬性纪律（2026-09-29 事故后新增）

1. **产物落地即留仓库外副本**（`/tmp/<task>-<page>.aup`）+ 回报 sha256；本波靠这个救回了 hub 与 diagnostics（BUG-079）。
2. **提交保护**：未提交的改动会被"别人的轮次收口"当成杂质清掉（BUG-079 实测：`.aup/pages/**` 被 `checkout` 回 HEAD 三次，`dist/` 副本也同时被覆盖）。所以：**Lead 在每个产物落地后立刻提交**；并发窗口大时，Lead 可**一次性授权作者提交自己那一个文件**（仅该文件、仅本轮）。
3. **不跑 `npm run build`**（`dist/` 单一写者 = Lead 收口）；**不跑 `arc dsl generate --write`**；**不碰 `.aup/locales/**`**。
4. **i18n 键**：可以删/改本页 `i18n {}` 块（预算要求），但**必须在回报里列出删掉/新增的键清单**；locales 由 Lead 收口时统一 `generate --write` + 逐键 prune。
5. **格式**：`arc dsl format <你的文件> --write`；**永不 `arc dsl lint --fix`**（会删运行期寻址的 id，见「高频踩坑」6）。
6. **自检门**：`arc dsl validate --json`（issues 空）+ 本页/本文件的定向断言 + 快层中**与你相关**的用例；波次期间因他人在途导致的红可以存在，但要在回报里**指明归属**。
7. **开工前 `git status --short` 并记下在途文件**：不是自己 scope 的 `M` 文件**一律不碰、不回滚、不 add**。
8. **目视类验收不在实现轮做**：按 QA 分批裁定，留给批次末的 QA（需要 admin 会话/部署时更只能那时做）。

### 硬约束

1. **相位之间串行**：实现相位全部结束（且产物已提交）后，才轮到收口相位；QA 批次末做。
2. **不做全量 live 层**：验证只跑快层 + 定向单文件（≤2 个）+ 必要的浏览器断言。
3. **一个 agent 一个交付物**；贪多必然拖长相位。
4. **浏览器断言只在验收标准真的需要 DOM 时做**；能用源码 + grep + 生成产物断言的，不启动浏览器。
5. 收口 = Lead 跑一次 `arc dsl validate` + 快层 + **`npm run build`**（改了 `.aup` 时）+ 按 write_scopes 精确提交。**没有 13/21 分钟的收尾门。**
6. **跨会话共存纪律**：同一工作区可能有另一个会话在跑（本波实测对方会"还原非本轮改动"）。因此：产物落地即提交、共享文件唯一写者、`docs/team/.gate-lock` 用于写实例测试；每波开始时先 `git log --oneline -3` + `git status --short` 看清别人在做什么。
7. **浏览器标签页纪律（2026-09-28 实测事故）**：多轮/多 agent 的 CDP 探针会攒标签页，Chrome 会被拖到崩溃。
   - **一次 sweep 复用同一个标签页**（用 `Page.navigate` 换页），**禁止每页新开一个 tab**；
   - 探针跑完必须关闭自己开的 target（`Target.closeTarget`），或直接跑下面的清理命令；
   - 每轮结束（以及 Lead 收口时）跑一次清理，只留 1 个页面：

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

## workflow 模式变体（把 4 个角色换成 workflow 子 agent）

用户要求「用 workflow 模式跑 bootstrap」时，**不 spawn_teammate**，改用一个 workflow 脚本把上面 4 个相位串起来（脚本里的 `agent()` 就是四个角色）：

```text
phase ①  PM     → backlog/REQ/journal 计划（写 docs/team/**）
phase ②  开发并行 ≤10 个 agent（parallel / pipeline；每个任务一个不相交写范围：
                  页面类 = 各一个 .aup/pages/**；脚本类 = 各自的 scripts/*.mjs + 测试；只读探针 = /tmp + 一个文档小节；
                  共享文件（locales/dist/生成器/baseline/spec/checklist/backlog）一律不交给开发子 agent）
phase ③  收口    Lead（唯一写者）→ generate --write + locale prune + baseline 重录 + npm run build + 精确提交
phase ④  QA     → 批次末一次：快层 + 定向单文件（.gate-lock）+ 浏览器尽力验证；报告 + BUG
条件   若 QA 判不放行且有阻断缺陷：Dev 修复 → QA 反向复验（仍是 1 个 agent 一次）
return Lead 收口所需的事实（verdict / 剩余阻断 / 产物路径）
```

与 teammate 模式的差异（写进提示词，别指望子 agent 知道）：

- 子 agent **没有** `team_task_*` 工具：任务板由 Lead 建好并在提示词里告知 task id 与 `write_scopes`，子 agent 只按 schema 回报。
- 子 agent **没有持久记忆**：每个提示词必须自带工作目录、必读顺序、写入范围、禁止事项、质量门命令、报告格式。
- 子 agent 返回 `null` = 该相位失败。R8 实测：QA 相位在**返回结构化结果时**失败，但它的报告与 BUG 文件
  已全部落盘。恢复口径：Lead 先核验落盘产物是否完整、能否读出机读结论（如报告末行
  `VERDICT=pass, BLOCKING=0`）——完整则以**落盘产物为准**补跑后续相位（R8 就是只补跑了 PM 裁决），
  并在轮次结论里如实记录该过程事实；残缺则重跑该相位。**任何情况下都不许把 null 当成通过。**
- 轮末仍由 **Lead** 跑快层、更新 checklist、按 write_scopes 精确提交。

---

## 变体

**只跑一轮，不要自动续轮**：把第 1 步的长时目标去掉，改成"先只跑本轮，跑完停下等我确认"。

**纯 UI / 文档轮（不碰 CLI、AFS、链）**：收口门 = 快层 + 浏览器/静态复核；在轮次结论里**显式**写明「本轮未跑 live 层」（按新裁定，非纯文档轮也一样不跑全量 live）。

**加一个角色**（例如「安全审计」）：复用 `docs/team/roles/qa.md` 的骨架新建角色卡 + 写入范围，再 `spawn_teammate` 一个新名字，并在任务板上给它建任务。**不要**让两个角色共用同一个写范围。

**换一轮做什么**：只改 `docs/team/backlog.md` 的「本轮」表，然后对 Lead 说"读 backlog 的当前本轮，按 §3 开跑"。Lead 不需要重新建团队——teammate 是持久的。

**暂停**：对 Lead 说"本轮收口后停机"。已完成的轮次会留在 `journal/` 和 git 历史里；下次用同一段启动词即可继续。
