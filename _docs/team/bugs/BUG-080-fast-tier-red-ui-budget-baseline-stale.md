# BUG-080: `npm test` 快层红 —— ui-budget ratchet 基线未随 R28 的 `.aup` 改动重录（7 项回归）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-080 |
| 严重级 | **P1**（门禁红：批次放行门槛「`npm test` 全绿」未达成；非数据/权限缺陷） |
| 发现轮次 | round-28（批次末统一 QA，R25–R28） |
| 关联 REQ | 无（跨 lane：lane O 的 D1/D2/D3/D4/D5 落地 → `scripts/ui-budget-baseline.json` 未重录；UI 标准 §2.7.2 / BUG-076 的 ratchet 机制） |
| 状态 | 待裁决 |

## 复现命令与最小步骤

1. 前置：`/Users/shenxiuqiang/workspace/ArcBlog`，工作区即批次末状态（HEAD `752e4cd` + R25–R28 未提交改动）。
2. 跑快层。
3. 单跑同一个测试文件确认不是并发假红。
4. 对照：重录基线后复跑（QA 已做，见「证据输出」第 3 段；**基线文件已按字节还原**）。

```bash
cd /Users/shenxiuqiang/workspace/ArcBlog
npm test                                            # → tests 55 / pass 54 / fail 1
node --test --test-concurrency=1 scripts/arcblog-ui-budget.test.mjs
cp scripts/ui-budget-baseline.json /tmp/b.json
node scripts/arcblog-ui-budget.mjs --write-baseline  # Lead/Dev 收口动作（QA 只做一次性对照，见备注）
npm test                                            # → tests 55 / pass 55 / fail 0
cp /tmp/b.json scripts/ui-budget-baseline.json      # 还原
```

## 期望

批次末快层全绿（QA 角色卡 §8 放行门槛第 2 条：「`npm test` 全绿」）；ratchet 拦的是**退化**，不是合法新增——按测试文件自己的提示，合法新增应重录基线（上一个同场景 `b5e8a75` 即如此收口）。

## 实际

`npm test` **exit 1**，唯一红灯 = `scripts/arcblog-ui-budget.test.mjs:141` ratchet，7 项：

```text
pages.ctrl: 9 -> 11        pages.styles: 20 -> 23    pages.i18n: 33 -> 38
pages.tech: 3 -> 5         hub.styles: 8 -> 15       hub.i18n: 25 -> 26
general.tech: 15 -> 17
```

成因（`--json` 的 `stale` 字段）：`stale: ["pages","hub","policy","general"]` —— 4 个被 R28 改过的页源码 sha 已变、基线仍是旧值；`drift: []`（未改页无漂移）。逐项都对应本批次要求内的合法新增：D3 的 7 处内联圆角（`hub.styles`）、D4/D5 的标题/图例/折叠与 i18n 键（`pages.*`、`hub.i18n`）、D2 的两段式说明（`general.tech`）。

**QA 一次性对照实验（已还原）**：`--write-baseline` 后 `npm test` = **tests 55 / pass 55 / fail 0**，证明红灯唯一成因就是基线未重录，而非代码/测试错。基线文件随后按 sha256 逐字节还原（`1a664fd4…` → `ba075141…` → 还原 `1a664fd4…`），`git status scripts/ui-budget-baseline.json` 为空。

## 证据输出

```text
$ npm test
> test
> node scripts/run-tests.mjs fast

tier: fast — 10/32 file(s) (no instance writes)
…
✖ ratchet: no page is worse than scripts/ui-budget-baseline.json (0.910375ms)
  AssertionError [ERR_ASSERTION]: budget regressions:
  pages.ctrl: 9 -> 11
  pages.styles: 20 -> 23
  pages.i18n: 33 -> 38
  pages.tech: 3 -> 5
  hub.styles: 8 -> 15
  hub.i18n: 25 -> 26
  general.tech: 15 -> 17
ℹ tests 55
ℹ pass 54
ℹ fail 1
tests failed
```

退出码：1

```text
$ node scripts/arcblog-ui-budget.mjs --json   # regressions / drift / stale
regressions = pages.ctrl 9->11 | pages.styles 20->23 | pages.i18n 33->38 | pages.tech 3->5 |
              hub.styles 8->15 | hub.i18n 25->26 | general.tech 15->17
drift = []
stale = ["pages","hub","policy","general"]
```

```text
$ node scripts/arcblog-ui-budget.mjs --write-baseline && npm test
wrote scripts/ui-budget-baseline.json (22 pages)
  ~ pages: ctrl: 9 -> 11, styles: 20 -> 23, i18n: 33 -> 38, tech: 3 -> 5
  ~ hub: styles: 8 -> 15, i18n: 25 -> 26
  ~ general: tech: 15 -> 17
ℹ tests 55
ℹ pass 55
ℹ fail 0
$ shasum -a 256 scripts/ui-budget-baseline.json   # 还原后
1a664fd4b8b720168b2ca06cd1a1cf51536f8431442abb1734199f7433376a24  scripts/ui-budget-baseline.json
```

## 影响范围

- 受影响角色：Lead/Dev 的收口流程（门禁）；终端用户不可见。
- 受影响链路：质量门（`npm test` 快层），不是运行期功能。
- 数据后果：无（`--json` / ratchet 只读；QA 的对照性 `--write-baseline` 已按字节还原并自证）。
- 可绕过：否——放行门槛要求快层全绿；只能由拥有 `scripts/**` 写范围的角色（Dev/Lead）重录基线。

## 疑似文件

- `scripts/ui-budget-baseline.json`（陈旧快照；需在合并点由写范围内的角色重录）
- `.aup/pages/admin/pages.aup`、`.aup/pages/ops/hub.aup`、`.aup/pages/economy/policy.aup`、`.aup/pages/admin/general.aup`（R28 合法改动的来源，不改）

## 备注（QA 写范围声明）

QA 的写范围不含 `scripts/**`。上面第 2 段的 `--write-baseline` 是**一次性对照**：跑前把基线备份到 `/tmp/qa-baseline-backup.json`，跑完立即按字节还原，还原后 sha256 与备份前一致、`git status` 无该文件。本 BUG 只登记，不修。

## Lead 收口裁决（2026-09-29，R28 合并点）

**已关闭**。修法 = 显式重录基线（这就是棘轮的设计意图：新增控件必须**登记**而不是静默放行）：
`node scripts/arcblog-ui-budget.mjs --write-baseline` → `wrote scripts/ui-budget-baseline.json (22 pages)`，逐页差异已在输出中列出并被本次 UI 工作量解释：

| 页面 | 指标 | 前 → 后 | 归因 |
| --- | --- | --- | --- |
| pages | ctrl / styles / i18n / tech | 9→11 / 20→23 / 33→38 / 3→5 | D5：队列区标题 + 状态图例 + 空态说明 + CLI 折叠（`pages.aup` 225→251 行） |
| hub | styles / i18n | 8→15 / 25→26 | D3：7 处 action 内联 `border-radius: var(--radius-md, 8px)`；D4：队列图例 |
| general | tech | 15→17 | D2：两段式取数常驻说明 + D8 链接 `target=_blank` |

复验：`npm test` → **55/55 全绿**；`--write-baseline` 幂等（第二次「no metric changed」）。QA 的对照实验（重录→绿、还原→红）已证明唯一成因就是基线陈旧。
