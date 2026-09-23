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

## Taxonomy and node profile

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

## Growth operations

### Generate RSS
```bash
node scripts/arcblog-rss.mjs \
  --feed-title "ArcBlog" \
  --feed-link "https://blog.example.com" \
  --feed-description "DID-native Markdown publishing" \
  --limit 20
```

Persist artifact:
```bash
node scripts/arcblog-rss.mjs --feed-link "https://blog.example.com" > dist/rss.xml
```

## Incident response quick checks

- If publish fails with `VALIDATION`: inspect title/category/tags/URLs/body safety
- If publish fails with `CONFLICT`: use `--update` intentionally
- If lifecycle mutation fails with `INVALID_TRANSITION`: inspect current `status`
- If draft write fails with `USER_SPACE_UNAVAILABLE`: confirm wallet/session context
