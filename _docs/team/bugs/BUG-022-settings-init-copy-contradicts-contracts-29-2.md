# BUG-022: `settings-general` 的「初始化记录」说明文案与 `arc-contracts.md` §29.2（R10 更正）相反——会误导运营者删记录

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-022 |
| 严重级 | **P2**（页面文案错误 + 与团队权威实测记录冲突；不阻断功能，但会诱导运营者执行破坏性操作） |
| 发现轮次 | **round-11（QA 独立验证，浏览器真实写入 + AFS 复核）** |
| 关联 REQ | spec §15.9 通用 General；权威实测 `docs/arc-contracts.md` §29.2（R10 已推翻「一律被拒」口径） |
| 状态 | 待裁决（建议 **本轮修**：改文案，删除「只能用 CLI 删除记录后重建」的诱导句） |

## 复现命令与最小步骤

1. 前置：admin 会话（CDP 9333）；六条 General 记录由 **CLI** 创建（`node scripts/arcblog-settings.mjs general install` → `writeJson` 通道，与 `scripts/lib/arc.mjs` 同通道）。
2. 打开 `?page=settings-general`，在「Site basics」卡对 `site-name` 行点 Save（或对任一开关点 On/Off）。
3. `arc afs exec … read` 复核记录。

```bash
node scripts/arcblog-settings.mjs general install          # 六条记录由 CLI 写入（本页 §3.B 实测）
# 浏览器：?page=settings-general → 改 site-name → 点 Save
arc afs exec /blocklets/arcblog/.actions/read --json \
  --args '{"path":"/instance/app/arcblog/config/general/site-name.json"}'
```

## 期望

页面文案应与 `arc-contracts.md` §29.2 的**当前口径**一致：平台对已存在记录的页面写入**不是**「一律被拒」，与记录来源/写入模式/当时 daemon 状态相关，动手前先探针；最小写入面（`tree-merge`）优先。不应声称「控制台只能编辑它自己创建的记录」。

## 实际

`.aup/pages/admin/settings-general.aup:15`（`init-desc`）写着：

> "The console can only edit records it created itself: the platform refuses a browser write to a record that was written by the CLI or by root (\"without a recoverable authority sidecar\", arc-contracts §29.2). If a list shows a record but Save keeps failing, delete that record with the CLI and create it here."

该说法被两处证据推翻：

1. **`docs/arc-contracts.md` §29.2 自己已更正**（第 1485–1494 行）：「⚠️ Round 10 复测推翻了『一律被拒』的表述……结论（诚实的口径）：该拒绝**不是**『CLI/root 记录永远只读』，而是与记录来源 / 写入模式**以及当时的 daemon 状态**相关。**不要把本节当作普适规则**」。
2. **本轮实测**：六条记录全部由 CLI 的 `general install`/`general set` 写入（`updatedAt` 为 CLI 写入后的 pretty JSON），随后**六条全部从页面写入成功**（site-name / language / timezone 的 Save 与 comments / rss / agent-access 的 On/Off），AFS 记录 `value` 与 `updatedAt` 均更新、元数据字段（label/description/scope/type/options）保持：

```text
$ node scripts/arcblog-settings.mjs general install
created 0 kept 6        # 六条均为 CLI 通道既有记录（本页改写前后各测一次）
$ # 浏览器 Save site-name = "QA11 Probe Site" 后：
{"label":"Site name","description":"Channel title of the generated RSS feed. …",
 "scope":"instance","type":"text","value":"QA11 Probe Site"}
updatedAt: 2026-09-28T01:19:56.808Z     # 写入成功（页面写入）
$ # 浏览器 On/Off 三个开关后（AFS 真 boolean，非字符串）：
rss          value=False type=bool
agent-access value=False type=bool
comments     value=True  type=bool
```

⇒ 文案与权威实测记录相反，且给出的是**破坏性建议**（先用 CLI 删除记录再重建），实际并不需要。

## 证据输出

```text
$ grep -n "init-desc" .aup/pages/admin/settings-general.aup
15:    init-desc { en "The console can only edit records it created itself: the platform refuses a browser write to a record that was written by the CLI or by root (\"without a recoverable authority sidecar\", arc-contracts §29.2). If a list shows a record but Save keeps failing, delete that record with the CLI and create it here." zh "控制台只能编辑它自己创建的记录：平台会拒绝浏览器写由 CLI 或 root 写入的记录（\"without a recoverable authority sidecar\"，arc-contracts §29.2）。…请用 CLI 删除该记录后再在此处创建。" }

$ sed -n '1485,1494p' docs/arc-contracts.md
- **⚠️ Round 10 复测推翻了「一律被拒」的表述**：在**当前** daemon 进程下，对一条用 CLI … 重新 seed 的
  `hub/registrations` 记录，`mode: "tree-merge"` … 与 `mode: "replace"` **都写入成功**；
- **结论（诚实的口径）**：该拒绝**不是**「CLI/root 记录永远只读」，而是与记录来源 / 写入模式
  **以及当时的 daemon 状态**相关 …

$ # 页面写入后 AFS 复核（QA 本轮，浏览器真实点击）
general/site-name   value='ArcBlog'      type=str   fields=['description','label','scope','type','value']
general/language    value='en'           type=str   fields=[…,'options',…]
switches/rss        value=True           type=bool
switches/agent-access value=True         type=bool
switches/comments   value=False          type=bool
```

## 影响范围

- 受影响角色：运营者（照做会删掉自己刚 seed 的记录，并可能丢掉 `createdAt`）
- 受影响链路：设置页「初始化记录」卡的引导文案
- 数据后果：无（仅文案），但诱导的操作有数据后果

## 疑似文件（线索，未改）

- `.aup/pages/admin/settings-general.aup:15`（`init-desc`，en/zh 两份文案）
- `docs/arc-contracts.md` §29.2（第 1479–1496 行）——**该文件不属 Dev 写范围**，是判据来源，不需要改

---

## 复验结论（round-11-reverify，2026-09-28，QA 独立验证）

**状态：已修复（复验通过）。** 文案已重写为 §29.2（R10 更正）口径，破坏性诱导句已删除。

```text
# DOM 原文（?page=general，admin，渲染后的 general.init-desc，en）
"Create only the records that are missing, with their documented default; an existing record is never
 overwritten (create mode refuses an existing path). These are ordinary records: the CLI and this page
 can both update them afterwards — arc-contracts §29.2 (corrected in Round 10) says a browser write to
 an existing record is not refused in general; it depends on the origin of the record, the write mode
 and the daemon process. If a Save ever fails, probe before deleting anything: delete + recreate loses
 createdAt."

# zh（.aup/locales/zh.json general.init-desc）与 en 语义对称：
"…arc-contracts §29.2（Round 10 已更正）说明浏览器写已存在记录并非一律被拒，而是与记录来源、写入模式
 和当时的 daemon 进程相关。若某次保存失败，先探针再决定：删除重建会丢掉 createdAt。"

$ grep -rn "only edit records it created\|delete that record with the CLI\|请用 CLI 删除该记录后再在此处创建" \
    .aup/ dist/.aup/ docs/team/requirements/
(0 命中)

# 另核对 general.basics-guard（新增）与实测一致：
"Each field offers only its own record's allowed values, so this page cannot submit an out-of-options
 value, and a field must be chosen (or filled) explicitly before Save. …"        ← 已由页面受控控件实测支持
```

证据全文：`docs/team/test-reports/round-11-reverify.md` §2③。
