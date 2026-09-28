# round-14F 复验报告（L-R14F：UI 全面检查与优化 / BUG-030 P1 必修 / BUG-031 + D-01 + R15-D 并轨）

> **角色**：QA（独立验证者）｜**轮次** Round 14F（2026-09-28）｜**写入范围**：`docs/team/test-reports/**`、`docs/team/bugs/**`、`docs/team/.gate-lock`（临时，已删）。**未改任何源码 / 测试 / `.aup` / `.web` / `world` / `blocklet.yaml` / `dist` 源 / spec / 标准 / UI-012 / 需求。**
> **快照**：HEAD `9a06261` + 本轮工作区（Dev/UI 改动均在写盘态）。QA 于本轮跑过一次 `arc blocklet build`（门要求），构建后 `diff -r .aup dist/.aup` 与 `diff -r .web dist/.web` **均无输出**（identical）。
> **方法**：**不采信 Dev / UI 自述**。所有结论来自 QA 本轮自己执行的命令、CDP 实测、AFS 复核与源码静态复核。**未跑全量 `npm run test:live`**（用户裁定禁止）；定向 live 只在 `.gate-lock` 下串行单跑一次。
> **浏览器纪律**：全程复用**同一个既有 page target** `1F2B2046662C9362703896A73C794B45`（只 `Page.navigate`）；8 次 sweep + 4 次定向批次 + 4 次单发探针**每次自证 `pageTargets before=1 after=1`**；guest 用 `Target.createBrowserContext` 隔离上下文并 dispose；结束时 page target 数 = **1**。
> **结论（一句话）**：**放行（pass, BLOCKING=0）**。门 7 条全绿；**BUG-030（P1）已修复并经 QA 独立复验**（订单行出现 2 个平台 `time` 元素、相对文本可读、绝对 ISO 与全部 18 个字段均在）；BUG-031 / QA O-2 / O-3 / D-01 / R15-D 全部通过；UI-012 清单独立复核 **14 组**（≥8 要求）中 **11 组已修**、**3 组未完全达成且已登记为 P2 残留**（hub@1512、factory@1512、tags@1512），平台固有项均附 QA 自取的平台侧证据后 allowlist；**无未裁决 P0/P1**。

---

## 0. 验证方式与边界

| 类别 | 本轮动作 |
| ---- | -------- |
| **门（QA 自跑）** | `arc dsl validate --json`、`npm test`、`node scripts/arcblog-console-nav.mjs --check`、`arc dsl generate --check`、`arc blocklet build`、`diff -r .aup dist/.aup`、`diff -r .web dist/.web`、硬编码颜色 grep、`arc dsl lint --json` |
| **定向 live（串行、持锁）** | `.gate-lock`（`qa-round14f owner=qa start=2026-09-28T06:47:08Z`）→ `npm run test:file -- scripts/arcblog-economy.test.mjs`（**30/30 pass**，100.8 s）→ 跑完删锁 |
| **静态复核** | `grep -n` 逐条核对 `orders/ledger/general/hub/factory/tags/posts/feeds/wrapper/公共页` 的 Dev 改动；读 `scripts/arcblog-economy.test.mjs:494-576` 确认 R15-D 断言真实存在 |
| **浏览器（CDP 9333，admin）** | 8 组 sweep（21 控制台页 + 4 公共页 × en/zh × 1803×908/1512×765 = **100 次页面采集**）+ 零宽塌陷专项 sweep（21 页 × 2 配置）+ 定向批次（general/posts/feeds/pages/tags/hub/factory/reader）+ 品牌点击 + 主题时序 + 文本×按钮相交扫描；每次 `Page.navigate` 后 1400–2600 ms |
| **平台侧证据（QA 自取）** | `curl http://arcblog.localhost:4939/aup.bc92de568433b0dc.js` → 解析出平台 style 转发**白名单恰 67 键**（原文见 §4）；`grep -rl <平台类名> .aup .web scripts world` 证明该 DOM 类在仓库内无源 |
| **实例卫生** | 探针一律 `qa-r14f-*`，全部由 CLI 产生；定向 live 残渣用 `arcblog-clean.mjs --confirm` 清除；收尾基线复核见 §5 |

**受限未验证（不得当成通过）**

1. **全量 `npm run test:live` 未跑**（本轮任务书 + 用户 2026-09-27 裁定禁止）。
2. **真实 DID Wallet 登录回跳**未验证（本机无钱包）：只证明 guest gate 存在且 CTA 未被拉伸。
3. **真实链上 `transactionHash`** 未验证：`paymentAdapter=manual` → 记录 `transactionHash:""`；页面 0 个哈希 token 的诚实性成立，非空哈希渲染路径未验证。
4. **`failed` 订单状态**未验证（CLI 无写入路径）。
5. **R15-D 的 `hub_share` 正向条目**未验证（需可验证归因环境）→ `--type hub_share` 只能验「0 条且形状正确」。
6. **UI-012-05/06 的超长真实值**未构造（沿用实例既有 4 条 registrations + 1 条 index），超长 DID/title 下的表现未验证。
7. **真实鼠标 hover / dark 手切换**未做（沿用 CDP `getComputedStyle` 口径）。
8. **`?page=tags` 的 1512 `clientHeight ≥ 500` 字面值**：实测 **428**（en/1512）未达成，登记为 P2 残留，见 §2/§4（BUG-035 并入 BUG-034 说明）。
9. **Dev 自述的两条现象 QA 未能复现**（如实登记，不计入通过）：① “dashboard zh/1512 两条 `.aup-time` cw=0/25、over 49/24”——QA 在 dashboard zh/1512 实测 **zeroWidthCount=0**；② “hub@1512 平台 kv over 4–31px”——QA 在 **en/1512 实测 92**（zh/1512 才是 31），见 §3 与 BUG-034。

---

## 1. 逐项复验结论（任务书 ①–⑦）

### ① BUG-030（P1）：`?page=orders` 有 time 元素、相对文本可读、字段未丢 — **通过（已修复）**

源码（当场 `grep -n`）：`.aup/pages/economy/orders.aup:183` 与 `:187` 各一处 `time mode=display value="${entry.content.createdAt|settledAt}" timeMode=relative`；未结算分支 `:189` 渲染破折号。

运行期（QA 现场用 CLI 造 `qa-r14f-order1`：create→pay→settle，settledAt=`2026-09-28T06:48:43.520Z`，再 CDP 实测；**该探针现已清理**）：

```text
$ node /tmp/qa-eval.mjs --target 1F2B2046… --url '…?page=orders' --wait 3000 \
    --expr /tmp/expr-r14f-orders.js
{ "initFailed": false, "listItemCount": 2, "globalTimeEls": 2,
  "timeSample": [
    { "cls": "aup-time aup-time-display", "text": "just now",
      "title": "2026年9月28日 14:48", "dt": "2026-09-28T06:48:38.519Z" },
    { "cls": "aup-time aup-time-display", "text": "just now",
      "title": "2026年9月28日 14:48", "dt": "2026-09-28T06:48:43.520Z" } ],
  "rowFound": true, "rowTimes": [ {"text":"just now","title":"2026年9月28日 14:48"}, … ],
  "relativeMatchesInRow": [ "just now", "just now" ],
  "settledAtIsoInBody": [ "2026-09-28T06:48:43.520Z", … ] }
```

| 判据 | 结果 |
| ---- | ---- |
| 页面存在平台 `time` 元素 | **2 个**（`aup-time aup-time-display`），位于 `qa-r14f-order1` 行内 |
| 相对文本可读 | **`just now`**（相对形式不再是缺失项） |
| 绝对形式保留 | `title="2026年9月28日 14:48"` + `data-datetime="2026-09-28T06:48:43.520Z"` + kv 行仍逐字显示 ISO `2026-09-28T06:48:43.520Z` |
| 订单字段未丢 | 行内 29 个 `.aup-kv-row`：`id/kind/buyerDid/creatorDid/hubDid/productId/contentId/amount/asset/status/paymentAdapter/paymentRef/createdAt/paidAt/settlementVersion/settledAt/refundedAt/refundReason/updatedAt` + q1–q6 + 4 条行级命令，与 CLI `order list` 同记录逐字一致 |
| 无 `SESSION INIT FAILED` / active | `initFailed=false`、`[data-active=true]`=1（Orders/订单） |

### ② BUG-031：`ledger.aup` gate-desc 不再含 grants 语义 — **通过（已修复）**

```text
$ grep -n 'gate-desc' .aup/pages/economy/ledger.aup
19:    gate-desc { en "Sign in with DID Wallet to view settlements and the ledger." zh "使用 DID Wallet 登录后查看结算与账本。" }

$ node /tmp/qa-eval.mjs --guest --url '…?page=ledger&locale=zh' --wait 3000 --expr /tmp/r14f/e_guest.js
{ "lang": "zh", "bodyText": "ArcBlog\n经济\n使用 DID Wallet 登录后查看结算与账本。\n使用 DID Wallet 登录",
  "gateDescHasGrants": false, "gateDescHasLedger": true,
  "kvRows": 0, "listItems": 0, "afsLists": 0,
  "gateActions": [ { "text": "使用 DID Wallet 登录", "w": 175.39, "h": 38 } ] }
# pageTargets before=1 after=1
```

同族 4 处（UI-012-12）也已逐条落地：`policy.aup:4`「分成策略与商品」、`agents.aup:14`「Agent 授权与策略」、`media.aup:5`「媒体索引」、`operations.aup:9`「节点健康与发现」（`grep -n` 逐行核对，en/zh 成对）。

### ③ D-01：`?page=general` 三个 Save 回到 size=sm 档 — **通过（已修复）**

```text
$ node /tmp/qa-r14f-targeted.mjs --viewport 1803x908 --steps /tmp/r14f/steps1.json
### general en 1803 (D-01)
{ "saveCount": 3,
  "saves": [ {"text":"Save","w":59.13,"h":29,"pad":"5px 12px","fs":"13.6px","br":"8px","parentAlign":"center"}, ×3 ] }
### general zh 1803 (D-01 zh)
{ "saveCount": 3,
  "saves": [ {"text":"保存","w":53.2,"h":31,"pad":"5px 12px","fs":"13.6px","br":"8px","parentAlign":"center"}, ×3 ] }
```

| 项 | 修复前（R14 O-4） | 本轮实测 | 同页 sm 档基准 | 判定 |
| -- | ---------------- | -------- | -------------- | ---- |
| en 三个 Save 高 | 60.39 / 62.39 / 62.39 | **29 / 29 / 29** | 29 | **通过** |
| zh 三个 Save 高 | 60.39 / 62.39 / 62.39 | **31 / 31 / 31** | 31 | **通过** |
| padding / font-size / radius | 5px 12px / 13.6px / 8px | 同左（未被破坏） | — | **通过** |

父行 `align-items: center`（源码 `general.aup:171/180/189` 三处 `row gap=xs cross=center`）。

### ④ `npm run test:file -- scripts/arcblog-economy.test.mjs`（.gate-lock 下） — **通过（30/30，含新增 --type 断言）**

**测试文件独立复核**（读文件，不采信自述）：`scripts/arcblog-economy.test.mjs:494-576` 新增 3 个用例，`git diff --numstat` = `84 0 scripts/arcblog-economy.test.mjs`（纯新增）：

- `:502 live: ledger list --type really filters` — `--all --type t` 的 id 序列与「`--all` 输出按 type 过滤」`deepEqual`、`count===entries.length`、`totalCount===expected.length`、逐条 `entry.type===t`；并断言默认分页 `count===min(20, len)`、无参 == `--limit 20`（旧语义）。
- `:538 ledger list --type fails closed on an unknown or missing value` — `payment` / `bogus` / 缺值三种均 `status!==0` + 输出含 `VALIDATION` + 列出 4 个允许值。
- `:552 live: ledger list --order --type narrows to one order and keeps both branch shapes` — `--order` 分支键集合与加 `--type` 后 `deepEqual`（形状不变）、`refund` 0 条且 `total:"0"`。

**原始门输出**：

```text
$ cat docs/team/.gate-lock
qa-round14f owner=qa start=2026-09-28T06:47:08Z
$ npm run test:file -- scripts/arcblog-economy.test.mjs | tail -8
✔ live: ledger list --type really filters (equals the full listing filtered by type) (20908.549875ms)
✔ ledger list --type fails closed on an unknown or missing value (105.696916ms)
✔ live: ledger list --order --type narrows to one order and keeps both branch shapes (12537.418792ms)
ℹ tests 30  ℹ pass 30  ℹ fail 0  ℹ duration_ms 100834.124709
$ rm -f docs/team/.gate-lock ; ls docs/team/.gate-lock
No such file or directory
```

**BUG-032 复测（既有 P3，未修，范围外）**：`ledger list --type=payment` → `exit=0`、返回全部 14 条（未按 type 过滤）→ 缺口仍在，与登记一致，**非本轮范围**。

### ⑤ UI 清单复核（14 组，覆盖「溢出/重叠」与「点击目标 ≥24×24」两类） — **11 已修 / 3 未完全达成（登记）**

逐条见 §2。覆盖：溢出 4 组（UI-012-05/06/07/11）、点击目标 4 组（UI 自修 2 条 + UI-012-09/14）、其余 6 组（文案/布局/可用性）。

### ⑥ 溢出专项（21 控制台页 + `/`、`/posts/<slug>`、`/store`、`/?page=about`；en/zh；两视口） — **已给实测结论；残留 3 处已登记**

- **水平**：`document.documentElement.scrollWidth - clientWidth` 在 **100/100 次页面采集** 中 = **0**（无页面级横向滚动条）。
- **文本**：`scrollWidth > clientWidth+1` 的残留点仅 **hub@1512（en 92 / zh 31）** 与 **factory（1803 over 10；1512 over 133）**；公共页 **0** 处。
- **重叠**：相邻同类元素 bounding box 相交 → 剔除平台 overlay/内联 SVG 噪声后 **0 处**；**文本 × 可点控件**扫描发现 **1 处真实相交**：`?page=pages` 的 `View`（0 宽塌陷链）压住 `Take offline` 按钮 **20.92×16 px**（见 BUG-033）。
- **零宽塌陷**（`clientWidth==0 && scrollWidth>0` 且含文本）：全 21 控制台页 × 2 配置中只有 **`?page=pages`（2 个元素，同一链）**。
- **平台固有项 allowlist（附平台侧证据）**：见 §4。
- 数据文件：`/tmp/qa-r14f-{console,public}-{en,zh}-{1803x908,1512x765}.json`（8 个，单 tab 自证 `before/after=1/1`）。

### ⑦ 回归 — **通过**

| 判据 | 结果 |
| ---- | ---- |
| 21 页每页恰 1 个 `[data-active="true"]` | **21/21**（4 配置全绿，`activeText` 与本页名一致） |
| 无 `SESSION INIT FAILED` | **0/100 次采集** 出现 |
| BUG-010 等价（整壳不滚动） | `document.scrollingElement.scrollHeight - innerHeight = 0` **21/21**（`/tmp/r14f/regression-sweep.txt` 每行 `docOverflow=0`） |
| BUG-011 等价（侧栏行真实点击换页、hash 为空） | `SIDEBAR CLICK -> {"url":"…?page=tags","hash":"","active":1,"activeText":"Tags"}`；`RESTORED -> {…?page=pages, active:1, lang:en, mode:light}` |
| 主题 `data-mode` 时序（沿用 R14 O-1 **更正后**口径） | 6 页采样：`readyState=complete` 时仍可能是平台默认 `dark`（t≈63–67），正确值 **其后 2–21 ms** 到达（firstLight t=69–87；hub 为 69/69 同刻）。**总窗口 ≤87 ms ≪ 300 ms**，`lightBeforeComplete=false` 5/6（hub 同刻）→ 与更正口径一致，**不是回归** |
| 落地 URL / lang 断言 | 8 组 sweep `badLandings=[]`（100/100 落地 URL 与 `lang` 均正确） |
| 快层门 | `validate issues=[]`、`npm test 28/28`、`console-nav pages=21`、`generate 0 漂移`、硬编码颜色 **0**、`diff -r .aup/.web` identical、`arc dsl lint --json → ok:true, changed:0, issues:28`（全部 `unreferenced_explicit_id`，非门禁，R13/R14 同口径） |

> 说明：`/tmp/qa-sweep.mjs` 的 `REGRESSION: 0/21 pass` **不是回归失败**——该脚本的 PASS 判据含 **R14 之前**的主题口径（`correctModeAtComplete===true`），且本轮注入的 sampler 未附着（`firstSample=null`）。所有**非主题**判据 21/21 通过（上表逐行可查）。主题时序用专用脚本 `/tmp/qa-theme.mjs` 单独实测。

---

## 2. UI-012 逐条独立复核（14 组）

| # | 清单项 | UI/Dev 自报 | QA 独立实测（命令/值） | 判定 |
| -- | ------ | ---------- | ---------------------- | ---- |
| **UI 自修-1** | `.aup-copy-btn` / `.aup-qr-btn` 命中区 18×18 → 24×24 | 已修，8 个控制台页 | sweep 实测：categories / operations / hub / agents / orders / ledger / factory / diagnostics **copy=`{24,24}`**，hub `qr={24,24}`；`tinyCount=1`（仅剩平台品牌链） | **已修（与 UI 一致）** |
| **UI 自修-2** | `.aup-footer-link` 17px → 28.8px，页脚总高不变 | 已修 | `/store` 实测 4 条链接 **h=28.8**（40.86 / 36.25 / 45.41 / 26.94），`.aup-app-footer` 高 **139.14**（未变） | **已修（与 UI 一致）** |
| **03** | 品牌 `href="/"` → `/?page=index`（wrapper + 7 公共页） | 已修 | 静态：`wrapper.aup:42` 与 7 公共页 `app-footer brand=…href:"/?page=index"`。运行期：`?page=posts` 点击 `.aup-app-header-brand-link`（href=`/?page=index`）→ 落地 **`http://arcblog.localhost:4939/`**、`h2="Latest published"`、侧栏消失（active=0）、3 条 feed 项 | **已修** |
| **04** | BUG-030：orders/ledger 接平台 `time` | 已修 | §1① ；ledger 页实测 `timeCount=2`（2 条 settlement 行 `text="4 days ago"`）；orders 行 2 个 `time`（`just now` + 绝对 title + kv ISO） | **已修** |
| **05** | `hub.aup:166` 关系行拆两行（溢出 131→0；1512 255） | 已修 | **1803/en+zh：0 处溢出**（关系行、kv 全 0）。**1512 未归零**：en 残留 **92**（`.aup-view` sw 369 / cw 277）、zh 残留 **31**；无横向滚动条（`docOver=0`、`hScrollers=[]`）、无文本×按钮相交 | **1803 已修 / 1512 未完全达成 → BUG-034（P2）** |
| **06** | `hub.aup:210` 内容索引行 over 28 | 已修 | 1803/en 与 1512/en 的 hub 索引行**均无溢出**（索引行已加 `minWidth:0` + `flexBasis:auto`，状态标签合并） | **已修** |
| **07** | `factory.aup:180/207`：intents 行拆行 + tx 哈希 | 前半已修，后半=平台限制 | intents 行改善（1512 `.aup-view` 121→**62**，`.aup-text` 哈希 over 62）但**未归零**；`#factory-node-tx` 的 4 条 `.aup-kv-row.aup-kv-mono` 1512 实测 **over 133 / 121 / 120 / 112**（cw=572），1803 **over 10**（cw=695） | **未完全达成 → BUG-035（P2，平台证据见 §4）** |
| **08** | orders/ledger 空 `afs-list` 抢焦点致开局滚到底 | 已落地（`scrollTop 0`），顺序待 PM 追认 | 两页内容列 **`scrollTop=0`**（sweep：orders/ledger `st=0`；此前为 340 / 808）；`document.activeElement` 仍是空 `.aup-list`（平台 P-05 不变），但**不再预滚动** | **已修（顺序变更待追认）** |
| **09** | `posts.aup:164` `alignSelf` 被丢弃致按钮拉伸 1440.56 | 已修（包 `row cross=start`） | `Open the reader page` 按钮实测 **w=176.58 / h=29**，父容器 w=1440.56（即按钮=内容宽，不再被拉伸）；样式：无内联 alignSelf 残留 | **已修** |
| **10** | D-01 三个 Save（60.39/62.39） | 已修 | §1③：29（en）/31（zh） | **已修** |
| **11** | `tags` Intent queue 卡移入滚动列（1512 列高 ≥500） | 已修；字面 ≥500 未达成（自报 450） | 滚动列 `clientHeight`：**1803 = 593（≥500 ✓）**、**1512 = 428（<500 ✗，自报 450，QA 实测 428）**；同页外层内容列 1512 = 717 | **部分达成 → 登记 P2 残留（并入 BUG-035 说明）** |
| **12** | 5 处 `gate-desc` 与页面内容对齐（含 BUG-031） | 已修 | §1② + 同族 4 处逐行核对（policy/agents/media/operations，en/zh 成对） | **已修** |
| **13** | orders/ledger 行内 DID/ID 重复呈现 | 已修 | **部分**：orders 行 chip 行已删（DID 呈现 **3 次→2 次**：q1–q3 kv + 字段 kv；`id` 仍 2 次：行首 monospace + `label-id` kv）；ledger 条目行裸 `p orderId` 已删（仅剩 kv）。**清单原文要求「每个 DID 只留一处」未严格达成**，但采用了两条建议修法中的第二条 | **部分已修（P3，不阻断）** |
| **14** | posts/feeds/reader 文本链接命中区 ≥24 | posts/feeds 已修；reader=平台 breadcrumb | posts 页 `.aup-view-link` **under24=0**（minH **25.19**，`Edit` pad `3px 0`）；feeds 2 条链接 **h=25.5**（pad `3px 0`）；`/posts/<slug>` 的 `<a href="/posts">Back to latest stories</a>` **h=19.5 / pad 0**，DOM 链为平台 `nav.aup-breadcrumb > ol.aup-breadcrumb-list > li`，源码 `reader.aup:11 breadcrumb items=[…]`，`grep -rl aup-breadcrumb .aup .web scripts world` = **0** | **posts/feeds 已修；reader 平台受限（allowlist）** |

**UI-012 未被自报、但 QA 独立发现并登记的项**：BUG-033（`?page=pages` 的 `View/查看` 链接 0 宽塌陷 + 真实压按钮，`pages.aup:173 flexGrow:0`；**该行在 HEAD 已存在**，非本轮引入，但本轮 UI 全面走查未列入清单）。

---

## 3. 溢出 / 重叠专项表（实测）

数据源：`/tmp/qa-r14f-{console,public}-{en,zh}-{1803x908,1512x765}.json`；判定口径：`document.documentElement.scrollWidth>clientWidth`；文本节点 `scrollWidth>clientWidth+1`；相邻同类元素 bounding box 相交（含裁剪祖先求交）；零宽塌陷（`clientWidth==0 && scrollWidth>0 && 有文本`）。

### 3.1 总体

| 配置 | 页数 | 文档级横向溢出 | 无 `SESSION INIT FAILED` | active=1 | badLandings | pageTargets |
| ---- | ---: | -------------- | ------------------------ | -------- | ----------- | ----------- |
| console en 1803×908 | 21 | **0** | 21/21 | 21/21 | [] | 1→1 |
| console zh 1803×908 | 21 | **0** | 21/21 | 21/21 | [] | 1→1 |
| console en 1512×765 | 21 | **0** | 21/21 | 21/21 | [] | 1→1 |
| console zh 1512×765 | 21 | **0** | 21/21 | 21/21 | [] | 1→1 |
| public en 1803×908 | 4 | **0** | 4/4 | 0（公共页无侧栏，预期） | [] | 1→1 |
| public zh 1803×908 | 4 | **0** | 4/4 | 0（同上） | [] | 1→1 |
| public en 1512×765 | 4 | **0** | 4/4 | 0（同上） | [] | 1→1 |
| public zh 1512×765 | 4 | **0** | 4/4 | 0（同上） | [] | 1→1 |

### 3.2 仍存在的溢出点（非 allowlist，全部登记）

| 页面 | 视口/语言 | 元素 | 实测值 | 影响 | 处置 |
| ---- | --------- | ---- | ------ | ---- | ---- |
| `?page=hub` 关系列表行 | 1512/en | `.aup-view`（`style={flex:"1 1 0%"}` 的行内子容器，含 `did:key` + kv `hub show/sync` CLI 命令） | cw **277** / sw **369** → **over 92**（10 个元素） | 文字超出自身盒；**无横向滚动条**（`docOver=0`、`hScrollers=[]`）、**无文本×按钮相交** | **BUG-034 (P2)**；UI-012-05 的 P1 只达成 1803 |
| `?page=hub` 关系列表行 | 1512/zh | 同上 | cw **338** / sw **369** → **over 31**（10 个元素） | 同上 | 同上 |
| `?page=factory` `#factory-node-tx` | 1803/en+zh | `.aup-kv-row.aup-kv-mono`（4 个 64 位哈希） | cw **695** / sw **705** → **over 10** | 单行两轨互挤 | **BUG-035 (P2)** |
| `?page=factory` `#factory-node-tx` | 1512/en+zh | `.aup-kv-row.aup-kv-mono` × 4 | cw **572** / sw 705/693/692/684 → **over 133 / 121 / 120 / 112** | 哈希被裁 | 同上（附平台白名单证据） |
| `?page=factory` intents 行 | 1512/en+zh | `.aup-view`(cw479) / `.aup-text`（`result.hash`） | **over 62 / 52**（zh） | 哈希文字溢出 | 同上 |
| `?page=factory` NFT 卡 | 1512/en+zh | `.aup-view` | cw 600 / sw 719 → **over 119**（zh 489→541 over 52） | 卡片内容挤压 | 同上 |
| `?page=pages` 列表行 | 1803/en、1512/en、1512/zh | `a.aup-view-link` → `.aup-text`：「View/查看」 | **cw=0 / sw=31（en）、sw=13（zh）**，`flex: 0 1 0%`；`h=19.19`（en）/`38.38`（zh） | **点击目标 0 宽**；文字**实测压住 `Take offline` 按钮 20.92×16 px** | **BUG-033 (P2)** |

### 3.3 平台固有项（allowlist，附 **QA 自取**平台侧证据）

| # | 现象（100 次采集的一致值） | 平台侧证据 | 为何不改 |
| -- | ------------------------- | ---------- | -------- |
| A-1 | 每个控制台页有 2 个根级 `.aup-view` 容器 `scrollWidth>clientWidth`（1803：over 302/334；1512：over 156/188） | ① 该 DOM 类 `aup-view` 由运行时生成（`grep -rl aup-view .aup .web scripts world` 无来源；仅 2 个文档文件提及）；② **文档级** `documentElement.scrollWidth-clientWidth=0` 100/100，无横向滚动条；③ 与 UI-007 §3.3 / UI-012 P-06 同源（100vw 全出血 + `overflow:visible`） | 平台根容器布局，页面无入口 |
| A-2 | `.aup-app-header-brand-link` 66.64×**19.19**（控制台+公共页各 1） | `grep -rl aup-app-header-brand-link .aup .web scripts world` = **0** → 平台 chrome；仓库无该类名源 | 平台 chrome；UI-012 P-07 同结论 |
| A-3 | `/posts/<slug>` 返回链 `<a>` 135.91×**19.5**、`padding:0` | 该 `<a>` 在平台 `nav.aup-breadcrumb` 内（`aup-breadcrumb*` 仓库 0 来源）；源码 `reader.aup:11` 仅声明 `breadcrumb items=[…]`，无 padding 入口 | 平台 breadcrumb 原语 |
| A-4 | 空 `afs-list` 抢焦点（orders/ledger 加载时 `document.activeElement=.aup-list`） | `arc-contracts.md` §28.2；本轮实测仍在（但已无预滚动，见 UI-012-08） | 平台行为 |
| A-5 | `.aup-kv-row` 为平台 grid（`grid-template-columns: 140px <剩余>`，无页面 style 入口） | **QA 独立解析服务端 bundle `aup.bc92de568433b0dc.js`：style 转发白名单恰 67 键**，其中 **不含 `wordBreak` / `overflowWrap` / `whiteSpace` / `textOverflow`**（含 `padding`/`borderRadius`/`alignSelf`/`flexBasis`/`flexGrow`/`minWidth`/`minHeight`）；白名单对象在 bundle 内出现 3 次 | 页面无法用内联 style 强制断行；factory 哈希项因此无法页内收窄（BUG-035） |

> **对 UI-012-09 归因的一处口径更正**：`alignSelf` **在** 67 键白名单内，因此「`alignSelf` 被 style 白名单静默丢弃」的表述不准确——丢弃发生在 **`action` 节点的 style 转发路径**（Dev 自述 ② 的口径才对）。本轮可观测结果不变（按钮已不再拉伸，§2/09 通过），但建议把该平台事实按 Dev ② 写进 `docs/arc-contracts.md`。

---

## 4. 新增 BUG

| 编号 | 标题 | 级别 | 范围 | 阻断？ |
| ---- | ---- | ---- | ---- | ------ |
| [BUG-033](../bugs/BUG-033-pages-view-link-collapses-to-zero-width.md) | `?page=pages` 列表行 `View` 链接被 `flexGrow:0` 压成 **0 宽**，文字溢出 31px 并**实测压住** `Take offline` 按钮（20.92×16 px） | **P2** | `.aup/pages/admin/pages.aup:173`（HEAD 已存在，非本轮引入） | 否 |
| [BUG-034](../bugs/BUG-034-hub-relations-overflow-1512.md) | `?page=hub` 关系行 @1512/en 溢出残留 **92px**（Dev 披露 4–31px 只对 zh/1512 成立；UI-012-05 定为 P1 的项在 1512 未归零） | **P2** | `.aup/pages/ops/hub.aup`（关系行 / 3 个 action 同行） | 否 |
| [BUG-035](../bugs/BUG-035-factory-1512-hash-overflow.md) | `?page=factory` @1512 哈希溢出残留（`#factory-node-tx` kv-mono **over 133** ×4；intents 行 over 62；NFT 卡 over 119）；附带 tags@1512 滚动列 428 < 500 的字面验收未达成 | **P2** | `.aup/pages/ops/factory.aup`、`.aup/pages/site/tags.aup` | 否 |

**P0 = 0；P1 = 0（本轮新发现）。** 既有 P1 BUG-030 已修复并经复验（§1①）。

---

## 5. 探针、锁与实例卫生（清理自证）

```text
# 开工基线
$ node scripts/arcblog-economy.mjs order list            → count 0
$ node scripts/arcblog-economy.mjs ledger list --all      → totalCount 0
$ node scripts/arcblog-clean.mjs                          → found 0

# 探针（全部 CLI 产生，id 前缀 qa-r14f-）
product add --id qa-r14f-prod → order create --id qa-r14f-order1 → order pay --adapter manual
  → settle --order qa-r14f-order1（settledAt 2026-09-28T06:48:43.520Z）

# 定向 live（持锁串行）
$ cat docs/team/.gate-lock   → qa-round14f owner=qa start=2026-09-28T06:47:08Z
$ npm run test:file -- scripts/arcblog-economy.test.mjs  → tests 30 / pass 30 / fail 0
$ node scripts/arcblog-clean.mjs --confirm → found 40 removed 40
  byDir {"economy/ledger":12,"economy/orders":10,"economy/settlements":5,"economy/products":8,"economy/access-grants":4,"economy/refunds":1}

# 探针逐条删除（arc afs exec /blocklets/arcblog/.actions/delete --path …）
orders/qa-r14f-order1.json            → {"success":true}
settlements/qa-r14f-order1.json       → {"success":true}
ledger/qa-r14f-order1:creator_share.json → {"success":true}
ledger/qa-r14f-order1:protocol_fee.json  → {"success":true}
products/qa-r14f-prod.json            → {"success":true}

# 收尾复核
$ node scripts/arcblog-economy.mjs order list        → count 0
$ node scripts/arcblog-economy.mjs ledger list --all → totalCount 0
$ node scripts/arcblog-economy.mjs product list      → count 0
$ settlements 目录                                   → 仅剩 2 条 2026-09-23 遗留（tip-1790161886 / unattr2-order-1790162193 = 开工基线）
$ refunds / access-grants                            → LIST_ERROR: Path not found（空，与基线一致）
$ node scripts/arcblog-clean.mjs                     → found 0
$ arc afs exec …/settlements list | grep -c qa-r14f  → 0
$ git status --porcelain | grep -c qa-r14f           → 0
$ rm -f docs/team/.gate-lock ; ls docs/team/.gate-lock → No such file or directory
$ ls dist/docs/team/.gate-lock                       → No such file or directory
$ curl -s :9333/json/list | page targets             → ["1F2B2046662C9362703896A73C794B45"]  （=1）
```

浏览器收尾：共享 tab 停在 `http://arcblog.localhost:4939/?page=pages&locale=en`；guest 隔离上下文已 `Target.disposeBrowserContext`；**未新建、未遗留任何 page target（8+4 批 + 4 单发探针每批 before/after=1/1）**。

---

## 6. 门与放行结论

| 项 | 结果 |
| -- | ---- |
| `arc dsl validate --json` | **issues=[]**，exit 0 |
| `npm test` | **28/28**，exit 0（约 0.95 s） |
| `arc blocklet build` | 成功（Published，exit 0）；构建后 `diff -r .aup dist/.aup` 与 `diff -r .web dist/.web` **无输出** |
| `node scripts/arcblog-console-nav.mjs --check` | `{"ok":true,"action":"check","pages":21}` |
| `arc dsl generate --check` | `Would generate 0 file(s) — nothing to change` |
| 硬编码颜色 | **0** |
| `arc dsl lint --json` | `ok:true, changed:0, issues:28`（全部 `unreferenced_explicit_id`，非门禁） |
| 定向 live | `test:file economy` **30/30 pass**（含 3 个 R15-D `--type` 用例） |
| 复验项 ①–⑦ | 全部有明确结论（①–④ 通过；⑤ 11 已修 / 3 未完全达成并登记；⑥ 已给 100 次采集实测结论；⑦ 通过） |
| 负面用例 | ≥3：guest 页面仅见 gate 且无数据泄漏（kvRows/listItems=0）；`--type payment` / `--type bogus` / 缺值 fail-closed（用测试断言复核）；`--type=payment` 等号缺口（BUG-032，范围外）；零宽塌陷与文本重叠（BUG-033 现场复现） |
| 无未裁决 P0 / P1 | **P0=0；P1=0**（BUG-030 本轮修复并通过复验） |
| 锁 / 探针 / 浏览器 | 锁已删、探针逐条清除、`clean --confirm` 40/40、page target=1（§5） |

**VERDICT：放行（pass）。** 阻断项：**无**（BLOCKING=0）。

**给 PM / Lead 的待办（均不阻断放行）**

1. **BUG-033（P2）**：`pages.aup:173` 的 `flexGrow: 0` → 建议改 `flexBasis: auto`（Dev 在 hub 索引行已验证同法有效）或 `minWidth`；该处**已有真实文本压按钮**，建议优先于其他 P2。
2. **BUG-034（P2）**：hub 关系行 @1512/en 残留 92px > Dev 披露的 4–31px；请裁定是「页内把 3 个 action 移出该行」还是按平台项 allowlist（**平台固有性目前未成立**，QA 不建议直接 allowlist）。
3. **BUG-035（P2）**：factory 哈希 @1512 溢出（平台白名单不含 `wordBreak/overflowWrap/whiteSpace` 已由 QA 独立证实）→ 需在「factory 改单列 / 放弃 4 个 copyable 按钮 / allowlist」中选一；同项含 UI-012-11 的 1512 字面验收（428 < 500）。
4. **UI-012-08 信息顺序**（orders/ledger 首个内容卡变为列表）请按 Dev 请求追认。
5. **UI-012-13**：DID 呈现 3 次→2 次，严格「每 DID 一处」未达成（P3，建议要么删 q1–q3 kv、要么明示两者用途不同）。
6. **平台事实入库**：`docs/arc-contracts.md` 建议新增 ① 67 键 style 白名单（不含 wordBreak/overflowWrap/whiteSpace/textOverflow；含 alignSelf/flexBasis/flexGrow/minWidth/minHeight）；② 「alignSelf 被丢弃」应限定在 `action` 节点 style 路径；③ `afs-list itemStyle=row` 给行子元素 `flex:1 1 0%`，页内 `flexGrow:0` 会塌成 0 宽（BUG-033 的根因，hub 索引行的 `flexBasis:auto` 是已验证修法）。

VERDICT=pass, BLOCKING=0
