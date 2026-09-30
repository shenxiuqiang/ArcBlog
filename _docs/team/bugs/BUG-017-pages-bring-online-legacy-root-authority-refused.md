# BUG-017: 旧 CLI/root 授权的公开页面副本存在时，`?page=pages` 行内「Bring online」被平台诚实拒绝（生命周普适性需产品裁决）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-017 |
| 严重级 | **P3**（平台约束 + 产品口径：**不静默写坏数据**、报错诚实；只影响「旧 CLI/root 授权」的既有记录，页面自建记录不受影响。普适化会触及 AFS 记录/CLI 形态，按 REQ-008 §2.1 D 应上报裁决） |
| 发现轮次 | **round-9-reverify（R9F）** —— 复验 REQ-008 A3 的 `pages.aup:157/178`（现行 :184）修复时独立测得 |
| 关联 REQ | REQ-008 §2.1 A/D（`pages.aup:157/178` 同型修复 + 「若判定需要改 CLI / AFS 记录形态 → 停手上报」）；spec §15.4 页面生命周期 |
| 状态 | 待裁决（选项：① 接受诚实报错并把「先 Remove public copy 再 Bring online」写进提示/文档；② page-owned overlay + CLI worker；③ 其它产品裁决） |
| 写范围 | 疑似文件属 Dev（`.aup/pages/admin/pages.aup`）；QA 未改任何源码 |

## 复现命令与最小步骤

1. 前置：admin 会话（本机共享调试 Chrome / CDP 9333）；写 `.gate-lock`。
2. 用 **AFS 直写**（= CLI/root 授权）造一条公开页面探针 `pages/qa-r9f-pageprobe.json`（真实 `pages/page-test-…json` 也是这种授权来源）。
3. `?page=pages&locale=en` → 对该行点 **Take offline**（成功，写 `page-drafts/<slug>.json`；**公开副本仍保留**，见 confirm 文案）。
4. 在「Offline pages」区对该行点 **Bring online** → 拒绝。
5. 再点 **Remove public copy**（删除 `pages/<slug>.json`），然后重试 **Bring online** → 成功。

```bash
printf 'QA … — pages bring-online authority probe\n' > docs/team/.gate-lock
node -e "…writeJson(INSTANCE_ROOT+'/pages/qa-r9f-pageprobe.json', {slug:'qa-r9f-pageprobe',title:'QA R9F page probe',status:'online',…})"
node /tmp/qa-r9/click3.mjs 'http://arcblog.localhost:4939/?page=pages&locale=en' 'QA R9F page probe' 'Take offline'      1803 908
node /tmp/qa-r9/click3.mjs 'http://arcblog.localhost:4939/?page=pages&locale=en' 'QA R9F page probe' 'Bring online'      1803 908
node /tmp/qa-r9/click3.mjs 'http://arcblog.localhost:4939/?page=pages&locale=en' 'QA R9F page probe' 'Remove public copy' 1803 908
node /tmp/qa-r9/click3.mjs 'http://arcblog.localhost:4939/?page=pages&locale=en' 'QA R9F page probe' 'Bring online'      1803 908
```

## 期望

「Take offline → Bring online」应能在页内闭环完成（或至少在提示里写明必须先「Remove public copy」）；无论哪种，都不应出现运营商看到「点击成功提示但操作未生效」的情况。

## 实际

- 第 1 次 **Bring online**：弹出**诚实错误** toast，**没有写入**（`pages/qa-r9f-pageprobe.json` 的 `updatedAt` 保持 seed 值 `2026-09-27T17:36:33.153Z`，未变）：
  `Forbidden at /instance/app/arcblog/pages/qa-r9f-pageprobe.json: network write target exists without a recoverable authority sidecar`
- 错误信息里的路径是**真实 slug**（`qa-r9f-pageprobe`，不是 `${entry.content.slug}`）⇒ 模板求值本身**已修好**，被拒的是平台对「既有非可恢复授权记录」的重写规则。
- 点击 **Remove public copy**（成功后）再点 **Bring online**：写入成功，`pages/qa-r9f-pageprobe.json` 被重写为真实值、`updatedAt=2026-09-27T17:37:19.571Z`、`createdAt` 保留 `17:36:33.153Z`。

## 证据输出

```text
# 1) 公开副本（root 授权）仍在时点 Bring online
ROW   {"rowFound":true,"rowText":"QA R9F page probe ● Offline just now qa-r9f-pageprobe Bring online Delete","clicked":"Bring online"}
MODAL {"modal":true,"modalText":"Bring online","clicked":"Bring online"}
AFTER {"toasts":["Forbidden at /instance/app/arcblog/pages/qa-r9f-pageprobe.json: network write target exists without a recoverable authority sidecar","…"],"modalStillThere":false}

# 2) 无写复核（updatedAt 未变）
pages/qa-r9f-pageprobe.json: {"status":"online","updatedAt":"2026-09-27T17:36:33.153Z"}      ← 与 seed 相同
page-drafts ids: ["qa-r9f-pageprobe.json"]                                                    ← Take offline 的产物在

# 3) 先删公开副本（Remove public copy），再 Bring online
$ … 'Remove public copy'  → toast "Removed." ; pages/qa-r9f-pageprobe.json: GONE (deleted)
$ … 'Bring online'        → 成功
pages/qa-r9f-pageprobe.json: {"slug":"qa-r9f-pageprobe","title":"QA R9F page probe","status":"online","body":"probe body","authorDid":"did:blocklet:arcblog",
                              "createdAt":"2026-09-27T17:36:33.153Z","updatedAt":"2026-09-27T17:37:19.571Z"}   ← 真实值、createdAt 保留

# 4) 页面自带的 confirm 文案确实描述了「两步走」
act-offline-msg { en "Keeps an offline copy under page-drafts/; remove the public copy to complete." }
```

探针已逐条清理（见 `docs/team/test-reports/round-9-reverify.md` §7），实例回到 baseline。

## 影响范围

- 受影响角色：admin（控制台运营者）
- 受影响链路：`?page=pages` 的页面上下线流程，**仅当公开副本由 CLI/root（非可恢复授权）写入时**
- 数据后果：无（拒绝即无写；页面自建记录可正常重写）
- 可绕过：是（先点 `Remove public copy` 删除公开副本，再点 `Bring online`；或走 `node scripts/arcblog-pages.mjs`）

## 疑似文件

- `.aup/pages/admin/pages.aup:184`（Bring online：`exec "/.actions/write"` → `pages/${args.eSlug}.json`，单写）
- 平台规则旁证：`docs/arc-contracts.md`（网络写入既有记录需要可恢复的 authority sidecar；`/.actions/delete` 与新路径写入不受限）—— 该条**尚未**写入 `docs/arc-contracts.md`，属 Dev/授权写入方范围
- 复验报告：`docs/team/test-reports/round-9-reverify.md` §3-F / §5 观察 2
