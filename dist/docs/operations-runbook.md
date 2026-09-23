# ArcBlog Operations Runbook

Audience: operators maintaining ArcBlog in dev/staging/prod.

## Daily checks

### 1) Validate DSL integrity
```bash
arc dsl validate --json
```
Expected: `ok: true`

### 2) Run automated tests
```bash
npm test
```
Expected: all tests passing

### 3) Inspect lifecycle distribution
```bash
node scripts/arcblog-daily-report.mjs --limit 100
```

### 4) Instance contract check
```bash
node scripts/arcblog-doctor.mjs
```
Expected: `ok: true` (exit 0). It checks the spec §12 resource directories, the
node profile and identity records, the category taxonomy, the DID Space layout
and this blocklet's space entry, and reports warnings for records whose
`authorDid` is empty and for an unset `AFS_DID_SPACE_SCOPE_SECRET` (see
CLAUDE.md / developer-guide for why UI-created records can lack attribution).

## Content operations

### Publish
```bash
node scripts/arcblog-lifecycle.mjs publish \
  --title "Post Title" \
  --author-did did:key:z... \
  --author-name "Author Name" \
  --body-file ./post.md \
  --category technology \
  --tags "identity,product" \
  --cover-image "https://cdn.example.com/cover.jpg"
```

### Archive / republish / delete
```bash
node scripts/arcblog-lifecycle.mjs archive --slug post-title
node scripts/arcblog-lifecycle.mjs republish --slug post-title
node scripts/arcblog-lifecycle.mjs delete --slug post-title
```

### Query by filters
```bash
node scripts/arcblog-query-posts.mjs published --category technology
node scripts/arcblog-query-posts.mjs published --tag identity
```

### Audit trail
```bash
node scripts/arcblog-audit.mjs read --slug post-title
```

## Taxonomy, media and node profile
### Categories
```bash
node scripts/arcblog-category.mjs seed                 # install technology/design/life (idempotent)
node scripts/arcblog-category.mjs list
node scripts/arcblog-category.mjs add --slug review --name Review --sort 40
node scripts/arcblog-category.mjs remove --slug review
```
`arcblog-lifecycle.mjs` validates `--category` against this resource (it falls back
to the built-in `technology|design|life` while the resource is empty).

### Node profile
```bash
node scripts/arcblog-node.mjs init        # derive from blocklet.yaml (roles: basic)
node scripts/arcblog-node.mjs show
node scripts/arcblog-node.mjs set --roles studio   # capabilities re-derive from the role
node scripts/arcblog-node.mjs check
```

### Node identity
```bash
node scripts/arcblog-node.mjs identity init --auth-method blocklet   # DID defaults to the profile's
node scripts/arcblog-node.mjs identity show
node scripts/arcblog-node.mjs identity check
```
`authMethod` is one of `developer | provider | blocklet | did-connect`.

### Media index
```bash
node scripts/arcblog-media.mjs add --path /blocklets/arcblog/users/<did>/media/cover.png \
  --title "Cover" --alt "Cover art" --mime image/png --width 1200 --height 630
node scripts/arcblog-media.mjs list
node scripts/arcblog-media.mjs show --id cover
node scripts/arcblog-media.mjs remove --id cover
```
The id defaults to the file basename (`cover.png` → `cover`). Records index the
binary; removing a record never deletes the file.

### Roles and capabilities
```bash
ARCBLOG_NETWORK=arcblock ARCBLOG_STUDIO_COLLECTION=0x... ARCBLOG_HUB_COLLECTION=0x... \
  node scripts/arcblog-roles.mjs init
node scripts/arcblog-roles.mjs show          # externalized config (spec §9)
node scripts/arcblog-roles.mjs status        # RoleStatus per role (spec §10)
node scripts/arcblog-roles.mjs capabilities  # declared vs effective (spec §11)
```
Capabilities are **withheld until a role is verified**: while `chainVerification`
is false, `studio.*` and `hub.*` never appear in the effective set, even if the
node profile declares those roles. Config comes from flags or
`ARCBLOG_STUDIO_COLLECTION` / `ARCBLOG_HUB_COLLECTION` / `ARCBLOG_NETWORK`.

## Growth operations

### Generate RSS
```bash
node scripts/arcblog-rss.mjs \
  --feed-title "ArcBlog" \
  --feed-link "https://blog.example.com" \
  --feed-description "DID-native Markdown publishing" \
  --limit 20
```

Publish the feed with the site (the platform cannot emit XML at request time, so
the feed is a **deploy-time snapshot**):
```bash
arc blocklet build
node scripts/arcblog-rss.mjs --feed-link "https://blog.example.com" > dist/.web-cache/rss.xml
arc blocklet instance deploy . --domain <domain>
```
It is then served at **`/p/rss.xml`** (web route). `/rss.xml` on the app root is
*not* the feed — the AUP handler returns the app shell for every path (see
`arc-contracts.md` §3.4). Rebuilding wipes `dist/.web-cache/rss.xml`, so always
generate after `build` and before `deploy`.

## Incident response quick checks

- If publish fails with `VALIDATION`: inspect title/category/tags/URLs/body safety
- If publish fails with `CONFLICT`: use `--update` intentionally
- If lifecycle mutation fails with `INVALID_TRANSITION`: inspect current `status`
- If draft write fails with `USER_SPACE_UNAVAILABLE`: confirm wallet/session context
