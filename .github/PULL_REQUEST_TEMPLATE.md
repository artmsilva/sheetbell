<!-- Thanks for contributing! Keep PRs focused. -->

## What & why

<!-- What does this change, and why? Link any related issue (e.g. Closes #12). -->

## Type of change

- [ ] Bug fix
- [ ] Feature
- [ ] Docs
- [ ] Refactor / chore

## Checklist

- [ ] `npm run build` passes locally
- [ ] No hardcoded deployment values (sheet IDs, channels, tabs, thresholds) — config goes through `astro.config.mjs` + `getConfig()`
- [ ] No Node-only APIs in server code (Web Crypto only; no `node:*`, `Buffer`, `fs`)
- [ ] No secrets committed
- [ ] Docs in `src/pages/docs/*` updated if behavior/setup changed

## Screenshots / notes

<!-- For UI changes, add before/after screenshots. Anything reviewers should know. -->
