# ArcBlog persistence and identity contract

ArcBlog uses the Blocklet-scoped DID Spaces mounted by Arc. It does not use browser local storage or a separate database.

## Identity and session

The `connection-gate` enclosing the writer is the DID Connect session boundary. A writer must approve the DID Wallet connection before the editor or media drop zone becomes available. The active DID is the sole server-side author identity; clients must never submit or override `authorDid`.

Arc exposes the following scoped paths for this Blocklet:

- `/blocklets/arcblog/instance/members` — read-only DID Connect membership projection.
- `/blocklets/arcblog/instance/posts/<slug>.json` — instance-level post records (`draft|published|archived|deleted` lifecycle).
- `/blocklets/arcblog/users/<did>/drafts/<slug>.json` — private, per-wallet drafts.
- `/blocklets/arcblog/users/<did>/media/<id>` — per-wallet uploaded media.

The runtime resolves `/blocklets/arcblog/instance` and `/blocklets/arcblog/users/<did>` to DID Space storage. They are durable per instance/user scopes, unlike the session subtree.

For a production node, set `AFS_DID_SPACE_SCOPE_SECRET` before starting Arc. The local runtime correctly warned that the secret is currently unset, which leaves scope directory names de-identification-disabled. Do not set `AFS_DID_SPACE_REQUIRE_DEID=true` until the scope secret has been configured.

## Write rules

1. Any draft/publish/archive/delete operation requires an active DID Connect session.
2. The server derives `authorDid` and author profile from that session; it ignores client-provided author fields.
3. The post document uses the fields declared in `world/post.yaml`; `body` remains Markdown at rest and must be sanitized at render time.
3.1 Metadata operability fields (`category`, `tags`, `seoTitle`, `seoDescription`, `ogTitle`, `ogDescription`, `ogImage`) are stored alongside content records.
4. Slug must be normalized and unique per instance path (`/instance/posts/<slug>.json`). Publish/create must fail fast on conflict.
5. Edits use AFS `ifMatch` optimistic concurrency tokens to prevent silent overwrites.
6. Drafts and uploads are written to the caller's user space first. Publishing copies validated metadata into the instance `posts` collection.
7. Lifecycle state transitions are explicit:
   - `draft -> published`
   - `published -> archived`
   - `archived -> published` (republish)
   - `draft|archived -> deleted` (soft delete)
8. Readers list only records where `status: "published"` and `published: true`; authors may edit only records whose `authorDid` equals their active DID.

## AFS calls

The authenticated Blocklet runtime calls its AFS endpoint with `{ "method": "write" | "read" | "list" | "exec", "params": { ... } }`. For example, a publish operation writes JSON to `/blocklets/arcblog/instance/posts/<slug>.json`; listing uses the instance path with a `status=published` (and/or `published=true`) predicate through the standard query action.

The AFS action contract is discoverable at runtime:

```sh
arc afs explain /blocklets/arcblog/instance/.actions/write --instance default
arc afs explain /blocklets/arcblog/instance/.actions/query --instance default
```
