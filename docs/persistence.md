# ArcBlog persistence and identity contract

ArcBlog uses the Blocklet-scoped DID Spaces mounted by Arc. It does not use browser local storage or a separate database.

## Identity and session

The compose/admin pages gate on the AUP `$session` context: unauthenticated visitors see a sign-in card (`/.well-known/service/login`), while the editor and media drop zone render only when `$session.authenticated` is true. The active DID is the sole server-side author identity; clients must never submit or override `authorDid`.

Arc exposes the following scoped paths for this Blocklet:

- `/blocklets/arcblog/instance/members` — read-only DID Connect membership projection.
- `/instance/app/arcblog/posts/<slug>.json` — published post records only, guest-readable via the `networkRead` declaration in `blocklet.yaml` so the public feed renders without a session.
- `/instance/app/arcblog/drafts/<slug>.json` — draft, archived, and soft-deleted records; private (`networkRead` grant limited to `role: admin` for the studio). Anonymous reads are denied.
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
