# Third-party notices

ArcBlog's own source is currently `UNLICENSED` (see `blocklet.yaml`; the licence decision is pending).
The components below are **not** written by this project and keep their own terms. Versions are the ones
`package.json` / `package-lock.json` resolve.

## Runtime dependencies (chain CLIs only)

The AUP application itself has **no runtime dependencies**; these are used by the operator scripts that
talk to the chain (`--adapter ocap`).

| Package | Licence | Used by |
| --- | --- | --- |
| `@arcblock/did-ext` | Apache-2.0 | `scripts/lib/chain.mjs` (wallet derivation from a mnemonic) |
| `@arcblock/did-util` | Apache-2.0 | `scripts/lib/chain.mjs` (address helpers) |
| `@ocap/client` | Apache-2.0 | `scripts/lib/chain.mjs` (GraphQL client, asset/stake/transfer transactions) |
| `@ocap/wallet` | Apache-2.0 | `scripts/lib/chain.mjs`, test fixtures |
| `bip39` | ISC | `scripts/lib/chain.mjs` (mnemonic → seed) |

Apache-2.0 requires that redistributions keep the licence and notices of those packages. They are
installed under `node_modules/` and are **not** vendored into this repository.

## Vendored or derived assets inside this repository

| Path | Origin | Terms / why it is here |
| --- | --- | --- |
| `.web/components/hero-carousel/vendor/photo-story.js` | ARC web-device widget `widgets/photo-story/photo-story.js`, shipped with ARC 2.0.0-beta.50 (`~/.arc/current/assets/web-device/`) | Part of the ARC distribution; embedding widgets is their intended use. The file header records the upstream path and the reason it is vendored (the AUP handler swallows root-relative asset URLs, so the widget must be inlined into the SSR page). `script.js` is generated from it by `scripts/arcblog-hero-carousel.mjs` — never edit by hand. |
| `.web/themes/**` (134 files) | The ARC theme library (`default`, `editorial`, plus `organic` / `mono`) | Provided by the platform build; carried in the repository so the web surface renders. Measured 2026-10-12: `default` and `editorial` are demonstrably in use; `organic` / `mono` (20 files, 88 KB) have no usage evidence — kept deliberately, see boundary `B23` and the `E13` ruling in [`docs/team/human-checkpoints.md`](docs/team/human-checkpoints.md). |
| `scripts/lib/agents.mjs` tool table, `.agents/skills/**` | Mixed: first-party skills written here, plus skills installed from `ArcBlock/agent-skills` and pinned in `skills-lock.json` | The first-party `aup-dsl` skill is written in this repository; installed skills keep their upstream terms and are listed in `skills-lock.json`. |

## Documentation quotes

`docs/05-开发文档/附件/arc-contracts.md` and the other files under `附件/` are **first-party**
measurement records (commands run against a local ARC install), not copied upstream documentation.
Where a platform message is quoted, it is quoted as the observed output of a command, with the command
next to it.
