# Changelog

All notable changes to ArcBlog. Format follows [Keep a Changelog](https://keepachangelog.com/), and
the project intends to follow [Semantic Versioning](https://semver.org/) (`blocklet.yaml` carries the
version; the git tag carries the release).

> **Why this file starts here**: the project has 382 commits and one tag (`v0.3.0`); everything before
> this file is the git history itself. `v0.3.7` is the first release summarised here, and the numbers
> below are countable from `git log v0.3.0..HEAD` (379 commits) rather than asserted.

## [Unreleased]

Nothing yet. The known pending items are not code: they are the human checkpoints
([`docs/team/human-checkpoints.md`](docs/team/human-checkpoints.md)) — a chain-write approval, a DID
login pass, the pending licence decision, and pushing this work to the public repository.

## [0.3.7] — 2026-10-13

### Added
- **A 30-minute way into the project** ([`docs/00-新手上路.md`](docs/00-新手上路.md)): what it is, how
  to run it, where the code and data live, the four gates, and the section that matters most — *what not
  to read*.
- **CI** (`.github/workflows/ci.yml`): a `fast` job that runs 29 of the 32 fast suites and **names** the
  three it cannot run on a plain runner (`--no-daemon`, declared in `scripts/run-tests.mjs` and checked
  from both sides by a guard), plus an opt-in `arc` job for the DSL/docs gates on a self-hosted runner.
- Issue and pull-request templates that ask for gate output, and this changelog.
- `config/seo/*`: the seo page now owns its own site-distribution records (`meta-description`,
  `share-image`), consumed by the generated RSS feed (channel `description` / `image`).
- Two new platform boundaries: `B23` (the theme library is loaded implicitly — "is it used?" must be
  measured from rendered values, never by searching for references) and `B24` (the chain refuses
  `updateAsset`'s `data.value` outside append-only mode, which the SDK does not expose).
- Guards added this cycle include: the ledger's count rows must equal what their own commands print, the
  DEFECT volume's ownership is machine-checkable, every management doc must name a real page, the nav
  labels must exist in both locales and leave no orphan, and the `--no-daemon` skip list must match the
  suites that really need the daemon.

### Fixed
- **The real chain writes finally ran** (approved checkpoint C): the node-NFT transfer works on beta
  (tx `E956B85D…`, `ownerIsBuyer: true`), which closed probes `P-3` and `U8` (fee ≈ 0.0020473 TBA,
  `value:"0"` and transaction-level data accepted); the self-description write was refused by the chain
  (see `B24`) and degrades to the stake message, as already implemented.
- The `.env.local` auto-load was only wired into two CLIs — the main node/chain CLI answered a bogus
  "chainHost is missing" while the file held every key (`DEF-40`).
- The ocap `updateAsset` passed a plain object where the SDK wants its `Any`, so canonical-cbor refused
  it before the chain could (`DEF-41`).
- The completion checker (`docs/team/objective-check.sh`) claimed to run two gates and ran one; it now
  runs `arc dsl validate`, the fast tier and the document gates, and reports the ledger's state.
- `?page=seo` no longer writes `node/profile.json`, so every field has one writer (`E9 = A`,
  `PRD-SET-02` landed; the ledger now has **zero** `开发中` rows).
- The home page's cover tile carried a single space, so its link had no accessible name; it now renders
  the post title over the cover (`DEF-27`).
- The DID Space index was rebuilt (2/6 spaces drifted → 6/6 clean), and the command this repo had been
  documenting for it (`arc space repair --index`) was wrong — the platform only accepts
  `--folder <claimed folder>`.

### Changed
- **Documentation consolidation**: 106 → 75 markdown files (1.81 → 1.31 MB). `docs/team/**` went from
  39 files / 634 KB to 7 files / 120 KB — 29 frozen review records and 6 stage logs became three
  archives that keep each verdict and its unresolved items, with the verbatim originals one
  `git show <sha>:<path>` away. Every citation was rewritten; a repo-wide scan found and fixed nine
  broken links (including two the author had just introduced).
- The ledger overview gained a one-page summary whose every number carries a command that prints it.

### Security
- No key material is tracked and none appears in the repository's history (`node.key`, `.env.local`,
  `.node-pk.pem`: zero commits). The build strips non-product files before packaging (539 → 230 files).
