# ArcBlog

[![gates](https://github.com/shenxiuqiang/ArcBlog/actions/workflows/ci.yml/badge.svg)](https://github.com/shenxiuqiang/ArcBlog/actions/workflows/ci.yml)
[![licence: Apache-2.0](https://img.shields.io/badge/licence-Apache--2.0-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D20-informational.svg)](package.json)

> 中文入口：[`README.md`](README.md)。The long-form documentation is Chinese-first; this file is the
> short English way in, and every link below lands on a document that states its own status.

ArcBlog is a **DID-native, Markdown-first publishing Blocklet** built on the Arc/AUP stack. It is not a
conventional Node app: there is **no bundler, no dev server, and the app itself has no runtime
dependencies**. The application is written in the AUP DSL (`.aup/app.aup`, `.aup/pages/**/*.aup`,
`.aup/man/*.yaml`) and ships with a small set of operator CLI scripts. Content lives in the blocklet's
AFS instance space — there is no database.

Two product ideas drive everything:

1. **Only studio nodes exist, and aggregation is the agent's job** — the aggregation path is a
   deterministic CLI projection with a traceable `cited[]`, not a service.
2. **Discovery is on-chain** — every node stakes its studio NFT to the *same* factory address, so the
   staked-asset list of that address *is* the node registry. The economy layer (paid reading, tips,
   revenue split, settlement, ledger) was deleted, and must not come back.

## Run it

```bash
npm install                 # only for the chain CLIs; the app needs nothing
arc dsl validate --json     # gate 1 — issues must be []
npm test                    # gate 2 — fast tier, ~2 s, never writes an instance

npm run build               # only when .aup / blocklet.yaml / world/** changed
node scripts/arcblog-deploy.mjs
arc service restart -i default && arc blocklet run . -i default   # a deploy alone is NOT enough
```

The site is at `http://arcblog.localhost:4939` (not port 80 — nothing listens there). Two
`Refused to execute … (MIME text/html)` console messages are platform dev-asset noise.

## Where to look next

| You want | Read |
| --- | --- |
| The 30-minute onboarding (Chinese, with a **what-not-to-read** list) | [`docs/00-新手上路.md`](docs/00-新手上路.md) |
| Implementation facts and every command | [`CLAUDE.md`](CLAUDE.md) |
| Architecture, platform boundaries (`B1`–`B24`), probes | [`docs/05-开发文档/`](docs/05-开发文档/00-架构总览.md) |
| Requirement status and evidence (the only status authority) | [`docs/06-功能开发列表/`](docs/06-功能开发列表/00-台账总览与规范.md) |
| What a human still has to do | [`docs/team/human-checkpoints.md`](docs/team/human-checkpoints.md) |
| How to contribute, and the four gates | [`CONTRIBUTING.md`](CONTRIBUTING.md) |

Current state, measured: **56 requirement rows — 47 implemented-pending-verification, 9 platform
boundaries, 0 unstarted, 0 in progress**; **10/10 probes concluded**; the four gates green.

## Licence

[Apache License 2.0](LICENSE), with [`NOTICE`](NOTICE) and third-party attribution in
[`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md). The platform it runs on (ARC daemon, AFS, AUP,
chain SDKs) is ArcBlock's and keeps its own terms. See [`SECURITY.md`](SECURITY.md) for reporting and
[`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) for conduct.
