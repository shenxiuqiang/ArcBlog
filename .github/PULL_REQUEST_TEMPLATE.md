## What this changes

<!-- One paragraph. If it changes a documented fact, name the file that now says otherwise. -->

## Gates (never submit a red gate)

- [ ] `arc dsl validate --json` → `"issues": []`
- [ ] `npm test` → fast tier green (say how many files it ran; the count comes from the run itself)
- [ ] `npm run gate:docs` → 6/6 PASS (only if this touches `docs/**`)
- [ ] `npm run build` (only if `.aup` / `blocklet.yaml` / `world/**` changed)
- [ ] If a page changed: deployed **and re-mounted** (`arc service restart -i default` + `arc blocklet run . -i default`), then verified in the browser

## Evidence

<!-- Paste the commands you ran and their real output. "Should work" is not evidence. -->

## If this adds or changes a guard

- [ ] I proved it can FAIL (show the red run), and it cannot silently skip its subject
- [ ] Its subject is tracked by git and the assertion is not vacuous

## Notes for the reviewer

<!-- Anything you deliberately did NOT do, or a fact you could not verify. -->
