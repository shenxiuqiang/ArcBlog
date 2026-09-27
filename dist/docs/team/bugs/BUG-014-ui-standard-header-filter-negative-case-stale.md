# BUG-014: UI 标准 V1.4 §2.6/§9 的「去掉 `.aup-app-header` 过滤后 `?page=compose` 为 `2`」在 BUG-010 修复后已失效（实测 `0`），REQ-007 A2 的负面用例字面不可满足

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-014 |
| 严重级 | **P3**（文档事实漂移：判据说明与实测不符；不影响实现，但会让下一轮实现者按错误前提判读断言） |
| 发现轮次 | round-9（**本轮 UI V1.4 改动区域内**：BUG-011 的修复即「限定视口 + 补等价断言」，UI 在 §2.6 补了 BUG-010 前后两态说明，却保留了这条 BUG-010 **之前**的测量） |
| 关联 REQ | REQ-007 §3 A2（负面用例：「在 §2.6/§9 的原断言上删掉 `.aup-app-header` 过滤后，`?page=compose` 应 > 0」）；与 BUG-010（已收口）同源 |
| 状态 | **已修复（R9F，UI / task-17，Lead D10 一行授权）· QA 复验通过（2026-09-27T17:3xZ，见 [round-9-reverify.md](../test-reports/round-9-reverify.md) §3-E / §6）** —— §2.6/§9 两处说明性实测描述更正为 BUG-010 之后的真实情况（compose 去掉过滤两视口均 `0`；旧 `2` 明确标注为 BUG-010 **之前**的旧测量；漂移改记在 `?page=appearance`）；**断言表达式、期望值 `0`、§9 十二条 `^□` 一字未动** |
| 写范围 | `docs/ArcBlog-admin-ui-design.md` 属 UI（L-R9-1 授权内）；QA 未改文档 |

## 复现命令与最小步骤

```bash
# admin 会话，视口 1803×908；同一表达式跑「带过滤 / 不带过滤」两遍
cat > /tmp/qa-r9/neg-nofilter.js <<'JS'
(() => {
  const noFilter = [...document.querySelectorAll('*')]
    .filter(el => el.scrollHeight > el.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(el).overflowY))
    .pop()?.querySelectorAll('a:not([target])').length ?? 0;
  const withFilter = [...document.querySelectorAll('*')]
    .filter(el => el.scrollHeight > el.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(el).overflowY) && !el.querySelector('.aup-app-header'))
    .pop()?.querySelectorAll('a:not([target])').length ?? 0;
  return JSON.stringify({ withoutHeaderFilter: noFilter, withHeaderFilter: withFilter });
})()
JS
QA_VW=1803 QA_VH=908 node /tmp/qa-cdp2.mjs 'http://arcblog.localhost:4939/?page=compose&locale=en' /tmp/qa-r9/neg-nofilter.js
```

文档原文位置（V1.4，`grep -n` 实测）：

```text
docs/ArcBlog-admin-ui-design.md:235  …**`!el.querySelector('.aup-app-header')` 不是可选项**：去掉它后 `?page=compose` 会变成 `2`，命中的两条都是**框架 chrome**…
docs/ArcBlog-admin-ui-design.md:518  原断言实测（2026-09-27…）：…去掉 `!el.querySelector('.aup-app-header')` 后 `?page=compose` 为 `2`——…
```

## 期望

去掉 `.aup-app-header` 过滤后结果应 **> 0**（文档 235/518 行如此断言；REQ-007 A2 也把它作为负面用例的判据）。

## 实际

BUG-010 修复后 `.pop()` 取到的**最后一个可滚动容器已经是内容列本身**（不再有「同时含 `.aup-app-header` 的整壳容器」），所以带不带该过滤都得 `0`——**该过滤项在本轮实测中已不再起区分作用**；文档 235/518 的 `2` 是 BUG-010 之前的旧测量（round-8 报告 §3-N 的 `{containers:1, withExclusion:0, withoutExclusion:2}` 是其历史来源）。

```text
$ QA_VW=1803 QA_VH=908 … '?page=compose'   -> {"withoutHeaderFilter":0,"withHeaderFilter":0}   # 文档说 2
$ QA_VW=1512 QA_VH=765 … '?page=compose'   -> {"withoutHeaderFilter":0,"withHeaderFilter":0}
$ QA_VW=1803 QA_VH=908 … '?page=appearance'-> {"withoutHeaderFilter":0,"withHeaderFilter":0}
$ QA_VW=1512 QA_VH=765 … '?page=appearance'-> {"withoutHeaderFilter":1,"withHeaderFilter":1}   # 原断言 1 的来源（侧栏容器）
$ QA_VW=1803 QA_VH=908 … '?page=posts'     -> {"withoutHeaderFilter":0,"withHeaderFilter":0}
$ QA_VW=1512 QA_VH=765 … '?page=posts'     -> {"withoutHeaderFilter":0,"withHeaderFilter":0}
```

容器身份（同一会话 `containers.js`）：`?page=compose @1803` 唯一可滚动容器 = 内容列（1471×744，`containsHeader:false` / `containsNav:false`）；BUG-010 前它是整壳容器（含 header + 2 条 chrome 链接），这正是文档 `2` 的由来。

## 证据输出

见上（`/tmp/qa-r9/neg-nofilter.js` + `/tmp/qa-r9/containers.js` 原始 JSON）。REQ-007 A2 的等价断言部分（`candidates >= 1` + `total = 0`）**不受影响，17 页 × 2 视口 34/34 全绿**（round-9 报告 §3）。

## 影响范围

- 受影响角色：UI / Dev / QA（文档是 §9 页面验收的共同依据）
- 受影响链路：文档判据说明（§2.6）与 REQ-007 A2 的负面用例；**实现无缺陷**（BUG-010 已正确修复）
- 数据后果：无
- 可绕过：是（把负面用例改到 `?page=appearance @1512×765`：去掉过滤 1 → 加过滤后 1，仍能给「原断言 ≠ 等价断言」的对照；或直接引用 BUG-011 的两视口漂移）

## 疑似文件

- `docs/ArcBlog-admin-ui-design.md:235`（§2.6 段落）与 `:518`（§9 末条说明段）
- 同源背景：`docs/ArcBlog-admin-ui-design.md` §2.6 等价断言块（V1.4，`candidates`/`total`）——**该块本身正确且 34/34 绿**
- 上游事实：`docs/team/bugs/BUG-010-compose-appearance-missing-content-scroll-container.md`（已收口）

## R9F 复验结论（QA，2026-09-27T17:3xZ）— 已修复（文档更正属实；判据未被放宽）

独立复验（原始输出见 [`round-9-reverify.md`](../test-reports/round-9-reverify.md) §3-E）：

**(a) 更正内容属实**：`git diff` 显示两处均已改写为「更正（2026-09-28，BUG-010 修复后复跑）…那是 **BUG-010 之前**的旧测量…期望值仍为 `0`，判定一律以等价断言为准」，并明确「不要再用『去掉过滤会变成非零』当论据」。QA 自跑负数探针的 6 组数字与更正后描述**逐项一致**：

```text
neg compose    @1803x908 { withoutHeaderFilter: 0, withHeaderFilter: 0 }
neg appearance @1803x908 { withoutHeaderFilter: 0, withHeaderFilter: 0 }
neg posts      @1803x908 { withoutHeaderFilter: 0, withHeaderFilter: 0 }
neg compose    @1512x765 { withoutHeaderFilter: 0, withHeaderFilter: 0 }
neg appearance @1512x765 { withoutHeaderFilter: 1, withHeaderFilter: 1 }   ← 漂移改在此重现，与文档一致
neg posts      @1512x765 { withoutHeaderFilter: 0, withHeaderFilter: 0 }
```

**(b) 断言表达式与期望值 `0` 未被改动（硬证据）**：用 **round-9 QA 自己的提取器** `/tmp/qa-r9/extract.mjs` 对当前文档重跑，并与 **round-9 首验时另存**的提取结果逐字节 `diff`：

```text
$ node /tmp/qa-r9/extract.mjs
§2.6 js blocks: 2 | §9 js blocks: 2
orig26===orig9: true
eq26===eq9: true | docBlockBytes: 846
$ diff /tmp/qa-r9f/equiv-round9-saved.js /tmp/qa-r9/equiv-from-doc.js   → IDENTICAL(0 diff)
$ diff /tmp/qa-r9f/orig-round9-saved.js  /tmp/qa-r9/orig-from-doc.js    → IDENTICAL(0 diff)
$ grep -c '^□' docs/ArcBlog-admin-ui-design.md                          → 12
$ git diff -- docs/ArcBlog-admin-ui-design.md | grep -E '^[+-]□'        → no □ entry line changed
```

**(c) 判定用等价断言复跑**：QA 从**当前文档逐字提取**断言文本，17 页 × 2 视口 = **34/34 PASS**（全部 `candidates=1, total=0, initFail=false`）。

**结论**：文档事实漂移已更正、判据未被放宽、§9 十二条未动、实测与文档一致 ⇒ **已修复，放行**。
