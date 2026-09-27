# Verification: prove a change, measure a new fact

## 1. Static gates (fast, no side effects)

```bash
arc dsl validate --json      # must be {"ok":true}
arc dsl generate --check     # artifact drift (wrapper.json, app.json, locales…)
arc dsl lint                 # formatting + dead locale keys + id warnings
arc dsl format --write       # only if lint reports format_changed
arc dsl schema --json        # the vocabulary (see §3)
```

## 2. Make it live, then look at it

```bash
arc blocklet build
arc blocklet instance deploy . --domain <host>    # e.g. arcblog.localhost
arc service restart
sleep 6
curl -s -o /dev/null -w "%{http_code}\n" "http://<host>:4939/?page=<page>"
```

Rules learned the hard way:

* **Deploy before running the test suite** — `arc service restart` mid-suite breaks
  live tests. Never run them concurrently.
* `npm test` also cleans the dev instance; if you are debugging, use
  `ARCBLOG_NO_CLEAN=1` and `npm run test:clean` later.
* A page is client-rendered: `curl` shows the shell, not your node. Verify in a
  **browser** and read the DOM (see §4).

## 3. Measure capability — do not trust the schema alone

The schema lists vocabulary; only the served runtime proves support.

```bash
# a) vocabulary
arc dsl schema --json > /tmp/dsl-schema.json

# b) the runtime bundle the browser actually executes
JS=$(curl -s "http://<host>:4939/?page=index" | grep -o 'aup\.[a-f0-9]*\.js' | head -1)
curl -s "http://<host>:4939/$JS" -o /tmp/aup.js
wc -c /tmp/aup.js

# c) which primitives are implemented, and their props
python3 - <<'PY'
import json, re
schema = json.load(open('/tmp/dsl-schema.json'))['schema']
js = open('/tmp/aup.js', encoding='utf-8', errors='replace').read()
ok, missing = [], []
for p in schema['primitives'] + schema['primitiveAliases']:
    (ok if (f'case"{p}"' in js or f'aup-{p}' in js) else missing).append(p)
print('implemented:', len(ok)); print(', '.join(ok))
print('ABSENT:', ', '.join(missing))

def body(fn_start):
    i = js.index('{', fn_start); d, j = 0, i
    while j < len(js):
        c = js[j]
        if c == '{': d += 1
        elif c == '}':
            d -= 1
            if d == 0: return js[i:j+1]
        j += 1
    return ''

for name in ['key-value-list', 'chip', 'breadcrumb', 'table']:
    m = re.search(r'case"' + re.escape(name) + r'":r=([A-Za-z_$][\w$]*)', js)
    if not m: print(f'--- {name}: no renderer'); continue
    fm = re.search(r'function ' + re.escape(m.group(1)) + r'\(', js)
    b = body(fm.start()) if fm else ''
    props = sorted(set(re.findall(r'\b[a-zA-Z_$][\w$]*\.([a-zA-Z][A-Za-z0-9]*)\b', b)))
    print(f'--- {name}: {", ".join(props[:30])}')
PY
```

## 4. DOM probes (behaviour, not pixels)

With a Chrome DevTools MCP session open on the instance:

```js
() => {
  const q = (s) => document.querySelector(s);
  return {
    sessionFailed: /SESSION INIT FAILED/.test(document.body.innerText),  // must be false
    kv: q('.aup-kv')?.innerText,
    chip: q('.aup-chip')?.getAttribute('data-color'),
    crumb: [...document.querySelectorAll('.aup-breadcrumb-item')].map((e) => e.innerText.trim()),
    active: [...document.querySelectorAll('[data-active="true"]')].map((e) => e.innerText.trim()),
    ids: [...document.querySelectorAll('[data-aup-id]')].slice(0, 10).map((e) => e.getAttribute('data-aup-id')),
  };
}
```

Useful selectors: `.aup-kv*`, `.aup-chip`, `.aup-breadcrumb*`, `.aup-list`,
`[data-active="true"]`, `[data-aup-id]`, `[data-mode]`, `[data-layout]`.
`SESSION INIT FAILED` in `body.innerText` is the single best health check — it
catches `include`, absent primitives and runtime-invalid props in one look.

## 5. Adding a repo gate for a new invariant

New platform facts deserve a test, not a comment:

* file-level assertions on `.aup` sources (id must exist, page must carry a node)
  → `node:test` + `readFileSync`, see `scripts/arcblog-runtime-ids.test.mjs`,
  `scripts/arcblog-console-nav.test.mjs`;
* generated-artifact assertions → call the generator with `--check` from the test;
* live behaviour → `node --test scripts/arcblog-*.test.mjs` against the dev instance.

Then wire it into `npm test` and confirm the whole suite is green **after** the
final deploy, not before.

## 6. When a measurement contradicts the docs

Update, in this order:

1. `docs/arc-contracts.md` — the measurement and its evidence (numbered section);
2. `CLAUDE.md` — if it changes how a contributor must work;
3. `.agents/skills/aup-dsl/` — this skill, so the next agent does not re-derive it;
4. `docs/ArcBlog-feature-checklist.md` — the maintenance log entry.
