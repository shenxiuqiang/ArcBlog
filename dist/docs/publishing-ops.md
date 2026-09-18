# ArcBlog Publishing Operations (Iteration 1)

This runbook provides executable lifecycle operations using AFS + `arc` CLI while UI action hooks are being finalized.

## Prerequisites

- ARC daemon running
- Current shell has access to the target instance (default or `--instance <name>`)
- DID Wallet session established when required by runtime policy

## Script

- Path: `scripts/arcblog-lifecycle.mjs`
- Runtime: Node.js >= 18

## Commands

### 1) Validate pre-publish payload (no write)

```bash
node scripts/arcblog-lifecycle.mjs validate \
  --title "My First Post" \
  --body-file ./post.md
```

Checks:
- title required
- slug normalization/availability candidate
- markdown safety guard (rejects `<script>`, `on*=`, `javascript:`, `<iframe>`)

Compose UI now includes metadata blocks for:
- `category`, `tags`
- `seoTitle`, `seoDescription`
- `ogTitle`, `ogDescription`, `ogImage`

### 2) Save draft (private user space)

```bash
node scripts/arcblog-lifecycle.mjs draft \
  --title "My First Post" \
  --author-did did:key:z... \
  --author-name "Alice" \
  --body-file ./post.md \
  --tags technology,identity \
  --category technology
```

Writes to:
- `/blocklets/arcblog/users/<did>/drafts/<slug>.json`

If your current runtime context cannot write to `users/<did>`, the script returns:
- `code=USER_SPACE_UNAVAILABLE`

### 3) Publish post (instance posts)

```bash
node scripts/arcblog-lifecycle.mjs publish \
  --title "My First Post" \
  --author-did did:key:z... \
  --author-name "Alice" \
  --body-file ./post.md
```

Writes to:
- `/blocklets/arcblog/instance/posts/<slug>.json`

If slug exists, use optimistic overwrite:

```bash
node scripts/arcblog-lifecycle.mjs publish \
  --slug my-first-post \
  --update \
  --author-did did:key:z... \
  --body-file ./post.md
```

### 4) Archive / Republish / Soft delete

```bash
node scripts/arcblog-lifecycle.mjs archive --slug my-first-post
node scripts/arcblog-lifecycle.mjs republish --slug my-first-post
node scripts/arcblog-lifecycle.mjs delete --slug my-first-post
```

State transitions enforced:
- `published -> archived`
- `archived -> published`
- `draft|archived -> deleted`

### 5) Query posts by lifecycle status

```bash
node scripts/arcblog-query-posts.mjs published
node scripts/arcblog-query-posts.mjs archived
node scripts/arcblog-query-posts.mjs deleted
node scripts/arcblog-query-posts.mjs --limit 50
```

Notes:
- Tries standard `/.actions/query` first.
- Falls back to `arc afs ls` + `arc afs read` when provider/module is unavailable.

### 6) Operability filters (Iteration 2)

```bash
node scripts/arcblog-query-posts.mjs published --category technology
node scripts/arcblog-query-posts.mjs published --tag identity
node scripts/arcblog-lifecycle.mjs publish \
  --title "My First Post" \
  --author-did did:key:z... \
  --author-name "Alice" \
  --body-file ./post.md \
  --category technology \
  --tags technology,identity \
  --seo-title "My First Post | ArcBlog" \
  --seo-description "A short search description" \
  --og-title "My First Post" \
  --og-description "Share preview copy" \
  --og-image "https://.../cover.png"
```

Public feed (posts page) also includes category/tag filter inputs for reader-side narrowing.

### 7) Audit trail helper (Iteration 3)

```bash
node scripts/arcblog-audit.mjs log --action publish --slug my-post --actor did:key:z... --detail "version=1"
node scripts/arcblog-audit.mjs read --slug my-post
```

Notes:
- `arcblog-lifecycle.mjs` emits best-effort audit events for publish/archive/republish/delete.
- Audit write failures do not block the primary lifecycle operation.

### 8) Run tests

```bash
npm test
```

Covers:
- lifecycle validation
- query helper filtering behavior
- audit helper write/read roundtrip
- RSS generation smoke tests

### 9) Generate RSS feed (Iteration 4)

```bash
node scripts/arcblog-rss.mjs \
  --feed-title "ArcBlog" \
  --feed-link "https://blog.example.com" \
  --feed-description "DID-native Markdown publishing" \
  --limit 20
```

If you want a persistent feed artifact, redirect stdout:

```bash
node scripts/arcblog-rss.mjs --feed-link "https://blog.example.com" > dist/rss.xml
```

Notes:
- Feed includes only `status=published` posts.
- Item title/description use SEO/OG fallback chain.

### 10) Content operations report (Iteration 4)

```bash
node scripts/arcblog-daily-report.mjs --limit 100
```

Outputs aggregate counts by:
- status
- category
- tag

## Concurrency

All updates are guarded by AFS `ifMatch` token from prior read to reduce accidental overwrites.

## Notes

- This script is a lifecycle guardrail and operational fallback.
- Public reader queries should filter `status=published` (and/or `published=true`).
