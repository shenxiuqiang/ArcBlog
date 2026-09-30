# S2 · 事实审查（qa 对抗式复核）

| 字段 | 值 |
| --- | --- |
| 审查人 | **qa**（独立验证者；未参与撰写、未采信任何自述） |
| 日期 | 2026-09-30 |
| 对象 | ① **5 条高价值平台事实**（Lead 指定，对抗式复核）② 3 条 `PRD-` 的【已实现】标签 ③ 写盘时仍成立的**新增**问题 |
| 被审物基线 | `docs/02-产品需求/` @ **2026-09-30 11:02:37**：`00`=`53d7337a…`、`00a`（新拆分件）=`f7244bb0…`、`01-CNT`=`1ae89bac…`、`02-SITE`=`1b103710…`、`03-NET`=`e907501a…`、`04-ECO`=`33632b0f…`、`05-ID`=`661552e7…`、`06-AGT`=`e18afe88…`、`07-OPS`=`b114dbfe…`、`08-SET`=`ebebcfc1…`、`_提纲`=`ce5b5f5d…`（sha256 前 8 位）；git HEAD `cb8bbb9` |
| 上游 | 已落盘的另一路 [`S2-事实审查.md`](S2-事实审查.md)（`11f1fdab…`，78 行，P0=0/P1=2/P2=4/P3=1）—— **本报告不复述其结论**，只做独立复跑与证伪 |
| 方法 | 只读白名单：`read/grep/sed/wc/test -e`、`arc dsl validate --json`、只读 `arc afs exec .actions/{list,read}`、只读子命令 `arcblog-{economy,roles,doctor}.mjs`、`scripts/run-tests.mjs` 常量、`node -e` 读常量。**零写入、未 build、未 `npm test`、未重启、未链上** |
| 并发提示 | 复核期间被审文件**持续变动**（10:54→11:02 至少 8 次落笔，且新增 `00a-需求模板与验收规范.md`）。**平台事实（源码 / AFS 记录 / CLI 行为）不随文档变动**，故 §1 五条结论不受影响；引用行号一律以本表基线 hash 为准，主笔若再落笔请按 §5 命令复跑 |
| **总结论** | **有条件放行**：5 条事实中 **4 条 agree（完全成立）、1 条部分 agree（细节被证伪）**；3 条【已实现】抽验 **2 条全真、1 条部分（顺序断言不可达）**；**无 P0**。新增 1 条 P1（三套记录对 Studio 给出互斥状态）+ 3 条 P2 + 2 条 P3，全部落在**文档自洽/判据可执行性**层，**无一条推翻承重事实** |

---

## 1. 五条高价值事实 · 对抗式逐条复核

| # | 主张 | 判定 | 一句话依据 |
| :-: | --- | :-: | --- |
| F1 | `arc afs exec` 出错时 exit code 可能为 0 | **agree** | `LIST_ERROR` / `NOT_FOUND` 两条错误路径 `echo $?` 均为 **0**；但**须限定 CLI**：`arcblog-economy access read` 失败时 exit **1** |
| F2 | `node/factories.json` 有两套矛盾子树，引用须指明 `nodes.<role>` | **agree（主张成立）；其修法被证伪（不够）** | 四行原始对照全部吻合；但还有**第三套**记录 `config/roles.json` + `roles status` 与 `nodes.studio` 在同一主题上**互斥** |
| F3 | `scripts/lib/economy.test.mjs` 不存在、真名 `scripts/arcblog-economy.test.mjs`、不在 `FAST_TESTS` ⇒ live | **agree** | MISS / EXISTS / `FAST_TESTS` 十项无 `arcblog-economy` / `run-tests.mjs:243-244` 的 `!isFast` 分支即 live |
| F4 | 宽 glob 命中会**全部来自 `_提纲.md`** | **部分 agree → 细节 disagree** | 命中确实主要来自 `_提纲.md`（47），但 **`01-CNT-内容创作.md:190` 另有 2 命中**（`grep -l` 同时命中两文件）；且该命令**测不到它声称的"无括号"判据** |
| F5 | `arcblog-roles.mjs status` 无 `adapter`/`simulated`/`chainVerified` | **agree** | 全字段实测：仅 `chainVerification`/`declaredRoles`/`statuses[]`/`effectiveCapabilities`/`withheldCapabilities` |

### F1 · `arc afs exec` 的错误退出码 = 0 —— **agree**

```bash
# 错误路径 A：目录不存在（不加 --json）
$ arc afs exec /blocklets/arcblog/.actions/list --args '{"path":"/instance/app/arcblog/paid"}' 2>&1; echo "exit=$?"
LIST_ERROR exec Path not found: /app/arcblog/paid
exit=0

# 错误路径 A'：同一命令加 --json
$ arc afs exec /blocklets/arcblog/.actions/list --args '{"path":"/instance/app/arcblog/paid"}' --json 2>&1; echo "exit=$?"
{ "success": false, "error": { "code": "LIST_ERROR", "message": "Path not found: /app/arcblog/paid" } }
exit=0

# 错误路径 B：单记录不存在
$ arc afs exec /blocklets/arcblog/.actions/read --args '{"path":"/instance/app/arcblog/does-not-exist.json"}' --json 2>&1; echo "exit=$?"
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Path not found: /app/arcblog/does-not-exist.json" } }
exit=0

# 成功对照
$ arc afs exec /blocklets/arcblog/.actions/read --args '{"path":"/instance/app/arcblog/node/factories.json"}' --json 2>&1 | head -3; echo "exit=$?"
{ "success": true, "data": { "id": "factories.json", ...
exit=0
```

**反证尝试（未能推翻，且发现边界条件）**：我试图找一条 `arc afs exec` 的**非 0** 错误退出码来缩小该主张的适用范围 —— 未找到（list/read 两类错误均 0）。**但该规则不能外推到全部 CLI**：

```bash
$ node scripts/arcblog-economy.mjs access read --content econ-test-content-1790621440546 --reader did:key:zEconBuyer; echo "exit=$?"
{"ok": false, "code": "NOT_FOUND", "error": "paid content not found: econ-test-content-1790621440546"}
exit=1
```

⇒ **正确写法（可照抄进 `00`）**：负例判据写 `--json` 的 `success:false` + `error.code`（`LIST_ERROR`/`NOT_FOUND`/`FORBIDDEN`…），**并注明"`arc afs exec` 错误路径 exit 0，勿用 `$?`；`arcblog-*.mjs` 走 exit code"** —— 一句规则覆盖两类工具，避免反向误伤（把 exit=1 的 economy 也判成"退出码不可用"）。

### F2 · `factories.json` 两套子树 —— **agree；但补充的修法不充分（反证如下）**

原始对照（`arc afs exec … read {path:…/node/factories.json}` → `JSON.parse(data.content)`）：

```text
factories.studio {"adapter":"unknown","simulated":null,"chainVerified":false,"adapterSource":"unrecorded","simulationUnknown":true}
factories.hub    {"adapter":"unknown","simulated":null,"chainVerified":false,"adapterSource":"unrecorded","simulationUnknown":true}
nodes.studio     {"adapter":"ocap","simulated":false,"chainVerified":true,"adapterSource":"backfill:req-021-gettx","simulationUnknown":false}
nodes.hub        {"adapter":"mock","simulated":true,"chainVerified":false,"adapterSource":"backfill:req-021-gettx","simulationUnknown":false}
```

主张完全成立 ✅。**但"三处一律改写为 `nodes.<role>`"不足以消除歧义** —— 实例上还有**第三套记录**，对同一主题（Studio 的链上/角色状态）给出**互斥**答案：

```bash
# ① 权威角色记录（admin-only）
$ arc afs exec /blocklets/arcblog/.actions/read --args '{"path":"/instance/app/arcblog/config/roles.json"}' --json
{ "studio": { "lifecycle": { "state": "revoking", "assetId": "asset-test-1", "stakeId": "stake-test-1",
             "revokedAt": "2026-09-29T06:10:49.368Z", "claimableAt": "2026-09-29T06:09:48.893Z" } }, ...,
  "chainVerification": false, "network": "arcblock" }

# ② 角色引擎投影（fail-closed 的唯一执行者）
$ node scripts/arcblog-roles.mjs status
{ "chainVerification": false, "declaredRoles": ["basic"],
  "statuses": [ ..., { "role": "studio", "assetOwned": true, "stakeActive": false,
     "stakeState": "claimable", "active": false, "assetId": "asset-test-1",
     "revokedAt": "2026-09-29T06:10:49.368Z",
     "reason": "stake state is \"claimable\"; chain verification is not wired yet (fail closed, spec §115)" }, ... ] }

# ③ 链事实投影（PRD 今天引用的那个）
nodes.studio → state "acquired", assetId "zjdkuSoywKFkqiGa8c2NJsBhtLnd2tMRjXas",
                revokedAt "", acquireTx/stakeTx/revokeTx/claimTx 四哈希齐全, chainVerified: true
```

**同一时刻、同一实例**：`nodes.studio` = **acquired + chainVerified:true**；`config/roles.json` = **revoking + asset-test-1 + chainVerification:false**；`roles status` = **studio `active:false` / `stakeState:"claimable"`**。

⇒ **正确写法（比落盘报告更进一层）**：`05-ID` 三处（`证据基线`、`PRD-ID-03` A2、`PRD-ID-04` A1）除写明 **`nodes.<role>`** 外，必须同时写明**两份记录的口径分工**：

- `node/factories.json → nodes.<role>` = **链上事实投影**（adapter/simulated/chainVerified/tx 哈希）；
- `config/roles.json` + `roles status` = **能力判定与生命周期的真源**（fail-closed 的唯一执行者）；
- **两者今天不一致**（Studio：`revoking/asset-test-1/chainVerification:false` vs `acquired/chainVerified:true`），因此验收断言**只能各自引用各自真源**，**禁止**写"`roles status` 与 `node/factories.json` 一致"（这正是 `PRD-ID-03` A2 的写法——它把两个**互不相同的事实**要求为"一致"，无论字段名怎么改都不可执行）。补一句基线说明可防止 Stage 6 拿 `nodes.studio.chainVerified=true` 宣布"Studio 已上链"而忽略角色引擎说它不可用。

### F3 · `scripts/lib/economy.test.mjs` 不存在 ⇒ live 套件 —— **agree**（且**已被主笔闭环**）

```bash
$ test -e scripts/lib/economy.test.mjs && echo EXISTS || echo MISSING
MISSING
$ test -e scripts/arcblog-economy.test.mjs && echo EXISTS || echo MISSING
EXISTS
$ grep -n 'arcblog-economy' scripts/run-tests.mjs
(无输出)                      # ⇒ 不在 FAST_TESTS
$ sed -n '243,244p;264p' scripts/run-tests.mjs
  const isFast = (entry) => FAST_TESTS.has(entry.name);
  let selected = tier === 'all' ? all : all.filter((entry) => (tier === 'fast' ? isFast(entry) : !isFast(entry)));
      (tier === 'fast' ? ' (no instance writes)' : ' (writes to the dev instance; serial)') +
```

**agree**：不在 `FAST_TESTS` ⇒ 落 `!isFast` 分支 ⇒ **live**（写共享实例、串行）。改前原文「`npm test` 快层通过（含 `scripts/lib/economy.test.mjs`）」两处皆假。

**复核期间的闭环证据**（基线 `04-ECO:145` 现文）：

```text
- **C1** **定向跑该套件**：`npm run test:file -- scripts/arcblog-economy.test.mjs`（**live 套件**——`arcblog-economy` **不在** `s…
```

⇒ 修法与我方结论一致：**闭合**。

### F4 · "宽 glob 命中全部来自 `_提纲.md`" —— **部分 agree，细节被证伪**

按 `00 §9.2` 字面命令 `grep -oE '`0[13] §[0-9.]+`' docs/02-产品需求/*.md` 复跑（**逐文件计数**）：

```text
_提纲.md                    47
00-需求地图与规范.md          0
01-CNT-内容创作.md            2      ← 反证
02-SITE … 08-SET             0
-------------------------------
总计                        49
$ grep -lE '`0[13] §[0-9.]+`' docs/02-产品需求/*.md
docs/02-产品需求/_提纲.md
docs/02-产品需求/01-CNT-内容创作.md
$ grep -n '`03 §1`' docs/02-产品需求/01-CNT-内容创作.md
190:> **J1-1…J1-10 的逐步骤映射**：按 `00 §9` 第 8 条的 `Jx-y` 定义（`03 §1` 旅程表第 y 行）…
```

- **agree 部分**：宽 glob 确实把**过程稿** `_提纲.md` 拖进判据，门会自判红 —— 该主张的方向与结论成立（落盘报告"glob 太宽"的处置正确）。
- **disagree 部分**：基线 11:02 下**并非全部来自 `_提纲.md`**：`01-CNT:190` 另有 2 命中，`grep -l` 命中**两个**文件（"8 个需求文件命中 0"不再成立；`01-CNT` 在 10:59 后的落笔把该句推翻了）。
- **追加反证（比 glob 更根本）**：该机检的**判据**是"不得有**无括号**命中"，但它给出的命令 `grep -oE '`0[13] §[0-9.]+`'` **只截取引用本身**，看不见后随字符 ⇒ 无论合不合规都输出命中，**永远测不到它声称的判据**。我按判据另写：

```bash
$ grep -rhoE '`0[13] §[0-9.]+`[^（]' docs/02-产品需求/*.md | wc -l
49          # 与上表的 49 相同 —— 仍分不出"合规引用"与"无括号命中"
```

⇒ **正确写法**：拆成两条可自证的机检
① **排除过程稿**：`grep -rhoE '`0[13] §[0-9.]+`' docs/02-产品需求/0[0-9]-*.md`（`00a` 拆分后需含 `0[0-9]-*.md`，或显式 `--exclude=_提纲.md`）；
② **括号判据**（判据必须能用命令表达）：`A = grep -rhoE '`0[13] §[0-9.]+`（' … | wc -l`（带括号）与 `B = grep -rhoE '`0[13] §[0-9.]+`' … | wc -l`（总数）比较，**`A == B` 才算通过**，差值即无括号命中。

> 主笔已在基线 11:02 新增 `00 §9` 第 13 条"**机检不得把过程文件算进判据**"（方向采纳正确）；但需确认①的命令本体已同步收紧、②的判据已改成可表达的写法。

### F5 · `arcblog-roles.mjs status` 无三字段 —— **agree**

```bash
$ node scripts/arcblog-roles.mjs status
{ "ok": true, "path": "/instance/app/arcblog/config/roles.json", "configured": true,
  "chainVerification": false, "declaredRoles": ["basic"],
  "statuses": [ { "role": "basic"|"studio"|"hub", "assetOwned", "stakeActive", "stakeState",
                  "active", "assetId", "stakeId", "revokedAt", "claimableAt", "checkedAt",
                  "configured", "reason" } ],
  "effectiveCapabilities": ["blog.read","blog.write","blog.publish"], "withheldCapabilities": [] }
```

**agree**：输出**没有** `adapter` / `simulated` / `chainVerified`（只有顶层 `chainVerification` 与每角色上列 12 个字段）⇒ `PRD-ID-03` A2"`roles status` 与 `node/factories.json` 的 `adapter`/`simulated`/`chainVerified` 一致"**不可执行**。
**边界条件（对我方也有约束）**：`commandStatus`（`scripts/arcblog-roles.mjs:84-107`）只读 `getRoleConfig()` + `node/profile.json`，**无写调用** ⇒ 可安全用作验收命令；但它**没有**链上事实字段，因此**不能承担任何链上断言**（详见 F2 的第三套记录）。

---

## 2. 附加：3 条 `PRD-` 的【已实现】标签抽验（自己跑）

| # | PRD 断言（基线行） | 复跑输出 | 判定 |
| :-: | --- | --- | --- |
| 1 | `PRD-AGT-02` §1「工具目录实测 **9 read（2 unavailable）/ 4 write / 6 closed**」（`06-AGT:57`） | `read = 9 (unavailable: 2 -> list_studios,get_studio)`；`write = 4`；`closed = 6 (get_orders,get_settlements,get_sales,settle_payment,change_wallet,change_role)`（`scripts/lib/agents.mjs` 的 `AGENT_TOOLS`，共 19 条） | **全真 ✅** |
| 2 | `PRD-OPS-02` §1 + A1「`?page=diagnostics` 列 **9 项**自检，与 `arcblog-doctor.mjs` 权威清单**名称与顺序**一致」（`07-OPS:62`、A1） | doctor `--json` → `count = 9`：`resources, node-profile, node-identity, categories, authorship, space-layout, space-app, de-identification, test-records`；AFS `config/diagnostics/checks` → `success=true count=9`：`authorship, categories, de-identification, node-identity, node-profile, resources, space-app, space-layout, test-records`；页面 `afs-list diagnostics-checks-list` 渲染 `"${entry.content.id}"`，页内行数 9 | **名称 9/9 全对 ✅；「顺序」不成立 ❌** |
| 3 | `PRD-NET-02` §1「关系 id = `sha256(did)` 前 16 位」（`03-NET:64`） | `scripts/lib/network.mjs:25` `import { didHash } from './attribution.mjs'`；`:137` `return didHash(hubDid)`；`scripts/lib/attribution.mjs:38-39` `createHash('sha256').update(str(did)).digest('hex').slice(0, 16)` | **全真 ✅** |

**抽验 2 的反证细节（新增，落盘报告未覆盖）**：OPS-02 A1 要求与权威清单**"名称与顺序"**逐项一致，但页面是 `afs-list`，条目顺序由**记录 id 字母序**决定，而 doctor 的顺序是**检查项执行序**（`resources` 在前）。两者今天**只有名称集合相同、顺序必然不同** ⇒ "顺序"断言**不可达**。

> **正确写法**：A1 改为「**名称集合**与 `arcblog-doctor.mjs` 权威清单一致（9/9，数量取自命令、不硬编码）；**不承诺顺序**」；若确需顺序，必须在检查项记录里落一个显式 `index` 字段并由页面 `sort=` 使用。

---

## 3. 新增发现（落盘报告未覆盖；均为我方独立复跑，基线 11:02:37）

| # | 对象（基线文件:行） | 问题 + 原始输出 | 严重度 | 正确写法 |
| :-: | --- | --- | :-: | --- |
| N1 | `01-CNT:96`（`PRD-CNT-01` §5 依赖） | **同文件内计数自相矛盾**：`:96` 写「`grep` 的 **4 处** `authorDid`」，而 `:52` 与实测都是 **3**。`grep -rn 'authorDid: \$session\.' .aup/pages/` → `compose.aup:168`、`compose.aup:169`、`pages.aup:168` = **3**（`requestedBy: $session.` = **4**） | **P1** | `:96` 改为「`grep` 的 **3 处** `authorDid` + **4 处** `requestedBy`」。**根因**：直接抄了 `S2-03 §5` P-0 行的 `4 处`（调研文件里同一个笔误），未回本 PRD 自己的 `:52` 对账 |
| N2 | `01-CNT:68`（`PRD-CNT-01` 前置门） | **指向不存在的内容**：「一次性登录态探针（P-0…P-5，**判定式见 §6**）」，但该条 `§6 结果记录` 全文只有「未开工…」；P-0…P-5 的**步骤**在 `docs/02-产品需求/` 内**从未写出**（`grep -n 'P-2\|P-3'` 只命中 `:96` 的 P-0/P-1/P-4 引用），唯一出处是 `S2-03 §5` | **P1** | 二选一：① 把 `S2-03 §5` 的 P-0…P-5 步骤**内联**进条目（`docs/README.md §4` 硬规则：**【未验证】必须同时写出验证步骤与判定式**）；② 至少改成「判定式见本节末【未验证】口径；步骤见 [`S2-03 §5`](../../08-其他/调研/S2-03-P0需求深挖-付费闭环与署名.md)」。**不要**写 `§6` |
| N3 | `02-SITE:94/101/102/103`（`PRD-SITE-04` 条目正文） | **固定八节骨架被复制两遍且互相矛盾**：`:94` §4 → `:101` §5+§6+§7 → `:102` **又一个 §4** → `:103` **又一个 §5**+§6+§7+§8。两处 `§5 依赖` 冲突：`:101`「**一次性探针**（只读…不需登录会话）」vs `:103`「**无**」（`00 §6.2`：固定八节，**顺序不可换**） | **P1** | 删掉 `:102-103` 的重复块（旧版残留），只保留 `:94`+`:101` 的「§4 平台边界与【未验证】口径 … §5 依赖 = 一次性探针 … §6/§7/§8」 |
| N4 | 8 个领域文件全部（`01`–`08`） | **`§6/§7` 与规范相反**：`00 §6.2` + `S2-02 §1.3` 都规定 `## 6 写范围 / ## 7 结果记录`，而**8/8** 文件一律写 `**§6 结果记录** … **§7 写范围**`。`for f in 01..08; do grep -oE '\*\*§[67] [^*]*\*\*' "$f" | head -2; done` → 每个文件都是「§6 结果记录 §7 写范围」 | **P2** | 二选一并**一次改齐**：①（推荐）改 8 个文件为 `§6 写范围 / §7 结果记录`；② 或把 `00 §6.2` 正是化为此序，并同步它自己那句「条目 **§7** 只留一行链接 + 结论」 |
| N5 | `00` §9.10 的**需求数机检命令** | **命令返回 47 ≠ 它自己声称的 50**：`grep -c '^| PRD-' docs/02-产品需求/0[1-8]-*.md \| awk -F: '{s+=$2} END{print s}'` → **47**；`grep -o '需求 \*\*[0-9]*\*\*'` → **50**。差额 3 = `\| **PRD-…** \|` 粗体行（`01-CNT:36`、`04-ECO:34`、`04-ECO:41`）被该正则漏掉 | **P2** | 正则改 `grep -cE '^\| \*{0,2}PRD-'`（→ 50），或命令后注明"粗体行需计入" |
| N6 | `00 §9` 条号 / `00 §10 H3` / `06-AGT:25,102` | ① §9 条号**错序**：`286:10.` 之后 `297:13.` 之后才是 `298:9.`（10/13 排在 9 前面）；② `H3` 机检引用 `docs/team/backlog.md`，该文件**不存在**（`docs/team/` 只有 `journal/`、`reviews/`）⇒ 判据不可跑；③ `PRD-AGT-05` 同一文件里 `/llms.txt`（`:25`、`:102`）与 `/p/llms.txt`（`:105`、`:119`）**并存**，而 `:107` B1 又禁止 root 级 HTTP 端点 | **P2**（①③）、**P3**（②） | ① 重排为 1…13；② 建 `docs/team/backlog.md` 或把 H3 指向 `docs/team/journal/`；③ 统一为实测可达的那一个前缀（见 §4 未验证项） |
| N7 | `08-SET:112/124` | 节序颠倒：`### 3.7 本阶段不做：第三语言` 排在 `### 3.6 PRD-SET-06` **之前**（`04-ECO` 在 v0.4 已修同类问题，`08-SET` 未跟上） | **P3** | `3.7` 移到 `3.6` 之后（或改为 `3.7` → `3.6`，条目正文随之改名） |

> **说明**：以上 7 条是我方在**同一基线**上独立复跑得到的、**落盘报告未列**的问题；其中 N1/N2/N3 达 P1，但因**均为文档自洽层、不动需求范围**，不改变"有条件放行"的总结论。基线 11:02 前后主笔仍在落笔，**主笔执行修订前请先按 §5 复跑**（行号会漂）。

---

## 4. 未能验证项 + 原因

| # | 未能验证的断言 | 原因 / 验证方法 |
| :-: | --- | --- |
| 1 | `llms.txt` 的**实际可达前缀**（`/llms.txt` 还是 `/p/llms.txt`） | 需一次只读 HTTP 探测：`curl -s -o /dev/null -w '%{http_code}' http://arcblog.localhost/llms.txt` 与 `.../p/llms.txt`。本轮白名单不含 HTTP 抓取，**不做推断**（N6③ 的分歧以此探测为准） |
| 2 | 页面提交后 `$session.*` 的**真实落库形态**（`PRD-CNT-01` A2/A3/A4） | 需登录态探针 P-0…P-5；本审查**无会话**、不得自行取 cookie。PRD 已标【未验证】✅，但**步骤未写出**（N2） |
| 3 | `?page=media` 页内上传"确实失败" | 两句原文（`media.aup:23`/`:152`）是**页面自述的实测记录**，不是我可复跑的断言；需人工拖拽一次文件。页面代码里 `afs-dropzone` 在 `:150`，`:23`/`:152` 是说明文案 ⇒ 引用可更精确到 `:150` |
| 4 | `npm test` 快层**实测通过** | 白名单不含（会牵涉实例相关套件）；只跑了 `arc dsl validate --json` → `issues: []`（exit 0）。各条 C 组「快层通过」是**目标**不是本轮证据 |
| 5 | 运行期页面渲染（`data-active` 恰 1 个、主题不闪、空态文案） | 需浏览器与登录态；本环境不可行 |
| 6 | `roles status` 与 `nodes.<role>` 谁才是"对"的 | **两者都是各自真源的真实投影**（F2）；"谁对"取决于链上回执，需链上核验 —— 越出只读白名单。本报告的处置是**要求 PRD 不再声称两者一致**，而不是判定谁对 |

---

## 5. 复现命令清单（可直接粘贴）

```bash
cd /Users/shenxiuqiang/workspace/ArcBlog

# F1 —— afs exec 错误退出码（务必不要用管道，管道会吃掉 $?）
arc afs exec /blocklets/arcblog/.actions/list --args '{"path":"/instance/app/arcblog/paid"}' --json; echo "exit=$?"
arc afs exec /blocklets/arcblog/.actions/read --args '{"path":"/instance/app/arcblog/does-not-exist.json"}' --json; echo "exit=$?"
node scripts/arcblog-economy.mjs access read --content econ-test-content-1790621440546 --reader did:key:zEconBuyer; echo "exit=$?"

# F2 —— factories 两套子树 + 第三套记录
arc afs exec /blocklets/arcblog/.actions/read --args '{"path":"/instance/app/arcblog/node/factories.json"}' --json
arc afs exec /blocklets/arcblog/.actions/read --args '{"path":"/instance/app/arcblog/config/roles.json"}' --json
node scripts/arcblog-roles.mjs status

# F3 —— live 套件
test -e scripts/lib/economy.test.mjs || echo "MISSING lib/economy.test.mjs"
test -e scripts/arcblog-economy.test.mjs || echo "MISSING arcblog-economy.test.mjs"
grep -n 'arcblog-economy' scripts/run-tests.mjs || echo "not in FAST_TESTS -> live"

# F4 —— 机检 glob 与括号判据
for f in docs/02-产品需求/*.md; do printf "%-42s %s\n" "$(basename "$f")" "$(grep -oE '`0[13] §[0-9.]+`' "$f" | wc -l | tr -d ' ')"; done
grep -lE '`0[13] §[0-9.]+`' docs/02-产品需求/*.md
grep -rhoE '`0[13] §[0-9.]+`（' docs/02-产品需求/*.md | wc -l   # 带括号数
grep -rhoE '`0[13] §[0-9.]+`'  docs/02-产品需求/*.md | wc -l   # 总数（两者不等即有无括号命中）

# F5 / 抽验
node scripts/arcblog-doctor.mjs --json
arc afs exec /blocklets/arcblog/.actions/list --args '{"path":"/instance/app/arcblog/config/diagnostics/checks"}' --json
node -e "import('./scripts/lib/agents.mjs').then(m=>console.log(m.AGENT_TOOLS.length,m.AGENT_TOOLS.filter(t=>t.kind==='read'&&t.status==='unavailable').map(t=>t.name)))"
grep -n 'didHash' scripts/lib/network.mjs scripts/lib/attribution.mjs

# N1/N2/N5 等
grep -rn 'authorDid: \$session\.' .aup/pages/ | wc -l
grep -n '判定式见' docs/02-产品需求/01-CNT-内容创作.md
grep -c '^| PRD-' docs/02-产品需求/0[1-8]-*.md | awk -F: '{s+=$2} END{print "cmd-total",s}'
grep -o '需求 \*\*[0-9]*\*\*' docs/02-产品需求/00-需求地图与规范.md
```

**纪律确认**：本次复核**只写了本文件**；未改 `docs/02-产品需求/**`、未改源码/测试、未 `git`、未 build、未 `npm test`、未重启实例、未做任何链上或写 AFS 操作。所有 `arc` 调用均为 `.actions/{list,read}` 只读动作；所有 `*.mjs` 调用均为只读子命令（`doctor --json`、`roles status`、`economy access`）。
