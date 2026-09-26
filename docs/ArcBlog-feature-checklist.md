# ArcBlog 功能清单（Feature Checklist）

> 本文档追踪 [ArcBlog-product-technical-spec.md](ArcBlog-product-technical-spec.md) 中每个功能的实现状态。

**文档版本：** V1.0

**关联文档：** [ArcBlog-product-technical-spec.md](ArcBlog-product-technical-spec.md)（产品与技术规格，**权威来源**）

---

## 同步规则（重要）

**两个文档必须同步修改：**

1. **修改产品文档 → 同步本清单**：规格中新增功能 → 本清单新增一行（状态 ⬜）；规格中修改功能定义 → 更新对应行的"规格章节"与备注；规格中删除功能 → 删除对应行。
2. **功能实现完成 → 更新本清单**：将状态从 ⬜ / 🟡 改为 ✅，并在"实现位置"列填写代码入口。
3. **以规格为准**：任何不一致时，产品文档是权威来源（spec §150 原则同样适用于文档本身）。
4. 每行必须带**规格章节号**（如 §8.3），保证双向可定位。

## 状态图例

| 标记 | 含义 |
| ---- | ---- |
| ✅ | 已实现（代码 + 测试在位） |
| 🟡 | 部分实现（核心链路通，边界/界面/联动未完） |
| ⬜ | 待实现 |
| ⚪ | 不实现（明确划出软件边界，如 Factory 发行本身） |

## 总览

| 分组 | ✅ | 🟡 | ⬜ | ⚪ | 小计 |
| ---- | -- | -- | -- | -- | ---- |
| A. 平台与架构基础 | 6 | 1 | 0 | 0 | 7 |
| B. 角色 / NFT / 质押 | 10 | 0 | 0 | 1 | 11 |
| C. 内容与发布 | 13 | 2 | 1 | 0 | 16 |
| D. 管理后台 | 16 | 8 | 0 | 0 | 24 |
| E. 经济系统 | 13 | 1 | 1 | 0 | 15 |
| F. 网络与发现 | 11 | 0 | 1 | 0 | 12 |
| G. Agent | 8 | 0 | 1 | 0 | 9 |
| H. 未来（V2+） | 0 | 0 | 5 | 1 | 6 |
| **合计** | **77** | **12** | **9** | **2** | **100** |

---

## A. 平台与架构基础

| 功能 | 规格章节 | 状态 | 实现位置 / 备注 |
| ---- | ---- | ---- | ---- |
| Blocklet Package / Instance 模型 | §78–§81 | ✅ | `blocklet.yaml`、`dist/` |
| AFS 资源模型与权限边界 | §12–§13 | ✅ | `world/*.yaml` 18 个 schema；`blocklet.yaml` replicated 权限表 |
| Identity / DID / Session | §3 | ✅ | `$session.authenticated` 登录卡 + 页面级授权 |
| DID Space 用户数据 | §5.2、§83 | 🟡 | 草稿/私域目前由 instance 空间目录边界承载；用户作用域 `/user` 数据待落地 |
| AUP 管理后台框架 | §14 | ✅ | `.aup/`（app.aup + 14 个页面） |
| Web Device 公共站点 | §17–§18 | ✅ | `pages/`、`.web/`、`.route/` |
| Public Site 与 Admin 分离 | §127–§128 | ✅ | 公共页 SSR（`/.route/web`），后台 AUP |

## B. 角色 / NFT / 质押

| 功能 | 规格章节 | 状态 | 实现位置 / 备注 |
| ---- | ---- | ---- | ---- |
| NFT 配置外部化 | §9 | ✅ | `config/roles.json`，地址不硬编码，fail closed |
| Role Engine（状态检查） | §10 | ✅ | `scripts/arcblog-roles.mjs status`（assetOwned / stakeActive / active） |
| Capability 模型 | §11 | ✅ | `blocklet.yaml` 权限表 + roles 配置驱动 |
| NFT Factory（消费链上工厂） | §8.1 | ✅ | `scripts/lib/nft-factory.mjs` + `lib/chain.mjs` + `arcblog-factory.mjs` / `arcblog-node-nft.mjs`；设计与 GLofter 映射见 [ArcBlog-nft-factory.md](ArcBlog-nft-factory.md)。**验证范围**：mock 适配器端到端（9 个测试，含等待期拒绝）；真实链 `--adapter ocap` 代码按 GLofter 调用序列实现，但本机无 ARC 依赖/链/资金钱包，仅验证了缺依赖时报 `CHAIN_UNAVAILABLE`，未做真实交易演练。两座工厂（studio/hub）：moniker、mint 输入变量、NFT JSON 数据、内联 SVG、`transferToken` hook、容量公式 `min(ceil(1442.695·ln(stake+1)),10000)` |
| NFT Factory 发行 | §8.1 | ⚪ | 明确划出边界：发行是 Factory owner 的事，ArcBlog 不实现 |
| 角色资产购买（Acquire） | §8.2 | ✅ | `scripts/lib/nft-factory.mjs` + `lib/chain.mjs` + `arcblog-factory.mjs` / `arcblog-node-nft.mjs`；设计与 GLofter 映射见 [ArcBlog-nft-factory.md](ArcBlog-nft-factory.md)。**验证范围**：mock 适配器端到端（9 个测试，含等待期拒绝）；真实链 `--adapter ocap` 代码按 GLofter 调用序列实现，但本机无 ARC 依赖/链/资金钱包，仅验证了缺依赖时报 `CHAIN_UNAVAILABLE`，未做真实交易演练。`acquire` = `preMintAsset` → `acquireAsset`，资产所有者 = 购买钱包，NFT 记录 DID/公钥/endpoint/region/质押量 |
| 质押 / 追加质押（Stake） | §8.3 | ✅ | `scripts/lib/nft-factory.mjs` + `lib/chain.mjs` + `arcblog-factory.mjs` / `arcblog-node-nft.mjs`；设计与 GLofter 映射见 [ArcBlog-nft-factory.md](ArcBlog-nft-factory.md)。**验证范围**：mock 适配器端到端（9 个测试，含等待期拒绝）；真实链 `--adapter ocap` 代码按 GLofter 调用序列实现，但本机无 ARC 依赖/链/资金钱包，仅验证了缺依赖时报 `CHAIN_UNAVAILABLE`，未做真实交易演练。`stake` 按 GLofter 的 `multiSignStakeTx → signStakeTx → sendStakeTx`，等待期默认 30 天写入链上 |
| NFT data 链上元数据（名称/图标/描述/分类/endpoint） | §8.3 | ✅ | `scripts/lib/nft-factory.mjs` + `lib/chain.mjs` + `arcblog-factory.mjs` / `arcblog-node-nft.mjs`；设计与 GLofter 映射见 [ArcBlog-nft-factory.md](ArcBlog-nft-factory.md)。**验证范围**：mock 适配器端到端（9 个测试，含等待期拒绝）；真实链 `--adapter ocap` 代码按 GLofter 调用序列实现，但本机无 ARC 依赖/链/资金钱包，仅验证了缺依赖时报 `CHAIN_UNAVAILABLE`，未做真实交易演练。NFT `data.value` 含 name/description/endpoint/region/stake/pk/owner（studio 另含 roles/capabilities/protocolVersion/nodeVersion；hub 另含 pricing/capacity/rules）；`status` 可读回；质押期间资产离开钱包（owner = stake 地址）即「锁定」 |
| 解除质押 / 等待期 / 取回（Revoke & Claim） | §8.4 | ✅ | `scripts/lib/nft-factory.mjs` + `lib/chain.mjs` + `arcblog-factory.mjs` / `arcblog-node-nft.mjs`；设计与 GLofter 映射见 [ArcBlog-nft-factory.md](ArcBlog-nft-factory.md)。**验证范围**：mock 适配器端到端（9 个测试，含等待期拒绝）；真实链 `--adapter ocap` 代码按 GLofter 调用序列实现，但本机无 ARC 依赖/链/资金钱包，仅验证了缺依赖时报 `CHAIN_UNAVAILABLE`，未做真实交易演练。`revoke` 进入 `revokedAssets` 并算出 `claimableAt`；提前 `claim` 报 `WAITING_PERIOD`，到期后取回、资产回到所有者钱包 |
| 角色生命周期五态 | §8.5 | ✅ | `roles state set` + `deriveStakeState`；revoking 到期自动派生 claimable；fail closed 不变（链上验证仍待接） |
| 角色退出时的数据承诺 | §8.6 | ✅ | `arcblog-roles.mjs state set --state revoking --link-exit [--reason "…"]`：① 内容永不删除（联动不触碰 posts/）；② `tombstoneHubRelations` 把每条 live Hub 关系转 Tombstone（`relation=removed` + `removedReason`，Hub 侧据此停止认为本节点仍在发布）；③ 只**报告**进行中（pending/paid）订单及其结算所依据的策略版本，不改写订单——§29 的版本化策略保证「按当时策略结算」；`state set` 不带该标志时无任何副作用 |

## C. 内容与发布

| 功能 | 规格章节 | 状态 | 实现位置 / 备注 |
| ---- | ---- | ---- | ---- |
| 文章生命周期（草稿→发布→归档→回收站） | §15.4 | ✅ | `scripts/arcblog-lifecycle.mjs`；posts/ 与 drafts/ 目录边界 |
| Markdown 编辑器 | §15.4 | ✅ | `.aup/pages/compose.json`、`compose-edit.json` |
| 草稿预览 | §15.4 | ✅ | `.aup/pages/preview.json`（绑定 drafts/，匿名不可见） |
| 分类（受控白名单） | §12、§15.4 | ✅ | `scripts/arcblog-category.mjs`；发布校验读取分类资源 |
| 标签（自由词 + 校验） | §15.4 | ✅ | 生命周期校验：小写、≤10 个 |
| 媒体索引 | §15.4 | ✅ | `scripts/arcblog-media.mjs`；`media/` schema |
| 内容可见性五档 | §21 | 🟡 | public / paid 已实现（含服务端门禁）；unlisted / members 待实现——feed 基于目录边界，无法诚实过滤，需先决策存储模型 |
| 付费内容访问控制（非前端隐藏） | §23–§24、§86 | ✅ | 付费正文存 `paid/`（admin-only），公开记录 previewOnly；`access read` 凭 Grant 放行；归档自动合并回全文 |
| 内容 Hash / 签名 / Provenance | §65–§67 | ✅ | `scripts/lib/content-hash.mjs`（§66 内容哈希）+ `scripts/lib/content-sign.mjs`（§67 Ed25519 签名：覆盖 contentHash + slug + authorDid + version）；`arcblog-lifecycle.mjs publish --sign-key <pem>` 签名并登记公钥到 `config/signing-keys/`；`arcblog-verify.mjs content --slug <slug>` 双检（哈希是否仍匹配 + 签名是否可验），`keys`/`key` 查看已登记公钥。私钥只在本地文件（0600），永不入 AFS；代他人验证需线下获取公钥（与 §30–§33 同一信任模型） |
| 静态页面管理（About 等） | §15.4 | ✅ | `scripts/arcblog-pages.mjs`；pages/ 与 page-drafts/ 目录边界；`page-view` 渲染页（/pages/{slug}） |
| 媒体引用追踪与清理 | §15.4 | ✅ | `arcblog-media.mjs refs/orphans/remove`；被引用时拒绝删除（--force 覆盖） |
| 分类合并 / 删除迁移 | §15.4 | ✅ | `arcblog-category.mjs usage/merge/remove --migrate-to`；引用中拒绝删除，迁移自动 bump version + 重算 hash |
| 标签合并 / 零引用清理 | §15.4 | ✅ | `arcblog-tags.mjs list/merge`；标签无注册表，list 即审计（零引用天然不存在） |
| RSS / Atom | §124 | ✅ | `scripts/arcblog-rss.mjs` |
| SEO / OG / 分享卡片 | §126 | 🟡 | `docs/share-cards.md`；站点级默认 + 文章继承未完整落地 |
| 内容对象目录化（content/articles/<slug>/） | §19 | ⬜ | 当前为单 JSON 记录 + 封面 URL；目录化内容对象为 V2 形态 |

## D. 管理后台

| 功能 | 规格章节 | 状态 | 实现位置 / 备注 |
| ---- | ---- | ---- | ---- |
| 控制台外壳（左菜单 + 右内容，三组六页） | §15.2 | ✅ | `scripts/console-nav.mjs` 生成 + `--check` 漂移门禁 |
| 概览 Dashboard | §15.3 | ✅ | `dashboard.json`（节点状态、最近文章、经济订单卡、Agent 授权卡、快捷操作） |
| 文章管理（列表 + 生命周期操作） | §15.4 | ✅ | `admin.json`（已发布 / 草稿列表） |
| 页面管理 | §15.4 | ✅ | `pages-admin` 控制台页（创建离线 → 上线/下线两步，与文章归档语义一致） |
| 媒体管理界面 | §15.4 | 🟡 | `media-admin.json` 只读索引列表；上传、引用视图待补 |
| 分类与标签管理界面 | §15.4 | 🟡 | 分类在 `heroes-admin.json`；标签管理界面缺失 |
| 外观（主题 / Tone / Palette / Mode） | §15.5 | ✅ | `settings.json` + theme bridge（`.web/components/`）；新增 `scripts/arcblog-settings.mjs show\|set`（按记录自身 `options` 校验、fail closed、保留 label/scope/type 等字段）；**实测实时预览**：CLI 改 tone 后页面 `<html data-tone>` 无需刷新即跟随（bridge 的 `afs.subscribe`）；控制台外观页用运行时 auto-surface（管理员编辑面；guest 测试身份下显示 "No settings"，该面未在浏览器验证，见下） |
| 首页与推荐位（Hero 轮播） | §15.5 | ✅ | `heroes-admin.json` + `.web/components/hero-carousel/` |
| SEO 配置页 | §15.5 | ✅ | `seo-admin`（站点元数据写 node profile，文章级自动继承） |
| 分发面页面 | §15.5 | ✅ | `feeds-admin`（RSS / 文章索引 / Agent 访问说明，均由已发布内容自动生成） |
| 节点身份（Profile / DID / Discovery / Health） | §15.6 | ✅ | `operations.json`；`arcblog-node.mjs`、`arcblog-network.mjs` |
| Hub 注册（Studio 侧列表 / 申请 / 被收录） | §15.6、§70.1–70.2 | 🟡 | CLI 完整（register=申请/approve/reject/add=主动收录/remove=Tombstone）；AUP 界面仅有列表，申请流与被收录列表待补 |
| Hub 管理（Studio 列表 / 主动收录 / 申请审批） | §15.6、§70 | ✅ | `hub-admin` 控制台页：关系行内 通过/终止/彻底删除 + 内容索引视图；主动收录与索引重建为 CLI（关系 id 是 DID 哈希，AUP 无法计算，页面如实标注） |
| Hub 内容索引 / Topics / 推荐策略 | §15.6、§52、§73 | 🟡 | 索引与搜索 CLI ✅（rebuild/list/search + Tombstone）；Topics 与推荐策展待实现 |
| 商品管理 | §15.7 | ✅ | `policy-admin.json`；`arcblog-economy.mjs` |
| 订单管理（含六问追溯） | §15.7、§50 | ✅ | 订单记录含 creator/hub/policy/amount；退款操作待补 |
| 结算与账本（append-only） | §15.7、§91–§92 | ✅ | 账本确定性 id、分页；类型筛选界面待补 |
| 策略与账户（分成版本 / 钱包 / Adapter） | §15.7 | 🟡 | 分成策略版本化 ✅；收款账户与 Adapter 配置界面待补 |
| Agent 能力与工具页 | §15.8 | 🟡 | CLI（`arcblog-agent.mjs show/tools/check`）✅；AUP 界面待补 |
| Agent 授权（Grants） | §15.8 | ✅ | `config/agent-grants/`；TTL、撤销、`agent.admin` 不可授予 |
| Agent 审计日志 | §15.8 | ✅ | `scripts/arcblog-audit.mjs` |
| 设置 - 通用 | §15.9 | 🟡 | 外观设置 ✅；站点名称/语言/时区、功能总开关待补 |
| 设置 - 角色与能力（含购买/质押引导） | §15.9、§8.2–8.5 | 🟡 | 角色状态只读展示 ✅；Factory 卡片、购买、质押操作全部待补 |
| 设置 - 诊断与维护 | §15.9 | ✅ | `arcblog-doctor.mjs`；`operations.json` 健康面板 |

## E. 经济系统

| 功能 | 规格章节 | 状态 | 实现位置 / 备注 |
| ---- | ---- | ---- | ---- |
| Tip 打赏 | §35–§36 | ✅ | `arcblog-economy.mjs`（kind: tip 不产生访问权） |
| 付费阅读（Paid Reading） | §23、§36–§37 | ✅ | 购买产生 Access Grant |
| Product 抽象（价格与文章解耦） | §39、§41、§45 | ✅ | `product.yaml`；文章只挂 productId |
| Order | §42 | ✅ | `order.yaml`；pending/paid/failed/refunded 状态机 |
| Payment 与 Settlement 分离 | §89 | ✅ | 支付与结算两个独立步骤 |
| Payment Adapter（可替换支付） | §44 | 🟡 | adapter 接缝 + manual 模式 ✅；真实链上支付通道待接 |
| Settlement | §43 | ✅ | `settlement.yaml` |
| Revenue Split 版本化 | §29 | ✅ | `settlement-policy.yaml`；历史订单按当时版本 |
| Hub Share + Attribution 验证 | §30–§33 | ✅ | `config/trusted-hubs/` + attributions；未验证归属归入创作者 |
| 经济账本（append-only） | §91–§92 | ✅ | `ledger-entry.yaml`；确定性 id（`<orderId>:<type>`） |
| 经济透明性（订单六问） | §50 | ✅ | 订单字段完备 |
| 退款（Refund + 结算冲正） | §90 | ✅ | `arcblog-economy.mjs order refund`：退款事件 + `<orderId>:refund:<type>` 冲正账本 + 结算置 reversed + 授权吊销；幂等 |
| 订阅（Subscription，手动续期） | §38 | ✅ | product `--type subscription --period-days`；授权按期限时，续期 = 新订单产生新 Grant，无自动扣款 |
| Creator Store / 数字商品 | §39 | ✅ | 公开商店页 `store`（绑定 `/store`，guest 可读 §50）：商品目录（id / 价格+币种 / 类型 / 关联内容 id）、空态提示、购买流程说明（下单→适配器支付→结算分账→Access Grant 解锁；本页不含收银台）、公共页脚已加 Store 入口；**私有商品不出现在商店**：`filter={field: "content.visibility", match: public}`（实测 private 商品被排除；注意该过滤走 provider 查询，只覆盖"小且已索引"的记录——商品记录满足，正文类大记录不满足，见 arc-contracts §15.1） |
| 付费推广与自然发现区分 | §51 | ⬜ | Hub 侧功能，依赖 Hub 管理实现 |

## F. 网络与发现

| 功能 | 规格章节 | 状态 | 实现位置 / 备注 |
| ---- | ---- | ---- | ---- |
| Discovery Document（AFS-native） | §69 | ✅ | `node/discovery.json`；HTTP `/.well-known` 在平台不可行，走 AFS（arc-contracts §7） |
| Node Health | §110 | ✅ | `node/health.json`；`arcblog-network.mjs health` |
| Network Profile | §109 | ✅ | `arcblog-node.mjs` |
| Studio → Hub 注册记录 | §70.1、§71 | ✅ | `hub/registrations/`；many-to-many |
| Hub 同步状态（lastSync/version/hash/error） | §72、§112 | ✅ | `arcblog-network.mjs hub sync` |
| 双向选择（Hub 主动收录 / Studio 申请审批） | §70 | ✅ | `hub register/add/approve/reject/remove --purge`；relation: applied/indexed/removed + direction；移除保留 Tombstone（AUP 界面待补） |
| Hub 内容索引（派生索引） | §73 | ✅ | `hub index rebuild/list`：仅元数据 + contentHash + version（Studio=源，Hub=索引）；AFS 记录实现，未用 SQLite |
| Hub 搜索 | §68、§73 | ✅ | `hub index search --query`：索引内客户端匹配，永不返回 Tombstone |
| 内容删除 Tombstone（Hub 侧） | §119 | ✅ | rebuild 时消失的文章自动转 Tombstone（status=deleted + deletedAt），历史保留 |
| 内容版本比对与更新（version + contentHash） | §120 | ✅ | `indexEntryCurrent`：version + contentHash 相同即跳过，变化才重新索引 |
| Hub 离线 / Studio 离线语义 | §75–§76 | ✅ | `scripts/lib/network.mjs` 的 `hubFreshness`/`withFreshness` 派生 `fresh/stale/never/offline`（失败→offline、未同步→never、超期→stale，`--stale-after` 默认 24h）；`arcblog-network.mjs hub refresh` 落盘、`hub list` 汇总、`health.hubs` 计数；hub-admin 关系行显示状态 + 图例说明 |
| 内容缓存 / 复制 | §77 | ⬜ | 第二阶段 |

## G. Agent

| 功能 | 规格章节 | 状态 | 实现位置 / 备注 |
| ---- | ---- | ---- | ---- |
| Agent Access 声明（复用 Runtime `/mcp` 等） | §59、§129 | ✅ | `agents/arcblog-agent/`（agent.dsl / agent.json / system.md） |
| Agent 权限分级 | §61 | ✅ | agent.read/write/publish/economy/admin；默认只读 |
| Agent 工具（读） | §130 | ✅ | search_posts / get_post / list_studios 等 |
| Agent 工具（写，需授权） | §130 | ✅ | create_draft / update_draft / publish_post；需未过期 grant |
| Agent 工具（经济） | §130 | ✅ | create_product 已可用；`get_analytics` 上线（仅公开面聚合，不含买家数据，§62）；结算类默认关闭 ✅ |
| 高风险工具默认关闭 | §130 | ✅ | settle_payment / change_wallet / change_role 永不暴露 |
| Agent 身份与 Caller 留痕 | §62 | ✅ | 审计记录 Caller DID + Agent Identity |
| AI 自动写作（草稿→人工审核→发布） | §63 | ✅ | 结构性落地：create_draft 需 agent.write、publish_post 需独立的 agent.publish 授权——AI 无法无授权直接发布 |
| Hub AI（分类 / 摘要 / 推荐 / 语义搜索） | §64、§131 | ⬜ | |

## H. 未来（V2+）

| 功能 | 规格章节 | 状态 | 实现位置 / 备注 |
| ---- | ---- | ---- | ---- |
| 评论（本地 → DID → 跨 Hub） | §121 | ⬜ | |
| Follow / Social Graph | §122 | ⬜ | |
| 订阅绑定 DID | §123 | ⬜ | |
| Cross-Hub Discovery | §144 | ⬜ | 第一版不要求 Hub-to-Hub |
| AI Creator / Agent 经营 Studio | §132–§133 | ⬜ | |
| 明确不做：DAO / Token / 治理 / 跨链 / NFT 市场等 | §139 | ⚪ | 边界声明，永不进入清单 |

---

## 维护记录

| 日期 | 变更 |
| ---- | ---- |
| 2026-09 | 初始版本：基于产品文档 V2.0 建立，99 项功能（✅48 / 🟡18 / ⬜31 / ⚪2） |
| 2026-09 | 实现轮次 1：+17 项 ✅（内容 Hash、退款、角色五态、Pages CRUD + pages-admin、分类/标签治理、媒体引用、Dashboard 经济/Agent 卡、seo-admin、双向选择状态机、Hub 索引/搜索/Tombstone、付费内容门禁、订阅续期、Agent 经济分析）→ ✅65 / 🟡15 / ⬜17 / ⚪2 |
| 2026-09 | 实现轮次 2：hub-admin 策展界面 ✅（行内审批/终止/删除 + 索引视图）。决策记录：链上交互保持 operator-declared（不接链 SDK）；unlisted/members 暂不实现 → ✅66 / 🟡15 / ⬜16 / ⚪2 |
| 2026-09 | 实现轮次 3：**内容签名/Provenance**（§65–§67，`arcblog-verify.mjs` 双检 + `publish --sign-key`）与 **Hub 离线语义**（§75–§76，派生 `fresh/stale/never/offline` + `hub refresh` + health 汇总）→ ✅68 / 🟡15 / ⬜14 / ⚪2。决策记录：链上交互（购买/质押/取回）仍保持 operator-declared；Hub AI、评论/社交图谱属 V2+ |
| 2026-09 | 实现轮次 3（续）：**角色退出的数据承诺**（§8.6，`--link-exit`：Hub Tombstone 联动 + 进行中订单报告）→ ✅70 / 🟡13 / ⬜15 / ⚪2。同一轮另两项：内容签名/Provenance（§65–§67）、Hub 离线语义（§75–§76） |
| 2026-09 | 实现轮次 4：**外观设置可编排**（§15.5：`arcblog-settings.mjs show\|set` + 实测实时预览）与 **Creator Store 公开商店页**（§39：`/store` 商品目录 + 私有商品过滤 + 页脚入口）→ ✅72 / 🟡12 / ⬜14 / ⚪2。遗留：控制台内管理员编辑面（auto-surface）无法用 guest 测试身份验证 |
| 2026-09 | 实现轮次 5：**B 组链上交互**（§8.1–§8.4）——参考 GLofter 设计 studio/hub 两座 NFT factory，实现 factory 规格 + 可插拔链适配器（mock 端到端 / ocap 按 GLofter 调用序列）+ acquire/stake/revoke/claim 与五态同步；新增 [ArcBlog-nft-factory.md](ArcBlog-nft-factory.md)。→ ✅77 / 🟡12 / ⬜9 / ⚪2。**待办**：真实链 `--adapter ocap` 需在有 ARC 依赖与资金钱包的环境做一次端到端演练（§8.1 “Factory 元数据读取与展示”的界面部分亦待补） |
| 2026-09 | 审计轮次 6：**控制台点击去向**（控制台页框架内切换、公共页/编辑器/资源新标签页，11 处 `target=_blank`，UI 标准 §2.6）+ **局部刷新机制**实测（列表订阅级 / 页内切页级可用；单记录 `propBind` 有首屏竞态，arc-contracts §21.11）。→ 状态计数不变 |
| 2026-09 | 验证轮次 7：**AUP 交互式会话 / 节点级 patch 的实测**——平台确有 session+treeVersion 与 `create/update/remove/reorder`（官方参考 + 运行时实现），但本实例对非 `_root` 节点的 `-> set` 回复 `AUP node not found`（3 次尝试、2 种写法、2 条到达路径），页面切换会重建整页子树；结论与控制台取值写入 arc-contracts §21.12 与 UI 标准 §8。→ 状态计数不变 |
| 2026-09 | 验证轮次 8（方案 3）：**单页内区域级就地切换可行性**——`view mode=tabs` 实测可达：切换零 WS 往返、侧栏/页签/面板/两个 `afs-list` DOM 全部复用、隐藏面板订阅继续刷新；`-> page` 仍会重建整页子树。取值：一事一页保深链 + 同节内子视图用页签。结论入 arc-contracts §21.13 与 UI 标准 §8。→ 状态计数不变 |
| 2026-09 | 重构轮次 9：**管理后台整体重构为单页 + hash 路由**（对齐 `.well-known/service/user#profile`）——15 节合并为一个 console 页，侧栏 hash 链接驱动页签面板就地替换（DOM 全量复用、零往返），前进后退可用，旧 `?page=<name>` 与 `/manage/seo` 经别名页 + console-bridge 迁移，写文章/外观收进控制台（仅阅读/预览/编辑/资源仍新标签页）。新增 `.web/components/console-bridge/`，重写 console-nav 生成器与测试；约束与实测（hashchange 重渲染、URL 归一化、iframe sandbox）见 arc-contracts §21.14。→ 状态计数不变 |
| 2026-09 | 修复轮次 10：重构上线后三处问题——顶栏丢失全宽包装、侧栏 `action href` 锚点不铺满（91px/258px，桥注入 `align-self:stretch`）、切节仍触发 `tab-change` 上报并重写子树（改为直接切换面板 DOM 状态，回归 0 次 HTTP 往返）；节切换定案为 `replaceState`（深链保留、不进历史）。复测证据入 arc-contracts §21.14.1 与 UI 标准 §2.3。→ 状态计数不变 |
| 2026-09 | 修复轮次 11：侧栏**悬停不可读**——hover 规则只改背景未改文字色，悬停选中项呈"浅底+近白字"；改为 hover 同时设文字色 + 选中态 `:hover` 变体（顺序 hover 在前、active 在后），两态对比度实测 16.59:1。→ 状态计数不变 |
| 2026-09 | 修复轮次 12：**控制台 URL 未规范化**——从绑定路由（`/posts/<slug>`、`/store`）点"管理后台"是应用内换页，运行时保留旧 path 只追加 `?page=console`，URL 变成 `/posts/hello-arcblog?page=console#dashboard`；桥改为统一 `replaceState` 成 `/?page=console&…#<section>`，实测文章页/商店页/`/manage/seo` 三处入口均正确。→ 状态计数不变 |
