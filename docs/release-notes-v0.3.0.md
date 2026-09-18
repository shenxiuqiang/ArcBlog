# Release Notes v0.3.0

## Overview
This release productizes ArcBlog into a more mature publishing Blocklet with lifecycle governance, operational tooling, quality gates, and growth utilities.

## Added

### Publishing lifecycle and operations
- Lifecycle script: `scripts/arcblog-lifecycle.mjs`
  - `validate`, `draft`, `publish`, `archive`, `republish`, `delete`
  - slug normalization and conflict handling
  - optimistic concurrency via `ifMatch`
  - structured error codes

### Content operability
- Query helper: `scripts/arcblog-query-posts.mjs`
  - filters by `status`, `category`, `tag`
  - fallback listing mode when provider query is unavailable

### Reliability and security
- Stricter validation:
  - category whitelist (`technology|design|life`)
  - tag normalization and cap
  - http(s) URL checks for cover/OG image fields
- Audit helper: `scripts/arcblog-audit.mjs`
- Best-effort audit events for publish/archive/republish/delete

### Growth
- RSS generator: `scripts/arcblog-rss.mjs`
- Daily report: `scripts/arcblog-daily-report.mjs`
- Share card guide: `docs/share-cards.md`

### Product documentation
- `docs/product-summary.md`
- `docs/operations-runbook.md`
- `docs/developer-guide.md`
- `docs/publishing-ops.md`
- `docs/error-codes.md`
- `docs/release-checklist.md`
- `docs/roadmap.md`
- `README.md`

### Testing
- Node test suite for lifecycle/query/audit/rss/daily-report helpers
- `npm test` entrypoint
- Current suite: 15 passing tests

## Notes
- Public reading surface should only render `status=published` records.
- Markdown rendering should remain sanitize-first at read time.
