# REQ-011 — 媒体页上传入口的可观测性 + 文案去「不可复现观测」引用（含空态/有记录态双态验收）

**元信息**：REQ-011 ｜ 对应 spec 章节：**§15.4**（媒体管理界面）/ §15.1（后台内容管理）｜ checklist 行：**第 102 行**（媒体管理界面，§15.4）｜ 优先级：**🟨 排队（P3，文案 + 可观测性，不阻断）** ｜ 提出轮次：**Round 10**（来源：QA-005 [`test-reports/round-10.md`](../test-reports/round-10.md) **§6 BUG 与 §7 观察 1/3/5**）｜ 负责角色：**Dev**（实现/文案）+ **QA**（复验）｜ 状态：**草案 · 未派发**（Round 10 是本长时目标的**最后一轮自动续轮**；待人类恢复后由 Lead 建任务并置 `🟥`）

---

## 1. 背景

Round 10 的 [REQ-009](REQ-009-media-admin-and-p3-closure.md) 已把媒体页补全（索引字段 / 引用视图 CLI 指引 / 孤儿清理 CLI 指引 / `afs-dropzone` 上传入口）并**通过 QA-005 独立复验放行**（`VERDICT=pass, BLOCKING=0`）。但 QA 在复验中留下两处**与本项交付物直接相关的、非阻断的**缺口：

1. **上传入口的行为不可观测（round-10.md §7-1）**：`.aup-dropzone` 节点存在（无参，与 `compose.aup:154` / `compose-edit.aup:77` / `heroes.aup:160` 既有范式一致），但 QA 用**合成 `DragEvent`（含 `DataTransfer`+`File`）**与 **CDP 可信拖拽**（`Input.setInterceptDrags` + `Input.dispatchDragEvent`）**均未触发平台的 drop handler**（`dzStatus:""`、`toasts:[]`、索引 `count` 前后均为 2）。⇒ REQ-009 **A4 的 D-1 / D-2 分支无法判定**，「实测落点路径」这一 D-1 分支要求的证据**未取得**（工具限制，非实现缺陷）。该缺口已如实登记，不阻断第 102 行落 ✅，但它意味着「上传入口」在**任何一次实际运行中都还没有被观测过**。
2. **页面文案引用了一次不可复现的观测（round-10.md §7-3）**：`.aup/pages/ops/media.aup:28` 的 `upload-note` 写明「Measured 2026-09-27 … `Upload failed: targetDir must be a non-empty string`」。QA **既未复现该失败、也未复现成功**；页面把它当既成事实引用，会让后续读者把一条**不可复现**的观测当作平台结论。QA 建议 PM 改为「本仓库既有范式 + CLI 登记」的措辞，或补一条**可复现的拖拽步骤**。
3. **空态未复跑（round-10.md §7-5）**：`?page=media` 本轮只测了**有记录态**；清理后的空态只验了 CLI 输出，未再开一次**无记录页面**断言。REQ-009 §2.2 的降级口径要求「三态如实」，空态是否有误导性指引尚未观测。

**为什么值得单独立项**：这三条都落在**同一个文件**（`.aup/pages/ops/media.aup`）与**同一条验收线**（上传 + 降级说明）上，且都属「如实性」问题（spec §150「不臆造 / 不谎报已验证」的同精神）；合并成一次 Dev 批次 + 一次 QA 复验即可收口，不必拆多个任务。

---

## 2. 范围

### 2.1 做

| # | 事项 | 具体要求 |
| - | ---- | -------- |
| **1** | **去「不可复现观测」引用** | `?page=media` 的 `upload-note`（`.aup/pages/ops/media.aup:28`）**不得**再引用「Measured 2026-09-27 … `Upload failed: targetDir must be a non-empty string`」这类**无当前可复现命令**的观测。改为二选一（并在回报里写明选了哪一支）：**(i)** 措辞降级为「本仓库既有范式（`compose` / `compose-edit` / `heroes` 三页同用无参 `afs-dropzone`）+ 上传后请用 CLI `arcblog-media.mjs add` 登记索引」；**(ii)** 保留现象描述但**补一条可复现步骤**（明确「手动拖拽一张图到 dropzone」的人工步骤 + 观测点），并去掉「Measured <日期>」式的既成事实口吻 |
| **2** | **上传入口的可复现观测** | 由 **Dev 手动**（真实鼠标拖拽，非 CDP 合成）在 admin 会话里拖一张测试图到 `?page=media` 的 dropzone，记录：**①** dropzone 是否出现状态文本（`dzStatus` 原文）；**②** 是否产生索引记录（`node scripts/arcblog-media.mjs list` **前后原始 JSON**）；**③** 若上传落盘，实测落点路径（AFS 路径或平台回传）。据此**明确声明 A4 的 D-1 / D-2 分支**；若仍无法观测（例如平台要求真实文件选择器而页面无 `<input type=file>`），**如实写「受限未验证 + 原因」并保持 D-1 降级口径**，不得编造 |
| **3** | **空态与有记录态双态验收** | `?page=media` 在 **0 条**与 **≥1 条**两种索引状态下都要有断言：空态**不得**出现误导性的「已索引 / 上传即索引」文案，且 CLI 指引仍常驻；有记录态沿用 REQ-009 A2/A3 的修订口径（见 REQ-009 §3.1） |
| **4** | **与 REQ-009 判据修订对齐** | 本项复验必须使用 **REQ-009 §3.1 的修订口径**（BUG-019：相对时间用 `.aup-time.aup-time-display`；BUG-020：状态声称只看**行文本**），**不得**原样复用 REQ-009 A2/A3 的旧选择器与 `document.body.innerText` 正则 |

### 2.2 明确不做

1. **不改 CLI**：`scripts/**` 零改动（`arcblog-media.mjs` 已完整：`list` / `refs` / `orphans` / `remove --id [--force]` / `add`）；判需改动 → **停手上报**。
2. **不臆造上传 API**：只用 `afs-dropzone`（无参，仓库既有范式）；**禁止**给 `afs-dropzone` 编造 prop、**禁止**写自定义上传/写盘 `exec` 来「让上传成功」。
3. **不改 AFS 记录 schema / `blocklet.yaml` / 链适配器 / daemon 路由**；**不新增 AFS 集合**；不给 `media` 记录加派生字段（引用/孤儿状态仍由 CLI 计算，页面**不得**按行声称）。
4. **不动断言表达式以外的既有结论**：不改 REQ-009 的 A1/A6/A7/A8 结论，不重开 BUG-016/017/018。
5. **不做**像素级视觉走查（排队 #5）、一键复制（#11）、Agent 目录核对门（#8）、标签规范化（#9）。
6. **不改** `docs/ArcBlog-admin-ui-design.md`（UI 写范围）、`docs/arc-contracts.md`（Lead 写范围）、spec、checklist 状态列。
7. **不跑**全量 `npm run test:live`、**不跑** `arc dsl lint --fix`。

---

## 3. 验收标准

> **判断依据**：本项触及 `.aup/pages/**`（**不写实例的页面标记/文案层**）＋ **一次真实上传尝试**（写实例）。**证据三类分开标注**：浏览器实测 / 静态复核 / 受限未验证。

**A1 通用门（必过）**

```bash
arc dsl validate --json                          # "issues": []   [exit=0]
npm test                                         # 快层 28/28 pass, exit 0
node scripts/arcblog-console-nav.mjs --check     # {"ok":true,"action":"check","pages":17}
arc dsl generate --check                         # 无漂移（Would generate 0 file(s)）
arc blocklet build                               # 改了 .aup/** 必跑；随后 diff -q 源↔dist 逐文件 same
grep -rnE '#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?' .aup/pages/ | grep -v '\.json' || echo "no hardcoded color"
git diff --name-only -- scripts world blocklet.yaml   # 必须为空
```

**A2 文案去不可复现引用（静态复核）**

```bash
grep -n 'targetDir must be a non-empty string' .aup/pages/ops/media.aup   # 期望：无输出；或该行同段给出可复现的人工步骤
grep -n 'Measured 2026-09-27' .aup/pages/ops/media.aup                    # 期望：无输出（不再以日期口吻引用不可复现观测）
grep -n 'arcblog-media.mjs add' .aup/pages/ops/media.aup                  # 期望：仍存在（CLI 登记指引常驻）
```

- 期望：`upload-note` 引用的是**可复现事实**（既有三页范式 / 人工拖拽步骤）或已删除；**CLI `add` 指引仍在**；en/zh 两份文案都改到（`.aup/locales/{en,zh}.json` 键集一致，死键门绿）。

**A3 上传入口的可复现观测（浏览器实测；写实例 → 先加锁）**

```bash
printf 'Dev <name> <ISO8601> — REQ-011 media upload observability\n' > docs/team/.gate-lock
node scripts/arcblog-media.mjs list                       # 上传「前」原始 JSON（记录 count）
# …admin 会话 ?page=media&locale=en：手动真实拖拽一张测试图到 dropzone…
node scripts/arcblog-media.mjs list                       # 上传「后」原始 JSON（记录 count）
rm -f docs/team/.gate-lock
```

- 必须记录的原始证据：**上传前后两次 `list` 的完整 JSON**、**`dzStatus` 文本**、**是否有 toast**、**实测落点路径**（若落盘）。
- 期望（三选一，**必须在报告里写明走的是哪一支**）：
  - **(D-1) 上传不产生索引记录** → 页面常驻 `node scripts/arcblog-media.mjs add --path … --id …` 指引；页面**不声称**「已索引」；报告写明实测落点路径（或「无法取得落点，原因 …」——**如实登记为受限未验证**）。
  - **(D-2) 上传产生索引记录** → 给出 `list` 前后差异的原始 JSON（新记录 id 与字段），页面文案不得与实测矛盾。
  - **(受限) 人工拖拽也观测不到** → 如实写「受限未验证 + 原因」，保持 D-1 降级口径，**不阻断面页侧结论**。

**A4 空态 / 有记录态双态（浏览器实测）**

```bash
node scripts/arcblog-media.mjs list              # 空态：count 0 → 打开 ?page=media&locale=en
# 断言：登录门之后页面不含「已索引 / 上传即索引」类文案；refs/orphans/remove/add CLI 指引常驻
node scripts/arcblog-media.mjs add --path /blocklets/…/qa-r11-probe.png --id qa-r11-probe --mime image/png --size 1234
node scripts/arcblog-media.mjs list              # 有记录态：count 1 → 同页复跑 REQ-009 §3.1 修订口径
node scripts/arcblog-media.mjs remove --id qa-r11-probe && node scripts/arcblog-media.mjs list   # 收尾 count 0
```

- 期望：两态都**不出现**误导性状态声称；空态**不**因无记录而丢失 CLI 指引；有记录态按 REQ-009 §3.1 口径全绿（相对时间以 `.aup-time` 计、状态声称只看行文本）。

**A5 负面用例（≥2 条）**

| # | 负面操作 | 期望 |
| - | -------- | ---- |
| N1 | 给 `afs-dropzone` 加自定义 prop / 用 `exec` 伪造上传写盘 | **不得发生**：`git diff` 中 `afs-dropzone` 仍为**无参**单节点；无新增上传 `exec` |
| N2 | 页面按行把**被引用**的媒体标成「未被引用 / 孤儿」 | **不得发生**：行文本 `hasOrphanWord` 全 `false`（REQ-009 §3.1 口径） |
| N3 | 改 `scripts/**` / `world/**` / `blocklet.yaml` / `docs/ArcBlog-admin-ui-design.md` | **不得发生**：`git diff --name-only -- scripts world blocklet.yaml docs/ArcBlog-admin-ui-design.md` 为空 |

**A6 收尾（实例零残留）**

```bash
node scripts/arcblog-media.mjs list              # 回到 REQ-011 开工前的 count（预期 0）
node scripts/arcblog-clean.mjs                   # {"found":0,...}（dry run）
ls docs/team/.gate-lock                          # No such file or directory
```

- 期望：所有 `qa-r11-*` 探针（索引 + 草稿引用 + 上传落盘残留若有）逐条清理；锁已删。

---

## 4. 依赖

- **上游**：
  - [`test-reports/round-10.md`](../test-reports/round-10.md) **§7-1（A4 受限）** / **§7-3（`upload-note` 引用不可复现观测）** / **§7-5（空态未复跑）** / §9（`VERDICT=pass`）；
  - [`requirements/REQ-009-media-admin-and-p3-closure.md`](REQ-009-media-admin-and-p3-closure.md) **§3.1**（判据修订口径：BUG-019 / BUG-020）与 **A4**（D-1/D-2 分支）；
  - [`bugs/BUG-019`](../bugs/BUG-019-req009-a2-time-selector-mismatch.md) / [`BUG-020`](../bugs/BUG-020-req009-a3-claimsperrowstatus-false-positive.md)（判据缺陷，已由 PM 修订，本项**必须**用修订口径复验）。
- **前置裁定**：无（不涉及产品口径；**不依赖** BUG-018 / `arc-contracts.md` §29.2 的更正）。
- **下游（复验）**：**QA**（新任务，`blocked_by` 本 REQ 的 Dev 任务）——独立重跑 A2–A6（自造 `qa-r11-*` 探针、自己拖拽、自己复核）；报告落 `docs/team/test-reports/round-11.md`；**不采信 Dev 自述**。
- **串行约束**：与功能界面补全批次（Dev `.aup/pages/**`）**同写范围 → 必须串行**（同一 owner 同时只 1 个 `in_progress`）；与 UI 文档批（`docs/ArcBlog-admin-ui-design.md`）无冲突。
- **外部条件**：admin 会话（本机共享调试 Chrome / CDP 9333，须在报告注明身份来源）；**人工真实拖拽**（不用 CDP 合成事件）；`docs/team/.gate-lock`（写实例动作）；浏览器仅用于 A3/A4。

---

## 5. 涉及写范围

| 路径前缀 | 用途 | 归属 |
| -- | -- | -- |
| `.aup/pages/ops/media.aup` | `upload-note` 文案改写 + （若需）空态常驻说明 | Dev |
| `.aup/locales/{en,zh}.json`、`.aup/app.json`、`.aup/wrapper.json` | `arc dsl generate --write` 生成（**不手改**） | Dev（生成） |
| `dist/**` | `arc blocklet build` 生成（**不手改**） | Dev（生成） |
| `docs/team/test-reports/**`、`docs/team/bugs/**` | QA 复验报告与新增 BUG | QA |
| `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 看板 / 本 REQ / 轮次日志 | PM |
| `scripts/**`、`world/**`、`blocklet.yaml`、`.web/**`、`pages/**`、`seed/**`、`agents/**` | **本 REQ 一律不改**（越界即停手上报） | 越界即停 |
| `docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md`、`docs/arc-contracts.md`、`docs/ArcBlog-admin-ui-design.md`、`CLAUDE.md`、`.agents/skills/**` | **本 REQ 一律不改** | 人类 / Lead / UI |

**边界**：**不臆造 ARC API**（spec §150）——上传只用 `afs-dropzone`（无参）；能力核验渠道 = `arc dsl schema` / `docs/arc-contracts.md` / 真实点击；平台做不到的走**如实降级 + CLI 指引 + 限制登记**，不猜、不谎报「已验证」。
