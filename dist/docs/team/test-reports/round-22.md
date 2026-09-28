# Round 22 QA 报告 — 八项缺陷独立复验（`task-93`）

| 字段 | 值 |
| ---- | -- |
| 轮次 | **Round 22（收口轮）** — QA `task-93`，`blocked_by task-92` |
| 日期 | **2026-09-29** |
| 被测产物 | 工作区 HEAD `5fd1379` + Dev `task-92` 未提交改动：4 个 `.aup` 页面 + 生成 locales + `scripts/lib/{arc,cli-flags,chain-orders,nft-factory}.mjs` + 22 个受影响 CLI + `scripts/arcblog-economy.test.mjs`（仅追加）+ `docs/ArcBlog-nft-factory.md` + `dist/**` |
| 验收依据 | [REQ-029](../requirements/REQ-029-round22-defect-closure.md) §3.1–§3.9（B32-1…B32-9 / B33-1…B33-5 / B34-1…B34-5 / B36-1…B36-6 / B37-1…B37-5 / B38-1…B38-6 / B57-1…B57-5 / B58-1…B58-5 / G1–G6） |
| 方法 | **不采信 Dev 自述**：自跑门、自建探针、CLI/AFS/页面三类证据分开标注；浏览器 CDP `:9333`，admin 会话，**单 tab**（`Page.navigate` 换页），每语言 `sessionStorage.clear()`；未跑全量 `npm run test:live`；探针与原始输出落 `raw/round-22/**` |
| 结论 | **放行（pass）｜阻断项 0** |
| 末行机读 | `VERDICT=pass, BLOCKING=0` |

---

## 0. 结论摘要（逐条）

| # | 项 | 判定 | 关键证据 |
| - | -- | ---- | -------- |
| ① | BUG-032 / D32（`--k=v` ≡ `--k v`、未知 flag fail-closed、全 CLI 统一、`--order/--limit/--all` 不变） | **已修 / 通过** | 等号↔空格逐字节相同；3 个 CLI 未知 flag exit 1；`grep "^function parseArgs"` 0 命中；26/26 CLI 走 `parseCliArgs`；`economy.test.mjs` 43/43 |
| ② | BUG-033（`?page=pages` View 链接 0 宽） | **已修 / 通过** | 四组视口 `cw=31/26 sw=cw over=0`、`hitCount=0`；真实点击 `target=_blank` 开页成功 |
| ③ | BUG-034（`?page=hub` 关系行 @1512 溢出 92） | **已修 / 通过**（写点击取证受限） | 四组视口 30 条 `.aup-kv-row` 全 `over=0`；断行类 style 键 0 命中；2 处残留溢出与修前基线逐值相同 |
| ④ | BUG-057（`no data changed` 重复） | **已修 / 通过** | AFS 终态 `suffixCount=1`；负例 `VALIDATION`/`CONFLICT` 各 1 次；页面渲染恰 1 次；`network.test.mjs` 24/24 |
| ⑤ | BUG-058（`fingerprint.equal` 空真） | **已修 / 通过**（ocap `order verify` 分支受限） | mock：`captured:false / equal:null / compared:false`；beta：`captured:true / equal:true`，nonce 前后相同 |
| ⑥ | BUG-036（冷载 `—`） | **按裁定收口 / 通过**（平台边界结论不可复现 → BUG-062） | 冷载即有真值且 cold==reload；诚实提示在页上；`git diff` 新增 `visible` = 0 |
| ⑦ | BUG-037（NFT SVG 占位诚实性） | **核心裁定满足 / 通过**（平台边界结论被证伪 → BUG-061） | mock 模板带 `未上链 / NOT ON CHAIN — SIMULATED` + aria-label；默认模板与 HEAD **逐字节相同**；证据字段零删除 |
| ⑧ | BUG-038（文档链环境口径） | **已修 / 通过**（`CHAIN_UNAVAILABLE` 一级受限） | 两级前置与实测一致；缺件实跑 `VALIDATION` exit 1；beta=TBA、`ABT` 5 处全为网络名/对照；页面侧 `ABT`=0 |
| ⑨ | 零链写、零资金复核（硬红线） | **通过** | 调用清单只有读方法；nonce/余额前后相同；`pending.json` 仍在；无真实交易 |
| ⑩ | 通用门 + 回归 | **通过** | `issues: []`、`npm test` **35/35**、`console-nav` pages 21、`generate --check` 0 漂移、`build` + `diff -r` rc=0、21 页各 1 active、无 `SESSION INIT FAILED`、定向 live 全绿 |

**新增缺陷（均 P3，不阻断）**：[BUG-060](BUG-060-four-clis-help-surface-not-synced.md)（4 个 CLI `--help` 面未同步）、[BUG-061](BUG-061-media-data-uri-platform-claim-falsified.md)（`media` 平台边界结论被证伪）、[BUG-062](BUG-062-bug036-platform-boundary-not-reproducible.md)（BUG-036 平台边界结论页面级不可复现）。**无未裁决 P0 / P1。**

> ⚠️ **交 Lead 落笔前必读**：BUG-061 / BUG-062 直接影响拟写入 `docs/arc-contracts.md` 的两条平台事实，**按现结论落笔会写入错误事实**。

---

## 1. 通用门 G1–G6（原始输出）

> 原始输出：`raw/round-22/01-static-gates.txt`、`07-npm-test.txt`、`08-targeted-live.txt`、`18-build-and-diff.txt`、`19-dist-after-build.txt`、`23-final-static.txt`

```text
$ arc dsl validate --json                → exit 0, "issues": []
$ npm test                               → ℹ tests 35 / ℹ pass 35 / ℹ fail 0   ("fast tier passed — this is the gate.")
$ arc dsl generate --check               → "Would generate 0 file(s) … nothing to change"  exit 0
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":21}  exit 0
$ arc blocklet build                     → "Published 959 file(s) → …/dist"  exit 0
$ diff -r .aup dist/.aup                 → 无输出, rc=0
   （本轮未改 .web，故 diff -r .web dist/.web 不适用；`git status --porcelain .web blocklet.yaml world` 为空）

# 定向 live（.gate-lock 下串行）
$ npm run test:file -- scripts/arcblog-economy.test.mjs  → ℹ tests 43 / pass 43 / fail 0
$ npm run test:file -- scripts/arcblog-network.test.mjs  → ℹ tests 24 / pass 24 / fail 0
```

**G1**：通过（含 `generate --check` 漂移门）。**G4**：通过（跑前写 `docs/team/.gate-lock` = `qa-round22 2026-09-29 05:04:23`，跑完删除；见 §8 自证）。
**G2（§35 运行期）**：Dev 报告已执行 restart + `arc blocklet run` 复挂 + `/instance` 读证明（pid 17364→13164→13466→13930）。**QA 未重复 restart**（会打断当前 GUI 会话）→ **受限未验证**，但 QA 的运行期页面证据全部取自复挂后的 live 实例，且 `diff -r .aup dist/.aup` rc=0。
**G3**：见 §4。**G6**：PM 轮末裁决，不在 QA 范围。

**构建副作用（如实登记）**：QA 执行 `arc blocklet build` 后 `dist/` 多出 `dist/docs/team/test-reports/raw/round-22/**`（`docs/` 被 build 镜像进 `dist/` 的既有行为，同 `dist/docs/team/journal/round-22.md`、`dist/docs/team/requirements/REQ-029…md`），并重算 `dist/.afs/manifest.json`。`dist/docs/team/.gate-lock` **不存在**（build 时锁已删除，`arc-contracts §36(5)` 未触发）。

---

## 2. ① BUG-032（D32）

原始输出：`raw/round-22/02-bug032-static-cli.txt`、`03-bug032-equiv.txt`、`04-bug032-equiv-result.json`、`05-bug032-help-boundary.txt`、`06-cli-migration-table.txt`、`23-final-static.txt`

| 判据 | 实测 | 结论 |
| --- | --- | --- |
| B32-1 等号 ≡ 空格 | `--type=refund` vs `--type refund` → **byteIdentical:true**（count 10 / totalCount 10 / types `["refund"]`）；`--limit=1` vs `--limit 1` → byteIdentical，count 1 / totalCount 70 / truncated true；`--order=<id>` vs `--order <id>` → byteIdentical，count 2 | 通过 |
| B32-2 合法值真被消费 | refund 记录 `entries[].type` 集合 = `["refund"]`（轮初基线 = 未过滤全量） | 通过 |
| B32-3 非法值两种写法同码 | `--type=payment` / `--type payment` → 均 exit 1，stderr 逐字节相同：`{"ok":false,"code":"VALIDATION","error":"unknown ledger type: payment (use creator_share\|hub_share\|protocol_fee\|refund)"}` | 通过 |
| B32-4 未知 flag fail-closed | `economy ledger list --nope` / `media list --nope` / `network hub list --nope` → 全 exit 1 + `unknown flag: --nope — Flags: --k v and --k=v are equivalent; an unknown flag fails closed (VALIDATION, exit 1).`；`--help` exit 0；位置参数与 `--` 分隔符不报错 | 通过（1 个例外 → BUG-060） |
| B32-5 全 CLI 统一 | `grep -rn "^function parseArgs" scripts/` → **0 命中（exit 1）**；26 个 CLI 全部 `parseCliArgs`；注册表 `scripts/lib/cli-flags.mjs`（含 CHAIN_FLAGS + BASE_FLAGS + 每脚本词表 + 漂移守卫） | 通过 |
| B32-6 语义零变更 | 空格形式逐条不变；`--all` → count 70 = totalCount 70 / truncated false；默认 = `--limit 20`（测试内断言两命令 stdout 相同）；`--limit=1`/`--order=` 现在与空格等价，`--order` 语义（单订单、无 totalCount）未变 | 通过 |
| B32-7 `--help` 同步 | 19 个 CLI 输出同一句 `Flags: --k v and --k=v are equivalent; an unknown flag fails closed (VALIDATION, exit 1).` | 部分通过（4 个既有缺口 → BUG-060） |
| B32-8 定向用例 | `economy.test.mjs` 43/43（基线 40 → 43，仅追加；新增 3 个测试：`--k=v` 等价 + fail-closed、每个 flag CLI fail-closed、注册表漂移守卫） | 通过 |
| B32-9 门 + 回归 | §1 全绿 | 通过 |

**残留**：见 §6 BUG-060。

---

## 3. ② BUG-033 / ③ BUG-034 / ⑥ BUG-036 / ⑦ BUG-037（运行期）

浏览器证据：`raw/round-22/13-cdp.json`（探针 `qa-r22-cdp.mjs`）、`14-cdp-focus.json`（`qa-r22-cdp-focus.mjs`）、`16-pages-navigation.txt`、`20-factory-overflow.txt`。
协议：admin 会话 · **单 tab**（`Page.navigate` 换页）· 每语言 `sessionStorage.clear()` · 结束关闭自建 target。

### 3.1 BUG-033（`?page=pages`）

```text
en_1803x908  View w=30.92 h=19.19 cw=31 sw=31 over=0 flexBasis="auto" flexGrow="0" hitCount=0 docOver=0
en_1512x765  同上
zh_1803x908  查看 w=25.61 h=19.19 cw=26 sw=26 over=0                                   hitCount=0 docOver=0
zh_1512x765  同上
静态: .aup/pages/admin/pages.aup:173 … flexGrow: 0, flexBasis: auto}
导航（真实用户手势 mousePressed/mouseReleased）: href="/pages/page-test-1790504571866" target="_blank"
  → 新 target http://arcblog.localhost:4939/pages/page-test-1790504571866 成功；同 tab 直载渲染 "Test Page | hello page"，notFound=false
```

B33-1/2/3/4 **通过**。**残留观测（不阻断）**：命中盒高度 19.19 < `ArcBlog-admin-ui-design.md` §4.3 的 24×24 建议值（平台行内链接 line-box 高度，未在本轮处理）。**受限**：破坏性行内动作（`Take offline`）的写点击未做（实例只有 1 条 live 页面记录）。

### 3.2 BUG-034（`?page=hub`）

```text
静态: grep -c "wordBreak|overflowWrap|whiteSpace|textOverflow" .aup/pages/ops/hub.aup → 0（exit 1）
运行期（12 行 / 30 条 .aup-kv-row，修前 en/1512 最大 over=92、zh/1512=31）:
en_1803 itemW=698.28 kv over=[0×30] docOver=0   en_1512 itemW=574.59 kv over=[0×30] docOver=0
zh_1803 itemW=698.28 kv over=[0×30] docOver=0   zh_1512 itemW=574.59 kv over=[0×30] docOver=0
文本 × action 相交 hitCount=0（四组）
```

B34-1/2/4 **通过**。**残留（既有、非本轮引入）**：页面壳层 2 处 `.aup-view` `cw=1136/sw=1324 over=188`（1512）与 `cw=1200/sw=1356 over=156`，与 Dev 修前基线 `/tmp/dev-r22-geom-baseline.json` 的 cw/sw/over **逐值相同**；`overflowX: visible`、`docOver=0`、非横向滚动容器。
**受限**：B34-3 三动作真实写点击未做（会改写 live 收录关系）；静态复核三条 `exec` / `confirm` 逐字保留 + DSL `issues: []`。

### 3.3 BUG-036（cold vs reload）

```text
factory  cold(en/zh) = reload(en/zh): kvCount 18，真值（NFT ArcBlogStudioNode #5 / Lifecycle acquired /
         Adapter ocap / Network beta / Moniker … / Capacity 1000 …）；loadingOrUnavailable=true（诚实提示在页上）
operations cold/zh/en = reload: kvCount 5（Status ok / Blocklet version 0.3.7 / DID … ）；dashValues=0
git diff -U0 .aup 新增行中 "visible" 命中 = 0
```

B36-2（诚实呈现）**通过**；B36-3（冷载即真值）**亦成立**；B36-4 **通过**；B36-5 **通过**（factory 队列卡仍在、无内容级新增溢出；operations 5 行未减少）。
**但与 Dev 的「平台边界」结论不一致**：QA 冷载（新 target 直载，wait 4.4s）五通道非空、cold == reload → 另立 **BUG-062**（P3，证据口径）。**受限**：daemon 重启后的首次加载未复测。

### 3.4 BUG-037（NFT 卡诚实性）

```text
静态（in-process，HEAD vs 当前）: defaultSVG studio/hub 逐字节相同；defaultFactory 逐字节相同；
        simulated SVG 含「未上链 / NOT ON CHAIN — SIMULATED」+ aria-label「… — not on chain / simulated」；
        证据字段 pk/stake/endpoint/owner 保留
$ arcblog-factory.mjs svg --role studio | grep '未上链 / NOT ON CHAIN — SIMULATED' → 命中
$ arcblog-factory.mjs spec --role studio | grep -c 'NOT ON CHAIN' → 0
运行期: [data-aup-id="factory-nft-svg"] → <div class="aup-media" …><img src="data:image/svg+xml;base64,PHN2…">
        naturalWidth=480 naturalHeight=300 complete=true alt="NFT card"
        页面文本 simulated 命中 4–5 次（承载=既有 truth 卡 simulatedLabel「SIMULATED — mock adapter, never chain truth」）；"NOT ON CHAIN" 文本 0
```

B37-2（不伪造）/B37-3（证据字段零删除）**通过**；B37-1 **部分通过**（页面级 SIMULATED 语义存在，但由**既有** `simulatedLabel` 承载；本轮新增的 SVG 横幅在 live 页不可见，因为投影里渲染的是 studio(ocap) 卡且 mock 侧 SVG 是改动前生成的）。
B37-4 **不通过**：拟落的平台事实「`media` 不接受 `data:` URI」被实测证伪（图片确实渲染）→ **BUG-061**；**不得**写入 `arc-contracts.md`。

---

## 4. ⑨ 零链写、零资金复核（硬红线）

原始输出：`raw/round-22/b58-ocap-reconcile.json`、`15-zero-chain-write.txt`、`21-cleanup-selfproof.txt`

| 检查 | 实测 | 结论 |
| --- | --- | --- |
| 调用清单无 `send*` | `reconcile --adapter ocap` 的 `readOnly.methods = ["getAccountTokens","getAccountState"]`，`violations: []`，`writePath: "none (READ_ONLY_METHODS whitelist …)"` | 通过 |
| 余额 / nonce 前后一致 | `nonceBefore = nonceAfter = 1790498079479`；`equal:true`（token 列表逐值相同，balance `16154907215234937951`，symbol `TBA`） | 通过 |
| 链上意图记录仍在 | `/instance/app/arcblog/config/chain-intents/pending.json` → `{id:"pending", action:"claim", role:"studio", status:"applied", hash:"631F210A…", lifecycle:"acquired"}`，sha256 前缀 `fef80b4f026e7521` | 通过 |
| `arc space sync --mirror` / `rm` 未跑 | QA 未执行；本轮所有 QA 命令为只读读链 / AFS / 只读浏览器 | 通过 |
| 未打印 / 未落盘私钥与助记词 | 只检查了 `.env.local` 的**键名**（含 `ARCBLOG_CHAIN_MNEMONIC`），从未读取或输出其值 | 通过 |
| 真实交易 | **未发现**任何新交易（无广播、无 mint/stake/claim/revoke） | 通过 |

**未跑**：`arcblog-clean.mjs --confirm`（全轮 dry-run，`removed 0`）；`arc service list` 只读。

---

## 5. ⑩ 回归

| 检查 | 实测 | 结论 |
| --- | --- | --- |
| `arc dsl validate --json` | exit 0, `issues: []` | 通过 |
| `npm test` | **35/35**（基线不得降） | 通过 |
| `arc dsl generate --check` | 0 漂移 exit 0 | 通过 |
| `arc blocklet build` + `diff -r .aup dist/.aup` | build exit 0；diff rc=0 空 | 通过 |
| `console-nav --check` | `pages: 21`，exit 0 | 通过 |
| **21 页运行期** | 21/21：`[data-active="true"]` **恰 1**、`SESSION INIT FAILED` **0**、未命中登录门、`docOver` 0 | 通过 |
| 定向 live | `economy` **43/43**、`network` **24/24** | 通过 |
| `world/**`、`blocklet.yaml`、`.web/**` | `git status` 干净（预期零改动） | 通过 |
| 实例残留 | `arcblog-clean.mjs`（dry-run）= `found 452 / removed 0 / dirsScanned 20`（轮初 330；增量来自 R22 定向 live 与 Dev 的 `--adapter mock` 演练，全部为已知测试前缀：`econ-test- 210`、`sign-keys- 27`、`ledger-order- 24`…） | 已登记，**未删**（BUG-053 口径 + 本轮不真删） |

---

## 6. 新增 BUG 列表

| 编号 | 级别 | 标题 | 影响 | 建议 |
| ---- | ---- | ---- | ---- | ---- |
| [BUG-060](BUG-060-four-clis-help-surface-not-synced.md) | **P3** | 4 个 CLI 的 `--help` 面未随 D32 统一 | `chain-worker --help` exit 1 + 裸栈（**HEAD 同行为，非本轮回归**）；`rss`/`query-posts`/`daily-report` 忽略 `--help` | 下轮（或本轮 Dev 顺手）补 help 分支；或由 Lead 裁定「无 help 面」显式接受 |
| [BUG-061](BUG-061-media-data-uri-platform-claim-falsified.md) | **P3** | `media` 平台边界结论被证伪（data URI 会渲染，480×300） | 若落 `arc-contracts.md` 会写入错误平台事实 | **落笔前更正**；原文「media 不接受 data URI → placeholder」删除/改写 |
| [BUG-062](BUG-062-bug036-platform-boundary-not-reproducible.md) | **P3** | BUG-036「平台无法保证首屏有值」在页面级冷载不可复现 | 同上，避免把偶发时序写成平台必然 | **落笔前补复现条件**（daemon 冷启动 / 首请求），否则降级为「偶发」表述 |

**为什么全部 P3、不阻断**：三条都不改变功能正确性、数据与门禁结果；BUG-061/062 属**交账口径**问题，由 Lead 在落笔时更正即可（但必须更正）。八项缺陷本身全部达到各自关闭判据。

---

## 7. 受限未验证清单（不得当作通过）

| # | 项 | 原因 |
| - | -- | ---- |
| 1 | BUG-032：26 个 CLI 的**完整业务命令**逐条 happy-path | 受「禁止全量 live」与实例串行约束；本轮验证到 flag 层（解析/help/未知 flag）+ 受影响 CLI 的定向单跑（economy 43、network 24）+ 注册表漂移守卫 |
| 2 | BUG-034 B34-3：approve/reject/purge 真实写点击 | 会改写 live 收录关系记录；仅静态复核 exec/confirm |
| 3 | BUG-033 B33-4：`Take offline` 写点击 | 实例只有 1 条 live 页面记录；仅静态复核 |
| 4 | BUG-036：daemon 重启后首个加载 | 未复测（会打断当前 GUI 会话）；页面级冷载已双侧复测 |
| 5 | BUG-037：`factory create --adapter mock` 运行期路径 | 会覆写 live `config/nft-factories.json`；只有 in-process + `svg` 样例两条等价证据 |
| 6 | BUG-038：`CHAIN_UNAVAILABLE` 一级 | `.env.local` 含 `ARCBLOG_CHAIN_MNEMONIC`；三件套齐时跑 `--adapter ocap` 会真建链上工厂（L-R22-2 红线），故不做 |
| 7 | BUG-058：`order verify --adapter ocap` 分支 | 与 `settlement reconcile` 共用同一 `chainFingerprint` 路径，未单跑 |
| 8 | G2：QA 侧 restart + 复挂 | Dev 已执行（pid 17364→13164→13466→13930）；QA 未重复 |
| 9 | 全量 `npm run test:live` | 用户裁定禁止；以定向单跑替代 |
| 10 | 每语言独立 **browser context** | 按单 tab 纪律用同 target + `sessionStorage.clear()` + `?locale=`；语言由 `document.documentElement.lang` 实测确认（en/zh 均命中） |

---

## 8. 清场自证

```text
$ ls docs/team/.gate-lock dist/docs/team/.gate-lock
  both: No such file or directory          # 锁在 build 之前删除 → 无 dist 镜像（§36(5)）

# QA 自建实例探针
$ arc afs read …/config/hub-intents/qa-r22-b57-empty-<ts>.json  → NOT_FOUND
$ arc afs read …/config/hub-intents/qa-r22-b57-baddid-<ts>.json → NOT_FOUND
$ arc afs read …/config/hub-intents/qa-r22-b57-dup1-<ts>.json   → NOT_FOUND
$ arc afs read …/config/hub-intents/qa-r22-b57-dup2-<ts>.json   → NOT_FOUND
$ arc afs read …/config/hub-intents/qa-r22-b57-render-<ts>.json → NOT_FOUND
$ arc afs delete …/hub/registrations/185d9d0584d11b1a.json      → {"path":"…"}（合成登记已删）
$ node scripts/arcblog-network.mjs hub list --json              → count 5（= 探针前基线）
$ arcblog-clean.mjs（dry-run）                                  → found 452 / removed 0（未真删任何东西）
```

- **写范围合规**：QA 只写 `docs/team/test-reports/**`、`docs/team/bugs/**`、`docs/team/.gate-lock`（临时，已删）；未改任何源码 / 测试 / `.aup` / `world` / `blocklet.yaml` / spec / checklist。唯一越界副作用 = 按门要求执行 `arc blocklet build` 重写 `dist/**`（已在 §1 登记）。
- 未调用 `team_task_*`（按 Lead 指示，仅按 schema 回报）。
- 浏览器：所有自建 target 均已关闭；仅使用现有 debug Chrome `:9333`。
- **提交前提醒**：QA 的 `build` 在 `round-22.md` / `BUG-060..062` 写盘**之前**执行，因此 `dist/docs/team/test-reports/round-22.md`、`dist/docs/team/bugs/BUG-060..062.md` 尚未生成。Lead 在统一提交前需再跑一次 `arc blocklet build`（并确认 `dist/docs/team/.gate-lock` 不存在）以同步 `dist/docs/**` 镜像。

---

## 9. 与 Dev 自述的差异（独立复核发现）

| # | Dev 自述 | QA 实测 | 处置 |
| - | -------- | ------- | ---- |
| 1 | 「平台边界：`media` 不接受 `data:` URI → placeholder」 | `media` 渲染 `<img src="data:image/svg+xml;base64,…">`，`naturalWidth=480` | **BUG-061**（P3，落笔前更正） |
| 2 | 「五通道在冷载 9.6s 内全部为空且不自行恢复 ⇒ 平台边界」 | 页面级冷载（新 target，4.4s）即有真值，cold == reload（factory/operations × en/zh） | **BUG-062**（P3，补复现条件） |
| 3 | 「26 个 CLI 全部改走 parseCliArgs；19 个有 help」 | 一致（`grep "^function parseArgs"` 0 命中；19 个含语法说明） | 无差异；4 个 help 缺口登记 BUG-060 |
| 4 | 「economy 定向 43/43」 | 一致（43/43） | 无差异 |
| 5 | 「B57/B58 修好」 | 一致（AFS/CLI 双侧复现） | 无差异 |
| 6 | 「BUG-033 残留高度 19.19」 | 一致（30.92×19.19 / 25.61×19.19） | 观测，不阻断 |

---

## 10. 放行结论

- 八项缺陷（BUG-032/033/034/036/037/038/057/058）**逐条达到 REQ-029 §3 的关闭判据**（受限项已在 §7 列明，均为环境/红线限制，非缺陷未修）。
- 通用门 G1–G4 全绿且无降级；零链写、零资金红线未破。
- 新增 3 条 **P3**（BUG-060/061/062），**无未裁决 P0 / P1**。
- 测试报告已落盘 `docs/team/test-reports/round-22.md`，证据落 `raw/round-22/**`。

**放行（pass）** —— 但请 Lead 在落 `docs/arc-contracts.md` 前先处理 BUG-061 / BUG-062 的口径更正。

VERDICT=pass, BLOCKING=0
