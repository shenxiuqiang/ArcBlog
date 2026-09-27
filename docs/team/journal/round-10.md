# Round 10 — 收口两条 P3（BUG-016/017）+ 完成 §15.4 媒体管理界面（🟡 → ✅ 候选）+ UI 标准附录事实对齐

- **日期**：2026-09-28（本地；Lead 裁定书 2026-09-27）
- **Lead 提交**：<未提交，由 Lead 轮末填写>
- **清单变化**：**建议 ✅ 79→80 ｜ 🟡 10→9 ｜ ⬜ 9 ｜ ⚪ 2**（D 组 **18→19 ✅ / 6→5 🟡**）—— **前置已满足**：QA-005 已放行 REQ-009（`VERDICT=pass, BLOCKING=0`），媒体页四项能力按平台能力如实降级并写明；**PM 最终建议 = 第 102 行落 ✅ + 三条不阻断缺口登记**（上传行为受限未验证 / 空态未复跑 / `upload-note` 引用不可复现观测），严格口径可暂留 🟡 待 [REQ-011](../requirements/REQ-011-media-upload-observability-and-copy-hygiene.md)。**状态列由 Lead 落笔**（D18）
- **轮次性质**：**🎯 长时目标的最后一轮自动续轮** —— 本轮结束后**自动续轮停止**，**R11 起需人工恢复**（人类说「继续 / resume」→ Lead `update_goal action=resume`；见 `backlog.md` 顶部 🛑 提示与本文件「目标收尾」节）

---

## 计划（轮次开始时写）

### 本轮目标（可验收）

1. **媒体管理界面（清单第 102 行 §15.4，🟡 → ✅ 候选）**：`.aup/pages/ops/media.aup` 补齐 **① 索引字段（`id`/`path`/`mimeType`/`size`/相对时间）② 引用视图 ③ 孤儿清单与清理入口 ④ 上传入口**；凡平台做不到的**如实降级为 CLI 指引**（AUP 无跨集合 join、无剪贴板原语、`afs-list layout=grid` 列数不可控），**不得臆造上传 API**（上传只用仓库既有无参 `afs-dropzone`）。
2. **BUG-017（P3）→ 按 Lead D13 = 选项 ①**：`?page=pages` 的 Bring online 确认/提示文案写明「旧 CLI/root 授权的既有公开副本需先 Remove public copy」；**保留平台的诚实拒绝**；不做 overlay / worker。
3. **BUG-016（P3）→ 按 Lead D15 = 一次「保型写入」探针**：能保留 `sync.lastVersion` 原类型（JSON `null` 仍 `null`、数字仍 number）就修；**做不到就停下不改**并把探针原始证据写进报告（后续裁决 = 「不修 + 留档」）。
4. **D14**：页面 Publish 保留「复制到公开」语义，但**页面文案必须写明这是复制而非移动**（CLI `publish` 是移动语义）；**不改 CLI**。
5. **REQ-010 / L-R10-1**：`docs/ArcBlog-admin-ui-design.md` 的 **§9 第 2 条条目文字 + 附录 A.1 概念名 + 附录三处 §2.3 交叉引用** 做**事实对齐**；**不改任何期望值、不改 §9 条目口径与结构、不动断言表达式**。

**可验收的判据（摘要；完整版见两份 REQ）**：`arc dsl validate --json` issues=[]；`npm test` 28/28；`console-nav --check` 17 页；`arc dsl generate --check` 无漂移；改了 `.aup/**` → `arc blocklet build` + 源↔`dist` 逐文件一致；媒体页三项能力有**真实点击/上传 + `arcblog-media.mjs list/refs/orphans` 原始输出**对照；BUG-016 探针有 `typeof` 原始输出；BUG-017 有 `modalText` + 「拒绝无写 → 两步走成功」三态；D14 有 modal 文案 + 源 draft 保留的落库复核；REQ-010 有 `eqBytes=846` 逐字节比对与 `^□`=12。

### 派出的任务（任务板 id / REQ / owner / write_scopes / blocked_by）

| 任务 | 角色 | REQ / 交付 | write_scopes（提示性） | blocked_by |
| --- | ---- | ---------- | ---------------------- | ---------- |
| **`task-20`** | **PM** | 本轮规划：`backlog.md` Round 10 小节 + [REQ-009](../requirements/REQ-009-media-admin-and-p3-closure.md) + [REQ-010](../requirements/REQ-010-ui-standard-appendix-residuals.md) + 本文件 | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | — |
| **`task-21`** | **Dev** | REQ-009：媒体页补全 + BUG-017 文案（D13）+ BUG-016 一次探针（D15）+ D14 Publish 文案 | `.aup/pages/ops/media.aup`、`.aup/pages/admin/{posts,pages}.aup`、`.aup/pages/ops/hub.aup`（仅 D15 可保型时）、`.aup/locales/**`（生成）、`dist/**`（build） | — |
| **`task-22`** | **UI** | REQ-010：UI 标准附录事实对齐（L-R10-1 三项 + 版本行 V1.5） | `docs/ArcBlog-admin-ui-design.md`、`docs/team/design/**` | — |
| **`task-23`** | **QA** | QA-005：独立验收 REQ-009 + REQ-010（自造探针、自己点击、自己复核） | `docs/team/test-reports/**`、`docs/team/bugs/**` | **`task-21` + `task-22`** |
| **`task-24`** | **PM** | 轮末裁决：逐条裁决新 BUG + 写本文件「结果 / 目标收尾」+ 更新 `backlog.md` | `docs/team/backlog.md`、`docs/team/journal/**` | `task-23` |

**并发结构**：`task-21`（`.aup/**`）∥ `task-22`（`docs/ArcBlog-admin-ui-design.md`）——**写范围不重叠，可真并行**；`task-23` 必须等两者都 complete（否则验证对象在脚下移动）。**PM 不调用 `team_task_*`**（任务板由 Lead 维护）。

### 写入范围（本轮全部成员）

| 成员 | 可写 | 本轮**不可写 / 越界即停** |
| ---- | ---- | ------------------------ |
| Dev | `.aup/pages/ops/media.aup`、`.aup/pages/admin/{posts,pages}.aup`、`.aup/pages/ops/hub.aup`（仅 D15）、`.aup/locales/**`、`.aup/{app,wrapper}.json`（生成）、`dist/**`（build） | `scripts/**`、`world/**`、`blocklet.yaml`、`.web/**`、`agents/**`、`seed/**`、`docs/**` |
| UI | `docs/ArcBlog-admin-ui-design.md`（**仅 L-R10-1 三项 + 版本行**）、`docs/team/design/**` | `.aup/**`、`scripts/**`、任何源码；`docs/team/**` 中非 design 的产物 |
| QA | `docs/team/test-reports/**`、`docs/team/bugs/**` | 任何源码、任何测试文件 |
| PM | `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 源码、测试、spec、checklist 状态列、`docs/ArcBlog-admin-ui-design.md` |

### 质量门计划（用户 2026-09-27 精简轮裁定，Round 10 继续执行）

**不跑全量 `npm run test:live`**（~21 min 且写共享实例）。每步过：

```bash
arc dsl validate --json                        # issues 为空
npm test                                       # 快层 28/28（~1s，不写实例；含 generate --check 漂移门与 guest 权限矩阵）
node scripts/arcblog-console-nav.mjs --check   # 17 页（不新增导航节）
arc dsl generate --check                       # 无漂移
arc blocklet build                             # 改了 .aup/** 才需要；随后 diff -q 源↔dist 逐文件 same
```

- **定向单跑（仅当触及 CLI / AFS 记录 / 链适配器 / daemon 路由）**：先写 `docs/team/.gate-lock`（owner + 时间），跑 `npm run test:file -- scripts/<file>.test.mjs`（候选：`arcblog-media` / `arcblog-network` / `arcblog-pages` / `arcblog-lifecycle`），跑完**删锁**。**本轮预期不改 CLI ⇒ 默认不跑**；若 D13/D15/D14 的实测被迫改动记录形态或 `scripts/**` → **停手上报**，由 Lead 决定。
- **写实例的验收**（媒体上传与探针、BUG-016/017 与 D14 的真实点击）**必须**先落 `.gate-lock`，跑完删锁 + **逐条清理探针**，回报含「实例零残留」复核（`media count` / `hub/registrations=4` / `posts=3 / drafts=27` / 探针 `present?` 全 false）。
- **浏览器只在验收标准确实要求 DOM 断言/真实点击时启动**：REQ-009 A2–A7 + guest 越权用例；REQ-010 **纯静态**（不开浏览器、不加锁、不 build）。
- **证据三类分开标注**：浏览器实测 / 静态复核 / 受限未验证；**「已验证」必须附真实命令与真实输出**。

### 明确的「不做」（防止范围蔓延）

1. **不改 `scripts/**`**（CLI 已完整）；**不改 AFS 记录 schema / `blocklet.yaml` / 链适配器 / daemon 路由**；**不新增 AFS 集合**；不给媒体/hub/pages 记录加派生字段。
2. **不做 page-owned overlay / CLI worker**（D13 已排除选项 ②）；**不接链 SDK**；**不新增导航节**。
3. **不动断言表达式与期望值**（REQ-010 红线）；**不改 §9 十二条条目口径与结构**；**不改 §2.3 章节正文**。
4. **不臆造上传 API**：只用 `afs-dropzone`（无参）；`arc dsl explain` **实测不存在**（`Unknown command: "dsl explain"`），核验走 `arc dsl schema` / `arc-contracts.md` / 真实点击。
5. **不做**剪切板/复制按钮（无原语，排队 #11）、**不做**像素级视觉走查（排队 #5）、**不做** Agent 目录核对门（#8）、**不做**标签规范化（#9）。
6. **不碰真实数据**：`posts=3 / drafts=27 / hub/registrations=4` 等真实记录不得被探针改写或删除；BUG-016 只造探针；BUG-017 复现必须新造 `qa-r10-*`。
7. **不跑**全量 live、**不跑** `arc dsl lint --fix`（会误删运行时寻址 id）。
8. **不改** `docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md` 状态列、`docs/arc-contracts.md`、`CLAUDE.md`、`.agents/skills/**`；不删 `node.key` / `.env.local`。
9. **不做** git 提交类动作（`git commit` / `push` / `reset --hard` / `add -A`）——由 Lead 轮末统一提交。

### 已知风险

| # | 风险 | 影响 | 缓解 |
| - | ---- | ---- | ---- |
| R1 | **BUG-016 的保型探针很可能失败**（`arc-contracts.md` §29.2：对 CLI/root 授权的既有记录，`replace`/`create`/`update`/`tree-merge`/`patch` **全部被拒**，唯一可用组合是 delete+重写，而重写的值来自**字符串型隐藏输入**） | 预期结论 = **「不修 + 留档」**；BUG-016 保留（P3 不阻断） | D15 已给「做不到就停手不改」的口径；报告必须给**原始拒绝/改型证据**，不粉饰为通过 |
| R2 | 媒体页的「引用视图 / 孤儿清单」**平台无法在页面内计算**（无跨集合 join、记录无派生字段） | 只能降级为 CLI 指引 | REQ-009 已明确「如实降级 + 不得凭空断言」；负面用例 N1/N2 直接卡这条 |
| R3 | `afs-dropzone` **无 prop 文档**，且能否产生索引记录未验证 | 上传入口可能只能「上传 + CLI 索引」两步 | REQ-009 A4 要求**实测前后 `list` 输出**并写明走 D-1/D-2 哪一支；**禁止**编造 prop |
| R4 | `?page=media` 的索引当前为空（`count: 0`） | 不造探针就没法验收 | A0 基线已写明；A2 要求先 `arcblog-media.mjs add` 两条探针（一条被引用 / 一条孤儿） |
| R5 | REQ-010 的「只做事实对齐」容易越界（顺手改断言/口径） | 会污染 §9 验收清单，让后续轮次误判 | A5 逐字节比对（`eqBytes=846`、`full_sha256` 基线）+ A7 四条负面用例 + `^□`=12 |
| R6 | Dev 与 UI 并行时 `dist/docs/**` 镜像会混入两方产物 | 归因混乱 / 误提交 | UI **不 build**；Lead 轮末 `arc blocklet build`（必须晚于最后写盘）并按写范围分拣提交 |
| R7 | 工作区存在**非本团队**未跟踪文件 `docs/dsh-workflow-and-ralph.md` 与 `dist/docs/dsh-workflow-and-ralph.md`（dsh 部署级说明，见其文首「不是 ArcBlog 产品文档」） | 若被 `git add -A` 会卷进提交 | **已登记**：禁止 `git add -A`；Lead 提交时按本文件写范围分拣，**不包含**这两个文件。`docs/` 不属任何 teammate 本轮写范围 |
| R8 | 本轮是**最后一轮自动续轮** | 若本轮未收口，不会有自动的 R11 | 「结果 / 目标收尾」节必须写清：已完成 / 未完成 / 人工恢复时的首选候选 |

---

## 结果（轮末回填，PM）

> **Run 状态：完成（5 项目标全部收口）**。两份交付（REQ-009 / REQ-010）通过 QA-005 独立验收并**放行**（`VERDICT=pass, BLOCKING=0`）；BUG-016 走 D15「修」分支闭环；BUG-017 文案（D13 选项①）与 D14 复制语义文案落地；新增 3 条 P3 全部为文档/判据层、**不阻断**。

| 交付物 | 角色 | 产物路径 | 验证命令 | 结果 |
| --- | --- | --- | --- | --- |
| REQ-009 媒体页补全 + BUG-017/D15/D14 | Dev（`task-21`） | `M .aup/pages/ops/media.aup`、`.aup/pages/admin/{pages,posts}.aup`、`.aup/pages/ops/hub.aup`、生成 `.aup/locales/{en,zh}.json`、`dist/**` | `arc dsl validate --json` → `issues: []`；`npm test` → 28/28；`arc dsl generate --check` → 0 file；源↔`dist` 逐文件 `same` | ✅ **A1/A2/A3/A6/A7/A8 通过**；**A4 页面侧达标 + 上传行为受限未验证**；**A5 期望 1/3/4 通过、期望 2 未复现**。媒体页四项：索引字段（`title`/`id`/`path`/`mimeType`/`size`/相对时间）+ 每行 `refs --id` 指引 + `orphans`/`remove --id [--force]` 指引 + 无参 `afs-dropzone` + 三张常驻卡（引用视图 / 未引用与清理 / 平台限制如实降级）；**D-1 降级口径 = 页面只读 + CLI 引导**。**D15 = 「修」**：`tree-merge` 保型（`null` 仍 `null`、`7` 仍 number） |
| REQ-010 UI 标准附录事实对齐 | UI（`task-22`） | `M docs/ArcBlog-admin-ui-design.md`（`8/6`）、`?? docs/team/design/UI-006-appendix-residuals.md` | `grep -c '^□'` → 12；断言块 `full_sha256=8f7e…e1bd`、`eqBytes=846`；`git diff` 断言 token 命中 0 | ✅ **A1–A7 全通过**：`(a)` §9 第 2 条加概念名标注（`:471`）；`(b)` 附录 A.1 新增**节级边界说明**（覆盖 `:554/:558/:583`，CSS 骨架逐字节未动）；`(c)` 三处 §2.3 → 「§2.3 结构 + §2.5 滚动」/直指 §2.5，§2.3 正文零改动；版本行 **V1.5**（**待 Lead 一句话确认**）；零副作用（`.aup/scripts/dist` 无 UI 归因改动） |
| QA-005 复验报告 | QA（`task-23`） | `?? docs/team/test-reports/round-10.md`（573 行）+ `?? docs/team/bugs/BUG-018/019/020-*.md` | 末行 `VERDICT=pass, BLOCKING=0`；门自跑全绿；34/34 等价断言回归；实例零残留 | ✅ **放行**；新增 3 条 P3（BUG-018/019/020）；BUG-016 复验通过；BUG-017 文案收口通过；探针 10 条逐条清理、`.gate-lock` 已删、baseline 复原 |
| PM 裁决 + 收尾 | PM（`task-20`/`task-24`） | `M docs/team/backlog.md`、`?? docs/team/requirements/REQ-011-*.md`、`M docs/team/requirements/REQ-009/010-*.md`（§3.1）、本文件、`M docs/team/journal/README.md` | 只读快层复核 + 逐条裁决表 | ✅ 3 条 BUG 全部裁决（**2 条本轮修·PM 内联 + 1 条拆分**）；REQ-009 §3.1 / REQ-010 §3.1 结果记录与**判据修订**落盘；新建 [REQ-011](../requirements/REQ-011-media-upload-observability-and-copy-hygiene.md)；checklist 第 102 行**最终建议**给出 |

## QA 结论（轮末回填，PM）

- 报告：[`test-reports/round-10.md`](../test-reports/round-10.md)（573 行；末行机读结论 **`VERDICT=pass, BLOCKING=0`**）
- **放行 / 不放行：放行（Pass）** —— REQ-009 A1/A2/A3/A6/A7/A8 通过 + A4 部分通过（上传行为受限未验证）+ A5 期望 1/3/4 通过、期望 2 未复现；REQ-010 A1–A7 全通过。**无未裁决 P0/P1**。
- **新增缺陷（3 条，全部 P3、不阻断）及 PM 裁决**（逐条见 [backlog.md](../backlog.md) 🐞「Round 10 QA 新增」区）：

| BUG | 级别 | 标题 | 裁决 | 理由 + spec / 标准章节 | 落点 |
| --- | ---- | ---- | ---- | --- | --- |
| **BUG-018** | P3 | `?page=pages` Bring online 的「诚实拒绝」在 R10 不可复现；`arc-contracts.md` §29.2 记载与实测不符 | **拆分：Dev = 不修（无缺陷）；`arc-contracts.md` §29.2 = 下一轮修（**Lead 写范围**）；REQ-009 A5 期望 2 判据 = 本轮修（PM 内联，已执行）** | 非实现缺陷（D13 文案与实现正确落地）；风险在文档可信度。spec §15.4 + §150「不谎报已验证」精神；`roles/pm.md` §6.1（文档事实项升级 Lead） | [REQ-009](../requirements/REQ-009-media-admin-and-p3-closure.md) §3.1（已）；`docs/arc-contracts.md` §29.2（待 Lead） |
| **BUG-019** | P3 | REQ-009 A2 的 `hasTime` 用 `document.querySelector('time')`，实现里是 `div.aup-time.aup-time-display` → 复验必假红 | **本轮修（判据文案，PM 内联，已完成）** | **判据措辞缺陷，非实现缺陷**（相对时间渲染正确）；REQ-009 §3 A2 属 PM 写范围。UI 标准 §9 / spec §15.4；BUG-015 同类教训 | [REQ-009](../requirements/REQ-009-media-admin-and-p3-closure.md) §3 A2 修订说明 + §3.1 修订口径 |
| **BUG-020** | P3 | REQ-009 A3 的 `claimsPerRowStatus` 正则对常驻 CLI 指引文案假阳性，N1 失去鉴别力 | **本轮修（判据文案，PM 内联，已完成）** | **验收脚本缺陷，非实现缺陷**（页面逐行无状态声称）；A3/N1 属 PM 写范围。REQ-009 §2.1 ①B/C | [REQ-009](../requirements/REQ-009-media-admin-and-p3-closure.md) §3 A3 修订说明 + N1 + §3.1 |

- **既有 BUG 终态**：**BUG-016 = ✅ 已修复 · 独立复验通过**（D15 走「修」分支，`tree-merge` 保型）→ 从排队 #13 结清、无需 Lead 留档；**BUG-017 = ✅ 文案口径已收口**（D13 选项①，en/zh 两步走文案 + 两步走闭环，未做 overlay/worker）→ 从排队 #14 结清，其「平台必然拒绝」现象前提**降级为历史观察**并转 **BUG-018**（文档更正）。
- **QA §7 的 4 条观察 + 2 处检查脚本缺陷也一并裁决**（不允许挂着）：7-1 → 本轮修（PM 重述判据）+ Lead 文档更正；**7-2 → 本轮修（PM 内联修订 REQ-010 A3 的 awk 起始模式与 A5 的字符/行口径）**；7-3 → **下一轮修（新立 [REQ-011](../requirements/REQ-011-media-upload-observability-and-copy-hygiene.md)）**；7-4（hub 4 条真实记录 `relation` 全 `removed`）→ 不修（运营动作 / 既有状态）。
- **QA 的通过依据未被替代**：PM **未重跑**浏览器/探针面（不复制 QA 结论为「自验」），只做了 **只读快层复核**（见「遗留与风险」）。


## 遗留与风险（轮末回填，PM）

**① 未收口 / 受限未验证（逐条 + 原因，不粉饰）**

| # | 项 | 状态 | 原因 / 承接 |
| - | -- | ---- | ----------- |
| 1 | **REQ-009 A4：上传行为本身** | **受限未验证** | `.aup-dropzone` 页面无 `<input type=file>`；CDP 合成 `DragEvent`（含 `DataTransfer`+`File`）与 CDP 可信拖拽（`Input.setInterceptDrags` + `dispatchDragEvent`）**均未触发**平台 drop handler（`dzStatus:""`、`toasts:[]`、索引 `count` 前后均 2）→ D-1/D-2 分支无法判定、落点路径未取得（**工具限制，非实现缺陷**）；承接 = [REQ-011](../requirements/REQ-011-media-upload-observability-and-copy-hygiene.md)（排队 #16） |
| 2 | **REQ-009 A5 期望 2（平台诚实拒绝）** | **未复现** | R9F 的拒绝（17:36Z）由**重启前**的 daemon 服务；R10（18:14Z 起）同实例/同 admin 会话/同类 seed **写入成功** → BUG-018；判据已由 PM 重述为「文案已备 + 平台行为不作断言」 |
| 3 | `docs/arc-contracts.md` §29.2 更正/限定 | **待 Lead** | 不属 PM/Dev 写范围（D16） |
| 4 | REQ-010 版本行 **V1.5** | **待 Lead 一句话** | REQ-010 §1.2 要求上报；UI 已上报，QA 判非缺陷（D17；PM 建议保留） |
| 5 | `?page=media` **空态**未再开一次无记录页面断言 | 未做 | 并入 [REQ-011](../requirements/REQ-011-media-upload-observability-and-copy-hygiene.md) A4（双态验收） |
| 6 | **像素级视觉走查** | 未做 | 排队 #5（本轮未获授权，D8/L-R9-4 延续）；需 Lead 授权 UI 写范围 |
| 7 | **`${args.*}` 登记组**（compose/compose-edit/preview/seo/heroes/factory/pages:136/tags）实测 | 未做 | 排队 #7（R9F 亦未覆盖）；**不得**据 BUG-012 推断同坏 |
| 8 | `posts.aup:169`（Detail，会写真实 `node/post-detail.json`）与 `hub.aup:149`（Purge，会删真实收录记录）未单击 | 未做（**有意**） | 收益不足、动真实数据风险明确；同通道写路径已由同批点击证明（R9F 口径延续） |
| 9 | `?page=hub` **4 条真实记录 `relation` 全为 `removed`** | 既有状态 | 非本轮引入（QA 未点真实记录）；是否恢复 = **运营动作**（D19） |
| 10 | 定向 live 文件（含 Dev 自报的 `arcblog-network.test.mjs` 15/15） | **未由 QA 复跑** | 本轮未触及 CLI / AFS 记录形态 / 链适配器 / daemon 路由（`git diff --name-only -- scripts world blocklet.yaml` 为空）→ 按门规不单跑；Dev 自报**仅作线索，不构成通过依据** |
| 11 | 全量 `npm run test:live`、`arc dsl lint --fix`、`arc dsl explain` | 未跑 | 前两者为门规/风险（用户 2026-09-27 裁定）；`arc dsl explain` **实测不存在**（能力核验走 `arc dsl schema` / `arc-contracts.md` / 真实点击） |
| 12 | admin 身份沿用共享调试 Chrome CDP 9333 登录态 | 流程注意 | 非缺陷；报告已注明身份来源 |

**② PM 轮末只读复核门（2026-09-28；未写实例、未加锁、未开浏览器——与 QA 结论一致，非「复验」）**

```text
$ arc dsl validate --json      → "issues": []                                    [exit=0]
$ npm test                     → tests 28 / pass 28 / fail 0                      [exit=0]（fast tier passed — this is the gate）
$ node scripts/arcblog-console-nav.mjs --check → {"ok":true,"action":"check","pages":17} [exit=0]
$ arc dsl generate --check     → Would generate 0 file(s) (dry-run) — nothing to change [exit=0]
$ git status --short           → 归因见下（PM 清点；**不含**任何源码/测试越界改动）
```

**③ 归因与提交风险（Lead 轮末必看）**

- **净交付归因**：Dev = `.aup/pages/{ops/media,ops/hub,admin/posts,admin/pages}.aup` + 生成 `.aup/locales/**` + `dist/{.afs/manifest.json,.aup/**}`；UI = `docs/ArcBlog-admin-ui-design.md` + `docs/team/design/UI-006-*.md`；QA = `docs/team/test-reports/round-10.md` + `docs/team/bugs/BUG-018/019/020-*.md`；PM = `docs/team/backlog.md` + `docs/team/requirements/REQ-009/010/011-*.md` + `docs/team/journal/round-10.md` + `docs/team/journal/README.md`。
- **`dist/docs/**` 是 build 镜像**：PM/QA/UI 的最后写盘**晚于** Dev 的 build ⇒ **Lead 必须再 `arc blocklet build` 一次**（晚于所有人写盘），否则镜像陈旧（R7/R8 教训）。**注意** `dist/docs/team/.gate-lock` 是 build 期残留镜像，不要误提交。
- **⚠️ 非本轮产物**：`docs/dsh-workflow-and-ralph.md` 与 `dist/docs/dsh-workflow-and-ralph.md`（dsh 部署级说明，文首已声明「不是 ArcBlog 产品文档」）→ **禁止 `git add -A`**，按写范围分拣提交，**不含**这两个文件。
- **越界核查（静态）**：本轮 PM 只写 `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**`；未改源码 / 测试 / spec / checklist / `arc-contracts.md` / `docs/ArcBlog-admin-ui-design.md`；未删 `node.key` / `.env.local`；未执行任何 git 写操作。


## 下轮候选（R11，**需人工恢复**；详见 [`backlog.md`](../backlog.md)「🎯 目标收尾」④ 批次表与排队区）

> **R10 已结清**：排队 **#12（L-R9-1 授权外残留）/#13（BUG-016）/#14（BUG-017）/#15（D14 口径）** 全部出列。新增 **#16**。

1. **排队 #3 第 2 项：设置-通用（§15.9，清单第 119 行 🟡）** —— 「功能界面补全」的下一项（每轮 1–2 项；随后 #3 第 3/4/5 项 = 设置-角色与能力 / Hub 注册界面 / §8.1 Factory 元数据 / §126 SEO-OG）。
2. **排队 #16：[REQ-011](../requirements/REQ-011-media-upload-observability-and-copy-hygiene.md) 媒体上传入口的可观测性 + 文案去「不可复现观测」引用**（QA round-10 §7-1/§7-3/§7-5；含空态/有记录态双态验收）—— 已立 REQ 草案，待 Lead 建任务。
3. **排队 #6：BUG-015 判据修订后的等价断言复跑**（R9F 已复跑 34/34 → 回归确认；可与 #3 的复验并轨）。
4. **排队 #7：`?page=compose` `Publish now` / `${args.*}` 形态实测**（R9F/R10 仍未覆盖，属受限未验证）。
5. **排队 #5：像素级视觉走查**（UI；本轮未获授权，仍留队列，需 Lead 授权写范围）。
6. **排队 #8/#9/#10/#11**：Agent 工具目录核对门与逐工具说明（§15.8 缺口 2/4）、标签规范化口径评估（先出评估结论）、状态枚举呈现范式沉淀（**Lead 落笔** `arc-contracts.md` / `.agents/skills/aup-dsl`）、控制台一键复制（需先实测 `frame` 代价）。
7. **Lead 侧文档**：**BUG-018** → `docs/arc-contracts.md` §29.2 更正/限定（R10 实测定为环境相关；**BUG-016 已走「修」分支 ⇒ 无需留档**）；**D2** spec 的 hash 版控制台口径（待用户）；**D14 续** 是否统一为「移动语义」；真实链 `ocap` 演练与内容可见性五档（待用户）。
8. **若 R11 出现新缺陷**：一律先裁决（本轮修 / 下轮修 / 不修 + 理由 + spec 章节）再开工；P0 不允许延后。

**人工恢复方式**：人类在本会话说「**继续 / resume**」→ Lead `update_goal action=resume`（或重新下达轮次目标）；恢复后 PM 从本节的 1–8 与 `backlog.md`「🎯 目标收尾」④ 取用候选，重排「本轮：Round 11」。

## 目标收尾（长时目标收束，PM 2026-09-28）

> **收束结论**：Round 10 是本次长时目标（`create_goal` 自动续轮，`max_goal_rounds=3`）的**最后一轮自动续轮**。本轮 **5 项目标全部收口**、QA-005 **放行**（`VERDICT=pass, BLOCKING=0`）、快层门全绿、**无未裁决 P0/P1** ⇒ **目标达成，仓库处于可封板状态**；**自动续轮到此停止，R11 需人工恢复**。

**1. 目标达成情况（逐项）**

| 目标 | 结果 |
| ---- | ---- |
| §15.4 媒体管理界面（🟡 → ✅ 候选） | ✅ 达成（索引字段 / 引用视图 / 孤儿清理 / 上传入口；做不到的如实降级为 CLI 指引） |
| BUG-017（D13 选项①） | ✅ 文案口径达成（en/zh 两步走 + 两步走闭环 + 未做 overlay/worker）；现象前提转 BUG-018 |
| BUG-016（D15 一次保型探针） | ✅ 走「修」分支（`tree-merge` 保型 + 独立复验通过） |
| D14（Publish = 复制 + 文案） | ✅ 达成（modal + `drafts-note` 写明复制语义；CLI 未改） |
| REQ-010（UI 标准附录事实对齐） | ✅ 达成（A1–A7 全通过；断言块 `eqBytes=846` 逐字节不变、`^□`=12）；版本行 V1.5 待 Lead 一句话 |

**2. 仓库终态**：`arc dsl validate --json` → `issues: []`；`npm test` → **28/28**；`console-nav --check` → `pages:17`；`arc dsl generate --check` → 0 file（无漂移）；改动面归因干净（`git diff --name-only -- scripts world blocklet.yaml` 为空）。**Lead 侧尚需**：`arc blocklet build`（晚于最后写盘）→ 按写范围分拣 `git add`（**排除** `docs/dsh-workflow-and-ralph.md` / `dist/docs/dsh-workflow-and-ralph.md`）→ `git commit` → checklist 落笔。

**3. 未收口事项**：见上节「遗留与风险」① 的 12 条（1–4 为待 Lead / 待下一步，5–12 为已登记的不阻断受限项）——**没有任何一项阻断封板**。

**4. 给 Lead 的收尾动作清单**

1. `arc blocklet build`（**必须晚于** PM/QA/UI 最后一次写盘；注意 `dist/docs/team/.gate-lock` 残留镜像不要误提交）。
2. 按写范围分拣 `git add`（Dev/UI/QA/PM 四组，见「遗留与风险」③）；**禁止 `git add -A`**。
3. `git commit`（禁止 teammate 执行）。
4. 更新 `docs/ArcBlog-feature-checklist.md`：**第 102 行 🟡→✅**（PM 最终建议：**落 ✅ + 三条不阻断缺口登记**；严格口径则暂留 🟡 待 REQ-011）+ 第 101 行（BUG-017 文案已落地 + BUG-018 注）/ 第 110 行（BUG-016 已修保型）备注 + `## 维护记录` 追加一行 + 「总览」计数 **✅79→80 / 🟡10→9**。
5. 更新 [`journal/README.md`](README.md) 索引表的 Round 10 行（提交列由 Lead 填）。
6. **Lead 文档裁决三项**：BUG-018 的 `arc-contracts.md` §29.2 更正/限定（D16）；REQ-010 版本行 V1.5 保留与否（D17）；checklist 第 102 行落笔（D18）。
7. **可选积压（非本轮产物）**：`arc-contracts.md` §29.2 更正 + 状态/枚举呈现范式在 `.agents/skills/aup-dsl` 的同步（排队 #10）。

**5. 自动续轮停止声明**：**确认本轮结束后不再自动开始 R11**。继续工作的唯一入口 = 人类在本会话说「**继续 / resume**」（Lead 执行 `update_goal action=resume`）或重新下达轮次目标；恢复后 PM 从 [`backlog.md`](../backlog.md)「🎯 目标收尾」④ 批次表与排队区 **#3 / #5–#11 / #16** 取用候选，重排「本轮：Round 11」。

