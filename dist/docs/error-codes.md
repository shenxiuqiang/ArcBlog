# ArcBlog Lifecycle Error Codes

`scripts/arcblog-lifecycle.mjs` returns structured JSON errors:

```json
{ "ok": false, "code": "...", "error": "..." }
```

## Codes

- `VALIDATION`
  - Missing required fields (`title`, `slug`, `author-did`)
  - Markdown safety check failed (`<script>`, `on*=`, `javascript:`, `<iframe>`)

- `CONFLICT`
  - Publish slug collision when target already exists and `--update` is not provided

- `NOT_FOUND`
  - Status transition target does not exist

- `INVALID_TRANSITION`
  - Illegal lifecycle transition
  - e.g. `draft -> archived` (not allowed in instance post path)
  - Also returned by `scripts/arcblog-economy.mjs settle` when the order is not
    `paid` — payment and settlement are separate phases (spec §89)

- `USER_SPACE_UNAVAILABLE`
  - Runtime does not permit direct write to `/blocklets/arcblog/users/<did>/...` from current caller/session
  - Usually indicates missing DID-wallet-bound author context

- `RUNTIME_ERROR`
  - `arc` command execution failure or unexpected runtime issue

## Success format

```json
{ "ok": true, "action": "publish", "path": "...", "slug": "...", "status": "published" }
```
