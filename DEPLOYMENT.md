# Deployment

The public demo uses a Render Free web service with Neon Free Postgres.

## Why this stack

- Render deploys the repository's Dockerfile and provides HTTPS.
- Neon keeps PostgreSQL separate from the app and supports `pgvector` and `pg_trgm`.
- Secrets stay in each platform's encrypted environment settings and never enter Git.

## Deploy

1. Create a Neon Postgres project and copy its pooled connection string.
2. In Render, create a Blueprint from this repository and select the Free instance.
3. Set `DATABASE_URL`, `LINE_CHANNEL_SECRET`, and `LINE_CHANNEL_ACCESS_TOKEN` as secrets.
   Optionally set `REDIS_URL` to a TLS-enabled managed Redis connection.
4. Set `PUBLIC_BASE_URL` to the Render service URL.
5. Wait for `/ready` to return `"status":"ready"`.
6. Set the LINE webhook URL to `https://<service>.onrender.com/webhooks/line` and verify it.

The container runs Prisma migrations before starting. On a new database, the app inserts the
approved starter FAQ records automatically.

Redis is optional. Without `REDIS_URL`, each app process keeps conversation state and rate limits in
memory. Configure Redis when running multiple instances so those short-lived values are shared;
webhook idempotency remains in PostgreSQL.

## Free-tier limits

Render Free services sleep after 15 minutes without inbound traffic. The first request after sleep
can take about one minute, so LINE may retry that webhook event. Use a paid always-on instance for
production traffic. Neon Free compute scales to zero when idle and wakes when the app reconnects.
