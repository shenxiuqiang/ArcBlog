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
- `docs/ArcBlog-product-technical-spec.md` — **authoritative product & technical spec (V2.0)**
- `docs/README.md` — documentation index
- `docs/developer-guide.md` — current implementation deep-dive
- `docs/persistence.md` — storage and identity contract
- `docs/operations-runbook.md` — operator workflows
- `docs/publishing-ops.md` — CLI reference
- `docs/error-codes.md` — structured failure codes
- `docs/share-cards.md` — OG/SEO usage
- `docs/release-notes-v0.3.0.md` — release history

## Quality gates
- `arc dsl validate --json` must pass
- `npm test` must pass
