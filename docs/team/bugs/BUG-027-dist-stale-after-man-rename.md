# BUG-027: `.aup/man/settings.yaml → general.yaml` 改名后未重跑 `arc blocklet build`，`dist/.aup/man/` 与源码漂移（**本轮唯一阻断项**）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-027 |
| 严重级 | **P1**（构建一致性 / 门禁未满足：任务书门禁「改了 `.aup` 的 `arc blocklet build`」当前不成立。非主链路故障，一条命令可修；若按角色卡「门禁红」从严可视为 P0） |
| 发现轮次 | **round-11F（QA 独立复验收尾时执行 `diff -r .aup dist/.aup` 发现；改名落盘于 09:59:41，晚于最后一次 build 09:57:48）** |
| 关联 REQ | 团队铁律 2「改了 `.aup` 还要 `arc blocklet build`」；QA round-11 的 dist 一致性口径（`diff -r .aup dist/.aup` SAME） |
| 状态 | **待修（阻断：Dev/Lead 跑一次 `arc blocklet build` 后即可复验关闭）** |

## 复现命令与最小步骤

```bash
$ diff -r .aup dist/.aup
Only in .aup/man: general.yaml
Only in dist/.aup/man: settings.yaml
$ echo $?
1
$ diff -rq scripts dist/scripts        # 其余模块仍 SAME（无输出）
$ git status --porcelain .aup/man dist/.aup/man
 D .aup/man/settings.yaml
?? .aup/man/general.yaml
```

## 期望

`diff -r .aup dist/.aup` 无输出（`dist` 是源码当前产物）。round-11 的 QA 报告（`docs/team/test-reports/round-11.md` §1.2）与本轮 Dev 自报都以该等式作为构建一致性证据。

## 实际

`dist/.aup/man/settings.yaml`（mtime **09:57:48**，过期的 `page: settings` 存根）仍在；`dist/.aup/man/general.yaml` 不存在。`.aup/man/general.yaml` 的 birth/mtime = **09:59:41**，`.aup/man/` 目录 mtime 同为 09:59:41 —— **晚于最后一次 `arc blocklet build`（`dist/.aup/man/*` 全部 mtime 09:57:48；同刻 `dist/.aup/pages/admin/general.aup` 已生成，说明页面改名早于该次 build，man 改名晚于它）**。

```text
$ stat -f "%N mtime=%Sm" -t "%Y-%m-%d %H:%M:%S" .aup/man/general.yaml dist/.aup/man/settings.yaml dist/.aup/man/console.yaml
.aup/man/general.yaml          mtime=2026-09-28 09:59:41
dist/.aup/man/settings.yaml    mtime=2026-09-28 09:57:48
dist/.aup/man/console.yaml     mtime=2026-09-28 09:57:48
```

另：Dev 的自述「`.aup/man/settings.yaml` 仍是过期脚手架存根、`.aup/man/**` 不在本轮写范围、未完成」与工作区实况**不一致**——该存根已被改名为 `general.yaml`（内容仍是 TODO，但 `page:` 已从保留字 `settings` 改为 `general`，见文件首注释「Renamed … Round 11F」）。

## 证据输出

```text
$ diff -r .aup dist/.aup
Only in .aup/man: general.yaml
Only in dist/.aup/man: settings.yaml
（exit 1）

$ git status --porcelain .aup/man dist/.aup/man
 D .aup/man/settings.yaml
?? .aup/man/general.yaml

$ git status --porcelain .aup dist/.aup | wc -l      # 其余 .aup/** 与 dist/** 成对一致（页面/locales/wrapper）
```

## 影响范围

- 受影响链路：blocklet 构建产物（`dist/**`）中的 man 页；构建门（提交前必须 `arc blocklet build`）
- 数据后果：无（纯构建产物；运行期/实例不受影响）
- 本轮其它结论不受影响：功能面（BUG-021…025）已全部复验通过，`arc dsl validate --json` `issues:[]`、`npm test` 28/28、`generate --check` 0 漂移

## 修复动作（一句话）

Dev/Lead：`arc blocklet build` → 复跑 `diff -r .aup dist/.aup`（期望无输出）+ `arc dsl validate --json`（`issues:[]`）。QA 不写 `dist/**`，未代跑。

## 疑似文件（线索，未改）

- `.aup/man/general.yaml`（新增）、`.aup/man/settings.yaml`（已删）
- `dist/.aup/man/**`（陈旧副本）
- 注：本 BUG 落盘后 `docs/team/**` 也会进入 `dist/docs/**`，同一次 `arc blocklet build` 一并同步（round-11 §1.1 已确认属正常产物）

## 复验结论（round-11-reverify）

**未修复（阻断）**。见 `docs/team/test-reports/round-11-reverify.md` §7 与末行 `VERDICT=fail, BLOCKING=1`。
