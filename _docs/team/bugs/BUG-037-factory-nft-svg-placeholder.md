# BUG-037: `?page=factory` 的 NFT SVG 卡渲染平台占位符（`aup-placeholder`），链上渲染的 SVG 从不显示

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-037 |
| 严重级 | **P3**（图示能力缺失；pre-existing，非本轮回归；不影响数据与布局） |
| 发现轮次 | round-15（QA `task-63` 独立验证 REQ-024 A2 / §2.1.6 时发现） |
| 范围 | **本轮范围外 / 既有**：`.aup/pages/ops/factory.aup` 的 `media factory-nft-svg src="${state.summary.nodes.studio.svg}"` 行在 `git diff` 中是**未改动的上下文行** |
| 关联 | REQ-024 §2.1.6「NFT SVG 卡（若被收敛）不丢图示能力」、REQ-023 A4（代币符号零出现）、[round-15 报告](../test-reports/round-15.md) §4.2 |
| 状态 | 待 PM 裁决（登记为 arc-contracts 平台事实 + 决定是否另立 REQ） |

## 复现命令与最小步骤

```bash
node /tmp/qa-r15-nftcard.mjs        # QA 本轮探针（新上下文 + login_token + 直载 ?page=factory）
```

或直接用 DevTools 在 `http://arcblog.localhost:4939/?page=factory` 上执行：

```js
document.querySelector('[data-aup-id="factory-nft-svg"]').outerHTML
// => '<div class="aup-media" data-aup-id="factory-nft-svg"><div class="aup-placeholder">NFT card</div></div>'
```

## 期望

REQ-024 §2.1.6：NFT SVG 卡保留「图示能力」——即链上渲染的 SVG（`node/factories.json` 的 `nodes.studio.svg`，data URI）应当显示为图片。

## 实际（QA 原始输出，en / 1803×908）

```text
{"el":{"tag":"DIV","children":1,
       "html":"<div class=\"aup-media\" data-aup-id=\"factory-nft-svg\"><div class=\"aup-placeholder\">NFT card</div></div>",
       "rect":{"top":185.69,"w":1193.2,"h":100}},
 "dataUriImgs":[], "backgroundDataUris":[],
 "domHasPEM":false, "domHasPkLabel":false, "domHasABT":false, "domHasTBA":false,
 "inlineSvgs":[14 个页面图标类 svg，最长 555 字符，无一含 pk/ABT],
 "cardRegionText":"NFT card NFT card NFT — Lifecycle —"}
```

- 该元素是一个空的 `.aup-media` 容器（高 100px），内部只有平台占位符 `div.aup-placeholder`（文本「NFT card」= `alt`），**没有任何 `img` / 内联 `svg` / `background-image`** 承载 data URI。
- 记录侧确实有内容（可复算）：
  ```bash
  arc afs exec /blocklets/arcblog/.actions/read --path /instance/app/arcblog/node/factories.json | node -e "…decode nodes.studio.svg…"
  # => <svg …>…<text …>1 ABT</text>…<text …>pk -----BEGINPUBLICKEY-----MCowBQYDK2VwAyEA+7k5…-----ENDPUBLICKEY-----</text></svg>
  ```
  即：**链载荷里既有代币符号 `ABT` 也有 issuer 公钥 PEM，但页面把它降级成了占位符**，两者都没有进入默认视图。

## 影响范围

- 用户看不到节点 NFT 的链上图示（卡片只剩灰色占位符 + `—`），`docs/ArcBlog-feature-checklist.md` 的「内联 SVG」能力在**控制台展示面**上实际不成立。
- **反向的正向结论**：正因为 SVG 不渲染，REQ-024 §3.3 A2「默认视图下不出现 PK / PEM」与 REQ-023 A4「页面不得出现代币符号」在运行期**没有被违反**（QA 用 `document.documentElement.outerHTML` 全文检索 `BEGINPUBLICKEY` / `\bABT\b` 均为 false）。若将来平台修好 media+data URI 渲染，这两条会立刻变成真缺陷——必须在修之前先决定 SVG 里是否保留 `pk` / `ABT`。
- `?page=reader` / `?page=preview` 等其它用 `media` 的页面不在本次取证范围（未逐页验证是否同样占位）。

## 疑似文件（线索，QA 未改）

- `.aup/pages/ops/factory.aup`（`media factory-nft-svg` 行）
- `scripts/lib/nft-factory.mjs:116-131`（SVG 模板：`:127-129` 写死 `{{data.stake}} ABT`，`:131` 写 `pk {{data.pk}}`）
- 平台侧：`.aup-media` 对 `data:` URI 的处理（未查到官方说明，建议 `arc-contracts.md` 记一条「media 不接受 data URI → placeholder」的经验事实）

## 备注（与 REQ-024 A2 的关系）

QA 据此判定 REQ-024 §3.3 A2 的「默认视图不出现 PK / PEM」= **通过**，但通过原因是**平台占位符**，而不是字段收敛策略；`key-value-list` 层面的收敛（advanced 折叠）本身也通过（见 round-15 报告 §4.2 三态表）。

---

## QA Round 22 独立复验（task-93，2026-09-29；静态 in-process + admin 单 tab 运行期）

> 原始输出：`docs/team/test-reports/raw/round-22/10-bug037.txt`、`13-cdp.json`、`14-cdp-focus.json`。探针：`raw/round-22/qa-bug037-svg.mjs`、`qa-r22-cdp.mjs`。

**结论：核心裁定「不得伪造链上事实」已满足（P3 关闭）；但本 bug 的「平台边界」结论被实测证伪 → 另立 [BUG-061](BUG-061-media-data-uri-platform-claim-falsified.md)（P3）。**

```text
# 静态（in-process，HEAD 版本 vs 当前版本逐字节对比）
defaultSVG_identical: {studio:true, hub:true}         # REQ-023 A5「默认模板逐字节不变」成立
defaultFactory_identical: {studio:true}
simulatedBanner: {hasChineseBanner:true, hasNotOnChain:true,
                  ariaLabelFlagged:true, differsFromDefault:true}
evidenceFields: pk / stake / endpoint / owner 在 simulated 与默认模板中都保留（{{data.pk}} 等原样）
factorySimulatedSVG.containsBanner: true
$ node scripts/arcblog-factory.mjs svg --role studio | grep -o '未上链 / NOT ON CHAIN — SIMULATED'  → 命中
$ node scripts/arcblog-factory.mjs spec --role studio | grep -c 'NOT ON CHAIN'                       → 0（未标记模板保持）

# 运行期（?page=factory，en/zh，1803）
[data-aup-id="factory-nft-svg"] → <div class="aup-media" …><img src="data:image/svg+xml;base64,PHN2…"></div>
img.naturalWidth=480 / naturalHeight=300 / complete=true / alt="NFT card"
页面文本 simulated 命中：["simulated","simulated","simulated","SIMULATED"]（承载 = 既有 truth 卡 simulatedLabel
「SIMULATED — mock adapter, never chain truth」）；页面文本中 "NOT ON CHAIN" = 0
```

- B37-1 占位显式表达「未上链 / simulated」：**部分通过** —— 页面上确有明确的 SIMULATED/mock 语义（`factory-truth-nodes` 的 `simulatedLabel`，en+zh），但那是**既有**（BUG-043/046 口径）承载；**本轮新增的 SVG 横幅在运行期页面里看不到**（live projection 的 `nodes.hub.svg` 是改动前生成的，且卡上渲染的是 `nodes.studio.svg` = ocap 真链卡）。横幅本身已由 in-process 对比证明存在且默认模板零变化。
- B37-2 不伪造链上事实：**通过** —— 全页无「已上链 / chain-verified / verified」指向该 SVG 的断言；mock 节点仍有 `simulatedLabel`。
- B37-3 证据性字段零删除：**通过** —— 默认模板与 HEAD 逐字节相同，`simulated` 只**追加**横幅与 aria-label；`pk`/`stake`/`endpoint`/`owner` 字段保留。
- B37-4 平台边界登记：**不通过（结论被证伪）** —— 实测 `media` **会**渲染 `data:image/svg+xml;base64`（见 [BUG-061](BUG-061-media-data-uri-platform-claim-falsified.md)）。**不得**把「media 不接受 data URI」写进 `arc-contracts.md`。
- **受限未验证**：`factory create --adapter mock` 的运行期路径未跑（会覆写 live `config/nft-factories.json`），故「mock 卡在控制台上真的显示横幅」只有 in-process + `svg` 样例两条等价证据。
