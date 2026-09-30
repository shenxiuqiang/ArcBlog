# UI-005: BUG-014 — §2.6 / §9「去掉 `.aup-app-header` 过滤后 `?page=compose` = 2」实测说明更正（before/after + 两视口原始输出）

| 字段 | 值 |
| ---- | -- |
| 提案号 | UI-005（对齐记录，非新设计提案） |
| 状态 | 已实现（**V1.4 → V1.4.1 文字级更正**），待 PM / Lead / QA 复核 |
| 提出轮次 | round-9（**R9F 修复窗口**；Lead 裁定 **D10** 一行授权） |
| 上游依据 | [BUG-014](../bugs/BUG-014-ui-standard-header-filter-negative-case-stale.md) · [BUG-010](../bugs/BUG-010-compose-appearance-missing-content-scroll-container.md)（已收口）· [BUG-011](../bugs/BUG-011-console-link-assertion-viewport-sensitive.md) · [UI-004](UI-004-ui-standard-assertion-and-residuals.md) §2 |
| 实现方 | **UI 自改** `docs/ArcBlog-admin-ui-design.md`（D10 授权：**只改 §2.6 与 §9 里那一条说明性实测描述**） |
| 写范围越界 | **无**——本轮 UI 名下只改 `docs/ArcBlog-admin-ui-design.md`（2 行）与新增本记录 |
| 依据快照 | `.aup/pages/admin/compose.aup` mtime `2026-09-28 00:34:11`、`appearance.aup` mtime `2026-09-28 00:34:13`（复跑前后各 `stat` 一次，**未变**） |
| 授权边界（逐条自检） | 断言表达式**一字未动**；期望值 `0`**未放宽**；§9 的 12 条 `^□` 条目**一条未动**；§9 其余内容仅本条说明段更正；checklist / spec / `arc-contracts.md` / `scripts/**` / `.aup/**` **未触碰** |

> 本记录只做一件事：把「去掉 `.aup-app-header` 过滤后 `?page=compose` = `2`」这条 **BUG-010 之前**的旧实测说明，更正为 BUG-010 修复后的真实情况。

---

## 1. 问题

`docs/ArcBlog-admin-ui-design.md` 在 §2.6（现 235 行）与 §9（现 518 行）以「去掉 `!el.querySelector('.aup-app-header')` 过滤后 `?page=compose` 会变成 `2`」作为「该过滤项不可省」的论据。该 `2` 是 **BUG-010 之前**的测量：当时 `.pop()` 取到的是**含 `.aup-app-header` 的整壳滚动容器**（wrapper 顶栏品牌链接 + 侧栏页脚「关于」链接恰在其中）。

BUG-010 修复后 `?page=compose` 有了独立内容列，整壳容器不复存在 → 该论据失效（[BUG-014](../bugs/BUG-014-ui-standard-header-filter-negative-case-stale.md) 已定性为 P3 文档事实漂移，来源为 round-8 报告 §3-N 的 `{containers:1, withExclusion:0, withoutExclusion:2}`）。**影响**：下一轮实现者会按错误前提判读断言，REQ-007 A2 的负面用例「删掉过滤后应 > 0」在 compose 上字面不可满足。

---

## 2. before → after（§2.6 第 235 行）

**before（V1.4，逐字）**

```text
期望 `0`。原断言实测（2026-09-27，admin 会话，视口 1803×908）：17/17 控制台页均为 `0`。**`!el.querySelector('.aup-app-header')` 不是可选项**：去掉它后 `?page=compose` 会变成 `2`，命中的两条都是**框架 chrome、不属于右侧内容区**——① wrapper 顶栏的品牌链接 `a.aup-app-header-brand-link` → `href="/"`；② 侧栏页脚的「关于」链接 `a.aup-action` → `href="/?page=about"`（REQ-002 F9 新增，见 §2.1「侧栏页脚」）。判定以「过滤后必须为 `0`」为准，不依赖这两条的条数（chrome 增减不影响结论）。对照页 `?page=posts` / `?page=tags` 带不带过滤都是 `0`（原始输出见 [BUG-008](team/bugs/BUG-008-admin-ui-design-section-9-note-not-reproducible.md)）。
```

**after（现行，逐字）**

```text
期望 `0`。原断言实测（2026-09-27，admin 会话，视口 1803×908）：17/17 控制台页均为 `0`。**更正（2026-09-28，BUG-010 修复后复跑，见 [UI-005](team/design/UI-005-bug014-measurement-note.md)）**：本条原先以「**`!el.querySelector('.aup-app-header')` 不是可选项**」立论，依据是去掉该过滤后 `?page=compose` 的计数变成非零（BUG-010 之前的旧测量为 `2`，命中的是框架 chrome 两条链接——wrapper 顶栏品牌链接 `a.aup-app-header-brand-link` → `href="/"`、侧栏页脚「关于」链接 `a.aup-action` → `href="/?page=about"`），那是 **BUG-010 之前**的旧测量（当时 `.pop()` 取到的是含 `.aup-app-header` 的整壳容器，那两条 chrome 链接在它里面）。BUG-010 修复后 `?page=compose` 已有独立内容列，同一探针复跑：**去掉该过滤后 1803×908 与 1512×765 都是 `0`**（1803×908：唯一滚动容器就是内容列 1471×744；1512×765：两个容器中 `.pop()` 取到的是内容列 1223×601，侧栏容器在前）——**该过滤项在 `?page=compose` 上已不再产生差异，不要再用"去掉过滤会变成非零"当论据**（它仍留在原断言里，语义是排除承载顶栏的页面级壳容器，并无害处）。原断言的视口漂移现改在 `?page=appearance` 上重现：1512×765 **带 / 不带过滤都是 `1`**（`.pop()` 命中侧栏容器，其页脚「关于」链接），1803×908 则无任何可滚动容器、`?? 0` 空心给出 `0`。因此**该过滤项只属于"仅 1803×908 可作参照"的原断言；期望值仍为 `0`，判定一律以等价断言为准，且不依赖任何一条 chrome 的条数**。对照页 `?page=posts` / `?page=tags` 带不带过滤都是 `0`（原始输出见 [BUG-008](team/bugs/BUG-008-admin-ui-design-section-9-note-not-reproducible.md)）。
```

**改了什么**：只把「过滤项不可省的论据 = compose 会变成 `2`」替换为「该论据是 BUG-010 之前的旧测量；修复后 compose 两视口去掉过滤都是 `0`；漂移改在 `?page=appearance` 上重现；期望值仍为 `0`，判定以等价断言为准」。
**没改什么**：代码块里的**断言表达式**（199–206 行的原断言、217–233 行的等价断言）、「期望 `0`」、`17/17 均为 \`0\`` 这句 2026-09-27 历史实测、BUG-008 引用段。

---

## 3. before → after（§9 第 518 行）

**before（V1.4，逐字）**

```text
原断言实测（2026-09-27，admin 会话，视口 1803×908）：17/17 控制台页均为 `0`。去掉 `!el.querySelector('.aup-app-header')` 后 `?page=compose` 为 `2`——命中的是框架 chrome 的两条链接（wrapper 顶栏品牌链接 `a.aup-app-header-brand-link` → `href="/"`；侧栏页脚「关于」链接 `a.aup-action` → `href="/?page=about"`），都不属于右侧内容区；判定以「过滤后必须为 `0`」为准，不依赖这两条的条数（原始输出见 [BUG-008](team/bugs/BUG-008-admin-ui-design-section-9-note-not-reproducible.md)）。
```

**after（现行，逐字）**

```text
原断言实测（2026-09-27，admin 会话，视口 1803×908）：17/17 控制台页均为 `0`。**更正（2026-09-28，BUG-010 修复后复跑，见 [UI-005](team/design/UI-005-bug014-measurement-note.md)）**：原文把去掉 `!el.querySelector('.aup-app-header')` 后 `?page=compose` 的计数写作非零（BUG-010 之前的旧测量为 `2`，命中框架 chrome 两条链接），那是 BUG-010 之前的旧测量；修复后同一探针在 1803×908 与 1512×765 复跑，**去掉过滤后 `?page=compose` 均为 `0`**（`.pop()` 已直接命中内容列，该过滤项在 compose 上不产生差异），漂移改在 `?page=appearance` 上重现（1512×765 带 / 不带过滤均为 `1`，`.pop()` 命中侧栏容器）。命中项都不属于右侧内容区，**期望值仍为 `0`，判定以等价断言为准**（成因与两视口原始 JSON 见 §2.6）。
```

---

## 4. 复跑命令与原始输出

**探针**（临时脚本，只放 `/tmp`，**未入库**；Node 24 全局 `WebSocket` + CDP）

* `/tmp/qa-cdp2.mjs`（沿用 QA round-9 的 helper）：在共享调试 Chrome（`127.0.0.1:9333`，profile `/tmp/arcblog-chrome-test`，**已有 admin 登录态**）新建标签页 → `Emulation.setDeviceMetricsOverride` 设视口 → `Page.navigate` → 等 4.5 s → `Runtime.evaluate` 求值 → 关闭标签页。
* `/tmp/ui-r9f-neg-compact.js`（本轮新写）：同一表达式跑「带过滤 / 不带过滤」两遍，并输出每个滚动容器的身份（`cls` / `box` / `hasHeaderAncestorContainer` / `hasActiveNav` / `noTargetLinks` / `hrefs`）与等价断言结果。

**命令**

```bash
# 负面用例：带 / 不带 `.aup-app-header` 过滤（原断言的两种取值）
for vp in "1803 908" "1512 765"; do set -- $vp; for page in compose appearance posts; do
  printf '%-11s @ %sx%s -> ' "?page=$page" "$1" "$2"
  QA_VW=$1 QA_VH=$2 node /tmp/qa-cdp2.mjs \
    "http://arcblog.localhost:4939/?page=$page&locale=en" /tmp/ui-r9f-neg-compact.js 4500
done; done

# 同一批的容器明细版（多行 JSON）
QA_VW=1803 QA_VH=908 node /tmp/qa-cdp2.mjs \
  'http://arcblog.localhost:4939/?page=compose&locale=en' /tmp/ui-r9f-neg.js 4500
# （同一命令换 QA_VW=1512 QA_VH=765 / ?page=appearance / ?page=posts，完整日志 /tmp/ui-r9f-neg-out.txt）
```

**原始输出（2026-09-28，BUG-010 修复后；`compose.aup` mtime 快照前后一致）**

```text
== snapshot before ==
.aup/pages/admin/compose.aup mtime=2026-09-28 00:34:11
.aup/pages/admin/appearance.aup mtime=2026-09-28 00:34:13
?page=compose @ 1803x908 -> {"url":"http://arcblog.localhost:4939/?page=compose","viewport":"1803x908","sessionInitFailed":false,"headerBox":"1803x48","activeNavBox":"269x34","scrollableCount":1,"containers":[{"cls":"aup-view","box":"1471x744","hasHeaderAncestorContainer":false,"hasActiveNav":false,"noTargetLinks":0,"hrefs":[]}],"withoutHeaderFilter":0,"withHeaderFilter":0,"equivalent":{"candidates":1,"linksPerColumn":[0],"total":0}}
?page=appearance @ 1803x908 -> {"url":"http://arcblog.localhost:4939/?page=appearance","viewport":"1803x908","sessionInitFailed":false,"headerBox":"1803x48","activeNavBox":"269x34","scrollableCount":0,"containers":[],"withoutHeaderFilter":0,"withHeaderFilter":0,"equivalent":{"candidates":1,"linksPerColumn":[0],"total":0}}
?page=posts @ 1803x908 -> {"url":"http://arcblog.localhost:4939/?page=posts","viewport":"1803x908","sessionInitFailed":false,"headerBox":"1803x48","activeNavBox":"269x34","scrollableCount":1,"containers":[{"cls":"aup-view","box":"1471x749","hasHeaderAncestorContainer":false,"hasActiveNav":false,"noTargetLinks":0,"hrefs":[]}],"withoutHeaderFilter":0,"withHeaderFilter":0,"equivalent":{"candidates":1,"linksPerColumn":[0],"total":0}}
?page=compose @ 1512x765 -> {"url":"http://arcblog.localhost:4939/?page=compose","viewport":"1512x765","sessionInitFailed":false,"headerBox":"1512x48","activeNavBox":"226x34","scrollableCount":2,"containers":[{"cls":"aup-view","box":"226x717","hasHeaderAncestorContainer":false,"hasActiveNav":true,"noTargetLinks":1,"hrefs":["/?page=about|aup-action"]},{"cls":"aup-view","box":"1223x601","hasHeaderAncestorContainer":false,"hasActiveNav":false,"noTargetLinks":0,"hrefs":[]}],"withoutHeaderFilter":0,"withHeaderFilter":0,"equivalent":{"candidates":1,"linksPerColumn":[0],"total":0}}
?page=appearance @ 1512x765 -> {"url":"http://arcblog.localhost:4939/?page=appearance","viewport":"1512x765","sessionInitFailed":false,"headerBox":"1512x48","activeNavBox":"226x34","scrollableCount":1,"containers":[{"cls":"aup-view","box":"226x717","hasHeaderAncestorContainer":false,"hasActiveNav":true,"noTargetLinks":1,"hrefs":["/?page=about|aup-action"]}],"withoutHeaderFilter":1,"withHeaderFilter":1,"equivalent":{"candidates":1,"linksPerColumn":[0],"total":0}}
?page=posts @ 1512x765 -> {"url":"http://arcblog.localhost:4939/?page=posts","viewport":"1512x765","sessionInitFailed":false,"headerBox":"1512x48","activeNavBox":"226x34","scrollableCount":2,"containers":[{"cls":"aup-view","box":"226x717","hasHeaderAncestorContainer":false,"hasActiveNav":true,"noTargetLinks":1,"hrefs":["/?page=about|aup-action"]},{"cls":"aup-view","box":"1223x606","hasHeaderAncestorContainer":false,"hasActiveNav":false,"noTargetLinks":0,"hrefs":[]}],"withoutHeaderFilter":0,"withHeaderFilter":0,"equivalent":{"candidates":1,"linksPerColumn":[0],"total":0}}
== snapshot after ==
.aup/pages/admin/compose.aup mtime=2026-09-28 00:34:11
.aup/pages/admin/appearance.aup mtime=2026-09-28 00:34:13
```

**容器明细版原始输出（`/tmp/ui-r9f-neg.js`，逐字段版日志 `/tmp/ui-r9f-neg-out.txt`）**

```text
=== ?page=compose @ 1803x908 ===
{"url":".../?page=compose","viewport":"1803x908","sessionInitFailed":false,"headerBox":"1803x48",
 "sidebarActiveNavBox":"269x34","containerCount":1,
 "containers":[{"i":0,"tag":"DIV","cls":"aup-view","box":"1471x744","containsHeader":false,
   "containsActiveNav":false,"containsFormControl":false,"linksNoTarget":0,"hrefs":[]}],
 "withoutHeaderFilter":0,"withHeaderFilter":0,
 "equivalent":{"candidates":1,"linksPerColumn":[0],"total":0}}

=== ?page=appearance @ 1803x908 ===
{"url":".../?page=appearance","viewport":"1803x908","sessionInitFailed":false,"headerBox":"1803x48",
 "containerCount":0,"containers":[],
 "withoutHeaderFilter":0,"withHeaderFilter":0,        ← 无任何可滚动容器：`?? 0` 空心通过
 "equivalent":{"candidates":1,"linksPerColumn":[0],"total":0}}

=== ?page=compose @ 1512x765 ===
{"url":".../?page=compose","viewport":"1512x765","sessionInitFailed":false,"headerBox":"1512x48",
 "containerCount":2,
 "containers":[{"cls":"aup-view","box":"226x717","containsActiveNav":true,"linksNoTarget":1,
                "hrefs":["/?page=about <aup-action>"]},
               {"cls":"aup-view","box":"1223x601","containsActiveNav":false,"linksNoTarget":0}],
 "withoutHeaderFilter":0,"withHeaderFilter":0,        ← `.pop()` = 内容列（i=1），带不带过滤都是 0
 "equivalent":{"candidates":1,"linksPerColumn":[0],"total":0}}

=== ?page=appearance @ 1512x765 ===
{"url":".../?page=appearance","viewport":"1512x765","sessionInitFailed":false,"headerBox":"1512x48",
 "containerCount":1,
 "containers":[{"cls":"aup-view","box":"226x717","containsActiveNav":true,"linksNoTarget":1,
                "hrefs":["/?page=about <aup-action>"]}],
 "withoutHeaderFilter":1,"withHeaderFilter":1,        ← `.pop()` = 侧栏容器；过滤项对结果无影响
 "equivalent":{"candidates":1,"linksPerColumn":[0],"total":0}}
```

**判绿项**：每页 `sessionInitFailed: false`（无 SESSION INIT FAILED）；`headerBox: 1803x48` / `1512x48`、`activeNavBox: 269x34` / `226x34`（目标元素有非零几何）；侧栏当前项 `[data-active="true"]` 存在即证明是已登录 admin 会话；6 次运行的等价断言全部 `candidates: 1, total: 0`。

### 4.1 结论（写进文档的口径）

1. **`?page=compose`：去掉过滤后 1803×908 与 1512×765 都是 `0`**（不是 `2`）。1803×908 只有 1 个滚动容器（内容列 1471×744）；1512×765 有 2 个，`.pop()` 取到**最后一个 = 内容列**（1223×601），侧栏容器在前。→ 该过滤项在 compose 上**已不产生差异**。
2. **漂移没有消失，只是换了页面**：`?page=appearance` @1512×765 带 / 不带过滤都是 `1`（唯一容器是侧栏，内含页脚「关于」`/?page=about`）；@1803×908 一个滚动容器都没有，`?? 0` 兜底给出 `0`（空心通过）。→ 计数**随页面 / 视口变化**，所以文档写成**不依赖具体计数**的表述：期望值仍为 `0`，判定以等价断言（`candidates ≥ 1` 且 `total = 0`）为准。
3. 对照页 `?page=posts` 两视口带 / 不带过滤都是 `0`，与文档原句一致（不变）。

---

## 5. 验证门（真跑输出）

```text
$ arc dsl validate --json
  … "issues": []                      # exit=0（无 issues）

$ npm test
ℹ tests 28
ℹ suites 0
ℹ pass 28
ℹ fail 0
fast tier passed — this is the gate. …
# exit=0（本项 docs-only，不触及 CLI / AFS / 链 / daemon 路由 → 不写 .gate-lock、不跑定向 test:file）

$ node scripts/arcblog-console-nav.mjs --check
{
  "ok": true,
  "action": "check",
  "pages": 17
}
# exit=0

$ grep -n '去掉.*aup-app-header.*过滤' docs/ArcBlog-admin-ui-design.md
235:期望 `0`。原断言实测（2026-09-27…）…**更正（2026-09-28，BUG-010 修复后复跑，见 [UI-005](team/design/UI-005-bug014-measurement-note.md)）**：…
518:原断言实测（2026-09-27…）…**更正（2026-09-28，BUG-010 修复后复跑，见 [UI-005](team/design/UI-005-bug014-measurement-note.md)）**：…
# 两处均已指向 BUG-010 之后的真实情况（不是旧 `2`）

$ grep -n '会变成 `2`' docs/ArcBlog-admin-ui-design.md ; echo exit=$?
exit=1                                # 旧断言式字面量已不存在（历史原文只留在本记录 §2/§3）
$ grep -n '后 `?page=compose` 为 `2`' docs/ArcBlog-admin-ui-design.md ; echo exit=$?
exit=1

$ awk '/^## 9\. /,/^## 10\. /' docs/ArcBlog-admin-ui-design.md | grep -c '^□'
12                                    # §9 十二条验收条目一条未动
$ grep -c '内容区滚动容器内的无 target 链接数' docs/ArcBlog-admin-ui-design.md
2                                     # 两处原断言块仍在
# §2.6 与 §9 的「等价断言」代码块逐字一致：2 blocks / 各 847 bytes / identical=true（断言表达式未改）
```

> 未跑：全量 `npm run test:live`（用户 2026-09-27 门规）；`arc blocklet build`（本轮**未改 `.aup/**`**，目录内现有 `.aup` 改动属 Dev 的 BUG-010/012/013，build 由 Lead 在轮末统一做）；`arc dsl lint --fix`（会误删运行时寻址 id）。

---

## 6. 写范围与归因

```text
$ git status --short          （UI 名下）
 M docs/ArcBlog-admin-ui-design.md                                  ← 本轮 UI 改（仅 235 / 518 两行）
?? docs/team/design/UI-005-bug014-measurement-note.md               ← 本记录
```

* 未触碰：`scripts/**`、`.aup/**`、`.web/**`、`pages/**`、`world/**`、`blocklet.yaml`、`seed/**`、`docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md`、`docs/arc-contracts.md`、`dist/**`（`dist/docs/ArcBlog-admin-ui-design.md` 镜像待 Lead 轮末 build 同步）。
* 未编辑 `docs/team/bugs/BUG-014-*.md`（BUG 记录由 QA / PM 维护）；本记录只是其「期望 / 实际」的证据补强。

---

## 7. 未决 / 遗留（不属 D10 授权，留给 R10）

1. **REQ-007 A2 的负面用例**：compose 上「删掉过滤后应 > 0」已字面不可满足；若要保留负面用例，可改用 `?page=appearance @1512×765`（去掉过滤 `1` / 加过滤 `1`，能对照但**不产生差值**）或干脆改引 BUG-011 的两视口漂移。**需 PM / Lead 裁决**。
2. **`17/17 控制台页均为 0`（2026-09-27 原断言实测）**：那是原断言 1803×908 下的历史实测（含空心通过），本轮只跑 5 页 / 2 视口的负面用例，**未**逐页复跑；全 17 页 × 两视口的等价断言复跑仍归 QA（`task-14` 口径）。
3. **`appearance` 在 1803×908 无任何可滚动容器**（`scrollableCount: 0`）——等价断言 `candidates: 1`（布局容器）仍通过，但原断言此时是**空心 `0`**；是否要登记为新的结构观察（内容短于一屏时没有溢出容器是正常现象，见 §2.6 的说明），由 QA 判定。
4. L-R9-1 授权外的残留（§9 条目文字里的 `console-pane`、附录 A.1、附录三处 §2.3 交叉引用）按 **D12** 本轮不做，见 [UI-004](UI-004-ui-standard-assertion-and-residuals.md) §8（R1/R2/R4）。
