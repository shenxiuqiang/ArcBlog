# REQ-024 — Factory 模板展示收敛（**单列 + 收敛展示字段**；公钥类默认不展示或折进「高级」；四组视口零溢出 → **关 BUG-035**）

| 字段 | 值 |
| ---- | -- |
| REQ 编号 | **REQ-024** |
| 对应 spec 章节 | **§15.7 / §15**（Admin UI 的「领域信息呈现」与 §9 验收清单）；**§8.1–§8.4**（Factory 元数据 / 角色 NFT 生命周期）；UI 标准 [`docs/ArcBlog-admin-ui-design.md`](../../ArcBlog-admin-ui-design.md) **§4.1 / §4.3 / §4.4 / §5.1 / §9**；[`docs/arc-contracts.md`](../../arc-contracts.md) **§29.8**（style 转发白名单 67 键） |
| checklist 行 | 第 **64** 行「NFT Factory（消费链上工厂）」（§8.1，现 ✅）——**本 REQ 不改状态列**；缺陷来源 = **BUG-035**（P2，R14F QA 新增） |
| 优先级 | **P2**（`?page=factory` 在 **1512×765** 下哈希行**真实文本溢出**（over **133** / 121 / 120 / 112）× 4 + 意图行 62 + NFT 卡 119；不阻断功能与权限，但违反 UI 标准 §4.4 的「不溢出」并要求结构修法） |
| 提出轮次 | **Round 15**（精简轮；PM `task-62` 规划） |
| 负责角色 | **Dev（`task-59`）** 实现 ｜**QA（`task-63`）** 独立验证 ｜PM（`task-62` / `task-64`） |
| 状态 | ✅ **完成（Round 15，2026-09-28）**——Dev 交付 + QA-011 独立验证**放行**；**BUG-035 已闭环**；结果见 §7 |
| 上游 | Lead 裁定 **L-R15-3**（**D34 已裁 = 「改单列 + 收敛展示字段」**）；[BUG-035](../bugs/BUG-035-factory-1512-hash-overflow.md)（P2，`?page=factory` @1512 实测值）；[UI-012](../design/UI-012-ui-audit-and-fixes.md) §2 **UI-012-07**（修法建议）与 §6 受限项 3（两条候选 CSS 被干跑否掉）；`docs/arc-contracts.md` **§29.8**（白名单**不含** `wordBreak` / `overflowWrap` / `whiteSpace` / `textOverflow`） |
| 下游 | [journal/round-15.md](../journal/round-15.md)、`test-reports/round-15.md`（QA-011）、[backlog.md](../backlog.md)「本轮：Round 15」、BUG-035 状态回写 |

> **一句话**：`?page=factory` 把 4 个 64 位交易哈希、工厂地址、issuer 等**公钥 / 哈希类长值**塞在横向 `row` / `key-value-list` 单行里，在 **1512×765** 下真实溢出（over 133 / 121 / 120 / 112 + 意图行 62 + NFT 卡 119）；本 REQ 按 **D34** 把它改成**单列**（每个哈希一行 label + 值）并**收敛展示字段**（公钥类默认不展示或折进「高级」），**保留一键复制**、**不做 allowlist**，目标 = **en/zh × 1803×908 / 1512×765 四组零溢出**。

---

## 1. 背景

### 1.1 缺陷事实（BUG-035 / QA-010 独立复验；`?page=factory`）

```text
# 1512×765（en 与 zh 同值）
#factory-node-tx 的 .aup-kv-row.aup-kv-mono ×4：cw=572 / sw=705,693,692,684 → over 133 / 121 / 120 / 112
1803 对照：cw=695 / sw=705 → over 10
factory intents 行：.aup-view cw=479 over 62；.aup-text（result.hash）over 62（zh 52）
NFT 卡：.aup-view cw=600 sw=719 → over 119（zh cw=489 over 52）
docOver=0、hScrollers=[]（无页面级横向滚动条）
```

- 结论：**页面级没有横向滚动条**（`docOver=0`），但**元素内部文本被压出容器**（`sw > cw`）——UI 标准 §4.4 / §9 要求「不溢出」，且 R14F 已把「溢出与重叠」定为验收项（L-R14F-5）。

### 1.2 平台约束（决定修法只能是「改结构」）

- `docs/arc-contracts.md` **§29.8**：style 转发白名单 **67 键**，**不含** `wordBreak` / `overflowWrap` / `whiteSpace` / `textOverflow` ⇒ **页内 CSS 断行不可行**。
- UI-012 §6 受限项 3：两条候选 CSS（`overflow-wrap:anywhere`、`word-break:break-all`）已在页面内**干跑否掉**（要么计数不变、要么只降元素数不降最大值，因为根因是 flex `row` 不可收缩）。
- ⇒ 修法必须落在 **`.aup` 结构**（Dev 写范围），**不能**靠 `.web` 覆盖平台类名，**也不能**把页面列入 allowlist。

### 1.3 Lead 已裁定（D34）

- **选「改单列 + 收敛展示字段」**；
- **不选**「放弃复制按钮」（会丢 §15 的「一键复制」能力）；
- **不选** allowlist（这是**页内布局可改项**，不是平台固有）；
- **公钥类字段**（`issuer` / PK / PEM / `stakeAddress` 等）**默认不展示或折进「高级」**；
- **目标 = 四组视口零溢出**（关 BUG-035）。

---

## 2. 范围

### 2.1 做

1. **A0 探针（先做）**：`?page=factory` 在 **en/zh × 1803×908/1512×765** 四组下的溢出清单（元素 + `cw/sw/over` + 是否被裁剪祖先裁掉）+ `docOver` + `hScrollers`；**同时记录数据前提**（哪些字段 `hideWhenEmpty`，实例里是否为空——R14F 复测时 `#factory-node-tx` 曾因记录清空而消失）。
2. **单列化（结构修法）**：
   - `#factory-node-tx` 的 **4 个哈希各占一行**（每行 label + 值；值**保留 `copyable`**，monospace 不丢）；
   - `?page=factory` 的 **intents 行**按 UI-012-07 的建议拆行（label / 值与时间分开），消除 `over 62`；
   - **NFT 卡**（`over 119`）收敛内部行，消除溢出。
3. **收敛展示字段**：公钥 / 哈希类（`factory-address`、`issuer`、`stakeAddress`、PK / PEM 等）**默认不展示或折进「高级」**（默认折叠）；展开后**仍零溢出**、字段**仍可复制**。**不得为了不溢出而静默丢字段**（记录里有的字段必须至少在「高级」可见，或在报告里逐条登记为有意不展示 + 理由）。
4. **四组零溢出**：`en/zh × 1803×908/1512×765` 下 `?page=factory` 的 `textOverflow` 为空（或仅剩 ≤1px 亚像素，须列明并解释）、`docOver=0`、`hScrollers=[]`。
5. **零回归**：21/21 控制台页 `docOver=0`、每页 `active=1`、无 `SESSION INIT FAILED`；`?page=orders` / `?page=ledger` 的首屏卡片顺序不回退；`?page=hub` / `?page=pages` 的既有状态不回退（BUG-034 / BUG-033 **不在本 REQ 范围**，见 §2.2）。
6. **保留能力**：一键复制（`copyable`）与 monospace 语义在收敛后仍在；NFT SVG 卡（若被收敛）不丢图示能力。

### 2.2 明确不做

- **不放弃复制按钮**（D34 明确排除）；**不做 allowlist**（D34 明确排除；平台白名单已证伪 CSS 断行）。
- **不用页内 CSS 覆盖平台类名**（UI-007 §3.2 既定口径；UI-012 §6 已干跑否掉两条候选）。
- **不顺手修 BUG-033 / BUG-034**（`?page=pages` 0 宽 / `?page=hub` @1512 over 92——不在本 REQ 范围，仍在排队 R15-11 / R15-12；**若 Lead 任务书并入本批次则以任务书为准**）。
- **不伪造**：不生成 AFS 中不存在的哈希；不把空值渲染成假值（空值走平台占位 `—`）。
- **不改 `scripts/lib/chain.mjs` 的数据形状**（本 REQ 只改展示；链侧见 [REQ-023](REQ-023-chain-environment-externalization.md)）。
- **不改 spec / checklist 状态列 / `blocklet.yaml` / `world/**` / `.web/**`**；**不新增测试文件**；**不跑全量 `npm run test:live`**。
- **不重开**已闭环项（BUG-030 / BUG-031 / D-01 / R15-D / UI-012 已修 11 条）。

---

## 3. 验收标准（每条都是可执行命令或可观察行为）

### 3.0 门（每步跑；QA 独立重跑）

```bash
arc dsl validate --json          # "ok": true / "issues": []
npm test                         # tests 28 / pass 28 / fail 0
arc blocklet build               # 改了 .aup/** 必须 build
diff -r .aup dist/.aup           # 无输出（IDENTICAL）
node scripts/arcblog-console-nav.mjs --check   # {"ok":true,"action":"check","pages":21}
arc dsl generate --check         # Would generate 0 file(s) (dry-run) — nothing to change
```

### 3.1 A0 — 探针（先做；四组原始值必须贴回报）

- 采集矩阵：`?page=factory` × {en, zh} × {1803×908, 1512×765}；每格给 `textOverflow[]`（含 `cw/sw/over`，并区分「是否被裁剪祖先裁掉」）、`docOver`、`hScrollers`、`timeCount`（不相关但保持回归）、以及 `#factory-node-tx` / intents 行 / NFT 卡三类元素的实测 rect。
- **数据前提**：记录当前 `node/factories.json` 是否为空（`hideWhenEmpty` 会让整行消失）→ 空数据下**必须额外造一次非空探针数据或如实登记受限**。
- **验收**：before 值落盘（回退基线）+ 报告贴原始 JSON 摘录。

### 3.2 A1 — 单列化落地（逐元素）

- 断言：`#factory-node-tx` 的 4 个哈希在 1512 下**每个占一行**（`.aup-kv-row.aup-kv-mono` 数量 = 4，且每个 `sw <= cw`）。
- 断言：intents 行 `sw <= cw`（消除 `over 62`）；NFT 卡内部无 `sw > cw`。
- 断言：`copyable` 仍在（每个哈希行有可复制的值或复制按钮；元素尺寸仍 ≥24×24，不得回退 R14F 的命中区修复）。
- **验收**：四组 `textOverflow` 表 + 逐元素 before/after rect 对照。

### 3.3 A2 — 收敛展示字段（公钥类默认不展示或折进「高级」）

- 断言：默认视图下**不出现** PK / PEM / 私密类字段；`issuer` / `stakeAddress` / 工厂地址 / tx 哈希按 D34 的收敛口径呈现（默认折叠或单列展示——以 Dev 的 A0 后提案为准，**须写明每一项的归属**）。
- 断言：「高级」展开后：无溢出、字段值仍可复制、**记录里存在的字段不丢**（逐项列出「展示 / 高级 / 有意不展示 + 理由」三态表）。
- 断言：**记录里不存在的字段不得凭空出现**（空值走平台 `—`）。
- **验收**：默认态与展开态两组实测（DOM 断言 + 截图/JSON），字段三态表。

### 3.4 A3 — 四组视口零溢出（**关 BUG-035** 的判据）

- 断言：`?page=factory` 在四组下 `textOverflow` **为空**（允许 ≤1px 亚像素，须逐条说明）；`docOver=0`；`hScrollers=[]`。
- 断言：**不得用 allowlist**——报告必须给出「为什么这是页内结构可改项」的反证（引用 D34 + `arc-contracts §29.8` 的白名单事实 + UI-012 §6 的干跑结论）。
- **验收**：四组实测表；BUG-035 的 `over 133/121/120/112/62/119` 逐项给出 after 值。

### 3.5 A4 — 零回归

- 断言：21/21 控制台页 `document.documentElement.scrollWidth - clientWidth === 0`、无 `SESSION INIT FAILED`、每页 `active=1`。
- 断言：`?page=orders` / `?page=ledger` 首屏仍为「列表卡在前」（R14F 追认不得回退）。
- 断言：公共页（`/`、`/store`、`/posts/<slug>`）不受影响（`docOver=0`）。
- **验收**：21/21 + 公共页回归表；单 tab 自证 `pageTargets before/during/after = 1/1/1`。

### 3.6 A5 — 单标签页纪律与实例卫生

- 整个 sweep 复用**同一个既有 page target**（`Page.navigate` 换页），结束关闭自己开的 target。
- 若为非空数据写了探针（`chain-intents` / `node/factories.json`）→ **先 `docs/team/.gate-lock`、逐条清理、基线复原**，跑完删锁。
- **验收**：`pageTargets 1/1/1` 自证 + 清理前后 id 集合对比 + `ls docs/team/.gate-lock` 证据。

### 3.7 A6 — 三类证据分开标注

**浏览器实测**（A0–A4 的原始 JSON + 当场 `grep -n` 行号）/ **静态复核**（门 + `git diff --name-only` + `grep` 反证无 CSS 覆盖）/ **受限未验证**（超长真实 DID / title 极端值、真实硬件 hover、dark 真实切换）——逐条标注。

---

## 4. 依赖

| 依赖 | 说明 |
| ---- | ---- |
| **Lead L-R15-3 / D34** | 修法三选一已裁：**单列 + 收敛展示字段**；不选放弃复制、不选 allowlist |
| [BUG-035](../bugs/BUG-035-factory-1512-hash-overflow.md) | 缺陷定义与 before 实测值（本 REQ 的闭环对象） |
| [UI-012](../design/UI-012-ui-audit-and-fixes.md) §2 UI-012-07 / §6 | 语句级修法建议 + 两条候选 CSS 已被干跑否掉 |
| [REQ-023](REQ-023-chain-environment-externalization.md) | **同一文件 `.aup/pages/ops/factory.aup`**（REQ-023 改 `chain-token` / `factory-stake` 的代币符号文案）→ **同 owner 串行**；后写者以先写者定稿为基线；`arc blocklet build` 只在**最后一次写盘之后**做一次 |
| [REQ-020](REQ-020-toolbar-content-spacing-public.md) / [REQ-020a](REQ-020a-console-spacing-model.md)（UI） | **写者串行**（L-R15-5）：UI 先做完 build/restart，Dev 再动手写 `dist/**` |
| QA `task-63` | `blocked_by` UI + Dev 批次定稿 |
| 外部条件 | 浏览器 `:9333` + `arcblog.localhost:4939` + admin 会话（`?page=factory` 需登录）；**真实链数据非必需**（空态要额外说明） |

---

## 5. 涉及写范围

| 类型 | 路径 | 说明 |
| ---- | ---- | ---- |
| DSL | `.aup/pages/ops/factory.aup`（主要）、`.aup/locales/**`（生成） | 结构单列化 + 高级折叠 + 字段收敛 |
| 生成 | `dist/**`（`arc blocklet build`） | **不手改**；**build 晚于自己最后一次写盘** |
| 临时 | `docs/team/.gate-lock` | 仅当写实例探针（非空数据）时；跑完删除 |
| **禁止** | `scripts/**`（本 REQ 不改链侧；除 `.gate-lock` 临时）、`.web/**`、`world/**`、`blocklet.yaml`、spec、checklist、`docs/team/**`（除 `.gate-lock`） | 越界即停并上报 |

---

## 6. 本轮口径（Lead **L-R15-3** 收窄；**不改写既有结论**）

1. **D34 已裁 = 「改单列 + 收敛展示字段」**；**不选**放弃复制按钮、**不选** allowlist。
2. **公钥类字段**（`issuer` / PK / PEM / `stakeAddress` 等）**默认不展示或折进「高级」**；展开后仍零溢出、仍可复制、**不丢字段**。
3. **目标 = 四组视口零溢出**（`en/zh × 1803×908/1512×765`）→ **关 BUG-035**。
4. **修法必须在 `.aup` 结构层**：平台 67 键 style 白名单**不含**断行类键（`arc-contracts §29.8`），UI-012 §6 的两条候选 CSS 已被干跑否掉 ⇒ 页内 CSS 不可行、allowlist 不成立。
5. **不伪造哈希 / 不凭空造字段**；空值走平台占位。
6. **任何「已验证」必须附真实命令 + 真实输出**；做不到写「受限未验证 + 原因」。

> **注**：本节只记录 Lead 裁定对本 REQ 验收口径的收窄；`§1 背景` 与 `§3 验收标准` 的既有表述**不改写**（同 REQ-017 §7.6 做法）。

---

## 7. Round 15 结果记录（PM `task-64` 写回，2026-09-28）

> **结论：交付完成 · [BUG-035](../bugs/BUG-035-factory-1512-hash-overflow.md) 闭环 · QA-011 独立验证放行**（[round-15.md](../test-reports/round-15.md) §4）。Dev 交付物 = `.aup/pages/ops/factory.aup`（页内结构改单列 `gridTemplateColumns: "minmax(0, 1fr)"` + 高级折叠区）+ 生成的 `.aup/locales/{en,zh}.json`（`factory.advanced*` / `factory.chain-token` / `factory.factory-stake` **各 en=1/zh=1**）+ `dist/**`。

| 小节 | 内容 |
| ---- | ---- |
| 7.1 逐条验收结论（A0–A6） | **A0 通过（附冷启动受限）**：四组 before 值落盘；`?page=factory` 在**热会话**下记录非空（`adapter ocap` / `network beta` / `nodes.studio.moniker = ArcBlogStudioNode #5` / `state acquired`，`updatedAt 2026-09-27T08:34:45.557Z`，QA 直接读 AFS 记录复核）；**冷启动首载 propBind 值为 `—`**（reload 恢复）→ **BUG-036（P2，范围外/既有）**，不判本 REQ 未完成、但**四组结论的采集口径已如实登记为热会话**。**A1 通过**：`#factory-node-tx` 4 个哈希**每个占一行**、展开态每行 `sw ≤ cw`；intents 行 `over 62 → 0`；NFT 卡 `119 → 0`（`grid-2-view-1 over=0`、`maxChildOver=0`）；**`copyable` 保留**（可复制值 + 命中区未回退 R14F）。**A2 通过（附一条平台占位副作用）**：折叠态 `kvRows=8`、展开后 `kvRows=22`；`data-aup-id="factory-*-adv"` / `factory-node-tx` / `factory-chain-adv` **折叠态不在 DOM（`null`）**、展开后 `visible=true` 且 `over=0`；**默认视图全文检索 `BEGINPUBLICKEY` / `pk -----` = false**（`document.documentElement.outerHTML`、`media`/`input`/`background` 均无命中）→ PK/PEM 默认不出现**成立**；但**该条通过的直接原因是平台把 NFT SVG 卡渲染成占位符**（`div.aup-placeholder`「NFT card」，`dataUriImgs=[]`）而非收敛策略 → 立 **BUG-037（P3）**；「记录里不存在的字段不得凭空出现」通过（`?page=orders`/`?page=hub` 空字段走平台 `—`，冷载=reload 逐值相同）。**A3 通过（关 BUG-035）**：四组 `textOverflow = 0`、`docOver = 0`、`hScrollers = []`（唯一残留 2 条外壳级元素、21 页逐值相同、对照 `?page=ledger` 同值）。**A4 通过**：21/21 页 `active=1` / 无 `SESSION INIT FAILED` / `deOverX=0`；`orders`/`ledger` 首屏列表卡在前；公共页 `docOver=0`。**A5 通过**：`pageTargets 2/2/2`、created=0；`.gate-lock` 已删。**A6 通过**：三类证据分开。**A1 无 allowlist 反证成立**：修法是页内结构（`git diff` 可见 `minmax(0, 1fr)`），非 allowlist、非页内 CSS 覆盖 |
| 7.2 BUG-035 闭环对照（over 133/121/120/112/62/119 → after） | `#factory-node-tx` 4 行 **133 / 121 / 120 / 112 → 0**（折叠态不渲染；展开后每行 `sw ≤ cw`、`over=0`）；intents 行 **62 → 0**（`factory-intents over=0`，队列 6 条真实记录含 64 位哈希仍可复制/清空）；NFT 卡 **119 → 0**。**6 个原值全部归零**（QA 逐项独立复测，非采信自述）→ **BUG-035 判「已修 · 闭环」** |
| 7.3 字段三态表（展示 / 高级 / 有意不展示 + 理由） | **默认（折叠）展示**：NFT moniker/state、endpoint、region、claimable，factory moniker/stake/capacity，adapter/network（中性文案 `Adapter ocap` / `Network beta` / `Stake per node 1`），意图队列。**「高级 / 技术详情」折叠**：`issuer`（工厂主钱包地址）、工厂地址 ×2、NFT 地址、owner、`stakeAddress`、**tx 哈希 ×4**、`chainHost`、`tokenId` —— 展开后出现、monospace + `copyable`、零溢出、**字段不丢**（`kvRows 8 → 22`）。**有意不展示**：**PK / PEM**（不在页面字段列表；记录侧只存在于链上渲染的 SVG 内 → 见 BUG-037）；理由 = 公钥类材料非运营必需 + 与 REQ-023 A4 的「零代币符号/零链常量外显」同向。**共享写范围**：REQ-023 与 REQ-024 同文件 `.aup/pages/ops/factory.aup` → 按 **L-R15-5** 由**同一 owner 串行**（后写者以先写者定稿为基线）；最终 `diff -r .aup dist/.aup` **IDENTICAL**（PM 实测） |
| 7.4 三类证据标注 | **浏览器实测** = A0–A5（QA 单 tab；折叠/展开两态 DOM 断言 + 四组溢出表 + 21 页回归）。**静态复核** = §3.0 门 6 条 + `git diff`（页内结构而非 CSS/allowlist）+ i18n 键 en/zh 成对（`.aup/locales/{en,zh}.json:793-796` 逐键对应；两文件 `grep "ABT" = 0`）。**受限未验证** = 超长真实 DID / `title` 极端值、真实硬件 hover、dark 真实切换（沿用 R14 口径） |
| 7.5 遗留 / 降级登记 | ① **BUG-036（P2）** 冷启动首载值为 `—` → **下一轮修（R16-2）**；② **BUG-037（P3）** NFT SVG 卡平台占位符 → **登记为平台事实候选（交 Lead 落 `arc-contracts`）+ 下一轮修（R16-5，口径待定）**；③ **BUG-033（P2）/ BUG-034（P2）** 本轮**未派发**（R15 实际只派了 REQ-020/020a/023/024/025）→ 保持排队，落 **R16-3 / R16-4**；④ `.aup/locales` 新增键为**结构性新增**（`advanced`/`advanced-show`/`advanced-hide`/`advanced-note`/`chain-token`/`factory-stake`，en/zh 成对）→ 死键门绿、无孤儿键；⑤ QA 实测 lint `WARNING=34 / ERROR=0`（R14 为 28；QA 归因为新增 **5 个高级区块 id + 2 个 state id**，**非门禁**） |
| 7.6 PM 轮末只读复核门 | 与 REQ-020 §7.5 同一批真实输出（validate issues `[]` / `npm test` 28/28 / console-nav pages 21 / generate 0 漂移 / `.aup`+`.web` 双向 diff IDENTICAL）；PM **未独立复跑浏览器** |
