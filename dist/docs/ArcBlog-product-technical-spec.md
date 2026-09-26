# ArcBlog

> An open, decentralized, agent-native publishing network powered by ARC.

**项目类型：** Open Source / Decentralized Publishing / Personal Blog / Content Network / Creator Economy

**目标平台：** ARC 2.x

**核心架构：** AFS + AUP + Web Device + Blocklet + Identity + DID Space + Agent Access

**项目状态：** Product & Technical Specification

**文档版本：** V2.0

**功能清单：** [ArcBlog-feature-checklist.md](ArcBlog-feature-checklist.md)（实现状态追踪；**修改本文档必须同步更新功能清单**）

---

# 1. 项目概述

ArcBlog 是一个基于 ARC 架构构建的开源、可自托管、去中心化博客与内容发布网络。

ArcBlog 不应该被设计成传统意义上的：

> 一个部署在 Blocklet 上的 Web 博客。

而应该被设计成：

> 一个运行在 ARC 上、由 AFS 组织资源、由 AUP 驱动交互界面、由 Web Device 发布内容、由 DID / DID Space 管理身份与用户数据、由 Blocklet 负责应用打包与运行，并通过 Agent Access 对 AI Agent 开放能力的内容节点。

ArcBlog 的基本单位不是“网站账号”，而是：

> **一个 ArcBlog Instance。**

一个 Instance 可以根据其拥有并激活的链上角色，成为：

* 普通个人 Blog
* Studio
* Hub
* Studio + Hub

因此不再开发两个软件：

```text
ArcBlog Studio
ArcBlog Hub
```

而是：

```text
ArcBlog
```

同一个项目、同一个 Blocklet Package、同一套核心代码，通过角色能力决定 Instance 在网络中的职责。

---

# 2. 核心理念

ArcBlog 的核心理念可以概括为：

> **内容属于创作者，身份属于用户，节点属于运营者，网络由节点共同组成，价值由内容参与者共同获得。**

传统博客平台：

```text
Creator
   ↓
Centralized Platform
   ↓
Database
   ↓
Reader
```

ArcBlog：

```text
                    ArcBlog Network

          ┌─────────── Hub ───────────┐
          │                           │
          │  Discovery / Search       │
          │  Index / Recommendation   │
          │  Economic Routing        │
          │                           │
          └─────┬────────┬────────────┘
                │        │
                ↓        ↓
             Studio    Studio
                │        │
                ↓        ↓
             Creator   Creator
                │        │
                └───┬────┘
                    ↓
                 Content
```

Hub 不是平台。

Studio 不是平台。

ArcBlog 软件本身也不是中心化内容平台。

它是一套：

> **可以由任何人运行的内容网络节点软件。**

---

# 3. ARC 架构原则

ArcBlog 必须按照当前 ARC 架构设计，不得把旧版 Blocklet Server 的概念直接套用进来。

ARC 当前架构把以下层次明确分开：

| 层            | ArcBlog 中的职责                        |
| ------------ | ----------------------------------- |
| AFS          | 内容、配置、资源、Provider、能力与路径             |
| AFS UI       | AFS 资源与 UI 之间的架构关系                  |
| AUP          | 交互式管理后台与动态 UI                       |
| Web Device   | Blog 公共网站、文章、主题、页面                  |
| Blocklet     | ArcBlog Package 与 Instance          |
| Identity     | 用户 DID / Caller                     |
| DID Space    | 用户作用域数据                             |
| Data Space   | 数据上下文的架构概念                          |
| ARC Runtime  | 运行 ArcBlog                          |
| Agent Access | MCP / AFS RPC / llms.txt 等 Agent 接口 |

当前 ARC 文档明确指出，AFS 是路径和能力层；ARC 是承载 AFS、Blocklet、session 和 CLI 的运行时外壳。

---

# 4. ArcBlog 的总体架构

ArcBlog 采用：

```text
                    ARC Runtime
                         │
              ┌──────────┴──────────┐
              │    ArcBlog Blocklet  │
              │       Package       │
              └──────────┬──────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ↓                ↓                ↓
       AFS              AUP          Web Device
        │                │                │
        │                │                │
   Resources        Admin UI        Public Blog
   Providers        Dashboard       Articles
   Capabilities     Editor          Themes
        │                │                │
        └────────────────┼────────────────┘
                         │
                  Identity / Session
                         │
              ┌──────────┴──────────┐
              ↓                     ↓
          User DID              Instance
              │                     │
              ↓                     ↓
         DID Space             Shared World
              │
              ↓
       User Data / Assets
```

---

# 5. ArcBlog 的两个世界

ArcBlog 必须区分：

## 5.1 Instance World

Instance World 是一个 ArcBlog 节点本身的数据与运行环境。

包括：

* Node Profile
* Node DID
* Blog configuration
* Public site configuration
* Hub index
* Network configuration
* Role configuration
* Payment configuration
* Public metadata

---

## 5.2 User Data Space

用户自己的数据属于用户 DID 作用域。

包括：

* Drafts
* Private posts
* Personal settings
* Private media
* Agent permissions
* Private subscriptions
* Personal payment records
* User preferences

ARC 当前 session 可以根据调用者身份形成 `/user`、`/tmp`、可选 `/space` 等视图；不能简单把 DID 当成路径字符串，也不能把 Data Space 当成一个独立 SDK。

因此 ArcBlog 应该遵循：

```text
Public Node Data
        │
        └── Instance

Private User Data
        │
        └── DID Space
```

---

# 6. 为什么不能把所有内容放进 SQLite

SQLite 可以作为 ArcBlog 的实现细节，但不能成为整个产品的数据抽象。

ARC 的数据边界应该首先表达为：

```text
AFS Path
   ↓
Provider
   ↓
Capability
   ↓
Resource
```

而不是：

```text
Everything
   ↓
SQLite
```

SQLite 可以用于：

* 本地索引
* FTS
* 缓存
* 查询加速
* Hub Index
* 派生数据

但不应该成为 ARC 架构的唯一数据合同。

物理存储属于实现细节。

AFS Path 才是应用层应该依赖的资源边界。

---

# 7. ArcBlog 的核心角色

ArcBlog 有四种运行状态。

## 7.1 Basic

任何 ArcBlog Instance 默认都是 Basic。

能力：

```text
Blog
Profile
Draft
Publish
Theme
Media
```

Basic 不需要 NFT。

---

## 7.2 Studio

Studio 是内容生产节点。

激活条件：

```text
Studio Role Asset
        +
Valid Stake
        ↓
Studio Capability
```

Studio 负责：

* 创建内容
* 发布内容
* 管理作者身份
* 提供文章资源
* 提供公开站点
* 提供内容 API
* 注册到 Hub
* 接收读者
* 接收打赏
* 销售付费内容

---

## 7.3 Hub

Hub 是网络发现与内容聚合节点。

激活条件：

```text
Hub Role Asset
       +
Valid Stake
       ↓
Hub Capability
```

Hub 负责：

* 发现 Studio
* 索引 Studio
* 聚合文章
* 搜索
* 分类
* 推荐
* Topic
* Featured
* 经济活动路由
* 发现服务

---

## 7.4 Studio + Hub

同时拥有两个角色：

```text
Studio Asset
     +
Hub Asset
     ↓
Studio + Hub
```

一个节点同时承担：

```text
Content Creation
+
Content Discovery
+
Content Aggregation
+
Economic Routing
```

这将成为 ArcBlog 最完整的节点形态。

---

# 8. NFT 的真正作用

NFT 不应该被设计成简单的会员卡。

ArcBlog 中 NFT 表示：

> **某个 Instance 获得某种网络角色的链上资格。**

例如：

```text
ArcBlog Studio Asset
        ↓
Ownership
        ↓
Stake
        ↓
Studio Capability
```

以及：

```text
ArcBlog Hub Asset
        ↓
Ownership
        ↓
Stake
        ↓
Hub Capability
```

ArcBlog 本身不负责 NFT Marketplace。

ArcBlog 只负责：

1. 检查资产
2. 检查所有权
3. 检查 Stake
4. 验证状态
5. 激活能力

---

## 8.1 NFT Factory（角色资产工厂）

> 实现落点：`scripts/lib/nft-factory.mjs`（两座 factory 的链上规格：模板、输入变量、NFT data、内联 SVG、mint hook、容量公式）+ `scripts/lib/chain.mjs`（可插拔适配器：`mock` 本地状态机 / `ocap` 真实链，按 GLofter 的 `createAssetFactory → preMintAsset+acquireAsset → stake → revoke → claim` 调用序列）；CLI 为 `arcblog-factory.mjs` 与 `arcblog-node-nft.mjs`。设计与 GLofter 字段映射、验证范围见 `docs/ArcBlog-nft-factory.md`。

角色资产由链上 Factory 发行与售卖。Factory 是一个外部化的链上地址（§9），ArcBlog **不实现 Factory，只消费它**。

每种角色一个 Factory：

```text
Studio Factory  → 发行 Studio 角色 NFT
Hub Factory     → 发行 Hub 角色 NFT
```

Factory 元数据（ArcBlog 只读展示）：

```text
address        Factory 链上地址
name           名称
description    描述
display        展示图
owner          Factory 运营方 DID
price          价格
token          计价资产 {address, symbol, value}
limit          供应上限
minted         已发行数量
```

原则：

* Factory 地址通过配置注入，绝不硬编码（§9）
* 发行与定价是 Factory owner 的事，不属于 ArcBlog 软件
* ArcBlog 不规定发行方必须是官方——任何人可以运行自己的 Factory，网络通过"哪个 Factory 被配置信任"形成治理边界
* 购买动作直接在 Factory 完成，不需要市场撮合——这也是 ArcBlog 不做 NFT Marketplace 的原因

---

## 8.2 获取角色资产（购买）

购买流程（参考 glofter 的服务端签名实践）：

```text
后台「角色与能力」页
  ↓ 展示 Factory 信息与价格（只读）
余额检查
  ↓ 不足 → 明确提示所需数量，不发起交易
构建未签名交易
  ↓ 节点服务端签名并发送（前端不接触私钥）
订阅链上交易确认事件
  ↓ 确认后刷新角色状态
资产到账
  ↓ 注意：资产到手 ≠ 角色激活，还必须质押（§8.3）
```

界面状态反馈：

```text
未购买   → 显示 Factory 卡片 + 购买引导
确认中   → 显示交易哈希与确认进度
已购买   → 「可以质押」
```

Factory price 的收益分配规则由 Factory 自身定义，不属于 ArcBlog 结算层（§29）。

---

## 8.3 质押（Stake）

> **质押 ≠ 注册。** 质押意味着运营者以资产为节点的持续运营背书，这比"填表注册"更难伪造。

规则：

* **质押对象**：角色 NFT（可附加 token 数量）
* **质押方向**：质押到对应角色的 Factory
* **可追加质押**：stake 数量可以增加；数量可作为容量或排序权重（具体公式由使用方解释，ArcBlog 不规定）
* **链上发现**：已质押节点构成网络发现的可信来源——其他节点可以通过链上 `listStakes(factory)` 发现节点，这是 §68 Discovery 协议的链上补充
* **全程留痕**：购买、质押、撤销、取回，每一步都记录交易哈希

### 质押时写入的 NFT data（链上公开元数据）

质押不是只锁一个资产地址——质押时运营者同时把节点的**展示信息**写入 NFT data：

```text
endpoint       节点访问地址
name           节点名称
description    节点描述
icon           节点图标
category       节点分类
```

用途：

```text
链上 listStakes(factory)
  ↓
批量解析 NFT data
  ↓
发现方直接渲染节点列表（图标 / 名称 / 描述 / 分类 / endpoint）
```

也就是说：

> 发现页不需要逐个请求节点，就能获得一个可渲染、可筛选的节点列表。

约束：

* **质押中不可修改**：NFT data 在质押状态下锁定，修改需先撤销质押并取回（§8.4）——保证"被质押背书的信息"与"实际展示的信息"始终一致，防止质押后偷换身份
* **自我声明，如实标注**：这些字段是运营者自我声明——质押担保的是"持续运营的诚意"，不担保"内容质量"；展示方应将其标注为节点自述信息，而不是平台认证
* **icon 必须可公开访问**：使用公开 URL 或内联 data，不依赖任何节点的登录态
* **分类是受控词表**：category 从协议约定的分类集合中选择（与 §12 资源模型的分类体系对齐），避免自由文本导致筛选失效

---

## 8.4 解除质押与取回（Revoke & Claim）

解除质押**不是单步操作**，必须分两阶段：

```text
Staked
  ↓ 撤销质押（revoke）
Revoking（等待期）
  ↓ 等待期结束
Claimable
  ↓ 取回质押（claim）
Acquired（资产回到钱包，可重新质押）
```

规则：

* **能力立即降级**：revoke 生效时角色能力即被撤销——防止恶意节点质押着作恶到最后一个块
* **资产锁定到等待期结束**：等待期内不可取回，给网络一个窗口来结算进行中的经济活动、同步失效标记
* **取回后可再次质押**：角色可以重新激活，资产不需要重新购买
* **等待期时长**属于 Factory / 角色配置，不硬编码

---

## 8.5 角色生命周期状态机

```text
None
  ↓ 购买（§8.2）
Acquired
  ↓ 质押（§8.3）
Staked（角色激活）
  ↓ 撤销质押（§8.4）
Revoking
  ↓ 等待期结束 → 取回质押
Acquired
```

| 状态 | 含义 | 节点能力 | 可执行操作 |
| ------ | --------------- | ---------------- | -------------------- |
| none | 未持有 NFT | 仅 Basic | 购买 |
| acquired | 已持有未质押 | 仅 Basic | 质押 |
| staked | 已质押，角色激活 | Basic + 角色能力 | 追加质押、撤销质押 |
| revoking | 已撤销，等待期内 | 仅 Basic | 等待（倒计时可见） |
| claimable | 等待期结束 | 仅 Basic | 取回质押 |

§10 的 `RoleStatus` 相应扩展：

```typescript
interface RoleStatus {
  role: 'studio' | 'hub'
  assetOwned: boolean
  stakeActive: boolean
  stakeState: 'none' | 'staked' | 'revoking' | 'claimable'
  active: boolean
  assetId?: string
  stakeId?: string
  revokedAt?: string
  claimableAt?: string
  checkedAt: string
}
```

---

## 8.6 角色退出时的数据承诺

能力会失去，数据不会消失：

```text
内容    Studio 降级不影响已发布内容（与 §75 Hub 离线同理，内容属于创作者）
经济    进行中的订单按当时 settlement version 完成结算（§29）
网络    Hub 注册关系标记失效，索引侧记录 Tombstone（§119）
身份    Node DID 与 Discovery Document 保留，roles 字段即时更新
```

退出规则的可预期性，是去中心化网络信任的一部分：

> 运营者必须能在加入之前就知道如何离开。

---

# 9. NFT 配置必须外部化

禁止：

```typescript
const STUDIO_NFT = 'hard-coded-address'
```

应该：

```typescript
interface RoleAssetConfig {
  role: 'studio' | 'hub'
  collectionAddress: string
  network: string
  assetType: string
}
```

配置：

```yaml
roles:

  studio:
    asset:
      collectionAddress: ${ARCBLOG_STUDIO_COLLECTION}
      network: ${ARCBLOG_NETWORK}

  hub:
    asset:
      collectionAddress: ${ARCBLOG_HUB_COLLECTION}
      network: ${ARCBLOG_NETWORK}
```

这样未来可以升级 NFT Collection，而不需要重写 ArcBlog。

---

# 10. Role Engine

ArcBlog 必须有统一的 Role Engine。

```text
Identity
   ↓
Asset Ownership
   ↓
Stake Status
   ↓
Role
   ↓
Capability
```

核心接口：

```typescript
interface RoleStatus {
  role: 'studio' | 'hub'

  assetOwned: boolean

  stakeActive: boolean

  active: boolean

  assetId?: string

  stakeId?: string

  checkedAt: string
}
```

---

# 11. Capability Engine

不要在代码中大量出现：

```typescript
if (isHub) {}
if (isStudio) {}
```

应该：

```text
Role
 ↓
Capability
```

例如：

```text
blog.read
blog.write
blog.publish

studio.publish
studio.register
studio.rss
studio.payments

hub.discovery
hub.index
hub.search
hub.aggregate
hub.route
hub.recommend
```

角色只是 Capability 的来源。

---

# 12. AFS 资源模型

ArcBlog 应该把主要资源映射到 AFS。

示意：

```text
/arcblog
│
├── /node
│   ├── profile
│   ├── identity
│   └── capabilities
│
├── /content
│   ├── articles
│   ├── pages
│   ├── media
│   └── categories
│
├── /studio
│   ├── profile
│   ├── registrations
│   └── publishing
│
├── /hub
│   ├── studios
│   ├── index
│   ├── topics
│   └── discovery
│
├── /economy
│   ├── products
│   ├── payments
│   ├── tips
│   ├── purchases
│   └── settlements
│
└── /config
    ├── site
    ├── theme
    └── network
```

这些是 ArcBlog 的**逻辑资源模型**。

实际 Provider 如何实现，需要根据当前 ARC AFS Provider 合同决定。

不能假定每个路径自动支持：

```text
list
read
write
search
exec
```

必须依据 Provider 实际声明的 capability。

---

# 13. AFS Provider 设计

ArcBlog 不应该把所有东西做成一个 Provider。

建议：

```text
ArcBlog Providers

├── Content Provider
├── Media Provider
├── Node Provider
├── Hub Provider
├── Economy Provider
└── Payment Provider
```

但 MVP 不需要真的拆成这么多 npm package。

可以先实现为模块：

```text
providers/
├── content
├── media
├── node
├── hub
└── economy
```

以后根据 ARC Provider 合同再拆分。

---

# 14. AUP：管理后台

ArcBlog 管理后台属于交互式应用。

因此：

> 管理后台应该优先采用 AUP，而不是把整个后台当成传统 HTML 页面。

AUP 用于表达：

* UI tree
* Node
* Event
* State
* Binding
* Session
* Capability

当前 ARC 中 AUP 的 `src`、`bind`、`propBind` 和事件分别对应不同的数据关系和操作，不应简单理解为普通 React props。

---

# 15. Admin UI

## 15.1 设计原则

> 实现落点（重构后）：管理后台是**单个 AUP 页面**（`?page=console`）+ **15 个节**（`view console-sections mode=tabs` 的页签面板）+ **hash 深链**（`?page=console#admin`）。侧栏由 `scripts/console-nav.mjs` 生成、是 hash 链接；`.web/components/console-bridge/` 负责就地切换、前进后退与旧链接迁移；旧页名保留极简别名页。点击去向与平台约束见 UI 标准 §2.3/§2.6 与 `docs/arc-contracts.md` §21.14。

管理后台是节点运营者每天使用的工具，设计必须同时满足：

```text
全面    —— 覆盖 Basic / Studio / Hub 三种角色的全部运营场景
简单    —— 一级菜单不超过 7 个，任何功能最多两次点击到达
实用    —— 每个页面只有一个主操作，高频操作优先于低频配置
优雅    —— 按 Capability 显示菜单，没有的功能不显示，而不是禁用置灰
```

三条硬规则：

1. **菜单由 Capability 驱动**（§11、§58）：Basic 节点看不到「网络」「经济」菜单；Studio 解锁「网络 → Hub 注册」和「经济」；Hub 解锁「网络 → Hub 管理」。同一套代码，同一套界面，按能力展开。
2. **隐藏而不是禁用**：节点没有某能力时，对应菜单项不渲染。界面永远只呈现"你现在能做什么"。
3. **配置收敛在设置**：所有低频、一次性、危险的配置（角色 NFT、收款地址、支付 Adapter）只出现在「设置」中，不污染日常运营菜单。

界面层的可执行标准（布局、Token、组件、状态、验收清单）见 [ArcBlog-admin-ui-design.md](ArcBlog-admin-ui-design.md)。

---

## 15.2 菜单结构总览

```text
ArcBlog Admin
│
│   （一个菜单项只承载一件事；不出现"与 / &"并列菜单——UI 标准 §2.3）
│
├── 概览  Dashboard
│
├── 内容  Content
│   ├── 文章        Posts
│   ├── 页面        Pages
│   ├── 媒体        Media
│   └── 分类与标签  Taxonomy
│
├── 站点  Site
│   ├── 外观        Appearance
│   ├── 首页与推荐位 Home
│   ├── 推荐位      Heroes
│   ├── SEO         SEO
│   └── 分发        Feeds
│
├── 网络  Network                    (studio.* / hub.* capability)
│   ├── 节点身份    Node Identity
│   ├── Hub 注册    Registrations     (Studio)
│   └── Hub 管理    Hub Console       (Hub)
│
├── 经济  Economy                    (economy.manage capability)
│   ├── 商品        Products
│   ├── 订单        Orders
│   ├── 结算        Settlement
│   ├── 账本        Ledger
│   ├── 策略        Policy
│   └── 账户        Wallets
│
├── Agent                            (agent.* capability)
│   ├── 能力与工具  Capabilities & Tools
│   ├── 授权        Grants
│   └── 审计        Audit Log
│
└── 设置  Settings
    ├── 通用        General
    ├── 角色与能力  Roles & Capabilities
    └── 诊断与维护  Diagnostics
```

六个一级菜单 + 概览，对应六类运营心智：

```text
我现在的状态 → 概览
我写什么     → 内容
我的站什么样 → 站点
我连接谁     → 网络
我赚了多少   → 经济
AI 能做什么  → Agent
底层怎么配   → 设置
```

---

## 15.3 概览 Dashboard

一句话定位：

> 三十秒内回答"节点健康吗？内容怎么样？钱到账了吗？"

**功能目标：**

* **存在理由**：运营者打开后台的第一个问题永远是"现在一切正常吗"。Dashboard 是唯一不需要任何前置知识就能读懂的页面，是所有其他页面的路由中枢。
* **服务结果**：让运营者无需进入任何子页面，即可完成日常巡检——节点在线、角色正常、内容在增长、经济在运转、Agent 可用。
* **达成标准**：任何异常（同步失败、结算失败、授权过期）都能在 30 秒内被发现，并且一次点击直达处理页面；Dashboard 不产生操作闭环，只做概览与跳转——它越"无聊"，说明节点越健康。

功能：

* **节点状态卡**：Online、版本、Node DID、协议版本
* **角色状态卡**：Basic / Studio / Hub，激活状态 + Stake 状态，未激活时给出引导入口（而不是报错）
* **内容概览**：已发布 / 草稿 / 归档数量，最近发布列表，一键「写新文章」
* **网络概览**（按角色）：Studio 显示已注册 Hub 数与同步状态；Hub 显示已索引 Studio 数与文章数
* **经济概览**：今日 / 累计打赏、付费阅读、收入；最近订单
* **Agent 状态**：MCP / AFS RPC 可用性，活跃授权数
* **异常提醒**：同步失败、结算失败、授权即将过期——以一条可点击的提醒条呈现，不做弹窗

Dashboard 只做概览与跳转，不做操作。所有操作进入对应菜单完成。

---

## 15.4 内容 Content

### 文章 Posts

后台最高频页面，按"状态即视图"组织：

```text
全部 | 已发布 | 草稿 | 归档 | 回收站
```

**功能目标：**

* **存在理由**：写作与发布是 Studio 存在的根本目的，文章页必须把整个后台最低的操作摩擦留给它。
* **服务结果**：让创作者以最低成本完成"写 → 审 → 发 → 维护"的完整生命周期，并保证每篇发布内容的元数据（作者、分类、标签、封面、可见性）完整，可被 Hub 正确索引、被读者正确消费。
* **达成标准**：从空白草稿到发布上线不超过 3 个页面；任何状态变化可追踪、可回退（软删除 + 版本）；绝不出现"发布了但 Hub 索引不到"的元数据残缺文章。

功能：

* 列表：标题、状态、分类、标签、作者、发布时间、付费模式
* 编辑器：Markdown-first，封面图、摘要、Slug、SEO 字段、可见性（public / unlisted / members / paid / private）
* 生命周期：`草稿 → 发布 → 归档 → 重新发布`，`草稿|归档 → 回收站`（软删除）
* 付费绑定：文章不直接写价格，只关联一个 Product（§45）
* 预览：草稿生成预览链接，公开前可分享审阅
* 批量操作仅限低风险动作：归档、移入回收站；发布与删除必须逐条确认

### 页面 Pages

管理 About、Support 等独立页面：

**功能目标：**

* **存在理由**：站点需要少量"不属于信息流"的独立页面，它们不该套用文章的分类、标签、生命周期。
* **服务结果**：让运营者像编辑文档一样维护静态页面，而不污染文章列表与 Hub 索引。
* **达成标准**：页面系统与文章系统完全解耦——只有「发布 / 下线」两个状态；页面不进入 RSS、不进入 Hub 内容索引。

功能：

* 页面列表 + Markdown 编辑
* Slug 与导航可见性
* 页面不复用文章生命周期，只有「发布 / 下线」两个状态

### 媒体 Media

**功能目标：**

* **存在理由**：媒体是唯一会持续堆积、且删除有副作用的资产（被引用的图不能删），必须可见、可查、可追责。
* **服务结果**：让每一份上传资产都能回答"它在哪、被谁用了、还能不能删"；让运营者敢于清理，而不是让存储无声膨胀。
* **达成标准**：任何媒体都能查到完整的引用列表；删除操作对有引用的媒体必须拦截或警告；未引用媒体可以被一键筛出。

功能：

* 上传（拖拽 / 粘贴）、列表与网格两种视图
* 查看引用：某张图被哪些文章 / 页面 / 推荐位使用
* 未引用媒体清理提示
* 复制地址（AFS 路径与公开 URL）

### 分类与标签 Taxonomy

**功能目标：**

* **存在理由**：分类是受控词表（白名单，影响发布校验与 Hub 索引），标签是自由词（描述性、可泛滥），两者治理方式完全不同，必须分别管理。
* **服务结果**：让站点拥有一套稳定、克制的分类结构，同时允许标签自由生长但可定期收敛。
* **达成标准**：分类变更（改名、合并、删除）绝不产生"悬空分类"的文章；标签可以随时合并收敛而不影响任何文章的可访问性。

功能：

* 分类：创建、排序、编辑描述、合并；删除分类前必须迁移其下文章
* 标签：使用计数、合并重命名、清理零引用标签
* 分类是白名单（影响发布校验），标签是自由词——界面必须区分这两者，不混在一个表格里

---

## 15.5 站点 Site

### 外观 Appearance

**功能目标：**

* **存在理由**：视觉是站点的门面，但主题绝不能成为业务逻辑的载体（§105），外观页必须把这层边界护住。
* **服务结果**：让运营者在不写代码的前提下完成站点视觉定制——选主题、调色调、换 Logo，全程实时预览。
* **达成标准**：任何外观修改只改变呈现层，内容数据零影响；所有修改可预览、可回退到上一状态；切换主题后无需逐页检查内容完整性。

功能：

* 主题选择（Minimal / Magazine / Photography / …，§104）
* Tone / Palette / Mode 配置，实时预览
* Logo、站点图标
* 主题只改呈现，不改内容与业务逻辑（§105）

### 首页与推荐位 Home & Heroes

**功能目标：**

* **存在理由**：首页是站点唯一完全由运营者"策展"的页面——读者看到什么、先看到什么，是运营决策而不是算法结果。
* **服务结果**：让运营者把首页当作策展面管理：Hero 推什么、哪些模块出现、以什么顺序出现，全部可视化配置、即时生效。
* **达成标准**：Hero 与模块的任何调整不需要发布流程，保存即上线；配置始终与节点角色匹配（Studio 节点不会出现 Hub 首页模块）。

功能：

* 首页 Hero 轮播管理：排序、标题、描述、图片、跳转链接
* 首页模块开关：Featured / Latest / Topics 等区块的显隐与排序
* 按角色显示：Studio 节点配置 Studio Home，Hub 节点配置 Hub Home（§55–§57）

### SEO / 分发面 SEO & Feeds

> 实现落点：`seo-admin`（站点元数据）与 `feeds-admin`（RSS / 文章索引 / Agent 访问说明）两个独立页面——菜单一项只承载一件事（UI 标准 §2.3）。

**功能目标：**

* **存在理由**：内容的四个分发面——搜索引擎、社交分享、RSS 阅读器、AI Agent——各有元数据要求，散落配置必然顾此失彼。
* **服务结果**：把"技术性 SEO"收敛为一页配置 + 自动默认值：站点级配置一次，文章级自动继承，特殊文章可单独覆盖。
* **达成标准**：任何一篇新文章在不做任何额外配置的情况下，都具备合法的 OG 卡片、Sitemap 条目、RSS 条目和 llms.txt 可见性；分享前可在后台预览卡片实际效果。

功能：

* 站点标题、描述、默认 OG 图、分享卡片预览
* Sitemap / Canonical 状态
* RSS / Atom 开关与地址
* llms.txt 与 Agent 可见性声明的预览

---

## 15.6 网络 Network

### 节点身份 Node Identity

所有角色可见，是网络菜单的基础页：

**功能目标：**

* **存在理由**：在去中心化网络中，节点没有平台账号，它的"名片"就是 Node Profile + DID + Discovery Document——此页维护的是节点对外的公开身份。
* **服务结果**：让节点在网络中"可被识别、可被发现、可被验证"；运营者能随时确认其他节点看到的自己是什么样。
* **达成标准**：此页的任何修改都会正确反映到 Discovery Document（§69）并对网络可见；Node Health 自检失败时必须给出具体失败项，而不是一个笼统的红点。

功能：

* Node Profile：名称、描述、头像、Endpoint
* Node DID 与身份建立方式
* Discovery Document（§69）预览与发布状态
* Node Health（§110）：自检结果、版本、角色、能力清单

### Hub 注册 Registrations（Studio）

**功能目标：**

* **存在理由**：Studio 接入网络的唯一方式是注册到 Hub；多 Hub 注册是防止 Hub 垄断的关键机制（§94），注册与退出必须完全自助。
* **服务结果**：让 Studio 以自助方式完成"发现 Hub → 申请收录 → 被索引"的闭环（§70.1），并随时掌握每个 Hub 的同步健康度；同时能看见哪些 Hub 主动收录了自己（§70.2）。
* **达成标准**：注册一个新 Hub 不需要离开此页面、不需要人工审批交互；每个 Hub 的同步状态一目了然；注册关系随时可加可删，删除立即生效且不影响其他 Hub。

功能：

* 收录关系列表：已收录 / 申请中（applied）/ 已终止，含最近同步、同步版本、错误信息（§112、§70.3）
* 申请收录：从链上质押列表选择（展示名称、图标、描述、分类，§8.3）或手动输入 Hub 地址 → 验证 → 提交申请 → Hub 审核（§70.1）
* 被收录列表：哪些 Hub 主动收录了我（§70.2），可查看、可退出
* 移除 / 退出 Hub
* 每个 Hub 一行状态，失败可手动重试；绝不允许一个 Hub 的失败阻塞其他 Hub（§113）

### Hub 管理 Hub Console（Hub）

**功能目标：**

* **存在理由**：Hub 的核心运营动作是"接入 Studio、维护索引、策展内容"，这三件事决定了一个 Hub 在网络中的竞争力（§53、§95）。
* **服务结果**：让 Hub 运营者完成从 Studio 接入到内容策展的日常运营闭环；索引健康度（同步滞后、hash 漂移、失效文章）始终可见。
* **达成标准**：Hub 只管理元数据与派生数据，任何界面都不提供"编辑 Studio 原文"的能力（§74、§118）；索引异常可定位到具体 Studio 与具体文章。

功能：

* **Studio 管理**：已收录 Studio 列表——展示链上 NFT data 声明的名称、图标、描述、分类与质押量（§8.3，标注为节点自述信息）、验证状态、同步状态、索引量
* **主动收录**：从链上质押列表发现 Studio 并直接收录（§70.2）
* **收录申请**：Studio 申请列表（§70.1），逐条通过 / 拒绝；拒绝即终止，不进入排队
* **内容索引**：已索引文章的元数据、contentHash、版本比对、失效 / Tombstone 记录（§119）
* **Topics**：主题创建、编辑、收录文章
* **推荐策略**：Featured / Trending / Latest 的人工策展；推荐策略选择（editorial / popularity / ai，§52）
* **付费推广标记**：Sponsored 内容必须与自然发现内容明确区分（§51）

---

## 15.7 经济 Economy

### 商品 Products

**功能目标：**

* **存在理由**：Product 是"可销售的东西"的统一抽象（§39），也是内容与价格之间的隔离层（§45）——没有它，改一次价格就要动一次文章。
* **服务结果**：让创作者管理自己的全部可售商品：定价、上下架、关联内容，全部围绕 Product 而不是围绕文章进行。
* **达成标准**：改价、下架不影响任何已成交订单；一篇文章从免费改为付费（或反向）只需要调整绑定关系，文章内容本身零修改。

功能：

* 商品列表：类型（article / membership / digital / subscription）、价格、资产、可见性、关联内容
* 创建 / 编辑 / 上下架
* 价格改在商品上，不动文章（§45）；历史订单按当时价格与分成版本结算（§29）

### 订单 Orders

**功能目标：**

* **存在理由**：订单是经济系统的唯一入口事实，经济透明性（§50）要求任何一笔钱都能被完整追问。
* **服务结果**：让运营者对每一笔收入拥有完整的追踪与处置能力：pending 能催查、failed 能定位原因、refund 能正确执行。
* **达成标准**：任何订单详情页都能完整回答六个问题——谁付款、谁获益、哪个 Hub、什么规则、何时结算、交易哈希；退款走"原订单 + 退款事件 + 结算冲正"，账本永不出现数据消失（§90、§92）。

功能：

* 订单列表：买家 DID、商品、金额、资产、状态（pending / paid / failed / refunded）、Hub 归属、时间
* 订单详情必须能完整回答 §50 的六个问题：谁付款、谁获益、哪个 Hub、什么规则、何时结算、交易哈希
* 退款操作：产生 Refund Event + 结算冲正，绝不删除原订单（§90、§92）

### 结算与账本 Settlement & Ledger

**功能目标：**

* **存在理由**：Payment 回答"钱付了吗"，Settlement 回答"钱给谁了"（§89）——后者必须有一个独立的、只增不改的事实来源。
* **服务结果**：让"钱去了哪"完全透明：每笔结算的三方分配、策略版本、链上凭证可逐条核验，账本支持按类型与时间筛选导出。
* **达成标准**：账本是 append-only 的唯一事实来源（§92），界面不提供任何修改或删除入口；任何一条账本记录都能关联回原始订单与结算。

功能：

* 结算列表：Creator / Hub / Protocol 三方金额、策略版本、状态、交易哈希
* 账本（append-only）：按类型（payment / tip / creator_share / hub_share / protocol_fee / refund / settlement）筛选，分页浏览
* 打赏与付费阅读分开统计（§36）

### 策略与账户 Policy & Wallets

**功能目标：**

* **存在理由**：经济系统的"规则与钱袋"必须集中且克制——分成规则版本化（§29）、收款地址分角色隔离（§47、§48）、支付通道可替换（§44），散落任何一处都是事故。
* **服务结果**：让运营者在一个页面管理全部经济规则：当前分成版本、各方收款账户、支付适配器状态；规则变更只新增版本，永不修改历史。
* **达成标准**：策略变更只对未来订单生效，历史订单永远按当时的版本结算（§29）；Protocol Fee 如非 0，recipient 与比例在此页公开可查（§49）；任何账户地址变更都有确认环节，防止误改收款地址。

功能：

* 分成策略：当前版本、历史版本、比例（creator / hub / protocol），策略版本化，只新增不修改（§29）
* 收款账户：Creator / Hub 各自的钱包地址，按资产类型管理（§47、§48）
* Payment Adapter：当前支付适配器状态与配置入口（§44）
* Protocol Fee 如非 0，必须公开显示 recipient 与比例（§49）

---

## 15.8 Agent

### 能力与工具 Capabilities & Tools

**功能目标：**

* **存在理由**：Agent Access 意味着 AI 可以操作节点，运营者必须随时清楚"AI 现在能对我的节点做什么"，默认暴露面必须最小。
* **服务结果**：让 Agent 能力的边界完全可见、可控：每个工具的用途、所需权限、启用状态一屏呈现，默认只读，写工具逐项显式开启。
* **达成标准**：一个从未配置过 Agent 的节点，其暴露面等于"公开内容只读"；开启任何写工具都必须经过明确的启用动作，不存在隐式继承权限。

功能：

* ARC Runtime 提供的 Agent Access 表面状态：`/mcp`、`/api/afs/rpc`、`llms.txt`
* 已声明工具清单（§130）：每个工具的说明、所需权限级别、启用开关
* 默认只读；写工具默认关闭，逐项开启

### 授权 Grants

**功能目标：**

* **存在理由**：信任一个 Agent 不应该是"给它钥匙然后忘掉"，而是"明确授权什么、多久、如何收回"（§61）。
* **服务结果**：把"信任哪个 Agent、信任到什么程度、信任多久"变成显式的授权记录：最小权限、默认短期、随时可撤销。
* **达成标准**：每一条授权都有明确的过期时间，过期即失效无需人工清理；撤销立即生效；高风险能力（publish / economy）签发时必须二次确认；`agent.admin` 在界面上根本不存在授权入口（§130）。

功能：

* 授权列表：Agent DID、能力（agent.read / write / publish / economy）、有效期、状态
* 签发新授权：选择能力 + TTL，最小权限、默认短期
* 撤销授权：立即生效
* 高风险能力（publish / economy）必须二次确认；`agent.admin` 不可授予（§61、§130）

### 审计 Audit Log

**功能目标：**

* **存在理由**：当 AI 可以替你写作、发布、运营时，"它到底做了什么"必须有一个不可抵赖的答案（§62）。
* **服务结果**：让每一次 Agent 操作可追溯、可问责：谁在什么时间、以什么身份、调用了什么工具、结果如何。
* **达成标准**：审计日志是判定"AI 做了什么"的最终依据——只增不改，界面无任何编辑入口；任何一条记录都能关联到具体的 Agent DID 与当时的授权记录。

功能：

* Agent 操作日志：时间、Agent 身份、Caller DID、工具、参数摘要、结果
* 按 Agent / 工具 / 时间筛选
* 审计日志只增不改

---

## 15.9 设置 Settings

### 通用 General

**功能目标：**

* **存在理由**：站点级基础配置（名称、语言、时区、功能总开关）必须有一个唯一的、可预期的归属地，而不是散落在各个功能页面里。
* **服务结果**：让运营者在唯一的位置完成站点基础设置与功能开关管理。
* **达成标准**：任何"这个开关在哪"的问题，答案都是这里；开关变更即时生效且影响范围在界面上写清楚。

功能：

* 站点名称、语言、时区
* Instance 级开关：评论、RSS、Agent Access 总开关

### 角色与能力 Roles & Capabilities

**功能目标：**

* **存在理由**：角色的来源是链上资产 + Stake（§8、§10），运营者需要理解"我的节点为什么有这个能力、为什么失去那个能力"，而不是面对一个神秘的功能开关。
* **服务结果**：让角色状态完全透明：资产持有、Stake 状态、激活状态、验证时间逐级可见；验证失败时给出明确原因与修复路径。
* **达成标准**：角色 NFT 配置来自外部化配置（§9），此页只读展示 + 重新验证，绝不允许在界面手填地址；从购买到质押激活的完整引导在此页闭环，不跳出后台；等待期倒计时可见，任何角色状态变化后能力清单的变化立即可见且可解释。

功能：

* Role Engine 状态（§10）：资产持有、Stake 状态、激活状态、最近验证时间
* 角色 NFT 配置：Collection 地址、网络——来自外部化配置（§9），界面只读展示 + 重新验证按钮，绝不允许在界面里手填地址
* Factory 信息与购买入口：Factory 卡片（名称、价格、计价资产、供应上限、已发行量，§8.1）+ 购买引导（§8.2），余额不足时明确提示所需数量
* 质押操作：质押、追加质押、撤销质押、取回质押（§8.3、§8.4），每步显示交易哈希；等待期内显示取回倒计时
* NFT data 设置：质押时填写名称、描述、图标、分类与 endpoint（§8.3）；质押中字段锁定只读并明确标注原因，修改需先撤销取回
* 角色生命周期视图：none / acquired / staked / revoking / claimable 五态当前位置与下一步可执行操作（§8.5）
* 能力清单：当前节点拥有的全部 Capability 一览

### 诊断与维护 Diagnostics

**功能目标：**

* **存在理由**：自托管节点没有平台运维团队，运营者自己就是运维——诊断页必须把"登录服务器敲命令"的门槛降到"在后台点几下"。
* **服务结果**：让运营者在不接触服务器的情况下完成健康自检、后台任务监控、日志导出与数据备份。
* **达成标准**：常见问题（同步失败、权限异常、存储膨胀）在此页可自助定位并获得修复指引；数据导出可随时进行，格式可迁移——任何人都能带着自己的数据离开（§140、§141）。

功能：

* 自检：资源完整性、权限矩阵、存储状态（对应 doctor 类检查）
* 同步与后台任务状态（cron / Sync Scheduler，§111）
* 日志查看与导出
* 数据导出 / 备份入口

---

## 15.10 菜单与角色对照

| 菜单 | Basic | Studio | Hub | Studio + Hub |
| ---- | :---: | :----: | :-: | :----------: |
| 概览 | ● | ● | ● | ● |
| 内容 | ● | ● | ● | ● |
| 站点 | ● | ● | ● | ● |
| 网络 → 节点身份 | ● | ● | ● | ● |
| 网络 → Hub 注册 | — | ● | — | ● |
| 网络 → Hub 管理 | — | — | ● | ● |
| 经济 | — | ● | ● | ● |
| Agent | ● | ● | ● | ● |
| 设置 | ● | ● | ● | ● |

这正是 §58「不要复制两套前端」在菜单层的落点：

```text
One Admin UI
      │
      ├── Basic capability    → 内容 + 站点
      ├── Studio capability   → + Hub 注册 + 经济
      └── Hub capability      → + Hub 管理 + 经济
```

---

# 16. Dashboard

Dashboard 显示：

```text
ArcBlog

Node
● Online

Identity
DID: ...

Roles

Studio
● Active

Hub
○ Inactive

Content

Published: 128
Drafts: 7

Network

Studios: 53
Indexed Posts: 12,438

Economy

Tips: 32
Paid Reads: 86
Revenue: ...

Agent

MCP
● Available
```

---

# 17. Web Device：公共 Blog

ArcBlog 的公开 Blog 应使用 Web Device。

Web Device 当前模型把站点分为：

```text
pages/
content/
.web/
.route/
```

其中：

* `pages/`：页面与 layout
* `content/`：内容对象
* `.web/`：站点配置、组件、主题
* `.route/`：Web 入口

因此 ArcBlog 的 Public Site 不应该简单做成一个传统 SPA。

---

# 18. 推荐的 Web Device Site

```text
site/
│
├── .route/
│   └── web
│
├── .web/
│   ├── site.yaml
│   ├── theme.yaml
│   ├── tokens/
│   ├── components/
│   └── assets/
│
├── pages/
│   ├── home/
│   ├── explore/
│   ├── studios/
│   ├── topics/
│   ├── about/
│   └── post/
│
└── content/
    ├── articles/
    ├── pages/
    └── authors/
```

---

# 19. Article Content Object

一篇文章应该被设计成内容对象，而不是简单数据库记录。

例如：

```text
content/
└── articles/
    └── hello-arcblog/
        ├── content.md
        ├── cover.png
        ├── tags/
        └── related/
```

Web Device 当前也是以目录化内容对象作为文章、文档等内容的组织方式。

---

# 20. Article Metadata

例如：

```yaml
---
title: Hello ArcBlog
slug: hello-arcblog
author: did:...
date: 2026-09-23
status: published
visibility: public
tags:
  - ARC
  - ArcBlog
layout: article
---
```

以后增加：

```yaml
economy:
  mode: free
```

或者：

```yaml
economy:
  mode: paid
  price:
    amount: 2
    asset: USDC
```

---

# 21. 内容可见性

ArcBlog 支持：

```text
public
unlisted
members
paid
private
```

---

# 22. 免费内容

```text
Reader
   ↓
Article
   ↓
Read
```

Hub 可以索引：

```text
Metadata
+
Content
```

---

# 23. 付费内容

付费文章：

```text
Reader
   ↓
Article
   ↓
Preview
   ↓
Pay
   ↓
Payment Verification
   ↓
Access
   ↓
Full Content
```

---

# 24. 付费内容不应该直接依赖前端隐藏

禁止：

```text
HTML contains full article
CSS hides paid section
```

必须：

```text
Public Resource
      ↓
Preview only

Authenticated Reader
      ↓
Payment Proof
      ↓
Access Token / Capability
      ↓
Full Content
```

---

# 25. Economy Layer

ArcBlog 的经济层是 V2 设计中的核心。

ArcBlog 不只是博客。

它是：

> **Creator Economy + Content Network**

经济行为包括：

```text
Tip
Paid Reading
Subscription
Membership
Donation
Digital Product
Sponsored Content
```

MVP 先实现：

```text
Tip
Paid Reading
```

---

# 26. 经济参与者

ArcBlog 至少存在三个经济角色：

```text
Creator
Hub
Reader
```

未来可以增加：

```text
Referrer
Agent
Service Provider
```

---

# 27. 为什么 Hub 应该参与分成

Hub 不应该只是：

```text
免费索引服务器
```

否则很难形成持续运营的网络。

Hub 实际承担：

* Discovery
* Index
* Search
* Recommendation
* Traffic
* Curation
* Network Service
* Economic Routing

因此：

> 当 Hub 为 Studio 带来实际经济活动时，Hub 可以获得相应网络服务收益。

---

# 28. 经济模型

一次经济活动：

```text
Reader
   ↓
Hub
   ↓
Studio
   ↓
Content
```

支付：

```text
Reader Payment
       │
       ↓
Settlement Engine
       │
       ├── Creator Share
       │
       ├── Hub Share
       │
       └── Protocol / Network Share
```

---

# 29. Revenue Split

ArcBlog 不把分成比例写死在代码中。

配置：

```yaml
economy:

  settlement:

    creator: 0.80
    hub: 0.15
    protocol: 0.05
```

**以上仅作为初始建议参数，正式上线前应根据实际经济模型调整。**

更重要的是：

> 分成规则必须版本化。

例如：

```text
settlement-v1
settlement-v2
```

历史订单永远按照当时的 settlement version 结算。

---

# 30. Hub Share

Hub 收益不是因为“拥有文章”。

Hub 获得收益的依据是：

> **Hub 为该经济活动提供了可验证的发现、推荐或交易入口服务。**

例如：

```text
Reader
  ↓
Alice Hub
  ↓
Bob Studio
  ↓
Paid Article
```

订单记录：

```json
{
  "creator": "did:bob",
  "hub": "did:alice-hub",
  "amount": "10",
  "asset": "USDC",
  "settlementVersion": "v1"
}
```

---

# 31. Hub Attribution

必须解决：

> Reader 从哪个 Hub 进入？

建议设计：

```text
Discovery Context
```

例如：

```text
Hub
 ↓
Article URL
 ↓
Signed Discovery Context
 ↓
Reader
 ↓
Payment
```

不能单纯依赖：

```text
HTTP Referer
```

因为它不可靠。

---

# 32. Discovery Context

示意：

```json
{
  "hubDid": "did:...",
  "studioDid": "did:...",
  "contentId": "...",
  "issuedAt": "...",
  "expiresAt": "...",
  "signature": "..."
}
```

用户进入文章时：

```text
Hub
 ↓
Discovery Context
 ↓
Studio
```

Studio 在支付时可以验证：

```text
Hub DID
Signature
Content
Timestamp
```

---

# 33. 防止 Hub 恶意抢收益

Hub 不能仅仅声称：

```text
"这是我的用户"
```

必须有：

```text
Discovery Proof
```

建议：

```text
Hub signs discovery
        ↓
Studio verifies
        ↓
Payment settlement
```

---

# 34. 直接访问 Studio

如果用户直接进入：

```text
https://alice.example/posts/xxx
```

没有 Hub attribution：

```text
Creator
   80%
Hub
   0%
Protocol
   20% / according to config
```

实际比例由当前 settlement policy 决定。

如果通过 Hub：

```text
Creator
   80%

Hub
   15%

Protocol
   5%
```

这样可以形成：

> Hub 有动力持续为 Studio 带来真实用户。

---

# 35. Tip 打赏

用户看到文章：

```text
❤️ Support Author
```

点击：

```text
Tip
```

选择：

```text
1
5
10
20
Custom
```

然后：

```text
Wallet / Payment
       ↓
Settlement
       ↓
Creator
Hub
Protocol
```

---

# 36. Tip 与 Paid Reading 的区别

## Tip

用户不购买内容。

```text
Content
 ↓
Free
 ↓
Tip
```

## Paid Reading

用户购买内容访问权：

```text
Content
 ↓
Preview
 ↓
Payment
 ↓
Access
```

---

# 37. Paid Reading Access

支付成功后产生：

```text
Access Grant
```

例如：

```json
{
  "contentId": "...",
  "readerDid": "...",
  "orderId": "...",
  "grantedAt": "...",
  "expiresAt": null
}
```

如果是永久阅读：

```text
expiresAt = null
```

---

# 38. Subscription

第二阶段支持：

```text
Subscribe Creator
```

例如：

```text
$5 / month
```

模型：

```text
Reader
 ↓
Creator Subscription
 ↓
Recurring Settlement
 ↓
Creator + Hub
```

但 MVP 暂不实现自动周期扣款。

第一版先实现：

```text
manual renewal
```

避免引入复杂支付生命周期。

---

# 39. Creator Store

> 实现落点：公开商店页 `store`（AUP 页 + `/store` 绑定，guest 可读）。它只是**商品目录**（id / 价格+币种 / 类型 / 关联内容），不含收银台——购买仍是「下单 → 适配器支付 → 结算分账 → Access Grant 解锁」的既有链路（`arcblog-economy.mjs`）。目录只列 `visibility=public` 的商品（`filter={field: "content.visibility", match: public}`），私有商品不出现在商店。

未来 Studio 可以销售：

```text
Article
Photo
Video
Book
Preset
Course
Digital Asset
```

统一抽象：

```text
Product
```

---

# 40. Economy Data Model

核心：

```text
products
orders
payments
settlements
access_grants
tips
subscriptions
attributions
```

---

# 41. Product

```typescript
interface Product {
  id: string

  creatorDid: string

  type:
    | 'article'
    | 'membership'
    | 'digital'
    | 'subscription'

  contentId?: string

  price: {
    amount: string
    asset: string
  }

  visibility: 'public' | 'private'

  settlementPolicy: string

  createdAt: string
}
```

---

# 42. Order

```typescript
interface Order {
  id: string

  buyerDid?: string

  creatorDid: string

  hubDid?: string

  productId: string

  amount: string

  asset: string

  status:
    | 'pending'
    | 'paid'
    | 'failed'
    | 'refunded'

  settlementVersion: string

  createdAt: string
}
```

---

# 43. Settlement

```typescript
interface Settlement {
  orderId: string

  creatorAmount: string

  hubAmount: string

  protocolAmount: string

  asset: string

  policyVersion: string

  status:
    | 'pending'
    | 'settled'
    | 'failed'

  transactionHash?: string
}
```

---

# 44. Payment Adapter

不要把 ArcBlog Economy 写死成某一种支付方式。

定义：

```typescript
interface PaymentAdapter {

  createPayment(
    request: PaymentRequest
  ): Promise<PaymentIntent>

  verifyPayment(
    paymentId: string
  ): Promise<PaymentVerification>

  settle(
    settlement: SettlementRequest
  ): Promise<SettlementResult>
}
```

未来可以：

```text
Arc Payment
USDC
Other supported asset
External Payment
```

通过 Adapter 接入。

---

# 45. 不把支付金额直接写入文章

文章只描述：

```yaml
economy:
  mode: paid
  productId: product_xxx
```

真正的价格属于：

```text
Product
```

这样：

```text
Article
 ↓
Product
 ↓
Price
 ↓
Payment
```

未来可以修改价格，而不需要修改文章对象。

---

# 46. Hub Economy API

Hub 可以提供：

```text
GET /api/economy/discovery
POST /api/economy/attribution
```

但是 Hub 不应该直接控制 Creator 的钱包。

Hub 只参与：

```text
Attribution
Settlement
```

---

# 47. Creator Wallet

Creator 的收款地址应该属于 Creator Identity / payment configuration。

例如：

```json
{
  "creatorDid": "did:...",
  "paymentAccounts": [
    {
      "asset": "USDC",
      "address": "..."
    }
  ]
}
```

不能把收款地址硬编码在 Hub。

---

# 48. Hub Wallet

Hub 也拥有自己的经济账户。

```text
Hub DID
   ↓
Payment Account
   ↓
Hub Share
```

因此：

```text
Creator
Wallet

Hub
Wallet

Protocol
Wallet
```

彼此独立。

---

# 49. Protocol Fee

ArcBlog 本身是开源软件，因此第一阶段不应该强制设计一个中心化平台手续费。

建议：

```text
protocol fee = configurable
```

可以：

```text
0%
```

也可以未来：

```text
1%
5%
```

如果存在 Protocol Fee，必须公开：

```text
recipient
percentage
policy version
```

---

# 50. 经济透明性

任何订单都应该能够回答：

```text
谁付款？
谁获得收益？
哪个 Hub 参与？
按照什么规则分配？
什么时候结算？
交易哈希是什么？
```

因此订单应该具有：

```text
Order ID
Payment ID
Creator DID
Hub DID
Settlement Policy
Amounts
Transaction Hash
Timestamp
```

---

# 51. Hub 运营经济

Hub 的收益来自网络服务。

Hub 可以提供：

```text
Discovery
Search
Recommendation
Curation
Topic
Featured
```

未来可以增加：

```text
Sponsored Discovery
Premium Index
AI Search
Analytics
```

但是必须明确：

> 付费推广内容与自然发现内容需要区分。

---

# 52. 推荐机制

Hub 可以对文章建立：

```text
Featured
Trending
Latest
Popular
Recommended
```

但不要把推荐规则写死在 Protocol 中。

每个 Hub 可以拥有自己的：

```text
Recommendation Policy
```

例如：

```yaml
recommendation:
  strategy: editorial
```

或者：

```yaml
recommendation:
  strategy: popularity
```

或者：

```yaml
recommendation:
  strategy: ai
```

---

# 53. Hub 的真正价值

Hub 的价值不只是：

```text
文章列表
```

而是：

```text
Discovery
+
Index
+
Search
+
Recommendation
+
Curation
+
Economic Routing
```

因此 Hub 是 ArcBlog 网络中的：

> **内容发现节点 + 网络运营节点。**

---

# 54. Studio 的真正价值

Studio 是：

```text
Identity
+
Content
+
Audience
+
Economy
```

Studio 是 Creator 的数字内容空间。

---

# 55. Studio 页面结构

建议：

```text
/
├── Home
├── Featured
├── Latest
├── Popular
├── Topics
├── Archive
├── About
└── Support
```

---

# 56. Hub 页面结构

Hub 首页：

```text
/
├── Featured
├── Latest
├── Trending
├── Topics
├── Studios
├── Search
└── About Hub
```

---

# 57. 一个 ArcBlog Instance 如何切换首页

如果只有 Basic：

```text
Blog Home
```

如果 Studio：

```text
Studio Home
```

如果 Hub：

```text
Hub Home
```

如果 Studio + Hub：

```text
Studio Home
+
Explore
```

也可以：

```text
Home
Explore
Studio
```

---

# 58. 不要复制两套前端

禁止：

```text
StudioFrontend
HubFrontend
```

应该：

```text
ArcBlog UI
    │
    ├── Basic capability
    ├── Studio capability
    └── Hub capability
```

根据 Capability 显示页面。

---

# 59. Agent 原生设计

当前 ARC 上运行的 Blocklet 会提供 `/mcp`、`/.well-known/` 等 Agent Access 表面，同时也有 `/api/afs/rpc` 和 `/llms.txt` 等访问方式。ArcBlog 应利用 ARC Runtime 提供的 Agent Access，而不是重新设计一套独立 Agent 协议。

---

# 60. ArcBlog Agent

Agent 可以：

```text
Search Content
Read Article
Create Draft
Edit Draft
Publish
Search Studios
Search Topics
Analyze Analytics
Manage Products
```

---

# 61. Agent 权限

Agent 必须分级。

```text
agent.read
agent.write
agent.publish
agent.economy
agent.admin
```

默认：

```text
agent.read
```

高风险操作：

```text
publish
payment
settlement
settings
```

必须明确授权。

---

# 62. Agent 与 DID

Agent 操作应该保留：

```text
Caller
DID
Auth Method
Agent Identity
```

不要让：

```text
AI Agent
```

直接成为超级管理员。

---

# 63. AI 自动写作

未来可以：

```text
Agent
 ↓
Search
 ↓
Draft
 ↓
User Review
 ↓
Publish
```

不要默认：

```text
Agent
 ↓
Direct Publish
```

---

# 64. Hub AI

Hub 可以使用 AI 做：

```text
Topic classification
Tag extraction
Summary
Language detection
Related content
Semantic search
Recommendation
Spam detection
```

但 AI 产生的结果属于：

```text
Hub Derived Metadata
```

而不是：

```text
Creator Original Metadata
```

必须区分。

---

# 65. Content Provenance

一篇文章：

```text
Creator Content
       │
       ├── Content Hash
       │
       ├── Author DID
       │
       └── Signature
```

Hub：

```text
Hub Derived Metadata
       │
       ├── Topic
       ├── Summary
       ├── Recommendation
       └── Index
```

不能混淆。

---

# 66. Content Hash

发布时：

```text
Normalize
   ↓
Hash
   ↓
Content Hash
```

例如：

```text
sha256:xxxx
```

Hash 用于：

* 内容完整性
* Hub 同步
* 版本比较
* Provenance
* 防止内容被悄悄修改

---

# 67. Content Signature

进一步：

```text
Content
 ↓
Hash
 ↓
Creator DID
 ↓
Signature
```

形成：

```text
Signed Content
```

Hub 可以验证：

```text
Signature
Author DID
Content Hash
```

---

# 68. Hub Discovery Protocol

ArcBlog 定义：

```text
ArcBlog Discovery Protocol
```

简称：

```text
ABDP
```

第一版最小协议：

```text
GET /.well-known/arcblog
GET /api/profile
GET /api/posts
GET /api/posts/:id
GET /api/health
```

---

# 69. Discovery Document

示意：

```json
{
  "protocol": "arcblog",
  "version": "1",

  "node": {
    "did": "did:...",
    "name": "Alice Blog",
    "endpoint": "https://alice.example"
  },

  "roles": [
    "studio"
  ],

  "capabilities": [
    "posts",
    "rss",
    "search",
    "payments"
  ],

  "endpoints": {
    "profile": "/api/profile",
    "posts": "/api/posts",
    "health": "/api/health"
  }
}
```

---

# 70. Studio 与 Hub 的双向选择

收录关系的建立是**双向选择**，两个方向最终收敛为同一种 Studio ↔ Hub 关系：

```text
方向一：Studio → Hub（申请收录）
方向二：Hub → Studio（主动收录）
```

链上质押列表（§8.3）是双方共同的发现面——双方都不需要任何中心化注册表就能找到彼此。

---

## 70.1 Studio 发起：申请收录

```text
Studio
  ↓ 链上质押列表查询 Hub（名称 / 图标 / 描述 / 分类，§8.3）
申请收录
  ↓
Hub 审核（内容质量的策展责任在 Hub）
  ↓
收录
```

Studio 主动选择"我希望被谁发现和分发"。Hub 有权拒绝——收录意味着 Hub 用自己的声誉为内容背书。

---

## 70.2 Hub 发起：主动收录

```text
Hub
  ↓ 链上质押列表查询 Studio（名称 / 图标 / 描述 / 分类，§8.3）
直接收录（索引公开元数据，§72）
  ↓
Studio 可见该关系
```

Hub 收录的是**公开元数据**——索引公开信息是 Hub 的主权行为，不需要 Studio 许可（如同搜索引擎索引公开页面）；但 Studio 随时可以退出（§94）。

---

## 70.3 关系状态

```text
applied    Studio 已申请，待 Hub 审核（仅 Studio 发起方向产生）
indexed    已收录（任一方向建立后的同一状态）
removed    任一方已终止（保留 Tombstone，§119）
```

原则：

* **一种关系**：两个方向收敛到同一条关系记录，不存在"申请关系"和"收录关系"两套数据
* **双向透明**：Studio 能看到自己被哪些 Hub 收录（包括主动收录）；Hub 能看到待审核的申请
* **双向自由**：Studio 退出自由（§94 防垄断），Hub 下架自由（策展主权）——任一方终止即生效

---

# 71. 一个 Studio 可以注册多个 Hub

必须支持：

```text
Studio A
 ├── Hub 1
 ├── Hub 2
 └── Hub 3
```

一个 Hub：

```text
Hub 1
 ├── Studio A
 ├── Studio B
 ├── Studio C
 └── Studio D
```

因此关系是：

```text
Many-to-Many
```

---

# 72. Hub 同步

Hub 默认同步：

```text
Studio Metadata
+
Content Metadata
```

而不是强制复制完整正文。

例如：

```json
{
  "postId": "...",
  "studioDid": "...",
  "title": "...",
  "excerpt": "...",
  "cover": "...",
  "url": "...",
  "tags": [],
  "publishedAt": "...",
  "contentHash": "...",
  "version": 3
}
```

---

# 73. Hub Index

Hub 本地可以使用 SQLite + FTS5 作为派生索引。

例如：

```text
content_index
```

字段：

```text
postId
studioDid
title
excerpt
tags
contentHash
version
publishedAt
url
indexedAt
```

这是：

> Hub 的缓存 / 派生索引。

不是 Studio 内容的所有权。

---

# 74. Studio 与 Hub 的数据关系

```text
Studio
   │
   │ canonical content
   ↓
Article

Hub
   │
   │ derived index
   ↓
Article Index
```

因此：

```text
Studio = Source
Hub = Index
```

---

# 75. Hub 离线

如果 Hub 离线：

```text
Hub OFF
```

不影响：

```text
Studio
Article
Creator
DID
Payment
```

其他 Hub 仍然可以继续服务。

---

# 76. Studio 离线

如果 Studio 暂时离线：

```text
Hub
 ↓
Cached metadata
```

仍可以：

* 搜索
* 展示摘要
* 显示作者
* 显示文章状态

但原始内容：

```text
Unavailable
```

除非未来启用内容缓存/复制。

---

# 77. 内容复制

第二阶段可以支持：

```text
Hub
 ↓
Cache Article
```

但缓存必须明确：

```text
source
contentHash
cachedAt
```

不能把 Hub Cache 当成原创来源。

---

# 78. Blocklet Package

ArcBlog 本身应该是：

```text
ArcBlog Blocklet Package
```

当前 ARC Blocklet 是 package + instance 模型，而不是简单等同于旧版 Blocklet Server 应用。Package 是版本化、可复用的应用产物；Instance 是该 Package 的一次具体运行或部署。

---

# 79. Package

Package 包含：

```text
blocklet.yaml
source
AUP
Web Device
AFS declarations
surfaces
configuration schema
assets
```

---

# 80. Instance

Instance 包含：

```text
Node Identity
Configuration
Instance Data
Role State
Network State
Hub Index
Payment Configuration
```

不能把 Package 数据和 Instance 数据混淆。

---

# 81. Blocklet Manifest

ArcBlog 的 manifest 应声明：

```text
id
name
version
specVersion
scope
mounts
sites
surfaces
instance
```

具体字段以当前 ARC Blocklet manifest 合同为准。

当前 Blocklet manifest 已经区分 `scope`、`mounts`、`sites`、`surfaces`、`instance`、`cron` 等运行时声明。

---

# 82. ArcBlog Instance 数据

建议：

```text
/instance
```

承载：

```text
Node configuration
Public network metadata
Hub index
Settlement state
```

如果某项属于用户，则进入：

```text
/user
```

而不是：

```text
/instance
```

---

# 83. 用户数据

例如：

```text
/user
├── drafts
├── private
├── preferences
├── agent
└── payment
```

用户登出以后：

```text
/user
```

不可见。

---

# 84. Public Content

公共内容应该通过：

```text
Web Device
+
AFS
```

提供。

例如：

```text
/content/articles/hello
```

---

# 85. Private Content

私有内容：

```text
DID Space
+
Identity
+
Session
```

访问控制：

```text
Caller
 ↓
DID
 ↓
Capability
 ↓
AFS access
 ↓
Content
```

---

# 86. Paid Content

付费内容增加：

```text
Payment Proof
```

最终：

```text
Caller
 ↓
DID
 ↓
Payment Proof
 ↓
Access Grant
 ↓
AFS Resource
```

这比在前端写：

```text
if (paid) showContent
```

安全得多。

---

# 87. Economy Capability

定义：

```text
economy.read
economy.tip
economy.purchase
economy.manage
economy.settle
```

例如：

```text
Reader
   ↓
economy.purchase

Creator
   ↓
economy.manage

Hub
   ↓
economy.route
economy.settle
```

---

# 88. Payment Flow

完整流程：

```text
Reader
  ↓
Open Article
  ↓
Read Preview
  ↓
Click Purchase
  ↓
Create Order
  ↓
Payment Intent
  ↓
Wallet / Payment
  ↓
Verify Payment
  ↓
Create Access Grant
  ↓
Settlement
  ↓
Creator + Hub + Protocol
```

---

# 89. Payment 与 Settlement 分离

必须分成两个阶段。

## Payment

确认：

> 钱是否支付成功？

## Settlement

确认：

> 钱应该给谁？

因此：

```text
Payment
  ≠
Settlement
```

这样以后可以替换支付系统，而不需要重写经济模型。

---

# 90. Refund

未来支持：

```text
Order
 ↓
Refund
 ↓
Reverse Settlement
```

退款不能简单删除原订单。

必须形成：

```text
Original Order
+
Refund Event
+
Settlement Reversal
```

保证经济账本可追踪。

---

# 91. Economic Ledger

建议建立：

```text
economic_ledger
```

例如：

```text
ledger_id
order_id
from
to
asset
amount
type
status
timestamp
transaction_hash
```

类型：

```text
payment
tip
creator_share
hub_share
protocol_fee
refund
settlement
```

---

# 92. 经济数据不可随意删除

经济记录应该：

```text
append-only
```

尽量避免：

```text
UPDATE amount
DELETE order
```

纠正错误通过：

```text
Compensation
Refund
Adjustment
```

表达。

---

# 93. Hub 经济关系

Hub 与 Studio 不是传统意义上的：

```text
平台 → 入驻商家
```

而是：

```text
Independent Studio
       ↕
   Discovery Hub
```

Hub 只有在提供服务并形成 attribution 时获得收益。

---

# 94. 防止 Hub 垄断

Studio 可以：

```text
register Hub A
register Hub B
register Hub C
```

因此：

```text
Hub competition
```

天然存在。

Studio 可以随时：

```text
Add Hub
Remove Hub
```

---

# 95. Hub 竞争机制

不同 Hub 可以提供：

```text
Better Search
Better Recommendation
Better UI
Better AI
Better Curation
Better Community
```

从而形成：

> **去中心化内容发现市场。**

---

# 96. ArcBlog Network 的经济循环

```text
Creator
   │
   │ publishes
   ↓
Studio
   │
   │ registers
   ↓
Hub
   │
   │ discovers
   ↓
Reader
   │
   │ pays / tips
   ↓
Settlement
   │
   ├──── Creator
   │
   ├──── Hub
   │
   └──── Protocol
```

这就是 ArcBlog 的经济闭环。

---

# 97. 数据模型

核心资源：

```text
Identity
Node
Profile

Content
Article
Page
Media
Tag
Category

Network
StudioRegistration
Hub
ContentIndex

Economy
Product
Order
Payment
Settlement
Ledger
AccessGrant
Attribution

Agent
AgentPermission
AgentSession
```

---

# 98. 推荐数据库

MVP：

```text
SQLite
```

用途：

```text
Derived Index
FTS
Cache
Local Metadata
Economic Read Model
```

不要把 SQLite 当成 ARC 的全部数据合同。

---

# 99. 项目结构

建议：

```text
arcblog/
│
├── blocklet.yaml
│
├── src/
│   ├── core/
│   │   ├── identity/
│   │   ├── roles/
│   │   ├── capabilities/
│   │   └── config/
│   │
│   ├── content/
│   │   ├── articles/
│   │   ├── pages/
│   │   └── media/
│   │
│   ├── studio/
│   │   ├── profile/
│   │   ├── publishing/
│   │   └── registration/
│   │
│   ├── hub/
│   │   ├── discovery/
│   │   ├── index/
│   │   ├── search/
│   │   └── recommendation/
│   │
│   ├── economy/
│   │   ├── products/
│   │   ├── payments/
│   │   ├── settlement/
│   │   ├── attribution/
│   │   └── ledger/
│   │
│   ├── agent/
│   │   └── permissions/
│   │
│   └── adapters/
│       ├── arc/
│       ├── payment/
│       └── storage/
│
├── site/
│   ├── .route/
│   ├── .web/
│   ├── pages/
│   └── content/
│
├── admin/
│   └── aup/
│
├── providers/
│
├── migrations/
│
├── tests/
│
└── docs/
```

---

# 100. 不建议一开始做 Monorepo

ArcBlog 第一版优先：

```text
One Package
One Repository
One Blocklet
One Instance
```

不要一开始拆：

```text
arcblog-core
arcblog-hub
arcblog-studio
arcblog-payment
arcblog-agent
```

这些可以在真正出现复用需求后再拆。

---

# 101. API 与 AFS 的关系

传统 Web API：

```text
GET /api/posts
```

可以继续存在。

但是 ARC 原生资源应该优先具有：

```text
AFS Path
+
Capability
```

因此：

```text
Web API
     │
     ↓
ArcBlog Service
     │
     ↓
AFS Resource
```

而不是：

```text
API
 ↓
SQLite
```

---

# 102. API Adapter

建议：

```text
src/adapters/arc/
```

统一处理：

```text
AFS
Identity
DID Space
AUP
Web Device
Blocklet
```

业务代码不要直接到处调用 ARC 底层 API。

---

# 103. 为什么要 Adapter

ARC 目前仍处于快速演进阶段。

当前文档已经明确要求：

> 当前操作与字段应该以专题 board、源码和测试为准，而不能从旧产品行为推断。

因此：

```text
Business Logic
      ↓
ArcAdapter
      ↓
Current ARC Contract
```

这样未来 ARC API 变化时，只修改 Adapter。

---

# 104. Theme System

Theme 属于 Web Device。

建议：

```text
.web/
├── tokens/
├── components/
└── theme.yaml
```

支持：

```text
Minimal
Magazine
Photography
Documentation
Personal
```

---

# 105. Theme 不应该包含业务逻辑

Theme 只负责：

```text
Layout
Typography
Color
Spacing
Components
Presentation
```

不负责：

```text
Payment
NFT
Stake
Hub Sync
Identity
```

---

# 106. Article Layout

例如：

```text
pages/post/layout.aup
```

负责：

```text
Header
Title
Author
Content
Related
Comments
Support
```

内容对象负责：

```text
content.md
```

这种职责分离符合当前 Web Device 对 pages、content、`.web` 的设计。

---

# 107. Studio Profile

Studio Profile：

```yaml
name:
description:
avatar:
cover:
did:
website:
social:
location:
```

身份：

```text
author DID
```

不要用：

```text
username
```

作为最终身份。

Username 只是 UI Alias。

---

# 108. Hub Profile

Hub Profile：

```yaml
name:
description:
avatar:
did:
endpoint:
topics:
language:
region:
```

并声明：

```text
role: hub
```

---

# 109. Network Profile

每个节点应该提供：

```text
Node DID
Roles
Capabilities
Endpoint
Version
Protocol Version
```

---

# 110. Node Health

统一：

```text
GET /api/health
```

返回：

```json
{
  "status": "ok",
  "version": "0.1.0",
  "roles": ["studio", "hub"]
}
```

---

# 111. Hub Sync Scheduler

Hub 需要周期同步。

但不要直接在 Node.js 中写：

```text
setInterval()
```

作为唯一方案。

优先考虑 ARC 当前支持的声明式运行/cron能力。

Blocklet manifest 当前已经有 `cron` 运行时声明字段，因此可以把周期性同步设计成 ARC 层面的声明式任务，再根据当前版本合同实现。

---

# 112. Sync State

每个 Studio：

```text
lastSync
lastVersion
lastHash
lastError
status
```

例如：

```text
Studio A
lastSync: 2026-09-23 16:00
version: 52
status: online
```

---

# 113. Network Failure

网络同步必须允许：

```text
timeout
retry
backoff
stale
offline
```

不能因为一个 Studio 无响应而阻塞整个 Hub。

---

# 114. Security

最重要的安全原则：

```text
Frontend
   ≠
Authority
```

Frontend 不能告诉后端：

```json
{
  "isHub": true
}
```

后端必须自己验证。

---

# 115. NFT Security

验证：

```text
Asset Collection
Asset Ownership
Asset ID
Network
Stake
Stake Status
```

并且：

```text
Role Cache
```

不能作为最终权威。

---

# 116. Payment Security

支付验证：

```text
Payment Intent
 ↓
Chain / Payment Provider
 ↓
Verify
 ↓
Order Paid
```

不能：

```text
Frontend
 ↓
"I paid"
```

---

# 117. Paid Content Security

必须防止：

```text
GET /api/article/full
```

直接返回完整付费内容。

应该：

```text
Preview
+
Access Verification
```

---

# 118. Content Ownership

Hub 不拥有：

```text
Article
Photo
Video
```

Studio 是 canonical source。

Hub 只拥有：

```text
Index
Derived Metadata
Recommendation
```

---

# 119. Content Deletion

Creator 删除：

```text
Studio
 ↓
Delete Article
```

Hub 应同步：

```text
Remove / Mark Deleted
```

但是保留：

```text
Tombstone
```

例如：

```json
{
  "contentId": "...",
  "status": "deleted",
  "deletedAt": "..."
}
```

避免 Hub 永远认为文章存在。

---

# 120. Content Update

版本：

```text
v1
v2
v3
```

Hub 根据：

```text
version
contentHash
```

判断是否需要更新。

---

# 121. Comments

MVP 可以实现：

```text
Local Comments
```

第二阶段：

```text
DID Comments
```

第三阶段：

```text
Cross-Hub Comments
```

不要第一版把跨节点评论做复杂。

---

# 122. Follow

第二阶段：

```text
Follow Studio
```

未来：

```text
DID → Studio DID
```

形成：

```text
Social Graph
```

---

# 123. Subscription

订阅也应该绑定：

```text
Reader DID
Creator DID
```

而不是：

```text
Email
```

作为最终身份。

---

# 124. RSS / Atom

Studio 默认可以提供：

```text
/rss.xml
/atom.xml
```

Hub 可以读取。

这是最简单的兼容性层。

---

# 125. Legacy Compatibility

ArcBlog 可以支持传统：

```text
RSS
Atom
REST
Markdown
```

但是核心协议仍然：

```text
AFS
DID
Discovery
Capability
```

---

# 126. SEO

Public Blog 使用 Web Device。

因此：

```text
HTML
Metadata
OpenGraph
Canonical
Sitemap
RSS
```

都属于 Web Device Site 层。

---

# 127. Public Site 与 Admin 分离

建议：

```text
Public
   ↓
Web Device

Admin
   ↓
AUP
```

这是 ArcBlog 最重要的 ARC 架构设计之一。

不要把：

```text
Public Blog
Admin
```

做成完全相同的一套 SPA。

---

# 128. AFS UI 的定位

ArcBlog 不应该创建所谓：

```text
AFS UI SDK
```

因为当前 ARC 文档明确说明 AFS UI 是把 AFS 数据与能力投影到 UI 的架构视角，而不是与 AUP、Web Device 并列的第三套 authoring 产品。

因此：

```text
Admin
 ↓
AUP

Public Site
 ↓
Web Device

AFS
 ↓
Resources
```

---

# 129. Agent Access

ArcBlog 不需要自己实现：

```text
/mcp
```

如果 ARC Runtime 已经提供，就直接利用。

ArcBlog 只需要声明：

```text
Tools
Resources
Permissions
```

当前 ARC Agent Access 已经为运行中的 Blocklet 提供 `/mcp`、`/api/afs/rpc` 和 `/llms.txt` 等入口。

---

# 130. Agent Tools

建议定义：

```text
search_posts
get_post
list_studios
get_studio
create_draft
update_draft
publish_post
create_product
get_sales
get_analytics
```

经济相关：

```text
create_product
get_orders
get_settlements
```

默认不开放：

```text
settle_payment
change_wallet
change_role
```

---

# 131. AI Hub

未来 Hub 可以成为：

> AI Content Discovery Node

架构：

```text
Studio
 ↓
Content
 ↓
Hub
 ↓
AI
 ├── Classification
 ├── Summary
 ├── Embedding
 ├── Search
 └── Recommendation
```

AI 处理的是：

```text
Hub Derived Data
```

不会改变 Studio 原始内容。

---

# 132. AI Creator

Studio 可以成为：

> AI-native Creator Node

例如：

```text
Creator
 ↓
AI Agent
 ↓
Draft
 ↓
Review
 ↓
Publish
```

Agent 可以访问：

```text
Creator DID Space
```

但必须遵守权限。

---

# 133. Agent 与经济

未来可以：

```text
AI Agent
 ↓
Recommend Article
 ↓
Reader Purchase
 ↓
Hub Attribution
 ↓
Settlement
```

甚至：

```text
AI Agent
 ↓
Operate Studio
 ↓
Publish
 ↓
Sell
```

因此经济系统不能与 Agent 系统耦合成一套代码，而应该通过 Capability 连接。

---

# 134. MVP 范围

第一阶段必须控制规模。

## MVP-1

### ARC

* Blocklet Package
* Instance
* AFS integration
* Identity
* DID Space

### Blog

* Profile
* Article
* Markdown
* Media
* Tags
* Categories
* Theme

### Public

* Web Device
* Home
* Article
* Author
* RSS

### Admin

* AUP
* Dashboard
* Editor
* Settings

---

# 135. MVP-2

### Studio

* Studio Asset
* NFT verification
* Stake verification
* Studio Capability
* Studio Discovery
* Hub registration

### Hub

* Hub Asset
* Stake verification
* Studio discovery
* Content index
* Search

---

# 136. MVP-3

### Economy

* Tip
* Paid Article
* Product
* Order
* Payment Adapter
* Settlement
* Hub Share
* Attribution
* Ledger

---

# 137. MVP-4

### Agent

* Agent Access
* MCP tools
* Search
* Draft
* Publish
* Content management

---

# 138. V2

未来：

```text
Subscription
Membership
Comments
Follow
Social Graph
AI Recommendation
Cross-Hub Discovery
Digital Products
Creator Store
```

---

# 139. 不应该进入 MVP 的功能

不要第一版做：

```text
DAO
Token
Complex Governance
Cross-chain
Decentralized Storage Network
Social Network
Full NFT Marketplace
Automatic Subscription Billing
Complex Recommendation AI
```

这些会极大增加系统复杂度。

---

# 140. 开源策略

建议：

```text
Apache License 2.0
```

ArcBlog 软件：

```text
Open Source
```

但是：

```text
ArcBlog Instance
```

由各自运营者负责。

---

# 141. 软件与网络分离

必须明确：

```text
ArcBlog Software
        ≠
ArcBlog Network
```

任何人可以：

```text
Fork
Build
Run
Operate
```

---

# 142. ArcBlog Network 不应该存在唯一官方 Hub

官方可以运行一个：

```text
Official Hub
```

但是它只是：

```text
One Hub
```

而不是：

```text
The Hub
```

这是 ArcBlog 去中心化设计的重要原则。

---

# 143. Official Hub

官方 Hub 可以提供：

```text
arcblog.example
```

但是用户也可以运行：

```text
alice-hub.example
bob-hub.example
community-hub.example
```

所有 Hub 遵循：

```text
ABDP
```

协议。

---

# 144. 网络发现

未来可以形成：

```text
Hub A
 ↕
Hub B
 ↕
Hub C
```

但第一版不要求 Hub-to-Hub。

第一版：

```text
Studio
 ↓
Multiple Hubs
```

已经足够形成网络。

---

# 145. ArcBlog 网络拓扑

最终：

```text
                    Hub A
                  /   |   \
                 /    |    \
                ↓     ↓     ↓
             Studio Studio Studio
                ↑      ↑      ↑
                 \     |     /
                  \    |    /
                    Hub B
                      |
                      ↓
                   Studio
```

不是：

```text
             Central Hub
                 |
       ┌─────────┼─────────┐
       ↓         ↓         ↓
    Studio    Studio    Studio
```

---

# 146. 经济网络拓扑

```text
                    Hub A
                  /       \
                 ↓         ↓
             Studio A   Studio B
                 │         │
                 ↓         ↓
              Reader     Reader
                 │         │
                 └────┬────┘
                      ↓
                  Settlement
                   /   |   \
                  /    |    \
                 ↓     ↓     ↓
             Creator  Hub  Protocol
```

---

# 147. ArcBlog 的最终产品模型

ArcBlog 最终不是：

> WordPress 的去中心化版本。

也不是：

> Medium 的区块链版本。

而是：

> **一个以 ARC 为运行基础、以 DID 为身份、以 AFS 为资源层、以 Web Device 为内容发布层、以 AUP 为交互层、以 Studio 为创作者节点、以 Hub 为发现节点、以 NFT + Stake 为网络角色激活机制、以支付与分成为经济基础、以 Agent Access 为 AI 接口的开放内容网络。**

---

# 148. 核心关系模型

最终可以浓缩成：

```text
                 ARC Runtime
                      │
                 ArcBlog Blocklet
                      │
          ┌───────────┼────────────┐
          │           │            │
         AFS         AUP      Web Device
          │           │            │
       Resource      Admin       Public
          │           │            │
          └───────────┼────────────┘
                      │
                  Identity
                      │
                 DID / Space
                      │
          ┌───────────┴───────────┐
          │                       │
       Studio                   Hub
          │                       │
     Create Content          Discover Content
          │                       │
          └───────────┬───────────┘
                      │
                    Reader
                      │
                 ┌────┴────┐
                 │         │
                Tip      Purchase
                 │         │
                 └────┬────┘
                      ↓
                  Settlement
                 /     |      \
                /      |       \
          Creator      Hub    Protocol
```

---

# 149. 开发阶段规划

## Phase 0 — ARC Research

AI 在写代码之前必须先确认：

```text
ARC version
AFS contract
AUP contract
Web Device contract
Blocklet manifest
Identity
DID Space
Agent Access
```

不得根据旧版 Blocklet 文档猜测 API。

---

## Phase 1 — Package

完成：

```text
blocklet.yaml
Package
Build
Check
Run
Instance
```

验收：

```text
arc blocklet build
arc blocklet check
arc blocklet run
```

---

## Phase 2 — AFS

完成：

```text
Content Resource
Node Resource
Configuration
```

确认：

```text
list
read
write
search
exec
```

哪些操作真正由当前 Provider 支持。

---

## Phase 3 — Public Site

使用：

```text
Web Device
```

完成：

```text
Home
Article
Author
Archive
RSS
Theme
```

---

## Phase 4 — Admin

使用：

```text
AUP
```

完成：

```text
Dashboard
Editor
Media
Settings
Role
Network
Economy
```

---

## Phase 5 — Identity

完成：

```text
DID
Caller
Session
/user
DID Space
```

---

## Phase 6 — Studio

完成：

```text
NFT
Stake
Role
Capability
Studio
Discovery
```

---

## Phase 7 — Hub

完成：

```text
NFT
Stake
Role
Capability
Discovery
Index
Search
Sync
```

---

## Phase 8 — Economy

完成：

```text
Product
Order
Payment
Attribution
Settlement
Ledger
Tip
Paid Reading
```

---

## Phase 9 — Agent

完成：

```text
MCP
AFS RPC
Agent Tools
Permissions
```

---

# 150. AI Coding 总原则

整个项目开发必须遵循：

```text
Do not invent ARC APIs.
```

如果 AI 不确定某个 ARC API：

```text
STOP
 ↓
Read current documentation
 ↓
Inspect current source
 ↓
Inspect tests
 ↓
Create adapter
 ↓
Implement
```

而不是：

```text
Guess API
 ↓
Write code
 ↓
Fix later
```

当前 ARC 架构文档明确强调，架构 board 是地图而不是具体 API 合同；具体字段、命令和行为需要回到对应专题 board、源码与测试进行核验。

---

# 151. AI Agent 开发规则

给 Codex / Claude Code / Cursor 的最高优先级规则：

```text
1. Follow current ARC architecture.
2. Do not use legacy Blocklet Server assumptions.
3. Keep AFS, AUP, Web Device and Identity boundaries separate.
4. Use Web Device for public static/content site.
5. Use AUP for interactive administration.
6. Use AFS as resource/capability abstraction.
7. Use DID/DID Space for identity-scoped data.
8. Use Blocklet as package/instance boundary.
9. Use ARC Runtime rather than inventing a runtime.
10. Use Agent Access provided by ARC.
11. Keep business logic independent from ARC adapters.
12. Never trust frontend role or payment state.
13. Keep creator content ownership separate from Hub indexing.
14. Keep payment and settlement separate.
15. Make revenue split policy versioned.
16. Make NFT collection configuration external.
17. Make payment provider replaceable.
18. Make Hub attribution cryptographically verifiable where possible.
19. Keep MVP small.
20. Every major feature must have tests.
```

---

# 152. 推荐的第一版技术目标

最终第一版应该能够完整跑通这个场景：

```text
Alice
 ↓
Install ArcBlog
 ↓
Create DID
 ↓
Create Blog
 ↓
Publish Article
```

然后：

```text
Alice
 ↓
Acquire Studio Asset
 ↓
Stake
 ↓
Studio Activated
```

再：

```text
Bob
 ↓
Acquire Hub Asset
 ↓
Stake
 ↓
Hub Activated
```

然后：

```text
Alice Studio
       ↓
Register
       ↓
Bob Hub
       ↓
Indexed
```

最后：

```text
Reader
   ↓
Bob Hub
   ↓
Alice Article
   ↓
Purchase
   ↓
Payment
   ↓
Settlement
   ├── Alice / Creator
   ├── Bob / Hub
   └── Protocol
```

整个闭环完成：

```text
Identity
   ↓
Content
   ↓
Studio
   ↓
Hub
   ↓
Discovery
   ↓
Reader
   ↓
Payment
   ↓
Settlement
   ↓
Creator Economy
```

---

# 153. ArcBlog 最终定位

**ArcBlog 不是一个博客网站。**

它是一套：

```text
Open Source
+
Self Hosted
+
Identity Native
+
Content Native
+
Agent Native
+
Economy Native
+
Decentralized
```

的内容基础设施。

其核心结构是：

```text
                 ┌───────────────┐
                 │  ARC Runtime  │
                 └───────┬───────┘
                         │
                  ┌──────┴──────┐
                  │   ArcBlog   │
                  └──────┬──────┘
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
      AFS               AUP          Web Device
       │                 │                 │
   Resources           Admin           Website
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
                     Identity
                         │
                  DID / DID Space
                         │
              ┌──────────┴──────────┐
              │                     │
           Studio                  Hub
              │                     │
          Creator              Discovery
              │                     │
              └──────────┬──────────┘
                         │
                       Reader
                         │
                  ┌──────┴──────┐
                  │             │
                 Tip         Purchase
                  │             │
                  └──────┬──────┘
                         │
                    Settlement
                    /    |    \
                   /     |     \
             Creator     Hub   Protocol
```

**ArcBlog 的最终目标不是建立一个新的中心化博客平台，而是建立一种新的内容网络运行方式：任何人都可以运行自己的 Studio，任何人都可以运行自己的 Hub，创作者拥有自己的身份和内容，Hub 通过发现和分发获得网络收益，读者直接与创作者发生经济关系，而 ARC 提供这一切运行所需要的身份、数据、资源、UI、应用和 Agent 基础设施。**
