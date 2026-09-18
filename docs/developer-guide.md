# ArcBlog Developer Guide

## Repo layout (current)

- `blocklet.yaml` — Blocklet metadata
- `world/post.yaml` — Post record schema
- `.aup/` — app shell + pages + man docs
- `.web/` — public web surface components/themes
- `scripts/` — operational Node.js helpers + tests
- `docs/` — product/ops/dev docs
- `dist/` — synchronized build artifacts

## Key flows

### Authoring flow
- DID Connect session gates write operations
- Drafts target user DID space
- Publishing writes validated metadata to instance posts path

### Content lifecycle
Allowed transitions:
- `draft -> published`
- `published -> archived`
- `archived -> published`
- `draft|archived -> deleted` (soft delete)

### Validation rules
- Required: `title`, `slug` (normalized), `author-did`
- `category` whitelist: `technology|design|life`
- `tags` normalized lowercase underscore tokens, max 10
- `coverImage` / `ogImage` must be http(s)

## Scripts

- `scripts/arcblog-lifecycle.mjs` — publish/draft/archive/republish/delete
- `scripts/arcblog-query-posts.mjs` — status/category/tag listing
- `scripts/arcblog-audit.mjs` — audit append/read
- `scripts/arcblog-rss.mjs` — RSS feed generation
- `scripts/arcblog-daily-report.mjs` — aggregate operations summary

## Testing

```bash
npm test
```

Current suite covers:
- lifecycle validation
- query filtering
- audit roundtrip
- RSS output
- daily report aggregation

## Documentation map

- `docs/product-summary.md` — what ArcBlog is
- `docs/operations-runbook.md` — operator workflows
- `docs/publishing-ops.md` — detailed publish/query/audit/rss commands
- `docs/error-codes.md` — structured failure codes
- `docs/share-cards.md` — OG/SEO usage
- `docs/release-checklist.md` — release gates
- `docs/roadmap.md` — iteration history and plans
