# AGENTS.md

This file governs every AI or automation agent working in this repository.

## Product intent

OpenFAQ is a Thai FAQ assistant for LINE. It must prefer a safe, approved answer over a creative
answer. Keep the project useful as a small production demo and understandable as a portfolio
repository.

## Required workflow

- Never commit or push directly to `main` or `develop`.
- Branch from an up-to-date `develop` using `feature/`, `fix/`, `docs/`, `test/`, or `chore/`.
- Open feature branches into `develop`. Open `develop` into `main` only for a release.
- Keep each pull request focused. Do not mix unrelated cleanup with the requested change.
- Use Conventional Commit subjects such as `feat:`, `fix:`, `docs:`, `test:`, and `chore:`.
- Preserve user changes and never rewrite shared branch history.

## Before editing

1. Read `README.md`, `CONTRIBUTING.md`, and the files directly involved.
2. Check `git status` and the current branch.
3. State any assumption that changes product behaviour, data, security, or deployment.
4. Prefer the smallest change that completely solves the task.

## Architecture rules

- Keep LINE transport code in `src/modules/line` and FAQ retrieval in `src/modules/knowledge`.
- Keep API contracts in `packages/contracts`; do not duplicate request or response shapes.
- Access PostgreSQL through Prisma. Add a migration for every schema change; never edit a deployed
  migration.
- Production answers must come from published FAQ content. Do not let an LLM invent policy,
  payment, shipping, warranty, or account answers.
- `public-lite` must work without an AI API key. Enabling local or external AI must remain explicit
  configuration with a deterministic FAQ fallback.
- Keep the API compatible with the 512 MB free deployment: do not load embedding or LLM models
  when `EMBEDDING_PROVIDER=disabled` and `AI_MODE=public-lite`.

## LINE and Thai text safety

- Verify `x-line-signature` against the untouched raw webhook body before parsing JSON.
- Treat LINE webhook events as retryable and idempotent using their event ID.
- Never log reply tokens, channel credentials, passwords, OTPs, full payment details, or raw user
  conversations.
- Do not split Thai grapheme clusters, vowels, or tone marks when truncating UI text.
- Respect LINE Flex Message limits and test long Thai labels before changing message builders.

## Code quality

- Follow existing TypeScript and NestJS patterns; avoid new dependencies unless justified.
- Use Biome for formatting and linting. Do not add competing formatters.
- Add or update tests for changed behaviour, especially retrieval thresholds, typo handling,
  webhook verification, idempotency, and Flex payload limits.
- Do not weaken types, validation, authentication, rate limits, or test assertions to make a change
  pass.

Run before requesting review:

```bash
npm run check
npm run typecheck
npm test
npm run build:all
```

## Secrets and deployment

- Never commit `.env`, credentials, access tokens, database URLs, or copied production logs.
- Document new environment variables in `.env.example` without real values.
- Keep `/health` lightweight and `/ready` representative of service readiness.
- Treat `render.yaml`, `Dockerfile`, Prisma migrations, and GitHub Actions as production code.
- Mention free-tier cold starts when a change affects webhook latency or reliability.

## Definition of done

- The requested behaviour works and relevant failure paths are handled.
- Required checks pass, or the exact blocker is documented.
- Documentation matches the implementation.
- `git diff` contains no unrelated files, secrets, generated caches, or private screenshots.
- The pull request explains what changed, how it was verified, and any deployment impact.
