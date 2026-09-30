# round-15 测试报告（QA `task-63` 独立验证）

<!-- QA 写入范围：docs/team/test-reports/** 与 docs/team/bugs/**。本报告不含任何源码改动建议以外的动作。 -->

| 字段 | 值 |
| ---- | -- |
| 轮次号 | round-15（精简轮） |
| REQ | [REQ-020](../../team/requirements/REQ-020-toolbar-content-spacing-public.md) · [REQ-020a](../../team/requirements/REQ-020a-console-spacing-model.md) · [REQ-023](../../team/requirements/REQ-023-chain-environment-externalization.md) · [REQ-024](../../team/requirements/REQ-024-factory-template-display-convergence.md) · [REQ-025](../../team/requirements/REQ-025-nft-royalty-research.md)（ROYALTY 分册 + [链事实分册](../../team/requirements/REQ-025-chain-and-factory-facts-research.md) 仅作 URL/行号抽查） |
| 被测产物 | `.web/components/theme-bridge/script.js`（UI-014）· `.aup/pages/ops/factory.aup` + `.aup/locales/{en,zh}.json`（REQ-024）· `scripts/lib/chain.mjs` · `scripts/arcblog-factory.mjs` · `scripts/arcblog-node-nft.mjs` · `scripts/arcblog-node-nft.test.mjs` · `docs/operations-runbook.md` · `CLAUDE.md` |
| 验证人 | QA（`task-63`） |
| 验证时间 | 2026-09-28 |
| 验证对象 | 工作树（未提交）`main` @ 8a5296e + R15 未提交改动；**不采信任何自述数值**，全部自己重跑 |
| 结论 | **放行**（P0/P1 = 0；新增 3 条 P2/P3，均范围外/既有） |

> **环境与纪律**：共享调试 Chrome `:9333`（Chrome/153.0.8010.54）+ `http://arcblog.localhost:4939`（`arc service` up）。
> 浏览器探针**单 tab**：公共页用**自己开的 1 个 context/target**（跑完 dispose），控制台页**复用既有已登录标签页** `1F2B2046…`（`Page.navigate` 换页，**未新建任何 target**）；`pageTargets before/duringMax/after = 2/2/2`（事前浏览器已有 2 个 page；本轮 created=0、disposed=1）。
> 未跑全量 `npm run test:live`（精简轮禁令）；定向 `test:file` 全程持 `docs/team/.gate-lock`，跑完删锁。收尾把共享已登录标签页留在 `/?page=dashboard`。

---

## 1. 门禁（QA 独立重跑，原始输出）

```text
$ arc dsl validate --json
  … "pages/theme-bridge/seo/title"  ],  "issues": []        # exit 0

$ npm test
  ℹ tests 28
  ℹ pass 28
  ℹ fail 0
  fast tier passed — this is the gate.

$ arc blocklet build
  Warning: Pre-render produced no .web-cache/ artifact for 2 built-in route(s) … /p/en/search/, /p/zh/search/  ← 平台内建路由的既有告警，非本轮改动
  Published 574 file(s) → /Users/shenxiuqiang/workspace/ArcBlog/dist

$ diff -r .aup dist/.aup      # 无输出
$ diff -r .web dist/.web      # 无输出

$ node scripts/arcblog-console-nav.mjs --check
  { "ok": true, "action": "check", "pages": 21 }

$ arc dsl generate --check
  Would generate 0 file(s) (dry-run) — nothing to change

$ arc dsl lint                 # exit 0
  WARNING=34  ERROR=0（34 条全为 unreferenced_explicit_id；R14 为 28，本轮新增 5 个高级区块 id + 2 个 state id）
```

**结论：门禁全绿。** `Published 574`（Dev 自报 571；差额 3 = 本轮 QA 新增的 3 个 BUG 文件被 `arc blocklet build` 镜像进 `dist/docs`，非源码差异）。报告落盘后又跑了一次收尾 build，`Published 575`（+本报告），`.aup`/`.web` 双向 diff 仍 IDENTICAL。

新增 i18n 键 en/zh 成对（`npm test` 死键门 + 手动核对）：

```text
factory.advanced en=1 zh=1      factory.advanced-show en=1 zh=1
factory.advanced-hide en=1 zh=1 factory.advanced-note en=1 zh=1
factory.chain-token en=1 zh=1   factory.factory-stake en=1 zh=1
.aup/locales/en.json:793-796 与 .aup/locales/zh.json:793-796 逐键对应；两文件 grep "ABT" = 0
```

---

## 2. ① 间距（REQ-020 / REQ-020a）——独立量测

**测量口径（QA 自定义，两个数都给）**

| 指标 | 定义 |
| ---- | ---- |
| `gap` | 内容槽**根元素**（`[data-mode="shell"]` 的下一个非 iframe 兄弟）`top − header.bottom` |
| `gapPaint` | 内容根内**第一个真正绘制**的元素（自有文本/背景/边框/媒体）`top − header.bottom` |

平台 header 实测高 **48px 固定**（`box = {top:0,bottom:48,w:viewport}`，所有页面一致）。

### 2.1 公共页 4 组普查（guest context，8 页 × en/zh × 1803×908/1512×765 = **32 run**）

| 页面 | `gap`（4 组） | `gapPaint`（4 组） | 四组一致性 | `deOverX` | `deOverY` | `hScrollers` | header `clippedBy` | header 宽−视口 | 页脚在 | 页脚 max-scroll 全可见 | 元素溢出 |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| `/`（hero） | 0 | **20** | 20/20/20/20 | 0 | 0 | 0 | `[]` | 0 | ✓ | ✓ | 0 |
| `/store` | 0 | **20** | 20×4 | 0 | 0 | 0 | `[]` | 0 | ✓ | ✓ | 0 |
| `/posts/hello-arcblog` | 0 | **20** | 20×4 | 0 | 0 | 0 | `[]` | 0 | ✓ | ✓ | 0 |
| `/?page=about` | 0 | **20** | 20×4 | 0 | 0 | 0 | `[]` | 0 | ✓ | ✓ | 0 |
| `/?page=author` | 0 | **20** | 20×4 | 0 | 0 | 0 | `[]` | 0 | ✓ | ✓ | 0 |
| `/pages/page-test-1790504571866` | 0 | **23**（基线 3，见 §2.2） | 23×4 | 0 | 0 | 0 | `[]` | 0 | ✓ | ✓ | 0 |
| `/preview/hello-arcblog` | 0 | **20** | 20×4 | 0 | 0 | 0 | `[]` | 0 | ✓ | ✓ | 0 |
| `/reader/hello-arcblog` | 0 | **20** | 20×4 | 0 | 0 | 0 | `[]` | 0 | ✓ | ✓ | 0 |

首个绘制元素（首页与 reader）：`div.aup-frame#hero-carousel-frame`，`top=68`（=48+20）、`h=497`、`w=1136`、`clippedBy=[]`、内部 iframe `top=69 h=495` → **hero 不与 header 重叠、未被裁切**。

页脚命中区（REQ-020 A2，R14F 修复不得回退）：`.aup-footer-link` ×4，`minH = 28.8px`、`minW = 26.94px`（brand 锚点 `ArcBlog = 65.28×24`）→ **≥24 ✓**，且 `/`、`/store`、`/posts/hello-arcblog`、`/?page=about` 四页逐值相同。

### 2.2 规则归因（独立「有规则 / 无规则」对照，删掉**恰好 1 条** CSS 规则后在原文档内复测）

```text
$ node /tmp/qa-r15-probe.mjs --target guest --pages home=/,pageview=/pages/page-test-1790504571866,about=/?page=about \
    --locales en --viewports 1803x908 --kill-rule
1803x908|en|home     | ON gapPaint 20 pad 20px mb -20px scroller {sh:1427,ch:908,over:519} | killedRules 1 | OFF gapPaint 0  pad 0px scroller {sh:1427,ch:908,over:519} docOverY 0
1803x908|en|pageview | ON gapPaint 23 pad 20px mb -20px scroller {sh:908, ch:908,over:0}   | killedRules 1 | OFF gapPaint 3  pad 0px scroller {sh:908, ch:908,over:0}   docOverY 0
1803x908|en|about    | ON gapPaint 20 pad 20px mb -20px scroller {sh:908, ch:908,over:0}   | killedRules 1 | OFF gapPaint 0  pad 0px scroller {sh:908, ch:908,over:0}   docOverY 0
killedRules[0] = '#aup-display:has(.aup-app-footer:not(.aup-build-info-footer)) .aup-view > [data-mode="shell"] + * { padding-top: var(--space-block,20px); margin-bottom: calc(-1*var(--space-block,20px)); }'
```

- **Δ = 恰好 +20px**，pageview 的 **3px 是该页自身的既有基线**（无规则时也是 3）→ 与 Dev 自报「pageview 3→23」一致，且**独立复现**。
- **`margin-bottom:-20px` 补偿是精确高度中性**：滚动几何（`sh/ch/over`）ON/OFF **逐值相同**，两态都无整页纵向滚动（`deOverY=0`）、页脚仍 max-scroll 全可见 → L-R15-1「任何全局 padding 可能引入整页滚动条/裁切」的顾虑在本实现下**不成立**。

### 2.3 控制台页（**L-R15-1 fallback = (a) 保持 gap 0**）

21/21 页回归（auth，en，1803×908）+ 6 页 × 4 组抽样（dashboard/factory/orders/ledger/general/diagnostics）：

| 断言 | 结果（21/21）+（6×4） |
| ---- | ---- |
| `gapPaint` | **0**（21/21 + 24/24） |
| 内容根 `paddingTop` / `marginBottom` | `0px` / `0px`（规则**未命中**控制台页） |
| `documentElement` 溢出 | `deOverX=0`、`deOverY=0`（45/45） |
| 每页 `[data-active=true]` | 恰 **1**（45/45） |
| `SESSION INIT FAILED` | **无**（45/45） |
| `hScrollers`（真实横滚容器） | `[]`（45/45） |
| header 裁切 | `clippedBy=[]`、header 宽−视口 = 0（45/45） |
| 运行时滚动容器（`#wrapper-view-1`） | 1803：`908/908 over 0`；1512：`765/765 over 0`（**未锁定→未新增滚动**） |
| 内容列自有滚动容器 | 保留（factory 1803：侧栏列 `1021/860 over 161`、内容列 `2196/860 over 1336`） |
| 侧栏底部可达（REQ-020a A3） | factory 1803 `lastBottomAtMax=907.5 ≤ 908` → `reachable=true`；1512 `764.5 ≤ 765` → `true`（diagnostics 同值） |
| 元素级横向溢出 | 每页**恰好 2 条外壳级**溢出，21 页**逐值相同**：1803 `over=302`(cw1200/sw1502) + `334`(cw1136/sw1470)；1512 `156` + `188`。对照页 `?page=ledger` **同值** → 既有外壳现象，**非本页内容**（Dev 自报口径一致） |

`?page=orders` / `?page=ledger` 首屏卡片顺序（R14F 追认不得回退）：`订单 → 订单列表(195)` / `结算与账本 → 账本条目(195)` → **列表卡在前 ✓**。

### 2.4 REQ-020 A1 字面口径偏差（**交 PM §7.3 记录，QA 不擅自判不通过**）

REQ-020 §3.2 字面写「公共页 `gap = firstTop − headerBottom > 0`」。按**内容槽根元素**口径实测 `gap = 0`（内容根 `top = 48`）；按**首个绘制元素**口径实测 `gapPaint = 20 > 0`。二者差一个口径：

- **可视结果满足需求**：header 下沿（y=48）到首个可见内容（y=68）之间有 20px 空白，8 页 × 4 组一致，且规则关闭后回到 0。
- **字面公式在 DOM 根元素上不成立**，因为实现把间距做成了内容根的 `padding-top`（视觉等效），而不是根元素之前的 `margin-top`。
- 若 PM 判「必须按字面口径（根元素 top > 48）」，**同一 REQ 内有等效修法**：把该规则的 `padding-top` 换成 `margin-top`（并保留 `margin-bottom:-20px` 做高度补偿）——**未验证**，需重跑四组公共页 + 21 页控制台回归 + 冷启动；QA 本轮不擅自改（写入范围外）。
- 另附一处**脆弱性**（观察，非缺陷）：`padding-top` 是内容根**内部**间距，若将来某公共页给内容根加背景/卡片底色，底色会从 y=48 起画，视觉间距会被吃掉。当前 8 个公共页 `overN=0`、首绘元素均在 68，无实际影响。

---

## 3. ② 链环境变量化（REQ-023）

### 3.1 A0/A1 解析（真实命令 + 真实输出）

```text
$ node -e "import('./scripts/lib/chain.mjs').then(m=>console.log(JSON.stringify(m.resolveChainOptions())))"
{"adapter":"mock","chainHost":"","chainId":"","network":"mock","tokenId":"","tokenDecimals":18,"mnemonic":"","factoryOwner":""}

$ ARCBLOG_CHAIN_ENV=beta node -e "…resolveChainOptions()…"
{"adapter":"mock","chainHost":"https://beta.abtnetwork.io/api/","chainId":"beta","network":"beta","tokenId":"z35n6UoHSi9MED4uaQy6ozFgKPaZj2UKrurBG","tokenDecimals":18,"mnemonic":"","factoryOwner":""}

$ ARCBLOG_CHAIN_ENV=main node -e "…resolveChainOptions()…"
{"adapter":"mock","chainHost":"https://main.abtnetwork.io/api/","chainId":"main","network":"main","tokenId":"z35nNRvYxBoHitx9yZ5ATS88psfShzPPBLxYD","tokenDecimals":18,…}

$ ARCBLOG_CHAIN_ENV=beta ARCBLOG_CHAIN_HOST=https://probe.example/api node -e "…resolveChainOptions()…"
{"chainHost":"https://probe.example/api","network":"beta","chainId":"beta","tokenId":"z35n6UoH…"}      # 显式覆盖生效，其余仍取 beta 默认

$ ARCBLOG_CHAIN_ENV=bogus node -e "…resolveChainOptions()…"
Error: ARCBLOG_CHAIN_ENV must be one of: beta, main (got "bogus")     exit=1  code:'VALIDATION'   # 不静默落 mock/main
```

- **预设只填默认值**、**显式覆盖优先**、**非法 env 非零退出 + 结构化错误** → A1 三条全部通过。
- 注意（观察，非缺陷）：`ARCBLOG_CHAIN_ENV=beta` 不带 `--adapter ocap` 时 `adapter` 仍是 `mock`（adapter 不属于预设），即「mock 跑在 beta 标签下」；真实链必须显式 `--adapter ocap`，方向安全（不会误发交易）。

### 3.2 A2 唯一来源与零硬编码（逐条 grep，真实计数）

| # | 断言 | 实测 | 结论 |
| - | ---- | ---- | ---- |
| 1 | `grep -rnoE 'beta\.abtnetwork\.io\|main\.abtnetwork\.io' scripts/ .aup/ blocklet.yaml world/` | **4 处，全部在 `scripts/lib/chain.mjs`**：`:73`、`:74`、`:87`（beta，其中 2 处是注释/来源说明）、`:94`（main） | 通过（**口径偏差见下**） |
| 2 | `grep -rnoE '"TBA"\|"ABT"' scripts/ .aup/ blocklet.yaml world/` | **0** | 通过 |
| 3 | `grep -rn 'ABT' .aup/ dist/.aup/` | **0** | 通过 |
| 4 | `grep -rnE '0x[0-9a-fA-F]{6,}' .aup/ dist/.aup/` | **0** | 通过 |
| 5 | `grep -rnE 'beta\.abtnetwork\.io\|main\.abtnetwork\.io\|"TBA"\|"ABT"' world/ blocklet.yaml` | **0** | 通过 |
| 6 | `grep -rn 'mnemonic\|ARCBLOG_CHAIN_MNEMONIC' .aup/ dist/.aup/` | **0** | 通过（无真实助记词） |
| 7 | `config/roles.json` 回退实测 | `resolveChainOptions({adapter:'ocap'},{roleConfig:{studio:{network:'arcblock'}},role:'studio'})` → `network:"arcblock"` | 通过（记录是唯一 record 级回退） |

**口径偏差（任务 ② 的字面 grep 期望 0 在 `scripts/` 不成立）**：任务书写「`grep … scripts/ … 期望 0（除 runbook/CLAUDE 文档示例）」，但 `CHAIN_PRESETS` **按设计**必须持有 beta/main 的 host/chainId/tokenId（L-R15-2「`ARCBLOG_CHAIN_ENV=beta|main` 只填默认值」+ CLAUDE.md「`CHAIN_PRESETS` in `scripts/lib/chain.mjs`」），REQ-023 §3.3 A2 也明确允许「注释 / 示例 URL」命中并逐条解释。故：**`scripts/` 的 4 处 URL 命中是设计内的唯一默认来源，非硬编码缺陷**；真正的判据 A4（`.aup/` + `dist/.aup/`）为 **0**。`.aup/` 页面只读 `node/factories.json` 投影，无链常量。

### 3.3 A3 缺三件套 fail-closed（exit code + 零写入）

```text
$ node scripts/arcblog-factory.mjs create --role studio --adapter ocap          # 无任何 ARCBLOG_CHAIN_*
exit=1  {"ok":false,"code":"VALIDATION",
 "error":"--adapter ocap needs the chain triple (network/chainHost/tokenId): chainHost is missing; tokenId is missing. Set ARCBLOG_CHAIN_ENV=beta|main to fill the defaults, or pass --network / --chain-host / --token-id …"}
（network 未报缺失，因为 config/roles.json 回退提供了它 → 回退路径被实测触发）

$ env -u ARCBLOG_CHAIN_MNEMONIC node scripts/arcblog-factory.mjs create --role studio --adapter ocap \
    --network beta --chain-host https://beta.abtnetwork.io/api/ --token-id z35n6UoH…
exit=1  {"ok":false,"code":"CHAIN_UNAVAILABLE",
 "error":"the real chain adapter needs the ARC libraries and a funded wallet: missing ARCBLOG_CHAIN_MNEMONIC (factory owner mnemonic). …"}

$ ARCBLOG_CHAIN_ENV=beta node scripts/arcblog-factory.mjs create --role studio --adapter ocap   # 与 roles.json 冲突
exit=1  {"ok":false,"code":"VALIDATION",
 "error":"ARCBLOG_CHAIN_ENV=beta conflicts with config/roles.json (network=arcblock): pass the value explicitly (--network / ARCBLOG_CHAIN_NETWORK) or re-run node scripts/arcblog-roles.mjs init --network beta"}

# 零写入证据（三次失败前后）
arc afs exec /blocklets/arcblog/.actions/read --path /instance/app/arcblog/node/factories.json
→ updatedAt 2026-09-27T08:34:45.557Z  adapter ocap  nodes.studio.assetId zjdkuSoywKFkqiGa8c2NJsBhtLnd2tMRjXas   （三次尝试后逐值不变）
```

- **fail-closed 真实成立**：三件套缺失 → `VALIDATION`；有 triple 无助记词 → `CHAIN_UNAVAILABLE`；env 与记录冲突 → `VALIDATION`；**全部 exit=1 且零链写入**。
- 依赖可用（`node_modules/@ocap/{client,wallet,contract,util,types,…}` 存在），所以拿到的是**三件套校验错误**而不是 `CHAIN_UNAVAILABLE`——符合 REQ-023 §3.4 的「以实测错误码为准」。
- **受限**：真实 mainnet/beta 的 host+token 是否真能建厂/acquire 属受限未验证（见 §7）。

### 3.4 A5 mock 旧语义回归（HEAD vs 当前，**逐字节**）

```text
$ git archive HEAD scripts | tar -x -C /tmp/headcheck          # HEAD 版脚本树，不碰工作树
$ node /tmp/headcheck/scripts/arcblog-factory.mjs spec --role studio > head.txt
$ node scripts/arcblog-factory.mjs spec --role studio               > now.txt
$ diff head.txt now.txt            # 无输出
STUDIO IDENTICAL
$ （同法 --role hub）              HUB IDENTICAL

$ node /tmp/headcheck/scripts/arcblog-node-nft.mjs status --role studio → keys = action,adapter,clock,lifecycle,network,ok,onChain,recorded,role,stake
$ node scripts/arcblog-node-nft.mjs status --role studio              → 同一组 keys（相等）
adapter/network：head = mock/mock，now = mock/mock
```

→ A5 通过：`spec` 两个 role 输出**逐字节不变**（`commandSpec` 函数体在 `git diff` 中零改动，仅 usage 文案变化），`status` 形状不变，无 env 时 mock/mock 不变。

### 3.5 A4 页面运行期文案（中性）

`?page=factory` en：`Adapter ocap / Network beta / Mint token z35n…`；zh：`适配器 ocap / 网络 beta / 铸造代币 z35n…`；`Stake per node 1`（无代币符号）。两条 grep（`.aup` + `dist/.aup` 的 `ABT`、`0x…`）均为 **0** → **通过**。

### 3.6 A6/A7 实例卫生与定向 live

```text
$ echo "QA(<task-63>) 2026-09-28T10:05:49Z" > docs/team/.gate-lock   # 落锁（锁文件前后 ls 均有证据）
$ npm run test:file -- scripts/arcblog-node-nft.test.mjs
  ℹ tests 15   ℹ pass 15   ℹ fail 0   (57s)        # 含新增 env 用例：预设默认值、显式覆盖、非法 env、roles.json 回退与冲突、真链缺三件套零写入
$ npm run test:file -- scripts/arcblog-roles.test.mjs
  ℹ tests 18   ℹ pass 18   ℹ fail 0   (24.6s)
$ rm -f docs/team/.gate-lock                          # 锁已删（ls 报 No such file）
未跑 npm run test:live（如实登记）
```

**读测试文件确认新增 env 用例确实存在**：`scripts/arcblog-node-nft.test.mjs:151-219`（`chain environment: presets only fill defaults …`）、`:219-240`（`config/roles.json is the only record fallback and must agree with the preset`）、`:245-253`（三件套缺失 → `VALIDATION` + 逐字缺项信息）、`:339-345`（真链无依赖/无钱包 → `CHAIN_UNAVAILABLE`）。**未新增测试文件**（`scripts/arcblog-factory.test.mjs` 在本仓库**不存在**，`ls` 报 No such file → 任务 ③ 给的那条命令不可执行，改用上述既有文件覆盖）。

**任务书命令纠偏**：`npm run test:file -- scripts/arcblog-factory.test.mjs` → 该文件不存在（`ls: No such file or directory`），factory 用例本来就在 `scripts/arcblog-node-nft.test.mjs`。QA 已按后者的真实文件名执行。

**实例残渣（观察，对应 R14 O-5）**：定向 `test:file` 不像 `test:live` 那样自动清理。

```text
QA 开始前 dry run：found 3   （economy/orders exit-test-…、economy/products exit-test-…、config/mock-chain-test-…）
QA 跑完两次 test:file：found 6（新增 1790591141997 / 1790591074933 两条时间戳）
$ node scripts/arcblog-clean.mjs --confirm   → removed 6
$ node scripts/arcblog-clean.mjs             → found 0, removed 0     # 基线复原
```

另：`config/roles.json`（`/instance/app/arcblog/config/roles.json`）被 roles 套件重写（`updatedAt` → 2026-09-28T10:25:57Z，内容为套件 fixture：`collectionAddress:0xStudioCollection`、`network:"arcblock"`、`assetId:asset-test-1`；`createdAt` 2026-09-23，**fixture 值来自 `scripts/arcblog-roles.test.mjs:42`**），`arcblog-clean.mjs` **不覆盖**该文件 → 这是既有卫生缺口，非本轮引入；它**不影响**真实链投影（`node/factories.json` 全程未变），但会让「设了 `ARCBLOG_CHAIN_ENV` 又不显式 `--network`」的真实链命令多走一层冲突 fail-closed（安全方向）。

---

## 4. ③ Factory 模板（REQ-024）

### 4.1 A2 公钥类字段三态（DOM 断言，en/zh × 两视口，折叠态 + 展开态实测）

| 字段 | 记录里有值 | 默认（折叠）视图 | 展开后「高级 / 技术详情」 | 证据 |
| ---- | ---- | ---- | ---- | ---- |
| `issuer`（工厂主**钱包地址**）、工厂地址 ×2、NFT 地址、owner、stakeAddress | ✓ | **不出现** | 出现，monospace + `copyable` | `[data-aup-id="factory-studio-adv"/"factory-hub-adv"/"factory-node-adv"]` 在折叠态**不在 DOM**（`null`），展开后 `visible=true` |
| tx 哈希 ×4（acquire/stake/revoke/claim） | ✓ | **不出现** | 出现，4 行各占一行 | `factory-node-tx` 折叠态 `null` → 展开 `visible=true`、`over=0` |
| chainHost / tokenId | ✓ | **不出现** | 出现 | `factory-chain-adv`（折叠 `null` → 展开 `Chain host https://beta.abtnetwork.io/api/`、`Mint token z35n6…`） |
| **PK / PEM** | 记录里有（在链上渲染的 SVG 内，见 §4.2） | **不出现** | **不出现**（页面字段列表从不渲染 pk/PEM） | `document.documentElement.outerHTML` 全文检索 `BEGINPUBLICKEY` / `pk -----` = **false**；`bodyPk=false`、`bodyABT=false`、`media`/`input`/`background` 均无命中 |
| 默认视图保留字段 | — | NFT moniker/state、endpoint、region、claimable、factory moniker/stake/capacity、adapter/network、意图队列 | — | 折叠态 `kvRows=8`；展开后 `kvRows=22` |

```text
折叠态（1803×908/en）comps：
factory-node-kv  = "NFT ArcBlogStudioNode #5  Lifecycle acquired  Endpoint https://arcblog.localhost  Region CN-BJ"
factory-chain    = "Adapter ocap  Network beta"
factory-studio-kv= "Moniker ArcBlogStudioNode  Stake per node 1"
factory-hub-kv   = "Moniker ArcBlogHubNode  Capacity (studios) 1000"
adv nodes        = factory-node-adv / factory-node-tx / factory-chain-adv / factory-studio-adv / factory-hub-adv → 全部 ABSENT（visible=$state.open 为假时不进 DOM）
展开（点击 "Show advanced details" / "展开高级详情"）后全部 visible=true，数值为真实记录值，over=0
```

**空值口径**：`?page=orders` / `?page=hub` 的真实空字段（`hubDid`、`settledAt`、`sync.lastSync`）渲染为平台占位 `—`，与记录一致（冷载/reload 逐值相同）→ 「记录里不存在的字段不得凭空出现」通过。

### 4.2 A2 的一个意外发现（**通过，但原因不是收敛策略**）

`?page=factory` 的 NFT SVG 卡由平台渲染成**占位符**，链上 SVG（含 `pk -----BEGINPUBLICKEY-----…` 与 `1 ABT`）**从不进入页面**：

```text
document.querySelector('[data-aup-id="factory-nft-svg"]').outerHTML
=> '<div class="aup-media" data-aup-id="factory-nft-svg"><div class="aup-placeholder">NFT card</div></div>'   （1193×100，dataUriImgs=[]）
记录侧（arc afs exec …/node/factories.json，base64 解码 nodes.studio.svg）确有：
  <text …>{{data.stake}} ABT</text> 与 <text …>pk -----BEGINPUBLICKEY-----MCowBQYDK2VwAyEA+7k5…-----ENDPUBLICKEY-----</text>
```

→ 因此 REQ-024 §3.3 A2「默认视图下不出现 PK / PEM」**通过**（也满足 REQ-023 A4 的运行期口径），但**这是平台占位符的副作用**；同时暴露 §2.1.6「NFT SVG 卡不丢图示能力」在控制台展示面实际不成立（既有、本轮未改该行）→ 立 **BUG-037（P3，范围外/既有）**。

### 4.3 A1/A3 四组零溢出（BUG-035 逐项 after）

| 视口/locale | 内容层 `textOverflow` | `docOver` | `hScrollers` | 唯一溢出元素 | BUG-035 原值 → after |
| ---- | ---- | ---- | ---- | ---- | ---- |
| 1803×908 en | **0** | 0 | `[]` | 2 条外壳（302/334，21 页同值） | tx 4 行 `133/121/120/112` → **0**（折叠态不渲染；展开后 `over=0`） |
| 1803×908 zh | **0** | 0 | `[]` | 同上 | intents `62` → **0**（`factory-intents` over=0，队列 6 条真实记录含 64 位哈希，仍可复制/清空） |
| 1512×765 en | **0** | 0 | `[]` | 2 条外壳（156/188） | NFT 卡 `119` → **0**（`grid-2-view-1` over=0、`maxChildOver=0`） |
| 1512×765 zh | **0** | 0 | `[]` | 同上 | — |

- **BUG-035 的 6 个数值全部归零**（tx 四行 0、intents 0、NFT 卡 0），且 `#factory-node-tx` 4 个哈希行在展开态**每行 sw ≤ cw**（各占一行）。
- **无 allowlist**：修法是页内结构（`gridTemplateColumns:"minmax(0, 1fr)"` 单列，`git diff` 可见），符合 D34 与 arc-contracts §29.8（style 白名单无断行键）。
- 溢出唯一残留是 2 条**外壳级**元素，21 页逐值相同（含对照 `?page=ledger`），公共页为 0 → 既有基线，**不计入本页内容溢出**（与 Dev 自报口径一致）。

### 4.4 A4 零回归

21/21 控制台页：`active=1` 恰一、无 `SESSION INIT FAILED`、`deOverX=0`；`?page=orders`/`?page=ledger` 列表卡在前；公共页（`/`、`/store`、`/posts/hello-arcblog`）`docOver=0` → **通过**。
单 tab 自证：控制台 sweep `pageTargets before=2 / duringMax=2 / after=2`（复用既有已登录标签，**created=0**）；公共 sweep 自开 1 个 context/target，`afterClose=2`（=1 自有 target 已 dispose + 1 既有）。

---

## 5. ④ REQ-025 调研（只读复核）

| # | 检查项 | 结论 | 证据 |
| - | ---- | ---- | ---- |
| 1 | 官方 URL 存在且可抓取 | 通过 | 文档含 4 个官方文档 URL + explorer/store URL；QA 当场重抓 `https://www.arcblock.io/en/docs/blockchain/understanding-nfts/` → **HTTP 200** |
| 2 | 官方原文逐字一致 | 通过 | 「Factory hooks are set and immutable when sending `CreateFactoryTx`」；Blocklet Store 两条 `transferToken` 金额 `4662000000000000000` + `1998000000000000000`（=6.66，70/30，可复算）；「experimental contract」；三条限制（≤ input / receiver 存在于 ledger / token 存在于 ledger）；`ctx.issuer.pk`: public key — **全部在抓取正文中逐字命中** |
| 3 | 仓库 `文件:行号` 证据 | 通过（80 处引用；抽查 5 处全部命中） | `scripts/lib/nft-factory.mjs:224-230`（`hooks[0]` 单次 `transferToken(token, issuerAddress, token.value)`、单一收款人=工厂主、金额=全额）✓；`:269-271`（hooks 强制校验）✓；`scripts/lib/economy.mjs:92-109`（`splitAmount` basis-point 三路）✓；`docs/ArcBlog-nft-factory.md:121`（`acquire_asset_v2`）✓；`:45`（`preMintAsset→acquireAsset`，`wallet: factoryOwner`）✓ |
| 4 | 「我方 payload 有无 hooks」断言复核 | 通过 | `grep -n hooks scripts/lib/nft-factory.mjs` → `:224-230` 构造、`:269-271` 校验；文档 §4.1 表 10 行逐条可复核 |
| 5 | GLofter 不可访问的声明 | 通过（复现） | `curl` 三条 URL 全部 **404**（`api.github.com/repos/ArcBlock/glofter`、`github.com/ArcBlock/glofter`、raw 的 `create-glofter-studio-node-nft-factory.ts`）→ 文档写「未取得该证据、不得凭仓库注释推断」**如实** |
| 6 | 不得有无证据的「链上强制」断言 | 通过 | C1/C2 明确区分「hooks 已实现」与「链上分账未实现」；C3 的「官方支持多收款人」有官方 URL + 附录原文；C10/U1–U7 如实登记未证（hook 在我方 beta 路径是否执行、官方无回滚/退款反做表述） |

**结论：REQ-025（ROYALTY）为合规的只读调研产物**：有官方 URL、有 `文件:行号`、无越界的「链上强制分账」断言、零真实链交易（QA 本轮亦零交易，只做 HTTP GET 与 `curl` 状态码）。附带一致性发现见 BUG-038（`docs/ArcBlog-nft-factory.md:112` 把 beta 原生代币写成 ABT，与官方 TBA 冲突）。

---

## 6. 负面用例

| # | 负面输入/操作 | 期望 | 实际 | 结论 |
| - | ---- | ---- | ---- | ---- |
| 1 | `ARCBLOG_CHAIN_ENV=bogus` | 非零退出 + 结构化错误 + 不静默落 mock/main | exit=1，`code:VALIDATION`，`must be one of: beta, main (got "bogus")` | 通过 |
| 2 | `--adapter ocap` 无三件套 | 非零退出 + 零写入 | exit=1 `VALIDATION`（列出缺失键）+ `factories.json` 逐值不变 | 通过 |
| 3 | 有三件套、无 `ARCBLOG_CHAIN_MNEMONIC` | 非零退出 + 零写入（不得发交易） | exit=1 `CHAIN_UNAVAILABLE`；校验在任何网络调用之前（`scripts/lib/chain.mjs:555`） | 通过 |
| 4 | `ARCBLOG_CHAIN_ENV=beta` 与 `config/roles.json`（`network:arcblock`）冲突 | fail-closed，不得混环境 | exit=1 `VALIDATION` + 明确修法提示 | 通过 |
| 5 | 空值不得编造 | 记录里没有的字段走平台 `—` | `?page=orders` 的 `hubDid`/`settledAt`、`?page=hub` 的 `lastSync/lastVersion/lastError` 均为 `—`（冷载=reload） | 通过 |
| 6 | 记录**有**值却显示空（冷启动） | 应显示值 | **不通过** → BUG-036（P2，范围外/既有） | 见 §8 |

---

## 7. 受限未验证项（如实登记）

| # | 项 | 原因 | 建议 |
| - | -- | ---- | ---- |
| U1 | 真实链端到端（beta/main 预设打到真 host、`create`/`acquire` 在新代码下成功） | L-R15-4 禁任何真实链交易 + 本机无资金钱包 | 在有资金与授权的环境按 runbook 演练；本轮只验到 `VALIDATION`/`CHAIN_UNAVAILABLE` 的 fail-closed |
| U2 | main 的 `tokenDecimals=18` | 由 `scripts/lib/nft-factory.mjs:23` + beta 实测推断，未在 main 实测 | main 首次操作前用 `ensureToken` 回读核验 |
| U3 | 「预设 main 的 host/tokenId 打真 mainnet」 | 同上；本轮只验证解析值等于 `CHAIN_PRESETS.main` | 同上 |
| U4 | hook 在我方路径是否执行、一条串内多 `transferToken` 语义、退款无链上反做 | 官方文档无对应表述 + 本轮禁交易（REQ-025 §9 U1–U7） | 保持 REQ-025 的受限清单，勿升级为「已验证」 |
| U5 | 真实硬件 hover/滚动惯性、真实 dark 模式切换、无头渲染差异 | 无头 Chrome + 固定主题 | 人工抽查；本轮 dark/tone 未逐页验证 |
| U6 | BUG-036 的**机制**（`fields=[… value:"${state.x}"]` 是否挂载时只求值一次） | 只复现了症状，未做最小平台实验 | Dev 做「同 document 内 propBind 落地前后渲染」的最小实验，结论写进 arc-contracts |
| U7 | `arc blocklet build` 的 `/p/en/search/`、`/p/zh/search/` 预渲染告警 | 平台内建路由，与本轮改动无关 | 保持登记（本轮未判为本 REQ 范围） |

---

## 8. 新增 BUG

| BUG | 级别 | 标题 | 范围 | 文件 |
| --- | ---- | ---- | ---- | ---- |
| BUG-036 | **P2** | 冷启动首载 `?page=factory`/`?page=operations` 的 propBind 数值全部为 `—`（reload 恢复） | 范围外/既有 | [BUG-036](../bugs/BUG-036-cold-load-projection-values-empty.md) |
| BUG-037 | **P3** | `?page=factory` 的 NFT SVG 卡渲染平台占位符，链上 SVG 从不显示 | 范围外/既有 | [BUG-037](../bugs/BUG-037-factory-nft-svg-placeholder.md) |
| BUG-038 | **P3** | `docs/ArcBlog-nft-factory.md` 真实链示例与三件套/代币符号口径漂移 | 范围外/文档 | [BUG-038](../bugs/BUG-038-nft-factory-doc-chain-env-drift.md) |

**无 P0**。**无新增 P1**（BUG-035 已在本轮关闭；QA 逐项复测 6 个数值全部归零）。三条新 BUG 均**不是本轮改动引入的回归**：BUG-036/037 的代码行在 `git diff` 中是未改动上下文（且 `?page=operations` 本轮未改），BUG-038 是文档漂移（文档不在 Dev 写范围，Dev 已自报）。

---

## 9. 放行结论

| 项 | 结论 |
| -- | ---- |
| 门（validate issues=[] / npm test 28/28 / build 574 / `.aup`+`.web` 双向 diff IDENTICAL / console-nav 21 / generate 0 漂移 / lint 0 error） | **全绿**（原始输出见 §1） |
| REQ-020 A0–A5 | 有明确结论：A0 通过、A1 通过（**可视口径**，字面口径偏差已登记，见 §2.4）、A2 通过、A3 通过、A4 通过、A5 通过（2/2/2 + created=0） |
| REQ-020a A0–A3 | 通过：控制台 **保持 gap 0** 有反证证据（pad 0px、`908/908` 与 `765/765` 未锁定、shell/sidebar 底边未越界、注入式全局方案未采用）+ 21 页 × 2 视口 × 2 locale 的 `deOver=0` + 侧栏底部可达 |
| REQ-023 A0–A8 | 通过（A2 的 `scripts/` grep 字面期望 0 与设计冲突，已按 A2 的允许项逐条解释；A4 在 `.aup/`+`dist/.aup/` 为 0） |
| REQ-024 A0–A6 | 通过（A2 的 PK/PEM 断言由 DOM 全文检索证实；BUG-035 六项逐项归零；高级展开态字段不丢、可复制、零溢出） |
| REQ-025（ROYALTY + 链事实） | 通过（官方 URL HTTP 200 + 逐字核对 + 80 处 `文件:行号` 抽查 + GLofter 404 复现 + 无越界断言） |
| 负面用例 | ≥6 条，5 条通过、1 条转 BUG-036（P2，范围外） |
| 回归 | 21/21 控制台页 + 8 公共页 × 4 组 + 定向 live（node-nft 15/15、roles 18/18）+ HEAD/now 逐字节对照；无新增失败 |
| 无未裁决 P0/P1 | **P0=0、P1=0** |
| 探针与锁 | `.gate-lock` 已删；共享已登录标签页留在 `/?page=dashboard`；`pageTargets=2`（= 事前值；本轮自建 target 已 dispose）；实例残渣 `--confirm` 清除 6 条、复查 `found 0`；探针脚本在 `/tmp/qa-r15-*.mjs`（不写入仓库源码/设计目录） |

**结论：放行。**

- 依据：门禁全绿；REQ-020/020a/023/024/025 的每条验收标准都有明确结论且无未测遗漏；无 P0、无 P1；三条新增 BUG 为 P2/P3 且均为范围外/既有。
- 阻断项：**无**。
- 给 PM/Lead 的 3 个待裁量点（不阻断本轮）：
  1. **REQ-020 §7.3 字面口径**：`gap`（内容根元素）= 0 vs `gapPaint`（首个绘制元素）= 20；建议按可视口径记「通过」，若坚持字面口径则修法 = 该规则 `padding-top`→`margin-top`（未验证）。
  2. **BUG-036（P2）**：是否新立 REQ 修冷启动空值（会同时影响 `?page=operations`，且是 A0 探针口径的隐患）。
  3. **BUG-037（P3）/ BUG-038（P3）**：NFT SVG 占位符是否登记为平台事实（若平台修好渲染，SVG 内的 `pk` / `ABT` 会立刻变成 REQ-024 A2 / REQ-023 A4 的真缺陷，需先决定链载荷是否保留）；`docs/ArcBlog-nft-factory.md` 的 network/TBA 漂移建议下轮加入写范围。
- 提交前提醒：**不要 `git add -A`**（`docs/dsh-workflow-and-ralph.md`、`dist/docs/**` 镜像含本轮 QA/UI/Dev 文档）。`dist/**` 已由 QA 的收尾 `arc blocklet build` 同步（`Published 575`，`.aup`/`.web` 双向 diff 仍 IDENTICAL）。

VERDICT=pass, BLOCKING=0
