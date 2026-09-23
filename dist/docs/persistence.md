# ArcBlog persistence and identity contract

ArcBlog uses the Blocklet-scoped DID Spaces mounted by Arc. It does not use browser local storage or a separate database.

## Identity and session

The compose/admin pages gate on the AUP `$session` context: unauthenticated visitors see a sign-in card (`/.well-known/service/login`), while the editor and media drop zone render only when `$session.authenticated` is true. The active DID is the sole server-side author identity; clients must never submit or override `authorDid`.

Arc exposes the following scoped paths for this Blocklet:

- `/blocklets/arcblog/instance/members` — read-only DID Connect membership projection.
- `/instance/app/arcblog/posts/<slug>.json` — published post records only, guest-readable via the `networkRead` declaration in `blocklet.yaml` so the public feed renders without a session.
- `/instance/app/arcblog/drafts/<slug>.json` — draft, archived, and soft-deleted records; private (`networkRead` grant limited to `role: admin` for the studio). Anonymous reads are denied.
- `/instance/app/arcblog/heroes/<id>.json` — homepage carousel records `{title, description, image, url, sort, createdAt}`; guest-readable (rendered without a session), writable by admins (replicated collection, `minRole: admin`). Managed from the studio's Hero section.
- `/instance/app/arcblog/node/profile.json` — the node's public profile (`name`, `description`, `avatar`, `did`, `endpoint`, `roles`, `capabilities`, `version`, `protocolVersion`, timestamps); guest-readable, admin-writable. Managed by `scripts/arcblog-node.mjs`; `roles` are `basic | studio | hub` and `capabilities` derive from them (spec §7 / §11).
- `/instance/app/arcblog/node/identity.json` — who this node is (`did`, `authMethod` ∈ `developer | provider | blocklet | did-connect`, `caller`, `blockletDid`, timestamps); same visibility as the profile. Managed by `scripts/arcblog-node.mjs identity init|show|check`.
- `/instance/app/arcblog/categories/<slug>.json` — the category taxonomy `{slug, name, description, sort, createdAt, updatedAt}`; guest-readable, admin-writable. Managed by `scripts/arcblog-category.mjs`. The lifecycle validator reads this resource and falls back to the built-in `technology|design|life` while it is empty.
- `/instance/app/arcblog/media/<id>.json` — upload index `{id, title, alt, path, mimeType, size, width, height, uploaderDid, createdAt, updatedAt}`; **admin-only** (the index exposes upload paths). Managed by `scripts/arcblog-media.mjs`; removing a record never deletes the binary.
- `/instance/app/arcblog/config/roles.json` — externalized role configuration (`studio`/`hub` collection address, network, asset type) plus the `chainVerification` switch; guest-readable, admin-writable. Managed by `scripts/arcblog-roles.mjs`. Collection addresses are **never** hard-coded (spec §9), and a role only becomes `active` once something verified it (fail closed, spec §114/§115).
- `/instance/app/arcblog/economy/policies/active.json` — the versioned settlement policy (`version`, `creator`/`hub`/`protocol` fractions, `paymentAdapter`); guest-readable (spec §50 transparency), admin-writable. Managed by `scripts/arcblog-economy.mjs policy`.
- `/instance/app/arcblog/economy/products/<id>.json` — Product records (spec §41); guest-readable, admin-writable.
- `/instance/app/arcblog/economy/orders/<id>.json` — Order records (spec §42): payment state only, **admin-only** (they name buyers).
- `/instance/app/arcblog/economy/settlements/<orderId>.json` — Settlement records (spec §43); admin-only. Written once per order; re-settling is a no-op.
- `/instance/app/arcblog/economy/ledger/<orderId>:<type>.json` — append-only ledger entries (spec §91/§92); admin-only. Deterministic ids (`<orderId>:creator_share`) make retries idempotent instead of double-posting.
- `/blocklets/arcblog/instance/audits/<slug>.audit.jsonl` — blocklet-private audit trail (owner/operator access only).
- `/blocklets/arcblog/users/<did>/media/<id>` — per-wallet uploaded media.

The runtime resolves `/instance/app/arcblog`, `/blocklets/arcblog/instance` and `/blocklets/arcblog/users/<did>` to DID Space storage. They are durable per instance/user scopes, unlike the session subtree.

For a production node, set `AFS_DID_SPACE_SCOPE_SECRET` before starting Arc. The local runtime correctly warned that the secret is currently unset, which leaves scope directory names de-identification-disabled. Do not set `AFS_DID_SPACE_REQUIRE_DEID=true` until the scope secret has been configured.

## Write rules

1. Any draft/publish/archive/delete operation requires an active DID Connect session.
2. The server derives `authorDid` and author profile from that session; it ignores client-provided author fields.
3. The post document uses the fields declared in `world/post.yaml`; `body` remains Markdown at rest and must be sanitized at render time.
3.1 Metadata operability fields (`category`, `tags`, `seoTitle`, `seoDescription`, `ogTitle`, `ogDescription`, `ogImage`) are stored alongside content records.
4. Slug must be normalized and unique per instance path (`/instance/app/arcblog/posts/<slug>.json`). Publish/create must fail fast on conflict.
5. Edits use AFS `ifMatch` optimistic concurrency tokens to prevent silent overwrites.
6. Drafts are written to the private instance directory (`/instance/app/arcblog/drafts/`). Publishing moves the record into the public `posts` directory; archiving moves it back.
7. Lifecycle state transitions are explicit (and move the record file between directories):
   - `draft -> published` (drafts/ → posts/)
   - `published -> archived` (posts/ → drafts/)
   - `archived -> published` (republish; drafts/ → posts/)
   - `draft|archived -> deleted` (soft delete in place, stays private)
8. Readers list only records where `status: "published"` and `published: true`; authors may edit only records whose `authorDid` equals their active DID. The `/preview/<slug>` binding renders records from the private directory for signed-in operators; anonymous visitors always get not-found there.

## AFS calls

The authenticated Blocklet runtime calls its AFS endpoint with `{ "method": "write" | "read" | "list" | "exec", "params": { ... } }`. For example, a publish operation writes JSON to `/instance/app/arcblog/posts/<slug>.json`; listing uses the instance path with a `status=published` (and/or `published=true`) predicate through the standard query action.

The AFS action contract is discoverable at runtime:

```sh
arc afs explain /blocklets/arcblog/instance/.actions/write --instance default
arc afs explain /blocklets/arcblog/instance/.actions/query --instance default
```

## Verifying the space

```sh
arc space list --json     # { groups: [{ role, apps: [{ did, fileCount, totalSize }] }] }
arc space check --json    # { layouts, freshness }; non-zero exit when migration/drift is found
node scripts/arcblog-doctor.mjs   # space-layout / space-app / de-identification checks
```

`arc space check` covers layout (`files` vs CAS) and index-vs-disk freshness; both
commands keep stdout pure JSON and log to stderr.
