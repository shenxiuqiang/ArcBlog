# REQ-015 — `compose-edit` 视觉债收口（R1/R2/R3 含命中区探针）+ Hub 注册界面（Studio 侧：申请流 + 被收录）

| 字段 | 值 |
| ---- | -- |
| REQ 编号 | **REQ-015** |
| 对应 spec 章节 | **§15.6**（Hub 注册 Registrations（Studio），spec L1103–L1117）/ **§70.1–§70.2**（Studio 申请 / Hub 主动收录）/ **§112**（同步字段）；控制台 UI 标准 `docs/ArcBlog-admin-ui-design.md` **§3.4**（字号）/ **§4.3**（按钮层级、圆角、命中区）/ **§9**（验收清单） |
| checklist 行 | 第 **109** 行「Hub 注册（Studio 侧列表 / 申请 / 被收录）」**🟡**（本轮目标：界面补全后由 Lead 评估是否落 ✅）；R1/R2/R3 属**质量缺口**（不新增清单行） |
| 优先级 | **P2**（R3 = 可访问性 WCAG 2.5.8；Hub 注册界面 = §15.6 界面缺口）；R1/R2/R3 的 P3 部分不阻断 |
| 提出轮次 | **Round 13**（来源：Lead **L-R13-2** 命中区探针裁定 + **L-R13-3**「只镜像 CLI 真实能力」+ **L-R13-5** 串行；[UI-009](../design/UI-009-v3-contrast-and-visual-debt.md) §6.1–§6.3；[REQ-014](REQ-014-v3-contrast-and-visual-debt.md) §7.3；backlog「Round 13 排期」**R13-2** / **R13-5**） |
| 负责角色 | **Dev（`task-40`）** ｜ QA 独立验证（`task-42`，**`blocked_by task-40 + task-41`**）｜ PM（`task-39` 规划 / `task-43` 裁决） |
| 状态 | 🟥 **本轮执行（Round 13）** —— **必须先于 REQ-016 完成 build + `arc service restart`**（L-R13-5） |
| 上游 | [UI-009](../design/UI-009-v3-contrast-and-visual-debt.md) §6.1/§6.2/§6.3 + §5 G8；[UI-007](../design/UI-007-console-pixel-walkthrough.md) V6/V7 先例；`docs/ArcBlog-product-technical-spec.md` §15.6 / §70.1–§70.2；`scripts/lib/network.mjs` 的 `hubRegistrationId`（DID 哈希）与 `arcblog-network.mjs hub --help`（PM 实测原文见 §1.2） |
| 下游 | [REQ-016](REQ-016-v3-aii-and-visual-debt.md)（UI，**串行后置**；消费本 REQ 的 R3 探针结论写标准 §9/§4.3 免责）、`test-reports/round-13.md`（QA-008）、[journal/round-13.md](../journal/round-13.md) |

> **一句话**：两件**互不重叠但同属 Dev 写范围**的活 —— ① 把 `?page=compose-edit` 的剩余视觉债按**依据明确的期望值**收口（`:31` 15px、`:39` 17px、`:41` 圆角 8px），命中区按 Lead **L-R13-2 先探针**（转发就修到 ≥24×24，不转发就不改 + 留证据）；② 把 **§15.6 Hub 注册**的界面缺口补上，但**只镜像 `arcblog-network.mjs hub` 真实支持的能力**（申请流 = 页面内组装并一键复制真命令；关系 id = DID 哈希、AUP 无法计算 → 如实给 CLI 指引），链上动作保持 **operator-declared**。

---

## 1. 背景

### 1.1 `?page=compose-edit` 的剩余视觉债（R11F 之后仅存的实现侧偏差）

R11F 已修完 UI-007 的 V1/V2/V4–V9 + BUG-024/026，并把 V8、D1–D5 落进标准（V1.7）；`compose-edit` 是 R11F 复验明列的**范围外观察**，也是 [UI-009 §6.1–§6.3](../design/UI-009-v3-contrast-and-visual-debt.md) 唯一未收口的实现侧工作。**PM 本轮直接读了源码**（`.aup/pages/admin/compose-edit.aup`，84 行），三条落点如下：

| # | 现象 | 源码落点（PM 本轮实读） | 期望值（依据） | 证据类型 |
| - | ---- | -------------------- | ------------- | -------- |
| **R1a** | gate 卡标题 `h2` 走运行期默认 **21.6px** | `.aup/pages/admin/compose-edit.aup:31` `h2 :gate-title level=2`（**无 `fontSize`**） | **15px = `var(--type-body)`**（标准 §3.4「卡片内 `h2`/`h3` = `var(--type-body)`」；gate 卡豁免的是**正文密度 14px**，不是标题字号） | **源码静态 + 全仓同族普查**：`grep -rn "h2 :gate-title" .aup/pages --include=*.aup \| wc -l` = **20**，其中带 `fontSize` 的 = **19**，唯一漏掉的正是 `compose-edit.aup:31`（PM 本轮实测原始输出见 §1.4） |
| **R1b** | not-found 卡的页面标题 `h2` **实测 21.6px**（文案 "Edit post"、父卡 `padding:14px`） | `.aup/pages/admin/compose-edit.aup:39` `h2 :title level=2`（**无 `fontSize`**） | **17px = `var(--type-subheading)`** —— 它是该状态下**唯一可见的页面级标题**（与 V7 已修的 `factory.aup:155` 同型）；标准 §3.4 的**判据补全（D6）**由 REQ-016 在标准里补一行（「卡片内的 `h2` 若承担该页唯一可见标题 → 按页面标题 17px 判定」） | **浏览器实测（UI-009 §6.1）** = 21.6px；**PM 本轮源码实读** = `:39` 无 `fontSize` |
| **R2** | `Back to studio`（`variant=ghost` + `data-kind=back`）圆角 **32px** | `.aup/pages/admin/compose-edit.aup:41` `action -> page posts variant=ghost label=:back`（**无 `borderRadius`**） | **8px = `var(--radius-md, 8px)`**（标准 §4.3「圆角全部 `var(--radius-md, 8px)`；`ghost` 运行时默认 32px，必须内联覆盖」；**先例已验证会被转发**：`compose.aup:157,158`） | **浏览器实测（UI-009 §6.2）** = 32px；**先例** = V6 已在 compose 页按同一写法修好 |
| **R3** | 同一按钮命中区 **115×19**（`padding:0px`、`min-height:0px`、`font-size:13px`）→ **< WCAG 2.5.8（AA）24×24** | 同 `:41` | **≥24×24**（Lead **L-R13-2**：先探针 `style={padding/minHeight}` 是否被 `action` 转发；**转发就修到 ≥24×24，不转发就不改并留证据**） | **浏览器实测（UI-009 §6.3）** = 115×19；**转发性未验证**（UI-009 G8：本轮禁止改 `.aup` 故未探针） |

- **成因（已定性，不必重查）**：平台对 `data-kind=back`（`-> page` 返回型动作）套用 `.aup-action[data-kind=back]{padding:0;min-height:0;font-size:.8125rem;color:var(--color-dim)}`，**绕过标准 §4.3 的两档尺寸**（默认 36px / `sm` 29px）；`variant=ghost` 再叠加胶囊圆角 32px（UI-009 §6.3）。
- **与 V3 无关**：R1/R2/R3 **不是** destructive 对比度问题（那部分是 [REQ-016](REQ-016-v3-aii-and-visual-debt.md)），本 REQ **不动** 9 处 `variant=destructive`。

### 1.2 Hub 注册界面的缺口（§15.6 / §70.1–§70.2）与平台边界

- **清单现状**（第 **109** 行 🟡）：`CLI 完整（register=申请/approve/reject/add=主动收录/remove=Tombstone）；AUP 界面仅有列表，申请流与被收录列表待补`。
- **spec 要求**（§15.6，L1103–L1117）：① 收录关系列表：已收录 / 申请中（applied）/ 已终止，**含最近同步、同步版本、错误信息**（§112、§70.3）；② **申请收录**：从链上质押列表选择（名称/图标/描述/分类，§8.3）**或手动输入 Hub 地址** → 验证 → 提交申请 → Hub 审核（§70.1）；③ **被收录列表**：**哪些 Hub 主动收录了我**（§70.2），**可查看、可退出**；④ 移除 / 退出 Hub；⑤ 每个 Hub 一行状态，**失败可手动重试**；**绝不允许一个 Hub 的失败阻塞其他 Hub**（§113）。达成标准还写着「注册一个新 Hub **不需要离开此页面**」。
- **CLI 真实能力（PM 本轮实测 `node scripts/arcblog-network.mjs hub --help` 原文，逐字）**：

  ```text
  node scripts/arcblog-network.mjs hub register --hub-did <did> [--endpoint <url>] [--update]   # §70.1 Studio 申请 → applied
  node scripts/arcblog-network.mjs hub add --hub-did <did> [--endpoint <url>] [--update]         # §70.2 Hub 主动收录 → indexed
  node scripts/arcblog-network.mjs hub approve --hub-did <did>     # applied → indexed
  node scripts/arcblog-network.mjs hub reject --hub-did <did>      # applied → removed (tombstone)
  node scripts/arcblog-network.mjs hub list
  node scripts/arcblog-network.mjs hub show --hub-did <did>
  node scripts/arcblog-network.mjs hub sync --hub-did <did> [--version <n>] [--hash <h>] \
                                          [--status never|ok|stale|error] [--error <message>]
  node scripts/arcblog-network.mjs hub remove --hub-did <did> [--purge]   # removed tombstone; --purge deletes
  node scripts/arcblog-network.mjs hub index rebuild      # §73/§119/§120: upsert + tombstone
  ```

- **平台边界（决定「申请流」只能降级，不得伪造）**：关系记录的 id / 文件名 = `didHash(hubDid)` = **`sha256(did)` 十六进制前 16 位**（`scripts/lib/attribution.mjs:38` + `scripts/lib/network.mjs:136`，PM 本轮实读）→ **AUP 无哈希原语、无法计算**，所以页面**无法**用 `${args.hubDid}` 拼出记录路径去创建关系（那样会写出 id ≠ 哈希的记录，之后 `hub add/register` 再写一次 → **同一 DID 两条关系**）。**Lead L-R13-3 已裁定**：界面只镜像 CLI 真实能力，哈希部分**如实给 CLI 指引**；**不新增 intent 队列 / worker**（与 tags 队列那套不同，本轮明确不做）。
- **已有可用的写路径（不降级）**：**编辑/终止既有关系**走的是 `${args.ePath}`（entry 自带真实路径，`hub.aup:158,159,161`）→ 行内 **Approve / Terminate / Purge 继续有效**；「**可退出**」据此满足。
- **PM 本轮实测的实例基线**（`node scripts/arcblog-network.mjs hub list`，只读）：

  ```text
  {"ok":true,"path":"/instance/app/arcblog/hub/registrations","count":4,
   "summary":{"offline":4}}
   → 4 条记录的 relation 全为 removed、direction 全为 studio、sync.status 全为 never
     （与 R10 的 D19 观察一致：既有状态，非本轮引入）
  ```
  ⇒ **当前实例没有 `direction=hub`（被主动收录）记录** → 「被收录列表」的 DOM 断言**必须由 QA 自造探针记录**（写实例 → 先 `docs/team/.gate-lock` → 跑完逐条清理），或如实写「当前实例无该方向记录，用 AFS 探针构造后断言并清理」。**不得**用「页面文案存在」冒充「列表可用」。

---

## 2. 范围

### 2.1 做

#### ① `compose-edit` 视觉债（`.aup/pages/admin/compose-edit.aup`）

| 落点 | 改动 | 期望值 |
| ---- | ---- | ------ |
| `:31` `h2 :gate-title level=2` | 补 `style={fontSize: "var(--type-body)"}`（**与其余 19 处 gate 标题逐字同形**） | computed `fontSize` = **15px** |
| `:39` `h2 :title level=2` | 补 `style={fontSize: "var(--type-subheading)"}` | computed `fontSize` = **17px** |
| `:41` `action -> page posts variant=ghost label=:back` | 补 `style={borderRadius: "var(--radius-md, 8px)"}` | computed `borderRadius` = **8px**、**不存在 32px** |
| `:41` 命中区（R3） | **先探针**（见下），按探针结论二选一 | ① 转发 → **≥24×24**；② 不转发 → **不改** + 原始证据 + 交 REQ-016 写标准免责 |

**R3 探针（Lead L-R13-2，必须在真实渲染页面上量，视口 1803×908）**——至少给出下列 4 个数据点，且**原始输出（JSON/文本）贴进回报**：

| 探针 | 写法（在本文件 `:41` 上临时改，测完按结论保留或复原） | 观察 |
| ---- | ---- | ---- |
| P0 基线 | 不改 | `rect`（期望复现 **115×19**）、computed `padding`（0px）、`minHeight`（0px）、`fontSize`（13px）、`borderRadius`（32px） |
| P1 `padding` | `style={padding: "12px 0"}` | computed `paddingTop` ≠ 0px？`rect.height` 是否变化？ |
| P2 `minHeight` | `style={minHeight: "24px"}` | computed `minHeight` = 24px？`rect.height` ≥24？ |
| P3 两者 | `style={padding: "12px 0", minHeight: "24px"}`（与 `borderRadius` 合并成一条 `style`） | `rect` ≥24×24？ |

- **三态结论（必须在回报里明确选一）**：**态①** `padding` 被转发 → 用 `padding` 修到 `rect.height ≥ 24`（**优先**同时贴近 §4.3 的 `sm` 档 29px 或默认档 36px，取哪个都行，但要贴实测值）；**态②** 仅 `minHeight` 被转发 → 用 `minHeight` 修到 ≥24；**态③** **两者都不被转发** → **不改**该按钮（保持平台 `data-kind=back` 配方），把 P0–P3 原始输出交 **REQ-016** 写进标准 §4.3/§9 的**平台免责**，并把「`font-size:13px` 落在 §4.3 两档之外」一并登记。
- **禁止**：为绕过平台配方去写平台内部类名（`.aup-action[data-kind=back]` 之类）hack；用 `size=` 之外的臆造 prop。
- **字号（P3、不阻断）**：若 `fontSize` 也被转发，可顺带对齐 §4.3 档位（13.6/14.4px）；**不得**为它单独引入 hack。此项**不进**验收硬门。

#### ② Hub 注册界面（`.aup/pages/ops/hub.aup` + 生成的 `.aup/locales/**`）

1. **申请收录（Studio 发起，§70.1）—— CLI 镜像形态**：页面提供「Hub DID（+ 可选 endpoint）」的输入/展示位 + **可本地校验**的形态提示（`did:` 前缀，纯字符串判断，**不声称是平台校验**），并给**一键复制**的**真命令**：
   ```text
   node scripts/arcblog-network.mjs hub register --hub-did <did> [--endpoint <url>]
   ```
   同时给**关系 id 的如实解释**：id/文件名 = Hub DID 的 SHA-256 前 16 位，**界面无法计算**（`scripts/lib/attribution.mjs:38`）→ 所以新建关系必须走 CLI；**页面不得**用 `${args.hubDid}` 之类拼写 `hub/registrations/*.json` 写入。
2. **被收录列表（Hub 主动收录，§70.2）**：让 `direction=hub` 的关系**可辨识**（每行已渲染 `direction` 原值 → 保留并加本地化标签/分组说明，使「谁收录了我」一眼可辨），并满足「**可查看、可退出**」（退出 = 该行既有 **Terminate**；写动作按 AFS 复核，见 A11）。
   - **禁止**用会**因索引陈旧而静默丢行**的 `afs-list` `filter`/`serverFilters` 来「过滤」列表（`CLAUDE.md` 与 `arc-contracts` §15：改记录后索引条目会陈旧）。若采用页面级分组/说明文案，需在回报写明所选形态与理由。
3. **每行补 §112 同步字段**（spec §15.6 功能第 1 条明列）：`sync.lastSync` / `sync.lastVersion` / `sync.lastError`；**无值如实显示占位**（如 `never` / `—`），**不得**伪造数字、不得把 `null` 渲染成看似真实的版本号。
4. **失败可手动重试 + 互不阻塞（§113）**：逐行给出重试指引（`node scripts/arcblog-network.mjs hub sync --hub-did <did> --status ok|stale|error [--error <msg>]`），并有一条**常驻说明**：一个 Hub 的失败不阻塞其他 Hub（页面不提供批量/串行动作，故天然满足；文案如实写）。
5. **命令逐字一致**：页面出现的每条 `arcblog-network.mjs hub …` 命令必须与 `hub --help`（§1.2 原文）**逐字一致**；**不虚构 ARC API**（spec §150 / 铁律 1）。
6. **不新增导航节**：`hub` 已在 `scripts/console-nav.mjs` 的 `CONSOLE_SECTIONS` 中 → `node scripts/arcblog-console-nav.mjs --check` 必须仍是 **pages 19**。
7. i18n：新增 en/zh 键**声明在 `hub` 页 `i18n {}` 块内**（生成到 `.aup/locales/*.json`，flat dotted key）；空态/说明一律**页面级常驻文案**（`afs-list.emptyText` 四种写法全部无效，`arc-contracts` §28.6）。

### 2.2 明确不做

1. **不做链上质押列表选择**（§8.3 需要真实链上读取 + 钱包）→ 链上动作保持 **operator-declared**（Lead **L-R13-3**）；页面只给 CLI 指引，**不得**声称「页面内可选质押节点并直接收录」。
2. **不实现页面内「提交申请」的写入**；**不新增 intent 队列 / CLI worker**；**不改 `scripts/**`**（若判定必须改 CLI/记录形态 → **停手上报**，另立 REQ）。
3. **不改 AFS 记录形态**：`world/hub-registration.yaml`、`world/**` 零改动；**不改 `blocklet.yaml` 权限表**。
4. **不改 spec**（**L-R13-4**：C-01/C-02/C-03 待用户批准）；**不改 checklist**（状态列由 Lead 落笔）。
5. **不新增测试文件**、不动 `scripts/run-tests.mjs` 的 `FAST_TESTS`（`npm test` 基线必须保持 **28/28**）；不跑全量 `npm run test:live`。
6. **不在本 REQ 内做 V3 / theme-bridge**（REQ-016）、**不改 UI-009 的行号**（BUG-028 归 REQ-016）、**不改标准文档**（`docs/ArcBlog-admin-ui-design.md` 归 REQ-016）。
7. **不以 toast 作为写入成功判据**：写动作是否生效**一律以 AFS 复核为准**（`arc-contracts` §29.4）。
8. **不新增 console 页、不改侧栏生成器**（本 REQ 只改既有 `hub.aup` 内容）。

---

## 3. 验收标准（可执行）

> **统一前置**：admin 会话 + 无 cookie 隔离上下文（guest 越权）；浏览器 **1803×908**；**整个 sweep 复用同一个标签页**（`Page.navigate` 换页），结束关闭自开 target；写实例的动作先写 `docs/team/.gate-lock`（一行 `owner + 时间`），跑完删锁并逐条清理探针记录。

| # | 验收标准 | 通过判据（命令 / 断言 / 期望） |
| - | -------- | ------------------------------ |
| **A1** | 门全绿 | `arc dsl validate --json` → `"issues": []`（exit 0）；`npm test` → **28/28**；`arc blocklet build`（改了 `.aup` 必跑）；`node scripts/arcblog-console-nav.mjs --check` → **pages 19**；`arc dsl generate --check` → 无漂移；`diff -r .aup dist/.aup` **无输出**；`diff -r .web dist/.web` **无输出**（Dev 不动 `.web`，仍须证明） |
| **A2** | R1a：gate 标题 15px | 无 cookie `?page=compose-edit` → `getComputedStyle(document.querySelectorAll('h2')[0]).fontSize === "15px"`（gate 卡 `:31`） |
| **A3** | R1b：not-found 标题 17px | admin 会话、无 slug（命中 `!$state.post`）→ `getComputedStyle(document.querySelector('h2')).fontSize === "17px"`；且该状态只有一张卡可见 |
| **A4** | R2：圆角 8px、无 32px | `?page=compose-edit`（admin，not-found 态）→ `[...document.querySelectorAll('.aup-action')].map(b=>getComputedStyle(b).borderRadius)` **不含** `"32px"`、**含** `"8px"` |
| **A5** | R3：探针三态 + 结论落实 | 回报必须含 **P0–P3 原始输出**（rect / padding / minHeight / fontSize / borderRadius）与**明确态别（①/②/③）**；**态①/②** → `rect.height >= 24 && rect.width >= 24` 的 DOM 断言 + 实际 computed 值；**态③** → 页面**无改动** + 证据交付 REQ-016（标准免责）；QA 独立复跑同一探针，结论一致 |
| **A6** | 源码静态可核 | `grep -n "fontSize" .aup/pages/admin/compose-edit.aup` → 命中 `:31` 与 `:39` 两行（写法与 `compose.aup:32` 同形）；`grep -n "borderRadius" .aup/pages/admin/compose-edit.aup` → 命中 `:41`（（态①/② 时同一条 `style` 含 padding/minHeight） |
| **A7** | 全仓 gate 标题口径不回退 | `grep -rn "h2 :gate-title" .aup/pages --include=*.aup \| wc -l` = **20**，其中带 `fontSize` = **20**（本轮从 19 → 20，**不再有漏网**） |
| **A8** | Hub 申请流 = CLI 真命令 | 页面渲染文本包含 `node scripts/arcblog-network.mjs hub register --hub-did <did>`；与 `node scripts/arcblog-network.mjs hub --help` 的 Usage 行**逐字一致**（QA 用 `grep -F` 或脚本做包含断言，并把两侧原文贴进报告） |
| **A9** | 关系 id 哈希如实、**无伪造写入** | ① 页面含「id/文件名 = Hub DID 哈希（SHA-256 前 16 位）、界面无法计算」的 en/zh 文案；② **静态反证**：`.aup/pages/ops/hub.aup` 中**不存在**把 `${args.hubDid}` / `${state.*}` 拼进 `hub/registrations/…json` 的写路径（`grep` 命中 0，读路径/文案除外并逐条说明） |
| **A10** | 被收录列表可辨识 + 可退出 | 关系行同时渲染 `relation` / `direction` / `status` / `freshness.state` **原值**；用 **AFS 探针**造一条 `direction=hub`、`relation=indexed` 的记录（先 `.gate-lock`）→ 页面出现该行且方向可辨；该行 **Terminate** 可点且落库（见 A11）；**跑完删除探针记录并证明清理** |
| **A11** | 写动作按 AFS 复核（**不看 toast**） | 真实点击某行 **Approve** → `node scripts/arcblog-network.mjs hub show --hub-did <did>` 的 `relation === "indexed"` 且 `updatedAt` 变化；点击 **Terminate** → `relation === "removed"` 且 `removedAt` 非空；同一会话再点**另一行**仍成功（**互不阻塞**）；若某行失败，页面/记录不被他行影响 |
| **A12** | 每行含 §112 同步字段 | 页面每行出现 `sync.lastSync` / `sync.lastVersion` / `sync.lastError` 的**值或如实占位**；与 `node scripts/arcblog-network.mjs hub list` 输出**逐字段对照一致**（`lastVersion: null` 不得渲染成 `""`/`0`/假版本号） |
| **A13** | guest 越权（负面用例） | 无 cookie 打开 `?page=hub` → **只渲染 gate**（无关系列表、无 `afs-list`、无写控件）；无 cookie 直读 `hub/registrations/*` 被平台**拒绝**（403/401）并把原始响应码贴进报告；页面不存在未登录可触发的写动作 |
| **A14** | 无导航/页面数回归 | `node scripts/arcblog-console-nav.mjs --check` → **pages 19**；`arc dsl lint` 死键门（`npm test` 内）绿；en/zh 键 parity（新增键均在 `hub` 页 `i18n {}` 声明） |
| **A15** | 范围自证 | `git diff --name-only -- scripts world blocklet.yaml docs/ArcBlog-product-technical-spec.md docs/ArcBlog-admin-ui-design.md .web` → **空**（Dev 零越界） |
| **A16** | 浏览器纪律 | 报告给出 sweep 前后 `Target.getTargets` 的 **page target 计数**（复用同一标签页；自开 target 用后关闭），或如实写「未开浏览器 + 原因」 |

**受限未验证（必须写进报告，不得当作已通过）**

- 真实硬件 hover / 真实鼠标点击的部分若用 CDP 合成事件代替 → 如实标注方法。
- 真实 DID Wallet 登录回跳（本机无钱包）→ 只证明 `return_to/cancel_to` 指向真实可渲染页（不是本 REQ 的改动面，但不得声称「已验证登录」）。
- 链上质押列表（§8.3）**未实现、也不在本轮范围**（operator-declared）。
- 若 `direction=hub` 探针记录无法构造（平台拒写）→ 如实登记「被收录列表仅完成静态/文案层验证」，**不得**判 A10 通过。

---

## 4. 依赖

| 依赖 | 状态 |
| ---- | ---- |
| Lead **L-R13-2**（命中区先探针，转发才修）/ **L-R13-3**（只镜像 CLI 真实能力） | ✅ 已裁定（2026-09-28） |
| Lead **L-R13-5**（**Dev 与 UI 串行**：两者都写 `dist/**`） | ✅ 已裁定 → 本 REQ（`task-40`）**必须先完成 build + `arc service restart`**，REQ-016（`task-41`）才能动手 |
| [UI-009](../design/UI-009-v3-contrast-and-visual-debt.md) §6.1–§6.3 + §5 G8（探针前置） | ✅ 已交付（QA-007 复验 A1–A9 全通过） |
| [REQ-014](REQ-014-v3-contrast-and-visual-debt.md) §7.3（R1/R2/R3 裁「下一轮修」） | ✅ 已裁 |
| **REQ-016**（UI）在标准 §3.4 补 D6 判据（`:39` 的 17px 依据） | ⏳ **后置**（UI 在 Dev 之后跑）；**若 Lead 改判 `:39` = 15px → 单属性回改，不影响其它验收** |
| R3 探针 / 页面复核需 `arc blocklet build` + `arc service restart` | ✅ 可执行（Dev 写范围）；**与 REQ-016 串行** |
| QA-008（`task-42`） | ⏳ `blocked_by task-40 + task-41`（两者 complete 才 ready） |
| **spec §15.6 达成标准「不需要离开此页面」与平台能力冲突**（AUP 无哈希原语 → 新关系只能 CLI） | ⚠️ **需 Lead/人类处理**：本轮按 **L-R13-3** 执行「如实 CLI 指引」；建议由 Lead 登记为新的 spec 修订候选（§15.6 加平台边界句），**本轮 PM 不改 spec**（L-R13-4） |

---

## 5. 涉及写范围

| 角色 | 路径 | 说明 |
| ---- | ---- | ---- |
| **Dev（`task-40`）** | `.aup/pages/admin/compose-edit.aup`、`.aup/pages/ops/hub.aup`、`.aup/locales/**`（生成）、`.aup/app.json` / `.aup/wrapper.json`（生成，若受影响）、`dist/**`（`arc blocklet build`） | **不写** `.web/**`、`scripts/**`、`world/**`、`blocklet.yaml`、`docs/**`（含 `docs/team/**`）；改 CLI/记录形态 → **停手上报** |
| **QA（`task-42`）** | `docs/team/test-reports/round-13.md`、`docs/team/bugs/**`、`docs/team/.gate-lock`（临时） | 独立重跑门 + 自造探针 + AFS 复核 + guest 越权；**不采信 Dev 自述** |
| **PM（`task-39` / `task-43`）** | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 规划 + 轮末裁决 |

---

## 6. 完成定义（Dev 回报必须包含）

1. **产物路径**（改动的 `.aup` 页 + 生成的 locales + `dist/**` 变动清单）。
2. **验证命令 + 原始输出**：A1 六条门（含 `diff -r .aup dist/.aup` 与 `diff -r .web dist/.web`）。
3. **R3 探针 P0–P3 原始输出 + 明确态别 + 落实结果**（或「不改 + 证据」）。
4. **DOM 断言原始取值**：A2/A3/A4/A10/A12（含视口、locale、会话身份）。
5. **AFS 复核证据**：A11 的 `hub show` 前后字段（不贴 toast 文本作为唯一证据）。
6. **guest 越权原始响应**（A13）。
7. **浏览器 target 计数**（A16）或「未开浏览器 + 原因」。
8. **受限未验证清单**（§3 末）。

---

## 7. Round 13 结果记录（PM `task-43`，2026-09-28）

**结论：交付通过 + QA-008 独立验证放行**（[test-reports/round-13.md](../../test-reports/round-13.md) 末行 **`VERDICT=pass, BLOCKING=0`**；**无 P0 / 无 P1 / 无未裁决 P2**）。

**① A1–A16 逐条结论（QA 自跑，不采信自述）**

| 组 | 结论 |
| -- | ---- |
| **A1 门（6 条）** | **通过**（validate issues []；`npm test` 28/28 ×2；`arc blocklet build` exit 0，附 1 条既有 pre-render 警告 = O4；`console-nav --check` pages 19；`generate --check` 0 漂移；双向 `diff` 无输出） |
| **A2–A7 `compose-edit` 视觉债** | **通过**（A2 gate h2 **15px**，guest 隔离上下文；A3 not-found h2 **17px** 且全页仅 1 个 h2；A4 唯一 `.aup-action` `borderRadius 8px`、无 32px；A5 命中区 **138.7×29 ≥24×24**；A6 `git diff` 恰 3 行（`:31`/`:39`/`:41`）；A7 全仓 gate 标题 **20/20** 带 `fontSize`，无漏网） |
| **A8–A14 Hub 注册界面** | **通过**（A8 页面 5 条模板命令与 `hub --help` 逐条 IN-HELP；A9 关系 id = `sha256(did)[0:16]` 3 条逐条复算成立 + 静态反证无 `${args.hubDid}` 写路径；A10 `direction=hub` 探针行可辨识、可退出；A11 **真实点击 + AFS 复核** Approve `applied→indexed`、`direction=hub` 行 Terminate `indexed→removed`（`removedAt` 置位、`direction` 保持 `hub`）、其后另一行 Approve 仍成功 = **互不阻塞**；A12 §112 四字段与 `hub list` **4/4 MATCH**；A13 guest 403（3 处私有前缀）/401（写删）+ 公开面 200 对照；A14 pages 19、无导航回归） |
| **A15–A16 范围与纪律** | **通过**（`git diff --name-only -- scripts world blocklet.yaml spec` **空**；每探针 page 计数恒 1、guest context 用后即关） |

**② R3 态别与落实**：**态①** —— `style={padding}` **被 action 转发**（渲染后 `padding: 5px 12px` 生效），`style={minHeight}` **不被转发**（computed `min-height: 0px`）。已按 §4.3 `size=sm` 档 `padding: "5px 12px"` 修到 **138.7×29 ≥24×24**（WCAG 2.5.8）。**更正 Dev 自述**：被丢弃的是**未被转发的键**，**不是整个 `style` 属性**（`styleAttr` 仍含 `border-radius` + `padding`）→ 机制登记 **D30**（Lead 写 `docs/arc-contracts.md`）；「`minHeight` 不转发」本身在 QA 写范围下**无法独立复跑** = **受限未验证（机制）**，态① 的落实已独立验证。

**③ 新增 BUG 与裁决**：**BUG-029（P3，范围外）** = `hub --help` 未列真实可用的 `hub refresh`/`freshness`（`grep -cE` = 0，子命令 exit 0）→ **裁「下一轮修（R14-7）」**；**页面侧无缺陷**（A8 通过），页面按较窄一侧（help）镜像、未把 `hub refresh` 放进可复制列表。另有 **O1–O9 + §0 九条受限未验证 + Dev 4 条范围外发现**，裁决明细见 [backlog](../../backlog.md) 🐞 区「Round 13」。

**④ checklist 第 109 行建议**：**🟡 → ✅**（附 5 条降级 / 缺口登记，见 [backlog](../../backlog.md)「Round 13 checklist 建议」①）→ 计数 ✅78→**79** / 🟡11→**10**（D 组 17→18 ✅ / 7→6 🟡），**由 Lead 落笔**。

**⑤ 受限未验证（如实登记）**：`minHeight` 不转发的机制（QA 写范围）；全量 `npm run test:live`（门规禁止，改跑定向单跑 **15/15**）；真实 DID Wallet 登录回跳（无钱包）；链上质押列表选择 §8.3（operator-declared、页面未声称）；真实硬件 hover；`?page=preview` 合成底；A-ii 跨页覆盖度。

**⑥ 写范围自证**：Dev 只改 `.aup/pages/admin/compose-edit.aup`、`.aup/pages/ops/hub.aup`、生成 locales、`dist/**`；`scripts` / `world` / `blocklet.yaml` / spec **零改动**；**未新增控制台页、未改导航节**（pages 19）。

**⑦ 旁证（过程事实）**：串行契约（**L-R13-5**）成立但属**旁证重组** —— Dev `.aup` 最后写盘 11:21:44 < UI `.web` 11:30:56 < `dist/**` 11:36:13；`arc service status` `Started 2026-09-28T03:35:21.677Z`；QA DOM 探针在运行实例上同时实测到 Dev 与 UI 的改动。
