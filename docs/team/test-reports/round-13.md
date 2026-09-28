# round-13 测试报告（REQ-015 `compose-edit` 视觉债 + Hub 注册界面；REQ-016 V3 路径 A-ii 实施 + BUG-028 行号刷新 + 标准同步）

> **角色**：QA（独立验证者）｜**轮次** Round 13（2026-09-28）｜**任务** QA-008（`task-42`，`blocked_by task-40 + task-41`）
> **写范围**：本文件 + `docs/team/bugs/BUG-029-*.md` + `docs/team/.gate-lock`（临时，已删）。**未改任何源码 / 测试 / `.aup` / `.web` / `.web/themes` / `dist` / spec / 标准 / UI-009 / 需求。**
> **被测快照**：HEAD `494725e` + 本轮工作区（`git status --short` 17 modified + 7 untracked 顶层项）。源码写盘时间 `.aup/pages/admin/compose-edit.aup` 11:18:35 ｜ `.aup/pages/ops/hub.aup` 11:21:44 ｜ `.web/components/theme-bridge/script.js` 11:30:56 ｜ `dist/**` **11:36:13** → 全部源改动都早于最后一次构建。
> **方法**：**不采信 Dev / UI 自述**。所有结论来自 QA 本轮自己执行的命令、CDP 实测、AFS 复核与源码/文档 diff。**未跑全量 `npm run test:live`**（本轮明令禁止）；定向 live 只在 `.gate-lock` 下串行单跑一次。
> **结论（一句话）**：**放行（pass, BLOCKING=0）**。REQ-015 A1–A16 与 REQ-016 A1–A15 逐条有明确结论（通过 / 通过-附口径更正 / 受限未验证逐条列明）；V3 A-ii 的三条 CSS 经 **DOM 实测**在 **10 个 palette/mode 组合（静息 + 强制 hover）上 20/20 全部 ≥4.5:1**；`compose-edit` 三条视觉债实测收口（15px / 17px / 8px）且命中区 **138.7×29 ≥24×24**（**态①：`padding` 被转发**）；Hub 注册界面的 **Approve / Terminate 真实点击 + AFS 复核**成立（非 toast），探针逐条 purge 后实例回到 4 条 baseline；19/19 控制台页无回归。唯一新增缺陷是 [BUG-029](../bugs/BUG-029-hub-help-omits-refresh-subcommand.md)（**P3，范围外**：`hub --help` 漏列真实存在的 `hub refresh`），**不阻断**。

---

## 0. 验证方式与边界

| 类别 | 本轮动作 |
| ---- | -------- |
| **门（QA 自跑）** | `arc dsl validate --json`、`npm test`、`node scripts/arcblog-console-nav.mjs --check`、`arc dsl generate --check`、`arc blocklet build`、`diff -r .aup dist/.aup`、`diff -r .web dist/.web`、硬编码颜色 grep、`npm run test:file -- scripts/arcblog-theme.test.mjs`（快层） |
| **定向 live（串行、持锁）** | `.gate-lock`（`owner=qa-round13`，`2026-09-28T03:43:52Z`）→ `npm run test:file -- scripts/arcblog-network.test.mjs`（**15/15 pass**，98.9 s）→ 删锁（`No such file or directory`） |
| **CLI / AFS 复核** | `arcblog-network.mjs hub {list,show,register,add,remove --purge}`、`arcblog-clean.mjs`（dry run）、`arcblog-query-posts.mjs`、`arc afs exec .actions/list`；**写动作一律以 AFS 记录复核，不看 toast**（`arc-contracts` §29.4） |
| **浏览器（CDP 9333，admin）** | 共享调试 Chrome，**复用已存在的 1 个 page target**（`Page.navigate` 换页）；**全程未 `Target.createTarget`**；guest 用 `Target.createBrowserContext` 隔离上下文，**只开 1 个 target，结束 `Target.closeTarget` + `Target.disposeBrowserContext`**。视口 1803×908。每次探针前后 `page target` 计数见各节 |
| **对比度复算** | QA 自写 `parseColor/lin/lum/ratio/over/effectiveBg`（rgba / `color(srgb …)` / 合成 12% 淡底逐层上溯），**不看 UI 的脚本结论**；另独立重跑 `docs/team/design/raw/UI-009-contrast.mjs` 作对照 |
| **转移陷阱处理** | 平台 `transitionDuration = 0.15s`：单点读数等 **900 ms**；多组合矩阵读数时**临时注入 `*{transition:none!important}`**（等价于等待，测完 `remove()`，已自证移除） |
| **语言状态** | 全 sweep admin 页 `document.documentElement.lang === "en"`；guest 隔离上下文被服务端 302 到 `&locale=zh`（该上下文已 dispose，不影响共享会话）；共享 tab 结束时停在 `?page=pages`（lang=en、`data-mode=light`、`[data-active=true]=1`、无 SESSION INIT FAILED） |

**受限未验证（不得当成通过）**

1. **全量 `npm run test:live` 未跑**（本轮任务书 + 用户 2026-09-27 裁定禁止）；只定向单跑 `arcblog-network.test.mjs`（15/15）。
2. **真实硬件 hover 未测**：用 `CSS.forcePseudoState(['hover'])`（与 UI-009 G3 同口径）；computed 值可信，但**不是真实鼠标事件**。
3. **真实 DID Wallet 登录回跳未验证**（本机无钱包）；只证明 guest gate 卡与 `return_to/cancel_to` 指向真实可渲染页。
4. **链上质押列表选择（§8.3）未实现、不在本轮范围**（operator-declared）；页面亦不作此声称（已抽查文案）。
5. **`minHeight` 被 `action` 清洗器丢弃**：QA **不能改 `.aup` 源码**（写范围），因此 **P2 探针无法由 QA 复跑**。可得的独立证据 = ① 渲染后 `styleAttr` 恰为 `border-radius: var(--radius-md, 8px); padding: 5px 12px;`（**无 `min-height`**，而 `padding`/`border-radius` 确实生效）；② QA 抓到的平台配方原文 `.aup-action[data-kind="back"],…{…padding:0px;min-height:0px;…}` **无 `!important`** → 若内联 `min-height` 被转发本应生效，故丢弃发生在 AUP 侧；③ 仓库既有实测登记 `docs/arc-contracts.md` §815/§825「`action` 的 style 只保留部分键：`border`/`borderRadius`/`padding`（+`color`/`background`）转发，`width`/`justifyContent`/`flexShrink` 丢弃」——**机制方向一致但 `minHeight` 未被逐字列出**。结论：**态① 的落实（用 `padding` 修到 ≥24×24）已独立验证**；「`minHeight` 不转发」本身 = **受限未验证（机制）**。
6. **dark 模式的真实性**：本轮**没有写 settings 记录**切 mode（写实例），而是用 CDP 强制 `html[data-palette]/[data-mode]` 属性读平台 CSS 派生的 token（**真 DOM 测量，优于纯计算**）；但「真实切换设置后重启页面」未做。附带**强证据**：强制属性 1 s 后被 bridge 的 MutationObserver 原样复原（`vivid/dark → natural/light`）→ 不变量③ 成立。
7. **`?page=preview` 的 destructive（默认档 14.4px）合成底未单独量**（需构造带 slug 的草稿，UI-009 G5 遗留）；规则与其余 8 处同源已在 `?page=posts` 实测。
8. **A-ii 覆写的跨页覆盖度**：实测 `?page=posts`（39 个）、`?page={hub,pages,factory}`；未逐页穷举所有含 destructive 的页面。
9. **`hub refresh` 的存在性用 CLI 实测（exit 0）**，但其对**既有记录的回写副作用**未逐条量（本轮只观察到 `freshness.checkedAt` 被刷新，见 §4 登记 O5）。

---

## 1. 逐条验收结论表

### 1.1 REQ-015 §3 A1（门）

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| **A1a** | `arc dsl validate --json` → `issues: []` | **通过** | exit 0，`"issues": []`（§2.1） |
| **A1b** | `npm test` → **28/28** | **通过** | `tests 28 / pass 28 / fail 0`，954.3 ms（QA 复跑两次，§2.1） |
| **A1c** | `arc blocklet build` | **通过（附 1 条既有 pre-render 警告）** | exit 0，`Published 455 file(s)`；警告 `/p/en/search/`、`/p/zh/search/` 无预渲染产物（**既有**，非本轮引入，见 O4） |
| **A1d** | `console-nav --check` → pages 19 | **通过** | `{"ok":true,"action":"check","pages":19}` |
| **A1e** | `arc dsl generate --check` 无漂移 | **通过** | `Would generate 0 file(s) (dry-run) — nothing to change` |
| **A1f** | `diff -r .aup dist/.aup` / `diff -r .web dist/.web` 无输出 | **通过** | 两条 `diff` exit 0、无输出（build 前后各一次） |
| **A1g** | 构建幂等（旁证） | **通过** | `dist/.afs/manifest.json` md5 在 QA 的 build 前后均为 `34ba747409dfd2bd80bdf75d2e338355`；`dist/**` mtime 保持 11:36:13 → **QA 动手前 dist 已与源码同步** |

### 1.2 REQ-015 §3 A2–A7（`compose-edit` 视觉债）

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| **A2** | gate 标题 15px（无 cookie） | **通过** | guest 隔离上下文 `?page=compose-edit` → 唯一可见 `h2` = gate 卡（zh：`用钱包发布`），`getComputedStyle(h2).fontSize === "15px"`（§2.2） |
| **A3** | not-found 标题 17px（admin、无 slug） | **通过** | admin、无 slug → 页面**只有 1 个 `h2`**（`Edit post`，`visible=true`），fontSize **17px**（§2.2） |
| **A4** | 圆角 8px、无 32px | **通过** | 页面上唯一的 `.aup-action`：`borderRadius = "8px"`；全页 `border-radius` 无 `32px`（§2.2） |
| **A5** | R3 命中区探针三态 + 结论落实 | **通过（态①，附 1 条机制受限）** | 原值：`styleAttr = "border-radius: var(--radius-md, 8px); padding: 5px 12px;"`、computed `padding = 5px 12px`、`min-height = 0px`、`fontSize = 13px`、`rect = 138.7 × 29` → **态①：`padding` 被转发**，已按 `size=sm` 档 `padding: 5px 12px` 修到 **≥24×24** ✓。**`minHeight` 不转发的直接复跑 = 受限未验证**（QA 不能改 `.aup`，见 §0.5）；机制方向有 3 条独立旁证 |
| **A6** | 源码静态可核 | **通过** | `grep -n "fontSize" .aup/pages/admin/compose-edit.aup` → `:31`、`:39`；`grep -n "borderRadius"` → `:41`（同一条 `style` 含 `padding`）；`git diff` 恰 3 行改动（§2.3） |
| **A7** | 全仓 gate 标题口径不回退 | **通过** | `grep -rn "h2 :gate-title" .aup/pages --include=*.aup \| wc -l` = **20**，其中带 `fontSize` = **20**，无漏网（19 → 20） |

### 1.3 REQ-015 §3 A8–A14（Hub 注册界面）

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| **A8** | 申请流 = CLI 真命令且与 `hub --help` 逐字一致 | **通过** | 页面渲染文本含 `node scripts/arcblog-network.mjs hub register --hub-did <did> [--endpoint <url>] [--update]`；从 `hub --help` 抓取的 Usage 逐条比对：页面上 **5 条模板命令全部 IN-HELP**（其余 `CHECK` 行只是把 `<did>` 换成了具体 probe DID，唯一"缺失" token 就是那个 DID 值本身）。**附**：`hub refresh` 不在 help 中 → BUG-029 |
| **A9** | 关系 id 哈希如实、无伪造写入 | **通过（双向）** | ① 真值验证：3 条 probe 的 `id` 均 = `sha256(hubDid)` 前 16 位十六进制（`7da9bb4ec4213742` / `2e9d58ffcef578a5` / `9684ad885ac4e809` 逐条算出，§2.5）；② 页面 en/zh 均含「id/文件名 = SHA-256(Hub DID) 前 16 位、界面无哈希原语」；③ 静态反证：`.aup/pages/ops/hub.aup` 中 `${args.*}`/`${state.*}` 插值**只有 2 处 `${args.ePath}`**（entry 自带真实路径），**不存在** `${args.hubDid}`/`${state.*did}` 拼 `hub/registrations/…json` 的写路径（命中 0） |
| **A10** | 被收录列表可辨识 + 可退出 | **通过** | 用 AFS 探针造 `direction=hub`、`relation=indexed` 记录（`did:key:zQa13Hub…`）；页面该行渲染 `Relation/Direction/status/freshness.state` **原值**（DOM 文本实测 `direction | hub`）→ 方向可辨；该行 **Terminate** 真实点击成功落库（见 A11）；跑完 **purge 探针**，`hub list` 计数与 id 集合回到 baseline 4 条（§2.5） |
| **A11** | 写动作按 AFS 复核（不看 toast） | **通过** | real click（`Input.dispatchMouseEvent` + 平台 `.aup-overlay[role=dialog]` 的 primary 按钮）→ `hub show` 复核：**Approve** `applied → indexed`，`updatedAt 03:44:57.655Z → 03:46:24.832Z`，`sync` 块**逐字段未变**（无 BUG-016 型漂移）；**Terminate**（`direction=hub` 行）`indexed → removed`，`removedAt = 2026-09-28T03:46:30.164Z` 非空，**`direction` 保持 `hub`**；随后**另一行 Approve 仍成功**（`applied → indexed`，03:46:35.508Z）→ **互不阻塞** ✓。**toast 只作旁证**（"Approved — relation is indexed." / "Relation terminated (tombstone kept)."） |
| **A12** | 每行含 §112 同步字段 | **通过** | 页面 4 行 × 4 字段（`sync.status/lastSync/lastVersion/lastError`）与 `hub list` 记录**逐字段机器比对 4/4 MATCH**；`lastVersion: null` 渲染为 `—`（**不是** `""`/`0`/假版本号）（§2.6） |
| **A13** | guest 越权（负面用例） | **通过** | 无 cookie `?page=hub`：只有 gate 卡（1 个 `h2`、1 个登录 `.aup-action`），`afs-list = 0`、`inputs = 0`、`forms = 0`、`.aup-copy-btn = 0`、`[data-active=true] = 0`、无任何 hub 命令文本；无 cookie `POST /api/afs/rpc`：`hub/registrations` → **403** `role 'guest' is below readRole 'admin'`、`config/roles` → **403**、`config/agent-grants` → **403**；`write`/`delete` → **401** `Authentication required for write/delete`；对照 `posts`/`categories` → **200**（公开面未误伤） |
| **A14** | 无导航/页面数回归 | **通过** | `console-nav --check` → pages 19（与 `CONSOLE_SECTIONS.length = 19` 一致）；`npm test` 内死 locale key 门 + en/zh parity 门全绿（28/28）；`arc dsl generate --check` 无漂移 |

### 1.4 REQ-015 §3 A15–A16（范围自证 / 浏览器纪律）

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| **A15** | 范围自证（Dev 零越界） | **通过** | `git diff --name-only -- scripts world blocklet.yaml docs/ArcBlog-product-technical-spec.md` → **空**；`.aup` 仅 4 个文件（`compose-edit.aup`、`hub.aup`、`locales/{en,zh}.json`，全属 Dev）；`.web` 仅 `theme-bridge/script.js`（UI）；`docs/ArcBlog-admin-ui-design.md` / `UI-009` 仅 UI；`docs/ArcBlog-admin-ui-design.md` 未越出 §1.5 四项 + 版本行（见 REQ-016 A10/A11） |
| **A16** | 浏览器纪律 | **通过** | 每个探针的 `Target.getTargets` **page 计数 = 1 → 1**（admin 复用同一 tab，未 `createTarget`）；guest 探针短暂 1 → **2** → 关 target + dispose context → **1**；结束时共享 tab = `http://arcblog.localhost:4939/?page=pages`（`lang=en`、`data-mode=light`、`[data-active=true]=1`、无 `SESSION INIT FAILED`） |

### 1.5 REQ-016 §3 A1–A15（V3 A-ii + BUG-028 + 标准同步）

| # | 验收标准 | 结论 | 证据 |
| - | -------- | ---- | ---- |
| **A1** | 三条规则逐字落地 | **通过** | `grep -nF` 三条原文在 `.web/components/theme-bridge/script.js` 各命中 1 次（`:62`/`:63`/`:64`）；既有 4 条（footer 3 + `data-count` 1）逐字仍在（`:54–57`）；`git diff --stat -- .web` = **1 file, 7 insertions** |
| **A2** | bridge 不变量未被破坏 | **通过（静态 + 运行时）** | 源码仍含 `__arcblogThemeBridge`（3 处）、`arcblog:theme:v1`、`MutationObserver`（3 处）、`CHROME_STYLE_ID = 'arcblog-chrome-style'`（`:52`、`:70`、`:72`）；`injectChromeStyles()` 未改（diff 只加数组元素）。**运行时反证**：CDP 强制 `data-palette=vivid`/`data-mode=dark` 后 **1 s 内被 observer 复原**为 `natural/light` → 重放机制活着 |
| **A3** | theme 契约门保持绿 | **通过** | `npm test` 28/28；`npm run test:file -- scripts/arcblog-theme.test.mjs` → `tests 3 / pass 3 / fail 0`（52.4 ms）（§2.1） |
| **A4** | 静息态达标（DOM 实测） | **通过** | `?page=posts` 首个 `[data-variant="destructive"]`：`color = rgb(26, 26, 31)`、`borderTopColor = rgb(197, 48, 48)`（`1px`）、`backgroundColor = color(srgb 0.772549 0.188235 0.188235 / 0.12)`、合成底 `rgb(234.84, 216.08, 213.44)` → QA 自算 **12.65:1**（`?page=hub` 同值 12.65；`?page=pages` 13.84）。图标静息 = `rgb(197, 48, 48)`（**红仍在图标 + 描边**） |
| **A5** | hover 态达标（DOM 实测） | **通过** | 同节点 `CSS.forcePseudoState(['hover'])`（等 900 ms）→ `color = rgb(255, 255, 255)`、`backgroundColor = rgb(197, 48, 48)`（实心）、合成底 `rgb(197, 48, 48)` → **5.47:1**；图标 hover = `rgb(255, 255, 255)`（**非红**，`:not(:hover)` 规则生效）；`forcePseudoState([])` 后复原为 `rgb(26, 26, 31)` |
| **A6** | 10 个 palette/mode 组合复算 | **通过（并且强于自述：真 DOM 测量）** | UI 声称的 10 组是 aup-core.css 声明值的**计算值**；QA 用 CDP 逐组强制属性 + 抑制 transition 后读 **computed**：静息 **10/10 PASS**（最低 `warm/dark 6.32`）、hover **10/10 PASS**（最低 `neutral/dark 4.53`）。反证选型：`--color-bg` 在 `vivid/light` 上 `#f0f4ff on #dc2626 = 4.39` **FAIL**（QA 独立算），`--color-surface` 在同组合 4.83 PASS |
| **A7** | 令牌与 `.aup` 零改动 | **通过** | `git diff --name-only -- .web/themes` → **空**；`git status --short -- .web` 无新文件；`.web` diff 只含 `components/theme-bridge/script.js`；`.aup` 的 4 个 M 全部是 Dev 的 REQ-015 落点（UI 未碰 `.aup`） |
| **A8** | 构建镜像一致 | **通过** | `arc blocklet build` exit 0 → `diff -r .web dist/.web` 与 `diff -r .aup dist/.aup` 均 exit 0 无输出；`dist/.web/components/theme-bridge/script.js` 与源同步 |
| **A9** | BUG-028 行号刷新完成 | **通过** | `grep -rn "variant=destructive" .aup/pages --include=*.aup \| wc -l` = **9**；UI-009 `:133` 的「Round 13 刷新」行 = **9 处 / 7 文件**且逐条新行号（`pages.aup:169,196 · posts.aup:183,220 · heroes.aup:152 · tags.aup:178 · factory.aup:214 · hub.aup:177 · preview.aup:36`）；旧行号（`posts.aup:179` 等）**只出现在 `:131` 的 10:20 历史列**（唯一命中行）✓；§8 S2（`:477`）同步 |
| **A10** | 标准同步（四项 + 版本行） | **通过** | 版本行 `:5` = **V1.8**；§4.3 `:356` 出现「**Round 13 已实施**」+ `12.65` / `5.47` + 「红改由 1px 描边 + 图标承担」+ 回退=删 3 行；§3.1 `:259` 出现「文字/描边/图标同色 … **会破 AA**」；§9 新增 `:493` ≥4.5:1 可执行断言、`:494` 命中区 ≥24×24 并**按态①写成硬断言**（`:577` 实测 `rect 139×29`），另附平台 13px 配方免责 `:587`；§3.4 `:305` 补 **D6** 判据（唯一可见标题 → 17px）；`git diff --stat -- docs/ArcBlog-admin-ui-design.md` 只含该文件（62+/3-） |
| **A11** | 标准既有内容未被放宽 | **通过** | §9 复选框条目 **12 → 14**（**只增**）；`git diff -U0` 的 7 个 hunk 中 **4 个是纯插入**（`:259`、`:305`、`:493-494`、`:534+55`）、3 处为等价替换：版本行 V1.7→V1.8、§4.3 两段「记为设计项/未实施」状态块 → 「已实施」（共 3 行删除，**无任何期望值被删或放宽**）；既有断言表达式与条目文字未动 |
| **A12** | 行为回归（导航不闪主题） | **通过（附口径更正）** | 同一 tab 连续 `Page.navigate` `posts → hub → diagnostics`：**解析后的正确值在 ~79–92 ms 出现**（`readyState=complete` 同刻），远早于判据的 300 ms；`localStorage['arcblog:theme:v1'] = {"tone":"editorial","palette":"natural","mode":"light"}` 存在且与当前一致。**口径更正（与 UI 自述不同）**：属性层面确实存在一次「先错后翻」——服务端首帧 `data-mode="dark" data-tone="clean" data-palette="neutral"`，**首个 fresh sample（~50–61 ms，`readyState=loading`）仍是 `dark`**，~79 ms 才转 `light`。窗口 ≤~60 ms 且**结束于 readyState=complete 之前**，故不构成 300 ms 判据违反（详见 O1） |
| **A13** | 门全绿 | **通过** | 同 §1.1 A1a–A1f |
| **A14** | 浏览器纪律 | **通过** | 同 §1.4 A16 |
| **A15** | 串行契约遵守（L-R13-5） | **通过（旁证重组，非直接观测）** | 源码最后写盘：Dev `.aup` **11:21:44** < UI `.web` **11:30:56**（Dev 先收工）；`dist/**` **11:36:13** 晚于两者 → 最后一次构建已同时包含 Dev 与 UI 的改动；`arc service status` → `Started: 2026-09-28T03:35:21.677Z`；QA 开跑前 `diff -r .aup dist/.aup` / `.web` 已无输出。**限制**：中间过程（谁在何时 build/restart）无法由 mtime 完全重建，属**旁证**；但 QA 全部 DOM 探针在运行实例上实测到 Dev 的 `.aup` 与 UI 的 CSS **同时生效**，等价于串行契约的结果成立 |

---

## 2. 逐条验证详情（原始输出）

### 2.1 门与构建一致性

```text
$ arc dsl validate --json | tail -3
  ],
  "issues": []
}
exit=0

$ npm test | tail -8
ℹ tests 28
ℹ suites 0
ℹ pass 28
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 954.305041
（末次复跑：duration_ms 912.87625，同样 28/28）

$ node scripts/arcblog-console-nav.mjs --check
{
  "ok": true,
  "action": "check",
  "pages": 19
}
exit=0

$ arc dsl generate --check
Would generate 0 file(s) (dry-run) — nothing to change
exit=0

$ diff -r .aup dist/.aup ; echo exit=$?        # 无输出
exit=0
$ diff -r .web dist/.web ; echo exit=$?        # 无输出
exit=0

$ arc blocklet build | tail -4
Warning: Pre-render produced no .web-cache/ artifact for 2 built-in route(s) ... /p/en/search/, /p/zh/search/ ...
Pre-rendered 0, reused 5 web pages (no input changed) → .web-cache/
Published 455 file(s) → /Users/shenxiuqiang/workspace/ArcBlog/dist
exit=0
$ md5 -q dist/.afs/manifest.json     # build 前 / build 后
34ba747409dfd2bd80bdf75d2e338355
34ba747409dfd2bd80bdf75d2e338355

$ npm run test:file -- scripts/arcblog-theme.test.mjs | tail -8
✔ the app declares an explicit theme mode (0.859417ms)
✔ a fixed site default theme matches the compiled mode (0.14175ms)
✔ the theme bridge still resolves system mode and manual overrides (0.14925ms)
ℹ tests 3 / pass 3 / fail 0 / duration_ms 52.399375

$ grep -rnE '#[0-9a-fA-F]{3,8}\b|rgba?\(' .aup/pages .aup/wrapper.aup .web/components/theme-bridge/script.js | grep -vc 'var(--'
0
```

### 2.2 `compose-edit` DOM 原值（admin，视口 1803×908，lang=en）

```text
$ # CDP: Page.navigate http://arcblog.localhost:4939/?page=compose-edit（admin，无 slug）
{
  "url": "http://arcblog.localhost:4939/?page=compose-edit",
  "lang": "en",
  "bodyHasSessionInitFailed": false,
  "h2s": [ { "text": "Edit post", "fontSize": "17px", "display": "flex", "visible": true } ],
  "actionCount": 1,
  "actions": [ {
      "text": "Back to studio", "kind": "back", "variant": "ghost",
      "styleAttr": "border-radius: var(--radius-md, 8px); padding: 5px 12px;",
      "rect": { "w": 138.7, "h": 29 },
      "padding": "5px 12px", "paddingTop": "5px", "paddingLeft": "12px",
      "minHeight": "0px", "fontSize": "13px", "borderRadius": "8px"
  } ]
}
```

平台 `data-kind=back` 配方（QA 从运行实例的 `aup-core.d36197840205e143.css` 抓取，**无 `!important`**）：

```css
.aup-action[data-kind="back"], .aup-action[data-kind="link"]:not([data-icon-only="true"]) {
  background: transparent; border-color: transparent; color: var(--color-dim);
  padding: 0px; min-height: 0px; font-size: 0.8125rem; font-weight: 500;
  border-radius: 0px; width: max-content; gap: 6px; }
.aup-action[data-kind="back"]:hover, … { background: transparent; … color: var(--color-text); text-decoration: underline; … }
```

guest 隔离上下文（无 cookie）`?page=compose-edit`：

```text
url: ...?page=compose-edit&locale=zh | sessionInitFailed: false
h2s: [ { "text": "用钱包发布", "fontSize": "15px", "visible": true } ]   ← gate 卡 :31
actions: [ { "text": "使用 DID Wallet 登录", "variant": "primary" } ]
afsLists: 0 | kvRows: 0 | copyBtns: 0 | inputs: 0 | forms: 0 | destructive: 0 | activeNav: 0
```

### 2.3 源码静态（A6/A7）与 diff

```text
$ grep -n "fontSize\|borderRadius\|padding" .aup/pages/admin/compose-edit.aup
31:        h2 :gate-title level=2 style={fontSize: "var(--type-body)"}
39:          h2 :title level=2 style={fontSize: "var(--type-subheading)"}
41:          action -> page posts variant=ghost label=:back style={borderRadius: "var(--radius-md, 8px)", padding: "5px 12px"}

$ echo "total=$(grep -rn 'h2 :gate-title' .aup/pages --include=*.aup | wc -l)"
total=      20
$ grep -rn 'h2 :gate-title' .aup/pages --include=*.aup | grep -c 'fontSize'
20
$ grep -rn 'h2 :gate-title' .aup/pages --include=*.aup | grep -v 'fontSize'
(none)

$ git diff --stat -- .aup
 .aup/locales/en.json              | 19 +++++++++++++++++--
 .aup/locales/zh.json              | 19 +++++++++++++++++--
 .aup/pages/admin/compose-edit.aup |  6 +++---
 .aup/pages/ops/hub.aup            | 40 ++++++++++++++++++++++++++++++++-------
$ git diff --name-only -- scripts world blocklet.yaml docs/ArcBlog-product-technical-spec.md
(空)
```

### 2.4 V3 A-ii DOM 实测（静息 / 强制 hover）

```text
$ # CDP ?page=posts —— REST
{ "label": "Remove from public",
  "color": "rgb(26, 26, 31)",
  "backgroundColor": "color(srgb 0.772549 0.188235 0.188235 / 0.12)",
  "borderTopColor": "rgb(197, 48, 48)", "borderTopWidth": "1px",
  "effectiveBg": { "r": 234.84, "g": 216.08, "b": 213.44 },
  "contrastRest": 12.648171473151205,
  "iconColor": "rgb(197, 48, 48)" }
$ # 同节点 CSS.forcePseudoState(['hover'])，等 900ms —— HOVER
{ "color": "rgb(255, 255, 255)",
  "backgroundColor": "rgb(197, 48, 48)",
  "borderTopColor": "rgb(197, 48, 48)",
  "effectiveBg": { "r": 197, "g": 48, "b": 48 },
  "contrastRest": 5.469427460588714,
  "iconColor": "rgb(255, 255, 255)" }
$ # ?page=pages 静息 = 13.836598769348061 ；?page=hub 静息 = 12.648171473151205
```

10 组合矩阵（CDP 强制属性 + 抑制 transition，真 DOM computed；`node probe-matrix2.mjs`）：

```text
natural/light    rest=12.65 PASS   neutral/dark     rest=13.71 PASS
natural/dark     rest=10.70 PASS   warm/light       rest=10.82 PASS
neutral/light    rest=13.43 PASS   warm/dark        rest= 6.32 PASS   ← 最低
vivid/light      rest=12.16 PASS   vivid/dark       rest=11.69 PASS
electric/light   rest=13.23 PASS   electric/dark    rest=10.60 PASS
REST PASS 10/10

hover（同法 + forcePseudoState）：natural/light 5.47 · natural/dark 6.02 · neutral/light 5.46 ·
neutral/dark 4.53（最低）· warm/light 5.38 · warm/dark 6.22 · vivid/light 4.83 · vivid/dark 6.41 ·
electric/light 4.62 · electric/dark 6.16  → HOVER PASS 10/10
（每组 hover 的 bg = 实心 --color-error、文字 = --color-surface，合成底不透明）

$ node docs/team/design/raw/UI-009-contrast.mjs | tail -14     # 对照（UI 的计算口径）
  rest  12.65 PASS | hover --color-surface   5.47 PASS | hover --color-bg   5.23 PASS | natural/light
  rest   6.32 PASS | hover --color-surface   6.22 PASS | … | warm/dark
  rest  12.16 PASS | hover --color-surface   4.83 PASS | hover --color-bg   4.39 FAIL | vivid/light
  （QA 独立算：--color-bg #f0f4ff on #dc2626 = 4.39；--color-surface #18181b on #e5484d = 4.53）
```

注入样式来源与不变量（同一次探针）：

```text
chrome style present: true | rule1: true | rule2: true | rule3: true
original attrs: {"tone":"editorial","palette":"natural","mode":"light"} -> restored: 同值
forced-attr persistence: immediately "vivid/dark" -> after 1s "natural/light"   ← MutationObserver 重放
PAGE TARGETS BEFORE/AFTER: 1 / 1
```

### 2.5 Hub 写路径真实点击 + AFS 复核（`?page=hub`，admin）

探针记录（CLI 造，写实例前已持 `.gate-lock`）：

```text
register did:key:zQa13Apply1790567097     -> id 7da9bb4ec4213742  applied / direction studio / updatedAt 03:44:57.655Z
add      did:key:zQa13Hub1790567097       -> id 2e9d58ffcef578a5  indexed / direction hub    / updatedAt 03:44:58.612Z
register did:key:zQa13ApplyLate1790567097 -> id 9684ad885ac4e809  applied / direction studio / updatedAt 03:44:59.563Z
id == sha256(did)[0:16]：7da9bb4ec4213742 ✓ / 2e9d58ffcef578a5 ✓ / 9684ad885ac4e809 ✓

# 真实点击（Input.dispatchMouseEvent → 平台 .aup-overlay[role=dialog] 的 .aup-alert-btn.primary）
STEP 1  Approve 行 A： dialog "Approve this application? | … | Cancel | Approve"
STEP 2  Terminate 行 B（direction=hub）： dialog "Terminate this relation? | … | Cancel | Terminate"
STEP 3  Approve 行 C（B 终止之后）： dialog "Approve this application? | …"

$ node scripts/arcblog-network.mjs hub show …   # ← 复核依据，非 toast
A: relation "indexed"  updatedAt "2026-09-28T03:46:24.832Z"  (原 03:44:57.655Z)  sync.lastVersion null（未漂移）
B: relation "removed"  removedAt "2026-09-28T03:46:30.164Z"  direction "hub"（保持）
C: relation "indexed"  updatedAt "2026-09-28T03:46:35.508Z"

$ # 逐条 purge 后
baseline count 4 ids ['42b02720d0b6bb68','6d86a84e377ad736','8133a1ea682714e5','e8f453792619a8f9']
after    count 4 ids ['42b02720d0b6bb68','6d86a84e377ad736','8133a1ea682714e5','e8f453792619a8f9']
IDS MATCH BASELINE: True | probe ids present: []
```

### 2.6 A12 同步字段逐字段机器比对（DOM ↔ 记录）

```text
DOM relation rows with sync fields: 4 | CLI records: 4
MATCH did:key:zExitTest1790483262699  DOM {"sync.status":"never","sync.lastSync":"—","sync.lastVersion":"—","sync.lastError":"—"}
MATCH did:key:zNetHub1790267735950    DOM {"sync.status":"ok","sync.lastSync":"2026-09-24T16:35:40.022Z","sync.lastVersion":"7","sync.lastError":"—"}
MATCH did:key:zExitTest1790434702401  DOM {"sync.status":"never","sync.lastSync":"—","sync.lastVersion":"—","sync.lastError":"—"}
MATCH did:key:zUiFresh1790348264      DOM {"sync.status":"ok","sync.lastSync":"2026-09-25T14:57:46.110Z","sync.lastVersion":"1","sync.lastError":"—"}
A12 field-by-field: 4/4 rows match the CLI record exactly (mismatch=0)
```

### 2.7 19 页回归 sweep + sidebar 点击（BUG-010/011 等价断言）

```text
sections (19): dashboard,posts,pages,compose,heroes,categories,tags,seo,feeds,appearance,
               operations,hub,media,agents,policy,access,factory,general,diagnostics
PASS page=dashboard    active=1 (Dashboard) initFailed=false docScroll=0 contentScrollers=1
PASS page=posts        active=1 (Studio)    initFailed=false docScroll=0 contentScrollers=2
PASS page=pages        active=1 (Pages)     initFailed=false docScroll=0 contentScrollers=1
PASS page=compose      active=1 (Write)     initFailed=false docScroll=0 contentScrollers=2
PASS page=heroes       active=1 (Heroes)    initFailed=false docScroll=0 contentScrollers=2
PASS page=categories   active=1 (Categories) initFailed=false docScroll=0 contentScrollers=2
PASS page=tags         active=1 (Tags)      initFailed=false docScroll=0 contentScrollers=2
PASS page=seo          active=1 (SEO)       initFailed=false docScroll=0 contentScrollers=1
PASS page=feeds        active=1 (Feeds)     initFailed=false docScroll=0 contentScrollers=1
PASS page=appearance   active=1 (Appearance) initFailed=false docScroll=0 contentScrollers=1
PASS page=operations   active=1 (Operations) initFailed=false docScroll=0 contentScrollers=1
PASS page=hub          active=1 (Hub console) initFailed=false docScroll=0 contentScrollers=2
PASS page=media        active=1 (Media)     initFailed=false docScroll=0 contentScrollers=2
PASS page=agents       active=1 (Agents)    initFailed=false docScroll=0 contentScrollers=2
PASS page=policy       active=1 (Policy)    initFailed=false docScroll=0 contentScrollers=1
PASS page=access       active=1 (Access)    initFailed=false docScroll=0 contentScrollers=1
PASS page=factory      active=1 (Factory)   initFailed=false docScroll=0 contentScrollers=2
PASS page=general      active=1 (General)   initFailed=false docScroll=0 contentScrollers=2
PASS page=diagnostics  active=1 (Diagnostics) initFailed=false docScroll=0 contentScrollers=2
REGRESSION: 19/19 pass
SIDEBAR CLICK (posts → Tags 行，真实鼠标事件):
  {"url":"http://arcblog.localhost:4939/?page=tags","hash":"","active":1,"activeText":"Tags"}
PAGE TARGETS BEFORE/AFTER: 1 / 1
```

- **BUG-010 等价断言**：**19/19 页 `document.scrollingElement.scrollHeight - innerHeight = 0`**（整壳不随之滚动）；`compose` 内容列滚动容器 = 2、`appearance` = 1 → 内容列自有滚动容器，**未回退**。
- **BUG-011 等价断言**：侧栏行点击 → `?page=tags`、`location.hash === ""`（无 `#hash` 路由）、`[data-active="true"]` 恰 1（`Tags`）→ **未回退**。

### 2.8 guest 原始响应（A13 负面）

```text
cookies in guest context: arc_lang=en
list_hub            -> 403 {"ok":false,"error":"Forbidden at /instance/app/arcblog/hub/registrations: role 'guest' is below readRole 'admin'","code":"AFS_FORBIDDEN"}
list_config_roles   -> 403 同上（config/roles）
list_agents         -> 403 同上（config/agent-grants）
list_posts          -> 200（公开面未误伤）
list_categories     -> 200（公开面未误伤）
write_probe         -> 401 {"ok":false,"error":"Authentication required for write/delete"}
delete_probe        -> 401 同上
```

### 2.9 BUG-028 / 标准同步静态断言

```text
$ grep -rn "variant=destructive" .aup/pages --include=*.aup | wc -l
9
$ grep -n "posts.aup:179\|pages.aup:165\|heroes.aup:148\|tags.aup:174\|factory.aup:210\|hub.aup:156" docs/team/design/UI-009-*.md
131:| **10:20（Dev 改动前）** | **10 处 / 8 文件** | `admin/posts.aup:179,216` · … `preview.aup:36` |    ← 唯一命中：历史列
$ grep -n "pages.aup:169\|posts.aup:183\|heroes.aup:152\|tags.aup:178\|factory.aup:214\|hub.aup:177" docs/team/design/UI-009-*.md
133:| **Round 13 刷新（BUG-028 修复后真值…）** | **9 处 / 7 文件** | `admin/pages.aup:169,196` · … |      ← 本轮真值

$ echo "§9 □ HEAD=$(git show HEAD:docs/ArcBlog-admin-ui-design.md | grep -c '^□') NOW=$(grep -c '^□' docs/ArcBlog-admin-ui-design.md)"
§9 □ HEAD=12 NOW=14
$ git diff -U0 -- docs/ArcBlog-admin-ui-design.md | grep '^@@'
@@ -5 +5 @@            @@ -258,0 +259 @@      @@ -303,0 +305 @@
@@ -354 +356 @@        @@ -356 +358 @@        @@ -490,0 +493,2 @@
@@ -529,0 +534,55 @@
$ git diff -- docs/ArcBlog-admin-ui-design.md | grep '^-' | grep -v '^---'   # 仅 3 行
- **文档版本：** V1.7（…）
- > **已知现状 · destructive 按钮文字对比度 3.99:1（…记为 R12 设计项）**：…
- > **V3 方案指向（Round 12 · UI-009；本轮只提议、未实施，L-R12-2）**：…
$ git diff --stat -- docs/ArcBlog-admin-ui-design.md
 1 file changed, 62 insertions(+), 3 deletions(-)
```

### 2.10 定向 live（持锁串行）

```text
$ cat docs/team/.gate-lock
qa-round13 owner=qa start=2026-09-28T03:43:52Z
$ npm run test:file -- scripts/arcblog-network.test.mjs | tail -10
✔ live: discovery, health and the hub registration lifecycle (12386.497583ms)
✔ live: hub-initiated inclusion starts indexed (§70.2); reject tombstones an application (3896.450625ms)
✔ live: hub index rebuild upserts changes and tombstones the vanished (§73/§119/§120) (62700.156875ms)
✔ live: hub refresh persists freshness, and health summarises it (19828.502666ms)
ℹ tests 15 / pass 15 / fail 0 / duration_ms 98998.506334
$ rm -f docs/team/.gate-lock ; ls docs/team/.gate-lock
No such file or directory
```

### 2.11 A12 时序（`posts → hub → diagnostics`，`performance.timeOrigin` 区分文档）

```text
posts      : first fresh sample @50ms mode=dark  tone=clean palette=neutral rs=loading | first mode=light @79ms  | readyState=complete @79ms  | localStorage={"tone":"editorial","palette":"natural","mode":"light"}
hub        : first fresh sample @51ms mode=dark  tone=clean palette=neutral rs=loading | first mode=light @87ms  | readyState=complete @87ms  | localStorage=同值
diagnostics: first fresh sample @61ms mode=dark  tone=clean palette=neutral rs=loading | first mode=light @92ms  | readyState=complete @92ms  | localStorage=同值
```

> **方法学披露**：QA 第一版脚本把「最后一个采样点」当成「翻转时刻」，得出过「~340–376 ms 才转 light」的**错误中间读数**；改用 `performance.timeOrigin` 过滤新文档 + 记录首个 light 时刻后，真值为 **79–92 ms**。上面是更正后的原始输出。

---

## 3. 新增 BUG

| 编号 | 标题 | 级别 | 范围 | 阻断？ |
| ---- | ---- | ---- | ---- | ------ |
| [BUG-029](../bugs/BUG-029-hub-help-omits-refresh-subcommand.md) | `arcblog-network.mjs hub --help` 未列出实际可用的 `hub refresh` / `hub freshness` | **P3** | **范围外**（`scripts/**`；REQ-015 明令不改 CLI） | **否** |

**无 P0、无 P1。** 本轮未发现任何门禁红、链路不可用、越权、fail-closed 失效或验收标准未达成。

---

## 4. 观测登记（非 BUG；供 PM/Lead 决策，不阻断放行）

| # | 观测 | 处置建议 |
| - | ---- | -------- |
| **O1** | 服务端首帧 shell 始终是平台默认 `data-tone="clean" data-palette="neutral" data-mode="dark"`；正确主题在 **~79–92 ms**（`readyState=complete` 之前）由 bridge 覆盖。**这不是本轮引入**（REQ-016 既没碰 shell 也没改 bridge boot 顺序），且纠正远早于 A12 的 300 ms 判据 | 采纳为「A12 通过（口径更正）」；UI 自述的「300 ms 内均为 light」在**属性层面**不准确，建议下轮如再引用 A12 时写明「首个 pre-load 采样仍是平台默认，completed 前已纠正」。**不单独立 BUG**（无实现缺陷、无用户可见闪烁证据） |
| **O2** | 未跟踪文件 `docs/dsh-workflow-and-ralph.md`（及其 `dist/` 镜像）不属于任何本 REQ 产物 | Lead 提交时**明确决定**是否纳入；**严禁 `git add -A`**（手册 §3 硬规则 3） |
| **O3** | `arc blocklet build` 会把**整个 `docs/` 树**拷进 `dist/docs/**` → 本轮把 PM 的 `backlog.md`、`journal/round-13.md`、两份 REQ、UI-010 及其 raw 证据都镜像进 dist（内容非 Dev/UI 产出，属生成物） | Lead 决定 `dist/docs/team/**` 是否入库；这与 REQ-015 §2.2 A15 的「Dev 零越界」不冲突（生成物） |
| **O4** | `arc blocklet build` 输出 `Warning: Pre-render produced no .web-cache/ artifact … /p/en/search/, /p/zh/search/`（默认非致命，`ARC_PRERENDER=1` 才硬失败） | 既有平台/预渲染问题（非本轮）。建议 PM 记 backlog，由 Dev 复核是否需要 `ARC_PRERENDER` 硬门 |
| **O5** | `hub list` / `hub show` 会在读取时**回写** `freshness.checkedAt` 与 `updatedAt`（spec §75/§76 派生语义）。因此 4 条 baseline 记录的 `updatedAt`(03:26→03:48) 与 `freshness.checkedAt` 在 QA 全程被刷新，**其余字段逐字节不变**（`relation/direction/removedAt/sync` 全同） | 如实披露，**不是 QA 探针残留**，也不是 BUG-016 型漂移（`lastVersion` 仍为 `null`/`1`/`7`，无 `null→""` 类型漂移） |
| **O6** | 定向 live 跑完的实例残渣（`arcblog-clean.mjs` dry run）：`found: 13`（`hub/index` 4 + `drafts` 9）。其中 `hub-idx-test-1790567263931`（hub/index + draft 各 1）落在 **QA 本轮 live 窗口**（03:47:43Z），其余（`agent-surface-draft-*` ×7、`sign-keys-*`、Dev 的 `hub-idx-test-1790565896956`、`paid-test`/`sign-test` index）**早于本轮 QA** | QA **不动**别人的/历史的残渣；建议 Lead/PM 在轮末跑一次 `node scripts/arcblog-clean.mjs --confirm` 统一收口（会一并清掉 R12 遗留）。QA 自证：**hub registrations 探针已 100% purge，计数与 id 集合回到 baseline** |
| **O7** | `?page=hub` 每行无论 `relation` 为何都渲染 **Approve / Terminate / Purge** 三个动作；对 `removed` 行点 Approve 会把它「复活」为 `indexed`（对话框文本只写 "Only meaningful for applied relations."，无禁用/隐藏） | 符合 REQ-015 §2.1「既有 Approve/Terminate/Purge 继续有效」与 L-R13-3；**不判 BUG**。建议 PM 记 backlog（P3 体验：按 `relation` 值禁用无意义动作） |
| **O8** | 标准 §4.3 引用的 `?page=posts` destructive 计数 **38** 是数据相关值；QA 本轮实测 **39**（`?page=hub` 4、`?page=factory` 6，与标准一致） | 标准已自标「属列表数据变化、非回归」（§4.3 `:356`）→ **不判 BUG**；提醒后续引用不要写死 |
| **O9** | spec §15.6 达成标准「注册一个新 Hub 不需要离开此页面」在平台上不可达成（AUP 无哈希原语 → 关系 id/filename = `sha256(did)` 前 16 位，页面拼不出记录路径）；`hub refresh` 不在 `--help`（BUG-029）；`font-size: 13px` 落在 §4.3 两档之外（标准 `:587` 已登记平台免责） | 三项均按 **L-R13-3 / L-R13-4** 执行（页面如实给 CLI 指引、不改 spec）。建议 Lead：① 把 §15.6 的平台边界句列为 spec 修订候选；② 把 `action` 的 `minHeight` 不转发登记进 `docs/arc-contracts.md`（Lead 写范围），与 BUG-029 一起在轮末裁决 |

---

## 5. 放行结论

| 项 | 结论 |
| -- | ---- |
| 门（validate / npm test 28 / console-nav 19 / generate --check / build / 双向 diff） | **全绿** |
| REQ-015 A1–A16 | **16/16 有明确结论**：15 通过（A5 附 1 条机制受限、A16 通过），**无未测遗漏** |
| REQ-016 A1–A15 | **15/15 有明确结论**：14 通过（A12 附口径更正），**无未测遗漏** |
| 负面用例 | **≥2 条**：guest 页面只见 gate（A13）、guest AFS 读 403 / 写 401、guest 私有前缀 3 处 403、公开面 200 对照 |
| 回归 | 19/19 控制台页（无 SESSION INIT FAILED、每页恰 1 个 `[data-active=true]`）+ BUG-010/011 等价断言不回退 + 侧栏真实点击换页 + 定向 live `arcblog-network.test.mjs` **15/15** |
| 未裁决 P0 / P1 | **0 / 0** |
| 探针与锁 | `.gate-lock` 已删；hub 探针 3 条**逐条 purge**、id 集合回到 baseline；浏览器自开 target 已关、browser context 已 dispose、共享 tab 停在 `?page=pages`（lang=en、mode=light） |
| 新增缺陷 | **1 条 P3（BUG-029，范围外）** —— 不阻断 |

**放行（Pass）。** QA 独立复跑的门全绿、V3 A-ii 在 10 组 palette/mode × 静息/hover 上 20/20 ≥4.5:1（真 DOM）、`compose-edit` 三条视觉债与命中区（态①，138.7×29）实测收口、Hub 注册界面的写路径经 AFS 复核成立且互不阻塞，未发现 P0/P1。

**给 Lead 的 3 个提交前注意**：① 不要 `git add -A`（`docs/dsh-workflow-and-ralph.md` 与本轮无关）；② `dist/docs/team/**` 是构建镜像，是否入库由 Lead 定；③ 轮末可跑 `node scripts/arcblog-clean.mjs --confirm` 统一清实例残渣（O6）。

VERDICT=pass, BLOCKING=0
