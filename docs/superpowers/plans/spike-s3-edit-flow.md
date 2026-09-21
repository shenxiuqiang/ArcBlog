# Spike S3: Edit flow for existing drafts — experiment record and decision

Date: 2026-09-21
Task: P1 S3 — compose 编辑模式(预填)方案定型 + 实现
Status: DECIDED — mode B′ implemented

## Goal

Let an author open an existing draft/archived record in the compose-shaped
editor with every field pre-filled, save it back without resetting
`createdAt`, and publish it from the same surface — without touching the
proven new-post compose write path.

## Spike experiments

Live spike experiments were planned (A/B/C below) but judged infeasible to
run headless: AUP pages are a client-rendered SPA with no SSR. Verified by
curl probe on 2026-09-21: the reader route (`/posts/<slug>`) returns a ~10KB
SPA shell identical for every slug — no server-rendered evidence channel
exists, and `$args` / `$state` values only materialize inside a browser
session with the AUP runtime active. Only a browser + DID Wallet walkthrough
can verify runtime behavior; that is deferred to a later manual checklist.

### Experiment A — query-args reachability (`$args.slug` on the compose page)

- Design: debug card `p "slug=[$args.slug]"` on compose, visit
  `/?page=compose&slug=<known-draft>`; then `propBind` on `$args.slug`.
- Outcome: ABANDONED without runtime observation. No SSR means the curl
  probe cannot observe injection, and there is no documented channel where
  `$args` reaches a page's `propBind`. Evidence value was zero beyond what a
  browser walkthrough (deferred) can give directly on the chosen mode.

### Experiment B — propBind-driven form initial values

- Design: bind the compose view with
  `propBind={post: "/instance/app/arcblog/drafts/$args.slug.json"}` (later
  `$params.slug`) and set one input's `state={value: "${state.post.title}"}`.
- Outcome: UNVERIFIABLE headless. The two-channel pattern it relies on
  (sites-binding `$params.slug` → server-side `propBind` → client-side
  `${state.post.*}`) is already proven end-to-end by the reader page
  (`/posts/{slug}`) and the draft preview page (`/preview/{slug}`), but
  whether form inputs honor template initial values is a runtime behavior
  only a browser can confirm.

### Experiment C — cross-page event staging (hero-quickadd pattern)

- Design: preview page "Edit" action fires click events that
  `set: {state: {value: ...}}` on hidden inputs in the compose page, one per
  field, then navigates.
- Outcome: ABANDONED. Every proven event binding in the codebase is
  same-page (hero quickadd stages within the admin page). Cross-page
  select/click events are documented in the repo conventions as unreliable
  (select-event exec merges payload over args; `navigate` on select is
  inert). Zero evidence a cross-page set survives SPA navigation, and the
  staging form would degrade the compose page for new-post authoring.

## Decision: mode B′ — dedicated edit page + `/edit/{slug}` binding

Instead of bending the compose page into dual mode, add a fourth sites
binding and a dedicated `compose-edit` page:

- `blocklet.yaml`: `draft-edit` binding, `path: "/edit/{slug}"`,
  `afs: "/instance/app/arcblog/drafts/{slug}.json"`, `page: compose-edit` —
  the exact same channel reader/preview already prove (`$params.slug` →
  `propBind` → `${state.post.*}`).
- `.aup/app.aup`: new `compose-edit` page modeled on the compose form; every
  input's initial `state.value` is bound from `${state.post.*}`; a
  not-found card (visible when `$state.post.title` is empty) with a back
  link guards unknown slugs; the same `$session.authenticated` gate as
  compose; an "Editing / 编辑中" cue shows the current slug.
- Save exec writes the drafts path preserving `createdAt` and `version`,
  bumping `updatedAt`; publish exec writes the posts path with
  `status: published`, fresh `publishedAt`, preserved `createdAt`/`version`.
- Edit entries: view-href links (never select-event navigate, per repo
  convention) on the preview page and on each studio-drafts row in admin.
- The compose page's form and both of its execs are untouched — zero
  regression surface on the core write path.

Why B′ over in-place compose edit: the `$params` binding channel is the only
one with end-to-end proof; a separate page needs no fallback hacks in the
new-post path; and the not-found/gate states compose cleanly around a
record-bound view.

## Runtime-pending list (verify in the manual browser + wallet walkthrough)

1. **Form input template initial values** — whether
   `state={value: "${state.post.*}"}` pre-fills the inputs when the bound
   record arrives. Degradation if unsupported: the page, gate, cue and
   not-found guard still render; the form renders empty (no corruption —
   nothing is written until the user fills fields and clicks save).
2. **`${state.post.*}` interpolation inside exec args content** — whether
   `createdAt: "${state.post.createdAt}"` and
   `version: "${state.post.version}"` resolve at exec time. Degradation if
   unsupported: the write falls back to empty/placeholder values or fails
   validation; no existing record is silently corrupted beyond the
   same-slug overwrite semantics the form already documents. (If this fails,
   the follow-up is staging `createdAt`/`version` into hidden inputs like
   the hero-quickadd pattern, same-page.)
3. **Slug input read-only** — no evidence the DSL input component supports a
   read-only/disabled state, so the slug field is left editable (changing it
   writes a new record under the new slug, same as compose overwrite
   semantics). Read-only slug is a candidate follow-up once the runtime
   behavior is confirmed.

## Explicit non-goals (deferred, documented here)

- **Optimistic concurrency on the UI path is NOT implemented.** `version` is
  preserved as-is from the bound record (no bump, no ifMatch guard). A
  same-record concurrent write can be silently overwritten, same as the
  existing compose form. Version bumping / ifMatch is a P4+ concern.
- **Published posts have no Edit entry** — the edit page reads the drafts
  directory; published records live under posts/. Republish of archived
  records works because archived records stay in drafts/.
