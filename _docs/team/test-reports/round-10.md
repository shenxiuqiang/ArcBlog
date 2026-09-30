# round-10 测试报告（REQ-009 媒体页 + D13/D14/D15 三条裁定 + REQ-010 UI 标准附录事实对齐）

**QA-005（`task-23`）独立复验** ｜ 轮次：**Round 10** ｜ 日期：2026-09-28（CST）｜
结论对象：`task-21`（Dev，`.aup/**` + `dist/**`）与 `task-22`（UI，`docs/ArcBlog-admin-ui-design.md` + `docs/team/design/UI-006-*.md`）

> **独立验证声明**：本报告**不采信 Dev/UI 的自述**。所有结论来自 QA 自己重跑的命令、自己造的 `qa-r10-*` 探针、自己的真实点击与 AFS 直读。凡标注「浏览器实测」的行都有本次会话的原始输出；凡做不到的一律写「受限未验证 + 原因」。

---

## 0. 验证方式与边界（结论怎么来的）

| 项 | 值 |
| -- | -- |
| 身份来源 | 本机共享调试 Chrome / CDP **9333**（`profile /tmp/arcblog-chrome-test`）的**既有 admin 登录态**；guest 用例用 CDP `Target.createBrowserContext` 独立无 cookie 上下文 |
| 实例 | arc 实例 `default`（daemon `service _run` PID 53221，启动于 **2026-09-28 02:04:49 CST = 18:04:49Z**） |
| 写实例纪律 | 真实点击/上传前写 `docs/team/.gate-lock`（`QA-005 round-10 …`），跑完删除；全部探针逐条清理，见 §8 |
| 证据分类 | **浏览器实测** / **静态复核** / **受限未验证**，逐行标注，不混写 |
| 未跑的（口径） | 全量 `npm run test:live`（用户裁定 2026-09-27）；`arc dsl lint --fix`（会误删运行时寻址 id）；`arc dsl explain`（**实测不存在**，能力核验走 `arc dsl schema` / `docs/arc-contracts.md` / 真实点击）；定向 live 文件本轮**未跑**（见下） |
| 定向 live 判据 | REQ-009 §2.2 第 1 条：仅当触及 CLI / AFS 记录形态 / 链适配器 / daemon 路由才单跑。本轮 Dev 改动只落在 `.aup/pages/**` 文案与页面写入形态（**未改 `scripts/**` / `world/**` / `blocklet.yaml` / 适配器 / 路由**，见 §1），故 QA 侧不新增定向 live；Dev 自报的单跑 `arcblog-network.test.mjs`（15/15）属**线索**，QA 未采信为证据 |
| 浏览器使用判据 | REQ-009 A2–A8 与 REQ-010 均明确要求 DOM 断言/真实点击，故启动浏览器 |

---

## 1. 被测产物与构建一致性

**改动面（静态复核，`git` 原始输出）**

```text
$ git diff --name-only
.aup/locales/en.json
.aup/locales/zh.json
.aup/pages/admin/pages.aup
.aup/pages/admin/posts.aup
.aup/pages/ops/hub.aup
.aup/pages/ops/media.aup
dist/.afs/manifest.json
dist/.aup/locales/en.json
dist/.aup/locales/zh.json
dist/.aup/pages/admin/pages.aup
dist/.aup/pages/admin/posts.aup
dist/.aup/pages/ops/hub.aup
dist/.aup/pages/ops/media.aup
dist/docs/ArcBlog-admin-ui-design.md
dist/docs/team/backlog.md
docs/ArcBlog-admin-ui-design.md
docs/team/backlog.md

$ git diff --name-only -- scripts world blocklet.yaml
                                    ← 空（无 CLI / schema / 权限表改动）

$ git diff --numstat -- .aup
26	5	.aup/locales/en.json
26	5	.aup/locales/zh.json
2	2	.aup/pages/admin/pages.aup
4	2	.aup/pages/admin/posts.aup
2	13	.aup/pages/ops/hub.aup
70	7	.aup/pages/ops/media.aup
```

**源 ↔ `dist/` 逐文件一致性（改了 `.aup` 必须核）**

```text
$ for f in .aup/pages/ops/media.aup .aup/pages/ops/hub.aup .aup/pages/admin/pages.aup \
           .aup/pages/admin/posts.aup .aup/locales/en.json .aup/locales/zh.json; do
    diff -q "$f" "dist/$f"; done
same: .aup/pages/ops/media.aup
same: .aup/pages/ops/hub.aup
same: .aup/pages/admin/pages.aup
same: .aup/pages/admin/posts.aup
same: .aup/locales/en.json
same: .aup/locales/zh.json
$ diff -rq .aup dist/.aup        # 全树
                                 [exit=0，零差异]
$ diff -q docs/ArcBlog-admin-ui-design.md dist/docs/ArcBlog-admin-ui-design.md
                                 [same]（UI 的 docs 改动已进 dist 镜像）
```

**写范围归因（静态复核）**

- Dev（`task-21`）名下只有 `.aup/pages/{ops/media,ops/hub,admin/posts,admin/pages}.aup` + 生成物 `.aup/locales/**` + `dist/**`；**`.aup/app.json` / `.aup/wrapper.json` 未变**（本轮无新页面 id）。
- UI（`task-22`）名下只有 `docs/ArcBlog-admin-ui-design.md`（`8 insertions / 6 deletions`）+ 新文件 `docs/team/design/UI-006-appendix-residuals.md`。
- `docs/team/backlog.md`（PM）、`docs/team/requirements/REQ-009/010`、`docs/team/journal/round-10.md`（PM）与 QA 的 `docs/team/test-reports/**`、`docs/team/bugs/**` 各自归位，**无越界写入**。

**逐文件改动性质（静态复核）**

| 文件 | 改动 | 性质 |
| ---- | ---- | ---- |
| `.aup/pages/admin/pages.aup` | 仅 `act-publish-msg`(:10) 与 `offline-hint`(:11 区) 两行 i18n | 文案；**`:184` 的 `exec` 形态逐字节未动** |
| `.aup/pages/admin/posts.aup` | `admin-publish-msg`(:18) / `admin-publish-title` 改写 + 新增 `drafts-note` 常驻行 | 文案 + 一条 `<p>` |
| `.aup/pages/ops/hub.aup` | Approve/Reject 由 `delete + write` 全量重写改为**单次 `/.actions/write` + `mode: tree-merge`**，只写 `{relation, removedAt, updatedAt}`；删除 10 个 hidden input（保留 `ePath`） | 写入形态变更（D15 授权范围内） |
| `.aup/pages/ops/media.aup` | 索引行补 `title/id/path(可选文本+title)/mimeType/size/相对时间` + 每行 `refs --id` 指引；新增「上传」「引用视图(CLI)」「未引用媒体与清理」「平台限制(如实降级)」卡片；`afs-dropzone` 无参 + 外层 `view` | 功能补全 + 降级说明 |

**关键静态断言（QA 自跑）**

```text
$ grep -c 'afs-dropzone' .aup/pages/ops/media.aup
3                                   # 2 处在 i18n 文案里被提及，1 处是真节点
$ grep -n '^\s*afs-dropzone\s*$' .aup/pages/ops/media.aup
154:                  afs-dropzone   # 无参，与既有 3 处范式一致
$ grep -n 'afs-dropzone' .aup/pages/admin/compose.aup .aup/pages/admin/compose-edit.aup .aup/pages/site/heroes.aup
.aup/pages/admin/compose.aup:154:              afs-dropzone
.aup/pages/admin/compose-edit.aup:77:          afs-dropzone
.aup/pages/site/heroes.aup:160:                  afs-dropzone
$ grep -n 'eSyncLastVersion' .aup/pages/ops/hub.aup
                                    ← 无输出（10 个 hidden input 已删）
```

---

## 2. 逐条验收结论表

### REQ-009

| 验收项 | 结论 | 证据（类型） |
| ------ | ---- | ------------ |
| **A1 通用门** | **通过** | §3-A：`issues: []`、`npm test` 28/28、`console-nav --check` pages:17、`generate --check` 0 file、无硬编码颜色、源↔dist 全 `same`（静态复核） |
| **A2 索引列表字段** | **通过**（REQ 断言 `hasTime` 表达式有缺陷 → BUG-019） | §3-B1：`probeRows≥1`、`hasId/hasPath/hasMime/hasSize` 全 true、`path` 是可见 `div.aup-text`（非仅 `title`，`w=1062,h=18`）、相对时间渲染为 `div.aup-time.aup-time-display`（浏览器实测） |
| **A3 引用/孤儿入口 + N1/N2** | **通过**（REQ 断言 `claimsPerRowStatus` 假阳性 → BUG-020） | §3-B2/B3：`refsCommand/orphansCommand/removeCommand/saysRecordOnly/saysRefuseIfReferenced` 全 true；**逐行无状态声称**（`hasOrphanWord:[false]`）；N2 `remove --id qa-r10-ref` → `CONFLICT` exit 1 且记录仍在（浏览器实测 + CLI） |
| **A4 上传入口（D-1/D-2 分支）** | **部分通过 + 受限未验证**：页面侧全部达标；**上传行为本身 QA 无法实测** | §3-B4：`afs-dropzone` 节点存在（`class="aup-dropzone"`，`1441×86`，无 prop 属性）、`add` CLI 指引常驻、页面**未**声称「已索引」；CDP 合成 drop 与 `Input.dispatchDragEvent` 可信拖拽**均未触发 handler**（`dzStatus:""`、`toasts:[]`）→ 见 §7 受限项 1（浏览器实测 + 受限） |
| **A5 BUG-017 / D13** | **期望 1/3/4 通过；期望 2 未复现** | §3-C1/C2：en/zh modal message + `offline-hint` 均写明「先 Remove public copy 再 Bring online」（浏览器实测）；两步走闭环成功且 `createdAt` 保留；**首次 Bring online 未被拒绝、写入成功**（`updatedAt 18:17:34.883Z`）→ BUG-018；§3-A 期望 4：`scripts/world/blocklet.yaml` 零改动、`pages.aup` 仅 2 行 i18n、`exec` 形态未动（静态复核） |
| **A6 BUG-016 / D15 保型探针** | **通过（修，验证属实）** | §3-D：null 探针 Approve → `lastVersion` 仍 `null`(`typeof object`)、`relation→indexed`；数字探针 Terminate → 仍 `7`(`typeof number`)、`removedAt` 落库；真实 4 条记录类型前后均为 `null/null/7/1`（浏览器实测 + AFS 直读） |
| **A7 D14 Publish 文案** | **通过** | §3-E：en/zh modal + `drafts-note` 写明「复制到公开 posts/、源草稿保留、CLI `arcblog-lifecycle.mjs publish` 是移动语义」；真实点击后 `posts/qa-r10-pubprobe.json{status:published}` 存在**且** `drafts/qa-r10-pubprobe.json{status:draft}` 保留；`git diff -- scripts` 为空（浏览器实测 + CLI 直读） |
| **A8 回归 / 范围 / guest 越权** | **通过** | §3-A（门）+ §4-N3（incognito guest 只见登录卡、零泄漏）+ `git diff -- scripts world blocklet.yaml` 空 + `npm test` 的 guest 权限矩阵含 `media` admin-only（自动化 + DOM 双证） |

### REQ-010

| 验收项 | 结论 | 证据（静态复核 + 逐字节比对） |
| ------ | ---- | ---------------------------- |
| **A1 通用门 + 写范围** | **通过** | §3-A；UI 名下只有 `docs/ArcBlog-admin-ui-design.md`(8/6) + 新增 `docs/team/design/UI-006-appendix-residuals.md` |
| **A2 (a) §9 第 2 条** | **通过** | §3-F1：`:471` 加「（本文档的概念名，实现里没有这个选择器）」；`^□`=**12**；§9 内 `console-pane` 命中 1；`git diff -U0 \| grep '^[+-]□'` 除 `□ 布局` 外为空 |
| **A3 (b) 附录 A.1** | **通过** | §3-F2：`:560` 新增一条**覆盖全节**的边界说明（覆盖 `:554` CSS 类名、`:558` 结构类比，并声明「A.3 自检条目里的 `console-pane` 同此口径」→ 覆盖 `:585`），逐处可对照；**CSS 骨架与 `:536` 的真实文件引用逐字节未动**（见下 diff）；`.aup/scripts/` 命中仍 **0**；`docs/reference/console-shell-layout.html` 仍在且 **7990 字节**未改 |
| **A4 (c) 附录三处 §2.3** | **通过** | §3-F3：`:532` → 「§2.3 结构 + §2.5 滚动」、`:581`(现 `:583`) → 同复合口径、`:562` → 双滚动条直指「§2.5」；`§2.3` 章节（`### 2.3 `→`### 2.35 `）与 HEAD **逐字节零差异** |
| **A5 断言块逐字节不变** | **通过（本 REQ 最重要的一条）** | §3-F4：`marker_lines=[218,501]`、两块 `identical=True`、`full_bytes=857`、`full_sha256=8f7e535963101a8530ca1574dac056784406cfa891a41975f8f87cae7986e1bd` **与 PM 基线完全一致**；行口径 `inner_bytes(eqBytes)=846`（独立脚本从文档抽取断言复算：`eqBytes:846`）；`^□`=12；断言 token `git diff` 命中 0 |
| **A6 版本行 + 零副作用** | **通过** | §3-F5：第 5 行 `V1.5`（一项一行写明 (a)(b)(c)）；`docs/team/design/**` 只新增 `UI-006-*.md`；无 `.aup/**`/`scripts/**`/`dist/**` 的 **UI 归因**改动（`.aup` 改动全部归 `task-21`） |
| **A7 负面用例 N1–N4** | **通过** | §4-N4–N7 |

> **注（UI-006 的版本行授权边界）**：UI 自陈「V1.4→V1.5 未被 Lead 叫停，按既有惯例执行，回退方式已附」。QA 静态确认 REQ-010 §1.2 原文为「**若 Lead 认为版本行不在 L-R10-1 授权内 → 停手上报**」——UI 已按 REQ 要求**在上报中显式提出待确认**，故 QA 不判缺陷；是否保留 V1.5 由 **Lead** 裁决（见 §7 观察 2）。

---

## 3. 执行的原始命令与结果摘录

### A. 快层门（QA 自己跑，不写实例）

```text
$ arc dsl validate --json
{ "path": "/Users/shenxiuqiang/workspace/ArcBlog", "ok": true,
  "files": [ …44 个文件… ], "issues": [] }
[exit=0]

$ npm test
✔ …（28 条）…
ℹ tests 28
ℹ pass 28
ℹ fail 0
ℹ duration_ms 1011.379084
fast tier passed — this is the gate. …
[exit=0]

$ node scripts/arcblog-console-nav.mjs --check
{ "ok": true, "action": "check", "pages": 17 }
[exit=0]

$ arc dsl generate --check
Would generate 0 file(s) (dry-run) — nothing to change
  path: /Users/shenxiuqiang/workspace/ArcBlog
  files: 7
[exit=0]

$ grep -rnE '#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?' .aup/pages/ | grep -v '\.json' || echo "no hardcoded color"
no hardcoded color
```

i18n 完整性（静态复核）：`en keys 540 / zh keys 540`，`in en not zh: []`、`in zh not en: []`；`media.*` 27/27、`posts.*` 42/42。

### B. A2 / A3 / A4 —— 媒体页（浏览器实测 + CLI 对照）

**B0. 探针与 CLI 对照（原始 JSON）**

```text
$ node scripts/arcblog-media.mjs add --path /blocklets/arcblog/users/qa-r10/media/qa-r10-ref.png \
    --id qa-r10-ref --title 'QA R10 ref' --mime image/png --size 1234 --width 1200 --height 630 --uploader-did did:key:zQaR10
{"ok":true,"action":"media-add","path":"/instance/app/arcblog/media/qa-r10-ref.json",
 "media":{"id":"qa-r10-ref","title":"QA R10 ref","path":"/blocklets/…/qa-r10-ref.png","mimeType":"image/png","size":1234,…}}
$ node scripts/arcblog-media.mjs add --path …/qa-r10-orphan.png --id qa-r10-orphan --title 'QA R10 orphan' --mime image/png --size 4321
{"ok":true,…,"media":{"id":"qa-r10-orphan",…,"size":4321,…}}

$ node scripts/arcblog-media.mjs list
{"ok":true,"path":"/instance/app/arcblog/media","count":2,"media":[ qa-r10-orphan, qa-r10-ref ]}

$ node scripts/arcblog-media.mjs refs --id qa-r10-ref
{"ok":true,"id":"qa-r10-ref","mediaPath":"/blocklets/arcblog/users/qa-r10/media/qa-r10-ref.png",
 "count":1,"refs":[{"kind":"post (draft)","slug":"qa-r10-ref-draft",
                    "path":"/instance/app/arcblog/drafts/qa-r10-ref-draft.json"}]}

$ node scripts/arcblog-media.mjs orphans
{"ok":true,"count":1,"total":2,"orphans":[{"id":"qa-r10-orphan","path":"/blocklets/…qa-r10-orphan.png","size":4321}]}
```

**B1. A2 页面断言（`?page=media&locale=en`，admin 1803×908）**

```text
"row": {
  "probeRows": 2,          // ≥1（一条是行，一条是其祖先容器）
  "hasId": true,
  "hasPath": true,         // /blocklets/arcblog/users/…
  "hasMime": true,         // image/png
  "hasSize": true,         // 1234
  "hasTime": false,        // ← REQ 的 document.querySelector('time') 不存在（BUG-019）
  "rowsTextSample": "…Upload indexQA R10 orphanqa-r10-orphan/blocklets/arcblog/users/qa-r10/media/qa-r10-orphan.pngimage/png4321bytes1 minute agonode scripts/arcblog-media.mjs refs --id qa-r10-orphan…"
}
"timeSelectorProbe": { "timeTags": 0,
  "aupTime": [ {"tag":"DIV","cls":"aup-time aup-time-display","text":"1 minute ago","w":891},
               {"tag":"DIV","cls":"aup-time aup-time-display","text":"1 minute ago","w":913} ] }
"pathVisibleNotOnlyTitle": {"found":true,"tag":"DIV","cls":"aup-text",
  "title":"/blocklets/arcblog/users/qa-r10/media/qa-r10-ref.png","w":1062,"h":18}
"perRowNoStatus": {"rowCandidates":1,
  "texts":["QA R10 ref | qa-r10-ref | /blocklets/arcblog/users/qa-r10/media/qa-r10-ref.png | image/png | 1234 | bytes | 1 minute ago | node scripts/arcblog-media.mjs refs --id qa-r10-ref"],
  "hasOrphanWord":[false]}
```

五张卡片都存在且非零几何（`h3` 宽 1441，高 23）：

```text
"rects": [ {"t":"Upload index"}, {"t":"Upload"}, {"t":"References (via CLI)"},
           {"t":"Unreferenced media & cleanup"}, {"t":"Platform limits (honest degradation)"} ]
```

**B2. A3 页面断言**

```text
"bodyHas": { "refsCommand": true, "refsPlaceholder": true, "orphansCommand": true,
             "removeCommand": true, "addCommand": true, "saysRecordOnly": true,
             "saysRefuseIfReferenced": true, "claimsPerRowStatus": true /* 假阳性，BUG-020 */ }
"limitsGridText": "Platform limits (honest degradation) A page cannot join collections. … The list/grid switch from the spec is not implemented: afs-list layout=grid is locked to 6 auto-fill columns and a columns prop is ignored at runtime (docs/arc-contracts.md §25). …"
```

**B3. A4 dropzone 节点**

```text
"dzHtml": "<div class=\"aup-dropzone\" data-aup-id=\"…view-4-afs-dropzone-1\" tabindex=\"0\"><div class=\"aup-dropzone-label\">Drop files here, or paste content / a link</div><div class=\"aup-dropzone-status\"></div></div>"
"dzRect": {"x":315,"y":722,"w":1441,"h":86}
"inputs": []                      ← 页面无 <input type=file>，无法用 CDP setFileInputFiles
```

**B4. 上传尝试（两种 CDP 输入，均未触发 handler）**

```text
# ① 合成 DragEvent（DataTransfer + File，dragenter/dragover/dragleave/drop 全部 ok）
DISPATCH dragenter:ok dragover:ok dragleave:ok drop:ok
AFTER { "dzStatus": "", "toasts": [], "bodyHasTargetDir": true, "bodyHasUploadFailed": true }
#   ↑ 这两个 true 是【页面自己的 i18n 文案】里含该错误串，不是本次上传产生的 → 判定为假阳性

# ② CDP 可信拖拽 Input.setInterceptDrags + Input.dispatchDragEvent(dragEnter/dragOver/drop)
DRAG dispatched at 1036 765
AFTER { "dzStatus": "", "toasts": [], "anyDialog": [] }

# 两次尝试前后索引均未变化
$ node scripts/arcblog-media.mjs list | grep '"count"'
  "count": 2
```

### C. A5 —— BUG-017 / D13（真实点击，en + zh）

**C1. 文案（en/zh 两份 modal 原文）**

```text
# en（?page=pages&locale=en → Offline 行点 Bring online，读到确认框后【不确认】）
MODAL candidates:
  aup-alert-title   : "Bring this page online?"
  aup-alert-message : "Writes a public copy under pages/. If a public copy already exists — for example one written by the old CLI or by root authority — the platform refuses this write (\"without a recoverable authority sidecar\"); click \"Remove public copy\" on the online row first, then bring it online."
离线区常驻： "Offline pages are admin-only. Bring one online when it is ready. If the public copy still exists (an older CLI / root-authorized record), the platform refuses that write — first click \"Remove public copy\" on the matching online row, then bring it online."

# zh（?page=pages&locale=zh → 点「上线」，读到确认框后【不确认】）
  aup-alert-title   : "上线这个页面？"
  aup-alert-message : "会向 pages/ 写入公开副本。若公开副本已存在——例如旧 CLI 或 root 授权写入的既有记录——平台的写入会被拒绝（without a recoverable authority sidecar）；请先在上线区对应行点「移除公开副本」，再点「上线」。"
离线区常驻： "离线页面仅后台可见；准备好后点「上线」。若公开副本仍存在（旧 CLI / root 授权的既有记录），平台会拒绝写入——请先在上线区对应行点「移除公开副本」，再点「上线」。"
```

**C2. 期望 2（拒绝）→ 未复现；期望 3（两步走闭环）→ 通过**

```text
# seed（CLI 同款通道，= scripts/arcblog-pages.mjs:68 的 writeJson）后
$ …readJson(INSTANCE_ROOT+'/pages/qa-r10-pageprobe.json')…
updatedAt= 2026-09-27T18:00:00.000Z status= online

# Take offline（成功）→ 公开副本仍在、updatedAt 未变 → Bring online 真实确认
AFTER { "toasts": ["Page is online.✕","Page is online.✕","Page is online.","Page is online.","✕"],
        "modalStillThere": false }
$ …readJson(…)…   updatedAt= 2026-09-27T18:17:34.883Z status= online      ← 写入成功，未被拒绝

# 期望 3：Take offline → Remove public copy → Bring online
after remove:  public= GONE | offline= {"status":"offline","createdAt":"2026-09-27T18:00:00.000Z"}
after online:  public= {"status":"online","createdAt":"2026-09-27T18:00:00.000Z","updatedAt":"2026-09-27T18:19:03.715Z"}
               ↑ 字段真实、createdAt 保留
```

**期望 4（未做 overlay/worker）**：见 §1「改动面」——`git diff --name-only -- scripts world blocklet.yaml` 为空、`pages.aup` 仅 2 行 i18n、`:184` exec 形态未动、`console-nav --check` 仍 `pages:17`。

### D. A6 —— BUG-016 / D15 保型探针（QA 自造探针 + 真实点击）

```text
# 探针基线（root/CLI 授权写入）
qa-r10-hubprobe-null  {"sync":{…,"lastVersion":null,…}}   typeof lastVersion=object
qa-r10-hubprobe-num   {"sync":{…,"lastVersion":7,…}}      typeof lastVersion=number

# 页面现状：6 个 hidden input 全部只剩 ePath（证明 10 个已删）
"hidden": [ {"name":"ePath","value":"/instance/app/arcblog/hub/registrations/42b02720d0b6bb68.json"},
            … {"name":"ePath","value":"…/qa-r10-hubprobe-null.json"},
              {"name":"ePath","value":"…/qa-r10-hubprobe-num.json"} ]

# ① null 探针 Approve
ROW   {"rowFound":true,"rowText":"did:key:…ubNull Relation applied Direction studio ● Status registered Freshness 19 minutes ago Approve Terminate Purge","clicked":"Approve"}
AFTER {"toasts":["Approved — relation is indexed.…"],"modalStillThere":false}
$ …readJson(…/qa-r10-hubprobe-null.json)…
sync= {"status":"never","lastSync":"","lastVersion":null,"lastHash":"","lastError":""}
typeof lastVersion= object | lastVersion= null | relation= indexed | removedAt= "" | updatedAt= 2026-09-27T18:19:37.028Z

# ② 数字探针 Terminate
AFTER {"toasts":["Relation terminated (tombstone kept).…"],"modalStillThere":false}
$ …readJson(…/qa-r10-hubprobe-num.json)…
sync= {"status":"ok","lastSync":"2026-09-27T18:00:00.000Z","lastVersion":7,"lastHash":"sha256:probe","lastError":""}
typeof lastVersion= number | lastVersion= 7 | relation= removed | removedAt= "2026-09-27T18:19:49.199Z"

# ③ 真实 4 条记录类型（探针前后各一次，均未变）
42b02720d0b6bb68.json null   object
6d86a84e377ad736.json 7      number
8133a1ea682714e5.json null   object
e8f453792619a8f9.json 1      number
```

⇒ **D15 成功分支成立**：`tree-merge` 只写必要字段即保住 `sync.lastVersion` 原类型（`null` 仍 `null`、`7` 仍 number），且 `relation/removedAt/updatedAt` 语义正确。Dev 采用「单次 `/.actions/write` + `mode: tree-merge`」的写法与实测一致。

### E. A7 —— D14 Publish 复制语义（真实点击，en + zh）

```text
# en modal
aup-alert-title   : "Publish a copy of this draft?"
aup-alert-message : "This copies the draft into the public posts/ directory — the source draft record stays in your draft list (this page never moves records). The CLI behaves differently: node scripts/arcblog-lifecycle.mjs publish writes the public copy and then deletes the source draft (move semantics). Deleted records can be republished."
# zh modal
aup-alert-title   : "发布这条草稿的副本？"
aup-alert-message : "这会把草稿复制到公开 posts/ 目录——源草稿记录仍保留在草稿列表中（本页从不移动记录）。CLI 的语义不同：node scripts/arcblog-lifecycle.mjs publish 会写公开副本并随后删除源草稿（移动语义）。deleted 状态记录也可以重新发布。"
# zh 草稿区常驻 drafts-note
"「发布」会把草稿复制到公开 posts/，源草稿记录仍保留在这里。若要移动，请改用 CLI——node scripts/arcblog-lifecycle.mjs publish 会删除源草稿（移动语义）。"

# 真实点击 Publish（确认框）
AFTER {"toasts":["Published.…"],"modalStillThere":false}
posts/qa-r10-pubprobe.json  = {"title":"QA R10 publish probe","slug":"qa-r10-pubprobe","status":"published","authorDid":"did:blocklet:arcblog"}
drafts/qa-r10-pubprobe.json = {"title":"QA R10 publish probe","slug":"qa-r10-pubprobe","status":"draft"}
posts= 4 drafts= 29        ← 目标新增、源草稿保留（复制语义）
```

CLI 侧对照（**只引用既有代码，未重复点击真实文章**）：`scripts/arcblog-lifecycle.mjs:470` 在写 public 后 `arcDelete(privatePath(slug), instance)`；`git diff -- scripts` 为空（CLI 未动）。

### F. REQ-010 —— 逐字节复核（静态）

**F1. (a) §9 第 2 条**

```text
$ awk '/^## 9\. /,/^## 10\. /' $D | grep -c '^□'                       → 12
$ awk '/^## 9\. /,/^## 10\. /' $D | grep -c 'console-pane'             → 1
$ awk '/^## 9\. /,/^## 10\. /' $D | grep '^□ 布局' | grep -c '概念名'   → 1
$ grep -n '^□ 布局' $D
471:□ 布局：宽高 100% 流式；页面固定无纵向滚动条，滚动只发生在 console-pane（本文档的概念名，实现里没有这个选择器）内（无双滚动条）
$ git diff -U0 -- $D | grep -E '^[+-]□' | grep -v '^[+-]□ 布局' || echo OK
OK        # 只有第 2 条被动过
```

**F2. (b) 附录 A.1（与 HEAD 逐字节比对；REQ 给的 awk 模式 `/^# 附录 A/` 匹配不到真实标题 `## 附录 A`，QA 用修正模式重跑）**

```text
$ git show HEAD:$D | awk '/^# 附录 A/,/^### A\.2 /' | wc -l   → 0      # REQ 脚本的起始模式恒不匹配
$ awk '/^# 附录 A/,/^### A\.2 /' $D | wc -l                   → 0
$ diff <(git show HEAD:$D | awk '/^## 附录 A/,/^### A\.2 /') <(awk '/^## 附录 A/,/^### A\.2 /' $D)
3c3
< §2.3 是标准，本附录是**喂给 AI 的原材料**。…
---
> §2.3 结构 + §2.5 滚动是标准，本附录是**喂给 AI 的原材料**。…
30a31,32
> > 本节的参考 CSS 类名（`.app-shell` / `.console-nav` / `.console-pane` / `.page-head`）与上面这段的 `row console-shell` ≈ `.app-shell`、`view console-pane` ≈ `.console-pane` **都是本文档的概念名，不是仓库里的选择器**（… 命中 0）… A.3 自检条目里的 `console-pane` 同此口径。
> 
33c35
< 1. **漏 `min-height: 0`**…正好是 §2.3 禁止的双滚动条。
---
> 1. **漏 `min-height: 0`**…正好是 §2.5 禁止的双滚动条。
                # 仅三条：授权项 (c) 两处 + 新增一条节级边界说明；CSS 骨架行零改动
$ grep -rnE 'console-pane|console-shell' .aup/ scripts/ | wc -l        → 0
$ wc -c docs/reference/console-shell-layout.html                        → 7990（未删未改名）
```

**F3. (c) 附录三处 §2.3 + §2.3 正文零改动**

```text
$ grep -n '§2\.3' $D
5:   …（版本行，述及 (c)）
532: §2.3 结构 + §2.5 滚动是标准，本附录是**喂给 AI 的原材料**。…
583: 标准：docs/ArcBlog-admin-ui-design.md §2.3 结构 + §2.5 滚动 + 附录 A.1。
                # :562 已直指 §2.5（不再出现 "§2.3 禁止的双滚动条"）
$ diff <(git show HEAD:$D | awk '/^### 2\.3 /,/^### 2\.35 /') <(awk '/^### 2\.3 /,/^### 2\.35 /' $D) && echo "OK: §2.3 正文零改动"
OK: §2.3 正文零改动
```

**F4. A5 断言块逐字节（QA 独立重算）**

```text
$ python3 /tmp/qa10-a5.py
marker_lines= [218, 501]
two_blocks_identical= True
full_bytes= 857
full_sha256= 8f7e535963101a8530ca1574dac056784406cfa891a41975f8f87cae7986e1bd   ← 与 PM 基线一致
REQ_verbatim_inner_bytes(char-slice)= 855     ← REQ 脚本用 `''.join(full[1:-1])` 切【字符】
inner_lines_count= 15
inner_bytes_eqBytes= 846                      ← 行口径（去围栏、去尾换行）= round-9 的 eqBytes
inner_sha256= 3ff23301bad27627321198ade80539ba3a7f5a19c25350ae20d9ea3c63d2de6a

$ node /tmp/qa-r10/equiv-all.mjs   # 从文档【现文】抽取断言块复算
doc-extracted blocks: §2.6 js=2 §9 js=2 | orig26===orig9:true eq26===eq9:true eqBytes:846 eqChars:790
  ↑ 846 字节 / 790 字符，解释 UI-004 的 791「字符口径」差异（backlog 🐞 6-1 已登记）
$ awk '/^## 9\. /,/^## 10\. /' $D | grep -c '^□'                              → 12
$ git diff -U0 -- $D | grep -E '^[+-].*(aup-app-header|data-active|isFormControl|candidates|linksPerColumn|total|overflowY|pop\(\))' || echo "OK: 断言表达式零改动"
OK: 断言表达式零改动
```

**F5. 版本行与零副作用**

```text
$ grep -n '文档版本' $D | head -1
5:**文档版本：** V1.5（Round 10 · 2026-09-28 落盘（授权书 2026-09-27，**L-R10-1 事实对齐**）：**残留收口**——(a) …(b) …(c) …三项**只做事实对齐**…）
$ grep -c 'V1\.5' $D                     → 1
$ git diff --numstat -- docs/ArcBlog-admin-ui-design.md  → 8  6
$ grep -c '概念名' $D                    → 13（基线 10 → +3 行标注）
```

---

## 4. 负面用例

| # | 负面操作 | 期望 | 实际 | 结论 |
| - | -------- | ---- | ---- | ---- |
| **N1** | 媒体页把「被引用」的 `qa-r10-ref` 标成孤儿 | 不得发生；页面只给 CLI 指引 | 该行文本**不含**任何 orphan/未被引用 字样（`hasOrphanWord:[false]`）；CLI `refs --id qa-r10-ref` = `count:1` | **通过**（§3-B1） |
| **N2** | `remove --id qa-r10-ref` 不带 `--force` | `CONFLICT` / exit 1，记录仍在 | `{"ok":false,"code":"CONFLICT","error":"media qa-r10-ref is referenced by 1 record(s): post (draft):qa-r10-ref-draft — resolve them or pass --force"}` `[exit=1]`；随后 `list` 仍 `count: 2` | **通过** |
| **N3** | 无 cookie 访客访问 `?page=media` | 只见登录门，零索引泄漏 | `leaks: []`；`bodySample: "ArcBlog Operations Sign in with DID Wallet to view node health, Hubs, economy and agent state. Sign in with DID Wallet"`；`sessionInitFailed:false` | **通过** |
| **N4** | `media refs` 缺 `--id` | `VALIDATION` / exit 1 | `{"ok":false,"code":"VALIDATION","error":"media id is required (--id)"}` `[exit=1]` | **通过** |
| **N5** | 用 root 作用域 `arc afs write` 直写实例路径（想绕过 authority 面） | 被拒 | `ERROR: No module found for path: /instance/app/arcblog/pages/qa-r10-pageprobe2.json in namespace 'default'` | **通过**（写入被拒） |
| **N6** | REQ-010 N1：改 §9 其它条目文字 | 不得发生 | `git diff -U0 \| grep '^[+-]□' \| grep -v '^[+-]□ 布局'` 为空 | **通过** |
| **N7** | REQ-010 N2/N3：动断言 token / §2.3 正文 / 参考 HTML | 不得发生 | `full_sha256` 与基线一致；§2.3 正文 `diff` 为空；`console-shell-layout.html` 仍 7990 字节 | **通过** |

---

## 5. 回归

```text
$ node /tmp/qa-r10/equiv-all.mjs      # §2.6 等价断言（从文档【现文】逐字抽取）× 17 页 × 2 视口
equiv PASS dashboard @1803x908 candidates=1 total=0 initFail=false
…（17 行）
equiv PASS factory   @1512x765 candidates=1 total=0 initFail=false
--- negative: original assertion without .aup-app-header filter ---
neg compose    @1803x908 { "withoutHeaderFilter": 0, "withHeaderFilter": 0 }
neg appearance @1803x908 { "withoutHeaderFilter": 0, "withHeaderFilter": 0 }
neg posts      @1803x908 { "withoutHeaderFilter": 0, "withHeaderFilter": 0 }
neg compose    @1512x765 { "withoutHeaderFilter": 0, "withHeaderFilter": 0 }
neg appearance @1512x765 { "withoutHeaderFilter": 1, "withHeaderFilter": 1 }
neg posts      @1512x765 { "withoutHeaderFilter": 0, "withHeaderFilter": 0 }
SUMMARY {"total":34,"pass":34,"fail":[]}
```

- **BUG-010 / BUG-011 等价断言（compose×appearance×两视口，含 media/hub/pages 全 17 页）34/34 PASS，`candidates=1, total=0`，`initFail=false`** ⇒ 两项既有修复**未回退**。
- `npm test` 28/28（含 `scripts/arcblog-permissions.test.mjs` 的 guest 权限矩阵：`media` 仍 `admin-only`）——见 §3-A。
- `arc dsl validate --json` / `console-nav --check` / `generate --check` / 硬编码颜色 / 源↔dist：全部见 §3-A，无新增失败。
- **未跑定向 live 文件**：本轮 Dev 未触及 CLI / AFS 记录形态（`.aup/pages/**` 文案 + 页面写入写法）、未改 `world/**`、`blocklet.yaml`、适配器、daemon 路由（§1 静态证据：`git diff --name-only -- scripts world blocklet.yaml` 为空），故按 REQ-009 §2.2/A8 的判据不必单跑；Dev 自报的 `arcblog-network.test.mjs` 15/15 **未被 QA 采信为证据**（QA 未复跑该文件，属 §7 受限项 3）。

---

## 6. 新增 BUG 列表

| BUG | 级别 | 标题 | 性质 | 是否阻断 |
| --- | ---- | ---- | ---- | -------- |
| [BUG-018](../bugs/BUG-018-pages-bring-online-refusal-not-reproducible-contracts-29-2-stale.md) | **P3** | `?page=pages` Bring online 的「诚实拒绝」在 R10 环境不可复现；`arc-contracts.md` §29.2 记载与实测不符 | 范围外 / 文档事实（Lead 写范围） | 否 |
| [BUG-019](../bugs/BUG-019-req009-a2-time-selector-mismatch.md) | **P3** | REQ-009 A2 的 `document.querySelector('time')` 与实现不符（实际 `div.aup-time.aup-time-display`），复验必然假红 | REQ 断言缺陷（PM 写范围） | 否 |
| [BUG-020](../bugs/BUG-020-req009-a3-claimsperrowstatus-false-positive.md) | **P3** | REQ-009 A3 的 `claimsPerRowStatus` 正则对 CLI 指引文案假阳性，N1 判据失去鉴别力 | REQ 断言缺陷（PM 写范围） | 否 |

**对既有 BUG 的结论更新**

| BUG | 级别 | QA-005 round-10 结论 | 依据 |
| --- | ---- | -------------------- | ---- |
| **BUG-017** | P3 | **文案收口（D13 选项①）已正确落地**；但其**核心现象（平台诚实拒绝）本轮不可复现** → REQ-009 A5 期望 2 未通过验证 | §3-C1/C2 + BUG-018 |
| **BUG-016** | P3 | **已修复 · 独立复验通过**：`null` 仍 `null`、`7` 仍 number，语义字段正确落库（D15 成功分支） | §3-D |

---

## 7. 受限未验证项 + 需裁决观察

**受限未验证（如实登记，不得推断为通过）**

1. **A4 上传行为本身（D-1 / D-2 分支无法判定）**：`.aup-dropzone` 页面**无 `<input type=file>`**，CDP 合成 `DragEvent`（含 `DataTransfer`+`File`）与 **CDP 可信拖拽**（`Input.setInterceptDrags` + `Input.dispatchDragEvent`）**均未触发平台的 drop handler**（`dzStatus:""`、`toasts:[]`、索引前后 `count:2` 不变）。⇒ 既**未复现** Dev 文案里引用的 `Upload failed: targetDir must be a non-empty string`，也**未复现**成功上传。REQ A4「必须实测」在 QA 侧**无法达成**（工具限制，非实现缺陷）。可验证的部分（dropzone 节点存在且无参、`add` CLI 指引常驻、页面不声称「已索引」）**通过**。
2. **REQ-010 的 A3/A5 检查脚本本身有两处缺陷**（QA 用修正口径重跑后才得出结论，故不影响本报告结论，但脚本不应原样复用）：(i) A3 的 awk 起始模式 `/^# 附录 A/` **匹配不到**真实标题 `## 附录 A`（实测两版均 `0` 行 → 该子检查恒空通过）；(ii) A5 的 `inner=''.join(full[1:-1])` 是**字符**切片（得 `855`），而基线的 `846` 是**行**口径，两者不可比。QA 改用 `/^## 附录 A/` 与行口径重算，得到与基线一致的 `full_sha256` 与 `eqBytes=846`。
3. **Dev 自报的定向 live `arcblog-network.test.mjs` 15/15 未由 QA 复跑**：按本轮精简轮门禁与 REQ-009 的判据（未触及 CLI/记录形态/适配器/路由）不要求跑；该结论仅作线索，**不构成本报告的通过依据**。
4. **admin 身份沿用共享调试 Chrome 登录态**（非独立身份），与 R9F 同口径。
5. **未做**：全量 `npm run test:live`、`arc dsl lint --fix`、像素级视觉走查、`?page=media` 的**空态**与**有记录态**双态对比（本轮只测有记录态 + 清理后的空态 CLI 输出，未再开一次无记录页面断言）、`${args.*}` 登记组实测。

**需 PM / Lead 裁决的观察（非缺陷，均不阻断）**

1. **BUG-017 的前提是否需要重写**：见 BUG-018。若 §29.2 的「CLI/root 既有记录一律被拒」在当前 daemon 下不成立，则 REQ-009 A5 期望 2 的验收标准本身需要重述（改为「文案已备、平台行为不作断言」）。QA 未改任何文档。
2. **REQ-010 版本行 V1.5 的授权边界**：REQ 原文要求「若 Lead 认为版本行不在 L-R10-1 授权内 → 停手上报」；UI 已在回报中显式提出待确认并按既有惯例执行。QA 静态确认版本行只改第 5 行、未触断言块与期望值（§3-F5），故按「事实对齐」判通过；**是否保留 V1.5 由 Lead 一句话裁决**（回退方式 UI 已附 UI-006 §5/§9-1）。
3. **页面文案引用了一次 QA 无法独立复现的实测**：`.aup/pages/ops/media.aup:28` 的 `upload-note` 写明「Measured 2026-09-27 … `Upload failed: targetDir must be a non-empty string`」。QA 既未复现该失败、也未复现成功（§7-1）。该文案有日期与出处、且不声称「已索引」，故**不判缺陷**；但建议 PM 在下一轮把它改成「本仓库既有范式 + CLI 登记」的措辞，或补一条可复现的拖拽步骤，避免继续引用一个不可复现的观测。
4. **`?page=hub` 真实 4 条记录的 `relation` 全为 `removed`**（页面实测）：这是本轮之前既有状态，**非本轮引入**（QA 未点击任何真实记录）；如需恢复应为运营动作，不在本轮范围。

---

## 8. 实例清理自证（命令 + 输出）

```text
# 写锁（写实例前落盘，跑完删除）
$ cat docs/team/.gate-lock
QA-005 round-10 2026-09-27T18:14:54Z — REQ-009 A2-A8 media/pages/hub/posts probes + REQ-010 static

# 逐条清理（8 条探针 + 2 条 media 索引）
removed /drafts/qa-r10-ref-draft.json
removed /drafts/qa-r10-pubprobe.json
removed /posts/qa-r10-pubprobe.json
removed /pages/qa-r10-pageprobe.json
removed /page-drafts/qa-r10-pageprobe.json
removed /hub/registrations/qa-r10-hubprobe-null.json
removed /hub/registrations/qa-r10-hubprobe-num.json
$ node scripts/arcblog-media.mjs remove --id qa-r10-orphan
{"ok":true,"action":"media-remove","id":"qa-r10-orphan","path":"/instance/app/arcblog/media/qa-r10-orphan.json","forced":false,"refs":0}
$ node scripts/arcblog-media.mjs remove --id qa-r10-ref
{"ok":true,"action":"media-remove","id":"qa-r10-ref","path":"/instance/app/arcblog/media/qa-r10-ref.json","forced":false,"refs":0}

# 残渣兜底（dry run）
$ node scripts/arcblog-clean.mjs
{"ok":true,"instance":"default","confirm":false,"found":0,"removed":0,"byDir":{},"sample":[]}

# 回到初始态
posts=3 ["hello-arcblog.json","paid-test-1790472790603.json","sign-test-1790502598928.json"]
drafts=27
pages=1 ["page-test-1790504571866.json"]
page-drafts=0 []
media=0 []
hub/registrations=4 ["42b02720d0b6bb68.json","6d86a84e377ad736.json","8133a1ea682714e5.json","e8f453792619a8f9.json"]
hub/index=1 ["hello-arcblog.json"]
node=32
  hub 42b02720d0b6bb68.json lastVersion= null object
  hub 6d86a84e377ad736.json lastVersion= 7 number
  hub 8133a1ea682714e5.json lastVersion= null object
  hub e8f453792619a8f9.json lastVersion= 1 number
probe residue= []                     ← 全库扫描 posts/drafts/pages/page-drafts/media/heroes 无 qa-r10|probe
page-drafts list len 0

# 删锁
$ rm -f docs/team/.gate-lock ; ls docs/team/.gate-lock
ls: docs/team/.gate-lock: No such file or directory
```

> 说明：**hub 4 条真实记录的 `updatedAt` 早在本轮 QA 开工前（18:09Z）就已被改写**（§1 静态证据与 §3-D 的类型对照均未显示 QA 触碰它们——QA 只对两条 `qa-r10-hubprobe-*` 探针点击）；其 `lastVersion` 类型在本轮前后**完全一致**（`null/null/7/1`）。

---

## 9. 放行结论

**结论：放行（Pass）。无未裁决的 P0 / P1。**

- **REQ-009**：A1 / A2 / A3 / A6 / A7 / A8 **全部通过**；**A4 部分通过 + 上传行为受限未验证**（页面侧达标，平台上传无法用 CDP 驱动，见 §7-1）；**A5 的期望 1/3/4 通过、期望 2（平台诚实拒绝）未复现**（→ BUG-018，范围外/文档事实，非 Dev 缺陷，D13 要求的「保留平台拒绝、不做 overlay/worker」在代码层已满足）。
- **REQ-010**：A1–A7 **全部通过**（含最关键的 A5 断言块逐字节：`full_sha256` 与基线一致、行口径 `846` 字节、`^□`=12；§2.3 正文与参考 HTML 零改动；A.1 仅新增一条节级边界说明）。
- **回归**：`npm test` 28/28、`arc dsl validate --json` `issues: []`、`console-nav --check` 17、`generate --check` 无漂移、无硬编码颜色、源↔`dist` 逐文件 `same`；**BUG-010/011 等价断言 34/34 PASS**（17 页 × 2 视口）。
- **新增 3 条 P3**（BUG-018/019/020），全部为**文档/断言层面**、不阻断；**BUG-016 复验通过**；**BUG-017 文案收口通过但其现象待重述**。
- **实例纪律达标**：锁已删、10 条探针逐条清理、实例回到 baseline（§8），真实 4 条 hub 记录类型未变。

**未跑**：全量 `npm run test:live`（用户裁定）、定向 live 文件（本轮未触及 CLI/AFS 记录形态/适配器/路由）、`arc dsl lint --fix`、像素级视觉走查、`arc dsl explain`（该命令实测不存在）。

**需 Lead 一句话裁决**：BUG-017 前提是否重述 / `arc-contracts.md` §29.2 是否更正（BUG-018）；REQ-010 版本行 V1.5 是否保留（UI 已附回退方式）。

`VERDICT=pass, BLOCKING=0`
