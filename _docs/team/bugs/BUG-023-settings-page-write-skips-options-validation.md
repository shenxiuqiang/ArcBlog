# BUG-023: `settings-general` 的「基础信息」写入绕过记录自身 `options` fail-closed 校验（select 字段被渲染为自由文本）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-023 |
| 严重级 | **P2**（数据/输出一致性：页面可把 `language` 写成选项外的值，并被 RSS 消费成 `<language>fr</language>`；CLI 通道仍 fail-closed，恢复成本低。**PM/Lead 若认为「记录 options 契约对页面同样有约束力」，可升级为 P1**） |
| 发现轮次 | **round-11（QA 独立验证，浏览器真实写入 + AFS/RSS 复核）** |
| 关联 REQ | spec §15.9 通用 General（「开关变更即时生效且影响范围在界面上写清楚」）；对照 `scripts/lib/general-settings.mjs` 的 `validateGeneralValue`（CLI 侧校验） |
| 状态 | 待裁决（建议 **本轮修**：`language`/`timezone` 改为受控控件，或在写入侧加一次 `options` 守卫） |

## 复现命令与最小步骤

1. 前置：admin 会话（CDP 9333）；六条记录存在（`general install`）。
2. 打开 `?page=settings-general`，在 `Language` 行的文本框里输入 `fr`（选项只有 `en`/`zh`），点 Save。
3. `arc afs exec … read` 读 `config/general/language.json`；再跑 RSS。

```bash
node scripts/arcblog-settings.mjs general set --language fr   # ① CLI：fail-closed 拒绝
# ② 页面（等价最小操作）：?page=settings-general → Language 输入框填 fr → Save
arc afs exec /blocklets/arcblog/.actions/read --json \
  --args '{"path":"/instance/app/arcblog/config/general/language.json"}'
node scripts/arcblog-rss.mjs --feed-link https://example.com | grep "<language>"
```

## 期望

`language` / `timezone` 记录的 `options` 是**该字段自己的允许值**（CLI `general set` 按它 fail-closed）。页面对同一记录写入时应给出同样的约束（受控控件）或至少不把选项外的值落库；若落库，消费方（RSS）不应输出与站点实际语言不符的值。

## 实际

页面把 `type=select` 的记录一律渲染成 `input type=text`（`settings-general.aup:152`），写入走 `exec "/.actions/write"` + `tree-merge`（`:153`），**没有任何 options 校验**：

```text
$ node scripts/arcblog-settings.mjs general set --language fr        # CLI
{"ok": false, "code": "VALIDATION", "error": "language must be one of: en, zh (got \"fr\")"}   [exit=1]

$ # 页面：Language 输入框 = fr → Save（出现 "Setting saved." toast）
$ arc afs exec … read /instance/app/arcblog/config/general/language.json
{"label":"Language","description":"Value of the RSS <language> element of the generated feed.",
 "scope":"instance","type":"select","value":"fr","options":["en","zh"]}     ← 选项外的值已落库

$ node scripts/arcblog-rss.mjs --feed-link https://example.com
    <title>QA11 Probe Site</title>
    <language>fr</language>                                                   ← 公开订阅输出该值
    <lastBuildDate>Mon, 28 Sep 2026 01:20:35 +0000</lastBuildDate>
    item count: 0
```

（QA 已把 `language` 页面写回 `en` 并复核，见 round-11.md §8。）

## 证据输出

```text
--- ① CLI fail-closed（正确）---
{"ok": false,"code": "VALIDATION","error": "language must be one of: en, zh (got \"fr\")"}

--- ② 页面写入（无校验）---
$ arc afs exec /blocklets/arcblog/.actions/read --json --args '{"path":"/instance/app/arcblog/config/general/language.json"}'
"content": "{\"label\":\"Language\",\"description\":\"Value of the RSS <language> element of the generated feed.\",\"scope\":\"instance\",\"type\":\"select\",\"value\":\"fr\",\"options\":[\"en\",\"zh\"]}"

--- ③ 消费方即时生效（把错误值带进公开订阅）---
<language>fr</language>

--- ④ 同一记录的合法值写回（页面）---
general/language value='en' type=str fields=['description','label','options','scope','type','value']
```

## 影响范围

- 受影响角色：运营者（自由文本框不提示合法取值；合法取值只在「允许值」行里以 JSON 数组展示）
- 受影响链路：设置页「基础信息」卡 → `config/general/{language,timezone}.json` → `scripts/arcblog-rss.mjs` 的 `<language>`（timezone 同理会落入 IANA 偏移计算；`rfc822()` 对未知 zone 回落 UTC，不会抛错）
- 数据后果：低（值可改回；无级联删除），但错误值会进入公开产物直到人工修正

## 疑似文件（线索，未改）

- `.aup/pages/admin/settings-general.aup:152`（`input type=text name=eValue`）、`:153`（`exec "/.actions/write"` + `tree-merge`，无 options 守卫）
- `scripts/lib/general-settings.mjs:146-163`（`validateGeneralValue`，目前只有 CLI 调用）
- `scripts/arcblog-rss.mjs:187-190`（`<language>` 直出，未做白名单）

---

## 复验结论（round-11-reverify，2026-09-28，QA 独立验证）——**P1 闭环**

**状态：已修复（双侧验证）。** D20 把本条升为 **P1**；页面侧改为受控控件，读取/渲染侧新增 fail-closed 回退并留痕。

### 页面侧：选项外值**无法提交**，且不误覆盖

```text
# 全新标签页（propBind 未解析，arc-contracts §21.11）：Language 已是受控 SELECT
{ctl:"SELECT:select-one", value:"", required:true, options:["","en","zh"], prevH3:"Language"}
injectFr: {before:"", after:"", checkValidity:false}        ← s.value='fr' 被浏览器拒绝，回弹 ""

# 真实鼠标点击 Save（Input.dispatchMouseEvent @1726.4,575.0）
BEFORE {"selVal":"","selValid":false,"btnText":"Save"}
AFTER  {"toasts":[],
        "invalid":["INPUT:eValue|请填写此字段。","SELECT:eValue|请在列表中选择一项。","SELECT:eValue|请在列表中选择一项。"]}
$ arc afs exec … read …/config/general/language.json
BEFORE {"value":"en","updatedAt":"2026-09-28T02:01:40.780Z"}
AFTER  {"value":"en","updatedAt":"2026-09-28T02:01:40.780Z"}   ← AFS 未被改写
```

被拒的「界面提示」= 控件级 `:invalid` + UA 原生校验消息（非自定义 toast）；`onErrorToast`（`general.basics-error`）只在平台拒绝时触发，本轮未无损诱发（受限项）。

### 合法值：可写 + 即时生效

```text
页内 reload → selects [{value:"en",valid:true},{value:"UTC",valid:true}]；设 zh + Save
$ arc afs exec … read …/general/language.json → {"value":"zh","updatedAt":"2026-09-28T02:01:02.839Z"}
$ node scripts/arcblog-rss.mjs --feed-link https://example.com | grep "<language>"
    <language>zh</language>                                   ← 即时进入公开产物
```

### 读取侧 fail-closed（带外/旧 build 写入的兜底）

```text
# 用 /.actions/write tree-merge 带外写入 fr（模拟绕过页面的写入方）
stored = fr
$ node scripts/arcblog-rss.mjs --feed-link https://example.com
    <title>ArcBlog</title>
    <language>en</language>                                   ← 不回显选项外值；stdout 仍是纯 XML
stderr: arcblog-rss: WARN …/general/language.json: stored value is outside the record's options
        (en, zh) — using "en" instead of "fr" (see: node scripts/arcblog-settings.mjs general show)
$ node scripts/arcblog-settings.mjs general show
{"ok":true,"issues":[{"key":"language","stored":"fr","effective":"en",
  "reason":"stored value is outside the record's options (en, zh)"}]}
other fields effective: {site-name:ArcBlog, timezone:UTC, comments:false, rss:true, agent-access:true}
# 复位 en 后：issues=[]，RSS <language>en</language>
```

**残余观察（P3，非阻断）**：选项列表在 `scripts/lib/general-settings.mjs` 与页面固定控件之间**重复**（site-name 的 120 字上限同理），本轮按「禁止新增测试」未加守卫；建议 R12 用测试或生成器消除漂移（读取侧 options 回退是当前安全网）。平台契约线索（`pattern=` 放 `afs-list` 行模板 → 服务端按未替换字面量复核 → `validationFailed` 假成功）**未由 QA 复现**，转交 Lead/PM 收录 `docs/arc-contracts.md`。

证据全文：`docs/team/test-reports/round-11-reverify.md` §2①。
