# BUG-060: 4 个 CLI 的 `--help` 面未随 D32 统一（`chain-worker --help` 抛裸栈 exit 1；rss / query-posts / daily-report 忽略 `--help` 直接跑业务）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-060 |
| 严重级 | **P3**（help 表面；解析层已统一，不影响业务数据与退出码语义） |
| 发现轮次 | round-22（QA `task-93` 独立复验 BUG-032 / D32 时发现） |
| 关联 | [BUG-032](BUG-032-ledger-type-equals-form-silently-ignored.md) B32-7「`--help` 同步」；REQ-029 §3.1 B32-4 边界「`node <cli> --help` 仍 exit 0」 |
| 状态 | 待裁决 |

## 复现命令与最小步骤

```bash
cd /Users/shenxiuqiang/workspace/ArcBlog
for f in scripts/arcblog-*.mjs; do case "$f" in *.test.mjs) continue;; esac; \
  out=$(node "$f" --help 2>&1); rc=$?; \
  printf '%-40s exit=%s note=%s first=%s\n' "$(basename $f)" "$rc" \
    "$(printf '%s' "$out" | grep -c 'unknown flag fails closed')" \
    "$(printf '%s' "$out" | head -1 | cut -c1-70)"; done
```

## 期望

REQ-029 §3.1 B32-4 边界：`node <cli> --help` 仍 **exit 0**；B32-7：受本轮影响的每个 CLI 的 `--help` 同步（至少在共享 helper 的统一位置说明语法契约）。

## 实际（QA 原始输出）

```text
arcblog-chain-worker.mjs       exit=1  note=0  first=file:///…/scripts/lib/arc.mjs:103
arcblog-daily-report.mjs       exit=0  note=0  first={
arcblog-query-posts.mjs        exit=0  note=0  first={
arcblog-rss.mjs                exit=0  note=0  first=<?xml version="1.0" encoding="UTF-8"?>
（另有 console-nav / hero-carousel / ui-budget 三个无 help 面的内部工具脚本，同 note=0）
其余 19 个 CLI：exit=0 且首行 = "Flags: --k v and --k=v are equivalent; an unknown flag fails closed (VALIDATION, exit 1)."

$ node scripts/arcblog-chain-worker.mjs --help
file:///…/scripts/lib/arc.mjs:103
  const err = new Error(message);
Error: Error: unknown command: --help (run|watch|enqueue|queue|refresh)
    at fail (…/scripts/lib/arc.mjs:103:15)
    at main (…/scripts/arcblog-chain-worker.mjs:397:3)
exit=1                                   ← 裸栈、无 JSON、无 help

$ git show HEAD:scripts/arcblog-chain-worker.mjs | grep -n "help\|unknown command"
396:  fail('VALIDATION', `unknown command: ${command} (run|watch|enqueue|queue|refresh)`);
```

## 影响范围

- `chain-worker --help`：违反 B32-4 的 `--help` 边界（exit 1 且输出未捕获的异常栈），既有行为（HEAD 同），**非本轮回归**。
- `rss` / `query-posts` / `daily-report`：`--help` 被解析层接受（因 `help` 是 BASE_FLAG）但业务层忽略 → 分别打印 RSS XML / 查询结果 / 日报，读者拿不到用法。
- 数据后果：无（都不写数据）；`chain-worker --help` 不进任何队列动作。

## 疑似文件

- `scripts/arcblog-chain-worker.mjs:396-402`（无 help 分支，`main` 的 unknown command 直接 `fail`）
- `scripts/arcblog-rss.mjs` / `scripts/arcblog-query-posts.mjs` / `scripts/arcblog-daily-report.mjs`（不读 `opts.help`）
- 参照：`scripts/lib/cli-flags.mjs` 的 `FLAG_SYNTAX_NOTE` + 19 个已同步 CLI 的 `help()` 首行
