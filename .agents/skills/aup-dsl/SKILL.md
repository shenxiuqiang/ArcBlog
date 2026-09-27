---
name: "aup-dsl"
description: "Write, review or refactor ArcBlock AUP DSL (.aup pages, components, apps) without re-investigating the language: verified primitive inventory, prop contracts, fragment semantics, i18n/id rules, runtime gotchas and the validation workflow."
---
# ARC skill: aup-dsl

Everything here was **measured on a live daemon** (arc 2.0.0-beta.50, ArcBlog
instance) — not copied from marketing docs. If you need a fact that is not here,
use `references/verification.md` to measure it in ~1 minute instead of guessing.

**Read this file first. Then load only the reference you need:**

| File | Load it when |
| --- | --- |
| `references/primitives.md` | choosing a built-in node / needing its props |
| `references/language.md` | writing pages, components, i18n, ids, expressions |
| `references/runtime-gotchas.md` | something renders wrong, blank, or dies at runtime |
| `references/verification.md` | you must prove a change works (and how to measure new facts) |

## 0. Settled questions — do NOT re-investigate these

| Question | Verdict (measured) |
| --- | --- |
| Is there an include/partial mechanism for shared UI? | **No usable one.** `include` parses + inlines at validation time but the daemon refuses to render: `SESSION INIT FAILED — AUP INCLUDE REQUIRES RESOLVEINCLUDE`. `partial` / `import` never get past the parser. Cross-page reuse ⇒ generate into each page (that is why ArcBlog has `scripts/arcblog-console-nav.mjs`). |
| Do parameterised fragments exist? | **Yes**: `component hello(arg) { … }` + `use hello(value)` + `for x in [a, b] { … }`. Page-local only. `$arg` interpolates in ids, props and text. |
| Can a component take children (slots)? | No — `use comp(x) { … }` is a parse error. |
| Are all 63 schema primitives usable? | **No.** 54 are implemented in the served runtime; 9 are absent and must never be written (see §2). |
| Can an expression compare values? | No comparisons. Only `!`, `&&`, `||` over `$session.*` / `$state.*` (that is why draft/published is split across two AFS directories instead of filtered by `status`). |
| Does `active=true` auto-detect the current page? | No: the runtime checks literal `t.active === true`. Mark the current row statically. |
| Is `arc dsl lint --fix` safe to run? | **No.** It also deletes ids that only the *runtime* addresses (event targets, iframe ids). See §6. |
| Do list filters see edited records? | No — `afs-list` `filter`/`serverFilters` go through the index, and an edit leaves the index entry stale, so the row silently disappears. Prefer directory boundaries or `propBind`. |

## 1. The 60-second mental model

```
app.aup           app shell: default page, tone/palette/mode, wrapper, locales,
                  and one `pages from "<dir>/*.aup"` glob PER DIRECTORY
.aup/pages/**     one file per page, `page <name> { … }`, exactly ONE root node
.aup/wrapper.aup  app chrome (header/footer/frames) → generated wrapper.json
.aup/locales/     GENERATED flat dotted keys ("page.key"), merged, never pruned
world/*.yaml      AFS record schemas; data lives in /instance/app/<blocklet>/…
.web/, pages/     Web Device components + SSR pages (different surface!)
```

* A page's **tree is served from the `.aup` source** (`app.json` registers
  `"tree": "pages/<dir>/<name>.aup"`); the daemon compiles it, the client renders it.
  Alias/component/for expansion therefore happens **server-side**.
* Anything below `.aup/` is the **AUP surface**. `pages/` + `.web/` are the SSR /
  Web Device surface — different primitives, different rules. Don't mix them.

## 2. Primitive inventory (short form)

Full list + prop contracts: `references/primitives.md`.

* **Implemented (54)**: `action afs-dropzone afs-list afs-preview afs-stat agent
  app-footer app-header auto-fire auto-surface block-revealer breadcrumb broadcast
  calendar canvas chart chat chip comments-surface deck editor entity-overview
  finance-chart frame hero-widget input key-value-list map media moonphase
  natal-chart overlay pagination photo-story post-editor progress-bar-3d
  scroll-explainer searchable-dropdown share-panel surface table terminal text
  text-highlight text-image-expand ticker time tooltip type-block url-default view
  webgl-hero wm xeyes`
* **Absent — writing these is inventing an API**: `blocklet-embed camera-preview
  connection-gate explorer globe provider-card rtc skills wm-surface`
* **Aliases** (expanded server-side; DOM-measured): `row grid stack` → a `view`
  with `data-layout`; `h1 h2 h3 p` → `DIV.aup-text`; `card badge button tab repeat`
  → compile-time sugar (verify in the DOM before relying on the exact output).
* **DOM hooks** for probes/CSS: `.aup-view .aup-text .aup-action .aup-kv* .aup-chip
  .aup-breadcrumb* .aup-list* [data-layout] [data-mode] [data-active="true"]`.
* **Highest-value under-used built-ins**: `key-value-list` (label/value rows with
  `copyable`/`monospace`), `breadcrumb`, `chip`, `tooltip`, `searchable-dropdown`,
  `pagination`, `table`, `entity-overview`, `share-panel`, `chart`/`finance-chart`.

## 3. The five rules that prevent most breakage

1. **One root node per page file**, wrapped in a `view` if needed; the header is
   `page <name> {` — adding a title breaks with `text node missing required content`.
2. **Ids**: let the DSL infer them. Declare an explicit id **only** when runtime
   JS addresses the node (an event target, an iframe id) — those ids are
   load-bearing and `arc dsl lint --fix` will try to delete them (§6).
3. **i18n keys are page-scoped** (`<page>.<key>`) and stored flat (`"post.title"`);
   only `wrapper.*` is hand-maintained. Within a page use `:key`; from another
   page you must write the full `$t(<page>.<key>)`. Never nest the JSON.
4. **Two interpolation channels**: `prop="$state.x"` is an *expression* (evaluated
   once — fine for booleans, fatal for async data arriving later), while
   `prop="${state.x}"` is a *template* (re-evaluated). With `propBind` use the
   `${…}` form: `visible="${state.post.coverImage}"`.
5. **Writes** go through `exec "/.actions/write"` with `${args.*}` templates and are
   authorized by `replicated` collections in `blocklet.yaml` — a plain base-path
   network write is denied. `minRole: admin` + `copy: none` keeps records single-file.

## 4. Want → use

| You want | Use | Notes |
| --- | --- | --- |
| Reads of one record on a page | `propBind={x: "/instance/app/<b>/<dir>/$params.slug.json"}` + `${state.x.*}` | binds before render; `${…}` form for `visible` |
| A list of records | `afs-list` (+ `layout`, `columns`, `pageSize`, `autoSelect=false`) | filters are index-backed (see §0) |
| Label/value pairs (profile, health, policy) | `key-value-list fields=[{label, value, monospace, copyable}]` | platform alignment + copy button for free |
| Breadcrumb / tags / counts | `breadcrumb items=[{label, href}]`, `chip label=… count=…` | last breadcrumb item gets `aria-current` |
| A select in a form | `searchable-dropdown options=[…]` | better than `input` for long vocabularies |
| Hints without visual noise | `tooltip content=… trigger=…` | |
| Steps / tabbed panels | `view mode=steps` / `view mode=tabs` | the tabs engine is real and platform-native |
| Long list paging | `pagination` or `afs-list` paging | |
| Media upload | `afs-dropzone` | ArcBlog already uses it |
| Repeated markup in one page | `component` + `use` + `for` | ids inside a component must be omitted or `$arg`-parameterised |
| Shared markup across pages | **generate it** (script) — `include` does not run | keep the generator `--check`-able |
| An iframe to a Web Device | `frame <id> src="/p/<locale>/<name>/" bridge=… overlay=… sandbox=…` | keep the id; sandbox silently blocks `target="_parent"` unless you pass a string |

## 5. Workflow that keeps the gates green

```bash
arc dsl validate --json          # must be ok            (primary gate)
arc dsl generate --check         # artifact drift gate
arc dsl lint                     # format + dead locale keys (+ id warnings)
arc dsl format --write           # if lint reports format_changed
arc blocklet build               # refresh dist/
arc blocklet instance deploy . --domain <host> && arc service restart
```
Then verify in a browser (DOM probes beat screenshots for behaviour). Full
recipes, including how to fetch the served runtime bundle and read a primitive's
prop contract, are in `references/verification.md`.

## 6. `arc dsl lint --fix` is a trap

It deletes every `unreferenced_explicit_id` — including ids that only the
**runtime** addresses. Measured casualties: `site-header` (the `nav-click` target
of `app-header`'s brand button → `Node 'site-header' has no 'nav-click' event`),
`hero-carousel-frame`, `theme-bridge-frame`. Guard: a test that asserts the ids
your app addresses (`scripts/arcblog-runtime-ids.test.mjs` in ArcBlog).

Safe use: run it, then restore the runtime-addressed ids and re-run that guard.
Everything else it removes (generated menu rows, dividers, wrapper-only helpers)
is genuinely dead — in ArcBlog that took lint from hundreds of warnings to
`Passed DSL lint` plus 24 intentional ones.

## 7. Where the measured detail lives (read, don't re-derive)

* `docs/arc-contracts.md` §21–§25 — this project's platform measurements:
  live-region behaviour, hashchange re-render, URL normalisation, iframe sandbox,
  page-per-section layout, full-screen header, the DSL capability map (§25),
  the `--fix` trap (§25.4) and a prioritised primitive backlog (§25.5).
* `CLAUDE.md` — runtime conventions with the "learned the hard way"的原因.
* `arc dsl schema --json` — the machine-readable vocabulary (63 primitives).
* `arc dsl lint` / `arc dsl validate` — the two gates that never lie.
