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

6. **`visible` never becomes true for bound data**
   `visible="$state.post.coverImage"` (expression) is evaluated once, before
   `propBind` resolves. Use `visible="${state.post.coverImage}"`.
7. **A row silently disappears from a filtered list after being edited**
   `afs-list` `filter`/`serverFilters` run through the index, and an edit leaves
   the index entry stale. Prefer a directory boundary (`posts/` vs `drafts/`) or
   `propBind` for a single record.
8. **`afs-list` `emptyText` shows the runtime's English default**
   `emptyText` does not evaluate `$t()`. Put empty-state guidance in a page-level
   card shown by `visible`.
9. **An `afs-list` select event cannot navigate**
   The select-event payload merges the entry over `args`, so a `navigate` target is
   inert. Use `view href="…"` links (which also work inside item templates).

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
