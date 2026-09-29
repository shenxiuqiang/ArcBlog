# round-24f 测试报告：BUG-066 / BUG-069 / BUG-067 独立复验（R24F 修复窗口）

| 字段 | 值 |
| ---- | -- |
| 轮次号 | round-24f（R24 修复窗口；对应 QA-020 fail 后的 Lead 裁定 L-R24F-1/2/3） |
| 关联 REQ | `docs/team/requirements/REQ-031-round24-console-completion.md`（§3 W3 / §8.1 W4）＋ Lead 裁定 L-R24F-1…4 |
| 被测产物 | `.aup/pages/economy/policy.aup`、`.aup/pages/admin/dashboard.aup`、`.aup/locales/{en,zh}.json`、`scripts/arcblog-dist-secrets.mjs`、`scripts/arcblog-dist-secrets.test.mjs`、`scripts/run-tests.mjs`、`scripts/console-nav.mjs`、`scripts/arcblog-console-nav.mjs`、`scripts/lib/economy.mjs`、`scripts/arcblog-economy.mjs`、`scripts/ui-budget-baseline.json`、`package.json`、`docs/operations-runbook.md` |
| 验证人 | QA（task-104，独立复验；不采信 Dev 自述） |
| 验证时间 | 2026-09-29（工具时间戳见原始输出） |
| 范围 | **仅**判定 BUG-066 / BUG-067 / BUG-069 是否可关闭；BUG-068 明确在窗口外（Lead L-R24F 裁定） |
| 结论 | **R24F 窗口 放行（BUG-066/067/069 均可关闭）**；Round 24 整体仍被未裁决的 BUG-068(P1) 阻断（窗口外，待 PM task-105） |

---

## 0. 结论速览

| 项 | 级别（QA-020 原判） | 复验结论 | 是否可关闭 |
| -- | ------------------- | -------- | ---------- |
| **BUG-066** 非法商品态 UI 可达 | P1 阻断 | **通过**：非法态结构性不可达 + 6/6 敌意强制值 fail-closed 零改动；合法 article / subscription 落库且 `validateProduct` `issues: []` | **可关闭** |
| **BUG-069** 策略卡预设行溢出 | P3 | **通过**：en/zh × 1803×908 / 1512×765 四组视口 `over=0`（两行换行）、子元素 `maxOver=0`、相邻卡 bleed=0、documentElement over=0 | **可关闭** |
| **BUG-067** 构建产物携带密钥 | P1 安全（范围外·既有） | **通过（交付口径）**：两态守卫先红后绿；bare build 复现泄漏（manifest 1030 列出 `node.key`/`.env.local`）→ `npm run build` scrub 后 1028、dist 无密钥；源 `node.key`/`.env.local` 逐字节未动 | **可关闭**（平台侧无排除开关的根因记为残余风险，见 BUG-071） |
| **BUG-068** 策略写路径 no-op | P1 | **未修、未触碰**（窗口外） | **仍开放**，待 PM/Lead 产品决策 |

新增 BUG：**BUG-070（P2，范围外·既有）**、**BUG-071（P3，修复残余/文档门禁）**。两者均**不阻断** R24F 窗口（P2/P3）。

---

## 1. 被测产物

| 产物路径 | 对应交付 | QA 复跑的验证命令 |
| -------- | -------- | ----------------- |
| `.aup/pages/economy/policy.aup` | L-R24F-1（受控 select + 订阅独立路径）、L-R24F-2（预设行 grid） | 浏览器探针 `raw/round-24f/qa24f-bug066.mjs`、`qa24f-ui.mjs layout` |
| `scripts/lib/economy.mjs` | `PRODUCT_TYPES` / `PRODUCT_VISIBILITIES` / `PAYMENT_ADAPTERS` 单一来源 | `node -e` 调 `validateProduct` |
| `scripts/arcblog-dist-secrets.mjs` + `.test.mjs` | L-R24F-3 ①（fast-tier 守卫）②（scrub） | `node scripts/arcblog-dist-secrets.mjs [--check]`、`npm test` |
| `package.json` | L-R24F-3 ②（`scrub:dist-secrets` / `build`） | `npm run build` |
| `docs/operations-runbook.md` | L-R24F-3 ②（runbook 段） | 只读核对（§「Build artifacts must never carry key material (BUG-067)」） |
| `scripts/run-tests.mjs` | 守卫进入 fast tier（36→37） | `npm test` 计数 |
| `.aup/pages/admin/dashboard.aup`、`scripts/console-nav.mjs` | R24 既有改动（21 页零回归） | `console-nav --check`、21 页运行期扫描 |

---

## 2. 逐条验收结论表（Lead 裁定 L-R24F-1/2/3/4 逐条）

| # | 验收标准（Lead 原文摘要） | 结论 | 证据 |
| - | ------------------------- | ---- | ---- |
| L-R24F-1a | 订阅才出现 `periodDays` 且必须正整数 | 通过 | 运行期 DOM：`eType` required SELECT 选项 `["article","membership","digital"]`（无 subscription）；`eSubPeriod` required SELECT 选项 `["7","30","90","365"]`（全正）。`grep -o 'periodDays: "…"'`：`"0"` ×1（非订阅按钮）＋ `"${args.eSubPeriod}"` ×1（订阅按钮）；`type: subscription` 全文 ×1（订阅按钮） |
| L-R24F-1b | `visibility` 必须受控 select 且只有 public/private | 通过 | 运行期 DOM：`eVisibility` SELECT `required=true`，`options=["public","private"]`；强制 `hidden`/空 → value 变 `""` → `data-aup-invalid` 命中且零新增 |
| L-R24F-1c | 提交后读回并用 `scripts/lib/economy.mjs` 的 `validateProduct` 实测通过 | 通过 | article / subscription 各 `delta=1`、11 字段、`literalHits=0`；`node -e validateProduct` → `{"issues":[]}`（两条） |
| L-R24F-1d | 非法组合不可达或被拒 + AFS 零改动 | 通过 | 6/6 负例：`delta=0`、`recordWritten=false`、`invalid=[目标字段,value:""]`；`products` 计数 54→54 |
| L-R24F-2 | 预设按钮行换行/改结构，四组视口 `over=0` | 通过 | 1803/1512 × en/zh：`presetRow.over=0`、`lines=2`、`presetChildMaxOver=0`、`card.over=0`、`siblingBleedMax=0`、`doc.over=0` |
| L-R24F-3-① | fast-tier 守卫（dist 无密钥材料 + manifest 不列出），**先证伪态变红** | 通过 | 假密钥入 dist：`--check` rc=1、`npm test` **36 pass / 1 fail**（守卫 ✖，`actual: ['.env.local','node.key']`）；清掉后 37/37 |
| L-R24F-3-② | 可执行构建后清理（npm script / scrub，写进 runbook） | 通过 | `npm run build` = `arc blocklet build && npm run scrub:dist-secrets`；端到端 `Published 1030` → scrub `1030→1028` → `--check` rc=0；runbook 段存在 |
| L-R24F-3-③ | **绝不删除或移动源 `node.key` / `.env.local`** | 通过 | 前后 `sha256sum` 逐字节相同（`2305e487…` / `98320672…`）；`mtime` 仍为 `Sep 27 16:31`；`assertInside` 运行时断言只允许 dist 内路径 |
| L-R24F-4 | 零链写零资金；运行期生效；`.gate-lock` 先写后删并删 dist 镜像 | 通过 | 全程零链上写；`arc service list --json` `default/pid 31700/Started 2026-09-29T02:07:19.654Z`（与 Dev 记录一致）且新页面运行期生效（探针读到新控件/新布局）；`.gate-lock` 已删、`dist/docs/team/.gate-lock` 不存在 |
| 门 | `validate issues=[]` + `npm test 37/37` + `generate --check` + `console-nav --check pages 21` + build + scrub + `diff -r .aup dist/.aup` | 通过 | 见 §3 |
| 回归 ④ | 21 页每页恰 1 active、无 SESSION INIT FAILED；R21 队列 + R23 分页抽 ≥4 页 | 通过 | 21/21 `active=1`/`aria-current=1`；`sessionFailedAny=[]`；R23 policy/ledger/dashboard/orders 四页 Next 真翻页且行变化；R21 hub 5 入口 + categories 2 入口全在 |

---

## 3. 执行的原始命令与结果摘录

> 原始文件全部在 `docs/team/test-reports/raw/round-24f/`。以下为原样摘录（`…` 表示省略无关行）。

### 3.1 门（自己重跑，未采信 Dev 输出）

```text
$ arc dsl validate --json            # raw/round-24f/01-validate.txt
{ … "path": "/Users/shenxiuqiang/workspace/ArcBlog", "ok": true, "files": 7, "issues": [] }
```

```text
$ npm test                           # raw/round-24f/02-npmtest.txt
✔ dist/ carries no key material, and the scrub removes only the dist copies (BUG-067) (…)
…
ℹ tests 37
ℹ suites 0
ℹ pass 37
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
rc=0
```

```text
$ arc dsl generate --check           # raw/round-24f/03-generate-check.txt
Would generate 0 file(s) (dry-run) — nothing to change
  path: /Users/shenxiuqiang/workspace/ArcBlog
  files: 7
rc=0

$ node scripts/arcblog-console-nav.mjs --check   # raw/round-24f/04-console-nav-check.txt
{ "ok": true, "action": "check", "pages": 21 }
rc=0

$ diff -r .aup dist/.aup ; echo rc=$?            # raw/round-24f/18-diff-src-dist.txt
rc=0
$ diff -r .web dist/.web ; echo rc=$?
rc=0
```

### 3.2 BUG-067 — 两态守卫（先证明会红）

```text
$ node scripts/arcblog-dist-secrets.mjs --check   # 基线：raw/round-24f/06-dist-check-baseline.txt
{ … "ok": true, "files": [], "privateKeyFiles": [], "manifestEntries": [] }
rc=0

$ # 放一份假 node.key + .env.local 进 dist/
$ node scripts/arcblog-dist-secrets.mjs --check   # raw/round-24f/07-dist-check-red.txt
{ … "ok": false, "files": [ ".env.local", "node.key" ], "privateKeyFiles": [], "manifestEntries": [] }
rc=1

$ npm test                                        # 伪态 RED：raw/round-24f/08-npmtest-red.txt
✖ dist/ carries no key material, and the scrub removes only the dist copies (BUG-067) (14.035ms)
ℹ tests 37
ℹ pass 36
ℹ fail 1
  AssertionError [ERR_ASSERTION]: key files inside dist/ (run `npm run scrub:dist-secrets`): .env.local, node.key
    actual: [ '.env.local', 'node.key' ], expected: []
rc=1

$ node scripts/arcblog-dist-secrets.mjs           # 清掉假密钥：raw/round-24f/09-dist-scrub-fakes.txt
{ "action": "scrub", … "removed": [".env.local","node.key"], "manifestRemoved": [], "manifestFilesBefore": 1028, "manifestFilesAfter": 1028 }
rc=0
$ node scripts/arcblog-dist-secrets.mjs --check   # 绿
{ … "ok": true, "files": [], "privateKeyFiles": [], "manifestEntries": [] }
rc=0
$ npm test                                        # 伪态 GREEN：raw/round-24f/10-npmtest-green.txt
ℹ tests 37 / pass 37 / fail 0
rc=0
```

### 3.3 BUG-067 — bare build 复现泄漏 + scrub 清除 + `npm run build` 端到端

```text
$ arc blocklet build                              # 仓库 dist（raw/round-24f/11-repo-build.txt）
Published 1030 file(s) → /Users/shenxiuqiang/workspace/ArcBlog/dist
build rc=0

$ ls -la dist/node.key dist/.env.local
-rw-------@ 1 shenxiang  staff  499  9月 29 10:26 dist/.env.local
-rw-------@ 1 shenxiang  staff  119  9月 29 10:26 dist/node.key

$ python3 -c "…manifest…"
files: 1030
['.env.local', 'node.key']

$ node scripts/arcblog-dist-secrets.mjs --check   # raw/round-24f/12-repo-check-red.txt
{ … "ok": false, "files": [".env.local","node.key"], "manifestEntries": [".env.local","node.key"] }
rc=1

$ node scripts/arcblog-dist-secrets.mjs           # raw/round-24f/13-repo-scrub.txt
{ "action": "scrub", … "removed": [".env.local","node.key"], "manifestRemoved": [".env.local","node.key"],
  "manifestFilesBefore": 1030, "manifestFilesAfter": 1028 }
rc=0
$ node scripts/arcblog-dist-secrets.mjs --check   # raw/round-24f/14-repo-check-green.txt
{ … "ok": true, "files": [], "privateKeyFiles": [], "manifestEntries": [] }
rc=0
```

```text
$ npm run build                                   # runbook wrapper（raw/round-24f/19-npm-build.txt）
> arcblock@0.3.7 build
> arc blocklet build && npm run scrub:dist-secrets
Published 1030 file(s) → /Users/shenxiuqiang/workspace/ArcBlog/dist
…
  "removed": [ ".env.local", "node.key" ],
  "manifestRemoved": [ ".env.local", "node.key" ],
  "manifestFilesBefore": 1030,
  "manifestFilesAfter": 1028
rc=0
$ ls -la dist/node.key dist/.env.local dist/docs/team/.gate-lock
ls: dist/.env.local: No such file or directory
ls: dist/node.key: No such file or directory
ls: dist/docs/team/.gate-lock: No such file or directory
$ node scripts/arcblog-dist-secrets.mjs --check → ok:true, files:[], manifestEntries:[], rc=0
$ python3 … manifest → files: 1028, []
```

> 说明：`--help` 独立核验（`arc blocklet build --help`）只有 `--output` / `--dry-run` / `--clean`，**无任何排除/ignore 开关**，与 Dev 自述一致。另用 `arc blocklet build --output /tmp/qa24f/dist` 做了一次不触碰仓库 `dist/` 的旁证：输出目录里 `node.key`（119 B）与 `.env.local`（499 B）物理存在，manifest 也把两者与 `docs/team/.gate-lock` 一起列出（`raw/round-24f/16-tempout-build.txt`，1037 files）。

### 3.4 BUG-067 — 源密钥完整性（铁律）

```text
$ sha256sum node.key .env.local                   # raw/round-24f/05-sources-before.txt
2305e48729fe914aa9718832c2c77a0cccbecb9ba234daaa6bda198acd34195c  node.key
98320672f04e9271fd94042f74df8605ba88befdb34e9719999f2700e7cf2bbb  .env.local
node.key 1790497894 Sep 27 16:31:34 2026
.env.local 1790497919 Sep 27 16:31:59 2026

$ sha256sum node.key .env.local                   # build+scrub 之后（raw/round-24f/17-sources-after.txt）
2305e48729fe914aa9718832c2c77a0cccbecb9ba234daaa6bda198acd34195c  node.key
98320672f04e9271fd94042f74df8605ba88befdb34e9719999f2700e7cf2bbb  .env.local
node.key 1790497894 Sep 27 16:31:34 2026
.env.local 1790497919 Sep 27 16:31:59 2026
$ diff <before> <after> → SHA256 IDENTICAL
```

### 3.5 BUG-066 — 结构性不可达（运行期 DOM + 源码）

```text
# raw/round-24f/qa24f-bug066.json → steps.controls（运行期真实控件）
{ name: ePid,       tag: INPUT,  required: true }
{ name: eCreator,   tag: INPUT,  required: true }
{ name: eType,      tag: SELECT, required: true, value: "article", options: ["article","membership","digital"] }
{ name: eVisibility,tag: SELECT, required: true, value: "public",  options: ["public","private"] }
{ name: eSubPeriod, tag: SELECT, required: true, value: "7",       options: ["7","30","90","365"] }

$ grep -o 'exec: "/.actions/write"[^}]*args: {path: "[^"]*", mode: [a-z-]*' .aup/pages/economy/policy.aup | sort | uniq -c
   6 {path: "/instance/app/arcblog/economy/policies/active.json", mode: tree-merge
   1 {path: "/instance/app/arcblog/economy/products/${args.eEditId}.json", mode: tree-merge
   2 {path: "/instance/app/arcblog/economy/products/${args.ePid}.json", mode: create
   2 {path: "${args.ePath}", mode: tree-merge
$ grep -c "type: subscription" .aup/pages/economy/policy.aup      → 1（仅订阅按钮）
$ grep -o 'periodDays: "[^"]*"' .aup/pages/economy/policy.aup
   1 periodDays: "${args.eSubPeriod}"        # 仅订阅按钮
   1 periodDays: "0"                          # 仅非订阅按钮
```

⇒ 非订阅按钮的 `type` 取值域不含 `subscription`，订阅按钮的 `periodDays` 取值域不含 0 ⇒ **`subscription + periodDays=0` 没有任何普通 UI 路径**。

### 3.6 BUG-066 — 负例（敌意强制值必须 fail-closed、AFS 零改动）

```text
# raw/round-24f/qa24f-bug066.json（每行：强制值→实际值 / invalid / 记录数变化 / 是否落库）
n1_typeNonVocab        {"forced":"","invalid":"[{\"name\":\"eType\",\"value\":\"\"}]",       "delta":0,"recordWritten":false}
n2_visibilityNonVocab  {"forced":"","invalid":"[{\"name\":\"eVisibility\",\"value\":\"\"}]", "delta":0,"recordWritten":false}
n3_visibilityEmpty     {"forced":"","invalid":"[{\"name\":\"eVisibility\",\"value\":\"\"}]", "delta":0,"recordWritten":false}
n4_periodZero          {"forced":"","invalid":"[{\"name\":\"eSubPeriod\",\"value\":\"\"}]",  "delta":0,"recordWritten":false}
n5_periodNegative      {"forced":"","invalid":"[{\"name\":\"eSubPeriod\",\"value\":\"\"}]",  "delta":0,"recordWritten":false}
n6_periodEmpty         {"forced":"","invalid":"[{\"name\":\"eSubPeriod\",\"value\":\"\"}]",  "delta":0,"recordWritten":false}
```

（每个用例都先用符合 `pattern` 的合法共享字段填表，再只把目标 select 强制置成词表外/0/负数/空；`recordWritten=false` 表示 `arc afs read` 对该 id 返回 `NOT_FOUND`。）

### 3.7 BUG-066 — 正例（合法路径落库 + 仓库校验器实测）

```text
# raw/round-24f/qa24f-bug066.json
pos_article      {"delta":1,"validator":"{\"issues\":[]}","literalHits":0}
  content = {"id":"qa24f-art-1790648905045","creatorDid":"did:blocklet:arcblog","type":"article",
             "contentId":"","priceAmount":"1.50","priceAsset":"USDC","visibility":"public",
             "settlementPolicy":"active","periodDays":"0","createdAt":"…","updatedAt":"…"}   # 11 字段
pos_subscription {"delta":1,"validator":"{\"issues\":[]}","literalHits":0}
  content = { … "type":"subscription", … "periodDays":"30", … }                              # 11 字段
cleanup: countBefore 56 → countAfter 54 ; backToBaseline=true ; products 无 qa24f 残留
targetsAfterFiltered []
```

校验命令（探针内实际执行）：

```bash
node --input-type=module -e "import { validateProduct } from './scripts/lib/economy.mjs'; \
  const rec=JSON.parse(require('fs').readFileSync('<记录JSON>','utf8')); console.log(JSON.stringify({issues:validateProduct(rec)}))"
# → {"issues":[]}   （article 与 subscription 各一次）
```

### 3.8 BUG-069 — 四组视口

```text
# raw/round-24f/qa24f-layout.json
1803x908_en {"presetRow":{"over":0,"cw":698,"sw":698,"h":66,"overflowX":"visible","lines":2},"presetChildMaxOver":0,"card":{"over":0},"siblingBleedMax":0,"accountRowOver":0,"doc":{"over":0,"sh":908,"ch":908},"policyResolved":true}
1803x908_zh {"presetRow":{"over":0,"cw":698,"sw":698,"h":66,"overflowX":"visible","lines":2},"presetChildMaxOver":0,"card":{"over":0},"siblingBleedMax":0,"accountRowOver":null,"doc":{"over":0,"sh":908,"ch":908},"policyResolved":true}
1512x765_en {"presetRow":{"over":0,"cw":575,"sw":575,"h":66,"overflowX":"visible","lines":2},"presetChildMaxOver":0,"card":{"over":0},"siblingBleedMax":0,"accountRowOver":0,"doc":{"over":0,"sh":765,"ch":765},"policyResolved":true}
1512x765_zh {"presetRow":{"over":0,"cw":575,"sw":575,"h":66,"overflowX":"visible","lines":2},"presetChildMaxOver":0,"card":{"over":0},"siblingBleedMax":0,"accountRowOver":null,"doc":{"over":0,"sh":765,"ch":765},"policyResolved":true}
```

对照 QA-020 修复前：`presetRow {"over":44,"cw":698,"sw":742}`、`bleed=14px`、`doc.sw=0`。现在 `over=0` 且按钮行折成 **2 行**（`lines=2`），结构修复生效。`accountRowOver` 在 en 为 0；zh 因探针按英文前缀定位而为 `null`，但**整张策略卡 `card.over=0`** 已把同卡内所有控件（含 CLI 命令行）都限制在卡内，无溢出。

### 3.9 回归 — 21 页 + R21/R23

```text
# raw/round-24f/qa24f-nav.json → steps.summary
{"pagesChecked":21,"activeExactlyOne":21,"ariaExactlyOne":21,"sessionFailedAny":[],"docOverNonZero":[]}
# 21 页逐页：active=1, ariaCurrent=1, sessionFailed=false, docOver=0

# raw/round-24f/qa24f-r21r23.json
pag policy    moved true firstChanged true  Page 1 of 3 -> Page 2 of 3
pag ledger    moved true firstChanged true  Page 1 of 5 -> Page 2 of 5
pag dashboard moved true firstChanged true  Page 1 of 7 -> Page 2 of 7   (orders 列表)
pag orders    moved true firstChanged true  Page 1 of 4 -> Page 2 of 4
pag factory   moved false（该页无分页器，无 Next 可点——非回归）
r21 hub        {"Apply":true,"Index a Studio":true,"Rebuild index":true,"Approve":true,"Intent queue":true}
r21 categories {"Merge into":true,"Delete and migrate to":true}
targetsAfterFiltered []
```

> `worstOver` 在 21 页上恒为同一个 `DIV.aup-view`（334px，文本 = 侧边栏菜单），是**本轮之前就存在**的同一常量，且页面级 `docOver=0`（被祖先裁剪），不是 R24F 引入的回归。

---

## 4. 负面用例

| # | 负面输入/操作 | 期望 | 实际 | 结论 |
| - | ------------- | ---- | ---- | ---- |
| 1 | `Create product` 的 `eType` 强制为 `subscription`（词表外） | 拒绝、零写入 | value→`""`，`data-aup-invalid` 命中 eType，`products` 54→54，`NOT_FOUND` | 通过 |
| 2 | `eVisibility` 强制 `hidden`（词表外）/ 空 | 拒绝、零写入 | 同上，命中 eVisibility，delta=0 | 通过 |
| 3 | `Create subscription` 的 `eSubPeriod` 强制 `0` / `-7` / 空 | 拒绝、零写入 | 同上，命中 eSubPeriod，delta=0 | 通过 |
| 4 | 放一份假 `node.key`+`.env.local` 进 `dist/` | 守卫变红 | `--check` rc=1；`npm test` 36 pass / **1 fail**（守卫 ✖） | 通过 |
| 5 | 用 `npm run build` 走 runbook 路径 | 构建后 dist 无密钥 | `Published 1030` → scrub `1030→1028` → `--check` rc=0，`ls` 无密钥 | 通过 |
| 6 | 直接 `arc blocklet build` 后 `arc blocklet deploy`（不跑 npm test） | （残余风险） | 平台无排除开关，裸 build 仍会复制密钥；仅靠 wrapper/守卫兜底 → 记 **BUG-071** | 不通过（P3 残余） |

---

## 5. 回归

| 测试 | 命令 | 结果 |
| ---- | ---- | ---- |
| 门（validate/generate/console-nav） | 见 §3.1 | pass |
| fast tier（含新守卫） | `npm test` | **37/37 pass** |
| 源码↔dist 一致性 | `diff -r .aup dist/.aup` / `diff -r .web dist/.web` | rc=0 / rc=0 |
| 21 个 console 页运行期 | `qa24f-ui.mjs nav` | 21/21 `active=1`、0 `SESSION INIT FAILED`、`docOver=0` |
| R23 分页 | `qa24f-ui.mjs r21r23` | policy/ledger/dashboard/orders 四页真翻页且行变化 |
| R21 队列入口 | 同上 | hub 5 入口 + categories 2 入口全部存在 |
| 实例洁净 | `arc afs exec …/list`（products） | 54（=轮初基线），无 `qa24f` 残留 |

---

## 6. 新增 BUG 列表

| BUG | 级别 | 标题 | BUG 文件 |
| --- | ---- | ---- | -------- |
| BUG-070 | **P2**（范围外·既有） | `?page=policy` 新建商品把 `periodDays` 写成字符串，而 `world/product.yaml` 声明 `number`、CLI 存数字 | `docs/team/bugs/BUG-070-console-product-perioddays-string-type.md` |
| BUG-071 | **P3**（修复残余） | BUG-067 的守卫/清理不在被文档化的构建入口上强制：`AGENTS.md`/`CLAUDE.md` 仍指向裸 `arc blocklet build`，`--output`/`deploy` 绕过 wrapper 与守卫 | `docs/team/bugs/BUG-071-dist-secret-guard-not-enforced-on-documented-build-paths.md` |

两条都**不阻断** R24F 窗口（P2/P3；BUG-070 无功能中断，BUG-071 有守卫兜底）。

---

## 7. 受限未验证项

| 项 | 原因 | 建议 |
| -- | ---- | ---- |
| `.blockletignore` 是否被平台识别 | 要在仓库根写该文件（越出 QA 写范围），QA 不越界；且 `arc blocklet build --help` 已无任何 ignore 开关，裸 build 实测把 `node.key` 原样复制 | 由 Dev/Lead 在可控分支用 `arc blocklet build` 前后对比验证；当前结论按「不认」保守对待 |
| `arc service restart` 由 QA 复跑 | 会打断共享 `default` 实例与其他成员（R24 QA 已登记为先例） | 以 `arc service list --json`（pid 31700 / Started 2026-09-29T02:07:19.654Z，与 Dev 记录一致）+ 运行期探针读到新控件/新布局作为等价证据 |
| BUG-068 的 ② 策略写路径正例 | 窗口外；本实例 `active.json` 由 CLI 创建，平台 §29.2 拒绝浏览器重写，属产品决策 | 待 PM task-105 裁决（页面创建 / delete+recreate / 队列 worker） |
| 真链 `ocap` 端到端 / 真实资金 | 无链依赖与资金钱包，且本轮铁律零链写零资金 | 不在本轮范围 |
| 修复后产品的结算/续期读侧行为 | 本轮只验证写侧与 `validateProduct`；`periodDays` 字符串类型的影响见 BUG-070 | 若 Lead 判 BUG-070 需修，补读侧回归 |

---

## 8. 放行结论

**结论：R24F 窗口 放行 —— BUG-066 / BUG-067 / BUG-069 三项均可关闭；BLOCKING=0（窗口内）**

- 依据：
  - `arc dsl validate --json` → `issues: []`；
  - `npm test` → **37/37 pass**（含新守卫，先红后绿两态已自证）；
  - `arc dsl generate --check` 0 漂移、`console-nav --check pages 21`、`diff -r .aup dist/.aup` / `.web` rc=0；
  - BUG-066：非法态结构性不可达 + 6/6 敌意负例 fail-closed 零改动 + 两条合法路径落库且 `validateProduct` `issues: []`；
  - BUG-069：四组视口预设行 `over=0`/两行、子元素 `maxOver=0`、相邻卡 bleed=0、整卡 over=0、21 页 `docOver=0`；
  - BUG-067：两态守卫、bare build 复现泄漏、`npm run build` 端到端 1030→1028、源密钥 sha256/mtime 逐字节不变；
  - 无新增 P0/P1（BUG-070/071 为 P2/P3）。
- 阻断项（**窗口内**）：无。
- **窗口外必须同时上报**：**BUG-068（P1）** 仍未修、未触碰，是 Round 24 整体放行的唯一 P1 阻断项，需要 PM 依 task-105 做产品裁决后才能关闭 —— 本报告 **不** 覆盖它，也不因它改变 R24F 三项的关闭判定。
- 备注：R24F 期间 `.gate-lock` 先写后删；`dist/docs/team/.gate-lock` 镜像不存在（构建时锁已临时移出，构建后核验无镜像）；本次 QA 探针仅落在 `raw/round-24f/`，Dev 探针仅落在 `/tmp/r24f*`（未入库），实例无 `qa24f` 残留。

`VERDICT=pass, BLOCKING=0`
