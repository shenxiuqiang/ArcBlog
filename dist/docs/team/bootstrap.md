# 启动词（Bootstrap Prompt）

> 所有者：**Lead** ｜ 用法：在 **ArcBlog 目录**下开一个 dsh 会话（`cd ~/workspace/ArcBlog && dsh`），把「启动词」整段发给 Lead。
> 本文件只讲**怎么把团队拉起来、每轮怎么跑**；事实以 [`CLAUDE.md`](../../CLAUDE.md)（实现与命令）和 [`README.md`](README.md)（工作手册）为准，两者冲突时以后者为准并回来改本文件。

---

## 启动前必须确认（四条，否则必翻车）

1. **确认写者是谁**。团队是 5 个写者（Lead + 4 员工），再加一个不受控的写者就会互相覆盖。
   ```bash
   ps aux | grep -iE "kimi-code|codex|claude|cursor|zed|dsh" | grep -v grep
   git status --short
   ```
   **注意**：Lead 自己就是写者，工作区在轮次中间**本来就应该是脏的**——脏不是停手信号。
   要停手的是**不认识**的增量（你没写过的路径/文件）。判定方法：`git status --short` 里的路径逐个对得上本轮的 `write_scopes` 吗？对不上就问用户，**不要 `git add -A`**。
   （历史教训：曾发现「另一个工具」在写 `.aup/wrapper.aup` + `docs/arc-contracts.md` + `dist/`——事后确认那是 Lead 自己的并行会话。先认领再指控。）

2. **质量门是两层，别为一个 1 秒的门上锁**（2026-09-27 起，见 [`CLAUDE.md`](../../CLAUDE.md)「Quality gates」）：
   ```bash
   npm test            # 快层：6 文件 / 28 测试 / ~1.2s，**不写实例** → 每步都跑
   npm run test:live   # live 层：22 文件 / 串行 / ~13 分钟，**写同一个实例** → 每轮收口跑一次
   npm run test:all    # 两层都跑
   npm run test:file -- scripts/arcblog-media.test.mjs    # 单文件（Dev 自测就用它）
   ```
   `docs/team/.gate-lock` **只保护 live 层**（以及任何 `arc` / AFS 操作）；快层不需要锁，也不该因为它慢而被跳过。
   新写的测试文件**默认算 live**，除非显式加进 `scripts/run-tests.mjs` 的 `FAST_TESTS`。

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
5. 质量门（两层，别混）：
   - 每个增量自测：`arc dsl validate --json` + `npm test`（快层，~1s，不写实例）；改了 .aup 再加
     `arc blocklet build`。
   - 每轮收口：先在 docs/team/.gate-lock 写一行 owner + 开始时间，再跑 `npm run test:live`
     （~13 分钟，串行，新测试文件默认算 live）；绿了删锁，红了先**单跑失败的那个文件**——
     单跑绿 = 并发假失败（确认锁是否被绕过），单跑红 = 真 bug 交回 Dev。锁期间其他成员不得调用
     arc / AFS / 任何测试。
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
你是 ArcBlog 虚拟团队的 <角色>（见 docs/team/roles/<角色>.md）。

工作目录：/Users/shenxiuqiang/workspace/ArcBlog（bash 一律传 workdir，文件一律用绝对路径）。
必读顺序：AGENTS.md → CLAUDE.md → docs/team/README.md → 你的角色卡 → 本轮 REQ（PM 交付）。

你的写入范围：<照抄角色卡的「写入范围」>。超出范围不要写，给 PM 发消息说明「要改什么、为什么」。
禁止：git commit / git push / git reset --hard；改 docs/ArcBlog-product-technical-spec.md；
删除 node.key / .env.local / .gitignore 里已忽略的密钥文件；碰别人的写范围。

质量门（每个增量，交回之前）：
  arc dsl validate --json      # issues 必须为空
  npm test                     # 快层，~1s，不写实例（改了 .aup 再加 arc blocklet build）
  npm run test:file -- scripts/<相关的>.test.mjs   # 自测只跑单文件
不要跑 npm run test:live —— 那是每轮收口的门，由 Lead/QA 在 docs/team/.gate-lock 下跑。

研究纪律：不要臆造 ARC API（spec §150），先 arc <cmd> --help / explain / 读 docs/arc-contracts.md；
平台不支持的能力写进 arc-contracts.md 并给降级路径。任何新增的 AFS 路径若被脚本/测试使用，
必须用环境变量可覆盖（否则测试会覆盖生产记录）。

交付：产物文件路径 + 你实际跑过的验证命令与输出 + 未决问题。完成后给 PM 和 Lead 各发一条
「产物路径 + 验证命令 + 实际结果」，并把任务板上自己的任务置 completed。
```

---

## 高频踩坑（已实测，别再重新发现）

1. **测试隔离**：任何被测试/脚本使用的新 AFS 路径都要能由环境变量覆盖（本仓库已有 `ARCBLOG_*_PATH` 一族）。历史事故：测试直接写生产 `config/nft-factories.json` 与 `config/roles.json`，把真记录清空/写冲突。
2. **guest 浏览器点不动 admin-only 写**：`config/**`、`node/**` 的写需要 admin 角色，调试 Chrome 里是 guest —— 点击会被拒（fail-closed）。这类"点击执行"只能用 CLI 模拟同形写入来验证，或问用户要属主会话，**不要声称已在浏览器端到端验证**。
3. **跨页导航要绝对 URL**：`-> page X` / `set {page}` 只改查询串、保留当前 path；在绑定路由（`/posts/<slug>`、`/store`）上会产生错误 URL。跨应用页一律 `href: "/?page=…"`（`arc-contracts.md` §27.6）。
4. **`-> set` 的 args 不解析 `${entry.content.*}`**（`exec` 的会）→ 页内数据更新用「行内 `exec` 写 AFS + `propBind` 面板重渲染」（§27.5）。
5. **`arc service restart` 不重新配置**（只按记录重启）。改了 manifest（如 `mounts`）要 `arc service stop` + `start`。
6. **永不 `arc dsl lint --fix` 全量**：它会删掉只有运行时寻址的 id（`scripts/arcblog-runtime-ids.test.mjs` 守着这条，§25.4）。
7. **改 `.aup` 后必须 `arc blocklet build`**，否则 `dist/` 与源码漂移，提交里带出去的是旧产物（快层会报 drift）。

---

## 浏览器验证配方（UI / 页面类任务）

```bash
# 共享调试 Chrome（被 kill 过就重启；端口 9333）
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9333 --user-data-dir=/tmp/arcblog-chrome-test --no-first-run about:blank
```

- 用 `list_pages` 拿当前 pageId（**每次会话都可能变，别硬编码**），再 `navigate_page` + `evaluate_script` 量几何/取文本。
- 截图必须**内联**（`filePath` 会被拒）；要留下来时写到仓库外的临时目录。
- 页面地址：`http://arcblog.localhost:4939/?page=<name>`（公共页：`/`、`/posts/<slug>`、`/store`）。
- 判绿标准：`SESSION INIT FAILED` 不出现；要量的元素有非零几何；关键文案/链接在 DOM 里可断言。
- guest 会话的权限边界见「高频踩坑」第 2 条。

---

## 变体

**只跑一轮，不要自动续轮**：把第 1 步的长时目标去掉，改成"先只跑本轮，跑完停下等我确认"。

**纯 UI / 文档轮（不碰 CLI、AFS、链）**：收口门可以只跑快层 + 浏览器验证，但要**显式**在轮次结论里写明"本轮未跑 live 层"，别默认大家知道。

**加一个角色**（例如「安全审计」）：复用 `docs/team/roles/qa.md` 的骨架新建角色卡 + 写入范围，再 `spawn_teammate` 一个新名字，并在任务板上给它建任务。**不要**让两个角色共用同一个写范围。

**换一轮做什么**：只改 `docs/team/backlog.md` 的「本轮」表，然后对 Lead 说"读 backlog 的当前本轮，按 §3 开跑"。Lead 不需要重新建团队——teammate 是持久的。

**暂停**：对 Lead 说"本轮收口后停机"。已完成的轮次会留在 `journal/` 和 git 历史里；下次用同一段启动词即可继续。
