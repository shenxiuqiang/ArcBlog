# ArcBlog

ArcBlog is a DID-native, Markdown-first publishing Blocklet.

## Highlights
- DID Wallet identity as author boundary
- Post lifecycle: `draft -> published -> archived -> deleted(soft)`
- Category + tags + SEO/OG metadata support
- Audit trail for key lifecycle events
- RSS generation and share-card guidance
- Query/report helpers for content operations

## Quick start

### Validate AUP DSL
```bash
arc dsl validate --json
```

### Run tests
```bash
npm test
```

### Publish a post
```bash
node scripts/arcblog-lifecycle.mjs publish \
  --title "My First Post" \
  --author-did did:key:z... \
  --author-name "Alice" \
  --body-file ./post.md \
  --category technology \
  --tags "identity,product"
```

### Query posts
```bash
node scripts/arcblog-query-posts.mjs published --category technology
node scripts/arcblog-query-posts.mjs published --tag identity
```

### Generate RSS
```bash
node scripts/arcblog-rss.mjs --feed-link "https://blog.example.com"
```

## Documentation
- `docs/product-summary.md`
- `docs/operations-runbook.md`
- `docs/developer-guide.md`
- `docs/publishing-ops.md`
- `docs/error-codes.md`
- `docs/share-cards.md`
- `docs/release-checklist.md`
- `docs/roadmap.md`

## Quality gates
- `arc dsl validate --json` must pass
- `npm test` must pass
