# 待人类检查点（Lead 维护）

> 基线 `0f86cb5` ｜ 2026-10-12 ｜ 用途：本清单只列**必须由人做/批准**的动作与**可直接复制的命令**。
> 用法：**按 A → B → C → D 顺序走一遍即可**；每段末尾写"做完能闭环什么"。E 段是不阻塞的待裁决项，F 段是备查。
> 口径：`暂停并报人类` 的判定见 [`docs/07-团队与开发规范/04-交接·记录·提交.md` §6](../07-团队与开发规范/04-交接·记录·提交.md)。

**当前部署**：`deploy-1791817465810-nrnbgx`（与工作区逐字节一致）。若你看到旧界面，先让 Lead 重新部署再验证。
**当前台账**：PRD `已实现待验` **44** ｜ `未开工` **1**（仅 `CNT-02`，卡 B 段）｜ `开发中` **0** ｜ `平台边界` **7**；ENG **20/20 已实现待验**。
**探针**：11 项中 **7 项已结论**（`P-1` `P-2` `P-4` `U18` `U19` ✅；`U20` ❌ 判定 B），剩 `P-3`/`U8`（C 段）、`U6`（B 段）、`U10`（E 段）。

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

> 现有 **9 条**：3 条合成签名密钥（`did:key:zHuman*`，`BUG-075` 已修 ⇒ 不再新增）+ 6 条 `node/` 临时探针记录（`reg-repro-*`×3、`reg-dbg*`×2、`factories-dbg*`×1，是 2026-10-12 调查注册表时写进去的）。
> 另需你决定的两项**不在 cleaner 扫描面**：`drafts/` 的 3 个 `hub-idx-test-*`（pre-Round-2）；`config/nft-factories.json` 里陈旧的 `hub` 工厂记录（投影层已不再输出，见 `DEF-13`）。
> 闭环：`arcblog-clean` dry-run 归零。

---

## B · 一次登录，解锁 5 项（本机无钱包，自动化不了）

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
   - **`PRD-CNT-02` 的候选修法**：把署名从 `exec` 的 `content` 挪到 **`args` 模板**（`args` 是否插值**从未实测**）——若这条能出真 DID，`CNT-02` 与 `U6` 一并闭环
5. 顺手看四个页面（登录态、直连 URL 首次打开即可，**不必刷新**）：
   - `?page=registry`：应有「我是否在这个注册表里？」一句（与 `node scripts/arcblog-network.mjs registry show` 的 `ownState`/`ownNote` 一致）
   - `?page=operations`：健康/发现/注册表三块应有真实值
   - `?page=factory`：链事实 + marker 文案（`hasChain`/`stateNote`/`nodeNote`…）
   - `?page=general`：站点名/语言/时区/角色配置应有值
   > 这四项即 **`DEF-22` 剩余面 + `PRD-OPS-07` 的渲染验收**。把截图或 innerText 摘要发回即可。

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
arc space check            # 只读审计：2/6 空间 drifted（含 /blocklets 条目）
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

---

## F · 已完成（备查，无需动作）

- **探针 7/11 已结论**：`P-1` `P-2` `P-4` `U18` `U19` ✅；`U20` ❌ 判定 B（平台无 SSR meta）
- **ENG 20/20 已实现待验**（含 `ENG-06` 转让接线：mock 端到端已验、真链待 C2）
- **缺陷台账 32 条 → 25 条已闭**；其余：`DEF-20`（B 段）、`DEF-25`/`DEF-26` 部分 + `DEF-27`（E 段）、`DEF-30`（D 段）、`DEF-32`（A 段）
- **每轮门全绿**：`arc dsl validate` `issues:[]` + `npm test` 快层（20 文件、~1.0s）+ 六个文档卷门
