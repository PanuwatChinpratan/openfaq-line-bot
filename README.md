# OpenFAQ Bot

Open-source Thai FAQ assistant for LINE. It handles typos and paraphrases with hybrid retrieval, shows why an answer was selected, and never lets the LLM answer without approved context.

![OpenFAQ answering a real typo-tolerant shipping question in LINE](docs/design/line-production-chat-real.png)

_Real LINE conversation with the deployed OpenFAQ Demo Bot._

## What it includes

- LINE webhook, signature verification and Flex Messages
- Exact + fuzzy + multilingual vector search with RRF
- Public Lite mode with no API key
- Optional local answers through Ollama + Qwen3 4B
- React + Tailwind Chat Demo, knowledge viewer and owner-only FAQ editor
- PostgreSQL, pgvector, Prisma, Docker and automated tests
- Biome for formatting and linting

## Quick start

Requirements: Node.js 22+, Docker and Docker Compose.

```bash
cp .env.example .env
npm install
docker compose up -d postgres
DATABASE_URL=postgresql://openfaq:openfaq@localhost:5432/openfaq npm run prisma:migrate
DATABASE_URL=postgresql://openfaq:openfaq@localhost:5432/openfaq npm run prisma:seed
npm run dev
```

Open `http://localhost:5173`. Local admin defaults to `admin@openfaq.local` / `change-me`; replace it before sharing a deployment.

For the containerized stack:

```bash
docker compose up --build
```

## How retrieval works

```text
question → normalize → exact → fuzzy + vector → RRF → confidence
                                                    ├─ answer
                                                    ├─ clarify
                                                    └─ handoff
```

`multilingual-e5-small` produces local embeddings. Exact matches skip embedding and AI. Qwen is only allowed to rewrite the selected FAQ answer; it cannot query the database or invent a result.

Exact matches answer immediately. Other matches answer only when the top result is strong or clearly separated from the runner-up. Close candidates become choices; low-confidence queries use a safe fallback or human handoff.

## Local AI

Install [Ollama](https://ollama.com), then:

```bash
ollama pull qwen3:4b
AI_MODE=local-ai npm run start:dev
```

If Ollama is unavailable, OpenFAQ returns the canonical FAQ answer. No cloud API key is required.

## LINE setup

1. Create a Messaging API channel in LINE Developers.
2. Put `LINE_CHANNEL_SECRET` and `LINE_CHANNEL_ACCESS_TOKEN` in `.env`.
3. Expose port 3000 through HTTPS and set the webhook to `/webhooks/line`.
4. Enable webhooks and disable overlapping OA auto-replies.

The webhook validates `x-line-signature` against the exact raw request body before parsing JSON.

## Commands

```bash
npm run check        # Biome format + lint + imports
npm run typecheck
npm test
npm run build:all
npm run model:setup  # cache the local embedding model
npm run ai:smoke     # check Ollama when Local AI is enabled
```

The concise implementation checklist lives in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).
Deployment configuration and free-tier limitations are documented in [DEPLOYMENT.md](DEPLOYMENT.md).

## Security

- Never log channel secrets, reply tokens, OTP, PIN or full card numbers.
- Set `ADMIN_PASSWORD_HASH` in production. Generate it with `npm run admin:hash-password -- "your long password"`.
- Public endpoints only expose published FAQs.
- This repository contains fictional store data and is not affiliated with or endorsed by LINE.

## License

MIT. Qwen3 is Apache-2.0, multilingual-e5-small is MIT, and their model weights are downloaded separately.
