#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v docker >/dev/null || { echo "Docker is required"; exit 1; }
docker info >/dev/null || { echo "Docker daemon is not running"; exit 1; }
if [ ! -f .env ]; then cp .env.example .env; echo "Created .env; add LINE secrets when available."; fi
npm ci
docker compose up -d postgres
until docker compose exec -T postgres pg_isready -U openfaq -d openfaq >/dev/null 2>&1; do sleep 2; done
export DATABASE_URL="postgresql://openfaq:openfaq@localhost:5432/openfaq"
npx prisma migrate deploy
npm run prisma:seed
npm run check
npm run typecheck
npm test
npm run build:all
docker compose up -d --build api web
echo "SIT is up. Run: npm run sit:check"
