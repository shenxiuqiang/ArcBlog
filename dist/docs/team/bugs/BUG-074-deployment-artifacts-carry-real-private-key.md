# BUG-074: Pages 部署产物携带**真实私钥**（`deployments/<id>/files/node.key`）—— BUG-067 未被覆盖的第二条通道

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-074 |
| 严重级 | **P1**（安全：私钥随发布产物落盘并被 `bundle.json` 全文内联，下发即泄漏） |
| 发现轮次 | round-25（`task-107` I 组阶段 0 只读探针，研究 agent 附带发现；PM/Lead 复核） |
| 关联 | BUG-067（`dist/` 通道，已关）、§155 T5-1/T5-5（商店一键部署硬化）、`arc-contracts.md §43(3)` |
| 状态 | 🟥 待修（Lead 立项；修复需产物级扫描门禁 + 人类批准的部署演练） |

## 事实（原始证据）

```
$ ls -la ~/.arc/pages/projects/arcblog/deployments/deploy-1790502606264-leu7r2/files/node.key
-rw-------  119  ...  node.key
$ head -c 60 ~/.arc/pages/projects/arcblog/deployments/deploy-1790502606264-leu7r2/files/node.key
-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEILWIYaqENTYQ
```

同级目录还含 `package-lock.json` 等**不应进包**的仓库根文件；`~/.afs/blocklets-staging/arcblog/.afs/bundle.json`
把这些文件**全文内联**（path → 内容）。共 155 个历史 deployment 目录。

## 根因

`arc deploy` / `arc blocklet instance deploy` 把**仓库根整树**作为发布根，与 `arc blocklet build` 同源；
BUG-067 的 `scrub:dist-secrets` **只覆盖 `dist/**`**，因此这条通道完全没有防护。
（`arc blocklet build --help` 无 `--exclude/--ignore`，平台不认 `.blockletignore` —— 见 §39。）

## 修法（建议，R26 立项）

1. **发布根不得是仓库根**：部署前把「允许进包的白名单/黑名单」物化到一个临时发布目录（排除 `node.key`、`.env.local`、
   `*.pem`、`package-lock.json`、`docs/dsh-*` 等），再对临时目录执行 `arc deploy`。
2. **产物级扫描门禁**（两条通道共用）：扩展 `scripts/arcblog-dist-secrets.mjs` 支持 `--dir <path>`，
   并在 CI/构建后对 `dist/**` **与** `~/.arc/pages/projects/<project>/deployments/**` 都跑 `--check`；
   把它接进 `npm run build` 之后（或新增 `npm run verify:artifacts`）。
3. **已有产物处置**（需人类批准，涉用户数据）：对已落盘的 155 个 deployment 目录做一次 `--check` 扫描并**清理泄漏副本**；
   若要更强保证，评估该内容签名密钥是否需要轮换（`node.key` 同时用于内容签名 §67，轮换需重签既有内容，代价高）。
4. **纪律**：真实部署演练（`arc deploy --publish` / `--cloud cf`）属写操作 + 外部凭据，**必须人类逐次批准**。

## 影响范围与受限

- 影响：任何把仓库根当发布根、且仓库根含密钥的操作（`deploy` 系列）。
- 受限未验证：产物时间戳为 **2026-09-27**，本次**未重跑部署**（需 Pages 写权限 + CF 凭据/域名，未获授权）；
  因此「当前版本是否仍复现」未独立验证——但机制（整树复制）已由 §39 与 §43(2) 实测支撑。
