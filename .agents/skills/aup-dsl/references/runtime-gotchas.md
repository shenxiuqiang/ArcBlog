# Runtime gotchas (each one cost real debugging time)

All of these were reproduced on the live daemon; "symptom → cause → fix".

## Rendering

1. **A page dies with `SESSION INIT FAILED …`**
   The tree contains something the daemon/runtime cannot resolve — most often an
   `include` (`AUP INCLUDE REQUIRES RESOLVEINCLUDE`). Remove it; generate the
   repeated markup instead.
2. **`Node '<id>' has no 'nav-click' event` on every click**
   `app-header`'s brand `src` makes the runtime emit `nav-click` at that node.
   Either declare `events={nav-click: {target: _root, set: {page: $args.src}}}`
   or give the brand an `href` instead of `src`.
3. **`text node missing required content`**
   A component arg used as bare text (`p $label`) — quote it (`p "$label"`) — or a
   page declared with a title.
4. **`Duplicate id "<x>"`**
   A literal id inside a `component` used twice (`for`/second `use`). Omit it or
   parameterise it (`row zz-kv-$label`).
5. **`AUP page DSL must contain exactly one root node`**
   Two top-level nodes in a page file (often an inlined fragment + a `view`).

## Data binding

6. **`visible` on async data: four spellings, three of them useless** (v2,
   2026-10-12, measured on a deployed instance — `arc-contracts` §28.1)
   | spelling | bound, value non-empty | bound, value empty |
   | --- | --- | --- |
   | `visible="${state.x}"` | shows | **still shows** → always true |
   | `visible="!${state.x}"` | **hidden** | hidden → always false |
   | `visible=$state.x` (bare) | **hidden** | hidden → **frozen at first paint** |
   | `visible="!$state.x"` (bare) | **still shows** | shows → same freeze |
   | `visible="${entry.x}"` **inside an `afs-list` row** | shows | hidden → ✅ **correct both ways** |
   ⇒ Only **synchronous `$session.*`** conditions are reliable, and only
   **`$entry.*` inside row templates** is a working data-driven branch. On a
   `propBind` page a bare `!$state.record` renders a **false "not found"** on the
   first load of a *valid* record (`DEF-18`, measured: 157 chars of shell on the
   cold load vs 3748 with the article on reload).
   **Workaround:** compute the decision in the CLI/record and print precomputed
   strings/markers as *standing* text (reference: `?page=registry` markers, and
   `decorateNodeFactorySummary()` in `scripts/lib/chain.mjs` for `?page=factory`).
   Never gate a body block on `$state.*`: make it unconditional and put an honest
   platform note in standing copy — but the note must be true in both cases
   ("this page binds after first load; reload if blank"), never "not found".
   Also: **`time mode=display` renders an empty value as `now()`** (runtime bundle,
   no suppressing prop) — use it only inside row templates; print the record value
   verbatim on `propBind` pages (`scripts/lib`/`.aup/pages/reader.aup`).
7. **A row silently disappears from a filtered list after being edited**
   `afs-list` `filter`/`serverFilters` run through the index, and an edit leaves
   the index entry stale — and a record with a normal body is never indexed at all
   (measured: `where {field:"slug", eq:"hello-arcblog"}` → 0 rows), so a filter
   can never select one record. Prefer a directory boundary (`posts/` vs `drafts/`).
   Note the field name must start with `content.` to be pushed down at all.
7b. **`propBind` does NOT bind on the first visit of a browser session** (v3,
   2026-10-12, `arc-contracts` §57 / `docs/05-开发文档/02` B14 — the root cause of
   the blank article page)
   The daemon resolves `propBind` into the **AUP session state only after the first
   render**: the first `aup render` WS frame carries `propBind` and **no `state`**
   (4520 B), the reload frame carries `state:["post"]` + the record (14042 B), and
   nothing is pushed later (30 s). The served client bundle has **no `propBind`
   handler** (`grep propBind aup.*.js` = 0) ⇒ the first paint cannot fetch it.
   Firing `select`/`connect`/`navigate` events on load does **not** make the daemon
   re-render with the state (measured: `PBTITLE[]` still empty after 20 s).
   `$params.*` is substituted **only inside a `propBind` value** — in plain text, in
   `afs-list filter`, and in `surface src` it stays literal.

   **The cold-start channels that DO work:**
   * **one record** — `surface <id> url=$state.loc editable=false { … }`.
     `$state.loc` is the record path the runtime derives from
     `__AUP_BOOT__.bindings[].afs` + `location.pathname` (`Vi()`→`Un()`); `$state.slug`
     / `$state.page` also exist. It must be given as a **prop** (`url=`) because only
     props are rewritten with the state context (`N0()`); a node-level `src=` keeps the
     literal `$state.loc`. `editable=false` avoids the surface editor.
     The markup comes from the record directory's **item recipe**
     `<dir>/.aup/item.json` (`${content.<field>}` placeholders, `format=markdown`
     works) — without it the surface prints the raw JSON string. Install with
     `node scripts/arcblog-recipes.mjs install` (ArcBlog).
   * **a list** — `afs-list` fetches on first paint (`list`/`query` RPC) and
     `$entry.*` in the **row template** is correct; the row's direct child must carry
     **`role=item`**, otherwise the runtime renders its default file row
     (`name.json application/json 4.8 KB`).
   * `afs-list from=$state.loc` does **not** work: `list` on a *file* returns `[]`.
8. **`afs-list` `emptyText` shows the runtime's English default**
   `emptyText` does not evaluate `$t()`. And per gotcha 6 you **cannot** gate a
   page-level empty card on bound data with `visible`: put the guidance in
   standing copy (always rendered), or precompute a marker in the record.
9. **An `afs-list` select event cannot navigate**
   The select-event payload merges the entry over `args`, so a `navigate` target is
   inert. Use `view href="…"` links (which also work inside item templates).

6b. **`$session.*` resolves in text nodes and `visible=` — nowhere else**
   (measured 2026-10-12 against the served client bundle, 802 KB: the session map is
   referenced **once**; evidence `arc-contracts` §62 / `docs/05-开发文档/02` B18)

   | Where | Session substituted? |
   | --- | --- |
   | text node whose **whole** string is `$session.<field>` | **yes** (composite text is untouched) |
   | `visible=<cond>` | **yes** (its own helper) |
   | action `content` / `args` templates | **no** — vocabulary is `${args.<inputName>}` / `${input.*}` |
   | form `input value=` / `state={value:}` | **no** |
   | `${entry.*}` inside an `afs-list` row | separate vocabulary, still no session |

   The click path makes it concrete: args = `path`/`label`/`selectionKey` plus
   `B[inputName] = el.value` read from the DOM, then `window.afs.exec(path, B)`. Because a form
   value cannot hold a session lookup either, **no page-driven write can carry a session value**.
   So `exec "/.actions/write" { content: {authorDid: "$session.did"} }` stores the literal
   `"$session.did"`. Write such fields from the CLI, or accept a server-side backfill; never
   promise "the page signs as you".

## Layout / style

10. **The `100vw` header is cropped / a full-bleed shell is clipped**
    The app content is capped by `--aup-content-max`. A page root needs
    `style={height: "100vh", overflow: visible}` — `overflow: hidden` re-introduces
    the clip.
11. **`backgroundImage` / `backgroundPosition` do nothing**
    Safe-style allowlist. Write the shorthand:
    `background: "<color> url(...) center / cover no-repeat"`.
12. **`borderBottom` on a `view` is dropped**
    Draw dividers as explicit 1px elements.
13. **A fixed-size thumbnail gets squashed**
    `afs-list` row children default to `flex: 1 1 0%`; set `flexGrow: 0` **and**
    `flexBasis` (not just `flexShrink: 0`).
14. **The first row renders as selected**
    Pass `autoSelect=false`.
15. **A sidebar row looks centered / only 91px wide in a fixed column**
    Actions are inline-flex: set `justifyContent: flex-start` and let the child
    stretch (`align-self: stretch` from CSS, or a full-width parent).

## Frames / bridges

16. **A component's `target="_parent"` link silently does nothing**
    `frame` sandboxes by default (`allow-scripts allow-forms allow-popups
    allow-same-origin`). Append tokens with a string
    (`sandbox="allow-top-navigation-by-user-activation"`) or pass `sandbox=false`
    for a same-origin src.
17. **Theme flashes the wrong colour for ~300ms on navigation**
    The runtime resets `data-mode` on every navigation, so the compiled `mode` in
    `app.aup` must match the real appearance, and the bridge must re-apply the
    cached theme immediately (ArcBlog caches it in `localStorage`).
18. **A bridge stops working after navigation**
    Navigation recreates the iframe, so the bridge must be keyed per window
    (`parent.__x === window`) and re-run on each load.

## Tooling

19. **`validate` fails with `stale_generated_wrapper_json`**
    `.aup/wrapper.json` is generated: `arc dsl generate --write`.
20. **A page exists in `.aup/pages/<dir>/` but never appears**
    No `pages from "pages/<dir>/*.aup"` glob (nested globs do not work), so it is
    not registered in `app.json`.
21. **`arc dsl lint --fix` deleted ids that broke the app**
    It cannot see runtime addressing (`site-header`, iframe ids). Restore them and
    keep a guard test that asserts the ids your app addresses.
22. **Validation is green but the feature does not work**
    `validate` checks the DSL, not the runtime. Things that validate and still
    fail: `include`, absent primitives, unknown props. Always render the page.
23. **`npm test` / any live test runs against a shared instance**
    Do not run the suite concurrently with `arc blocklet build` + `instance deploy`
    + `arc service restart`; the restart breaks the tests mid-run. Deploy first,
    then test.
