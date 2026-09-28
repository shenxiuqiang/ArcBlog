# BUG-055: `raw/REQ-022-bug052-dom.txt` 的 `queueRows` 指标恒为 0（`document.querySelectorAll('p')`），无法区分队列空 / 非空

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-055 |
| 严重级 | **P3**（证据质量：不改变产品行为，但让「BUG-052 的运行期取证」多了一个**恒为 0、不具判别力**的字段，容易被读成「队列是空的」——恰好是本 BUG-052 要澄清的混淆） |
| 发现轮次 | round-20（QA `task-85` 独立复验 REQ-022 / BUG-052 时发现） |
| 关联 REQ | REQ-022-two-node-studio-hub-testbed.md（A4「每条都有真实输出」/ §3.5「三类证据分开标注」）；BUG-052（同一份证据文件） |
| 状态 | 待裁决（PM `task-86`） |

## 复现命令与最小步骤

1. 前置：daemon 在跑；管理员会话（浏览器里已有 `login_token` cookie）。
2. 看 Dev 探针的取值方式（`/tmp/req022-media-dom.mjs:80`，**未入库的探针脚本**；其输出已入库为 `docs/team/requirements/raw/REQ-022-bug052-dom.txt`）。
3. 用 QA 探针在同一页面实测 `document.querySelectorAll('p').length` 在**队列空**与**队列非空**两态下的取值。

```bash
cd /Users/shenxiuqiang/workspace/ArcBlog
# state A: 队列 0 条
node scripts/arcblog-media.mjs queue                       # → count: 0
QA_LANG=zh node docs/team/test-reports/raw/round-20/qa-media-dom.mjs \
  'http://arcblog.localhost:4939/?page=media&locale=zh' | grep -E 'pTagCount|probeRowPresent'
# state B: 队列 1 条（跑完必须删掉这条自建 intent）
node scripts/arcblog-media.mjs request --action remove --id qa-r20-bug052-probe2 --intent-id qa-r20-bug052-probe2
node scripts/arcblog-media.mjs queue                       # → count: 1
QA_LANG=zh node docs/team/test-reports/raw/round-20/qa-media-dom.mjs \
  'http://arcblog.localhost:4939/?page=media&locale=zh' | grep -E 'pTagCount|probeRowPresent'
arc afs exec /blocklets/arcblog/.actions/delete \
  --args '{"path":"/instance/app/arcblog/config/media-intents/qa-r20-bug052-probe2.json"}'
```

## 期望

运行期 DOM 取证里，用来描述「队列里有没有记录」的字段应当**能区分两种状态**（例如：记录 id 是否出现在 `document.body.innerText`，或命中 `[role="item"]` 的行数），否则不应把该字段与「队列有 N 条」的结论并列。

## 实际

- Dev 探针的 `queueRows` = `document.querySelectorAll('p').length`；AUP 渲染器**不使用 `<p>` 标签**，因此该值**恒为 0**。Dev 的原始输出里 `queueRows: 0` 与同一份文件「队列有 12 条记录（R19）/ 旧空态文案仍在渲染」的叙述并列，读起来像「队列是空的」。
- QA 实测：`pTagCount` 在**队列 0 条**与**队列 1 条**两态下**都是 0**，而 `probeRowPresent`（记录 id 是否出现在 innerText）正确地从 `false` 翻到 `true` → 前者无判别力，后者有。

## 证据输出

```text
$ node scripts/arcblog-media.mjs queue
count = 0
$ QA_LANG=zh node …/qa-media-dom.mjs 'http://arcblog.localhost:4939/?page=media&locale=zh'
 "globalRoleItems": 0,
 "pTagCount": 0,
 "probeRowPresent": false

$ node scripts/arcblog-media.mjs request --action remove --id qa-r20-bug052-probe2 --intent-id qa-r20-bug052-probe2
request_exit=0
$ node scripts/arcblog-media.mjs queue
count = 1
$ QA_LANG=zh node …/qa-media-dom.mjs 'http://arcblog.localhost:4939/?page=media&locale=zh'
 "globalRoleItems": 0,
 "pTagCount": 0,
 "probeRowPresent": true          ← 仅此字段随状态变化
```

完整输出：`docs/team/test-reports/raw/round-20/28-bug055-metric.txt`；Dev 侧原始输出：`docs/team/requirements/raw/REQ-022-bug052-dom.txt`（`"queueRows": 0`，四次运行全部为 0）。

退出码：0

## 影响范围

- 受影响角色：QA / PM / Lead（读 Dev 取证的人）、下一轮做 BUG-052 运行期复验的人
- 受影响链路：取证可信度（不是产品链路；运行期无写入、无权限后果）
- 数据后果：无
- 可绕过：是（换用「记录 id 是否出现在 DOM」或 `[role="item"]` 计数；QA 探针已实现 `probeRowPresent`）

## 疑似文件

- `docs/team/requirements/raw/REQ-022-bug052-dom.txt`（已入库的证据文件，`queueRows` 字段）
- `/tmp/req022-media-dom.mjs:80`（探针脚本，**未入库**，`queueRows: document.querySelectorAll('p').length`）
- 参考：`docs/team/test-reports/raw/round-20/qa-media-dom.mjs`（QA 的独立探针，`pTagCount` 仅作对照、`probeRowPresent` 作判据）

> QA 不修改上述任何文件。建议（仅建议）：把该字段替换为「队列记录 id 是否出现在页面文本」；若下一轮把探针入库，先跑一次两态对照再写结论。
