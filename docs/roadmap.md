# ArcBlog Product Roadmap

## Iteration 1 (current): Publishing lifecycle hardening

### Goals
- Lifecycle state model: `draft -> published -> archived -> deleted(soft)`
- Publish preflight: required title, unique slug, sanitized markdown rendering
- Studio UX copy aligned with lifecycle and moderation intent

### Delivered in this iteration
- Updated post schema in `world/post.yaml` with lifecycle/status metadata
- Updated persistence contract in `docs/persistence.md`
- Updated writer/admin/read surface copy in `.aup/app.aup` + `.aup/pages/*.json`
- Added compose man page: `.aup/man/compose.yaml`
- Added executable lifecycle helper: `scripts/arcblog-lifecycle.mjs`
- Added operations runbook: `docs/publishing-ops.md`
- Added lifecycle status query helper: `scripts/arcblog-query-posts.mjs`
- Added reader man page: `.aup/man/reader.yaml`

### Exit criteria
- Post records carry status and lifecycle timestamps
- Public list only includes `status=published`
- Authoring flows document optimistic concurrency + slug conflict behavior

## Iteration 2: Operability
- Category/tag editing and filtering
- SEO metadata and social preview fields
- Better author dashboard segmentation (draft/published/archived)

### Delivered in Iteration 2 (first pass)
- Post schema extended with `seoTitle`, `seoDescription`, `ogTitle`, `ogDescription`, `ogImage`
- Query helper supports `--category` and `--tag` filters
- Compose/admin copy updated for operability guidance

### Delivered in Iteration 2 (second pass)
- Compose page adds metadata + SEO/OG input blocks
- Admin page adds status/category/tag filter input blocks
- Man pages updated to reflect form-driven operability workflow

### Delivered in Iteration 2 (third pass)
- Posts public page adds category/tag filter inputs for reader-side discovery

## Iteration 3: Reliability and security
- Structured validation errors and user-facing messages
- Tests for write rules and state transitions
- Audit log views for publish/archive/delete actions

### Delivered in Iteration 3 (first pass)
- `arcblog-lifecycle.mjs` adds stricter publish/draft validation:
  - category whitelist (`technology|design|life`)
  - tag normalization + max 10 tags
  - http(s) URL validation for cover/OG image fields
- Added audit helper script: `scripts/arcblog-audit.mjs`
- Lifecycle publish/archive/republish/delete now emits audit events (best-effort)
- Added initial unit tests: `scripts/arcblog-lifecycle.test.mjs` (node:test, 5 passing)

### Delivered in Iteration 3 (second pass)
- Added tests for query helper and audit helper
- Added top-level `package.json` with `npm test`
- Current test suite: 12 passing tests

## Iteration 4: Growth
- RSS + share cards
- Optional comments/subscription flow
- AI-assisted title/summary/tag helpers

### Delivered in Iteration 4 (first pass)
- Added RSS generator script: `scripts/arcblog-rss.mjs`
- Added RSS generator tests: `scripts/arcblog-rss.test.mjs`
- Added share card metadata guide: `docs/share-cards.md`

### Delivered in Iteration 4 (second pass)
- Posts page adds RSS subscription entry
- Reader page adds share-this-article action entry
- Added content operations report script: `scripts/arcblog-daily-report.mjs`
- Added daily report test: `scripts/arcblog-daily-report.test.mjs`

### Delivered in Iteration 4 (third pass)
- About page adds roadmap and release checklist links
- Admin page adds daily report guide entry
- RSS runbook includes command to export `dist/rss.xml`
- Added About man page: `.aup/man/about.yaml`

### Delivered in Iteration 4 (fourth pass / productization wrap)
- Added `docs/product-summary.md`
- Added `docs/operations-runbook.md`
- Added `docs/developer-guide.md`
- About page now links product summary, ops runbook, and developer guide
