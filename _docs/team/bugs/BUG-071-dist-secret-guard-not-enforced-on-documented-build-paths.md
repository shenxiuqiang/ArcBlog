# BUG-071: BUG-067 的守卫/清理不在被文档化的构建入口上强制 —— `AGENTS.md`/`CLAUDE.md` 仍指向裸 `arc blocklet build`，`--output` 与 `deploy` 绕过 wrapper 与守卫（修复残余）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-071 |
| 严重级 | **P3**（安全加固/文档门禁；已有 fast-tier 守卫兜底，故不按 P1 处理） |
| 发现轮次 | round-24f（QA task-104 复验 BUG-067 交付②时发现） |
| 关联 REQ | 无（L-R24F-3 的修复残余）；相关铁律 `AGENTS.md` §2/§4 |
| 状态 | 待裁决 |

## 复现命令与最小步骤

1. 前置：仓库根有 `node.key` / `.env.local`；`package.json` 已有 `build` = `arc blocklet build && npm run scrub:dist-secrets`（BUG-067 交付）。
2. 按仓库自己文档化的质量门跑**裸** `arc blocklet build`（`CLAUDE.md`「Quality gates」与 `AGENTS.md` 铁律 2 都写着这条命令），不跑 `npm test`、不跑 scrub。
3. 观察 `dist/`：密钥副本与 manifest 条目是否回来。
4. 另测 `--output` 到仓库外目录：wrapper 与 scrub 是否会作用到它。

```bash
arc blocklet build --help        # 无任何排除/ignore 开关
arc blocklet build               # 文档化的那条命令（裸跑）
ls -la dist/node.key dist/.env.local
python3 -c "import json;m=json.load(open('dist/.afs/manifest.json'));\
print([f['path'] for f in m['files'] if 'node.key' in f['path'] or 'env.local' in f['path']])"

arc blocklet build --output /tmp/bug071-dist   # wrapper/scrub 不覆盖这个输出目录
ls -la /tmp/bug071-dist/node.key /tmp/bug071-dist/.env.local
```

## 期望

BUG-067 的缓解措施应当在**所有**会把仓库镜像成包的构建入口上生效，或至少让仓库文档/质量门只指向安全入口，使「按文档操作」不会重新制造密钥包。

## 实际

- `arc blocklet build --help` 只有 `--output` / `--dry-run` / `--clean`，**平台侧没有排除开关**（根因无法在构建侧修，BUG-067 的结论成立）。
- 裸 `arc blocklet build`（**正是 `AGENTS.md`/`CLAUDE.md` 教 agent 跑的命令**）依旧把 `node.key`（119 B）与 `.env.local`（499 B）复制进 `dist/` 并写进 `dist/.afs/manifest.json` —— 缓解只在 `npm run build`（wrapper）与 `npm test`（守卫）里，两者都是**可选**路径。
- `arc blocklet build --output <dir>` 与 `arc blocklet deploy` 都不经过 `npm run build`，因此既不 scrub 也不被守卫在构建时拦住；唯一的兜底是「恰好有人之后跑了 `npm test`」。
- 实测旁证：`arc blocklet build --output /tmp/qa24f/dist` 的输出目录里 `node.key`/`.env.local` 物理存在，manifest（1037 files）也把两者列出。

## 证据输出

`docs/team/test-reports/raw/round-24f/11-repo-build.txt`、`12-repo-check-red.txt`、`16-tempout-build.txt`、`15-build-dryrun.json`：

```text
$ arc blocklet build --help
Options:
      --output    Output directory for the built artifact (default: <dir>/dist)  [string] [default: ""]
      --dry-run   Compute manifest without copying files or writing to disk      [boolean] [default: false]
      --clean     Clean the output directory before writing (default: true)      [boolean] [default: true]
# ⇒ 无任何排除/ignore 选项

$ arc blocklet build                    # 裸跑，就是 CLAUDE.md/AGENTS.md 里的命令
Published 1030 file(s) → /Users/shenxiuqiang/workspace/ArcBlog/dist
$ ls -la dist/node.key dist/.env.local
-rw-------@ 1 shenxiang  staff  499  9月 29 10:26 dist/.env.local
-rw-------@ 1 shenxiang  staff  119  9月 29 10:26 dist/node.key
$ python3 … manifest …
files: 1030
['.env.local', 'node.key']

$ arc blocklet build --output /tmp/qa24f/dist
$ ls -la /tmp/qa24f/dist/node.key /tmp/qa24f/dist/.env.local
-rw-------@ 1 shenxiang  wheel  499  9月 29 10:25 /tmp/qa24f/dist/.env.local
-rw-------@ 1 shenxiang  wheel  119  9月 29 10:25 /tmp/qa24f/dist/node.key
files: 1037 ; ['.env.local', 'docs/team/.gate-lock', 'node.key']
```

对照（安全入口确实有效，BUG-067 交付已验证）：

```text
$ npm run build            # 同一棵树，wrapper 里 scrub 生效
Published 1030 file(s) … scrub: manifestFilesBefore 1030 → manifestFilesAfter 1028
$ node scripts/arcblog-dist-secrets.mjs --check   → ok:true, files:[], manifestEntries:[]  rc=0
```

退出码：0

## 影响范围

- 受影响角色：任何按仓库文档操作、并会 `arc blocklet deploy` 的人
- 受影响链路：打包与部署（`arc blocklet build` → `dist/` → `arc blocklet deploy`）
- 数据后果：本地 `dist/` 会再次含密钥副本（未进 git；`npm test` 会变红拦住提交）
- 可绕过：是（一律走 `npm run build`；发布前 `node scripts/arcblog-dist-secrets.mjs --check`）
- **为什么是 P3**：BUG-067 的三项交付（守卫、scrub、runbook）已由 QA 独立验证通过，且 `npm test` 一旦跑就会红，不会静默；本条是「文档/门禁仍是裸命令 + `--output`/`deploy` 绕过」的加固建议，不构成新的密钥外泄事实。

## 疑似文件

- `AGENTS.md`（铁律 2：`改了 .aup 还要 arc blocklet build`）
- `CLAUDE.md`（「Quality gates」：`arc blocklet build   # only when .aup changed`）
- `package.json`（`build` 已被 wrapper 占用；可考虑额外提供 `build:raw` 或在文档里统一改指 `npm run build`）
- `scripts/arcblog-dist-secrets.mjs`（可在 non-repo `--dist` 输出上也提供 `--check` 指引）
