# BUG-067: `arc blocklet build` 把 `node.key` 与 `.env.local` 复制进 `dist/`，并在 `dist/.afs/manifest.json` 里列为包内文件（范围外 · 既有）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-067 |
| 严重级 | **P1**（密钥面；但 **范围外 · R24 之前就存在**，不构成本轮阻断，见「影响范围」） |
| 发现轮次 | round-24（QA 按 task-101 的「全仓无私钥/助记词落盘（grep 证据，含 `.aup`/`dist`）」检查时发现） |
| 关联 REQ | 无（范围外）；相关铁律：`AGENTS.md` §4「禁止删除 `node.key` / `.env.local`」、REQ-031 §2.2.12「不暴露私钥面」 |
| 状态 | ✅ **QA 复验通过（round-24f，task-104）—— 可关闭（以 L-R24F-3 的三项交付为口径）**；平台侧无排除开关的根因记为残余风险 → 另记 BUG-071 |

## 复现命令与最小步骤

1. 前置：仓库根有 `node.key`（119 B，`-----BEGIN PRIVATE KEY-----`）与 `.env.local`（499 B，含 `ARCBLOG_CHAIN_MNEMONIC`）。
2. 任意一次 `arc blocklet build`（本轮 Dev 已跑；QA 复跑时输出到 `/tmp/r24-build2`，仓库 `dist/` 未被 QA 改动）。
3. 观察 `dist/` 与 `dist/.afs/manifest.json`。

```bash
ls -la dist/node.key dist/.env.local
git check-ignore -v dist/node.key dist/.env.local        # 两个都被 gitignore
git ls-files dist/node.key dist/.env.local               # 空 ⇒ 未进 git
python3 -c "import json;m=json.load(open('dist/.afs/manifest.json'));\
print([f['path'] for f in m['files'] if 'node.key' in f['path'] or 'env.local' in f['path']])"
```

## 期望

构建产物（`dist/` 与它自带的 `dist/.afs/manifest.json`，即 Pages-ready 包清单）**不含任何密钥面**：不应出现 `node.key`、`.env.local`、助记词或 `PRIVATE KEY`（REQ-031 §2.2.12；spec 的密钥永不入仓原则）。

## 实际

- `dist/node.key`（私钥原文）与 `dist/.env.local`（含链助记词）**物理存在于构建产物里**。
- `dist/.afs/manifest.json` 的 **files 列表里显式包含 `.env.local` 与 `node.key`**（993 个文件的清单里的两条）。
- 缓解事实：根 `.gitignore:43/45` 与 `dist/.gitignore:43/45` 都把这两个文件 ignore 掉，所以**它们不会进 git 仓库**（`git ls-files` 为空、`git status` 不显示）。
- 风险点：清单是 `arc blocklet build/deploy` 的包描述（`{"afs":"1.0","type":"readonly-tree"}` + 993 文件），一旦按清单发布/部署，私钥与助记词会随之离开本机。
- **范围外证据**：`git show HEAD:dist/.afs/manifest.json`、`HEAD~1`、`HEAD~2` 均已包含这两个条目 ⇒ 不是 R24 引入，历史轮次同样存在。

## 证据输出

`docs/team/test-reports/raw/round-24/10-secrets.txt`（助记词原文已打码，报告内不复制密钥内容）：

```text
$ ls -la dist/node.key dist/.env.local
-rw-------@ 1 shenxiang  staff  499  9月 29 09:21 dist/.env.local
-rw-------@ 1 shenxiang  staff  119  9月 29 09:21 dist/node.key

$ git check-ignore -v dist/node.key dist/.env.local
dist/.gitignore:45:node.key	dist/node.key
dist/.gitignore:43:.env.local	dist/.env.local

$ git ls-files dist/node.key dist/.env.local
（空）

$ grep -n 'MNEMONIC' dist/.env.local | sed 's/=.*/=<redacted>/'
6:ARCBLOG_CHAIN_MNEMONIC=<redacted>

$ head -1 dist/node.key
-----BEGIN PRIVATE KEY-----

$ python3 -c "…manifest…"
['.env.local', 'node.key']
manifest files total 993

$ for c in HEAD HEAD~1 HEAD~2; do git show $c:dist/.afs/manifest.json | grep -c '"path": "node.key"'; done
1
1
1
```

退出码：0

对照（`.aup/**` 侧干净）：`grep -rniE "mnemonic|private[_ ]?key|BEGIN .*PRIVATE" .aup/` 只命中两处**说明性文案**（`policy.account-secret-refusal` 的 en/zh，即「本页绝不存储助记词/私钥」），无任何密钥内容；`node.key` 的字节只出现在 `dist/node.key` 一处。

## 影响范围

- 受影响角色：任何拿到构建产物/已发布包的人
- 受影响链路：打包与部署（`arc blocklet build` → `dist/` → `arc blocklet deploy`）
- 数据后果：本地 `dist/` 已含密钥（**未进 git**；本轮不清除，QA 不写 `dist/**`）
- 可绕过：发布前手动删除/排除；正解应在构建侧加排除规则（`blocklet.yaml` 的 files/ignore 或 build 的排除配置）
- **不构成本轮阻断**：R24 未触碰构建配置，且 HEAD 及更早提交已如此；但它是真实密钥面，建议 PM/Lead 单独立项裁决（本轮修 / 下一轮修 / 不修 + 理由）

## 疑似文件

- `blocklet.yaml`（包文件清单/排除规则）
- `dist/.afs/manifest.json`（构建产物：显式列出 `.env.local`、`node.key`）
- `arc blocklet build` 的拷贝规则（平台侧；`--output`/`--clean` 无排除开关）

---

## QA 复验（round-24f · task-104 独立复验 · 2026-09-29）

> 独立复验，不采信 Dev 自述。完整报告：`docs/team/test-reports/round-24f.md` §2/§3.2–3.4/§4；原始输出：`docs/team/test-reports/raw/round-24f/06…14-*.txt`、`19-npm-build.txt`、`16-tempout-build.txt`。

**判定：可关闭（L-R24F-3 三项交付全部独立验证通过；平台无排除开关的根因无法在构建侧根治 → 残余记 BUG-071/P3）**

| 交付 | 复验 | 证据 |
| ---- | ---- | ---- |
| ① fast-tier 守卫 + **两态**自证 | 通过 | 基线 `--check` rc=0/`files:[]`；放假 `node.key`+`.env.local` 进 `dist/` 后 `--check` rc=1（`files:[".env.local","node.key"]`）且 `npm test` = **36 pass / 1 fail**（守卫 ✖ `actual: ['.env.local','node.key']`）；scrub 后 `--check` rc=0、`npm test` **37/37** |
| ② 可执行 scrub + npm script + runbook | 通过 | `package.json` 有 `scrub:dist-secrets` 与 `build`；`npm run build` 实测 `Published 1030` → scrub `manifestFilesBefore 1030 → manifestFilesAfter 1028` → `--check` rc=0；`docs/operations-runbook.md` 新段「Build artifacts must never carry key material (BUG-067)」在位 |
| ③ **源密钥铁律** | 通过 | build+scrub 前后 `sha256sum` 逐字节相同（`2305e487…` / `98320672…`），`mtime` 仍 `Sep 27 16:31`；`assertInside` 运行时断言 + fixture 单测 `assert.throws(..., /outside/)` |
| 泄漏本身 | 独立复现 | 裸 `arc blocklet build` → `Published 1030`，`dist/node.key`(119 B)/`dist/.env.local`(499 B) 物理存在，manifest `files=1030` 且列出 `['.env.local','node.key']`；`arc blocklet build --help` 确认无 ignore/排除开关 |
| 附带核验 | 通过 | `.gate-lock` 已删且 `dist/docs/team/.gate-lock` 不存在；临时 `--output /tmp/…` 旁证输出目录同样带密钥（未触碰仓库 `dist/`） |

**残余（新记 BUG-071/P3）**：缓解只在 `npm run build` 与 `npm test` 上，`AGENTS.md`/`CLAUDE.md` 仍把裸 `arc blocklet build` 写成质量门命令，`--output` 与 `arc blocklet deploy` 绕过 wrapper 与守卫。不构成本轮阻断（`npm test` 一旦执行即变红，不静默）。
**受限未验证**：`.blockletignore` 是否被平台识别未复现（需在仓库根写文件，越出 QA 写范围）；`--help` 无 ignore 开关 + 裸 build 实测复制密钥，已按「不认」保守对待。
