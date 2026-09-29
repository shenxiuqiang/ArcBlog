# BUG-083: `?page=general` 角色配置卡 `studio.lifecycle.claimableAt` 标签溢出所在列 10px（记录解析完成后）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-083 |
| 严重级 | **P3**（纯视觉：页面级横向溢出仍为 0、无相邻卡相交、无文字被截断到不可读；标签列宽 161px vs 标签内容 171px） |
| 发现轮次 | round-28（批次末统一 QA，D2 复测时顺带发现） |
| 关联 REQ | 无（**范围外 / 既有**：`studio.lifecycle.claimableAt` 这一行在 HEAD 就存在——`git show HEAD:.aup/pages/admin/general.aup \| grep -c studio.lifecycle.claimableAt` = 1；R28 的 general 改动只有 D2/D8） |
| 状态 | 待裁决 |

## 复现命令与最小步骤

1. 前置：admin 会话的 CDP Chrome（`http://127.0.0.1:9333`）、`arcblog.localhost:4939`、视口 **1512×765**。
2. **同一标签页**先访问任一控制台页（让会话/记录解析进入「已解析」态），再切到 `?page=general`。
3. 量 `.aup-kv-label` 的 `scrollWidth` vs `clientWidth`。

关键条件：`roles-config-kv` 的该行带 `hideWhenEmpty: true`——**全新 context 的冷载**里 `state.roles.studio.lifecycle.claimableAt` 尚未解析，该行被隐藏 ⇒ 不溢出；记录解析后（重载 / 用页内菜单往返一次 / 同标签页二次进入）该行出现 ⇒ 溢出 10px。这也解释了「同一视口两次测量结果不同」。

```bash
# 复现脚本（QA 口径：hub 展开 → 同标签页切 general）
node /tmp/qa/kvlabel.mjs          # 见报告「复现命令全集」；核心 = navigate ?page=hub, 展开, navigate ?page=general
# 对照（全新 context 直载 general）：3/3 次 soReal = []，不溢出
node /tmp/qa/probe.mjs --pages general --locales en --viewports 1512x765 --out /tmp/qa/kv.json
```

## 期望

KV 标签列不应让标签内容溢出自身盒子（UI 标准 §4.3 / §9：无硬编码、无内容越界）；或该行与同卡其它 12 个标签一样保持 `scrollWidth == clientWidth`。

## 实际

`?page=general` @1512×765、记录已解析时，`roles-config-kv` 的 `studio.lifecycle.claimableAt` 标签 `scrollWidth=171 / clientWidth=161 / over=10`；同卡另外 12 个标签（含最长的 `studio.lifecycle.assetId`）全部 `161/161`。页面级 `documentElement` 横向溢出仍为 **0**、`>R/<L` 越界 0（不破页面骨架）。

## 证据输出

```text
$ node /tmp/qa/kvlabel.mjs        # 1512x765, ?page=hub(展开) → 同标签页 ?page=general
{'text': 'studio.lifecycle.state',     'sw': 161, 'cw': 161, 'over': 0,  'fs': '12px'}
{'text': 'studio.lifecycle.assetId',   'sw': 161, 'cw': 161, 'over': 0,  'fs': '12px'}
{'text': 'studio.lifecycle.claimableAt','sw': 171, 'cw': 161, 'over': 10, 'fs': '12px'}   ← 命中
{'text': 'hub.collectionAddress',      'sw': 161, 'cw': 161, 'over': 0,  'fs': '12px'}
…
```

```text
$ node /tmp/qa/probe.mjs --pages hub,general --locales en --viewports 1512x765 --expand hub
1512x765|en|hub      soReal= [] deOver= 0
1512x765|en|general  soReal= [{'tag':'DIV','cls':'aup-kv-label','sw':171,'cw':161,'over':10,'fullBleedAncestor':False}] deOver= 0
```

```text
# 对照：全新 context 直载 general（claimableAt 行隐藏）
run 1 soReal= [] soRealContent= [] deOver= 0
run 2 soReal= [] soRealContent= [] deOver= 0
run 3 soReal= [] soRealContent= [] deOver= 0
```

退出码：0（探针）

## 影响范围

- 受影响角色：admin（控制台读者）。
- 受影响链路：界面（`?page=general` 的「外部化配置（只读）」卡标签列）。
- 数据后果：无（只读）。
- 可绕过：否（视觉）；不影响功能与可读性判定（标签仍可读，只是视觉上多出 10px）。

## 疑似文件

- `.aup/pages/admin/general.aup:325` 的 `key-value-list roles-config-kv`（`studio.lifecycle.claimableAt` 标签）
- 平台层面：`.aup-kv-label` 固定列宽（161px @1512）未随最长标签自适应——修法需 UI 先探针（改标签文案 / 缩短 / 平台列宽是平台侧还是页面侧）

## Lead 裁决（2026-09-29，R28 合并点）

**保持 open（P3）→ 排入 R29（最后一轮）**。事实：`?page=general` @1512×765 下 `studio.lifecycle.claimableAt` 的 KV 标签溢出 10px（页面 `documentElement` 横向 over 仍为 0，故不阻断）。
修法与 D1/D3 同族（行内 `flexGrow:0, flexBasis:auto` 或 KV 标签允许换行），**不**用硬编码宽度。

---

## 复验节（R29 lane P，2026-09-29）—— 已修 + 运行期复测

| 字段 | 值 |
| ---- | -- |
| 执行者 | Dev/UI（R29 lane P） |
| HEAD 基线 | `fe1e667 shenxiuqiang`（`git log -1 --format='%h %an'`） |
| Lead 裁定 | R29 P-1…P-6：写范围 = `.aup/pages/admin/general.aup` / `.aup/pages/admin/posts.aup` / `.aup/locales/**`（生成）/ 本文件（仅追加）；P-5 **显式授权**重录 UI 预算基线 |
| 状态建议 | **已修（P3）→ 待 Lead 裁定关闭** |

### 1. 修法（外科式：1 处标签字符 + 1 段注释；未加任何宽度）

* 事实：`.aup-kv-label` 是**平台原语内部元素**，其所在行是 `grid-template-columns: minmax(140px, 28%) 1fr`（`aup-app.*.css`；UI-011 P-01 / UI-012 P-02 已抓取原文，本 lane 实测 1512 下轨道 = **160.875px**、行宽 574.59px，1803 下 = 195.516px / 698.28px）。页面**没有该标签的 style 入口**：67 键 safe-style 白名单不含 `wordBreak/overflowWrap/whiteSpace/textOverflow`（`docs/arc-contracts.md` §29.8(1)），且按 UI-007 §3.2 不覆盖平台类名。
* 因此 `flexGrow: 0, flexBasis: auto` 在这个节点上**不可用**：`.aup-kv-label` 不是 flex item 而是 grid item，`.aup-kv` 是 flex **column** 容器（`flex-basis` 只作用于高度轴）——`flexGrow/flexBasis` 改不动它所在轨道的 28%。Lead P-2 的第二个分支「**让 KV 标签允许换行**」是本平台唯一可落地的写法。
* 改动：`general.aup` 中 `key-value-list roles-config-kv` 的**那一个字段**的 label 由 `studio.lifecycle.claimableAt` 改为 `studio.lifecycle.<U+200B>claimableAt`（**零宽空格**，UTF-8 `E2 80 8B`）——只在轨道不够宽时提供断行点：不新增字形、不加硬编码宽度、不改任何键名/数据/i18n，并附 13 行注释写明平台证据。`arc dsl format --check` 干净。

```text
$ python3 -c "…"            # 字节证明（全文仅 1 处 U+200B）
20 7b 6c 61 62 65 6c 3a 20 22 73 74 75 64 69 6f 2e 6c 69 66 65 63 79 63 6c 65 2e e2 80 8b 63 6c 61 69 6d 61 62 6c 65 41 74 22
```

### 2. BUG-083 前后数值（CDP；每 (语言,视口) 新 browser context + 单 page target；复现条件 = 同标签页 `?page=hub`(展开)→`?page=general`，让记录解析）

| 视口 \| 语言 | 修前 `sw/cw/over` | 修后 `sw/cw/over` | 标签盒高 | 同页 `deOver` | 同页 `.aup-kv-label` `over>1` 计数 |
| --- | --- | --- | --- | --- | --- |
| **1512×765 \| en** | **171/161/10** | **161/161/0** | 18 → **36**（2 行） | 0 | **0**（39 个标签） |
| **1512×765 \| zh** | **171/161/10** | **161/161/0** | 18 → **36** | 0 | **0**（39 个标签） |
| 1803×908 \| en | 0（未溢出，UI-018 §1 口径 16/16） | 196/196/**0** | 18（**仍 1 行**） | 0 | 0 |
| 1803×908 \| zh | 0 | 196/196/**0** | 18（**仍 1 行**） | 0 | 0 |

```text
# 修前（/tmp/laneP/bug083.mjs，1512x765 en，hub 往返后）
BASE {"deOver":0,"bodyOver":0,"hits":[{"text":"studio.lifecycle.claimableAt","sw":171,"cw":161,"over":10,"w":160.88,"h":18,
      "cols":"160.875px 397.719px","rowW":574.59}], "all":[… 其余 12 个 161/161 over=0 …]}

# 修后（/tmp/laneP/verify.mjs，同上口径）
1512x765|en {"n":39,"deOver":0,"bodyOver":0,"over1":[],
  "claimable":[{"text":"studio.lifecycle.​claimableAt","sw":161,"cw":161,"over":0,"h":36,"zwsp":true,
                "cols":"160.875px 397.719px","rowW":574.59}, {…"studio.claimableAt" 161/161…}]}
1512x765|zh {"n":39,"deOver":0,"bodyOver":0,"over1":[], "claimable":[{…161/161 over=0 h=36…}]}
1803x908|en {"n":39,"deOver":0,"bodyOver":0,"over1":[], "claimable":[{…196/196 over=0 h=18…}]}
1803x908|zh {"n":39,"deOver":0,"bodyOver":0,"over1":[], "claimable":[{…196/196 over=0 h=18…}]}
```

### 3. D9 复验（同 lane P-3；来源 = UI-018 §11.7 写范围外观测项）

* 源码：`posts.aup:168/197/198/219/220/241/242` 各追加 `style={borderRadius: "var(--radius-md, 8px)"}`（7 处，全部此前无内联 `borderRadius`）。`arc dsl format --write` 只把其中 5 处含 `events` 的 `style` 移到 `events` **之前**（格式器固有 prop 顺序），行数 **256 → 256** 不变。
* 运行期（`/tmp/laneP/d9-tabs.mjs`；posts 页按页签切换，1803×908 与 1512×765 × en 两组读数一致）：

| 页签 | 可见 `.aup-action` 数 | `radii` | `not8` | 覆盖源码行 |
| --- | ---: | --- | --- | --- |
| Published | 7 | `["8px"]` | `[]` | `168`(New post) / `197`(Archive) / `198`(Remove from public) |
| Drafts | 33 | `["8px"]` | `[]` | `219`(Publish) / `220`(Delete) |
| Archived | 9 | `["8px"]` | `[]` | `241`(Publish) / `242`(Delete) |

* 抽样 **7 页** @1803×908 en（`/tmp/laneP/verify.mjs` → B 段）：`posts 7 / general 13 / policy 57 / hub 17 / dashboard 2 / factory 11 / pages 2`，**全部 `radii: ["8px"]`、`not8: []`**；`--radius-md` 实测 `8px`。

### 4. 门禁（真实命令 + 实际结果）

| 门 | 命令 | 实际结果 |
| --- | --- | --- |
| DSL 校验 | `arc dsl validate --json` | `"issues": []`（exit 0） |
| DSL 格式 | `arc dsl format --check` | `Would format 0 file(s)`（首次为 `changed: .aup/pages/admin/posts.aup`，见 §3 说明后用 `arc dsl format .aup/pages/admin/posts.aup --write` 收口，只重排我的 5 行） |
| 漂移 | `arc dsl generate --write` → `--check` | `Generated 0 file(s)` → `Would generate 0 file(s)`（**`.aup/locales/**` 零改动**） |
| 快层 | `npm test` | **tests 55 / pass 55 / fail 0**（首跑 54/55，唯一红灯 = UI 预算 ratchet `posts.styles: 6 -> 13`，见 §4.1） |
| 构建 | `npm run build` | exit 0；scrub `removed: [".env.local","node.key"]`、`manifestRemoved` 同两项 |
| 侧栏 | `node scripts/arcblog-console-nav.mjs --check` | `ok: true`、`pages: 21` |
| dist 一致 | `diff -r .aup dist/.aup` / `diff -r .web dist/.web` | 两条都**空**（rc 0） |
| 密钥 | `node scripts/arcblog-dist-secrets.mjs --check` | `ok: true`、`files: []`、`privateKeyFiles: []`、`manifestEntries: []` |
| 行数自检 | `wc -l` | `general.aup 382 → 395`（+13 注释，无删除）；`posts.aup 256 → 256` |

#### 4.1 UI 预算基线重录（P-5 显式授权）

`scripts/ui-budget-baseline.json` **不在 P-1 的文件清单内**，按 P-5「若因新增控件触发 ui-budget ratchet → 显式重录」执行：

```text
$ node scripts/arcblog-ui-budget.mjs --write-baseline
wrote scripts/ui-budget-baseline.json (22 pages)
change vs the previous baseline:
  ~ posts: styles: 6 -> 13
```

逐页差异（`git diff -- scripts/ui-budget-baseline.json`）：**只有 `posts.styles 6 → 13`**（正好 = 新增的 7 个内联 `borderRadius`），加 `_sources.posts` 与 `_sources.general` 两个来源 hash 更新；其余 **20 页逐值不变**，无任何页变差。

### 5. 运行期恢复证明（`arc-contracts.md` §35(5) 口径）

| 步骤 | 命令 | 结果 |
| --- | --- | --- |
| 重启前 | `arc service status` | pid **33421**，Started `2026-09-29T06:46:05.657Z` |
| 重启 | `arc service restart` | exit 0 → pid **80931**，Started `2026-09-29T07:54:33.001Z`，Status `up` |
| 复挂 | `arc blocklet run /Users/shenxiuqiang/workspace/ArcBlog` | `Serving blocklet "arcblog" on port 4939`（exit 0） |
| `/instance` 读证明 | `arc afs exec /blocklets/arcblog/.actions/read --args '{"path":"/instance/app/arcblog/node/role-verification.json"}' --json` | `"success": true`、`updatedAt 2026-09-29T06:10:52.962Z` |
| 站点 | `curl -s -o /dev/null -w '%{http_code}' 'http://arcblog.localhost:4939/?page=general'` | **200** |
| target 账本 | `curl /json/list` 探针前后计数 | page target **12 → 12**（无新增/遗留） |

### 6. 未决与诚实登记

* **零宽空格是不可见控制字符**：该标签的 `textContent` 会多一个 U+200B（`innerText`/终端显示与原文一致）。任何对 `studio.lifecycle.claimableAt` 做**逐字节**比对的旧探针会失配——`/tmp/qa/kvlabel.mjs`（BUG-083 的原始复现脚本）只打印文本与 `sw/cw`，**不受影响**，本次复验即用同类探针。
* 替代方案（**未采用**，请 Lead 知悉）：给 roles 卡加 `gridColumn: "1 / -1"`（`gridColumn` 在 67 键白名单内）可让轨道变宽、**完全不改标签文本**，但会把该卡从 2 列布局改成整行贯通，属设计层变更，超出 P-4「外科式」的意图。
* 1512×765 下该行标签变为 **2 行**（盒高 18 → 36）；1803×908 仍 1 行、逐值不变。是否接受「KV 标签偶发两行」，请 Lead/UI 裁定。
* 未跑全量 `npm run test:live`（用户裁定 2026-09-27）；未改 `spec` / `checklist` / `arc-contracts.md` / `docs/team/**`（本文件除外）；未做任何 git 写操作。
* `git log -1 --format='%h %an'` → `fe1e667 shenxiuqiang`
