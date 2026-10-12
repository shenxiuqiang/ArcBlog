---
name: arcblog-deploy
description: "当人类说「重新部署」「部署 ArcBlog」「redeploy」「发布新版本」时，把当前源码安全地重新部署到本地 ARC Pages 实例（domain arcblog.localhost）。执行 npm run build（安全构建）→ 部署前密钥门（dist + Pages 历史）→ arc blocklet instance deploy → 部署后校验（无密钥 / HTTP 200 / 部署页面与源码一致），并回报 deployment id 与 URL。也适用于「为什么不生效 / 部署后浏览器还是旧的」这类排查。"
---

# 重新部署 ArcBlog

第一方项目技能（不是从 `ArcBlock/agent-skills` 装的），与本仓库的实现事实同步维护。
**引擎**：[`scripts/arcblog-deploy.mjs`](../../../scripts/arcblog-deploy.mjs) —— 技能只负责“什么时候跑、跑完怎么判”。

> ⚠️ **配方步骤（2b）已内置**：脚本在密钥门之后自动跑 `arcblog-recipes.mjs install`（幂等）。若手工部署（不经过脚本），**必须**自己补这一步，否则**绑定路径页**（`/posts/<slug>`、`/pages/<slug>`、`/preview/<slug>`）会渲染原始 JSON（`?page=reader` 类无 `$state.loc` 的页则报 `Surface: set src (url)`）。

## 触发

人类说（任一即可）：

- **「重新部署」** / 「部署一下 ArcBlog」 / 「把改动部署上去」
- 「redeploy」 / 「deploy ArcBlog」 / 「发一个新版本到本地」
- 「部署完了吗？为什么浏览器还是旧的」→ 先跑一次部署，再按 §4 判断是"部署面 vs 挂载面"的问题

## 一条命令

```bash
node scripts/arcblog-deploy.mjs              # 真部署（会 build + deploy + 校验）
node scripts/arcblog-deploy.mjs --dry-run    # 只打印将要执行的命令，不改任何东西
node scripts/arcblog-deploy.mjs --json       # 机器可读结果（CI/agent 用）
node scripts/arcblog-deploy.mjs --domain blog.example.com --project arcblog
```

**部署前先确认要发布什么**：脚本会打印 `HEAD` 与未提交路径清单。未提交的改动**会被原样打进这次部署** ——
如果那些改动不属于本次要发的范围（例如还有别人在途的半成品），先停下来问人类，或先提交/暂存。

## 六步门（顺序不可换、不可跳）

| 步 | 命令 | 为什么不能跳 |
| --- | --- | --- |
| 1 | `npm run build` | = `arc blocklet build` + `npm run scrub:dist-secrets`。**裸 `arc blocklet build` 会把仓库根的 `node.key`/`.env.local` 复制进 `dist/`**（BUG-067，平台无排除开关） |
| 1b | `node scripts/arcblog-rss.mjs --feed-link http://<domain>:4939 > .web-cache/rss.xml` | **DEF-28**：`arc blocklet build` 会**重建** `.web-cache/`（llms/robots/sitemaps），把人工生成的 `rss.xml` **抹掉**（实测：生成后 `/p/rss.xml` 200，下一次 build 后静默 404，而页脚就链着它）⇒ 在 build 之后重生成；部署后校验已把 `/p/rss.xml` 纳入存活检查 |
| 2 | `npm run verify:artifacts` | 部署前密钥门：扫 `dist/` **和** Pages 部署通道。历史实测：**17 个部署副本带着仓库那把真 `node.key`**（sha256 一致），18 个带 `.env.local`（BUG-074）。此门 exit≠0 时**必须停下** |
| 2b | `node scripts/arcblog-recipes.mjs install --json` | **单记录页的渲染配件**（DEF-21/B14）：`surface url=$state.loc` 用 `<记录目录>/.aup/item.json` 渲染记录，而这些配方是 **AFS 记录、不是构建产物** ⇒ 新实例不装会退化为**原始 JSON**。幂等，每次部署都跑 |
| 3 | `arc blocklet instance deploy . --domain arcblog.localhost` | 把已发布 blocklet 的 `dist/` 部署到本地 Pages 并绑定域名（会新增一个 `deploy-*`，历史不清） |
| 4 | 部署后校验（脚本自动） | 新部署顶层无 `node.key`/`.env.local` · Pages 通道整体 `--check` 通过 · `http://<domain>:4939/` 与 `?page=dashboard` 返回 200 · 部署里的 `.aup/pages/<x>.aup` 与源码**字节数一致** |

## 失败怎么处理

| 现象 | 处理 |
| --- | --- |
| 第 1 步报 `Found N secret file(s)` 或 `node.key` | 正常：scrub 已把它们从 `dist/` 移除，看 `manifestFilesAfter` 是否等于 after；仓库根的密钥**永远不动** |
| 第 2 步 exit 1，命名 `deploy-*/files/node.key` | **Pages 历史里的旧副本带密钥**。清理（只删副本，不动仓库密钥）：<br>`rm -f ~/.arc/pages/projects/<project>/deployments/*/files/node.key ~/.arc/pages/projects/<project>/deployments/*/files/.env.local`<br>然后重跑本脚本（会再校验一次） |
| 第 3 步报 `blocklet is not published` | 先 `arc blocklet list .` 看发布状态；必要时按官方流程发布后再部署 |
| 第 4 步 HTTP 非 200 | 先 `arc service status` 确认 daemon 在跑；再 `arc service url` 看域名归属；必要时 `arc blocklet run . -i default` 复挂 |
| 第 4 步内容不一致（MISMATCH） | 说明部署的不是刚 build 的 `dist/` —— 检查是否有别的构建在并行覆盖 `dist/` |
| `docs/team/.gate-lock` 存在 | 有人在跑写实例的测试。部署本身不写实例，但会让页面在对方脚下变化 → **先问人类/等对方收口** |

## §4 部署之后：浏览器为什么还可能是旧的（两种"面"）

`arc service url` 会显示 blocklet 挂在 **`http://arcblog.localhost:4939/`**（daemon 上**挂载的源码树**）；
而本技能部署的是**另一套面**：本地 **Pages 实例** `~/.arc/pages/projects/<project>`（同一个域名，历史 156+ 个 `deploy-*`）。

- 改了源码 → 想让 **daemon 挂载面**生效：`arc service restart -i default` + `arc blocklet run . -i default` 复挂
  （`.aup` 改动对运行中的 daemon 不生效、`arc blocklet run` **不是** reload 路径，arc-contracts §35(5)）
- 想让 **Pages 面**生效：就是本技能（build + deploy）
- 两者都做完，浏览器才一定看到新内容；缓存问题用硬刷新（`Cmd+Shift+R`）

## 边界（不要做）

- 不重启 daemon、不改 `default` 实例配置、不跑 `npm run test:live`
- 不删除仓库根的 `node.key` / `.env.local`（只清 Pages 里的**副本**）
- 不 `git add -A`、不提交（提交由 Lead 决定）；部署产物永远是 `dist/`，不是仓库根
- 不把 `--domain` 指到别人的域名上

## 变更记录

- 2026-09-29 建立：由一次真实重新部署（`deploy-1790674405308-u5im2w`）抽出；
  同批清除了 40 个带真密钥的历史部署副本，并把部署流程固化成本技能。
