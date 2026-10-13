# Contributing

Thanks for looking. This project is small and opinionated, and most of the opinion is written down —
this file is the short version, with pointers to the authoritative files.

> **Before anything else, read [`docs/00-新手上路.md`](docs/00-新手上路.md)** (30 minutes). It ends
> with the list of documents you deliberately do **not** need.

## The one rule that surprises people

**One fact has exactly one authoritative file.** A requirement lives in its `PRD-*` row; a platform
capability or boundary in `docs/05-开发文档/02` (`B*`); a defect in `DEF-*`; a thing only a human can do
in [`docs/team/human-checkpoints.md`](docs/team/human-checkpoints.md). If your change makes one of those
wrong, change **that** file — do not restate the fact somewhere else. Reviewers will ask for the pointer.

## Set up

```bash
npm install            # only for the chain CLIs (@arcblock/*, @ocap/*); the app itself needs no deps
arc dsl validate --json
npm test               # fast tier, ~2 s, never writes the instance
```

Working on a page (`.aup/**`) additionally needs the ARC daemon and a local instance, and **a deploy is
not enough** — the running instance keeps serving the previous build until you re-mount:

```bash
npm run build
node scripts/arcblog-deploy.mjs
arc service restart -i default && arc blocklet run . -i default   # then verify in the browser
```

## The gates (all four, in this order)

| Gate | Command | Bar |
| --- | --- | --- |
| DSL | `arc dsl validate --json` | `"issues": []` |
| Fast tier | `npm test` | green. Take the file count from the run, never from prose |
| Documents | `npm run gate:docs` | 6/6 volume gates PASS (only if you touched `docs/**`) |
| Build | `npm run build` | only when `.aup` / `blocklet.yaml` / `world/**` changed |

**A red gate is never submitted.** The live tier (`npm run test:live`) is not a routine gate: it mutates
a shared instance and takes ~21 minutes. When your change touches a CLI, an AFS record, the chain
adapter or a daemon route, cover it with the one file that owns that path:

```bash
echo "my-change" > docs/team/.gate-lock        # only if someone else may run tests concurrently
npm run test:file -- scripts/<name>.test.mjs
rm docs/team/.gate-lock
```

## Adding a guard

Guards are the point of this repository, and they have their own discipline:

1. **Prove it can fail.** Show the red run in your pull request. A guard that has never been red is a
   guess.
2. **Do not let it skip its subject silently.** If it must skip, declare the skip list in code and
   assert that the list matches reality (see `DAEMON_TESTS` in `scripts/run-tests.mjs`).
3. Its subject must be tracked by git, and the assertion must not be vacuous (no empty-list passes).

## Not inventing the platform

The first rule of this codebase: **verify ARC before you write code against it** —
`arc <cmd> --help`, `arc explain`, `/.knowledge`. If the platform cannot do something, write it as a
boundary in `docs/05-开发文档/02` **with the degradation path**, and say what you measured. There are 24
such rows; they are the reason this project does not promise what the platform refuses.

## Commits and pull requests

- Commits are **checkpoints**: one coherent change, exact paths (`git add <path>`, never `-A`), and a
  message that says **why**, **what evidence** and **what failed before**. Read a few with
  `git log --oneline | head -20` — matching that register matters more than matching a format.
- Pull requests: say what changed, paste the gate output, and flag anything you could not verify.
- Only the maintainer commits to `main`, and `git push`, real chain writes and instance-data deletion
  always require a human decision (they are the checkpoints in `docs/team/human-checkpoints.md`).

## Licence

ArcBlog is licensed under the **Apache License 2.0** ([`LICENSE`](LICENSE), with the attribution file
[`NOTICE`](NOTICE)). By submitting a contribution you agree that it is licensed under the same terms —
there is no CLA and no copyright assignment. Apache-2.0 §5 says this without any extra paperwork:
contributions intentionally submitted for inclusion are under the project's licence unless you say
otherwise in writing.

Redistributions must keep the licence, the `NOTICE` file, and the third-party attribution in
[`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md) (the Apache-2.0 ArcBlock/OCAP packages, ISC
`bip39`, the vendored ARC web-device widget and the theme library).

**One boundary worth knowing**: `LICENSE` covers this repository's own source. The platform this app
runs on (the ARC daemon, AFS, AUP, the chain SDKs) belongs to ArcBlock and keeps its own terms.
