# BUG-063: `afs-list` 每页条数选大后平台移除整个分页器，用户无法在页面内改回（页面被拉长且无入口）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-063 |
| 严重级 | P2 |
| 发现轮次 | round-23 |
| 关联 REQ | [REQ-030-list-pagination](../requirements/REQ-030-list-pagination.md)（L-R23-1 采用平台原生配方 / L-R23-2 假分页红线） |
| 状态 | 待裁决 |

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
