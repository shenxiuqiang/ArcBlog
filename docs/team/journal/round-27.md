# Round 27 — 并行批次（4 lane：H/K/J 实现 ∥ I+L 研究）

| 项 | 值 |
| --- | --- |
| 日期 | 2026-09-29 |
| 轮次 | 27 |
| 模式 | 用户裁定：实现优先、多 dev 并行、QA 批次末统一做一次 |
| 门（合并点） | validate issues=[]、npm test **55/55**、generate --check 无漂移、build 后 dist 一致、重启 daemon 后实机复核 |
| 清单变化 | 无状态列变化（三行保持 ⬜ 并登记平台边界）→ ✅86 / 🟡4 / ⬜18 / ⚪2 = 110 |

## 1. Lane 与产物

| lane | 类型 | 产物 | 结论 |
| --- | --- | --- | --- |
| H | 实现 | `.aup/pages/admin/general.aup`、`.aup/locales/**`、`scripts/arcblog-ui-budget*.mjs`、`scripts/ui-budget-baseline.json` | BUG-076/077/078 关闭（含平台受限登记） |
| K | 实现 | `.aup/pages/ops/hub.aup` | 关系行结构修复；查明 `d8b3476` 过期快照回滚（BUG-079 同机制） |
| J | 实现+探针 | `seed/settings/arcblog/home.json`、`REQ-039-home-module-switch.md` | 首页模块开关**不可表达**（§56/§55）⇒ 只交付数据半边、零假开关 |
| I+L | 研究 | `REQ-037-menu-capability-hiding-phase0.md`、`REQ-038-four-trees-phase0.md` | 能力驱动菜单不可表达（§54）；**§83 实为五棵树** |

## 2. 实机复核（Lead，重启 daemon 后）

- `?page=general` × {zh,en} × {1803,1512}：zh 标签命中、常驻说明命中、`documentElement` 横向 `over=0`。
- `?page=hub` × {en 1803, zh 1512}：11 行、`maxOver=0`、5 处内联 `flex-basis` 生效。
- `?page=policy` zh：常驻说明在、**无条件空态文案 0 条**、`over=0`。

## 3. 平台事实落笔

`arc-contracts` **§54–§56**（能力驱动隐藏不可表达 / settings 挂载是封闭注册表 / 只有行内 entry 上下文的条件闸门可靠）。

## 4. 待用户/Lead 决策（累积）

- **BUG-074**：Pages 部署通道 40 份泄漏副本的清理 + 是否轮换内容签名密钥（需批准）。
- **SPEC-APPROVAL-001** 14 条（其中 **C-14 已被 §51–§53 推翻**：`cron:` 字段存在有双证，建议改判为「字段存在=已验证，实例生效性=T1 待探」）。
- **§83 五棵树**（REQ-038，A1–A8）、**能力驱动菜单**（REQ-037，A1–A6）、**首页模块开关**（REQ-039）均待裁决后开工。
- **REQ-021 P2-a** 真链小额（金额/收款人/上限/回滚）。
| Lead 提交 | `b5e8a75` — *fix(console,docs): roles-panel defects, hub row layout, and three platform probes*（R27 四 lane；35 个非 dist 产物路径 + dist 镜像）。**Lead 收口门**：validate issues=[]、**npm test 55/55**、generate --check 无漂移、build 后 `.aup`/`.web`/`docs` 对 dist 一致、console-nav pages 21、dist 无密钥；**重启 daemon 后实机复核**（general 四组 over=0 + zh 标签、hub 11 行 maxOver=0 + 5 处 flex-basis、policy 0 条无条件空态）；无 gate-lock 入库。**Lead 落笔**：`arc-contracts` **§54–§56**；清单三行保持 ⬜ 并登记平台边界 + `world/*.yaml` 21→22 更正 + 维护记录一行。**编号更正**：lane J 的 REQ-037 与 I+L 撞号 → 改 **REQ-039**。|
