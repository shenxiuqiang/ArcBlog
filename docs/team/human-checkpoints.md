# 待人类检查点（Lead 维护）

> 基线 `0f86cb5` ｜ 2026-10-12 ｜ 用途：本清单只列**必须由人做/批准**的动作与**可直接复制的命令**。
> 用法：**按 A → B → C → D 顺序走一遍即可**；每段末尾写"做完能闭环什么"。E 段是不阻塞的待裁决项，F 段是备查。
> 口径：`暂停并报人类` 的判定见 [`docs/07-团队与开发规范/04-交接·记录·提交.md` §6](../07-团队与开发规范/04-交接·记录·提交.md)。

**当前部署**：`deploy-1791824269534-hrggxl`（2026-10-12T16:57Z 实测）。取法 = `arc blocklet instance list` 的 `latest:` —— **每次部署都会变，以命令为准**；若你看到旧界面，先让 Lead 重新部署再验证。
**当前台账**（唯一出处 = [`docs/06-功能开发列表/01-功能台账.md`](../06-功能开发列表/01-功能台账.md)；下面四个数是**守卫核对过的**，见 `ENG-22`）：`已实现待验` **46** ｜ `未开工` **0** ｜ `开发中` **1**（`PRD-SET-02`，**等 E9 裁决**）｜ `平台边界` **9**；ENG 台账见 [`docs/06-功能开发列表/02`](../06-功能开发列表/02-工程与工具功能点.md)（**不在此处写死条数**——它按轮增长）。
**探针**：**10 项中 8 项已有结论**（`P-1` `P-2` `P-4` `U18` `U19` ✅ 判定；`U20`/`U6` ❌ 判定 B；`U10` 决策型＝维持只读聚合 ⇒ 7 判定 + 1 决策 = 8），**仅剩 `P-3`+`U8`**（C2 一次链写批准即可收口）。

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
| E7 | `DEF-27`：首页封面瓦片"空链接"如何修 | 两条候选都改交互/视觉（去 `href` 变装饰图 / 放可见文案）⇒ **等你选** |
| E9 | `DEF-37`：`node/profile.json`（`name`/`description`/`ogImage`/`endpoint`）**归谁写** | **依据指向同一方向**：`docs/02/07-SET` 的判定式 = "`?page=seo` **不再**写 `node/profile.json` 的身份字段"；`docs/03/01` 的页面族 = `seo`「站点级分发元数据」、`general`「**实例身份**」。**推荐**：`?page=seo` 改写自己的分发记录（如 `config/seo.json`，其字段受 `B19` 约束**无法注入源码**、属声明性数据），身份字段改为**只读展示**并指向 `?page=general`；`node/profile.json` 的写入口收敛为 general/CLI。⚠️ 这会**改动 `?page=seo` 的交互**（去掉身份字段的保存）⇒ 按铁律 8"产品口径追认"**等你点头**（或指定另两条候选之一：CLI 唯一 / 字段迁独立记录） |
| E8 | `CNT-02`：页面写入的署名（平台不插值 `$session.*`） | **现状 = 页面写占位、署名靠 CLI**（`arcblog-lifecycle publish`）；可选：加 worker/CLI **回填**页面写入的记录（产品口径变更）⇒ **等你定** |

---

## F · 已完成（备查，无需动作）

- **探针 8/10 已有结论**：`P-1` `P-2` `P-4` `U18` `U19` ✅；`U20` ❌ 判定 B（平台无 SSR meta）；`U6` ❌ 判定 B（`$session.*` 只在文本节点解析，离线定案 §62）；`U10` **决策型结论**＝维持只读聚合（E5，机制未验证）
- **仅剩 `P-3` + `U8`**（同一次链写批准即可一并收口，C2）
- **ENG 台账**：见 [`docs/06-功能开发列表/02`](../06-功能开发列表/02-工程与工具功能点.md)（含 `ENG-06` 转让接线：mock 端到端已验、真链待 C2）——**不在此处写死条数**
- **缺陷台账**：见 [`docs/06-功能开发列表/03`](../06-功能开发列表/03-缺陷与待修.md)（**不在此处写死条数**）；仍待人处理的：`DEF-20`（B 段）、`DEF-25`/`DEF-26` 部分 + `DEF-27`（E 段）、`DEF-30`（D 段）、`DEF-32`（A 段）
- **每轮门全绿**：`arc dsl validate` `issues:[]` + `npm test` 快层（`FAST_TESTS` 项数 = **29**、~1.5s）+ 六个文档卷门
