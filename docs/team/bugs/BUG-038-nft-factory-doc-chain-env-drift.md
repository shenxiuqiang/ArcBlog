# BUG-038: `docs/ArcBlog-nft-factory.md` 真实链示例与 REQ-023 的三件套 / 代币符号口径漂移

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-038 |
| 严重级 | **P3**（文档漂移；照抄示例会先得到 `VALIDATION` 而不是 `CHAIN_UNAVAILABLE`，不损坏数据） |
| 发现轮次 | round-15（QA `task-63` 独立验证 REQ-023 A3/A5 + 文档校核；Dev 自报同一点，QA 复现并补全证据） |
| 范围 | **本轮范围外**：`docs/ArcBlog-nft-factory.md` 不在 Dev 本轮写范围（Dev 已在回报中登记） |
| 关联 | REQ-023 §3.4 A3（缺三件套 fail-closed）、§3.6 A5（输出逐字节不变）、L-R15-2 item 3/4、[round-15 报告](../test-reports/round-15.md) §3.4 |
| 状态 | 待 PM 裁决（下轮把该文件加入写范围即可修） |

## 复现命令与最小步骤

```bash
grep -n "真实链前置条件" -A1 docs/ArcBlog-nft-factory.md      # :66
sed -n '100,106p' docs/ArcBlog-nft-factory.md                 # §6 示例
sed -n '110,113p' docs/ArcBlog-nft-factory.md                 # §7 实测记录
# 照 :104 的示例执行（只差 network；QA 实测，写链前就失败且零写入）
node scripts/arcblog-factory.mjs create --role studio --adapter ocap --chain-id 1
```

## 期望

文档的 operator 示例与新的三件套口径一致：`--adapter ocap` 需要 **`network` + `chainHost` + `tokenId`**（[CLAUDE.md](../../../CLAUDE.md)「Chain environment」、`docs/operations-runbook.md` → "Chain environment"）；代币符号只在链环境预设里出现，不在文档里对一个**具体链**写错符号。

## 实际（QA 原始输出）

```text
$ sed -n '100,106p' docs/ArcBlog-nft-factory.md
export ARCBLOG_CHAIN_HOST=https://chain.example.com
export ARCBLOG_CHAIN_TOKEN_ID=0x...ABT
export ARCBLOG_CHAIN_MNEMONIC='factory owner mnemonic'
node scripts/arcblog-factory.mjs create --role studio --adapter ocap --chain-id 1     ← 无 --network / ARCBLOG_CHAIN_NETWORK
node scripts/arcblog-node-nft.mjs acquire --role studio --adapter ocap --owner 0x... --pk <pem>

$ sed -n '66p' docs/ArcBlog-nft-factory.md
* **真实链前置条件**（未满足即 `CHAIN_UNAVAILABLE`）：`@ocap/client`、…、以及
  `ARCBLOG_CHAIN_HOST`、`ARCBLOG_CHAIN_TOKEN_ID`、`ARCBLOG_CHAIN_MNEMONIC`    ← 缺 network；且现在缺三件套报的是 VALIDATION 不是 CHAIN_UNAVAILABLE

$ sed -n '112p' docs/ArcBlog-nft-factory.md
链：`https://beta.abtnetwork.io/api/`（`CHAIN_ID=beta`，ABT 资产地址 `z35n6UoHSi9MED4uaQy6ozFgKPaZj2UKrurBG`）

$ node scripts/arcblog-factory.mjs create --role studio --adapter ocap --chain-id 1
{"ok": false, "code": "VALIDATION",
 "error": "--adapter ocap needs the chain triple (network/chainHost/tokenId): network is missing; chainHost is missing; tokenId is missing. …"}   ← exit 1
```

## 证据要点

| # | 漂移 | 文件:行号 | 与实测的差 |
| - | ---- | --------- | ---------- |
| D1 | 真实链前置条件不含 `network` | `docs/ArcBlog-nft-factory.md:66` | 三件套 = `network`+`chainHost`+`tokenId`（`scripts/lib/chain.mjs:109`）；缺任一 → exit 1 `VALIDATION`，**不是**该行写的 `CHAIN_UNAVAILABLE` |
| D2 | §6 示例用 `--chain-id 1`，无 network/host/token 的完整组合 | `docs/ArcBlog-nft-factory.md:104` | 照抄 → `VALIDATION`（输出见上）；`--chain-id` 不是三件套成员 |
| D3 | beta 链原生代币写作「ABT」 | `docs/ArcBlog-nft-factory.md:112`（另 `:102` 的 `0x...ABT`） | 官方 [Understanding Tokens](https://www.arcblock.io/en/docs/blockchain/understanding-tokens/)：「The native token on beta chain is TBA」（地址一致，符号不同）；同一错误也被 `docs/team/requirements/REQ-025-nft-royalty-research.md` §9.1 记录 |
| D4 | `docs/ArcBlog-nft-factory.md:34/:165/:200` 仍以「ABT」描述链卡片字段 | 同上 | `?page=factory` 已改为中性文案（`factory.chain-token` / `factory.factory-stake`），文档未跟上 |

## 影响范围

- 新 operator 照第 6 节示例操作会拿到 `VALIDATION`（fail closed，安全方向），但会以为文档里的「未满足即 CHAIN_UNAVAILABLE」是代码 bug。
- 第 7 节的 beta「ABT 资产地址」是**事实性错误**（应为 TBA），会让读者以为 beta 与 main 用同一符号。
- 不阻断本轮：`?page=factory` 的页面文案已中性（QA 已验：en「Mint token」/「Stake per node」、zh「铸造代币」/「每个节点质押」；`.aup/`+`dist/.aup/` 的 `ABT` 命中 0）。

## 疑似文件（线索，QA 未改）

- `docs/ArcBlog-nft-factory.md:34`、`:66`、`:102-104`、`:112`、`:165`、`:200`
- 口径来源：`scripts/lib/chain.mjs:104-200`（`CHAIN_PRESETS` / `REAL_CHAIN_REQUIRED` / `realChainHint`）、`docs/operations-runbook.md:117-170`

---

## QA Round 22 独立复验（task-93，2026-09-29）

> 原始输出：`docs/team/test-reports/raw/round-22/09-bug038-doc.txt`、`10-bug037.txt`。

**结论：已修复（P3 关闭），1 项受限**。

```text
$ sed -n '62,69p' docs/ArcBlog-nft-factory.md
* **真实链前置条件**（两级，都**不写任何东西**）：
  1. **三件套 = network + chainHost + tokenId**（REAL_CHAIN_REQUIRED）… 缺任一项 → exit 1 且 code: VALIDATION
  2. **依赖 + 钱包**：… 三件套齐了但这一级缺，才是 CHAIN_UNAVAILABLE
  > 实测（2026-09-28）：create --role studio --adapter ocap --chain-id 1 → {"ok":false,"code":"VALIDATION",
  >   "error":"--adapter ocap needs the chain triple (network/chainHost/tokenId): network is missing; …"}，exit 1、零写入。

$ env -u ARCBLOG_CHAIN_MNEMONIC ARCBLOG_CHAIN_ENV= node scripts/arcblog-factory.mjs create --role studio --adapter ocap
{"ok":false,"code":"VALIDATION","error":"--adapter ocap needs the chain triple (network/chainHost/tokenId):
 chainHost is missing; tokenId is missing. …"}   exit=1   ← 文档 D1 的失败码表述与实测一致（VALIDATION）

$ grep -c "chain-id 1" docs/ArcBlog-nft-factory.md        → 1
  （唯一命中在 §4「实测」证据句里，不是 §6 可照抄示例；§6 示例 = ARCBLOG_CHAIN_ENV=beta + 三件套显式覆盖注释，无 --chain-id 1）
$ grep -n "ABT" docs/ArcBlog-nft-factory.md               → 5 处（全为 "ABT Network beta" 网络名或 TBA/ABT 对照解释）
$ grep -c "TBA" docs/ArcBlog-nft-factory.md               → 5
$ grep -c "ABT" .aup/pages/ops/factory.aup .aup/locales/{en,zh}.json dist/.aup/pages/ops/factory.aup → 0 / 0 / 0 / 0
$ grep -n "4.1 " docs/ArcBlog-nft-factory.md              → :71 新增「§4.1 链环境口径：由环境决定，代码里只有预设、没有硬编码」（含 beta=TBA / main=ABT / 不一致 fail closed / 页面零链事实）
```

- B38-1 前置条件与实测一致：**通过**（两级前置，缺三件套 = `VALIDATION`，不是 `CHAIN_UNAVAILABLE`）。
- B38-2 §6 示例可照抄且 fail-closed：**通过（部分受限）** —— 示例完整；缺件态实跑 `VALIDATION` exit 1 零写入；**`CHAIN_UNAVAILABLE` 一级未跑** —— `.env.local` 含 `ARCBLOG_CHAIN_MNEMONIC`，在三件套齐的条件下跑 `--adapter ocap` 会真的建链上工厂（L-R22-2 红线），故不做。
- B38-3 代币符号事实对齐：**通过**（beta = TBA、main = ABT；`ABT` 5 处全为网络名/对照解释，无对 beta 的符号误写）。
- B38-4 页面口径一致 + 零回归：**通过**（页面侧 `ABT` 命中 0）。
- B38-5 写范围：**视为已授权** —— Dev 已修改该文件，本轮 Lead 任务书把 BUG-038 列为交付项；QA 看不到 `task-92` 任务书原文，故仅登记该事实。
- B38-6 文档门：**通过**（`npm test` 35/35；`chain-id 1` 只剩证据句 1 处）。
