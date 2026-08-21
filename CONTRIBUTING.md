# Contributing

## Branch model

```text
feature/* ──PR──> develop ──release PR──> main
fix/*     ──PR──> develop
docs/*    ──PR──> develop
```

- `main` is the production branch and deploys to Render.
- `develop` is the integration branch for the next release.
- Create work branches from the latest `develop` using `feature/`, `fix/`, `docs/`, `test/`, or
  `chore/`.
- Never push commits directly to `main` or `develop`; use a pull request.
- Urgent production fixes use `fix/<topic>` from `main`, then merge the same fix back into
  `develop`.

## Pull requests

1. Keep the change focused and add tests for changed behaviour.
2. Use a Conventional Commit subject such as `feat: add category search`.
3. Run `npm run check`, `npm run typecheck`, `npm test` and `npm run build:all`.
4. Target `develop` for normal work. Target `main` only with a reviewed release or urgent fix.
5. Explain user-visible behaviour, verification, and deployment impact in the pull request.

AI and automation contributors must also follow [AGENTS.md](AGENTS.md).

Please keep OpenFAQ simple. New infrastructure needs a concrete use case, not only future possibility.
