# BUG-040: REQ-028 Dev 报告两处证据与现场不符（试点记录时间戳 / exec 通道退出码）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-040 |
| 严重级 | **P3**（交付物证据准确性：结论本身被 QA 独立复现为真，但报告里引用的两条「原始输出」与现场不符） |
| 发现轮次 | round-16（QA 独立复跑，`task-68`） |
| 关联 REQ | REQ-028-arc-space-integration（证据可复现性） |
| 状态 | 待裁决 |

## 复现命令与最小步骤

1. 读 `docs/team/requirements/REQ-028-dev-report.md`：
   - §7.1 / §2.2 引用的试点记录内容为 `{"slug":"hello-arcblog","title":"Hello ArcBlog","addedAt":"2026-09-28T11:48:48.273Z"}`；
   - §7.1 / §1.2 表把 CLI 侧写失败标为「`No module found for path`（**exit 5**）」，而 §1.1 的同类命令是 `arc afs exec …/.actions/list`（exit 0）。
2. 读现场记录：`arc afs read /blocklets/arcblog/users/z3hzvf2CyM1pb63TCMnFpDTeif8dJ4RykBkbP/arcblog/bookmarks/hello-arcblog.json`
3. 重跑两条 CLI 通道：`arc afs exec /blocklets/arcblog/.actions/write …` 与 `arc afs write --path /user/…`，分别取退出码。

```bash
A=z3hzvf2CyM1pb63TCMnFpDTeif8dJ4RykBkbP
arc afs read /blocklets/arcblog/users/$A/arcblog/bookmarks/hello-arcblog.json
arc afs exec /blocklets/arcblog/.actions/write --args '{"path":"/user/arcblog/qa-cli-probe.json","content":"{\"qa\":1}"}'; echo "exit=$?"
arc afs write --path /user/arcblog/qa-cli-probe.json --content '{"qa":1}'; echo "exit=$?"
```

## 期望

报告里引用的「原始输出」应与交接时的真实 AFS 记录、与同一条命令的真实退出码一致（QA 角色卡 §2.1/§2.5：**任何「已验证」必须附真实命令 + 真实输出**）。

## 实际

1. **试点记录时间戳不符**：报告引用 `addedAt: 11:48:48.273Z`，但交接现场（同一 slug）是 `11:57:56.880Z` —— 报告 §2.2 自己贴的「页面点击后」证据块写的是 `createdAt: 2026-09-28T11:57:56.887Z`，即该记录在报告成文前后又被打过一次，引用值没回填。QA 按报告引用值逐字复读会**读不到**。
2. **exec 通道退出码不符**：报告把「CLI 写 `/user` 失败」统一写成 exit 5；实测 `.actions/write` 这条 **exec 包装**的退出码是 **0**（stdout `NOT_FOUND exec No module found for path: …`），只有 `arc afs write --path` 才是 **exit 5**。结论（CLI 不能写 `/user`）正确，但退出码按通道不同，报告的表述会让后来者用错判据。

## 证据输出

```text
$ arc afs read /blocklets/arcblog/users/z3hzvf2CyM1pb63TCMnFpDTeif8dJ4RykBkbP/arcblog/bookmarks/hello-arcblog.json
{
  "slug": "hello-arcblog",
  "title": "Hello ArcBlog",
  "addedAt": "2026-09-28T11:57:56.880Z"      ← 报告 §7.1/§2.2 引用的是 11:48:48.273Z
}
退出码：0

$ arc afs exec /blocklets/arcblog/.actions/write --args '{"path":"/user/arcblog/qa-cli-probe.json","content":"{\"qa\":1}"}'
NOT_FOUND exec No module found for path: /user/arcblog/qa-cli-probe.json in namespace 'default'
退出码：0                                     ← 报告 §7.1 标为 exit 5

$ arc afs write --path /user/arcblog/qa-cli-probe.json --content '{"qa":1}'
ERROR: No module found for path: /user/arcblog/qa-cli-probe.json in namespace 'default'
退出码：5                                     ← 退出码 5 属于这条命令
```

（QA 未留下任何探针记录：`arc afs ls /blocklets/arcblog/users/z3hzvf2…/arcblog/bookmarks` → 只有 `hello-arcblog.json`。）

## 影响范围

- 受影响角色：无运行时影响（文档/证据层面）
- 受影响链路：交接与复核（QA/Lead 按报告引用值复读会失败；退出码判据会被误用）
- 数据后果：无
- 可绕过：是（以现场 `arc afs read` 与逐命令退出码为准）

## 疑似文件

- `docs/team/requirements/REQ-028-dev-report.md` §1.2 / §1.3 / §2.2 / §7.1（引用值回填 + 退出码按通道分列；Dev/PM 决定是否修订，QA 不改别人的写入范围）
