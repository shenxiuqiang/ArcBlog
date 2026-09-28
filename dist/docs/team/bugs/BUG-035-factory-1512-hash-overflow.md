# BUG-035: `?page=factory` @1512 哈希溢出残留（kv-mono over 133 ×4）+ tags@1512 滚动列 428 < 500

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-035 |
| 严重级 | **P2** |
| 发现轮次 | round-14F（QA 独立复验） |
| 关联 | UI-012-07（`#factory-node-tx` 4 个 64 位哈希 / intents 行，清单定为 P2）、UI-012-11（tags 滚动列 1512 `clientHeight ≥ 500`）、L-R14F-5 |
| 状态 | 待裁决（需 PM/Lead 在「页内改结构 / 放弃 copyable 按钮 / allowlist」中选一） |

## 复现命令与最小步骤

```bash
node /tmp/qa-r14f-sweep.mjs --target <pageTargetId> --kind console --locale en --viewport 1512x765 \
  --out /tmp/qa-r14f-console-en-1512x765.json
python3 - <<'PY'   # 或直接读 JSON
import json;d=json.load(open('/tmp/qa-r14f-console-en-1512x765.json'))
print([ (p['path'], p['textOverflow'][:6]) for p in d['pages'] if p['path'] in ('/?page=factory','/?page=tags')])
PY
# tags 滚动列高度（1512）
node /tmp/qa-r14f-targeted.mjs --target <pageTargetId> --viewport 1512x765 \
  --steps <(echo '[{"url":"http://arcblog.localhost:4939/?page=tags&locale=en","clear":true,"expr":"FILE:/tmp/r14f/e_tags.js"}]')
```

## 期望

UI-012-07：factory 的哈希/意图行不产生文本溢出；UI-012-11 字面验收：**1512×765 下 tags 滚动列 `clientHeight ≥ 500`**。

## 实际

### (a) factory @1512（en 与 zh 同值）

```text
#factory-node-tx 的 .aup-kv-row.aup-kv-mono ×4：cw=572 / sw=705,693,692,684 → over 133 / 121 / 120 / 112
1803 对照：cw=695 / sw=705 → over 10（UI-012-07 实测 10，一致）
factory intents 行：.aup-view cw=479 over 62、.aup-text（result.hash）over 62（zh 52）
NFT 卡：.aup-view cw=600 sw=719 → over 119（zh cw=489 over 52）
docOver=0、hScrollers=[]（无页面级横向滚动条）
```

### (b) tags @1512

```text
$ … e_tags.js  (1512×765 / en)
cols: [ {ch:765,…}, {ch:717, sh:1021, st:0}, {ch:428, sh:1101, st:0, queue:true} ]
→ 承载 Intent queue + Tag usage 的滚动列 clientHeight = 428  （1803 实测 593 ≥ 500 ✓）
   Dev 自报 450，QA 实测 428（均未达 500）
```

### (c) 平台侧证据（QA 本轮自取，用于判断「能否页内修」）

```text
$ curl -s http://arcblog.localhost:4939/aup.bc92de568433b0dc.js -o /tmp/r14f/aup.js
# 解析出 style 转发白名单对象（bundle 内出现 3 次），键数恰 67：
padding paddingTop paddingBottom paddingLeft paddingRight margin marginTop marginBottom
marginLeft marginRight overflow overflowX overflowY gap rowGap columnGap borderRadius
border borderTop borderRight borderBottom borderLeft opacity maxHeight minHeight maxWidth
minWidth background textAlign fontStyle letterSpacing textTransform width height boxSizing
display flexDirection flexWrap alignItems alignContent alignSelf justifyContent justifyItems
justifySelf color gridTemplateColumns gridTemplateRows gridAutoFlow gridAutoColumns
gridAutoRows gridColumn gridRow flex flexBasis flexGrow flexShrink fontSize fontFamily
fontWeight lineHeight boxShadow filter userSelect pointerEvents aspectRatio cursor textDecoration

wordBreak ABSENT | overflowWrap ABSENT | whiteSpace ABSENT | textOverflow ABSENT
alignSelf IN | flexBasis IN | flexGrow IN | minWidth IN | minHeight IN
```

⇒ 页内无法用内联 style 给哈希强制 `break-all`/`nowrap`（Dev 自述成立）。但 `.aup-kv-row` grid 的**容器宽度**由页内卡片布局决定，因此「页内结构改法」仍存在（如 factory 改单列以加宽卡片、或放弃 4 个 copyable 按钮），**平台固有性只对「强制断行」成立，对「加宽」不成立**。

## 影响范围

- 角色：admin / operator（Factory 页与 Tags 页，1512 宽度视口）
- 链路：运营 → Factory（节点 NFT tx 哈希可读性）/ 站点 → Tags（1512 下列表窗口过矮）
- 数据后果：无（只读展示；哈希本身仍可从 `node/factories.json` 与 CLI 取得）
- 与 UI-012 一致：UI-012 记为 P2，Dev 已披露 factory 后半未修；tags 的 ≥500 未达成由 Dev 自报 450

## 疑似文件

- `.aup/pages/ops/factory.aup:180`（`key-value-list factory-node-tx`，4 个 64 位哈希）、`:207-222`（intents 行）
- `.aup/pages/site/tags.aup:168-191`（Intent queue 卡移入滚动列后仍 428px）
- 平台侧：`.aup-kv-row` grid；67 键 style 白名单不含 `wordBreak/overflowWrap/whiteSpace/textOverflow`

## 建议修法（由 Dev/PM 裁定，QA 不改源码）

① factory：把承载 `#factory-node-tx` 的卡片所在网格改为单列（卡片加宽后 64 位哈希可容纳），或取消 4 个 `copyable` 按钮；② tags：把上方 snapshot 卡也移入滚动列 / 压缩其高度，使 1512 列高 ≥500；③ 若选择 allowlist，须在 UI-012 中记录「平台白名单无断行键 + 卡片宽度受网格约束」两条平台事实（QA 已提供原文）。
