# BUG-011: `admin-ui-design.md` §2.6 / §9 末条断言对视口敏感，且在 1803×908 下对 `?page=compose` 是**空洞通过**

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-011 |
| 严重级 | **P3**（文档验收断言的可复现性；非实现缺陷） |
| 发现轮次 | round-8（**范围外 · pre-existing**：该断言块自 V1.2 起未改，REQ-005 §2.2 第 1 条明确"§9 的断言表达式与期望值 0 不得改"） |
| 关联 REQ | REQ-005 A4 的复跑对象；与 [BUG-010](BUG-010-compose-appearance-missing-content-scroll-container.md) 同源 |
| 状态 | 待裁决 |

## 复现命令与最小步骤

```bash
D=docs/ArcBlog-admin-ui-design.md
awk '/^## 9\. /,/^## 10\. /' $D | sed -n '1,40p'          # 取 §9 末条断言表达式
# 运行期（admin 会话，脚本 /tmp/qa-a4-links.js，未入库）：
QA_VW=1803 QA_VH=908 node /tmp/qa-cdp2.mjs 'http://arcblog.localhost:4939/?page=compose&locale=en' /tmp/qa-a4-links.js
QA_VW=1512 QA_VH=765 node /tmp/qa-cdp2.mjs 'http://arcblog.localhost:4939/?page=compose&locale=en' /tmp/qa-a4-links.js
QA_VW=1803 QA_VH=908 node /tmp/qa-cdp2.mjs 'http://arcblog.localhost:4939/?page=compose&locale=en' /tmp/qa-a4-detail.js
QA_VW=1512 QA_VH=765 node /tmp/qa-cdp2.mjs 'http://arcblog.localhost:4939/?page=compose&locale=en' /tmp/qa-a4-detail.js
```

## 期望

文档写「在**任一**控制台页面执行」该断言、期望 `0`；REQ-005 A4 也要求"`withHeaderExclusion = 0`"。

## 实际

同一条断言、同一个页面、只改视口 → 两个不同结果；且在文档记录的视口下，compose 的 `0` 来自**候选容器集合为空**（`.pop()?.… ?? 0` 兜底），并未真的检查过内容列：

```text
### ?page=compose @1803x908 ###
{ "containers": 1, "withExclusion": 0, "withoutExclusion": 2,
  "chromeLinks": [ {"cls":"aup-app-header-brand-link","href":"/","text":"ArcBlog"},
                   {"cls":"aup-action","href":"/?page=about","text":"About"} ] }
# containers=1 就是那个包含 .aup-app-header 的整壳容器 → filtered=[] → count([])=0（空洞）

### ?page=compose @1512x765 ###
{ "containers": 2, "withExclusion": 1, "withoutExclusion": 1, "chromeLinks": [] }

### detail @1512x765 ###
{ "containers": [ { "i":0, "sh":1686,"ch":765, "hasHeader":true,  "links":[brand, About] },
                  { "i":1, "sh":847, "ch":717, "hasHeader":false, "links":[{"t":"About","href":"/?page=about","cls":"aup-action"}] } ] }
# .pop() 取到 i=1（侧栏页脚「关于」链接所在容器），过滤条件只排除"含 .aup-app-header 的容器"，
# 于是同一个页面在 1512×765 下断言给 1，而不是文档期望的 0
```

对照页两视口均为 `withExclusion = 0`（1803：1 个容器不含 header/nav；1512：选到的容器不同）：

```text
### ?page=posts @1803x908 ###  { "containers":1, "withExclusion":0, "withoutExclusion":0 }
### ?page=tags  @1803x908 ###  { "containers":1, "withExclusion":0, "withoutExclusion":0 }
```

## 证据输出

见上（`qa-cdp2.mjs` / `qa-a4-links.js` / `qa-a4-detail.js` 原始 JSON 逐字拷贝）。退出码 0。

## 影响范围

- 受影响角色：UI / Dev / QA（文档是 §9 页面验收的共同依据）
- 受影响链路：文档（下一轮实现者按此断言复跑会得到与文档不一致的数字；compose 的 `0` 证明力为零）
- 数据后果：无
- 可绕过：是（把"筛选后必须为 0"的判定限制在内容列容器上，或写明必须 1803×908 且 compose 无候选容器）

## 疑似文件

- `docs/ArcBlog-admin-ui-design.md` §2.6 末（现第 207 行附近）与 §9 末（现第 466 行附近）的断言代码块
- 同源：`.aup/pages/admin/compose.aup` 缺内容列滚动容器（见 BUG-010）——若 BUG-010 修掉，本条的 1512 复现路径也会随之改变
- 注意：REQ-005 **未授权**改这两个断言块（§2.2 第 1 条），故本轮 QA 只报不改
