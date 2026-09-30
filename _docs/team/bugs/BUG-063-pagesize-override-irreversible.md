# BUG-063: `afs-list` 每页条数选大后平台移除整个分页器，用户无法在页面内改回（页面被拉长且无入口）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-063 |
| 严重级 | P2 |
| 发现轮次 | round-23 |
| 关联 REQ | [REQ-030-list-pagination](../requirements/REQ-030-list-pagination.md)（L-R23-1 采用平台原生配方 / L-R23-2 假分页红线）；缓解轮次 REQ-032 §6（Lead L-R25-3） |
| 状态 | **QA 独立复验（round-25，`task-108`）**：页级常驻说明（C1/C2）与恢复路径（C3）**通过**；平台边界（`arc-contracts §38`）属 Lead 写范围。**注意**：本条的平台限制**未消除**（选择器仍随分页器消失），只是**诚实缓解 + 边界登记** → 关闭与否请 PM 按「缓解是否足够」裁决 |

## 复现命令与最小步骤

1. 前置：`arc` 实例 default 已挂载 `arcblog`（本机 `http://arcblog.localhost:4939/`，daemon v2.0.0-beta.50 / bundle `aup.bc92de568433b0dc.js`），admin 身份，`economy/ledger` 有 84 条记录。
2. 打开 `?page=ledger&locale=en`，`ledger-list` 声明 `pagination=manual pageSize=20` ⇒ `Page 1 of 5`、20 行。
3. 把该列表**平台自渲染**的每页条数选择器 `.aup-list-pager-size` 设为 `100`（选项来自 `pageSizeOptions` 默认 `[10,25,50,100]` + 节点 pageSize）。
4. 列表渲染 84 行；`total(84) ≤ 100` ⇒ **整个 `.aup-list-pager`（含选择器本身）被移除**，页面内再无任何控件可以改回小页大小。
5. 重新加载页面：`localStorage['aup-list-pagesize:ledger-list'] = "100"` 覆盖节点 `pageSize=20`，页面仍是 84 行、仍无分页器。

```bash
# 运行期取证（QA 探针；admin 用 login_token cookie 注入到新建 browser context）
node docs/team/test-reports/raw/round-23/qa-r23-pagination.mjs paging \
  docs/team/test-reports/raw/round-23/qa-r23-paging.json
node -e 'const a=require("./docs/team/test-reports/raw/round-23/qa-r23-paging.json");
console.log(JSON.stringify(a.steps.paging.pageSizeContrast,null,1))'
```

## 期望

「所有列表都要有翻页，避免页面被拉太长」（Round 23 用户指令）。用户把每页条数改大是正常操作，但**平台自带的这项设置在切换后应当仍然可逆**——至少保留一个能改回小页大小的入口，或明确告知该选择被记住以及如何重置。REQ-030 §2.1 要求列表「高度受控」。

## 实际

- `pageSize=20`：`pager=true`、`Page 1 of 5`、rows=20、内容列 `scrollHeight=26734`。
- 选择器设为 `100` 后：`rendered=84`、`pager=false`、`pageSize=null`、`listScrollH=56092`、`ancScrollH=69404`、`localStorage['aup-list-pagesize:ledger-list']="100"`；**选择器本身随分页器一起消失**，我尝试用同一脚本把它切回 `20` 时返回 `{"error":"no size select"}`。
- 公共页 `?page=store` 同理：`12` 行 → 选择 `100` → `54` 行、`info=null`、`pager=false`（`qa-r23-regress.json` 的 `storeHeightContrast`）。
- 静态根因（线上 bundle，QA 独立取样）：分页块只在 `Ze>0 && _r>0 && _r>Ze && wt==="manual"` 时构造（`Ze=pageSize`、`_r=total`、`wt=pagination||"auto"`）；`ir = e && e.id ? "aup-list-pagesize:"+e.id : null`，若 `localStorage` 有值则覆盖 `Ze`；因此一旦覆盖值 ≥ `total`，控件必然不再渲染。

## 证据输出

```text
$ node … qa-r23-pagination.mjs paging   （摘录 qa-r23-paging.json → steps.paging.pageSizeContrast）
paged20: { rendered: 20, pageSize: 20, pageSizeKey: null, pager: true,  info: "Page 1 of 5",
           pagerTotal: "Total: 84 records", prevDisabled: true, listScrollH: 13422, ancScrollH: 26734 }
at100  : { rendered: 84, pageSize: null, pageSizeKey: "100", pager: false, info: null,
           listScrollH: 56092, ancScrollH: 69404 }
back20 : { rendered: 84, pageSize: null, pageSizeKey: "100", pager: false, info: null,
           listScrollH: 56092, ancScrollH: 69404 }        # 回切失败：选择器已不存在

$ node -e '…steps.paging.localStorageAfter'
["aup-list-pagesize:ledger-list=100"]

# 线上 bundle（独立下载 802492 B，sha256 前缀 bc92de568433b0dc79aa）
… Ze=typeof r.pageSize=="number"&&r.pageSize>0?r.pageSize:0, wt=r.pagination||"auto" …
… ir=e&&e.id?"aup-list-pagesize:"+e.id:null; if(ir) try { var mt=window.localStorage.getItem(ir); … } …
… if(Ze>0&&_r>0&&_r>Ze&&wt==="manual"&&!Nt){ … className="aup-list-pager" … } …
```

退出码：0

## 影响范围

- 受影响角色：admin（控制台 8 个 `total>pageSize` 的列表）、guest/已登录用户（公共页 `store` 54 个商品）
- 受影响链路：界面（`afs-list` 运行期分页器 + localStorage 覆盖），不涉及权限/数据写入
- 数据后果：无数据写入；只影响该浏览器 profile 的 `localStorage['aup-list-pagesize:<id>']`（用户可清除站点数据恢复）
- 可绕过：是——清除站点数据 / 删除该 localStorage 键；但**页面内无入口**，普通用户不知道这条路径
- 触发前提：用户主动把每页条数选成 ≥ `total` 的值（默认 pageSize 下不发生；因此**不影响本轮默认呈现**，不作为阻断项）

## 疑似文件

> 线索不是结论；这些文件 QA 未修改。

- `.aup/pages/**`（37 处 `afs-list` 的 `pageSize` / `id` 声明；本轮新增的显式 id 同时是 localStorage 键名）
- 运行期 bundle（`aup.bc92de568433b0dc.js` 内 `afs-list` 渲染器：分页块构造条件 + `aup-list-pagesize:` 覆盖）
- 建议登记位置：`docs/arc-contracts.md` 新增 §38（Dev 报告 D5①/D5③ 已提出）+ `?page=ledger` 的 `paging-desc` 文案可补一句「每页条数选择会被本浏览器记住」

## 备注（与 Dev 自述的差异，已在 round-23 报告 §7-4 记录）

Dev 报告 A1 的方法写的是「把 `.aup-list-pager-size` 设成 100 ≈ 不分页，**再切回**；切回后数值/高度复原」。按上述实测，**设成 100 之后选择器已随分页器移除，无法「再切回」**；Dev 报告中的数值（`26734` / `69404`）与 QA 实测逐值相同，其复原应是通过直接写 `localStorage` 完成的（这也解释了共享 profile 里残留的 7 个 `aup-list-pagesize:<id>=20` 键，见 BUG-064）。建议 Dev 后续在报告里改用可复现的写法。

---

## QA 复验记录（round-25，`task-108`，2026-09-29）——独立取证，不采信 Dev 自述

**方法与口径**：REQ-032 §6 的修法是「(a) 页级常驻说明 + (b) 平台边界登记（Lead）」。QA 只验 (a) 与判据 C1–C4；原始产物 `docs/team/test-reports/raw/round-25/qa-r25-all.json`（`steps.pagesize` / `steps.pagesizeRecovery`）+ `qa-r25-queue.mjs`。

**C1 受影响列表页的常驻说明（en/zh 各 1 次真实渲染；`innerText` 命中即"真的渲染"，不是隐藏节点）**

```text
$ node docs/team/test-reports/raw/round-25/qa-r25-queue.mjs pagesize
PAGESIZE {"enNote":{"ledger":true,"orders":true,"policy":true,"access":true,"dashboard":true,"posts":true,"tags":true,"store":true},
          "zhNote":{"ledger":true,"orders":true,"policy":true,"access":true,"dashboard":true,"posts":true,"tags":true,"store":true}, …}
# 8 页 × 2 语言全部 true；每页均为新 context（每语言一个），单 tab 导航
```

说明文案（en 渲染原文，zh 为同一 key 的对照译文）：

```text
Pagination note (BUG-063): the per-page selector (“Show”) is stored by THIS browser as
localStorage['aup-list-pagesize:<list id>'] and overrides the page default. Choosing a value ≥ the
total makes the platform drop the whole paginator — including the selector itself — so no in-page
control can bring it back. Recovery: clear this site's data, or delete that localStorage key, then reload.
```

**C2 零假条件 / 零写死条数**

```text
$ git diff -U0 -- .aup/pages | grep -E "^\+" | grep -o "visible=[^ )]*" | sort | uniq -c
   1 visible=$state.open          # policy.aup 高级折叠（A 组，由 set 驱动）
   1 visible=$state.open`;        # 同一行的注释文本（非可执行 DSL）
$ git diff --stat -- .aup/pages
 .aup/pages/economy/policy.aup | 128 ++++++++++---   （其中队列卡/高级区/A 组）
 dashboard/posts/access/ledger/orders/tags/store 各 +2 行 = i18n key + 无条件 p :pagesize-note
# 受影响 8 页里 7 页只新增「key + 无条件 p」；policy.aup 的 pagesize-note 同样无条件
```

**C3 复现 BUG-063 场景：选择器消失后说明仍在，删键后分页器恢复**

```text
$ 实测（?page=policy，列表 id policy-products-list，localStorage 键 aup-list-pagesize:policy-products-list）
before      : keyValue=null, pagerButtons=2, note=true,  rows=27
set  key=100: keyValue="100", pagerButtons=0, note=true,  rows=61     # 分页器（含选择器）消失，说明仍在
remove key  : keyValue=null, pagerButtons=2, note=true,  rows=27      # 删除 localStorage 键 → 分页器恢复
# 复现方式与 BUG-063 原文一致：直接写 localStorage 键（因为选择器本身已消失，页面内无法回退）
```

**C4 不回归 R23（真入口仍在）**

```text
$ 实测（?page=ledger）
默认            : Pager 存在；URL 不变
点击 Next       : URL → /?page=ledger&ledger-list.page=2     # 真的翻页，不是假分页
深链 page=2     : URL → /?page=ledger&ledger-list.page=2     # ?<id>.page= 生效
```

**平台边界（不是 QA 写范围，仅核对存在）**：`docs/arc-contracts.md §38` 已登记「`aup-list-pagesize` 覆盖 + 分页器移除条件」（Lead 落笔）。本条的限制**没有被消除**——选择器仍然随分页器一起消失；本轮交付的是**诚实缓解 + 恢复路径 + 边界登记**。若 PM 认为「用户仍须手动清 localStorage」不可接受，则本条应保持开放并升级为需要平台能力的需求，而不是当作已修复。
