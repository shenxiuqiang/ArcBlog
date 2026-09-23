# ArcBlog

> An open, decentralized, agent-native publishing network powered by ARC.

**项目类型：** Open Source / Decentralized Publishing / Personal Blog / Content Network / Creator Economy

**目标平台：** ARC 2.x

**核心架构：** AFS + AUP + Web Device + Blocklet + Identity + DID Space + Agent Access

**项目状态：** Product & Technical Specification

**文档版本：** V2.0

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

ArcBlog Admin：

```text
Dashboard
Posts
Pages
Media
Categories
Tags
Appearance
Identity
Roles
Network
Economy
Payments
Agent
Settings
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

# 70. Studio 注册 Hub

```text
Studio
   ↓
Select Hub
   ↓
Register
   ↓
Hub verifies
   ↓
Studio indexed
```

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
