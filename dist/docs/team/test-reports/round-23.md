# round-23 QA 报告 — REQ-030 全列表分页独立验证（`task-97`）

| 字段 | 值 |
| ---- | -- |
| 轮次号 | **Round 23** — QA `task-97`（`blocked_by task-96`，Lead 裁定 L-R23-1…L-R23-6） |
| 日期 | **2026-09-29** |
| REQ | [REQ-030-list-pagination.md](../requirements/REQ-030-list-pagination.md)（判据 A1–A7，Lead 增补 ①–⑤） |
| 被测产物 | 工作区 HEAD `1f6cf09` + Dev `task-96` 未提交改动：21 个 `.aup` 页面（37 处 `afs-list`，37 行 add / 37 行 del）+ `.aup/locales/{en,zh}.json`（各 +2/-2）+ `scripts/arcblog-runtime-ids.test.mjs`（+1 守卫用例）+ `dist/**`（Dev 已 build）；`scripts/ui-budget-baseline.json` **未改** |
| 验证人 | QA（独立复跑；**不采信 Dev 自述**） |
| 方法 | 自建探针 `raw/round-23/qa-r23-pagination.mjs`（CDP `:9333`，**每身份/语言新建 browser context**，admin 用 `login_token` cookie 注入，**单 tab `Page.navigate`**，结束关闭自己的 target）；AFS 一律用原始 `arc afs exec`；证据落 `raw/round-23/**`；**未跑全量 `npm run test:live`** |
| 结论 | **放行（pass）｜阻断项 0** |
| 末行机读 | `VERDICT=pass, BLOCKING=0` |

---

## 0. 结论摘要

| # | 项 | 判定 | 关键证据 |
| - | -- | ---- | -------- |
| ① | 配方复核（受控页码 / pager 点击真的生效） | **通过（真分页）** | 真实 `click()` → URL 出现 `&ledger-list.page=2`、`Page 2 of 5`、首行 id 变化；深链 `/&ledger-list.page=3` 直达第 3 页；末页 `Next disabled=true`；`page=99` 被钳到第 5 页（无空白页） |
| ② | 逐页验收（37 处 / 21 控制台页 + 4 公共页） | **通过** | 37/37 `rendered ≤ pageSize`；9 个 `total>pageSize` 的列表全部有真分页器且可切页；`docScrollH` 恒 908（不随记录数增长） |
| ③ | 数据可达 | **通过** | `economy/ledger 84`、`settlements 38`、`orders 66`、`products 54`、`drafts 46`、`access-grants 30`、`tags/items 22`、`store(products public) 54` 逐页并集 == AFS 全量，`missingIds=[]`，末页含全量最后一条 |
| ④ | 零回归 | **通过** | 21 页各 `data-active=1`/`aria-current=1`、无 `SESSION INIT FAILED`、`scrollWidth-clientWidth=0`；store `filter` 仍下推 `where{visibility=public}` 且与分页共存；heroes `transform+sort`+`clickMode=select` 回填正常；R21 hub / categories 意图队列按钮→AFS→worker 全通（已清理） |
| ⑤ | 门 | **通过** | `validate issues=[]`；`npm test` **36/36**（= 基线 35 + 1 条本轮授权守卫，逐文件核对无删除）；`generate --check` 0 漂移；`console-nav --check pages 21`；build（QA 输出到 `/tmp`，仓库 `dist/` 未被 QA 触碰）成功且 `diff -r .aup dist/.aup`、`diff -r .web dist/.web` 均 rc=0；`.gate-lock` 与 dist 镜像均不存在 |
| ⑥ | UI 预算 | **通过（无静默抬升）** | `scripts/ui-budget-baseline.json` `git diff` 为空；ratchet `regressions vs baseline: 0` |
| ⑦ | 平台边界 / 诚实 | **通过（1 条 P2 平台 UX 陷阱已登记）** | 全仓零使用 `pagination` 原语；无「只截断不给入口」；小/空列表**不渲染**任何分页器；页面文案无「已全量展示/all items」类断言 |

**新增 BUG（均不阻断）**：[BUG-063](BUG-063-pagesize-override-irreversible.md)（P2，平台 UX：选过每页条数后控件消失、无法改回）、[BUG-064](BUG-064-pinned-profile-pagesize-residue.md)（P3，共享 Chrome profile 探针残留 7 个 pageSize 键）、[BUG-065](BUG-065-primitives-md-pagination-contract-drift.md)（P3，`primitives.md:88` 的 `pagination` prop 契约与运行期渲染器不一致）。**无未裁决 P0 / P1。**

---

## 1. 被测产物与 Dev 自述的核验方式

| 产物路径 | Dev 任务 | Dev 自述 | QA 核验方式 |
| -------- | -------- | -------- | ----------- |
| `.aup/pages/**`（21 文件 / 37 处） | `task-96` | `pagination=manual pageSize=N` + 34 个新显式 id | 源码 grep + 运行期 DOM 逐页探针 + 逐页 id/pageSize 对照 |
| `.aup/locales/{en,zh}.json` | `task-96` | ledger 文案改写 | 运行期正文断言（新文案在、旧文案消失） |
| `scripts/arcblog-runtime-ids.test.mjs` | `task-96` | 新增 1 条守卫用例 | HEAD↔now 逐文件 `test(` 计数 + `npm test` |
| `dist/**` | `task-96` | `arc blocklet build` 已同步 | `diff -r .aup dist/.aup`、`diff -r .web dist/.web` + 独立 build 到 `/tmp` 再 diff |
| `scripts/ui-budget-baseline.json` | — | **未改动** | `git diff --stat`（空）+ ratchet 输出 |

> **QA 的 dist 写范围说明**：QA 角色卡不允许写 `dist/**`，因此 `arc blocklet build` **输出到 `/tmp/r23-build2`**（`--output`），再对 `/tmp` 产物与源码/仓库 dist 做 `diff -r`；仓库 `dist/` 本轮未被 QA 改动。build 产物 981 文件、仓库 dist 973 文件（差 8 个 = QA 本轮新增的 `docs/team/test-reports/raw/round-23/**`，Dev 轮末重 build 时自然纳入）。

---

## 2. 逐条验收结论表（A1–A7 / L-R23 ①–⑤）

| # | 验收标准（REQ / Lead 原文要点） | 结论 | 证据 |
| - | ------------------------------- | ---- | ---- |
| A1-1 | 每处列表 `rendered ≤ pageSize`，`ok=false` 数 0 | **通过** | 37 处列表 `rendered>pageSize` = **0**（`06-table.md`） |
| A1-2 | 7 个主犯页改造前后高度对比、无横向溢出 | **通过（用运行期 pageSize 对照替代改造前快照，见 §4 说明）** | ledger 20 行 `ancScrollH 26734` vs 84 行 `69404`；store 12 行 `984` vs 54 行 `4131`；`docScrollH` 恒 908；`docOver=0` 全页 |
| A2-3 | 每处列表有可见可操作翻页入口 | **通过（实质口径；字面口径见 §7 注）** | 9 个 `total>pageSize` 的列表 100% 有 `.aup-list-pager`；其余 28 个 `total≤pageSize` 平台**不渲染**控件（无假入口） |
| A2-4 | 点击真的换页（≥3 个集合，行集必须变化） | **通过** | ledger 真点击 4 次 `Next` + 1 次 `Prev`（URL/行集/页码全变）；其余 8 个集合用深链逐页取证（同一 `manual` 机制的同一 URL 契约） |
| A2-5 | 边界正确：首页 Prev 禁用、末页 Next 禁用 | **通过** | 9/9 集合首末页 `disabled` 正确（§4.2） |
| A3-6 | 页数 == `ceil(total/pageSize)`；各页 id 并集 == 全量；末页含末条 | **通过** | 8 个集合逐页并集 == AFS 全量、`missingIds=[]`、`lastPageHasLast=true`（§5.1） |
| A3-7 | 空集合不报错、不显示假页码 | **通过** | 8 个 0 条集合 `data-empty=true`、无分页器、无报错；小集合（3/54 等）同样无分页器 |
| A4-8 | 门全绿（validate / npm test / generate / build / console-nav / diff） | **通过** | §3 原始输出（`npm test` 为 **36/36**，见 §3.2 基线证明） |
| A4-9 | 21 页各恰 1 个 active、无 `SESSION INIT FAILED` | **通过** | 21/21 `active=1` 且 `aria-current=1`，21/21 `sessionFailed=false`，`docOver=0` |
| A4-10 | 既有列表能力逐条不变（filter / subscribe / transform+sort / select / clickMode / 行内 exec） | **通过** | store RPC `where{field:visibility,eq:public}` 仍下推且 `limit:12` 与分页共存；heroes 升序 + 回填；hub/categories 按钮链路（§6） |
| A4-11 | R21 意图队列零回归（按钮→AFS→worker） | **通过（worker 半程仅在 hub 上做，categories 只做入队）** | hub：`Apply`→确认→`pending` 记录→`network apply`→`status=applied`+注册记录→同页队列免刷新出现→**全部已删**；categories：`Merge into…`→`pending`（未跑 worker，符合禁令）→已删 |
| A4-12 | 不新增 `filter=`/`serverFilters` | **通过** | now 2 命中 == HEAD 2 命中（`store.aup:19` + 一条 i18n 文案） |
| A4-13 | 既有 3 个显式 id 未删未改 + 新 id 进守卫 | **通过** | `cat-intents` / `hub-intents` / `factory-intents` 各 1 命中；37 个 id 全唯一；守卫测试 `every paginated afs-list keeps a stable, unique, explicit id` 在 `npm test` 中通过 |
| A5-14/15 | 允许显式重录基线、禁止静默抬升 | **通过（未改基线）** | `git diff scripts/ui-budget-baseline.json` 为空；未跑 `--write-baseline`（见 §8） |
| A5-16 | 重录后仍全绿 + ratchet 绿 | **通过** | `regressions vs baseline: 0`；`19/22 page(s) over budget` 与 Dev 报告逐值相同（该脚本 `ctrl` 只数 `.aup` 声明行，运行期控件不入账 —— QA 复核 `scripts/arcblog-ui-budget.mjs` 的 `CTRL_LINE` 口径） |
| A6-17 | 有不能成立项时登记边界 + 降级诚实 | **通过** | 全仓 `pagination` 原语 0 使用；无假入口/写死条数；小列表不渲染控件（平台行为） |
| A6-18 | 禁用措辞检查 | **通过** | `grep -niE "all items|complete list|已全量|完整列表"` 在 locales + 全部 `.aup` = **0 命中**；运行期 `forbiddenWording=[]`（en/zh） |
| A7-19 | restart + 复挂 + `/instance` 读证明 + pid 前后 | **受限未验证（QA 侧不重复执行；Dev 侧有原始输出）** | QA 只读复核运行期确实生效（新文案/新分页在线），**未自行 restart**（会打断其他成员/Lead 的验证且非 QA 必需）；Dev 报告记录 pid 6212→8962 |
| A7-20 | 提交前 `.gate-lock` 与 dist 镜像不存在 | **通过** | `ls docs/team/.gate-lock` → No such file；`ls dist/docs/team/.gate-lock` → No such file；`find dist -name .gate-lock` → 0 |
| ① | 配方复核（独立重跑 1–2 条） | **通过** | §4.1–§4.3（真实点击 + 深链 + 负面） |
| ② | 逐页验收（高度/控件/切页/可达/单页合理） | **通过** | §4、§5、`06-table.md` |
| ③ | 零回归（R21 + 行内 action + 公共页 + 21 页） | **通过** | §6 |
| ④ | UI 预算显式 | **通过** | §8 |
| ⑤ | 门 + 清理自证 | **通过** | §3、§9 |

---

## 3. 执行的原始命令与结果摘录

原始输出：`raw/round-23/01-gates.txt`、`02-static.txt`、`03-static2.txt`、`04-copy.txt`、`05-residue.txt`

### 3.1 门

```text
$ arc dsl validate --json
    "pages/theme-bridge/seo/description",
    "pages/theme-bridge/seo/title"
  ],
  "issues": []
}
exit=0

$ npm test
✔ ratchet: no page is worse than scripts/ui-budget-baseline.json (0.132667ms)
ℹ tests 36
ℹ suites 0
ℹ pass 36
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
fast tier passed — this is the gate.

$ arc dsl generate --check
Would generate 0 file(s) (dry-run) — nothing to change

$ node scripts/arcblog-console-nav.mjs --check
  "action": "check",
  "pages": 21
}
```

### 3.2 `npm test` 是 36/36 而不是 35/35 —— 基线未降的逐文件证明

Lead 门写的是 **35/35**，实测 **36/36**。逐文件 `grep -c '^test('`（HEAD vs 现在）：

```text
scripts/arcblog-console-nav.test.mjs  HEAD=7 now=7
scripts/arcblog-hero-carousel.test.mjs HEAD=4 now=4
scripts/arcblog-i18n.test.mjs          HEAD=5 now=5
scripts/arcblog-permissions.test.mjs   HEAD=6 now=6
scripts/arcblog-runtime-ids.test.mjs   HEAD=3 now=4   ← 本轮唯一变化（REQ §7 / A4#13 授权）
scripts/arcblog-theme.test.mjs         HEAD=3 now=3
scripts/arcblog-ui-budget.test.mjs     HEAD=7 now=7
                                      TOTAL HEAD=35 now=36
```

⇒ 36 = 基线 35 + 1 条本轮授权新增守卫（`every paginated afs-list keeps a stable, unique, explicit id`），**无删除、无跳过、无 fail**。判定：门满足（不得低于 35），措辞差异已在此登记，Lead 无需按缺陷处理。

### 3.3 构建一致性（QA 不写 `dist/**`，故 build 到 `/tmp`）

```text
$ arc blocklet build /Users/.../ArcBlog --output /tmp/r23-build2
build exit=0                       # 981 files built
$ diff -r .aup dist/.aup           # 无输出，rc=0
$ diff -r .web dist/.web           # 无输出，rc=0
$ diff -r .aup /tmp/r23-build2/.aup # 无输出，rc=0
$ diff -r .web /tmp/r23-build2/.web # 无输出，rc=0
$ diff dist/.afs/manifest.json /tmp/r23-build2/.afs/manifest.json
# 仅 8 条差异，全部是 QA 本轮新增的 docs/team/test-reports/raw/round-23/**（Dev build 之后才写的）
```

### 3.4 静态范围（`02-static.txt` / `03-static2.txt`）

```text
$ git diff --numstat .aup/pages            # 21 文件，37 行 add / 37 行 del（每处列表恰 1 行）
$ git diff -U0 .aup/pages | grep -v afs-list   # 只有 ledger.aup 的 2 行文案（paging-desc / paging-title）
$ grep -rnE '^\s*pagination\b' .aup --include=*.aup | wc -l   → 0        # 原语零使用
$ 每个 afs-list 声明都带 pagination=manual pageSize=N        → 37/37
$ pageSize 分布：10×19 / 12×4 / 20×14                        → 与 REQ §4 建议值逐行一致（无一处调整）
$ 37 个 id：uniq -d = 空；既有 cat-intents/hub-intents/factory-intents 保留
$ grep -rn 'filter=\|serverFilters' .aup/pages | wc -l       → 2（== HEAD 2）
$ git diff --name-only scripts/ | grep -v runtime-ids        → 空（业务 CLI 零改动）
$ git diff --name-only blocklet.yaml world .web pages agents seed → 空
```

---

## 4. 配方复核（①，A1/A2）

> 探针脚本：`raw/round-23/qa-r23-pagination.mjs`（`paging` / `audit` 阶段）；原始输出：`qa-r23-paging.json`、`qa-r23-audit.json`。admin 身份在**新建 browser context** 中通过注入 `login_token` cookie 获得，未复用共享 profile 的 localStorage。

### 4.1 pager 真点击（DOM `el.click()`，非合成截图）

```text
page1: url=/?page=ledger                       info="Page 1 of 5" rows=20 first=econ-test-order-1790621421633:creator_share.json  Prev=disabled Next=enabled
next1: url=/?page=ledger&ledger-list.page=2     info="Page 2 of 5" rows=20 first=econ-test-rf-order-1790622757396:creator_share.json
next2: url=/?page=ledger&ledger-list.page=3     info="Page 3 of 5" rows=20 first=econ-test-tip-1790622727063:creator_share.json
next3: url=/?page=ledger&ledger-list.page=4     info="Page 4 of 5" rows=20 first=ledger-order-1790621445652:creator_share.json
next4: url=/?page=ledger&ledger-list.page=5     info="Page 5 of 5" rows=4  first=p1-verify-order-1790629114709:creator_share.json  Next=disabled
prev : url=/?page=ledger&ledger-list.page=4     info="Page 4 of 5" first=ledger-order-1790621445652:creator_share.json
```

`?page=ledger` 未被吞掉、行集逐页变化、首末页 `disabled` 正确 ⇒ **受控页码真的生效、pager 点击真的回写**。

### 4.2 深链（不点击，直接用 URL 契约）

```text
/?page=ledger&ledger-list.page=3 → "Page 3 of 5" rows=20 first=econ-test-tip-1790622727063:creator_share.json
/?page=ledger&ledger-list.page=5 → "Page 5 of 5" rows=4  Next=disabled
```

### 4.3 运行期 pageSize 对照（改造前快照不可运行期复现，用同一次运行内的对照代替）

把**平台自渲染**的每页条数选择器设为 `100`（≈ 不分页），再观察：

| 列表 | pageSize=20（本页） | pageSize=100（对照） | 结论 |
| ---- | ------------------- | -------------------- | ---- |
| `ledger-list` 行数 | **20** | **84** | 分页确实在切片 |
| `ledger-list` 内容列 scrollHeight | **26734** | **69404** | 受控（2.6×） |
| `store-list`（公共页）行数 | **12** | **54** | 受控 |
| `store-list` 内容列 scrollHeight | **984** | **4131** | 受控（4.2×） |
| `documentElement.scrollHeight` | **908** | **908** | **不随记录数增长** |

> **诚实说明**：改造前（`auto` 模式）的运行期快照**不可复现**——仓库源码已被本轮改动覆盖，QA 不允许改源码回滚验证。因此 A1-2 的「改造前后对比」用**同一运行期内的 pageSize 对照**（`20` vs `100`）替代，并附静态证据：HEAD 版本 `grep pagination` = 0，且线上 bundle（`aup.bc92de568433b0dc.js`，802492 B，QA 独立下载并 sha256 前缀 `bc92de568433b0dc79aa`）中分页块只在 `Ze>0 && _r>0 && _r>Ze && wt==="manual"` 时构造，`auto` 分支只构造 `.aup-list-load-more`（无限滚动哨兵）。
> 控制台页 `documentElement.scrollHeight` 恒 908 的原因也在此证实：页面是固定高度 + 内部滚动容器（Dev 的解释正确）；公共页同理。

### 4.4 负面用例（≥1 条）

| # | 负面输入/操作 | 期望 | 实际 | 结论 |
| - | ------------- | ---- | ---- | ---- |
| 1 | `?page=ledger&ledger-list.page=99`（越界） | 不空白、不报错、不越界取数 | 钳到末页：URL 被规范化为 `page=5`，`Page 5 of 5`、rows=4、`Next=disabled` | 通过 |
| 2 | `page=0` | 退回第 1 页 | `Page 1 of 5`、rows=20、`Prev=disabled` | 通过 |
| 3 | `page=abc`（非数字） | 退回第 1 页 | 同上 | 通过 |
| 4 | `page=-2`（负数） | 退回第 1 页 | 同上 | 通过 |
| 5 | 游客访问 `?page=saved`（用户私有列表） | 登录门禁，不泄露列表 | `loginGate=true`、`listCount=0` | 通过 |
| 6 | 空集合（`config/hub-intents` 等 8 处） | 空态、无假页码、不报错 | `data-empty=true`、`pager=false`、无 `SESSION INIT FAILED` | 通过 |

静态解释（bundle，QA 独立取样）：`Yt(f,m,w)` 把 offset 钳到 `Math.max(0, ceil(total/pageSize)-1)*pageSize`，`xr` 回写时 `page>1` 才写参数、第 1 页清参数 —— 与上述 1/2/3/4 的观测逐条吻合。

---

## 5. 逐页验收（②）与数据可达（③）

### 5.1 完整逐页清单（37 处 / 21 控制台页 + 4 公共页）

原始：`raw/round-23/06-table.md`（由 `qa-r23-audit.json` + `qa-r23-pub.json` + 源码 pageSize 生成）

| # | 页面 | 列表 id | total | pageSize | 控件(info) | rendered | docScrollH | list scrollH | 能切页 | rendered≤pageSize |
|---|------|---------|-------|----------|-----------|----------|-----------|--------------|--------|-------------------|
| 1 | dashboard | dashboard-content-list | 3 | 10 | - | 3 | 908 | 148 | n/a(all shown) | OK |
| 2 | dashboard | dashboard-orders-list | 66 | 10 | Page 1 of 7 | 10 | 908 | 589 | yes | OK |
| 3 | dashboard | dashboard-agents-list | 0 | 10 | - | 0 | 908 | 103 | n/a(all shown) | OK |
| 4 | posts | posts-published-list | 3 | 20 | - | 3 | 908 | 205 | n/a(all shown) | OK |
| 5 | posts | posts-drafts-list | 46 | 20 | Page 1 of 3 | 20 | 908 | 1498 | yes | OK |
| 6 | pages | pages-published-list | 1 | 20 | - | 1 | 908 | 111 | n/a(all shown) | OK |
| 7 | pages | pages-drafts-list | 0 | 20 | - | 0 | 908 | 103 | n/a(all shown) | OK |
| 8 | heroes | heroes-list | 2 | 12 | - | 2 | 908 | 237 | n/a(all shown) | OK |
| 9 | heroes | heroes-posts-list | 3 | 20 | - | 3 | 908 | 220 | n/a(all shown) | OK |
| 10 | categories | cat-intents | 0 | 10 | - | 0 | 908 | 103 | n/a(all shown) | OK |
| 11 | categories | categories-list | 3 | 10 | - | 3 | 908 | 573 | n/a(all shown) | OK |
| 12 | tags | tags-snapshot-list | 1 | 10 | - | 1 | 908 | 64 | n/a(all shown) | OK |
| 13 | tags | tags-intents-list | 0 | 10 | - | 0 | 908 | 103 | n/a(all shown) | OK |
| 14 | tags | tags-items-list | 22 | 20 | Page 1 of 2 | 20 | 908 | 2082 | yes | OK |
| 15 | operations | operations-hubs-list | 5 | 20 | - | 5 | 908 | 221 | n/a(all shown) | OK |
| 16 | hub | hub-relations-list | 5 | 20 | - | 5 | 908 | 2286 | n/a(all shown) | OK |
| 17 | hub | hub-intents | 0 | 10 | - | 0 | 908 | 103 | n/a(all shown) | OK |
| 18 | hub | hub-index-list | 6 | 20 | - | 6 | 908 | 570 | n/a(all shown) | OK |
| 19 | media | media-intents-list | 0 | 10 | - | 0 | 908 | 103 | n/a(all shown) | OK |
| 20 | media | media-records-list | 0 | 12 | - | 0 | 908 | 103 | n/a(all shown) | OK |
| 21 | agents | agents-grants-list | 0 | 10 | - | 0 | 908 | 103 | n/a(all shown) | OK |
| 22 | orders | orders-list | 66 | 20 | Page 1 of 4 | 20 | 908 | 26622 | yes | OK |
| 23 | orders | orders-policy-list | 1 | 10 | - | 1 | 908 | 36 | n/a(all shown) | OK |
| 24 | policy | policy-products-list | 54 | 20 | Page 1 of 3 | 20 | 908 | 1114 | yes | OK |
| 25 | access | access-grants-list | 30 | 20 | Page 1 of 2 | 20 | 908 | 1084 | yes | OK |
| 26 | ledger | ledger-list | 84 | 20 | Page 1 of 5 | 20 | 908 | 13422 | yes | OK |
| 27 | ledger | ledger-settlements-list | 38 | 20 | Page 1 of 2 | 20 | 908 | 12105 | yes | OK |
| 28 | factory | factory-intents | 6 | 10 | - | 6 | 908 | 699 | n/a(all shown) | OK |
| 29 | general | general-config-list | 3 | 10 | - | 3 | 908 | 384 | n/a(all shown) | OK |
| 30 | general | general-switches-list | 3 | 10 | - | 3 | 908 | 241 | n/a(all shown) | OK |
| 31 | diagnostics | diagnostics-summary-list | 1 | 10 | - | 1 | 908 | 252 | n/a(all shown) | OK |
| 32 | diagnostics | diagnostics-checks-list | 9 | 10 | - | 9 | 908 | 1105 | n/a(all shown) | OK |
| 33 | diagnostics | diagnostics-chain-intents-list | 6 | 10 | - | 6 | 908 | 588 | n/a(all shown) | OK |
| 34 | index(公共) | feed-list | 3 | 10 | - | 3 | 908 | 608 | n/a(all shown) | OK |
| 35 | author(公共) | author-list | 3 | 10 | - | 3 | 908 | 148 | n/a(all shown) | OK |
| 36 | store(公共) | store-list | 54 | 12 | Page 1 of 5 | 12 | 908 | 984 | yes（5/5 页） | OK |
| 37 | saved(公共/用户) | saved-list | 1 | 12 | - | 1 | 908 | 90 | n/a(all shown) | OK |

**汇总**：37 处 / 25 个页面文件（21 控制台 + 4 公共）；`rendered>pageSize` = **0**；有真分页器 = **9**（正好是 `total>pageSize` 的全部：dashboard-orders 66/10、posts-drafts 46/20、tags-items 22/20、orders 66/20、policy-products 54/20、access-grants 30/20、ledger 84/20、ledger-settlements 38/20、store 54/12）。

> **「39 处」口径对账**：`grep -rn afs-list .aup/pages --include=*.aup` = **39 行**，其中 1 行是 `ops/factory.aup` 的注释、1 行是 `ops/media.aup:24` 的 i18n 文案 ⇒ **真实声明 37 处**（与 Dev 口径一致；QA 逐行核对）。

### 5.2 数据可达（逐页 id 并集 vs AFS 全量）

原始：`qa-r23-reach.json`、`qa-r23-pub.json`

| 集合 | total | pageSize | 页数 | 各页行数 | AFS 条数 | 并集 | missingIds | 末页含末条 |
| ---- | ----- | -------- | ---- | -------- | -------- | ---- | ---------- | ---------- |
| `economy/ledger` | 84 | 20 | 5 | 20/20/20/20/4 | 84 | 84 | **[]** | ✅ |
| `economy/settlements` | 38 | 20 | 2 | 20/18 | 38 | 38 | **[]** | ✅ |
| `economy/orders` | 66 | 20 | 4 | 20/20/20/6 | 66 | 66 | **[]** | ✅ |
| `economy/products`（policy 页） | 54 | 20 | 3 | 20/20/14 | 54 | 54 | **[]** | ✅ |
| `drafts`（posts 页） | 46 | 20 | 3 | 20/20/6 | 46 | 46 | **[]** | ✅ |
| `economy/access-grants` | 30 | 20 | 2 | 20/10 | 30 | 30 | **[]** | ✅ |
| `tags/items` | 22 | 20 | 2 | 20/2 | 22 | 22 | **[]** | ✅ |
| `economy/products`（store 页，filter=public） | 54 | 12 | 5 | 12/12/12/12/6 | 54（54 全 public） | 54 | **[]**（且 `wrongVisibility=[]`） | ✅ |

⇒ **分页后无一行为不可达**；页数 == `ceil(total/pageSize)`；首末页边界 `disabled` 9/9 正确。

---

## 6. 零回归（③，A4）

原始：`qa-r23-audit.json`（21 页）、`qa-r23-regress.json`、`qa-r23-storefilter.json`、`qa-r23-cat.json`

| # | 检查 | 命令/动作 | 实测 |
| - | ---- | --------- | ---- |
| 1 | 21 控制台页恰 1 active / 无 SESSION INIT FAILED / 无横向溢出 | 单 tab 逐页 `Page.navigate` | 21/21 `active=1` **且** `aria-current=1`、`sessionFailed=false`、`docOver=0`、`docScrollH=908` |
| 2 | `store` 的 `filter` 仍下推 + 与分页共存 | 游客 context 抓 `/api/afs/rpc` | `{"type":"exec","path":"/.actions/query","args":{"path":".../economy/products","where":{"field":"visibility","eq":"public"},"limit":12}}` —— **where 与 limit 同时存在** |
| 3 | `store` 行集正确 | AFS 逐条读 54 个 product | 54/54 `visibility=public`；12 行全部 ∈ public 集 | 
| 4 | `heroes.aup:146` `transform`+`sort` | 运行期 DOM + AFS 记录 | AFS `sort` = hello 0 / welcome 1；DOM 顺序 Hello→Welcome（升序）；label/description/image 均为 transform 后值 |
| 5 | `heroes.aup:184` `clickMode=select` 回填 | 点击第 1 行 | 点击前 4 个隐藏域全空 → 点击后 `qaTitle="Hello ArcBlog"`、`qaDesc=<summary>`、`qaImage=...`、`qaSlug=hello-arcblog` |
| 6 | R21 **hub** 意图队列（按钮→AFS→worker） | `?page=hub` 填 `did:key:zR23QA…` → 点 `Apply` → 确认 → `node scripts/arcblog-network.mjs apply` | 确认框打开时队列**仍 0 条**（写入被 confirm 门禁挡住）→ 确认后 `config/hub-intents/2026-09-29T00:12:53.955Z.json` `status=pending` → `apply` 退出 0、`status=applied`、`appliedAt`、`elapsedMs=1318`、新建 `hub/registrations/1aa4a991838c629a.json` → **同页 `hub-intents` 列表免刷新出现该行**（`● register … Status applied just now …`）；`node/discovery.json` 前后逐字节相同 |
| 7 | R21 **categories** 意图队列（按钮→AFS） | `?page=categories` 行内填 target → 点 `Merge into…` → 确认 | 记录 `action=merge, from=design, to=zz-r23-qa-merge-target, status=pending, requestedVia=console`；同页 `cat-intents`（已分页列表）实时 0→1；**未跑 worker**（合规） |
| 8 | 行内 action 仍在 | 4 页 DOM | categories `["Merge into…","Delete and migrate to…"]`、posts `["Details","Archive","Remove from public"]`、pages `["Take offline","Remove public copy"]`、media 空列表无行按钮；`docOver=0` |
| 9 | 公共页 `index`/`author`/`store` 渲染 | 游客 context | `feed-list 3/3`、`author-list 3/3`、`store-list 12/54 + Page 1 of 5`，均无登录门禁、无 `SESSION INIT FAILED` |
| 10 | `saved` 私有列表 | admin | `saved-list 1/1` 渲染；游客同页 = 登录门禁（负面用例 §4.4-5） |
| 11 | zh 视图 | 新 zh context，`?page=ledger` | `pageSize=20/20`、`Page 1 of 5`/`Page 1 of 2`、`hasPagingCopy=true`、`forbiddenWording=[]`、`docOver=0` |
| 12 | ledger 文案诚实性 | 运行期正文（en/zh） | 新文案「paged on the page itself / 页面内翻页」在；旧文案「Paging is a CLI decision」**消失**；无「已全量展示」类断言 |

---

## 7. 平台边界与诚实口径（A6 / L-R23-2）

1. **`pagination` 原语全仓零使用（37 处全部走平台原生 `afs-list` 分页器）**——QA 静态复核线上 bundle：`pagination` 渲染器只读 `t.page` / `t.total` / `t.pageSize`（`Math.ceil(total/pageSize)` 内部算页数），token 点击派发 `Fa({nodeId, event:"onChange", data:{page}})`；`current`/`currentPage`/`totalPages` 只出现在内部 token builder。⇒ 见 BUG-065。
2. **A2#3 的字面口径与平台行为冲突（非缺陷，我方口径优先 L-R23-2）**：REQ 原要求「21 页 `hasEntry=false` 数 0」。本部署下 `total≤pageSize` 时平台**根本不渲染**分页器（bundle：`Ze>0 && _r>0 && _r>Ze && wt==="manual"`），28 个列表因此没有入口；给它们补入口 = 造假分页，正是 L-R23-2 的红线。⇒ QA 按**实质口径**判定通过：**9 个 `total>pageSize` 的列表 100% 有真入口，其余列表不隐藏任何一行**。
3. **无假分页三禁**：无「只截断不给入口」（全部重列表都有入口）、无「写死条数」（`Total: N records` 与 `data-aup-list-total` 来自 AFS 响应，84/66/54/46/38/30/22 逐一对上 AFS 实测）、无「点了没反应的入口」（真实点击逐页变化）。
4. **Dev 的 A1 对照方法描述不可复现（已在 BUG-063 记录根因）**：把每页条数选择器设为 `100` 后，该列表 `total≤100`，**整个分页器（含选择器）被平台移除**，无法「再切回」；实测 `at100: pageSize=null, pager=false, localStorage=100`，我的回切调用返回 `no size select`。Dev 报告的数值（26734 / 69404）与 QA 实测**逐值相同**，但其「用选择器切回」的步骤不成立，复原应是程序化写 localStorage（这也解释了共享 profile 里残留的 7 个 `=20` 键，见 BUG-064）。
5. **Q3 路径乙（`pagination` 的 `onChange` 无效果）与 Q2 的运行期对照：QA 受限未验证**——需要临时 `.aup` 探针页，超出 QA 写范围（禁止改源码），故只做静态 bundle 复核（见 §7-1 与 BUG-065）。**建议 Lead 在把该结论写进 `docs/arc-contracts.md §38` 前自行复现一次或明确标注为 Dev 单方运行期证据。**

---

## 8. UI 预算（④，A5）

```text
$ node scripts/arcblog-ui-budget.mjs
…（逐页表，与 Dev 报告逐值一致）
19/22 page(s) over budget (UI standard §2.7.2)
regressions vs baseline: 0
exit=0

$ git diff --stat scripts/ui-budget-baseline.json     # 输出为空 ⇒ 基线未动
```

**新增了什么控件**：`.aup` 源码里**一行都没加**——37 处只改了既有的 `afs-list` 声明行（加 `id` / `pagination=manual` / `pageSize`）。分页器（`<select>` + 2 个按钮 + `Page X of Y` + `Total: N records`）全部由**运行时 DOM 生成**；该脚本的 `ctrl` 指标只数 `.aup` 源码里的 `action` / `input` **声明行**（`scripts/arcblog-ui-budget.mjs` 的 `CTRL_LINE`，QA 已复核），因此运行期分页控件不入账。⇒ **既没有静默抬升，也没有需要重录的基线变化**；如需把运行期控件计入预算，要先改度量口径（另一件事）。

---

## 9. 残留与清理自证

原始：`raw/round-23/05-residue.txt`

```text
$ ls docs/team/.gate-lock        → No such file or directory
$ ls dist/docs/team/.gate-lock   → No such file or directory
$ find dist -name '.gate-lock'   → 0
$ node scripts/arcblog-clean.mjs # 未跑（默认 dry-run 也会列出历史遗留；本轮只按 createdAt/updatedAt 精确清理自己的）

# AFS 逐目录计数 + r23 残留扫描（createdAt/updatedAt ≥ 00:16 的只有 1 条，已删）
config/chain-intents: 6 (未动)   hub/registrations: 5 (已复原)   hub/index: 6
drafts: 46 (复原)   posts: 3   economy/ledger: 84   settlements: 38   orders: 66
products: 54   access-grants: 30   tags/items: 22   categories: 3   heroes: 2   pages: 1
config/hub-intents / category-intents / media-intents / page-drafts / agent-grants: LIST_ERROR（0 条）

# 浏览器
本探针每个阶段报 leftoverByThisRun=[]（target 已关、context 已 dispose）
pinned Chrome 现存 26 个 target 全是会话开始前就存在的（无 ?page=ledger/store/hub/probe 残留）
```

**本轮 QA 对实例的写入仅 3 条，全部已删净**：hub 意图 1 条 + hub 注册记录 1 条 + categories 意图 1 条（另见 §12 的误跑残渣 1 条，也已删）。

---

## 10. 新增 BUG 列表

| BUG | 级别 | 标题 | BUG 文件 |
| --- | ---- | ---- | -------- |
| BUG-063 | **P2** | 每页条数一旦选大（如 100），平台会移除整个分页器，用户无法在页面内改回小页大小（页面被拉长且无入口） | [BUG-063-pagesize-override-irreversible.md](BUG-063-pagesize-override-irreversible.md) |
| BUG-064 | **P3** | 共享 Chrome profile 残留 7 个 `aup-list-pagesize:<id>=20` 探针键（今天与声明值相同，改 pageSize 后会被静默覆盖） | [BUG-064-pinned-profile-pagesize-residue.md](BUG-064-pinned-profile-pagesize-residue.md) |
| BUG-065 | **P3** | `.agents/skills/aup-dsl/references/primitives.md:88` 的 `pagination` prop 契约与运行期渲染器不一致（`current/currentPage/totalPages` 非节点 prop） | [BUG-065-primitives-md-pagination-contract-drift.md](BUG-065-primitives-md-pagination-contract-drift.md) |

---

## 11. 回归测试

| 测试 | 命令 | 结果 |
| ---- | ---- | ---- |
| 快层全量（含 6 个既有套件 + 新守用例） | `npm test` | **pass 36 / fail 0**（HEAD 基线 35 + 1 条授权新用例，逐文件核对无删除） |
| 侧栏生成器 | `node scripts/arcblog-console-nav.mjs --check` | `{"ok":true,"action":"check","pages":21}` |
| 产物漂移 | `arc dsl generate --check` | 0 漂移 |
| DSL 校验 | `arc dsl validate --json` | `issues: []` |
| 构建一致性 | `diff -r .aup dist/.aup` / `diff -r .web dist/.web` | 均无输出，rc=0 |
| UI 预算棘轮 | `node scripts/arcblog-ui-budget.mjs` | `regressions vs baseline: 0` |

> 本轮**未跑**全量 `npm run test:live`（精简轮；用户裁定不做例行门）。

---

## 12. 受限未验证项（**不等于通过**）

| 项 | 原因 | 建议 |
| -- | ---- | ---- |
| Q2/Q3 路径乙：`pagination` 原语的运行期 prop 名与 `onChange` 行为 | 需要临时 `.aup` 对照页；QA 写范围禁止改 `.aup`（Dev 的探针页已删） | QA 已用线上 bundle 静态复核（`page/total/pageSize`，见 BUG-065）；如需运行期定论，由 Lead 在 `docs/arc-contracts.md §38` 落笔前自行复现一次 |
| A7 的 `arc service restart` + 复挂 + pid 前后 | QA 不重跑 restart（会打断其他成员的运行期验证；Dev 已记录 pid 6212→8962） | 只读复核运行期确实生效：新文案 + 新分页在线、`?page=ledger` 真点击换页（§4.1） |
| R21 worker `apply` 半程的**链/网络**队列（`config/chain-intents`、`?page=factory`/`diagnostics` 的链按钮） | 本轮明令禁止对 live `chain-intents` 跑 `run`/`watch`（会触发真实链写）；这些按钮带 confirm 且写入真队列 | 保持「存在性 + 编译 + 不改数据」口径；链上链路在授权轮次验证 |
| 其他页面的 R21 worker apply（media / tags） | 队列为空（0 条），且 apply 会写入业务数据；hub 与 categories 两条链路已覆盖同一机制 | 需要时按 hub 的取证方式补 |
| store `filter` 的**排除**路径（非 public 商品） | 实例内 54/54 商品都是 `visibility=public`，没有可排除样本；QA 不改业务数据造样本 | RPC payload 已证明 `where{visibility=public}` 仍下推（§6-2）；如需判别性验证，需造一条非 public 商品并清理 |

### 12.1 QA 过程事件（主动披露）

执行「统计 HEAD↔now 的测试用例数」时，我误把 `import('./scripts/run-tests.mjs')` 当成纯模块导入；该文件**被导入即执行**，默认 `tier=all`，于是无意中启动了**全量测试（含 live 段）**，约 60s 后被我 `kill`，留下了 1 条 live 测试残渣：

```text
drafts/agent-surface-draft-1790641103467.json  createdAt=2026-09-29T00:18:29.249Z
content.authorDid="did:key:zAgentLive", body="written through the agent surface"   # 与 scripts/lib/doctor.mjs 的测试记录前缀 / arcblog-clean 的 isTestRecordId 一致
```

处理：已 `arc afs exec .actions/delete` 删除，`drafts` 复原为 **46** 条；随后用 `createdAt`/`updatedAt ≥ 00:16` 全目录扫描，**确认只此 1 条**，无其它污染；该次误跑期间**未持有 `.gate-lock`**（违反 §6.1 串行约定），此后未再运行任何 live 测试。
影响评估：**本轮所有 REQ-030 证据的采集时间均早于该误跑**（audit 00:11、paging 00:12、reach 00:14、regress 00:12–00:15），结论不依赖它；误跑被我提前 kill，未产生任何测试结论，也未被采信。

---

## 13. 放行结论

**结论：放行（pass）｜阻断项 0**

- 依据：`arc dsl validate --json` → `issues: []`；`npm test` **36/36**（基线 35 逐文件核对无降，+1 为 REQ §7 授权的守卫）；`arc dsl generate --check` 0 漂移；`node scripts/arcblog-console-nav.mjs --check` pages 21；独立 build（输出 `/tmp`）成功且 `.aup`/`.web` 与 `dist` 逐字节一致；A1–A7 全部有结论，无「未测」遗漏；负面用例 6 条通过；零回归 12 项通过；`regressions vs baseline: 0` 且基线未动；`.gate-lock` 与 dist 镜像均不存在。
- 阻断项：**无 P0 / 无 P1**。新增 BUG-063(P2) / BUG-064(P3) / BUG-065(P3) 交 PM 裁决（建议入 backlog；BUG-065 影响拟写入 `docs/arc-contracts.md §38` 的措辞，**建议 Lead 落笔前先看它**）。
- 备注：
  1. 「39 处」是 grep 行数，**真实声明 37 处**，本轮 37/37 全覆盖；
  2. Lead 门的 `npm test 35/35` 实测为 **36/36**，差异 = 本轮 1 条授权守卫（§3.2），**不是缺陷**；
  3. QA 未改任何源码/测试/`.aup`/`dist`；写入仅 `docs/team/test-reports/**`、`docs/team/bugs/**`、临时 `.gate-lock`（已删）；
  4. 工作区还含**其他成员**的文件（`docs/ArcBlog-feature-checklist.md`、`docs/team/backlog.md`、`docs/team/journal/README.md`、`docs/dsh-workflow-and-ralph.md`、`dist/**` 等），不在 REQ-030 验证范围，QA 未验证、未改动。

`VERDICT=pass, BLOCKING=0`
