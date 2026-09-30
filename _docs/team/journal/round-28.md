# Round 28 — 修复 + 批次末统一 QA

| 项 | 值 |
| --- | --- |
| 日期 | 2026-09-29 |
| 轮次 | 28 |
| 模式 | 实现 lane（M/N/O）+ 用户裁定的**批次末统一 QA** |
| 门（合并点） | validate issues=[]、npm test **55/55**、generate --check 无漂移、build 后 dist 一致、console-nav 21、dist 无密钥 |
| 清单 | ✅86 / 🟡4 / ⬜18 / ⚪2 = 110（三行平台边界保持 ⬜） |

## 1. 交付

- **lane M**：BUG-060 关闭 —— 7 个 CLI 补齐 `--help`（不再触发业务；未知 flag 仍 fail-closed）。
- **lane N**：四组视口审计（16 组原始数值 + 2 截图）→ 判 red，查出 D1/D2/D3/D8 + D4/D5 形状偏差。
- **lane O**：D1–D5/D8 全部修复 + **重启 daemon 后**复测通过（16/16 组 so-偏差 0、radius 8px、图例无 running、§9 断言 0）。
- **批次末 QA（独立）**：A 组逐项关闭；B 组队列/角色/hub/预算全通；定向 live 6/6 + 52/52 + 10/10；42/42 页-语言组合恰 1 active。

## 2. Lead 合并点处置（两个 P1）

- **BUG-080**（快层 1 红）：显式重录预算基线并逐页说明差异 ⇒ 55/55。
- **BUG-081**（fail-open：裸调用 chain-worker 默认 `run`，认领并改写链意图）：改为**显式子命令必需**（JSON VALIDATION + exit 1；6 条链意图未动；无 tx 无资金）。
- **BUG-082**（未知 flag 裸栈）：顶层对齐 JSON 错误契约。
- **BUG-083**（P3）：保持 open → R29。

## 3. 过程事实（如实登记）

- QA 探针触发过 BUG-081 的 fail-open（一条 pending 链意图被改写为 rejected，链主机拒绝、无资金）；记录未回滚，作为证据留在实例。
- `.aup` 改动对运行中 daemon 不生效（§34(5)）：本轮每次 UI 改动都在 `arc service restart` 后复测。
- 预算棘轮的语义被再次确认：**新增控件必须显式登记**，不是"静默放行"。
| Lead 提交 | `1bb47b3` — *fix(console,scripts): close the audited UI defects, the budget baseline and two P1s*（R28；79 个非 dist 产物路径 + dist 镜像）。**Lead 收口门**：validate issues=[]、**npm test 55/55**、generate --check 无漂移、build 后 `.aup`/`.web` 对 dist 一致、console-nav pages 21、dist 无密钥；无 gate-lock 入库。**Lead 处置**：BUG-080 显式重录基线（差异逐页入档）、BUG-081 改 fail-closed（裸调用 exit 1，链意图 6 条未动）、BUG-082 顶层 JSON 错误契约；BUG-083 → R29。**归因证据**：QA 的对照实验（重录→绿 / 还原→红）证明快层红灯唯一成因是基线陈旧；lane O 用 CDP 16/16 组复核 D1–D5/D8。|
