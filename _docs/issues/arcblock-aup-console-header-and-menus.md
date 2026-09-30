# AUP app and the service console render two different headers, and there is no supported way to control the signed-in menus

**Environment**

| | |
|---|---|
| ARC | `2.0.0-beta.50` (`c711b9aa`, 2026-09-10) |
| Instance | local, `arc service`, port `4939` |
| Blocklet | `arcblog` 0.3.7, `did:blocklet:arcblog`, mounted at `/` (AUP app) + `/p` (web route) |
| Host | macOS (Apple silicon), Google Chrome 153.0.8010.54 |
| Login | DID Wallet **browser extension** (DID Connect), signed in as an owner account |

We build an AUP app (`.aup/*.aup`, no bundler, no dev server) and use the service console
(`/.well-known/service/user`, `/.well-known/service/admin`) for platform settings. Two things
block us, both about navigation chrome.

---

## 1. Two headers: the AUP app and the service console are two separate front-ends

Navigating between our page and the platform pages visibly swaps the whole header. That is
expected in hindsight, but there is no documented way to unify it.

Measured on `http://arcblog.localhost:4939/`:

**Our AUP app** (`/?page=dashboard`):

```html
<header class="aup-app-header" data-aup-id="site-header" data-aup-server-driven="true" data-variant="compact">
  <div class="aup-app-header-bar" data-variant="compact">
    <button type="button" class="aup-app-header-brand-link" role="link" aria-label="ArcBlog">
      <div class="aup-app-header-title">ArcBlog</div>
    </button>
    ...
```

scripts: `/aup.<hash>.js`; theme is `<html data-tone data-palette data-mode>`.

**Service console** (`/.well-known/service/user#profile`):

```html
<header class="admin-header">
  <div class="admin-header-left">
    <button class="sidebar-toggle toolbar-btn" id="sidebar-toggle" onclick="toggleSidebar()">…</button>
    <img src="/.well-known/service/blocklet/logo-preview/square" style="height:28px;width:auto;border-radius:4px">
    <a href="/" class="app-name-link">ArcBlog</a>
    <h1>User Center</h1>
  </div>
  ...
```

scripts/styles: `/.well-known/service/theme/init.js`, `assets/admin-core.<hash>.js`,
`assets/admin.css`, `assets/design.css`; server-rendered (inline `onclick`), no AUP runtime.

So the console header has a logo, a page title and a collapsible left sidebar; ours has a
text-only brand and a right-side action strip.

| our AUP app header | service console — User Center | service console — Admin Console |
|---|---|---|
| ![AUP app header](https://raw.githubusercontent.com/shenxiuqiang/ArcBlog/main/docs/issues/assets/01-aup-app-header.png) | ![User Center header](https://raw.githubusercontent.com/shenxiuqiang/ArcBlog/main/docs/issues/assets/03-console-user-center-header.png) | ![Admin Console header](https://raw.githubusercontent.com/shenxiuqiang/ArcBlog/main/docs/issues/assets/04-console-admin-console-header.png) |

(The console captures have the page body hidden — profile and member content are not
relevant here.)

**Questions**

1. Is a single header across the AUP app and the service console supported today? For example
   a documented theme/host hook that makes the console reuse the blocklet's AUP header (or the
   reverse: an AUP app that embeds the console chrome).
2. If it is not supported: what is the recommended integration pattern? We are considering
   keeping users inside our own AUP pages and only linking to the console for platform
   settings, plus making our own header look like the console one (same logo, similar
   spacing/sidebar). Is there guidance (or a reference blocklet) for that?

---

## 2. Controlling the signed-in menus

### 2.a The AUP `user-menu` action hard-codes the platform entries

Our `wrapper.aup` declares our own entries:

```
app-header site-header variant=compact
  brand={title: ArcBlog, src: posts}
  actions=[
    {kind: theme-toggle, …},
    {kind: locale-switcher, …},
    {kind: user-menu, items=[
      {id: dashboard, label: :nav-dashboard, icon: "grid", exec: "dashboard"},
      {id: studio,    label: :nav-studio,    icon: "settings", exec: "admin"},
      {id: operations,label: :nav-operations,icon: "grid", exec: "operations"}]}]
  events={user-menu-item: {target: _root, set: {page: $args.exec}}}
```

Signed in, the menu shows **User Center**, **Admin Console**, then our three items, then
**Sign Out**. Reading the AUP runtime bundle shows the platform entries are built in, not
configurable:

```js
r1 = "/.well-known/service/user"
a1 = "/.well-known/service/admin"
n1 = "/.well-known/service/api/did/logout"
Wd = { en: {login, userCenter, signOut, adminConsole}, zh: {...}, ja: {...} }
```

and the item click contract we had to reverse-engineer is `user-menu-item` with
`$args.exec` — it is not in the DSL docs we could find.

![Signed-in user menu](https://raw.githubusercontent.com/shenxiuqiang/ArcBlog/main/docs/issues/assets/02-aup-user-menu-items.png)

The three items we contribute (仪表盘 / 工作室 / 运维) always come **after** the platform's
User Center and Admin Console — we can only append.

**Questions**

1. Is there a documented schema for the `user-menu` action (props, ordering, icons, i18n,
   permission/role gating, per-item `visible`)? We only found `items` by inspection.
2. Can a blocklet **hide, reorder or replace** the built-in User Center / Admin Console /
   Sign Out entries (e.g. a `platformItems: false` / `items[].order` prop), or append only?
   Right now our three items always trail the platform ones.
3. Can a blocklet declare menu entries **once** so they appear both in the AUP header and in
   the console sidebar?

### 2.b The service console menu is fixed and has no blocklet extension point

Console nav (`/.well-known/service/admin#members`), read from the live DOM:

```
Profile | Members | Invitations | Audit Logs | Access Keys | Access Control | Branding | Appearance | Auth
```

`blocklet.yaml` (specVersion 2) exposes only `sites`, `scope`, `networkRead`, `replicated`
(plus metadata) — we found no `menu` / `navigation` / `admin` / `console` key, and the
console is a separate server-rendered app.

**Questions**

1. Is there a supported way for a blocklet to contribute pages/menu entries to the service
   console (and if so, the manifest + AUP contract)? For example to put our own
   "Dashboard / Studio / Operations" pages in the console sidebar next to `Members`/`Branding`.
2. If it is not supported yet, is it on the roadmap? We would rather not ship a parallel
   in-app console if a first-class extension point is planned.

---

## 3. Other issues we hit (happy to file separately)

1. **`app-header` brand fields are undocumented and fail late.** `logo` is the image field,
   `src` is the **click target**. With `brand={title: X, src: posts}` and no
   `events={nav-click: …}` handler, every click raises a toast
   `Node 'site-header' has no 'nav-click' event` and never navigates. A missing handler for a
   runtime-emitted event seems like something a `dsl lint`/`validate` could catch.
2. **`frame` sandbox silently blocks same-tab navigation.** The primitive adds
   `sandbox="allow-scripts allow-forms allow-popups allow-same-origin"` by default, so a
   component's `target="_parent"` link does nothing (no console error in our case). We fixed it
   with `sandbox="allow-top-navigation-by-user-activation"` (the runtime appends valid tokens to
   its base list) — worth documenting the string form and the token allowlist.
3. **`frame` sizing.** There is no `style` prop (a `style` we passed was dropped by the safe-style
   allowlist and the iframe stayed at its 200 px default), and `autoHeight` did not take effect
   (the child reported 900 px, the iframe stayed 200 px). `aspectRatio="16 / 7"` works. Please
   document which sizing props are supported.
4. **No way to serve a static asset to the web route.** A root-relative `<script src="/assets/x.js">`
   is swallowed by the AUP handler (it returns the app shell), and files placed in a
   `pages/<name>/` directory are not served either. We had to inline ~28 KB of vendored JS into
   the component's `script.js`. Is there a supported static-asset location for `pages/**`?
5. **`afs-list` filters silently drop records (most user-visible for us).** `filter={field: "content.status", match: published}` and `serverFilters` (chips) push a `where` down to
   `/.actions/query`, and that query only sees **indexed** records. Measured on one instance:

   | record | how it was written | found by `where` |
   |---|---|---|
   | fresh record, small body | `publish` (new path) | ✅ |
   | record edited afterwards | `publish --update` | ❌ (delete+rewrite, content change, `/modules/index` `index`/`reindex`/`cleanup` all did not restore it) |
   | body ≈ 800 B | new path | ✅ |
   | body ≈ 2.5 KB | new path | ❌ |
   | body ≈ 3.7 KB (a normal post) | seeded/edited | ❌ |

   Effect: a published post simply disappears from any filtered list (our home feed looked
   empty), while it still renders in unfiltered lists. `/modules/index/.actions/verify` reported
   480 entries, 477 `stale`. Questions: is the `where` pushdown supposed to cover edited
   records? Is there a supported "reindex this path" call? And is a content-size limit on the
   index intended/documented?
6. **`visible` with async `propBind` data.** `visible="$state.post.coverImage"` never becomes
   true after the record loads (the element is absent from the DOM entirely), while
   `visible="${state.post.coverImage}"` works. The expression form evaluates once and never
   recovers — this cost us a cover image that never appeared.
7. **`afs-list` row children are stretched.** Row item children behave like `flex: 1 1 0%`
   (computed `flex: 1 0 0%` with our `flex-shrink: 0`), so a fixed-size thumbnail had to set
   `flexGrow: 0` + `flexBasis` explicitly. `autoSelect=false` was needed to stop the first row
   rendering as selected. Both are undocumented.
8. **`window.afs.tryList` returns metadata only.** `tryList(path, {includeContent: true})` is
   required to get record bodies (the AUP list does this internally); plain `tryList` returns
   no `content` field. Worth documenting, since component code has no other way to read AFS.
9. **DID Connect login from a local instance is phone-hostile.** The QR encodes
   `https://abtwallet.io/i/?action=requestAuth&url=http://arcblog.localhost:4939/.well-known/service/api/did/login/auth?_t_=…`
   — the auth URL is absolute and derived from the request host, so a phone can never reach a
   `*.localhost` daemon (it also only binds `127.0.0.1` by default). The desktop path works via
   the extension (`window.ABT.open(...)`, branch 2 in the login bundle). Please document the
   supported desktop login flows, and ideally that the daemon can bind/serve a LAN hostname so
   the QR flow is usable from a phone.

---

## What we would like back

1. A pointer to the supported contract/extension point for **console navigation** (2.b) and for
   the **`user-menu` schema** (2.a) — or confirmation that neither exists yet.
2. Guidance on **one header** (1): supported pattern, or "not supported, do X instead".
3. Short answers on which of the items in §3 are intended behaviour vs bugs — we will file them
   as separate issues if you prefer them tracked individually.

We can provide a minimal reproduction for any item (our app is a public blocklet layout, but all
of the above reproduce from the DSL snippets quoted here) and we are happy to test a patched
`arc` build.
