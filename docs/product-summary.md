# ArcBlog Product Summary

ArcBlog is a DID-native, Markdown-first publishing Blocklet.

## What it is
- A wallet-authenticated writing and reading product built on Arc/Blocklet runtime
- DID Connect session is the author boundary
- Posts are stored as structured records in AFS-backed scopes
- Public reading surface only exposes `status=published` content

## Core capabilities

### Authoring
- Markdown-first editor flow
- Draft → publish → archive → republish → soft delete lifecycle
- Category + tags + SEO/OG metadata support
- Media upload path aligned with DID user space

### Operations
- Lifecycle guardrails with optimistic concurrency
- Audit trail for publish/archive/republish/delete events
- Structured validation and error codes
- Query/report helpers for status/category/tag segmentation

### Growth
- RSS generation for published posts
- Share-card metadata guidance (OG/SEO fields)
- Content operations daily report

## Product principles
- Identity-first: author identity is DID-derived
- Safety-first: sanitize at render, validate before write
- Operability-first: every content state should be queryable and auditable

## Current quality gate
- `arc dsl validate --json` must pass
- `npm test` must pass (current suite: 15 tests)
