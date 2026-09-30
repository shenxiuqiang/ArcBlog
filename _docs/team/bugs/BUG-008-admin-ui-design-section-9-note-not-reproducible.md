# BUG-008: `admin-ui-design.md` §9 的补充实测事实不可复现（`?page=compose` 无过滤时实测 2，文档写 1）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-008 |
| 严重级 | P3 |
| 发现轮次 | round-7 |
| 关联 REQ | REQ-003-admin-ui-design-alignment（§2.1/§2.6/§9 事实对齐；本条的断言本身可用，附注的实测数字错了） |
| 状态 | 待裁决 |

## 复现命令与最小步骤

1. 前置：dev 实例 `default`；admin 会话（CDP 9333，视口 1803×908）；页面已构建到本轮工作区。
2. 打开 `?page=compose`，分别用"带 `.aup-app-header` 过滤"和"不带过滤"两种写法跑 §9 的断言，并列出命中的 `<a>`。

```bash
node /tmp/qa-cdp.mjs nav 'http://arcblog.localhost:4939/?page=compose' 2500
node /tmp/qa-cdp.mjs eval /tmp/qa-a9-req003.js    # 两种写法对比
node /tmp/qa-cdp.mjs eval /tmp/qa-a9-extra.js     # 列出无过滤时命中的 <a>
```

## 期望

REQ-003 A6/A9 要求写进文档的每条事实都能在仓库/运行期复现（§2.2 第 6 条「不新增未实测断言」）。
文档 §9 附注写：「实测（2026-09-27，admin 会话，视口 1803×908）：… 其中 `?page=compose` 的页面级滚动容器里另有 wrapper 的 `app-header` 品牌链接（`href="/"`，框架 chrome，不算内容区）」——即无过滤时应恰好命中 1 条。

## 实际

无过滤时 `?page=compose` 实测命中 **2** 条 `a:not([target])`：

1. `a.aup-app-header-brand-link` → `href="/"`（文档提到的那条）
2. `a.aup-action` → `href="/?page=about"`，文本 `About` —— 这是**本轮 REQ-002 F9 新加的侧栏页脚「关于」行**（在侧栏里，属框架 chrome，不是右侧内容区）

即：断言结论（带过滤 = `0`，通过）不受影响，但文档对"为什么需要这个过滤"的实测描述不完整/不准确，
且该附注的准确性依赖 REQ-002 F9 是否落地（同一轮两个 REQ 的交付互相影响）。

## 证据输出

```text
$ node /tmp/qa-cdp.mjs eval /tmp/qa-a9-req003.js     # ?page=compose
{"url":"http://arcblog.localhost:4939/?page=compose","withHeaderExclusion":0,"withoutHeaderExclusion":2,"scrollRootCount":1}

$ node /tmp/qa-cdp.mjs eval /tmp/qa-a9-extra.js      # ?page=compose，无过滤时命中的 <a>
{"rootCls":"aup-view","count":2,"anchors":[
  {"cls":"aup-app-header-brand-link","href":"/","t":"ArcBlog"},
  {"cls":"aup-action","href":"/?page=about","t":"About"}]}

# 对照：?page=posts / ?page=tags 两种写法都是 0
{"url":"…/?page=posts","withHeaderExclusion":0,"withoutHeaderExclusion":0,"scrollRootCount":1}
{"url":"…/?page=tags","withHeaderExclusion":0,"withoutHeaderExclusion":0,"scrollRootCount":1}
```

退出码：0

## 影响范围

- 受影响角色：QA / UI（按文档附注复现时会看到 2 而不是 1，被误判为回归）
- 受影响链路：文档（§9 验收依据的可复现性）
- 数据后果：无
- 可绕过：是（断言本身返回值不受影响）

## 疑似文件

- `docs/ArcBlog-admin-ui-design.md:459`（§9 附注"另有 wrapper 的 app-header 品牌链接"）
- `docs/ArcBlog-admin-ui-design.md:199`（§2.6 同一段的重复表述）
- 关联实现（不改）：`.aup/pages/**` 的侧栏页脚（REQ-002 F9，由 `scripts/console-nav.mjs` 生成）
