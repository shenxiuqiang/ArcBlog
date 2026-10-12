# Stage 5 入口口径（Lead 预裁 · Stage 4 定稿后生效）

| 字段 | 值 |
| --- | --- |
| 状态 | **预裁**（Stage 4 定稿前不执行） |
| 版本 | v1.0 ｜ 2026-10-01 ｜ Lead |
| 上游 | **已冻结** [`docs/01-产品概念/`](../01-产品概念/)（五篇）｜[`docs/02-产品需求/`](../02-产品需求/)（**56 条**，记录 [`S2-定稿核验-Lead.md`](reviews/S2-定稿核验-Lead.md)）｜[`docs/03-产品设计/`](../03-产品设计/)（六篇 + 落点总账） |

---

## 1. 本阶段的三件硬任务

1. **平台边界唯一出处**：`docs/05-开发文档/02`（+ `02a` 禁止与降级）——每个【平台边界】项在此成条，并给**降级路径**；
2. **未决与探针唯一出处**：`07-未决技术问题与探针计划` —— 把散在概念/需求里的探针**收拢编号**（P-1…P-4、U6/U8/U10…），每项给**步骤 + 判定式 + 阻塞对象**；
3. **架构与数据面**：`00-架构总览` / `01-数据模型与存储` —— 反映"**节点发现基于链上注册表**"这一口径。

## 2. 必须写进平台边界的**新增条**（Lead 已核实，逐条给证据）

| # | 事实 | 证据 | 降级/说明 |
| :-: | --- | --- | --- |
| B1 | **根级自定义 HTTP 端点不可用**（被应用壳吞掉） | 能力 #49 的**事实句** | 一律走 `/p/` 路径 |
| B2 | **RSS 平台不自动生成**，须生成到**仓库根** `.web-cache/rss.xml` | 实测原始证据 `docs/05-开发文档/附件/arc-contracts.md:448-454` | `node scripts/arcblog-rss.mjs` 前置；界面**不得**声称已就绪 |
| B3 | **发布只能在应用之外**（AUP 应用无运行时依赖） | 概念 `03 §J4` | 页面给**可复制的运营侧命令** |
| B4 | **写入工具的署名落库形态【未验证】**：`$session.*` 在 `exec.content` 内**不插值**（实测 BUG-003）；`args` 模板**未验证** | 实测原始证据 `docs/05-开发文档/附件/arc-contracts.md` §28.7 | 可信署名走 CLI `--sign-key` |
| B5 | **列表索引编辑后陈旧**（索引不随记录更新） | 实测原始证据 `docs/05-开发文档/附件/arc-contracts.md` §15 | 用目录边界 / `propBind`，不用 filter |
| B6 | **`/mcp`、AFS RPC、`/p/llms.txt` 由运行时提供** | —— | ArcBlog 只声明与审计 |

### 2.1 Stage 4 挖出的四条**实证**（Lead 已逐条复核，2026-10-01 补）

| # | 事实 | 复核证据 | **范围（必须写准）** |
| :-: | --- | --- | --- |
| **B7** | **safe-style 白名单不含** `wordBreak` / `overflowWrap` / `whiteSpace` / `textOverflow` ⇒ 写了**会被丢弃** | 实测原始证据 `docs/05-开发文档/附件/arc-contracts.md:1579` 明写"**不含**" | **通用**（整个 style 白名单），不受元素限定 |
| **B8** | **`action` 的 `style` 只转发部分键**（`padding`/`borderRadius` 生效，**`minHeight` 被静默丢弃**） | 实测原始证据 `docs/05-开发文档/附件/arc-contracts.md:1550`（Round 13 实测，探针矩阵 `:1560-1563`） | ⚠️ **仅 `action`**。**不得**推广到 `view`/`row`——`:860` 反而记"`action` 的 `borderBottom` 被丢、**`view`/`row` 上的有效**"。实测 35 处 `minHeight` **全在 `view`(34)/`row`(1)**，**对它们【未验证】** |
| **B9** | **界面声称"分发面 always on、无需配置"，而产物不存在** | `.aup/pages/site/feeds.aup:5` 原文 `"These surfaces are always on and generated from published content — nothing to configure."`；**`.web-cache/rss.xml` = ABSENT**；`/p/rss.xml` 被引 | 这是**最要防的假绿灯**：`/p/rss.xml` 状态为 **【规划中·待生成】**，界面文案必须同步降级；`/.well-known/service/login`（平台登录流）**不是**本项对象 |
| **B10** | **`arcblog-theme.test.mjs` 在 `seed.value === 'system'` 时 `return`** ⇒ 该守卫在本配置下**不生效** | `scripts/arcblog-theme.test.mjs:39`；**其上方注释已说明理由**（自适应默认值不可能对每个访客成立；闪窗代价见 `docs/05-开发文档/附件/arc-contracts.md §17`）；`seed/.../theme.json` = `system`、`app.aup mode = light` | ⚠️ **是有记录的有意豁免，不是疏漏**。准确表述 = "**门是绿的，但在当前配置下不覆盖 `mode` 一致性检查（按设计）**"——**不得**写成"测试有 bug"。这是 `00 §4` 教训的**镜像**：**"看起来绿 ≠ 真的守住了"** |

## 3. ⚠️ **三处代码缺口**（Stage 5 必须立项，别只写"已支持"）

| # | 缺口 | 现状证据 | 归属 |
| :-: | --- | --- | --- |
| G1 | **链上枚举未接**：`chain.mjs` 的 **ocap 适配器与 mock 适配器都没有 `listStakes`** | `grep -c listStakes scripts/lib/chain.mjs` = **0**；SDK 有（`node.d.ts:478`，参数 `:2733-2738`） | 探针 **P-1**（mock）/ **P-2**（真链只读） |
| G2 | **清空未接**：适配器无 `updateAsset` | `grep -c updateAsset scripts/lib/chain.mjs` = **0**；SDK 有 | 探针 **P-4** |
| G3 | **转让未接**：`signTransferTx`/`sendTransferTx` 未使用；**施工先例**：`tokens: []` 合法、`value` 是 decimal 字符串；但 `value:"0"` **无先例** | 同上 | 探针 **P-3**（**beta + TBA**，不需真资金） |

**另需登记的实现债务**：
- **`scripts/lib/chain.mjs:783` 的工厂回退**（`factoryFor('studio') \|\| factoryFor('hub')`）—— 会让"一个地址 ⇒ 全部节点"失效（**待清除的残留**）；
- **mock 链从未跑过**（`config/mock-chain.json` 不存在）；
- **`world/` 的待清 schema 2 个**（`hub-registration.yaml`、`trusted-hub.yaml`，22 → 20）；
- **`arcblog-network.mjs` 半删**（**Lead 2026-10-01 实测到子命令级**）：**保留** `discovery publish`／`discovery show`／`health`／`list`；**删除** `hub list`／`hub refresh`／`hub index rebuild`（该文件今天仍有 **100 处** `hub` 提及 ⇒ 是**待办的清理**，不是已完成）；
- **`arcblog-attribution.mjs` 半删**（同法实测）：**保留** **`keygen`／`sign`／`verify`**（**内容溯源** = spec §65–§67，`lifecycle publish --sign-key` 亦属此链）；**删除** `attributions`／`trust`／`trusted`（**归属公钥与归属记录**，无现行调用方）；
- **历史物证**：工厂投影记录里 **`nodes.hub` 仍在**（`acquireTx` 是坏值 `0xte32482…`）；**该记录已不在仓库中，无法复跑**。

## 4. Stage 5 定稿门（预告）

| # | 门 |
| :-: | --- |
| G1 | **平台边界可引**：概念/需求/设计里每个【平台边界】都能在 `02`/`02a` 找到条目；每条给降级 |
| G2 | **探针唯一出处**：P-*/U-* 编号在本阶段收拢，每项给**步骤 + 判定式 + 阻塞对象**；概念/需求/设计引编号而**不重定义** |
| G3 | **缺口如实**：§3 的三处缺口**必须**写成"未接/规划中"，**不得**因"SDK 里有"写成已支持（本阶段增补判据） |
| G4 | **引用原始证据必须读完整节**（本项目真实事故：只引有利那半 ⇒ 把【规划中】写成【已实现】） |
| G5 | 形态：≤400 行/篇、单行 ≤800 **字符**、`wc -l` 计数、链接 0 MISS（**已声明前向引用豁免**） |
| G6 | `arc dsl validate --json` `issues: []` + `npm test` 快层不红（**本阶段可能触及 `.aup`/`world/`，若触及还须 `npm run build`**） |
| G7 | 两路独立审查 + Lead 核验 |

## 5. 纪律（沿用 + 本阶段特有）

- **不写"预期条数/预期文件数"**；凡数字：**实测 + 口径 + 可复算命令**。
- **跑过 ≠ 写回**：凡写"已跑通/已验证/实测"，必须能指到**原样输出**；指不到 ⇒ 写【未验证】+ 探针。
- **判据要能红、不能假红**，且**变异要自证已生效**（先 `assert` 变异串在原文里）。
- **改冻结阶段 = 受控修订**：Stage 5 **不得**直接改 `docs/01`/`02`/`03`；发现它们有问题 ⇒ **停手 → 报 Lead**。
