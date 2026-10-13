# ArcBlog

[![gates](https://github.com/shenxiuqiang/ArcBlog/actions/workflows/ci.yml/badge.svg)](https://github.com/shenxiuqiang/ArcBlog/actions/workflows/ci.yml)
[![licence: Apache-2.0](https://img.shields.io/badge/licence-Apache--2.0-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D20-informational.svg)](package.json)

> English readers: [`README.en.md`](README.en.md) is the short English entry point.

> 版本：**v1.0** ｜ 2026-10-01 ｜ Lead


> **ArcBlog 是一套任何人都能自己部署的博客软件**：内容归创作者，读者关系不被平台持有；多个各自部署的实例通过可验证的角色互相发现、互相分发，而不是所有人挤在同一个平台上。
> 技术副标题：以 DID 为身份、以 AFS 为资源层的内容节点软件。
>
> 口径唯一出处 = [产品定位 §1.1](docs/01-产品概念/01-产品定位与边界.md)（**目标口径 ≠ 现状口径**，读法见 [导读 §5](docs/01-产品概念/00-导读.md)）。

---

## 1. 这是什么（30 秒）

| 问题 | 一句话 | 去哪读 |
| --- | --- | --- |
| 它是什么 | 一个 **Blocklet**（[`blocklet.yaml`](blocklet.yaml)），用 Arc/AUP 栈写成不是 Node 应用：**没有 bundler、没有 dev server**，AUP 应用本体**零运行时依赖** | [架构总览](docs/05-开发文档/00-架构总览.md) |
| 基本单位 | **一个 ArcBlog Instance**（同一份代码的一次部署） | [定位 §2.1](docs/01-产品概念/01-产品定位与边界.md) |
| 角色 | **聚合由 agent 承担**：部署一个节点并把 **studio NFT 质押到同一 factory 地址**即被"发现"——**查该地址的质押资产列表 = 节点注册表**；人类侧角色集 = **C/R/O/A/G**（创作者 / 读者 / 节点运营者 / agent 接入方 / 平台方治理者） | [用户与角色 §1](docs/01-产品概念/02-用户与角色.md) ｜ [定位](docs/01-产品概念/01-产品定位与边界.md) |
| 今天能做到哪 | 节点 NFT **链上生命周期【已实现】**（真链 beta，四步各有 tx）；**发现/枚举【已实现】**（`listStakes` 双适配器；真链只读 `P-2` 通过 ⇒ `?page=registry` 可查；真链"写自描述/转让"待人类批准） | [功能台账](docs/06-功能开发列表/00-台账总览与规范.md) ｜ [探针与未决](docs/05-开发文档/07-未决技术问题与探针计划.md) |
| 谁在用它 | 创作者 / 读者 / 节点运营者 / agent 接入方 / 平台方治理者 | [用户与角色](docs/01-产品概念/02-用户与角色.md) |

> **别把目标当现状**：`01 §6` 的"不可替代性"与同篇 `§6.5` 的"有机制、无闭环"**必须一起读**（[导读 §5](docs/01-产品概念/00-导读.md)）。

---

## 2. 怎么跑起来（5 分钟）

**前置**：Node（本机实测 `v24.14.0`，ESM）、`arc` CLI（实测 `2.0.0-beta.50`）、本地 ARC daemon；`--adapter ocap` 才需要 `npm install`（5 个链脚本依赖）。运行环境依据 = [技术选型 §1.2](docs/05-开发文档/03-技术选型与依赖.md)。

```bash
# ① DSL 主门 —— issues 必须为 []
arc dsl validate --json

# ② 快层门（约 1 秒，不写实例）—— 用例数只认 runner 自己的输出
npm test

# ③ 发一篇（CLI 是唯一会写真实署名与规范化 tags 的路径）
node scripts/arcblog-lifecycle.mjs publish \
  --title "My First Post" --author-did did:key:z... \
  --body-file post.md --category technology --tags "a,b"

# ④ 查已发布
node scripts/arcblog-query-posts.mjs published --category technology
```

| 我想…… | 命令 | 权威篇 |
| --- | --- | --- |
| 跑门（validate / 快层 / build） | `arc dsl validate --json` → `npm test` → `npm run build` | [质量门 §7](docs/05-开发文档/05-测试分层与质量门.md) ｜ [门纪律](docs/07-团队与开发规范/03-质量门与命令手册.md) |
| 让 `.aup` 改动生效 | `arc service restart -i default`（**只有它重编译 `.aup`**） | [构建·部署·运行 §2](docs/05-开发文档/04-构建·部署·运行.md) |
| 安全构建（**唯一入口**） | `npm run build` | [构建·部署·运行 §1](docs/05-开发文档/04-构建·部署·运行.md) |
| 部署到本地 Pages | `node scripts/arcblog-deploy.mjs --dry-run` | [构建·部署·运行 §4](docs/05-开发文档/04-构建·部署·运行.md) |
| 出问题了 | `arc service list` → 再按症状查 | [运维场景手册](docs/05-开发文档/06-运维场景手册.md) ｜ [常见任务导航](docs/08-其他/04-常见任务导航.md) |
| 查一个错误码 | — | [错误码索引](docs/08-其他/05-错误码索引.md) |

> 完整命令手册 = [构建·部署·运行 §6](docs/05-开发文档/04-构建·部署·运行.md)；**本文件不复述**其正文。

---

## 3. 去哪读

> **新人先读这一份**：[`docs/00-新手上路.md`](docs/00-新手上路.md)（30 分钟：是什么 → 怎么跑 → 代码与数据在哪 → **明确不用读什么**）。下面是完整地图，按需再展开。


| 你是谁 / 想干什么 | 从这里开始 |
| --- | --- |
| **第一次接触** | 本文件 §1 → [产品概念导读](docs/01-产品概念/00-导读.md) → [定位 §0（五问）](docs/01-产品概念/01-产品定位与边界.md) |
| **要写 `docs/**`** | [**文档体系总纲**](docs/README.md)（宪法：阶段门 / 文档规范 / 术语归属） |
| **要找"某类文档在哪"** | [索引与阅读路径](docs/08-其他/00-索引与阅读路径.md)（三类读者 + 八类入口 + **待裁总表**） |
| **要动手改代码 / 发版** | [CLAUDE.md](CLAUDE.md)（实现事实与命令）→ [开发文档](docs/05-开发文档/00-架构总览.md) → [功能开发列表](docs/06-功能开发列表/00-台账总览与规范.md) |
| **想知道某条需求做到哪** | [功能台账](docs/06-功能开发列表/01-功能台账.md)（**实现状态的唯一出处**） |
| **要按团队规则干活** | [团队与开发规范](docs/07-团队与开发规范/00-角色与写入范围.md)（角色 / 阶段门 / 审查 / 门 / 交接） |
| **看某条决策今天还成不成立** | [决策记录](docs/08-其他/01-决策记录.md)（归档 D1–D7 逐条处置） |

**八类目录**（结构见[总纲 §1](docs/README.md)，**阶段状态与冻结记录的唯一账本 = [总纲 §2.1](docs/README.md)**）：

```text
docs/01-产品概念/  02-产品需求/  03-产品设计/  04-UI设计规范/
docs/05-开发文档/  06-功能开发列表/  07-团队与开发规范/  08-其他/
docs/team/         工作台（阶段日志 + 审查/核验记录，不是产品文档）
```

---

## 4. 去哪改

| 你想改 | 改哪里 | 改完跑什么 |
| --- | --- | --- |
| 页面 / 文案 / 交互 | `.aup/**`（**每个控制台区块是一个真页面**） | `arc dsl validate --json` + `npm test` |
| 记录字段 / 必填 | `world/*.yaml`（**22 个 schema**，权威清单 = [数据模型 §1](docs/05-开发文档/01-数据模型与存储.md)） | 同上 + `npm run build` |
| 读 / 写权限 | [`blocklet.yaml`](blocklet.yaml) 的 `replicated`（**只有它是权威门**；`networkRead` 只是前缀放行） | 同上 + `npm run build` |
| 公开面 SSR / 主题 | `pages/**`、`.web/**`（**Web Device 拿不到 AFS**） | 同上 |
| CLI / 运维脚本 | `scripts/**`（32 CLI + 32 测试；新增测试**默认算 live**，除非列进 `FAST_TESTS`） | `npm test` + 定向单跑见下 |
| 链适配 | `scripts/lib/chain.mjs`（`mock`/`ocap`） | 定向单跑 + 人类批准（资金/链） |
| 文档 | `docs/0X-*/**` | 按[总纲](docs/README.md) |

**两条不能绕的纪律**（细节见 [团队规范](docs/07-团队与开发规范/00-角色与写入范围.md)）：

1. **写范围**：只写自己角色 glob 内的文件；**越界先报 Lead**（不要自己扩范围）。
2. **提交**：**唯一提交人 = Lead**；teammate **禁止** `git commit`/`push`/`reset`。检查点提交，**精确 `add`**、**提交前 `git diff` 过内容**（[提交纪律](docs/07-团队与开发规范/04-交接·记录·提交.md) §3）。

**改了 CLI / AFS 记录 / 链适配器 / daemon 路由时**：不要跑全量 live（~21 分钟且写共享实例），改为**定向单跑受影响的文件**，先持锁：

```bash
npm run test:file -- scripts/arcblog-media.test.mjs   # 先写 docs/team/.gate-lock，跑完删除
```

**外部参考**：ArcBlock 官方技术文档 <https://www.arcblock.io/zh/docs/> —— 动手前先查，**不要臆造 ARC / AFS / AUP / Blocklet API**（平台能力与降级的唯一出处 = [平台能力与边界](docs/05-开发文档/02-平台能力与边界.md)）。

---

## 5. 仓库布局速查

```text
blocklet.yaml   身份 / 可发布元数据 / sites.bindings / scope / 权限表（replicated 才是权威门）
.aup/           应用本体：app.aup（14 行 manifest）+ man/*.yaml + pages/**/*.aup（30 个页面）+ wrapper + locales
world/*.yaml    AFS 记录 schema（22）
pages/          SSR 页面定义（/p/en/…，由 .route/web 渲染）
.web/           公共 Web Device 组件与主题（hero-carousel、theme-bridge）
.route/         daemon 路由挂载：/ → AUP，/p → SSR
agents/         Agent Access 声明（运行时提供 /mcp、/p/llms.txt）
scripts/        运维 Node CLI + node:test 套件（32 + 32）
seed/           默认设置记录（tone / palette / theme）
dist/           构建产物（由 npm run build 刷新；**裸 arc blocklet build 会把密钥带进 dist/**）
```

逐目录、逐层、逐写入通道的完整说明 = [架构总览](docs/05-开发文档/00-架构总览.md) 与 [CLAUDE.md](CLAUDE.md)（**实现事实的唯一入口**）。

---

## 6. 明确不在这里重复的事

- **阶段门、文档规范、术语归属** → [文档体系总纲](docs/README.md)（本文件只链一次，**不复述**）。
- **平台能做/不能做** → [平台能力与边界](docs/05-开发文档/02-平台能力与边界.md)（+ [禁止与降级模式](docs/05-开发文档/02a-平台禁止与降级模式.md)）；**未验证** → [未决技术问题与探针计划 §1](docs/05-开发文档/07-未决技术问题与探针计划.md)。
- **质量门的操作面**（分层 / 名单 / 判定式 / 真红假红）→ [测试分层与质量门](docs/05-开发文档/05-测试分层与质量门.md)。

**必须人类批准的动作**（不可逆 / 对外）：`push`、真实资金与链上写、删数据与清理实例、入口文件最终重写、产品口径追认 —— 清单见 [人类检查点](docs/07-团队与开发规范/04-交接·记录·提交.md) §6。


## 7. 许可与贡献

- **许可**：[Apache License 2.0](LICENSE)（附 [NOTICE](NOTICE) 与第三方归属 [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)）。上游平台（ARC daemon / AFS / AUP / 链 SDK）属 ArcBlock，按其自身条款。
- **贡献**：先读 [`CONTRIBUTING.md`](CONTRIBUTING.md)——四条门禁、**一处事实一个出处**、以及"加守卫必须能证明它会红"。没有 CLA，提交即按同一许可授权（Apache-2.0 §5）。
- **路线图**：不在别处维护。**需求与状态** = [`docs/06-功能开发列表/`](docs/06-功能开发列表/00-台账总览与规范.md)（56 行，`未开工`/`开发中` 均为 0）；**待办** = [`docs/team/human-checkpoints.md`](docs/team/human-checkpoints.md)；**平台边界** = [`docs/05-开发文档/02`](docs/05-开发文档/02-平台能力与边界.md)（`B1`–`B24`）。
- **安全**：见 [`SECURITY.md`](SECURITY.md)（私下报告，不要开公开 issue）；**行为准则**：见 [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md)。
- **变更**：见 [`CHANGELOG.md`](CHANGELOG.md)（版本号以 `blocklet.yaml` 为准，发布以 git tag 为准）。
