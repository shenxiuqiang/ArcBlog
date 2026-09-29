# BUG-078: `?page=general` 对**已授予**的 `basic` 角色也显示「Withheld reason（扣留原因）」标签——标签与状态语义不符

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-078 |
| 严重级 | **P3**（文案：标签错位；不涉及功能、权限或数据） |
| 发现轮次 | round-26（QA `task-112` 独立验证 REQ-034 B 组时发现） |
| 关联 REQ | [REQ-034](../requirements/REQ-034-roles-capabilities-settings.md) §3.2 B2（每个 `active=false` 的链角色显示 `reason` 原文）、B3（`configured`/`active`/原因三元） |
| 状态 | **待裁决**（QA 未修改任何源码） |

## 复现命令与最小步骤

```bash
node docs/team/test-reports/raw/round-26/qa-r26-browser.mjs general
# qa-r26-general.json → general.en.text / general.zh.text 的第一行角色是 basic
```

## 期望

`reason` 字段对 `basic` 是「为什么它是隐式授予的」（`basic capability is implicit for every instance`），不是「为什么被扣留」。标签应随角色状态变化（例如 `basic` 用「Reason」，`studio`/`hub` 用「Withheld reason」），或统一改成中性的「Reason」。

## 实际

三个角色行都无条件使用同一个标签：

```text
basic   none  Capability: granted
    …
    Withheld reason (verbatim from the role engine): basic capability is implicit for every instance
hub     acquired  Capability: withheld
    Withheld reason (verbatim from the role engine): stake state is "acquired"; chain verification is not wired yet (fail closed, spec §115)
studio  none  Capability: withheld
    Withheld reason (verbatim from the role engine): stake state is "none"; chain verification is not wired yet (fail closed, spec §115)
```

`basic` 行左侧写着 `Capability: granted`，右侧却写「Withheld reason」，自相矛盾；REQ-034 B2 的口径本身只要求 `active=false` 的链角色显示原因。

## 证据输出

```text
$ node docs/team/test-reports/raw/round-26/qa-r26-browser.mjs general
# general.en.text（逐字）
basic
none
Capability: granted
Asset owned: no
Configured: no
collectionAddress / network / assetType / lifecycle.state …: / / / none
Recorded assetId / stakeId / claimableAt …: / /
node/factories.json projection says (state / assetId) …: /
claimableAt (relative)
just now
basic capability is implicit for every instance — there is no chain record to compare
Withheld reason (verbatim from the role engine): basic capability is implicit for every instance
```

zh 页面同样：`能力： granted` … `扣留原因（逐字来自角色引擎）: basic capability is implicit for every instance`。

退出码：0

## 影响范围

- 受影响角色：`?page=general` 的 admin 用户（en/zh 均受影响）
- 受影响链路：界面文案（`roles-k-reason` 标签）
- 数据后果：无（`reason` 值本身逐字来自引擎，正确）
- 可绕过：无

## 疑似文件

> 线索不是结论；QA 未修改。

- `.aup/pages/admin/general.aup`：`p "$t(general.roles-k-reason): ${entry.content.reason}"`（无条件下同一个标签）
- 可选修法：把标签做成 `activeLabel` 的函数（如 `granted` → Reason / 否则 Withheld reason），或把标签改为中性措辞

---

## Dev 复验（lane H · **自证，非独立 QA** · 2026-09-29）

> lane 规则只允许 `arc dsl validate --json` / `node --test <本 lane 测试>` / `arc dsl lint`；**未跑** `arc dsl generate` / `npm test` / `npm run build` / 浏览器 harness。下列每条都是**真实命令 + 真实输出**。

**判定：已按设计文档的降级口径修复（中性标签 + 已授予角色显式「无 withheld」+ 常驻 dim 说明）；「真实 `visible` 条件渲染」在本平台不可实现，故未采用（见 §3）。**

### 1) HEAD 上的等值形态

QA 采集时的字面标签 `Withheld reason (verbatim from the role engine)` 在 HEAD 已被重构掉，但语义错位仍在：`basic`（引擎里 `active = (role === 'basic')`，永远已授予）与 `studio`/`hub`（fail closed）三行共用同一个无差别标签 `basic|studio|hub.reason (verbatim)`，整卡标题仍是 `Withheld capabilities & the raw reason`，zh 侧对「已授予 ⇒ 没有扣留原因」**一个字都没说**。

### 2) 修法（`.aup/pages/admin/general.aup` + `.aup/locales/{en,zh}.json`）

1. **标签随角色语义分化，且 en 逐字节不变**：
   - `basic` → zh「**基本角色·原因（逐字；非扣留原因）**」（en 仍是 `basic.reason (verbatim)`）——直接说出「这行不是扣留原因、无 withheld」；
   - `studio`/`hub` → zh「**Studio/Hub 角色·扣留原因（逐字）**」（en 仍是 `studio.reason (verbatim)` / `hub.reason (verbatim)`）。
2. **常驻 dim 说明** `general.roles-reason-note`（`p :roles-reason-note scale=caption intent=muted`，位于**三行角色记录之后**，即设计 §4.1 的「列表后常驻 dim 说明」）——**无条件成立**（设计 §4.8：不得伪造条件）：
   - 「能力已授予的角色**没有被扣留的东西**——`basic` 那行的 `reason` 说明的是「为什么它是隐式授予」，不是「为什么被扣留」；能力被扣留的角色在同一行给出扣留原因」；
   - 「`(none)` = **无 withheld**（不是取值缺失）」——把「已授予 ⇒ withheld 清单为空」如实读出来；
   - 并按设计 §4.1 的硬边界 ③ **写出降级原因与平台限制**（`$t()` key 必须编译期常量 arc-contracts §28.8；`visible` 只支持同步 `$session.*` arc-contracts §28.1）。
3. **未改数据面**：`withheldCapabilitiesLabel` / `reason` 仍逐字来自引擎（`scripts/lib/role-verify.mjs`，不在本 lane 写范围）；「引擎原文可见」是设计 §5.5 的硬要求，改写会掩盖真实原因。

### 3) 为什么不是「只在确有 withheld 时展示」的条件渲染

| 机制 | 实测结论 | 出处 |
| ---- | -------- | ---- |
| `visible` 挂异步 `$state.*`/`$entry.*` | 拿不到「有数据才显示」语义（`visible="$entry.content.count"` 恒真、`!${…}` 恒隐藏）；取反不可靠 | `arc-contracts.md` §28.1（Round 6/7 实测） |
| 动态 i18n key `$t(page.status-${…})` | 运行期**原样渲染字面量**，浏览器侧无 `$t(` 解析路径 | `arc-contracts.md` §28.8（Round 7 实测 + bundle 检索） |
| 页面自造「空态互斥」 | 被设计文档禁止（假条件 = 假话） | `docs/ArcBlog-admin-ui-design.md` §4.8 |
| 合法路径 | **本地化中性标签 + 原始状态值可见 + 常驻 dim 说明** | 设计 §4.1 / §5.5；先例 BUG-005 / Lead D6 |

**故本条以「标签分化 + 常驻说明如实说『无 withheld』」落地，不声明任何伪造条件。**

### 4) 证据

```text
（复现命令 = BUG-077 复验节 §2 的那条内联 `node --input-type=module -e`；下面是本条相关行）
label references: 28 | missing en/zh: 0
engine words glossed in zh: true
zh basic reason label: 基本角色·原因（逐字；非扣留原因）
zh studio reason label: Studio 角色·扣留原因（逐字）
note element rendered: true
withheld value still the engine label: true

$ git diff .aup/locales/en.json | grep '^-' | grep -v '^---' | grep -vc 'roles-claimable-note'
0                                                                        # 既有 en 值零改动（17 个标签 en 文案 = HEAD 字面量）

$ arc dsl lint                → issues 87（全部 unreferenced_explicit_id，与 HEAD 同数）；dead_locale_keys 0 / format_changed 0
$ arc dsl validate --json     → "ok": true, "issues": []
$ node --test scripts/arcblog-roles-settings.test.mjs → tests 6 / pass 6 / fail 0（含「无正面『链上已验证』措辞」与「五态词表同源」两条既有门）
$ node --test scripts/arcblog-i18n.test.mjs           → tests 5 / pass 5 / fail 0
```

**受限未验证（原因）**：`?page=general` 的 DOM（en/zh × 1803×908 / 1512×765）本 lane 未跑（lane 规则禁止浏览器 / `generate` / `build`）。复核配方见 BUG-077 复验节 §2；本条额外要看的是：`basic` 行标签为「基本角色·原因（逐字；非扣留原因）」、三行角色记录**之后**常驻 `roles-reason-note`、`withheldCapabilitiesLabel` 为空时显示 `(none)` 且说明已写明「即无 withheld」。

**残余风险（如实登记）**：`basic` 是「永不扣留」这一措辞依赖引擎现状（`scripts/lib/roles.mjs:146` `active: role === 'basic'`）。若将来链验证接通并改变 `active` 的派生，`general.roles-k-basic-reason` 的 zh 文案需同步复核——本 lane 无可写测试位点（`arcblog-roles-settings.test.mjs` 不在本 lane 写范围），建议 Lead 在接通验证器的那一轮把该措辞列入回归项。

