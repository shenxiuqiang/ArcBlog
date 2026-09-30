# S1 事实审查（Lead 复核 · 独立于撰写者）

| 字段 | 值 |
| --- | --- |
| 审查人 | **Lead**（与撰写者 `doc-owner` 为不同 agent；两次派出的子智能体审查者中，"产品审查"已独立交付 `S1-产品审查.md`，"事实审查"一路未在约定时间内落盘，故由 Lead 补做事实核验） |
| 日期 | 2026-09-30 |
| 被审文件与版本 | `docs/01-产品概念/`：`00-导读.md` v0.1(98行)、`01-产品定位与边界.md` v0.3(314)、`02-用户与角色.md` v0.1(263)、`03-使用旅程.md` v0.1(223)、`04-概念与术语.md` v0.1(190) |
| 判据 | `docs/README.md` §4（四类事实标签 + 每条断言带出处）、§5（审查清单）；归档权威 `_docs/arc-contracts.md`、`_docs/ArcBlog-product-technical-spec.md`；调研 `docs/08-其他/调研/S1-0{1,2,3,4}-*.md` |
| 方法 | 只读：`read`/`grep`/`sed`/`wc`/`test -e`/`arc dsl validate --json`/只读 `arc afs exec .actions/read`。**未** build、未 `npm test`、未部署、未重启、未写实例 |
| 总结论 | **有条件放行**：**P0 = 0；事实类错误 = 0**；3 条精度/残留问题（其中 2 条与产品审 #14 重叠，随该批一并修）。**放行条件 = 产品审的 5 条 P1 修完** |

---

## 一、Lead 独立核验的证据（可复跑）

### 1. 引文抽样：`01` 引用的归档 spec 行号 **11/11 全部对得上**

| 引用 | 原文首句（`sed -n` 实测） |
| --- | --- |
| `spec §1:29` | "一个运行在 ARC 上、由 AFS 组织资源、由 AUP 驱动交互界面…" |
| `spec §8.1:454` | "发行与定价是 Factory owner 的事，不属于 ArcBlog 软件" |
| `spec §141:4687` | "# 141. 软件与网络分离" |
| `spec §142:4708` | "# 142. ArcBlog Network 不应该存在唯一官方 Hub" |
| `spec §147` | "# 147. ArcBlog 的最终产品模型"（"不是 WordPress 的去中心化版本…而是以 DID 为身份、AFS 为资源层…"） |
| `spec §153:5316` | "最终目标不是建立一个新的中心化博客平台…" |
| `spec §139:4643` / `§138:4625` | "# 139. 不应该进入 MVP 的功能" / "# 138. V2" |
| `spec §30:1706` / `§107:3890` / `§61:2584` | "Hub Share" / "Studio Profile" / "Agent 权限" |

### 2. 平台边界断言 vs 实测

| 文档断言 | Lead 实测 | 结论 |
| --- | --- | --- |
| Studio 角色 = `ocap` 真链四步有 tx；**Hub = mock**；经济声明式 | `arc afs exec … read node/factories.json` → `nodes.studio`: `adapter=ocap`/`simulated=false`/`chainVerified=true`/`acquireTx=ABDBD742…`/`stakeTx=0C2D0498…`/`revokeTx=E9971795…`/`claimTx=631F210A…`；`nodes.hub`: `adapter=mock`/`simulated=true`/`chainVerified=false`/`stakeTx=""`/`attribution="adapter mock — SIMULATION, not chain truth"` | ✅ 三件事分开写，正确 |
| 浏览器里没有付费闭环 | `grep -c 'exec\|\.actions/write' .aup/pages/reader.aup .aup/pages/store.aup` → **0 / 0** | ✅ 成立 |
| dashboard 异常提醒已回退 / media 清理按钮已回退 | `grep -c propBind .aup/pages/admin/dashboard.aup` → **0**；`grep -c 'media-intents' .aup/pages/ops/media.aup` → **0** | ✅ 成立 |
| 内容可见性只有 `public｜paid` | `world/post.yaml:27` → `visibility: string # public \| paid` | ✅ 成立 |
| 查询层记录大小红线 ≤1.8 KB（边界区间 (1883, 2376] B） | `_docs/arc-contracts.md:2100/2181-2183`（"内联最大 1883 B / NULL 最小 2376 B…数据层红线取 ≤ 1.8 KB"） | ✅ 引用准确 |
| 跨节点同步未实现（只能写"平台有搬运原语、我们尚未实现"） | `_docs/arc-contracts.md:1873/1879` 原文一致 | ✅ 表述准确 |
| 角色五态 = `none/acquired/staked/revoking/claimable` | `scripts/lib/roles.mjs:40` `export const STAKE_STATES = [...]`（`:35-36` 注释含完整转换） | ✅ 单一真源正确 |
| 意图五状态 = `pending/running/applied/rejected/noop` | `scripts/lib/intents.mjs:33-46` `INTENT_STATUS` + `TERMINAL_STATUSES` | ✅ 词表正确 |
| doctor `authorship` 只测非空（**产品审 #5 的依据**） | `scripts/arcblog-doctor.mjs:122` "reports records with an empty authorDid (**warning only**)" | ✅ 产品审 #5 成立 |

### 3. 规范合规（自动扫描 5 篇）

- 头部五字段（状态/版本/上游/下游/证据基线）：**5/5 齐全**；文末「开放问题」：**5/5 齐全**
- 行数：98 / 314 / 263 / 223 / 190 —— **全部 ≤400**（总纲 §4）
- 四类标签：均出现；跨文档 grep 未发现同一事实的重复定义（页数不硬编码、五态单一真源、意图队列单一出处三处均已抽查）
- 相对链接：全部 `test -e` 可达，**0 死链**（与产品审查独立结论一致）
- 禁用措辞扫描：`应该能/大概/更好/更完善` 命中 2 处，**均为引用禁令本身**（`02:239`、`04:155`），非违规

---

## 二、事实类发现（3 条，均为 P2/P3；无 P0/P1）

| # | 对象 | 问题 + 证据 | 严重度 | 正确写法 |
| :-: | --- | --- | :-: | --- |
| L1 | `01:88` | 写"术语唯一出处 = `04-概念与术语.md`（**待写**）"，而 `04` 已 v0.1 落盘 | P3 | 删"（待写）"（与产品审 #14 同条） |
| L2 | `04 §10` O1/O3 | 两条仍列为"开放问题"，但 Lead 已裁决：O1 = 总纲 §6 已补登术语表；O3 = 接受"名称在 `04`／语义在 `02-产品需求`"的切分 | P2 | 移入"已裁决（Lead，2026-09-30）"并保留理由；不得继续挂在开放问题里 |
| L3 | `03:27` | "实测 21 节 / 5 组"把页数写进正文，而 `04 §9` 自订"控制台页数等硬编码数字禁止"（产品审 #14 已列） | P3 | 只留来源（`CONSOLE_SECTIONS`），不写数字 |

---

## 三、未能验证的断言（如实登记）

| 断言 | 为什么无法验证 | 建议的验证方式 |
| --- | --- | --- |
| 页面提交后 `authorDid` 的**落库形态** | 需登录态会话；本阶段禁止取 cookie / DID 登录 | Stage 2 前置：一次性登录态探针（提交 1 条草稿 → 回读 `drafts/<slug>.json`），对应 `_docs/team/requirements/REQ-041-console-author-identity.md` |
| "8 个对标产品中无一提供该层"（`01 §5.3`） | Substack 403、Hashnode/Mirror/Medium 未取得一手页面（产品审 #13 同条） | 限定为"据 R2 §3 现有取证（4–5 项非一手）"，或列为 Stage 2 前置核验项 |
| 角色链上 tx 的**链上真实性** | 只读 AFS 能看到 `chainVerified=true` 与四步哈希，未逐笔在 beta 浏览器核验 | 可选：`arc` 只读查询逐笔核验（Stage 5 平台边界篇） |

---

## 四、过程缺陷登记（制度性，交 Stage 7）

- **审查者交付不可控**：本阶段共派出 3 名审查子智能体（产品×2、事实×1），实际落盘 1 份（产品审查）；其余 2 名在约定时间内未产出，且 `send_message` 无法对子智能体催收（"active teammate not found"）。
- **影响**：事实审查由 Lead 补做 ⇒ 审查独立性弱于"外部审查者"理想态（Lead 与撰写者仍是不同 agent，且证据全部由 Lead 独立复跑，但同一组织内）。
- **对策（写入 Stage 7 的协作规范）**：① 审查任务必须带**交付时限 + 落盘路径**，超时由 Lead 接管并在报告中登记；② 审查报告一律**先落盘再加结论**（增量写盘），避免"读完才写"导致整体丢失；③ 关键阶段（Stage 2/3/5/6）至少一路审查由**独立 teammate** 承担（可多次唤醒，不依赖单次长任务）。
