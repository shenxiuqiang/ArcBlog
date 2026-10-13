# 待人类检查点（Lead 维护）

> 基线 `0f86cb5` ｜ 2026-10-12 ｜ 用途：本清单只列**必须由人做/批准**的动作与**可直接复制的命令**。

> **人类已裁决（2026-10-12）**：**`E9` = A**、**批准 `C1`+`C2`**、其余按 Lead 推荐执行（`E7` 放可见文案、`E8` 不回填、`E10` = B 正式接受、`E11` = 甲 加常驻说明、`E12` = 乙 登记覆盖边界、`E13` = 甲 保留主题；`A1`/`A2`/`D1` 已批准）。落地进度见本文件底部「裁决执行记录」。
> 其余（`E7`/`E8`/`E10`/`E11`/`E12`/`E13`、`A1`/`A2`、`B` 登录、`D` 两项）**不阻塞完成判据**，但都会让产品更完整。
> **非人类可推进的工作已归零**：三门全绿（`arc dsl validate` / `npm test` 快层 / `npm run gate:docs`）、live 25/25、开放问题 0 行、全仓无 `TODO/FIXME`、发布产物 229 文件且逐项判定过。> 用法：**按 A → B → C → D 顺序走一遍即可**；每段末尾写"做完能闭环什么"。E 段是不阻塞的待裁决项，F 段是备查。
> 口径：`暂停并报人类` 的判定见 [`docs/07-团队与开发规范/04-交接·记录·提交.md` §6](../07-团队与开发规范/04-交接·记录·提交.md)。
> **行长豁免**：本目录是**工作台**（`docs/team/**`），不在任何卷门内 ⇒ 检查点行可以为"自足说明"而**超过**各卷的 800 字符/行约束（`E9` 就是这种行：三条路与代价写在同一行，便于一次性决定）。

**当前部署**：**按命令取，不照抄本行**——`arc blocklet instance list` 的最近一条即当前 deployment id（写这份清单时的最近一条是 `deploy-1791834351365-16db7m`，产物按 `ENG-38` 已收窄为 **229 文件**；本行曾写死一个旧 id 与 236 文件，2026-10-12 改为"取法为主、值为辅"）。

**验证用哪个 URL**：用本清单里的 **`http://arcblog.localhost:4939`**（本机 daemon 提供的站点面，部署脚本的三次存活检查打的就是它）。**不要**用 `http://arcblog.localhost/`（80 端口在本机**无监听**，实测 curl 退出码 000；部署脚本曾误打印该 URL，已修）。在 :4939 上控制台会出现 **2 条 “Refused to execute … (MIME text/html)”**——平台注入的 `aup-ssr`／`aup-inspect-bridge` 两资产在本模式下不由平台提供，**属平台侧噪音，不是本应用缺陷**（页面渲染与客户端 bundle 均正常）。**当前台账**（唯一出处 = [`docs/06-功能开发列表/01-功能台账.md`](../06-功能开发列表/01-功能台账.md)；下面四个数是**守卫核对过的**，见 `ENG-22`）：`已实现待验` **47** ｜ `未开工` **0** ｜ `开发中` **0**（`PRD-SET-02` 已按 **`E9` = A** 落地）｜ `平台边界` **9**；ENG 台账见 [`docs/06-功能开发列表/02`](../06-功能开发列表/02-工程与工具功能点.md)（**不在此处写死条数**——它按轮增长）。
**探针 10/10**（全部有结论）：`P-1`/`P-2`/`P-3`/`P-4` ✅ 判定；`U6`/`U8`/`U18`/`U19`/`U20` ✅ 判定；`U10` 决策型＝维持只读聚合。2026-10-13 由批准的链写批次收口：`P-3`+`U8` 真链跑通（tx `E956B85D…`，`ownerIsBuyer: true`）；`C1`（`describe`）**被链拒绝**（`Asset data value can only be updated in append only mode`）⇒ 见 `C` 段实测记录与新边界 `B24`。

**还剩哪些动作（索引；细节见对应段落）**

| 段 | 动作 | 谁做 | 做完闭环 |
| :-: | --- | --- | --- |
| **A1** | 删两篇"已发布且公开可见"的测试夹具（`posts/paid-test-*`、`posts/sign-test-*`） | 你确认后执行两条命令 | 首页 feed 只剩产品内容 |
| **A2** | 清测试/探针残留（`arcblog-clean.mjs --confirm`；数字以命令的 `found` 为准） | 你批准 | dry-run 归零 |
| **B** | **一次 DID 登录**，顺手看 6 项（草稿→发布、署名/hash 字段、5 个页面） | 你（本机无钱包，自动化不了） | `DEF-20`/`DEF-22`/`PRD-OPS-07`/`PRD-OPS-01` 的渲染验收 + `U6`/`CNT-02` 现状确认 |
| **C** | **链写批准**：`describe` 与 `transfer --confirm`（`P-3`+`U8` 同一次执行收口） | ✅ **已批准（2026-10-12）** | 探针 8/10 → **10/10** |
| **D** | **环境/运维拍板**：`arc space repair --index`（`DEF-30`）与 scope 目录是否加密 | 你决定（会动整个 ARC 安装） | 索引不再静默漏记录 |
| **E7** | `DEF-27`：首页封面瓦片"空链接"如何修（两个候选都改交互/视觉） | 你选 | 首页无障碍项闭环 |
| **E9** | `DEF-37`：`node/profile.json` 身份字段归谁写 → **回一句 A / B / C** | 你选 | **`PRD-SET-02` 从 `开发中` 落定 ⇒ 台账 0 开发中** |
| **E10** | `DEF-38`：UI 预算债（`docs/04 §2.7.2`）→ 删并分区达标（A）或正式接受（B） | 你选 | 预算债口径定案（棘轮已在防变差） |

> 以上均**不需要**你在终端里跑长命令：A1/A2/C/D 的命令都已写好可直接复制；B/E 只需你登录看一眼或回一个字母。

---

## A · 先做（访客可见，30 秒）

**A1 · 删掉两篇"已发布且公开可见"的测试夹具**（`DEF-32`；它们出现在首页 feed）

```bash
arc afs exec /blocklets/arcblog/.actions/delete --path /instance/app/arcblog/posts/paid-test-1790472790603.json
arc afs exec /blocklets/arcblog/.actions/delete --path /instance/app/arcblog/posts/sign-test-1790502598928.json
```

> ⚠️ `arcblog-clean.mjs` **有意不扫 `posts/`**（"published content is never test residue"）⇒ 只能由你确认后删。
> 闭环：首页 feed 只剩 `hello-arcblog`；来宾读不到测试内容。

**A2 · 清测试/探针残留**（非产品数据；`clean` 默认 dry-run）

```bash
node scripts/arcblog-clean.mjs            # 先看清单
node scripts/arcblog-clean.mjs --confirm  # 批准后执行
```

> **数字以命令为准**：`node scripts/arcblog-clean.mjs` 的 `found` 字段（**每次跑 live 套件都会增长**：2026-10-12 实测 **46**，上一版清单写 29，差值全部来自后续的 live 全量复跑）。
> 构成：`config/signing-keys`（合成签名密钥，`BUG-075` 已修 ⇒ 不再新增）· `node`（`reg-repro-*`/`reg-dbg*`/`factories-dbg*`）· `drafts`（各套件留下的 `*-test-*` 草稿）。
> ⚠️ `--confirm` 一次清掉全部（**不碰 `posts/`**）；草稿数随测试继续增长属预期，不是缺陷。
> 另需你决定的两项**不在 cleaner 扫描面**：`drafts/` 的 3 个 `hub-idx-test-*`（pre-Round-2）；`config/nft-factories.json` 里陈旧的 `hub` 工厂记录（投影层已不再输出，见 `DEF-13`）。
> 闭环：`arcblog-clean` dry-run 归零。

---

## B · 一次登录，解锁 6 项（本机无钱包，自动化不了）

1. 浏览器打开 `http://arcblog.localhost:4939/.well-known/service/login` 完成登录（DID Wallet 扫码 / DID Connect）。
2. 进 `?page=compose` 写一篇（标题必填、正文一行即可）**保存为草稿**，再到 `?page=posts` 的草稿页签点一次 **Publish**。
3. 读回两条记录并回报：

```bash
arc afs exec /blocklets/arcblog/.actions/read --path /instance/app/arcblog/drafts/<slug>.json
arc afs exec /blocklets/arcblog/.actions/read --path /instance/app/arcblog/posts/<slug>.json
```

4. 看字段，**一次收口 3 项**：
   - **`authorDid`** = 真 DID（`did:key:…`/`did:blocklet:…`）？若是字面量 `"$session.did"` ⇒ **探针 `U6` 判定 B**，且 **`PRD-CNT-02` 的缺口被证实**（该行判据正是"页面写入不得落字面量"）
   - **`contentHash` / `contentSignature` / `version`**：控制台发布若缺 ⇒ **`DEF-20` 成立**（与 CLI 发布不等构）
   - **`PRD-CNT-02`（已离线定案，**不需要你做实验了**）**：运行时**只在文本节点**解析 `$session.*`，`args` 词表只有 `${args.<输入名>}`/`${input.*}` ⇒ 页面提交**必然**写字面量（证据 [`arc-contracts §62`](../05-开发文档/附件/arc-contracts.md)）。**剩下的只是产品决定**：要不要让 worker/CLI **回填**页面写入的署名（见 E8）
5. 顺手看**五个**页面（登录态、直连 URL 首次打开即可，**不必刷新**）：
   - `?page=registry`：应有「我是否在这个注册表里？」一句（与 `node scripts/arcblog-network.mjs registry show` 的 `ownState`/`ownNote` 一致）
   - `?page=operations`：健康/发现/注册表三块应有真实值
   - `?page=factory`：链事实 + marker 文案（`hasChain`/`stateNote`/`nodeNote`…）
   - `?page=general`：站点名/语言/时区/角色配置应有值
   - **`?page=dashboard`（新增：异常区，`PRD-OPS-01`/`DEF-36`，2026-10-12 落地）**：应看到一行**常驻**状态句（`Anomaly zone: …`）+ 每条异常一行（含 `severity`/标题/说明）且**可点击**跳转。今日实测该句为 **`0 blocking / 2 warning`**、两行 = `registry` + `residue`（与 `node scripts/arcblog-anomalies.mjs show` 一致）。若你看到空列表而**没有**状态句 ⇒ 记缺陷；若已消除残留后重跑 `refresh`，应变成 `all four checks passed`
   > 这五项即 **`DEF-22` 剩余面 + `PRD-OPS-07` + `PRD-OPS-01` 的渲染验收**。把截图或 innerText 摘要发回即可。

**B2 · 部署前置（新实例只需一次）**

```bash
node scripts/arcblog-recipes.mjs install   # 幂等；check 验证
```

> 不装 ⇒ **绑定路径页**（`/posts/<slug>`、`/pages/<slug>`、`/preview/<slug>`）会渲染**原始 JSON**（`DEF-21`/B14）；`?page=reader` 类则显示 `⚠ Surface: set src (url)` 告警。

---

## C · 链写批准（beta + TBA，**不需真资金**）

> 三条命令都会**真实改链上状态**。`--adapter ocap` 的接线已完成且 fail-closed；`--enable` 之前请确认 `value:"0"`/`data` 语义（见 C2 的警告）。

**C1 · 节点自描述写入真链**（`PRD-NET-02` 真链半段）

```bash
node scripts/arcblog-node-nft.mjs describe --role studio --adapter ocap \
  --endpoint https://<本节点真实可达地址> [--region <r>] [--name <n>]
# 预期：updateAsset 成功 → status 的 onChain.data 三字段更新、owner/pk/stake 仍在
node scripts/arcblog-network.mjs registry refresh --adapter ocap   # 应见 endpointSource="asset.data"
```

> ⚠️ 真链 `updateAsset` 的**替换语义本身未实测**（`P-3`/`U8` 邻域）：实现已用 read-merge-write 保住 mint 字段，仍建议先跑一次并读回。

**C2 · NFT 转让一次**（`PRD-ID-05` + 探针 `P-3`/`U8`；**接线已就绪**：两适配器 `transfer()`，mock 端到端已验 owner=买家）

```bash
node scripts/arcblog-node-nft.mjs transfer --role studio --adapter ocap \
  --to <买家 did|address> --confirm
```

> ⚠️ 三个**没有先例**的点会被这次真实执行检验：① `value:"0"` 是否被 beta 接受 ② tx 级 `data`（`{typeUrl:"json",value:"empty"}`）是否会被链当作资产 data 覆盖 ③ gas/fee（`U8`）。失败时的备选形状写在 [`05/07` 的 `P-3` 行](../05-开发文档/07-未决技术问题与探针计划.md)（`TransferV2Tx` + `tokens: []`）。
> 预期判定：转后 `owner` = 买家、买家可继续 `stake`/`describe`、记录 `gasUsed`/`fee`。

> 注：`.env.local` 现由**所有**链 CLI 自动加载（`DEF-29`），无需再手工 `source`。

**C 段执行记录（2026-10-13，人类已批准 C1+C2）**

| 步 | 结果 | 证据 |
| :-: | --- | --- |
| **C1** `describe` | ❌ **被链拒绝** ⇒ 新边界 **`B24`** | `GraphQLError: Asset data value can only be updated in append only mode`；`UpdateAssetTx` 无 append 参数、`@ocap/client`/`@arcblock` 全量无 `appendOnly` ⇒ 本链型下 `asset.data` **不可更新**；降级 = 端点来源走 `endpointSource=stake.message`（已实现） |
| **C2** `transfer` | ✅ **成功**（探针 `P-3`+`U8` 收口 ⇒ **10/10**） | tx `E956B85DA22DA78DBC2B6C9FA033EFE07E6C6D0A524097D5A2B3DD86826E6D8B`；`verifiedOwner` = 买家 `z1a6f8fb…`、`ownerIsBuyer: true`；`value:"0"` 与交易级 `data` 均被接受；**fee ≈ 0.0020473 TBA**（链原文） |
| 顺带修的两个真缺陷 | ✅ 已修（`DEF-40`/`DEF-41`） | ① 三个链 CLI（含主命令 `arcblog-node-nft.mjs`）**未加载 `.env.local`** ⇒ 文档化命令报假的"缺 chainHost"；② ocap `updateAsset` **未按 SDK `Any` 编码** |

⚠️ **唯一遗留的人类一步（C3）**：本次转让把本实例的 studio NFT 交给了**测试买家** `z1a6f8fbFfpBr4ADGwGia66GMsGh3HVZf5z`，而该地址**没有 TBA**，所以"转回原 owner"这笔交易付不出手续费（链报 `expected 0.0020473 TBA, got 0 TBA`）。
复原只需两步（助记词已在 gitignored 的 `.arcblog/test-buyer-wallet.json`，**不打印**）：

```bash
# 1) 用 beta faucet 给买家地址充一点 TBA（约 0.01 够用）
#    地址：z1a6f8fbFfpBr4ADGwGia66GMsGh3HVZf5z
# 2) 以买家身份转回原 owner（Lead 可代跑；命令如下）
ARCBLOG_CHAIN_MNEMONIC="$(python3 -c "import json;print(json.load(open('.arcblog/test-buyer-wallet.json'))['mnemonic'])")" \
  node scripts/arcblog-node-nft.mjs transfer --role studio --adapter ocap --to z1WmC5oi8gp16gkN78qB37pzeUqVDCC398a --confirm
```
> 在此之前，`?page=factory` 会显示 owner = 测试买家（**如实状态**，不是缺陷）。

---

## D · 环境/运维（需你拍板，agent 不擅自做）

**D1 · DID Space 索引过期**（`DEF-30`；`arcblog-doctor` 的 `space-layout` 报 warn）

```bash
arc space check            # 只读审计：输出 drifted 空间清单（含 /blocklets 条目；条数每次读它，别引用本文）
arc space repair --index   # 平台给出的修法（重建索引以匹配磁盘）
```

> ⚠️ 它修的是**整个 ARC 安装**的索引（含 `/blocklets`，不只 ArcBlog）⇒ 请在确认无其他项目在跑时执行。
> 产品后果：本平台 `afs-list` 的过滤**走索引**，索引过期会让"按条件查"**静默漏记录**（`DEF-31` 已在 CLI 侧加兜底，但根因在此）。

**D2 · scope 目录明文**（同上 doctor 的 `de-identification` warn）

> `AFS_DID_SPACE_SCOPE_SECRET` 未设 ⇒ scope 目录是明文。设它会改变存储方式（可能影响既有数据可读性）⇒ 是否启用、何时启用由你定。

---

## E · 待裁决（不阻塞，已按推荐默认执行）

| # | 事项 | 推荐默认（已按此执行） |
| :-: | --- | --- |
| E1 | 发现源：链上枚举 / agent 发布目录 / gossip | **链上枚举**（`P-1`/`P-2` 实测可用，`PRD-NET-01` 已落地） |
| E2 | 记忆落点：运营侧 vs 用户设备 | **运营侧 `<repo>/.arcblog/memory`**（已实现；"不落 AFS"负向判据已验） |
| E3 | `ask` 是否接线外部 LLM | **不接线**（保留 `--llm` 接线点；平台无 LLM 原语） |
| E4 | `?page=agents` 是否给可复制发布命令 | **给**（已给 build/show/ask） |
| E5 | `U10`：`arc space sync` 远端端点 | **暂不提供**（停在"平台边界 + 未验证"，不阻塞主干） |
| E6 | 入口三文件是否重写 | **已事实同步 `CLAUDE.md` v1.1**（结构未重写；要重写请明示） |
| E7 | `DEF-27`：首页封面瓦片"空链接"如何修 | 两条候选都改交互/视觉（去 `href` 变装饰图 / 放可见文案）⇒ **等你选** | ✅ **已裁（2026-10-13）：放可见文案** —— 封面瓦片现在把文章标题渲染在封面上，链接有可访问名称（`DEF-27` 已修，待一次页面核验）。
| E8 | `CNT-02`：页面写入的署名（平台不插值 `$session.*`） | **现状 = 页面写占位、署名靠 CLI**（`arcblog-lifecycle publish`）；可选：加 worker/CLI **回填**页面写入的记录（产品口径变更）⇒ **等你定** | ✅ **已裁（2026-10-13）：不回填** —— 保持"页面写占位、可信署名走 CLI"（回填需 worker + 产品口径变更，收益小）。
| E9 | `DEF-37`：`node/profile.json` 的身份字段（`name`/`description`/`ogImage`/`endpoint`）**归谁写** ｜ **Lead 现场核对（2026-10-12）**：今天**唯一的页面写入口** = `?page=seo` 的四个 input（[`.aup/pages/site/seo.aup:119-124`](../../.aup/pages/site/seo.aup)）；`?page=general` **并不写** `node/profile.json`（只描述"角色由 CLI 派生"）；CLI 侧 = `node scripts/arcblog-node.mjs init|set`。**全仓没有任何 seo 自己的记录**（无 `config/seo.json`、无对应 `world/` schema）。**三条路，代价已量**：**(A) 推荐**：seo 改存自己的分发记录（需新增 `world/seo.yaml` + `config/seo.json` + 页面写入改造），身份字段在 seo 页**只读展示 + 指向 CLI**（`arcblog-node.mjs set`）——改动最大，但"谁写什么"一句话说清，且 `?page=seo` 与 `?page=general` 不再争同一份记录；**(B) 最省**：删掉那四个 input（身份只由 CLI 改），seo 页变成纯只读——改动最小，代价是"改站点名必须开终端"；**(C) 维持现状**：两处都能写 `node/profile.json`，只在 [`.aup/pages/site/seo.aup`](../../.aup/pages/site/seo.aup) 加一行说明——零代码改动，但 `DEF-37` 保持开放、`PRD-SET-02` 无法从 `开发中` 落定。**验收（任选其一都要过）**：`arc dsl validate` `[]` + `npm test` 快层全绿 + `node scripts/arcblog-doctor.mjs`（`node-profile` 契约行）+ 登录态看一眼 `?page=seo`；**(A)/(B) 若动 `.aup` 须 `npm run build` 并重新部署**。**请回一句：A / B / C。** 你点头后 Lead 当轮落地并把它从 `开发中` 翻成 `已实现待验` |
| E10 | `DEF-38`：`docs/04 §2.7.2` 的 UI 预算债（**10/18 控制台页**超标，`general` 需 i18n 90→25、styles 38→8、cards 5→2）| **两条路，选一**：**(A) 删/并控制台分区或压缩文案达标**（要动产品结构与界面，须你点头；`?page=general` 等页会明显改观）；**(B) 正式接受该债**，明确 `--strict` 永不作门，仅保留棘轮防"变差"。现状：棘轮实测 `regressions vs baseline: 0` ⇒ 债**未增长** | ✅ **已裁（2026-10-13）：B —— 正式接受该债**，棘轮继续防变差；同轮因 `E9`=A 对 `seo` 页做了一次披露式基线重录。
| E11 | `DEF-20`：控制台 Publish 的**可信署名**（页面无哈希/签名原语 ⇒ `B22`；事实已定，不需再"实测发现"）| **(甲) 推荐**：保留 Publish，页面加常驻说明"未签名——可信署名走 CLI"（`P8`+`P12` 都已裁决，改动＝一行文案）；**(乙)** Publish 降级为"仅存草稿 + 提示"。**请回一句 甲/乙**；B 段登录后只需**确认**文案即可 | ✅ **已裁（2026-10-13）：甲 —— 保留 Publish + 常驻说明**（说明并入 `?page=posts` 的 `desc`，零预算回归）。
| E12 | `DEF-26` 残留：**列表页（index 等）是否需要 `h1`**——`docs/04` 的 V 系列**无标题层级条款**（可访问性轴上唯一的无主残留）| **(甲) 加一条规范条款**（如"每个页面恰有一个可判定的标题层级：内容页 1 个 `h1`；控制台页以页头标题为唯一 `h1`"）**并修页**（index 等需补一个 `h1`，可能要用平台可用的隐藏写法——`arc-contracts §61` 记载"视觉隐藏样式不可用"，需先验证）；**(乙) 明确不要求**，把"列表页无 h1"登记为**覆盖边界**并写进 `docs/04`。**请回一句 甲/乙** | ✅ **已裁（2026-10-13）：乙 —— 明确不要求列表页 `h1`**，登记为覆盖边界（`DEF-26` 行）。
| E13 | `.web/themes/{organic,mono}`（**20 文件／88 KB**）是否随包发布 | **实测无使用证据**：`default`（24 个特征值出现在 SSR HTML）与 `editorial`（字体出现在字体链接）**确证在用**；`organic`／`mono` 无。**(甲) 保留**（可能是平台受支持的主题选择面，88 KB 不值得冒险）；**(乙) 移除**（若确认本仓不再支持切换主题）。**请回一句 甲/乙** | ✅ **已裁（2026-10-13）：甲 —— 保留 `.web/themes/{organic,mono}`**（88 KB 不值得冒险）。

---

## F · 已完成（备查，无需动作）

- **探针 8/10 已有结论**：`P-1` `P-2` `P-4` `U18` `U19` ✅；`U20` ❌ 判定 B（平台无 SSR meta）；`U6` ❌ 判定 B（`$session.*` 只在文本节点解析，离线定案 §62）；`U10` **决策型结论**＝维持只读聚合（E5，机制未验证）
- **仅剩 `P-3` + `U8`**（同一次链写批准即可一并收口，C2）
- **ENG 台账**：见 [`docs/06-功能开发列表/02`](../06-功能开发列表/02-工程与工具功能点.md)（含 `ENG-06` 转让接线：mock 端到端已验、真链待 C2）——**不在此处写死条数**
- **缺陷台账**：见 [`docs/06-功能开发列表/03`](../06-功能开发列表/03-缺陷与待修.md)（**不在此处写死条数**）；仍待人处理的：`DEF-20`（B 段）、`DEF-25`/`DEF-26` 部分 + `DEF-27`（E 段）、`DEF-30`（D 段）、`DEF-32`（A 段）
- **每轮门全绿**：`arc dsl validate` `issues:[]` + `npm test` 快层（`FAST_TESTS` 项数 = **32**、~1.5s）+ 六个文档卷门
