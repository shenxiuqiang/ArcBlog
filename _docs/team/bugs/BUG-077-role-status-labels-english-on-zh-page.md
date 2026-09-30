# BUG-077: `?page=general` 角色状态行的状态值在 zh 页面仍是英文（`granted` / `withheld` / `yes` / `no`）—— 中文页面中英混排

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-077 |
| 严重级 | **P3**（i18n/文案：不影响功能与数据；REQ-034 要求 en/zh 成对交付） |
| 发现轮次 | round-26（QA `task-112` 独立验证 REQ-034 A/B 组时发现） |
| 关联 REQ | [REQ-034](../requirements/REQ-034-roles-capabilities-settings.md) §3.1 A2/A3、§3.2 B1/B3（五态 + `configured`/`active`/原因三元，en/zh 呈现） |
| 状态 | **待裁决**（QA 未修改任何源码） |

## 复现命令与最小步骤

```bash
# 单 tab、admin context、locale=zh（`?locale=zh`），读 ?page=general 的角色状态列表
node docs/team/test-reports/raw/round-26/qa-r26-browser.mjs general
# qa-r26-general.json → general.zh.text（摘录见下）
```

## 期望

中文页面的标签与取值都应是中文（或至少与 en 页面同样可读）；本卡其余文案（标题、说明、字段名）都已成对翻译。

## 实际

zh 页面里：

- 标签是中文：`能力：` / `持有资产：` / `已配置：`
- **取值是英文**：`granted` / `withheld` / `yes` / `no`
- 扣留原因是引擎原文（REQ B2 要求「逐字」，英文原文是**刻意**的，不算本条问题）

根因位置很清楚：取值来自 worker 写进 `node/role-status/<role>.json` 的 `activeLabel` / `configuredLabel` / `assetOwnedLabel`（`'granted' | 'withheld' | 'yes' | 'no'`），页面直接插值 `${entry.content.activeLabel}`，因此不受 locale 影响。

## 证据输出

```text
$ node docs/team/test-reports/raw/round-26/qa-r26-browser.mjs general
# qa-r26-general.json → general.zh.text（逐字摘录，three rows）
角色状态（来自最近一次快照）
…
basic
none
能力： granted
持有资产： no
已配置： no
…
hub
acquired
能力： withheld
持有资产： yes
已配置： yes
…
studio
none
能力： withheld
持有资产： no
已配置： yes
```

对比 en（同一份 QA 采集）：`Capability: granted` / `Asset owned: no` / `Configured: no` —— 英文页面自洽，zh 页面中英混排。

退出码：0

## 影响范围

- 受影响角色：`?page=general` 的 zh 用户
- 受影响链路：界面文案（快照投影记录的 label 字段），不涉及写路径
- 数据后果：无
- 可绕过：无
- 复发面：`node/role-status/*` 是 **Dev 探针遗留的实例记录**（REQ-034 H6 未登记项）。若 Lead 决定删除这些记录，页面会回落到空态 —— 那时本条不可观察；若保留，则应把 label 做成 i18n（页面侧映射，或 worker 存布尔 + 页面 `$t()`）

## 疑似文件

> 线索不是结论；QA 未修改。

- `.aup/pages/admin/general.aup`（`$t(general.roles-active) ${entry.content.activeLabel}` 等三处插值）
- `scripts/lib/role-verify.mjs`（`activeLabel` / `configuredLabel` / `assetOwnedLabel` / `stakeActiveLabel` 的取值）

---

## Dev 复验（lane H · **自证，非独立 QA** · 2026-09-29）

> lane 规则只允许 `arc dsl validate --json` / `node --test <本 lane 测试>` / `arc dsl lint`；**未跑** `arc dsl generate` / `npm test` / `npm run build` / 浏览器 harness。下列每条都是**真实命令 + 真实输出**。

**判定：部分修复（标签全中文化 + 引擎词表 zh 对照）；取值仍是引擎原文——平台无「按运行期取值选本地化文案」的机制，已按设计文档的降级口径处理。**

### 0) 复现点已前移（当前 HEAD 的 `general.aup` 与 QA 采集时的版本不同）

QA 采集时的 DOM 是 `能力： granted`（标签已 i18n + 值未译）。当前 HEAD 的角色行已重构为 `key-value-list`，采集时的问题在 HEAD 上的等值形态是：

```text
（HEAD / zh，?page=general 角色与能力卡）
basic.stakeState  none
basic.active      granted        ← 值：英文
basic.configured  no             ← 值：英文
basic.assetOwned  no             ← 值：英文
basic.reason (verbatim)  basic capability is implicit for every instance
```

即**标签本身也是英文硬编码字面量**（`basic.active` …），zh 页面整卡中英混排。

### 1) 修法（写范围：`.aup/pages/admin/general.aup` + `.aup/locales/{en,zh}.json`）

- 17 个角色行标签由英文硬编码字面量改为**页面 i18n key**（`general.roles-k-{basic,studio,hub}-*`），zh 逐个给出中文：`基本角色·能力状态` / `基本角色·已配置` / `基本角色·持有资产` / `Studio 角色·扣留原因（逐字）` …
- 新增常驻 dim 说明 `general.roles-reason-note`（`p :roles-reason-note scale=caption intent=muted`，位于三行角色记录**之后** = 设计 §4.1 的「列表后常驻 dim 说明」），**在同一处**给出引擎词表的 zh 对照：`` `granted` = 能力已授予；`withheld` = 能力被扣留（fail closed）；`yes` / `no` = 引擎派生的布尔取值；`(none)` = 无 withheld（不是取值缺失） ``，并写出降级原因与平台限制（`arc-contracts` §28.8 / §28.1）。
- **取值保持引擎原文**（`${state.*.activeLabel}` 等未动）。原因（实测结论，非取舍）：
  - `$t()` 的 key 必须是**编译期常量**——`p "$t(posts.status-${entry.content.status})"` 实测原样渲染字面量，浏览器侧没有第二条 `$t(` 解析路径（`arc-contracts.md` §28.8）；
  - 页面表达式语言无比较、无动态 key；`visible` 对异步 `$state.*`/`$entry.*` 无法表达「有数据才显示」（§28.1）；
  - 设计文档已裁定该降级：**本地化标签 + 原始值可见 + 常驻 dim 说明**（`docs/ArcBlog-admin-ui-design.md` §4.1 / §5.5，先例 BUG-005 / Lead D6）。
  - **结论**：把取值本身中文化需要改投影/worker（每个 locale 一份记录）或平台支持动态 i18n——前者不在本 lane 写范围，后者本平台不支持。**请 Lead 裁定是否接受「标签中文 + 词表 zh 对照 + 取值原文」为达标。**

### 2) 证据（en 不变 / zh 译文命中）

```bash
$ node --input-type=module -e "
import { readFileSync } from 'node:fs';
const en = JSON.parse(readFileSync('.aup/locales/en.json','utf8'));
const zh = JSON.parse(readFileSync('.aup/locales/zh.json','utf8'));
const p  = readFileSync('.aup/pages/admin/general.aup','utf8');
const refs = [...p.matchAll(/label: :([a-z0-9-]+)/g)].map((m) => m[1]);
const note = zh['general.roles-reason-note'];
console.log('label references:', refs.length, '| missing en/zh:', refs.filter((k) => !en['general.'+k] || !zh['general.'+k]).length);
console.log('engine words glossed in zh:', ['granted','withheld','yes','no','(none)'].every((w) => note.includes(w)));
console.log('zh basic reason label:', zh['general.roles-k-basic-reason']);
console.log('zh studio reason label:', zh['general.roles-k-studio-reason']);
console.log('note element rendered:', /p :roles-reason-note scale=caption intent=muted/.test(p));
console.log('withheld value still the engine label:', /roles-k-withheld, value: .*withheldCapabilitiesLabel/.test(p));
console.log('en/zh key sets identical:', JSON.stringify(Object.keys(en).sort()) === JSON.stringify(Object.keys(zh).sort()), Object.keys(en).length);
"
```

```text
label references: 28 | missing en/zh: 0
engine words glossed in zh: true
zh basic reason label: 基本角色·原因（逐字；非扣留原因）
zh studio reason label: Studio 角色·扣留原因（逐字）
note element rendered: true
withheld value still the engine label: true
en/zh key sets identical: true 872
```

```bash
$ git diff .aup/locales/en.json | grep '^-' | grep -v '^---'     # 被改写的行
-  "general.roles-claimable-note": "Waiting period: …"
$ git diff .aup/locales/en.json | grep -c '^+[^+]'               # 新增行
19                                                               # 18 个新 key + 上面那行的逗号改动
$ git diff .aup/locales/en.json | grep '^-' | grep -v '^---' | grep -vc 'roles-claimable-note'
0                                                                # 既有 en 值一个都没被改
```

- **en 不变**：17/17 新标签的 en 文案与 HEAD 里被替换的字面量**逐字节相同**（`basic.active` → `basic.active` …）；`git diff` 层面 en locale **零改值**（唯一改写是 `claimable-note` 行尾加逗号）。
- **zh 译文命中**：zh locale 对 17 个标签与 1 条说明全部有值（`missing en/zh: 0`），且 4 个引擎词 + `(none)` 全部有 zh 对照。
- **locale 手工同步**（本 lane 不跑 `generate`）：`.aup/locales/en.json` / `zh.json` 各 872 键、键集完全一致；逐个核对页面 `i18n {}` 块与 locale 值 → `page i18n keys checked: 96 | mismatches vs locale JSON: 0`（即 `arc dsl generate` 的合并对这批 key 是 no-op，不会引入二次漂移；先例：`general.roles-claimable-note` 同为手写尾部追加，`generate --check` 在 HEAD 上为 clean）。

```text
$ arc dsl validate --json     → "ok": true, "issues": []          （未出现 stale_generated_locale_json）
$ arc dsl lint                → issues 87 = 全部 unreferenced_explicit_id
                                （与 HEAD 同数；dead_locale_keys = 0，format_changed = 0）
$ node --test scripts/arcblog-roles-settings.test.mjs → tests 6 / pass 6 / fail 0
$ node --test scripts/arcblog-i18n.test.mjs           → tests 5 / pass 5 / fail 0（含 no locale key is dead）
```

- ⚠️ 踩坑记录：把解释性 `//` 注释放进 `i18n { }` 块会让 `arc dsl lint` 报 `format_changed`（`.aup/pages/admin/general.aup`）—— 已把说明移到角色卡的既有 `//` 注释块（页面体内注释不触发），`format_changed` 归零。

**受限未验证（原因）**：`?page=general&locale=zh` 的 **DOM 渲染**（含四组视口 1803×908 / 1512×765 × en/zh 的 `over=0`）本 lane **未跑**（lane 规则禁止跑浏览器/`generate`/`build`；渲染前需 Lead 先 `arc dsl generate --write`）。给 Lead/QA 的复核配方：
1. `arc dsl generate --write` + `npm run build` + `arc service restart`（按仓库惯例）；
2. 打开 `/?page=general`（en）与 `/?page=general&locale=zh`，在 1803×908 与 1512×765 各读一次：角色与能力卡内 17 个标签应为中文、`roles-reason-note` 常驻一行、**取值仍为 `granted`/`withheld`/`yes`/`no` 原文**（预期，非缺陷）；
3. 量 `scrollWidth - clientWidth`：长文案已刻意压到短标签（对照：`基本角色·能力状态` vs 原 `Basic role · capability state` 类 2 倍长度风险），但**未实测**。

