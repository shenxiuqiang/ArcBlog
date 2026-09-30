# ArcBlog Share Card Guide

ArcBlog uses post metadata to produce reader and social-share previews.

## Field precedence

- Share title: `ogTitle` → `seoTitle` → `title`
- Share description: `ogDescription` → `seoDescription` → `summary`
- Share image: `ogImage` → `coverImage`

## Recommended sizes

- OG image: 1200×630
- Format: JPG/PNG/WebP
- URL: HTTPS preferred

## Publishing command example

```bash
node scripts/arcblog-lifecycle.mjs publish \
  --title "My First Post" \
  --author-did did:key:z... \
  --author-name "Alice" \
  --body-file ./post.md \
  --summary "Short reader-facing summary" \
  --cover-image "https://cdn.example.com/cover.jpg" \
  --seo-title "My First Post | ArcBlog" \
  --seo-description "Search result description" \
  --og-title "My First Post" \
  --og-description "Share preview copy" \
  --og-image "https://cdn.example.com/share-card.jpg"
```

## Validation

Use:

```bash
node scripts/arcblog-lifecycle.mjs validate \
  --title "My First Post" \
  --body-file ./post.md \
  --cover-image "https://cdn.example.com/cover.jpg" \
  --og-image "https://cdn.example.com/share-card.jpg"
```

Current guardrails:
- cover/OG image must be http(s)
- category must be in whitelist
- tags normalized to lowercase underscore tokens
