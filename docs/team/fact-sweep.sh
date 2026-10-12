#!/usr/bin/env bash
# fact-sweep.sh —— **P15 的执行工具**：把一句"事实性断言"在文档里**全库扫一遍**，列出所有复述点。
#
# 为什么需要它（真实事故）：一句事实「**不给上传按钮/拖拽区**」复述在 **Stage 3 `B6` +
# Stage 4 `BD-06`/`07 §1`/`_提纲`** 共 **4 处**；只改 `BD-06` 一处时，**验收总表仍会按旧负例判**
# ⇒ 假红/假绿。**"改一处"等于没改。**
# 阶段门的"跨篇重复"判据（`A0`）**只抓 ID**，**抓不到自然语言复述** ⇒ 这一步必须人工/工具兜。
#
# 用法：
#   bash docs/team/fact-sweep.sh '拖拽区'                 # 扫现行面（docs/**）
#   bash docs/team/fact-sweep.sh 'always on' 'rss.xml'    # 多个短语（任一命中即列出）
#
# 口径（写清"量的是什么"，P10）：**命中行数**（`grep -n`），**不是出现次数**；
#   `--count` 另给每短语的**出现次数**（`grep -o | wc -l`）。
#
# ⚠️ 扫出复述点后**仍要逐条判断**（P15 反面）：**与新事实相容的复述不必改**。
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 2

if [ "$#" -eq 0 ]; then
  echo "用法: bash docs/team/fact-sweep.sh '<短语或正则>' [--count]" >&2
  exit 2
fi

ARCHIVE=0; COUNT=0; PHRASES=()
for a in "$@"; do
  case "$a" in
    --count) COUNT=1 ;;
    *) PHRASES+=("$a") ;;
  esac
done

# 现行面 = docs/（排除 docs/team 的过程件？—— 不排除：过程件里的复述同样会误导，只标注）
SCOPE=(docs)

echo "=============================================================================="
echo "P15 全库扫描 ｜ 短语: ${PHRASES[*]}"
echo "范围: ${SCOPE[*]}  ｜ 口径: 命中**行数**（每短语另算出现次数）"
echo "=============================================================================="

total=0
for ph in "${PHRASES[@]}"; do
  echo
  echo "── 「${ph}」 ──"
  hits=$(grep -rn --include='*.md' -E "${ph}" "${SCOPE[@]}" 2>/dev/null || true)
  if [ -z "$hits" ]; then
    echo "   （无命中）"
    continue
  fi
  n=$(printf '%s\n' "$hits" | wc -l | tr -d ' ')
  total=$((total + n))
  printf '%s\n' "$hits" | cut -c1-170 | sed 's/^/   /'
  echo "   ⇒ 命中行数 = $n"
  if [ "$COUNT" -eq 1 ]; then
    occ=$(grep -ro --include='*.md' -E "${ph}" "${SCOPE[@]}" 2>/dev/null | wc -l | tr -d ' ')
    echo "   ⇒ 出现次数 = $occ"
  fi
done

echo
echo "=============================================================================="
echo "合计命中行数 = $total"
echo "提醒（P15 反面）：**扫出复述点后仍要逐条判断**——与新事实**相容的复述不必改**；"
echo "      要改的，按清单**逐处**修正，并在**每个被改文件的变更记录留痕**。"
echo "=============================================================================="
