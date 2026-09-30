# 在 ArcBlog 工作区使用 workflow 与 ralph

> 环境与部署级说明（不是 ArcBlog 产品文档）。适用：本机 dsh checkout `/Users/shenxiuqiang/deepseek-harness`，GUI 为 `dsh web`（`--profile web`）。
> 结论先行：**workflow/ralph 是「部署级」能力，不是「工作区级」**。启用一次，所有工作区都能用；工作区只决定会话的 cwd 与文件沙箱策略。

---

## 1. 先搞懂两个「平面」——这是所有坑的根源

dsh 的组合树分两个平面，**同一个行 id 可以分别在两边出现**：

| 平面 | 是什么 | 由谁提供 | 典型内容 |
| --- | --- | --- | --- |
| **host plane** | 组合树顶层、process-wide 的插件行 | bundle 层（`dsh-base`、`dsh-web-app`）+ profile patch 层 + `--patch` overlay | `dsh-base` **启用** `workflow-ptc` / `tool-workflow`；`dsh-web-app` 把**每个 Agent 的模型工具行禁用**，让位给 preset |
| **agent preset plane** | **每个会话（Agent）**挂载的插件清单 | `@deepseek-ai/dsh-agent-preset` 行，插在 web patch 之后 | `packages/bundle/web-app/presets/standard.patch.yml`（preset id = `standard`，注册表 `config.default: standard`） |

证据（都在 checkout 里）：

- `packages/bundle/web-app/cordis.patch.yml` §"the agent plane moves behind agent presets"：*"Web surface disables them here and lets each session mount a preset instead."*
- `packages/bundle/web-app/presets/standard.patch.yml` 第 1–3 行：*"Edits saved from the Web editor override this row's `config.plugins` by id from the profile patch."*
- `.agents/notes/implemented/simplification/2026-09-12-ralph-off-in-shipped-defaults.zh.md`：`tool-ralph` 的 host 行**必须保留声明**，否则它会回到 Web host plane 并**与每个 preset 的同名行冲突**。

**推论（务必记住）**

| 你想在哪用 | 该改哪个平面 | 文件 |
| --- | --- | --- |
| **Web GUI**（你现在这个） | agent preset plane | `packages/bundle/web-app/presets/standard.patch.yml` |
| **headless / 一次性 CLI** | host plane | `--patch` overlay，或 `~/.dsh/profiles/<profile>/cordis.patch.yml` |

> ⚠️ 在 `~/.dsh/profiles/web/cordis.patch.yml` 里写 `- id: tool-ralph / disabled: false` 是**错的**——那是 host plane，会和每个 preset 的同名行撞车。本仓库里这个改动已经**撤销**。

## 2. 工作区到底影响什么

| 维度 | 部署级（profile / bundle） | 工作区级 |
| --- | --- | --- |
| 有哪些工具（workflow / ralph / …） | ✅ 在这里决定 | ❌ 无关 |
| 会话 cwd、file sandbox policy | ❌ | ✅ |
| 子 agent 继承的 cwd / lineage / depth | ❌ | ✅（经 subagent seam 传递） |

所以「在 ArcBlog 里用 workflow」= ①部署里启用（已完成）②**在 ArcBlog 工作区开会话**。

GUI 已经把 ArcBlog 注册成工作区了——`~/.dsh/storages/workspace.json` 里有：

```json
"path": "/Users/shenxiuqiang/workspace/ArcBlog", "title": "ArcBlog"
```

## 3. 三种使用方式

### A. GUI（推荐）

在 GUI 里切到 **ArcBlog** 工作区，**新开一个会话**（preset 定义在 Agent 创建时生效，老会话不会变）。

- `workflow`：**本来就有**（`dsh-base` 已启用 `workflow-ptc` + `tool-workflow`）。
- `ralph`：已按 §4 打开，**需要新会话**；若仍不可见，重启 `dsh web`。

### B. headless（不依赖 GUI，可脚本化）

```bash
cd ~/workspace/ArcBlog
dsh --profile headless --patch ~/.dsh/overlays/ralph.yml "用 workflow 审一遍管理后台的界面一致性"
```

`~/.dsh/overlays/ralph.yml` 已建好（只翻 `tool-ralph`，**不 insert** `workflow-ptc`/`tool-workflow`，因为它们已在 base 平面启用；重复 insert 会产生重复 id）。

### C. 另起一个 Web 服务（换工作区但不影响现有会话）

```bash
cd ~/workspace/ArcBlog && dsh web --port 3081
```

注意：3080 上正在跑的会话**不会**被这个替代，两个服务各自独立。

## 4. 已经做了什么改动 / 怎么回退

| 改动 | 说明 | 回退 |
| --- | --- | --- |
| `packages/bundle/web-app/presets/standard.patch.yml` | `tool-ralph: disabled: true → false`（带 `LOCAL CUSTOMIZATION` 注释）。这是 GUI 默认 preset 的正确开关 | `git checkout packages/bundle/web-app/presets/standard.patch.yml` |
| 新增 `~/.dsh/overlays/ralph.yml` | headless 用的 host-plane overlay | 直接删 |
| `~/.dsh/profiles/web/cordis.patch.yml` | **已恢复原样**（2619 字节）；备份 `cordis.patch.yml.bak-20260927-220627` | — |

**生效与影响范围**

- preset 定义 eager 加载，**编辑影响之后创建的 Agent** → 新开会话即可；没生效就重启 `dsh web`。
- 这是**默认 preset**，所以影响**所有** web 会话，不只 ArcBlog。只想给 ArcBlog 用，就在 GUI 的 agent-preset 编辑器里单独建一个 preset。
- `maxRounds` 默认 **64**（bundle 里配的；包默认是 256）。要改就在 preset 行里加 `config.maxRounds`。
- 这是对 checkout 的本地定制：`git pull` / 重装可能冲突。

## 5. workflow 速查

**编排脚本**（由模型生成，你不用手写）：纯 JS 函数体，允许 top-level await，`return <纯 JSON>`。

| hook | 语义 |
| --- | --- |
| `agent(prompt, opts?)` | 起一个子 agent。`opts` 只认 `label / phase / schema / provider / model`；给 `schema` 返回结构化对象 |
| `parallel([thunks])` | 并发，**有屏障** |
| `pipeline(items, ...stages)` | 每个 item 独立走多阶段，**无阶段间屏障**（官方推荐优先） |
| `phase(title)` / `log(msg)` | 进度 |
| `args` | 调用方传入的 JSON |

**限额（默认值，实读源码）**

| 配置 | 默认 | 含义 |
| --- | --- | --- |
| `maxConcurrentAgents` | `0` → `min(16, max(1, CPU-2))` | 并发子 agent 上限 |
| `maxTotalAgents` | `1000` | 单次运行总 agent 上限（防跑飞） |
| `maxItemsPerCall` | `4096` | 单次 hook 调用 item 上限 |
| `syncTimeoutMs` | `5000` | 脚本同步段超时 |

**失败语义**：子 agent 失败 → 该项 `null`，脚本继续；**hook 用错**（未知 option / 超 cap / schema 不合法）→ `WorkflowError{fatal:true}`，**整脚本被杀**。

**作者契约**：`meta` 需 `name`+`description`；schema 只支持 `type/properties/required/additionalProperties/items/enum/const/oneOf` 且必须 object root；`effort/isolation/agentType` 是 deferred，用了报错。

## 6. ralph 速查

```
ralph({ objective, maxRounds? })
```

- **前台固定循环**：每轮起一个**全新**子 agent 干**同一个不可变目标**，只传上一轮的**有界结构化报告**，**工作区是跨轮的唯一长期记忆**。
- 报告字段：`status`（`continue`/`complete`/`blocked`）+ 非空 `summary` + `evidence` + `nextSteps` + blocker 文本。
- **串行**（一轮一个 agent）——它解决「不停」，不解决「并行」；并行用 workflow。
- 上限：`maxRounds`（本机 bundle 配 64，包默认 256）、单次报告与最终结果各 16384 字符。
- 终态：`complete` / `blocked` / `budget-limited`。
- 官方纪律：**只在你显式要求 Ralph 式迭代时用**；普通长跑用 goal，有界委派用 subagent / workflow。

## 7. 验证与排查

```bash
# 看某个 profile 最终组合出来的行（host plane）
dsh --profile web      --dump-config | grep -A6 'id: tool-ralph'
dsh --profile headless --patch ~/.dsh/overlays/ralph.yml --dump-config | grep -A6 'id: tool-ralph'

# preset 文件是否已改
grep -A6 'id: tool-ralph' packages/bundle/web-app/presets/standard.patch.yml
```

排查：

| 症状 | 原因 | 处理 |
| --- | --- | --- |
| GUI 里没有 `ralph` | preset 改动只影响**新建** Agent | 新开会话；不行就重启 `dsh web` |
| 组合树里同名 id 出现两次 | 多写了 `insert:`，而 base 已声明该行 | 改成只翻 `disabled`，不要 insert |
| `--dump-config` 里 `tool-workflow` 显示 `disabled: true`，却有 workflow 工具 | `--dump-config` 只反映 **host plane**；GUI 的工具来自 **preset plane** | 别用它判断 GUI 的工具集 |
| headless 报找不到包 | headless profile 没装依赖 | `dsh plugin --profile headless add <包名>` |

## 8. 已知边界

- workflow 的 cap 是**协作式**计数器，不是安全配额，也不是子孙 token 预算；**没有整体耗时上限**。
- 脚本 VM **不是安全边界**，只提供受限全局；真正约束来自 OS policy 与子进程 provider。
- 脚本里跨 realm 的 error **`instanceof Error` 会失败**，按 `name`/`code` 判。
- `arc dsl validate` 与 workflow 无关；仓库的测试门**已分层**（见根 `CLAUDE.md` "Quality gates (tiered)"）：

  | 命令 | 语义 |
  | --- | --- |
  | `npm test` | **快层（~1s）**：6 个**从不写实例**的套件，含产物漂移门、死 locale key、生成侧栏、runtime id、主题契约、guest 权限矩阵 |
  | `npm run test:live` | live 层（**串行，~13 分钟**）：会改 dev 实例，通过后自动清理 |
  | `npm run test:all` | 快层 + live 层（即旧的 `npm test`） |
  | `npm run test:file -- <file>` | 单个测试文件 |

- 因此：**`npm test` 快层可以并发跑**；但 `test:live` / `test:all` 会写**同一个 live AFS 实例**，同一时刻只能一个进程跑。workflow 的子 agent 若并发调 live 层，仍要遵守 `docs/team/README.md` 的串行规则（`.gate-lock`）。
