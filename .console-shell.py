"""Turn the three management pages into a left-menu / right-content shell and
collapse the three custom user-menu entries into one.

Design notes:
* AUP has no fragment/include primitive, and expressions support no comparisons, so
  the sidebar is duplicated per page and the active item is marked per page.
* i18n keys are page-scoped, so each page carries its own three sidebar labels.
* The sidebar markup is generated here from one template to keep the three copies
  identical.
"""

import re
from pathlib import Path

APP = Path('/Users/shenxiuqiang/workspace/ArcBlog/.aup/app.aup')
WRAPPER = Path('/Users/shenxiuqiang/workspace/ArcBlog/.aup/wrapper.aup')
LOCALES = {
    'en': Path('/Users/shenxiuqiang/workspace/ArcBlog/.aup/locales/en.json'),
    'zh': Path('/Users/shenxiuqiang/workspace/ArcBlog/.aup/locales/zh.json'),
}

LABEL_KEYS = [
    '      nav-dashboard { en "Dashboard" zh "仪表盘" }',
    '      nav-studio { en "Studio" zh "工作室" }',
    '      nav-operations { en "Operations" zh "运维" }',
]

SIDEBAR = [
    '      view console-nav gap=xs size={width: "210px", flexShrink: 0} style={padding: "16px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg, 12px)", background: "var(--color-surface)"} visible=$session.authenticated {',
    '        action console-nav-dashboard -> page dashboard label=:nav-dashboard{active_dashboard}',
    '        action console-nav-studio -> page admin label=:nav-studio{active_studio}',
    '        action console-nav-operations -> page operations label=:nav-operations{active_operations}',
    '      }',
]


def sidebar(active):
    """Sidebar lines with `variant=primary` on the page we are inside."""
    out = []
    for line in SIDEBAR:
        for page in ('dashboard', 'studio', 'operations'):
            line = line.replace(
                '{active_%s}' % page,
                ' variant=primary' if page == active else '',
            )
        out.append(line)
    return out


def block_end(lines, start):
    """Index of the line that closes the block opened on `start`."""
    depth = 0
    for i in range(start, len(lines)):
        depth += lines[i].count('{') - lines[i].count('}')
        if depth == 0 and i > start:
            return i
    raise SystemExit(f'unbalanced block starting at line {start + 1}')


def page_range(lines, name):
    start = next(i for i, l in enumerate(lines) if re.match(rf'^  page {name}\b', l))
    end = next((i for i in range(start + 1, len(lines)) if re.match(r'^  page \w', lines[i])), len(lines))
    return start, end


lines = APP.read_text().split('\n')

PAGES = {
    'dashboard': ('view gap=lg visible=$session.authenticated {', 'dashboard'),
    'admin': ('view gap=lg {', 'studio'),
    'operations': ('view gap=lg visible=$session.authenticated {', 'operations'),
}

# --- 1. rewrite the three content wrappers, bottom-up so indexes stay valid -----
for name in sorted(PAGES, key=lambda n: page_range(lines, n)[0], reverse=True):
    opener, active = PAGES[name]
    start, end = page_range(lines, name)
    candidates = [i for i in range(start, end) if lines[i] == '    ' + opener]
    if len(candidates) != 1:
        raise SystemExit(f'{name}: expected exactly one "{opener}", found {len(candidates)}')
    i = candidates[0]
    close = block_end(lines, i)
    replacement = [
        '    row console-shell gap=lg cross=start' + opener[len('view gap=lg'):].replace(' {', ' {'),
        *sidebar(active),
        '      view console-pane gap=lg size={flex: 1} {',
    ]
    # the row keeps the visibility guard the view carried
    lines[i:close + 1] = replacement + lines[i + 1:close + 1] + ['      }']
    print(f'{name}: wrapper converted (row at line {i + 1}, +1 closing brace)')

# --- 2. add the three sidebar labels to each page's i18n block ------------------
for name in sorted(PAGES, key=lambda n: page_range(lines, n)[0], reverse=True):
    start, end = page_range(lines, name)
    i0 = next(i for i in range(start, end) if lines[i].strip() == 'i18n {')
    i1 = block_end(lines, i0)
    lines[i1:i1] = LABEL_KEYS
    print(f'{name}: i18n labels inserted before line {i1 + 1}')

APP.write_text('\n'.join(lines))

# --- 3. one user-menu entry instead of three -----------------------------------
w = WRAPPER.read_text()
old_items = (
    'items: [{id: dashboard, label: :nav-dashboard, icon: "grid", exec: "dashboard"}, '
    '{id: studio, label: :nav-studio, icon: "settings", exec: "admin"}, '
    '{id: operations, label: :nav-operations, icon: "grid", exec: "operations"}]'
)
new_items = 'items: [{id: console, label: :nav-console, icon: "grid", exec: "dashboard"}]'
if old_items not in w:
    raise SystemExit('user-menu items not found in wrapper.aup')
w = w.replace(old_items, new_items, 1)
anchor = '    nav-studio { en "Studio" zh "工作室" }'
if anchor not in w:
    raise SystemExit('nav-studio anchor not found in wrapper.aup i18n')
w = w.replace(anchor, anchor + '\n    nav-console { en "Management" zh "管理后台" }', 1)
WRAPPER.write_text(w)
print('wrapper: user menu collapsed to one entry; nav-console key added')

# --- 4. wrapper locale keys are hand-maintained --------------------------------
import json

for lang, path in LOCALES.items():
    data = json.loads(path.read_text())
    label = 'Management' if lang == 'en' else '管理后台'
    data.setdefault('wrapper', {})['nav-console'] = label
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(f'locales/{lang}.json: wrapper.nav-console = {label}')
