# Security policy

## Reporting a vulnerability

**Please do not open a public issue.** Use GitHub's private advisory flow:
**Security → Report a vulnerability** (<https://github.com/shenxiuqiang/ArcBlog/security/advisories/new>).

Include what you did, what happened, and the smallest reproduction you have. If the issue involves key
material or an instance you do not own, redact the secret and describe where it came from instead.

## What this project does about secrets

- `node.key`, `.env.local` and `.node-pk.pem` are **git-ignored and untracked**, and the repository's
  history contains **zero** commits touching them (checked with `git log --all -- <path>`).
- `.env.example` carries placeholders only, and a guard checks that its chain values equal the `beta`
  preset and that it holds no real mnemonic.
- `npm run build` is the only supported build entry: it runs `scripts/arcblog-dist-secrets.mjs`, which
  removes non-product files from the artifact and fails on key material. **Do not run a bare
  `arc blocklet build`** — it copies `node.key` / `.env.local` into `dist/` and lists them in the
  artifact manifest (the platform has no ignore switch).
- No page or DSL file may carry a chain address or a token symbol; the console reads a public projection
  (`node/factories.json`), which holds addresses and hashes only.

## Scope

This repository is an application (a blocklet) plus its operator CLIs. Vulnerabilities in the platform it
runs on — the ARC daemon, AFS, AUP, the chain SDKs — belong upstream to ArcBlock; if you are unsure
which side a finding is on, report it here and we will route it.

## Supported versions

The project is pre-1.0 and ships from `main`. Fixes land on `main`; there are no maintained release
branches yet.
