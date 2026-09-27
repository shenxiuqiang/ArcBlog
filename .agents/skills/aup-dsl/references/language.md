# AUP DSL language semantics (measured)

## 1. Files and loading

| Path | Role |
| --- | --- |
| `.aup/app.aup` | app manifest: `default <page>`, `tone`, `palette`, `mode`, `wrapper "wrapper.json"`, `locales [en, zh]`, `pages from "<glob>"`, `page <name> { … }` (inline pages are allowed) |
| `.aup/pages/**/*.aup` | one file per page |
| `.aup/wrapper.aup` → `wrapper.json` | app chrome; the JSON is **generated** (`arc dsl generate --write`) and validate fails with `stale_generated_wrapper_json` if you forget |
| `.aup/locales/{en,zh}.json` | generated, merged, never pruned; **flat dotted keys** |
| `.aup/man/*.yaml` | management docs |
| `world/*.yaml` | AFS record schemas (data lives in `/instance/app/<blocklet>/…`) |
| `pages/`, `.web/` | SSR page / Web Device surface — **not** the AUP surface |

**Page discovery**: one `pages from "<dir>/*.aup"` glob **per directory**.
Nested globs (`pages/**/*.aup`) do **not** pick up subdirectories. A page whose
file lives in a directory with no glob is simply not registered (it validates
fine and never appears in `app.json`).

**A page's tree is served from its `.aup` source** — `app.json` records
`"tree": "pages/<dir>/<name>.aup"`. The daemon compiles the tree per request, so
alias/`component`/`for` expansion is server-side and the client only ever sees
concrete nodes. (Consequence: `arc dsl generate` does not inline them for you.)

## 2. Page file shape

```aup
page dashboard {
  i18n {
    title { en "Dashboard" zh "仪表盘" }
  }
  view {                      // exactly ONE root node
    h1 :title
  }
}
```

* The header is the **untitled** form `page <name> {`. Adding a title fails with
  `text node missing required content`.
* Exactly one root node per page file — wrap siblings in a `view`.
* External page files are the norm; inline `page` blocks in `app.aup` also work
  and are handy for tiny alias/stub pages.

## 3. Parameterised fragments: `component` / `use` / `for`

```aup
page posts {
  component navRow(label, page, active) {
    action "$t(wrapper.${label})" -> page ${page} active=${active} style={padding: "8px 20px"}
  }
  view {
    use navRow(nav-dashboard, dashboard, "true")
    for p in [posts, pages] { use navRow($p, $p, "false") }
  }
}
```

Measured rules:

1. `component name(a, b) { … }` declares; `use name(v1, v2)` instantiates;
   `for x in [a, b] { … }` unrolls at compile time.
2. `$arg` interpolates in **ids, props and text content** — but text needs quotes:
   `p "$label"`, not `p $label` (`text node missing required content`).
3. A literal id inside a component **duplicates on the second `use`**
   (`Duplicate id "x"`). Omit the id, or build it from an arg: `row zz-kv-$label`.
4. Components are **page-local**. A component declared in another file (included
   or not) is invisible: `Unknown component "x"`.
5. No slots: `use comp(x) { … }` is a parse error.

## 4. `include` / `partial` / `import` — do not use

* `include "<path>"` resolves relative to the **including page file** and accepts
  another *page file* (`page frag { … }`); a bare node fragment is rejected with
  `Expected "page"`. It inlines at validation time, and a page that then has two
  roots fails with `AUP page DSL must contain exactly one root node`.
* Rendering an included page fails outright:
  `SESSION INIT FAILED — AUP INCLUDE REQUIRES RESOLVEINCLUDE: <path>`.
  The daemon does not implement include resolution (the runtime bundle has no
  `include` handling at all).
* `partial "<string>"` and `import "<path>"` stop at the parser.

⇒ Shared UI must be **generated into each page**. Keep the generator checked in
and `--check`-able (`scripts/arcblog-console-nav.mjs` + its test are the pattern).

## 5. Ids

* Ids are optional: the DSL infers stable ones from the node's position/type.
* Declare an explicit id **only** when something outside the DSL addresses the
  node: an event target (`events={nav-click: …}` on an `app-header`),
  a `frame` the runtime/bridge looks up, or a test that asserts it.
* `arc dsl lint` warns `unreferenced_explicit_id` for everything it cannot see
  used in DSL events — **it cannot see runtime addressing**, so those warnings can
  be correct-by-design. Never let `arc dsl lint --fix` delete them (§6).
* Ids must be unique per page (and are unique app-wide in ArcBlog's convention).

## 6. i18n

* Each page's `i18n { key { en "…" zh "…" } }` is the source; `arc dsl generate`
  writes **flat dotted keys** into `.aup/locales/*.json`:
  `"dashboard.title": "Dashboard"`. Never hand-nest JSON — a nested object is
  ignored and the UI renders the literal `$t(...)`.
* Keys are **page-scoped**: inside the page use `:key`; from another page you must
  write the full `$t(<page>.<key>)`.
* `generate` merges and never prunes. Dead keys are found by `arc dsl lint`
  (`dead_locale_keys`); `--fix` prunes them.
* The only hand-maintained keys are `wrapper.*`: declare them in `.aup/wrapper.aup`
  and write the strings by hand (e.g. every sidebar label lives there because the
  sidebar is copied into 15 pages).
* A `$t(page.key)` written literally in a *different* page is referenced but never
  declared — declare the key in the page that renders it.

## 7. Expressions, state and interpolation

* Contexts: `$session.*` (`authenticated`, `did`, `displayName`…), `$state.*`
  (page/component state, `propBind` results), `$params.*` (route params, e.g.
  `$params.slug`), `$args.*` (action/exec payload), `entry.*` (inside
  `afs-list` item templates and even action props, e.g. `path="${entry.path}"`).
* Operators: only `!`, `&&`, `||`. **No comparisons, no arithmetic** — hence the
  draft/published split across two AFS directories instead of `status` filters.
* Two interpolation channels, and mixing them up is a classic bug:
  * `prop="$state.x"` — expression, evaluated once (safe for `visible=$session.authenticated`).
  * `prop="${state.x}"` — template, re-evaluated when state changes.
  With async `propBind` data, always use the `${…}` form:
  `visible="${state.post.coverImage}"`. The expression form never recovers.
* `input value="${state.x}"` interpolates and stays editable;
  `input state={value: "${state.x}"}` renders the template literally.
* Object/array props use the `{…}` / `[…]` literal syntax:
  `actions=[{kind: theme-toggle, icon: sun}]`, `style={padding: "0"}`.
  `$t()` and `${…}` work inside those literals.

## 8. Writes

```aup
action save "$t(page.save)" exec="/.actions/write" args={path: "/instance/app/<b>/<dir>/${state.slug}.json", body: "${state.body}" }
```

* Authorization is the blocklet's `replicated` table (`minRole: admin`,
  `copy: none` for single-file records). A plain base-path network write is denied.
* Page-side `exec` args can interpolate `${args.*}` / `${state.*}`; they cannot
  split arrays, so multi-value fields (tags) arrive as a raw string — normalize in
  a CLI/agent if it matters.
* Reading instance paths from a terminal: `arc afs exec
  /blocklets/<id>/.actions/{list,read,write,delete}` — root-scope `arc afs ls`
  cannot see `/instance/...`.
