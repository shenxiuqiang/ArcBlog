# ArcBlog Release Checklist (Iteration 1 baseline)

## Content lifecycle
- [ ] Draft creation stores in `/blocklets/arcblog/users/<did>/drafts`
- [ ] Publish writes to `/blocklets/arcblog/instance/posts/<slug>.json`
- [ ] Archive transition updates `status=archived`
- [ ] Soft delete sets `status=deleted` and `deletedAt`

## Validation and safety
- [ ] Title required before publish (`scripts/arcblog-lifecycle.mjs validate`)
- [ ] Slug normalized and uniqueness conflict handled (`publish` with collision block)
- [ ] Markdown render path sanitizes unsafe HTML/scripts (guard + renderer sanitize)
- [ ] Upload path enforces file type/size constraints
- [ ] Category constrained to whitelist (`technology|design|life`)
- [ ] Tags normalized and capped (max 10)
- [ ] Cover/OG image URLs restricted to http(s)

## Operability
- [ ] Category/tag persisted on publish/draft writes
- [ ] SEO fields persisted (title/description + OG overrides)
- [ ] Query helper supports `status`, `category`, and `tag` filters
- [ ] Compose page exposes metadata + SEO/OG input blocks
- [ ] Admin page exposes status/category/tag filter inputs
- [ ] Posts public page exposes category/tag filter inputs

## Authorization
- [ ] Active DID required for write operations
- [ ] `authorDid` derived server-side (client value ignored)
- [ ] Edit/delete restricted to owner DID

## Concurrency and consistency
- [ ] Update operations use `ifMatch`
- [ ] Conflict errors surfaced with retry guidance (`code=CONFLICT`)
- [ ] `updatedAt` and `version` increment on each successful write

## Error handling
- [ ] Structured error codes are documented in `docs/error-codes.md`
- [ ] Validation failures return actionable messages
- [ ] Unit tests exist for lifecycle/query/audit helpers (`npm test`)

## Read surface
- [ ] Public feed lists only `status=published`
- [ ] Draft/archived/deleted excluded from reader surface
- [ ] Markdown render pipeline applies sanitization before display

## Observability
- [ ] Publish/archive/delete events logged with actor DID and timestamp
- [ ] Failed publish validation includes reason code
- [ ] Audit helper supports append + read via `scripts/arcblog-audit.mjs`

## Growth
- [ ] RSS feed generation includes only `status=published`
- [ ] Share metadata fields follow fallback chain (`og*` → `seo*` → base fields)
- [ ] Public page includes RSS subscription entry
- [ ] Reader page includes share action entry
- [ ] Daily report aggregates status/category/tag counts
- [ ] About page exposes roadmap + release checklist links
- [ ] Admin page exposes daily report guide entry

## Productization
- [ ] Product summary doc exists (`docs/product-summary.md`)
- [ ] Operations runbook exists (`docs/operations-runbook.md`)
- [ ] Developer guide exists (`docs/developer-guide.md`)
