# 待人类检查点（Lead 维护）

> 基线 `7489390` ｜ 2026-10-12 ｜ 用途：本清单只列**必须由人做/批准**的动作与**可直接复制的命令**；已完成项保留在末尾备查。
> 口径：`暂停并报人类` 的判定见 [`docs/07-团队与开发规范/04-交接·记录·提交.md` §6](../07-团队与开发规范/04-交接·记录·提交.md)。

## A. 需要**批准**才能执行（链写，beta + TBA，不需真资金）

**A1 · 节点自描述写入真链（`PRD-NET-02` 的真链半段）**
```bash
set -a; . ./.env.local; set +a          # mnemonic 等（勿外传）
node scripts/arcblog-node-nft.mjs describe --role studio --adapter ocap \
  --endpoint https://<本节点真实可达地址> [--region <r>] [--name <n>]
# 预期：updateAsset 成功 → status 的 onChain.data 三字段更新、owner/pk/stake 仍在；
#      再跑 node scripts/arcblog-network.mjs registry refresh --adapter ocap 应见 endpointSource="asset.data"
```
> ⚠️ 真链 `updateAsset` 的**替换语义本身未实测**（属 `P-3`/`U8` 邻域）：请先确认它清空 `data` 还是合并——若清空，命令会先用 read-merge-write 保住 mint 字段（实现已如此），但仍建议在 beta 上先跑一次并读回。

**A2 · NFT 转让（`PRD-ID-05` + 探针 `P-3`/`U8`）**
需要先接线（`ENG-06`，两处调用 `signTransferTx`→`sendTransferTx`，尚未实现），**批准后我会先接线再在 beta+TBA 上跑**：
预期判定：转后 `getAssetState.owner` = 买家；买家能 `stake`/`updateAsset`；记录 `getTx` 的 `gasUsed`/`fee`。

**A3 · 实例残留清理**（测试/探针产物，非产品数据）
```bash
node scripts/arcblog-clean.mjs            # 先 dry-run 看清单
node scripts/arcblog-clean.mjs --confirm  # 批准后执行
```
范围：`config/mock-chain-test-*`、`node/factories-test-*`、`node/reg-dbg*`、`config/mock-chain-dbg9-*`、
`audits/memory-list.audit.jsonl`（5 行测试审计，`clean` 目前扫不到该目录——若批准我会顺带把它纳入 cleaner）。
另：`drafts/` 有 3 个更早的 `hub-idx-test-*` 残留（pre-Round-2）。

## B. 需要**人在浏览器里做一次**（本机无钱包连接能力，自动化不了）

**B1 · 探针 `U6`（页面写入的署名落库形态）+ `DEF-20`（控制台发布是否等构）**
1. 浏览器打开 `http://arcblog.localhost:4939/.well-known/service/login` 完成登录（钱包/DID Connect）；
2. 进 `?page=compose`，随便写一篇（标题必填、正文一行即可），**保存/发布一次**；
3. 读回记录并回报：
```bash
arc afs exec /blocklets/arcblog/.actions/read --path /instance/app/arcblog/posts/<slug>.json
# 看 authorDid：应为 did:key:…（或 did:blocklet:…）——若为字面量 "$session.did" ⇒ U6 判定 B
arc afs exec /blocklets/arcblog/.actions/read --path /instance/app/arcblog/drafts/<slug>.json
# 控制台发布路径：看是否有 contentHash / contentSignature / version（DEF-20）
```

## B2 · 部署前置（新实例一次）
```bash
node scripts/arcblog-recipes.mjs install   # 幂等；check 验证
```
不装 ⇒ `?page=reader` / `?page=page-view` 会渲染**原始 JSON**（DEF-21/B14）；已装的实例无需重复。

## C. 待裁决（不阻塞，已按推荐默认继续）

| # | 事项 | 推荐默认（已按此执行） |
| :-: | --- | --- |
| C1 | 发现源（`_research/S9-01 §8`）：链上枚举 / agent 发布目录 / gossip | **链上枚举**（P-1/P-2 已实测可用，且 `PRD-NET-01` 已落地） |
| C2 | 记忆落点（`R5` A4/A8）：运营侧 vs 用户设备 | **运营侧 `<repo>/.arcblog/memory`**（已实现；负向判据"不落 AFS"已验） |
| C3 | `ask` 是否接线外部 LLM | **不接线**（现为运营侧接线点 `--llm`，未接模型；平台无 LLM 原语） |
| C4 | `?page=agents` 是否给可复制发布命令 | **给**（已给 build/show/ask；发布命令属 B3 平台边界，如需再加） |
| C5 | `U10`：`arc space sync` 远端端点 | **暂不提供**（该项停在"平台边界 + 未验证"，不阻塞主干） |
| C6 | 入口三文件 | **已事实同步 `CLAUDE.md` v1.1**（结构未重写；如你要重写请明示） |

## D. 已完成（备查，无需动作）

- `U19` 已关闭（自适应边界**显式声明** + 可判部分仍断言，`arcblog-theme.test.mjs` 3/3）
- 探针已关 7/10：`P-1` `P-2` `P-4` `U18` `U19` ✅；`U20` ❌判定 B（平台无 SSR meta）
- 台账：`已实现待验` 47 ｜ `未开工` 2（`CNT-02` 待 B1、`ID-05` 待 A2）｜ `开发中` 0 ｜ `平台边界` 7
