# REQ-023 — 链环境变量化（唯一来源 = env 或 `config/roles.json`；`ARCBLOG_CHAIN_ENV` 只填默认值；缺三件套 fail-closed；页面/DSL 零具体链地址与代币符号）

| 字段 | 值 |
| ---- | -- |
| REQ 编号 | **REQ-023** |
| 对应 spec 章节 | **§9**「角色配置外部化」（地址/网络放记录里，绝不硬编码）；**§8.1–§8.5**（NFT Factory / 角色生命周期）；**§114–§115**（fail closed）；**§150**（不臆造 ARC API，先核验再写代码） |
| checklist 行 | 第 **61** 行「NFT 配置外部化」（§9，现 ✅，本 REQ 是它的**链侧延伸**：把链环境也变成外部输入）；第 **64** 行「NFT Factory（消费链上工厂）」（§8.1，现 ✅）——**本 REQ 不改状态列，只补能力与降级登记** |
| 优先级 | **P2**（可运营性 / 可移植性缺口：换链环境目前只能靠操作者记忆环境变量；且用户可见面出现硬编码代币符号 `ABT`——属**对外错误**，不等于会崩） |
| 提出轮次 | **Round 15**（精简轮；PM `task-62` 规划） |
| 负责角色 | **Dev（`task-58`）** 实现 ｜**QA（`task-63`）** 独立验证（`blocked_by` UI + Dev 批次）｜研究（`task-60`，[REQ-025](REQ-025-chain-and-factory-facts-research.md)）提供**只读事实**｜PM（`task-62` / `task-64`） |
| 状态 | ✅ **完成（Round 15，2026-09-28）**——Dev 交付 + QA-011 独立验证**放行**；结果见 §7（附 BUG-038 文档漂移 → R16） |
| 上游 | Lead 裁定 **L-R15-2**；[`docs/ArcBlog-nft-factory.md`](../../ArcBlog-nft-factory.md) §5/§6（真实链前置条件与 `ARCBLOG_CHAIN_*` 示例）；[`scripts/lib/chain.mjs`](../../../scripts/lib/chain.mjs)**:66-77**（`resolveChainOptions()`）；[`scripts/lib/roles.mjs`](../../../scripts/lib/roles.mjs)**:29 / :44-56 / :74**（`config/roles.json` 形态与 `chainVerification`）；[`scripts/arcblog-factory.mjs`](../../../scripts/arcblog-factory.mjs)**:163-165**（现状只校验 host+tokenId）；[REQ-017 §7.6](REQ-017-orders-and-ledger-ui.md)（口径先例）；[REQ-013](REQ-013-diagnostics-and-categories.md)（「只镜像真实能力 + 如实降级」先例） |
| 下游 | [journal/round-15.md](../journal/round-15.md)、`test-reports/round-15.md`（QA-011）、[backlog.md](../backlog.md)「本轮：Round 15」 |

> **一句话**：把「链环境」从**散落在多个 `ARCBLOG_CHAIN_*` 环境变量 + 操作者记忆**，收敛成**一条可解释的解析链**——`显式 ARCBLOG_CHAIN_* ＞ config/roles.json ＞ ARCBLOG_CHAIN_ENV=beta|main 的默认值`，**缺三件套即 fail-closed**（不产生任何链写入），并让**任何页面 / DSL 不再出现具体链地址或代币符号**（现状 `.aup/pages/ops/factory.aup:12,20` 与生成 locales 里硬编码了 `ABT`）。

---

## 1. 背景

### 1.1 现状事实（PM 本轮只读实测；不是推测）

```text
$ grep -rhoE "ARCBLOG_CHAIN_[A-Z_]+" scripts/ docs/ | sort -u
ARCBLOG_CHAIN_ADAPTER
ARCBLOG_CHAIN_FACTORY_OWNER
ARCBLOG_CHAIN_HOST
ARCBLOG_CHAIN_ID
ARCBLOG_CHAIN_INTENTS_PATH
ARCBLOG_CHAIN_MNEMONIC
ARCBLOG_CHAIN_NETWORK
ARCBLOG_CHAIN_TOKEN_DECIMALS
ARCBLOG_CHAIN_TOKEN_ID

$ grep -rn "ARCBLOG_CHAIN_ENV" scripts/            → NONE        ← 预设环境（beta|main）当前不存在
$ grep -n  "roles" scripts/lib/chain.mjs           → NONE        ← 链解析当前完全不读 config/roles.json
$ ls -la .env.local                                → 499 bytes（已 gitignore；本轮只读、不打印内容、不修改）

$ node -e "import('./scripts/lib/chain.mjs').then(m => console.log(JSON.stringify(m.resolveChainOptions(), null, 2)))"
{
  "adapter": "mock",
  "chainHost": "",
  "chainId": "",
  "network": "mock",
  "tokenId": "",
  "tokenDecimals": 18,
  "mnemonic": "",
  "factoryOwner": ""
}                                                   ← 链设置的单一解析点（键集合即现状事实）

$ ARCBLOG_CHAIN_ENV=beta ARCBLOG_CHAIN_HOST=probe.example node -e "…resolveChainOptions()…"
{"adapter":"mock","chainHost":"probe.example","chainId":"","network":"mock","tokenId":"",…}
                                                    ← ARCBLOG_CHAIN_ENV 被完全忽略；显式 env 生效
                                                    （探针只读、未写实例、未加锁）
```

- `docs/ArcBlog-nft-factory.md:66` 记的真实链前置条件是 **`ARCBLOG_CHAIN_HOST` / `ARCBLOG_CHAIN_TOKEN_ID` / `ARCBLOG_CHAIN_MNEMONIC`**（工厂主钱包助记词）；`:101-103` 给出 export 示例；`:115` 记 `.env.local` 存 `ARCBLOG_CHAIN_*`。
- 现状**显式校验只有两项**：`scripts/arcblog-factory.mjs:163-165` 在 `--adapter ocap` 下只要求 `tokenId` + `chainHost`。
- `config/roles.json`（`scripts/lib/roles.mjs:29`）已承载 `studio/hub` 的 `collectionAddress` / `network` / `lifecycle` + `chainVerification`（`:44-56` / `:74`）——**外部化的落点已经存在**，但链解析**没读它**。
- **用户可见面硬编码代币符号**：

```text
$ grep -rn "ABT" .aup/
.aup/pages/ops/factory.aup:12:    chain-token { en "Mint token (ABT)" zh "铸造代币（ABT）" }
.aup/pages/ops/factory.aup:20:    factory-stake { en "Stake per node (ABT)" zh "每个节点质押（ABT）" }
.aup/locales/en.json:132 / :149（生成产物）
.aup/locales/zh.json:132 / :149（生成产物）
$ grep -rnE "0x[0-9a-fA-F]{6,}" .aup/                → 0 命中（无具体链地址，保持）
```

### 1.2 为什么要做

1. **可移植性**：`beta` / `main`（或自建链）之间切换，现在靠操作者拼环境变量；一个拼错就是运行期失败或（更糟）打到错链。
2. **单一事实来源**：spec **§9** 的既定原则是「集合地址 / 网络放在记录里，绝不硬编码常量」；链环境是同一个原则的延伸。
3. **fail-closed（§114/§115）**：缺三件套时**必须**在**产生任何链写入之前**失败；现状只显式拦两项，其余靠 SDK 在更深层报错。
4. **对外正确性**：页面写死 `ABT` 在换链 / 换代币后就是**错误信息**；L-R15-2 明令「任何页面 / DSL 不得出现具体链地址或代币符号」。

---

## 2. 范围

### 2.1 做

1. **统一解析链（唯一来源）**：新增 / 收敛一个解析入口（现状落点 `scripts/lib/chain.mjs` 的 `resolveChainOptions()`，Dev 可依实测调整），优先级**必须是**：
   1. **显式 `ARCBLOG_CHAIN_*`**（以及既有 CLI flag，如 `--chain-host` / `--token-id`）→ 最高；
   2. **`config/roles.json`**（已存在的 `studio` / `hub` 的 `network` / `collectionAddress`；**只做只读回退**）→ 次之；
   3. **`ARCBLOG_CHAIN_ENV=beta|main` 提供的默认值** → 最低（**只填默认值，不覆盖显式值**）。
   非法 `ARCBLOG_CHAIN_ENV` 值（非 `beta` / `main`）→ **非零退出 + 结构化错误**（不得静默当 mock / main）。
2. **缺三件套 fail-closed**：进入真实链路径（`--adapter ocap`）前，**三件套**必须齐全；缺任一 → **非零退出 + 结构化错误 + 零链写入**（不得留下半成品 `config/` 记录）。
   - **三件套的精确键集合由 A0 探针写进回报**：现状实现只校验 `tokenId` + `chainHost`（`scripts/arcblog-factory.mjs:163-165`），文档记的是 `HOST` / `TOKEN_ID` / `MNEMONIC`（`docs/ArcBlog-nft-factory.md:66`）；**A0 必须给出「到底哪三项」的判定依据**，Dev 按判定实现，**不得含糊**。
   - **助记词 / 私钥只允许来自 env（`.env.local`）**：**绝不**写进 `config/roles.json`、任何 AFS 记录、任何页面 / DSL / 日志。
3. **页面 / DSL 去硬编码**：
   - `.aup/**`（含生成 locales）与 `dist/.aup/**` 中**具体链地址命中 = 0**、**代币符号（`ABT`）命中 = 0**；
   - `factory.chain-token` / `factory.factory-stake` 的文案改为**中性表述**或**取自记录 / 配置的真实值**（如 `summary.tokenId` 已有；符号若记录里没有 → 不要编，写中性词）；
   - **en/zh 成对**，通过 `arc dsl generate --check` 漂移门与死键门。
4. **不破坏 `--adapter mock` 旧语义**：mock 路径（无 env 时的默认）行为与输出**逐字不变**；`--now` 等既有约束不变。
5. **CLI 变更纪律**（见 §3 A7）：先写锁 → **定向单跑**受影响测试文件 → 删锁。

### 2.2 明确不做

- **不做真实链交易 / 不转账 / 不发交易**（本机无资金钱包、无链；L-R15-4 同精神）；**不接新链 SDK**、不改 `CHAIN_ADAPTERS` 集合（`mock` / `ocap` 不变）。
- **不改 spec**（§9 措辞由人类改）、**不改 checklist 状态列**、**不改 `blocklet.yaml`**、**不改 `world/**` 记录形态**（如需新增字段 → **停手上报**，PM 升级 Lead）。
- **不把助记词 / 私钥写进** AFS 记录、页面、DSL、测试快照、报告（`grep` 反证必须通过）。
- **不新增测试文件**（新文件默认 live，会破坏快层 28/28）；**不动 `FAST_TESTS`**；**不跑全量 `npm run test:live`**。
- **不重开**已闭环项（BUG-001…035 已修者、R14/R14F 的 O 批与 D 批）。

---

## 3. 验收标准（每条都是可执行命令或可观察行为）

### 3.0 门（每步跑；QA 独立重跑）

```bash
arc dsl validate --json          # "ok": true / "issues": []
npm test                         # tests 28 / pass 28 / fail 0
arc blocklet build               # 改了 .aup/** 必须 build
diff -r .aup dist/.aup           # 无输出（IDENTICAL）
node scripts/arcblog-console-nav.mjs --check   # {"ok":true,"action":"check","pages":21}
arc dsl generate --check         # Would generate 0 file(s) (dry-run) — nothing to change
```

### 3.1 A0 — 探针（先做；原始命令 + 原始输出必须贴回报）

- 命令（只读，不写实例）：
  ```bash
  node -e "import('./scripts/lib/chain.mjs').then(m => console.log(JSON.stringify(m.resolveChainOptions(), null, 2)))"
  ARCBLOG_CHAIN_ENV=beta node -e "import('./scripts/lib/chain.mjs').then(m => console.log(JSON.stringify(m.resolveChainOptions())))"
  ARCBLOG_CHAIN_ENV=bogus node -e "import('./scripts/lib/chain.mjs').then(m => console.log(JSON.stringify(m.resolveChainOptions())))"
  ```
- 必须产出：① 解析键集合；② **「三件套」的精确键**与判定依据（代码行 + 文档行）；③ 若 `config/roles.json` 存在，其**可提供的字段**（只读读取，不改）。
- **验收**：三组原始输出 + 判定结论；**不允许**只写结论不贴输出。

### 3.2 A1 — 预设只填默认值、显式覆盖（可执行）

- 断言：`ARCBLOG_CHAIN_ENV=beta`（不带其它 `ARCBLOG_CHAIN_*`）→ 解析结果 = beta 的**默认值集合**（与实现常量/文档一致，逐键列出）。
- 断言：`ARCBLOG_CHAIN_ENV=beta` **+** 显式 `ARCBLOG_CHAIN_HOST=<probe>` → `chainHost === "<probe>"`（显式优先，且其它键仍取 beta 默认值）。
- 断言：`ARCBLOG_CHAIN_ENV=bogus` → **非零退出** + 结构化错误（错误码 / 允许值集合），**不是**静默落到 `mock` 或 `main`。
- **验收**：三组命令的真实输出对照表。

### 3.3 A2 — 唯一来源与零硬编码

- 断言：解析链路的代码里**不再有**「链地址 / 网络 / 代币」字面常量（`grep -nE "https?://|0x[0-9a-fA-F]{6,}" scripts/lib/chain.mjs scripts/arcblog-factory.mjs scripts/arcblog-node-nft.mjs` → 只允许**注释 / 示例 URL / mock 生成器**命中，且逐条解释）。
- 断言：`config/roles.json` 的回退路径有**实测证据**（临时探针记录 → 断言解析取到记录里的 `network`/`collectionAddress` → **逐条清理、基线复原**；写实例前先 `docs/team/.gate-lock`）。
- 断言：`grep -rn "ARCBLOG_CHAIN_MNEMONIC\|mnemonic" .aup/ dist/.aup/ docs/team/test-reports/` **不含任何真实助记词**（只允许键名/说明）。
- **验收**：静态 grep 证据 + 回退路径实测（或如实写「受限未验证 + 原因」）。

### 3.4 A3 — 缺三件套 fail-closed

- 断言：在**依赖可用**的环境下，缺任一件套执行真实链路径（`--adapter ocap`）→ **非零退出** + 结构化错误（`VALIDATION` 或缺项错误，**以实测错误码为准**）+ **零链写入**（AFS 记录 / registry / mock-state 的 id 集合与调用前逐字一致）。
- **受限条件（必须如实登记）**：本机若无 `@ocap/*` 依赖 → 只会得到 `CHAIN_UNAVAILABLE`；此时**不得写成「fail-closed 已验证」**，只能写「受限未验证（缺依赖）+ 以 `resolveChainOptions()` 返回体与显式校验点（`scripts/arcblog-factory.mjs:163-165`）为静态证据」。
- **验收**：命令 + exit code + stderr/stdout 摘录；受限项逐条登记。

### 3.5 A4 — 页面 / DSL 零具体链地址与代币符号

- 断言：`grep -rn "ABT" .aup/ dist/.aup/` → **0 命中**。
- 断言：`grep -rnE "0x[0-9a-fA-F]{6,}" .aup/ dist/.aup/` → **0 命中**。
- 断言：`factory.chain-token` / `factory.factory-stake` 文案在 en/zh 下**中性或取自记录**（页面渲染值由 AFS 记录驱动；若记录为空 → 平台空值占位，**不得编造**）。
- 断言：`arc dsl generate --check` 无漂移、`npm test` 的死键门绿（i18n 键 en/zh 成对）。
- **验收**：两条 grep 的真实计数 + 页面运行期文案（浏览器或 `grep` 生成的 locales）+ 门输出。

### 3.6 A5 — mock 旧语义回归

- 断言：不带任何 `ARCBLOG_CHAIN_*` 时，`adapter` 仍为 `mock`、`network` 仍为 `mock`（与 §1.1 的 before 值**逐键相等**）。
- 断言：`node scripts/arcblog-factory.mjs spec --role studio` / `--role hub` 输出**逐字节不变**（`diff` 无输出），`node scripts/arcblog-node-nft.mjs status` 形状不变。
- **验收**：before/after 两组输出 + `diff` 结果。

### 3.7 A6 — 探针与实例卫生

- 写实例的探针（A2 的回退路径）**必须先写 `docs/team/.gate-lock`**（一行 `owner + 时间`），**逐条清理**，跑完**删锁**，并给出基线复原对比（相关集合 id 数量 / 内容）。
- **验收**：锁文件前后 `ls` 证据 + 清理后基线值。

### 3.8 A7 — CLI 变更纪律（`docs/team/README.md` **§6.1** 实例串行；本轮写者顺序见 **L-R15-5**）

```bash
# 1) 先落锁
echo "Dev(<task-58>) $(date -u +%FT%TZ)" >> docs/team/.gate-lock
# 2) 定向单跑（受影响的既有 live 文件；不跑全量）
npm run test:file -- scripts/arcblog-roles.test.mjs
npm run test:file -- scripts/arcblog-node-nft.test.mjs
npm run test:file -- scripts/arcblog-chain-worker.test.mjs
# 3) 跑完删锁
rm -f docs/team/.gate-lock
```

- **验收**：三份原始输出（pass/fail 计数）+ 锁的写入/删除证据；**未跑** `npm run test:live`（如实登记）。
- 若 Dev 判定需要动到其它 live 文件 → **在回报里逐一点名**并同样持锁串行。

### 3.9 A8 — 三类证据分开标注

**静态复核**（门 + grep + 代码行）/ **运行期实测**（`node -e` 解析输出、CLI 输出）/ **受限未验证**（真实链依赖、真实资金、真实 `ocap` 演练）——逐条标注，不得互相顶替。

---

## 4. 依赖

| 依赖 | 说明 |
| ---- | ---- |
| **Lead L-R15-2** | 本 REQ 的唯一口径来源（唯一来源 / 预设只填默认值 / 缺三件套 fail-closed / 页面 DSL 零硬编码） |
| **研究 `task-60`**（[REQ-025](REQ-025-chain-and-factory-facts-research.md)） | 提供**只读事实**：官方 URL + 仓库 `文件:行号`（`beta\|main` 的官方含义、链配置的官方入口、GLofter / 工厂字段清单）；**不阻塞**实现，但 §6「三件套」的判定应引用其结论 |
| [REQ-020](REQ-020-toolbar-content-spacing-public.md) / [REQ-020a](REQ-020a-console-spacing-model.md)（UI） | **写者串行**（L-R15-5）：UI 先做完 build/restart，Dev 再动手写 `dist/**` |
| QA `task-63` | `blocked_by` UI + Dev 批次定稿 |
| 外部条件 | `mock` 适配器可用（本机默认）；**真实链 / `ocap` 演练需外部环境** → 受限未验证；`.env.local` **只读不打印** |

---

## 5. 涉及写范围

| 类型 | 路径 | 说明 |
| ---- | ---- | ---- |
| 脚本 | `scripts/lib/chain.mjs`（解析入口）、`scripts/arcblog-factory.mjs`、`scripts/arcblog-node-nft.mjs`、`scripts/arcblog-chain-worker.mjs`（如链路需要） | **触及 CLI → `.gate-lock` + 定向单跑**（§3.8） |
| DSL | `.aup/pages/ops/factory.aup`（`chain-token` / `factory-stake` 文案与取值口径）± 其它出现代币符号的页面 | 具体链地址 / 代币符号清零（§3.5） |
| 生成 | `.aup/locales/**`（`arc dsl generate` 生成）、`dist/**`（`arc blocklet build`） | **不手改**生成物；**build 必须晚于自己最后一次写盘** |
| 临时 | `docs/team/.gate-lock` | 定向 live 期间；跑完删除 |
| **禁止** | `blocklet.yaml`、`world/**`、`.web/**`、`docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md`、`docs/team/**`（除 `.gate-lock` 临时行） | 越界即停并上报 |

---

## 6. 本轮口径（Lead **L-R15-2** 收窄；**不改写既有结论**）

1. **唯一来源 = env 或 `config/roles.json`**；除此之外**不得**有第三个来源（不得硬编码在源码 / 页面 / DSL）。
2. **`ARCBLOG_CHAIN_ENV=beta|main` 只填默认值**；**显式 `ARCBLOG_CHAIN_*` 覆盖它**（优先级写死：显式 env / flag ＞ `config/roles.json` ＞ 预设默认值）。
3. **缺三件套 fail-closed**：在产生任何链写入之前失败；**助记词 / 私钥只来自 env，绝不进记录 / 页面 / DSL / 日志**。
4. **任何页面 / DSL 不得出现具体链地址或代币符号**（现状 `ABT` 命中必须清零）。
5. **不做真实链交易**（L-R15-4 同精神）；`mock` 旧语义逐字不变。
6. **任何「已验证」必须附真实命令 + 真实输出**；做不到写「受限未验证 + 原因」。

> **注**：本节只记录 Lead 裁定对本 REQ 验收口径的收窄；`§1 背景` 与 `§3 验收标准` 的既有表述**不改写**（同 REQ-017 §7.6 做法）。

---

## 7. Round 15 结果记录（PM `task-64` 写回，2026-09-28）

> **结论：交付完成 · QA-011 独立验证放行**（[round-15.md](../test-reports/round-15.md) §3，`P0=0 / P1=0`）。Dev 交付物 = `scripts/lib/chain.mjs`（`CHAIN_PRESETS` + `resolveChainOptions` 解析优先级 + 三件套校验）、`scripts/arcblog-factory.mjs` / `scripts/arcblog-node-nft.mjs`（usage 与错误文案）、`.aup/pages/ops/factory.aup`（`chain-token` / `factory-stake` 中性文案）、`.aup/locales/{en,zh}.json`（生成）、`scripts/arcblog-node-nft.test.mjs`（**既有文件** +env 用例）、`docs/operations-runbook.md`「Chain environment」、`CLAUDE.md`、`dist/**`。

| 小节 | 内容 |
| ---- | ---- |
| 7.1 逐条验收结论（A0–A8） | **A0 通过**：`resolveChainOptions()` 键集合 8 个 = `adapter/chainHost/chainId/network/tokenId/tokenDecimals/mnemonic/factoryOwner`（QA 逐字贴出默认输出）。**A1 通过**：`ARCBLOG_CHAIN_ENV=beta` → `chainHost https://beta.abtnetwork.io/api/` / `chainId beta` / `tokenId z35n6UoHSi9MED4uaQy6ozFgKPaZj2UKrurBG`；`=main` → `main.abtnetwork.io` / `z35nNRvYxBoHitx9yZ5ATS88psfShzPPBLxYD`；`ARCBLOG_CHAIN_ENV=beta ARCBLOG_CHAIN_HOST=…` → **显式覆盖生效、其余仍取 beta 默认**；`ARCBLOG_CHAIN_ENV=bogus` → **exit 1 + `code:VALIDATION` + `must be one of: beta, main (got "bogus")`**（不静默落 mock/main）。**A2 通过（附口径偏差）**：`scripts/` 的 `beta\|main` host 命中 **4 处且全部在 `scripts/lib/chain.mjs`**（`:73`、`:74`、`:87` beta，`:94` main）—— **按设计必须持有预设默认值（L-R15-2）**，非硬编码缺陷；**判据 A4 的 `.aup/` + `dist/.aup/` 命中 = 0**（`ABT`=0、`0x…`=0、`mnemonic`=0），`world/` + `blocklet.yaml` = 0，`config/roles.json` 回退实测触发（`network:"arcblock"`）。**A3 通过**：无三件套 → exit 1 `VALIDATION`（逐项列缺）；有三件套无 `ARCBLOG_CHAIN_MNEMONIC` → exit 1 `CHAIN_UNAVAILABLE`（校验在任何网络调用之前，`chain.mjs:555`）；`ARCBLOG_CHAIN_ENV=beta` 与 `roles.json(network=arcblock)` 冲突 → exit 1 `VALIDATION` + 明确修法；**三次失败后 `node/factories.json` 的 `updatedAt 2026-09-27T08:34:45.557Z` 逐值不变 = 零链写入**。**A4 通过**：`?page=factory` en「Adapter ocap / Network beta / Mint token z35n…」、zh「适配器 ocap / 网络 beta / 铸造代币 z35n…」、`Stake per node 1`（无代币符号）；`.aup` + `dist/.aup` 的 `ABT` / `0x…` 均 0。**A5 通过**：`git archive HEAD scripts` 与当前仓 `factory spec --role studio/hub` **逐字节 IDENTICAL**、`node-nft status` 键集合与 `adapter/network = mock/mock` 不变。**A6 通过**：`.gate-lock` 落锁→删锁有前后证据；实例残渣 `clean --confirm` 清除 6 条、复查 `found 0`（基线复原）。**A7 通过**：定向 `test:file` = `scripts/arcblog-node-nft.test.mjs` **15/15**（57s，含新增 env 用例 `:151-219`/`:219-240`/`:245-253`/`:339-345`）+ `scripts/arcblog-roles.test.mjs` **18/18**（24.6s）；**未跑全量 live**。**A8 通过**：三类证据分开 |
| 7.2 三件套判定与解析优先级实测 | **三件套 = `network` + `chainHost` + `tokenId`**（实测错误文案逐字；`scripts/lib/chain.mjs:109` 附近）。**优先级实测**：显式 env/flag ＞ `config/roles.json` ＞ `ARCBLOG_CHAIN_ENV` 预设默认值；**预设只填默认值**（`adapter` 不属预设 → 不带 `--adapter ocap` 时 `ARCBLOG_CHAIN_ENV=beta` 仍 `adapter: mock`，方向安全不会误发交易）；**env 与记录冲突 fail-closed**。**注**：`config/roles.json` 被 `arcblog-roles.test.mjs` 套件 fixture 重写（`network:"arcblock"`）属**既有卫生缺口**（`arcblog-clean.mjs` 不覆盖）→ 已登记，不属本 REQ 回归 |
| 7.3 三类证据标注 | **浏览器实测** = A4（`?page=factory` en/zh 运行期文案，QA 单 tab）。**静态复核 + CLI/AFS** = A0/A1/A2/A3/A5/A6/A7 的真实命令与输出 + 门 6 条 + `git diff --name-only` 范围核对。**受限未验证** = 见 §7.5 |
| 7.4 遗留 / 降级登记 | ① **[BUG-038](../bugs/BUG-038-nft-factory-doc-chain-env-drift.md)（P3，文档漂移）**：`docs/ArcBlog-nft-factory.md:34/:66/:102-104/:112/:165/:200` 与三件套 / 代币符号口径不一致（beta 原生代币应为 **TBA**，官方 Understanding Tokens）→ **下一轮修（R16-6）**，该文件须加入写范围；② **真实链端到端（beta/main 预设打到真 host、`create`/`acquire`）**：L-R15-4 禁任何真实链交易 + 本机无资金钱包 → **受限未验证**（只验到 `VALIDATION` / `CHAIN_UNAVAILABLE` 的 fail-closed）；③ main 的 `tokenDecimals=18` 为推断（REQ-025 §7.5 U2）；④ `arcblog-factory.test.mjs` **不存在**（QA 任务书误派）→ factory 用例本在 `scripts/arcblog-node-nft.test.mjs`，已按真实文件名执行；⑤ **spec §9（配置外部化）无需修订候选**（本轮实现与 spec 同向） |
| 7.5 PM 轮末只读复核门 | 与 REQ-020 §7.5 同一批真实输出（validate issues `[]` / `npm test` 28/28 / console-nav pages 21 / generate 0 漂移 / `.aup`+`.web` 双向 diff IDENTICAL）；PM **未独立复跑 CLI 探针与浏览器**，上表数值来自 QA-011 独立执行 |
