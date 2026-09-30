# BUG-018: `?page=pages` Bring online 的「诚实拒绝」在 Round 10 环境**不可复现**；`arc-contracts.md` §29.2 的记载与实测不符（范围外 / 文档事实）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-018 |
| 严重级 | **P3**（文档/观察事实：不阻断任何链路；页面文案与实现均按 D13 正确落地。风险在于团队据 §29.2 断言「平台拒绝 CLI/root 既有记录的重写」，而当前环境已观察不到该拒绝） |
| 发现轮次 | **round-10（QA-005 独立复验）** |
| 关联 REQ | REQ-009 §2.1 ② / A5（期望 2「保留平台的诚实拒绝」）；上游 BUG-017；`docs/arc-contracts.md` §29.2（属 **Lead** 写范围，QA 未改） |
| 状态 | 待裁决（建议：① 更正/限定 §29.2 的适用条件；② 由 Lead 判定 BUG-017 是否降级为「历史观察」。**不涉及本轮 Dev 产物改动**） |

## 复现命令与最小步骤

1. 前置：admin 会话（本机共享调试 Chrome / CDP 9333）；写 `docs/team/.gate-lock`。
2. 用 **CLI 同款通道**（`scripts/lib/arc.mjs` 的 `writeJson` → `arc afs exec /blocklets/arcblog/.actions/write`，**与 `scripts/arcblog-pages.mjs:68/91/103` 完全相同**）造一条 root 授权公开页面副本 `pages/qa-r10-pageprobe.json`。
3. `?page=pages&locale=en` → 对该行点 **Take offline**（成功，写 `page-drafts/`，公开副本保留）。
4. 在「Offline」区点 **Bring online** 并确认。
5. 复核：记录 `updatedAt` 是否变化（BUG-017 的判据是「拒绝 + 不写」）。

```bash
printf 'QA round-10 — pages bring-online refusal recheck\n' > docs/team/.gate-lock
node -e "import('/Users/shenxiuqiang/workspace/ArcBlog/scripts/lib/arc.mjs').then(m=>m.writeJson(m.INSTANCE_ROOT+'/pages/qa-r10-pageprobe.json',{slug:'qa-r10-pageprobe',title:'QA R10 page probe',status:'online',body:'probe body',authorDid:'did:blocklet:arcblog',createdAt:'2026-09-27T18:00:00.000Z',updatedAt:'2026-09-27T18:00:00.000Z'}))"
node /tmp/qa-r9/click3.mjs 'http://arcblog.localhost:4939/?page=pages&locale=en' 'QA R10 page probe' 'Take offline'   1803 908
node /tmp/qa-r9/click3.mjs 'http://arcblog.localhost:4939/?page=pages&locale=en' 'QA R10 page probe' 'Bring online'  1803 908
```

## 期望

按 BUG-017 / `arc-contracts.md` §29.2：公开副本由 CLI/root 写就且仍存在时，页面的 Bring online **被平台拒绝、无写入**，toast 含
`Forbidden at /instance/app/arcblog/pages/qa-r10-pageprobe.json: network write target exists without a recoverable authority sidecar`，且 `updatedAt` 保持 seed 值 `2026-09-27T18:00:00.000Z`。

## 实际

**写入成功**，没有任何拒绝；`updatedAt` 被改写到 `2026-09-27T18:17:34.883Z`，`relation/status` 等字段为真实值，toast 为成功提示 `Page is online.`。
同一会话内重跑两步走（Take offline → Remove public copy → Bring online）同样全部成功（`createdAt` 保留）。

## 证据输出

```text
# 点击前（seed 后、Take offline 之后；公开副本仍在，未被改写）
$ node -e "…readJson(INSTANCE_ROOT+'/pages/qa-r10-pageprobe.json')…"
updatedAt= 2026-09-27T18:00:00.000Z status= online

# Bring online 真实点击（admin 会话 + 页面内确认框）
ROW   {"rowFound":true,"rowText":"QA R10 page probe ● Offline just now qa-r10-pageprobe Bring online Delete","clicked":"Bring online"}
MODAL {"modal":true,"btnText":"Bring online","boxClass":"aup-alert-actions","boxText":"Cancel Bring online","bodyHasRemovePublicCopy":true,"allBtns":["Cancel","Bring online"]}
CONFIRM CONFIRMED
AFTER {
 "toasts": ["Page is online.✕","Page is online.✕","Page is online.","Page is online.","✕"],
 "modalStillThere": false,
 "bodySnippet": "… QA R10 page probe ● Online just now /pages/qa-r10-pageprobe View Take offline Remove public copy …"
}

# 点击后
$ node -e "…readJson(INSTANCE_ROOT+'/pages/qa-r10-pageprobe.json')…"
updatedAt= 2026-09-27T18:17:34.883Z status= online        ← 被改写，非拒绝
```

**环境差异（可核验的时间线，CST = UTC+8）**

```text
$ date '+%Y-%m-%d %H:%M:%S %Z'; date -u '+%Y-%m-%dT%H:%M:%SZ'
2026-09-28 02:25:40 CST      2026-09-27T18:25:40Z
$ ps -o lstart= -p 53221            # arc service _run（arcblog 所在的 daemon）
一  9月/28 02:04:49 2026            # = 2026-09-27T18:04:49Z  —— daemon 已重启
$ stat -f '%Sm' -t '%Y-%m-%dT%H:%M:%S' /tmp/qa-r9f/seed.mjs
2026-09-28T01:31:51                 # = 17:31:51Z —— R9F（BUG-017 的观测）发生在重启【之前】
```

⇒ BUG-017 的拒绝观测（R9F，17:36Z）由**另一个 daemon 进程**服务；本轮（18:14Z 起）在同一实例、同一 admin 会话、同类 seed 下不复现。Dev 本轮亦独立报告 `tree-merge`/`replace` 对 root(CLI) seed 的 `hub/registrations` 记录写入成功，与之吻合。

## 影响范围

- 受影响角色：admin（控制台运营者）；间接影响团队文档可信度
- 受影响链路：`?page=pages` 页面上下线流程；`docs/arc-contracts.md` §29.2 的结论
- 数据后果：本轮探针已清理，实例回到 baseline（见 `round-10.md` §7）
- 可绕过：不适用（不是阻断项）

## 疑似文件

- `docs/arc-contracts.md` §29.2（现第 1479–1487 行）—— **Lead 写范围，QA 未改**
- `.aup/pages/admin/pages.aup:10/11`（本轮仅 i18n 文案；`exec` 形态未动，**非缺陷**）
- 复现参照：`docs/team/bugs/BUG-017-pages-bring-online-legacy-root-authority-refused.md`、`docs/team/test-reports/round-9-reverify.md` §3-F/§5 观察 2
