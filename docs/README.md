# ArcBlog documentation

## Authoritative specification

**[ArcBlog-product-technical-spec.md](ArcBlog-product-technical-spec.md) — V2.0**

This is the single source of truth for ArcBlog's product positioning, architecture,
roles, economy and delivery phases. Every other document here is a supporting
reference for the current implementation or its operation. If a supporting
document ever disagrees with the spec, the spec wins — update or remove the
other document.

## External references

- **ArcBlock official technical docs** — <https://www.arcblock.io/zh/docs/> —
  consult before guessing any ARC / AFS / AUP / Blocklet API.
- **ArcBlock agent knowledge base** — `ArcBlock/agent-skills`, installed under
  `.agents/skills/` (`arcblock-context` + the `arc` booklets), tracked by
  `skills-lock.json`.

## Implementation

- [development-plan.md](development-plan.md) — spec → phase plan, architecture
  decisions, increment breakdown and acceptance gates.
- [arc-contracts.md](arc-contracts.md) — Phase 0 verified ARC contracts (AFS,
  manifest, Web Device, DID Space, identity, agent access) with command evidence.
- [developer-guide.md](developer-guide.md) — repository layout, content model,
  AUP conventions, theme bridge, URL bindings, scripts and tests.
- [persistence.md](persistence.md) — AFS / DID Space storage and identity
  contract; where posts, drafts, heroes, media and audits live.

## Operations

- [operations-runbook.md](operations-runbook.md) — daily checks, publish /
  archive / republish / delete, queries, audit, RSS, incident response.
- [publishing-ops.md](publishing-ops.md) — full CLI reference for
  `scripts/arcblog-lifecycle.mjs` and the query/audit/report helpers.
- [error-codes.md](error-codes.md) — structured JSON failure codes returned by
  the lifecycle script.
- [share-cards.md](share-cards.md) — OG/SEO field precedence, image sizes and
  publishing examples.

## History

- [release-notes-v0.3.0.md](release-notes-v0.3.0.md) — what shipped in v0.3.0.
  Historical record only; it does not describe the V2.0 target architecture.

## Removed in the 2026-09-23 docs cleanup

These described or planned the superseded single-node blog product and
conflicted with the V2.0 spec:

- `product-summary.md` — called ArcBlog "a DID-native, Markdown-first publishing
  Blocklet"; the spec (§1, §147, §153) defines it as a content-network node.
- `roadmap.md` — the Iteration 1–4 roadmap of the previous product; replaced by
  the spec's MVP scope (§134–139) and Phase 0–9 plan (§149).
- `release-checklist.md` — Iteration-1 release gates tied to the removed
  roadmap, including a stale draft path (`/blocklets/arcblog/users/<did>/drafts`)
  that contradicts `persistence.md` and spec §82–83.
- `superpowers/` (hardening design + plans) — scoped the product to a
  single-admin blog and listed economy, payment and NFT as non-goals, which is
  the opposite of spec §7–11 and §25–49.

Deleted files remain recoverable from git history, e.g.
`git log --all -- docs/roadmap.md`.
