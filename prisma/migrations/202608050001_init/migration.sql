CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE "FaqStatus" AS ENUM ('draft', 'published', 'needs_review', 'archived');

CREATE TABLE "faqs" (
  "id" TEXT PRIMARY KEY,
  "category" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "normalized" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "status" "FaqStatus" NOT NULL DEFAULT 'draft',
  "embedding" vector(384),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "published_at" TIMESTAMP(3)
);
CREATE INDEX "faqs_category_status_idx" ON "faqs"("category", "status");
CREATE INDEX "faqs_normalized_trgm_idx" ON "faqs" USING gin ("normalized" gin_trgm_ops);
CREATE INDEX "faqs_embedding_hnsw_idx" ON "faqs" USING hnsw ("embedding" vector_cosine_ops);

CREATE TABLE "faq_variants" (
  "id" TEXT PRIMARY KEY,
  "faq_id" TEXT NOT NULL REFERENCES "faqs"("id") ON DELETE CASCADE,
  "text" TEXT NOT NULL,
  "normalized" TEXT NOT NULL
);
CREATE UNIQUE INDEX "faq_variants_faq_id_normalized_key" ON "faq_variants"("faq_id", "normalized");
CREATE INDEX "faq_variants_normalized_trgm_idx" ON "faq_variants" USING gin ("normalized" gin_trgm_ops);

CREATE TABLE "faq_revisions" (
  "id" TEXT PRIMARY KEY,
  "faq_id" TEXT NOT NULL REFERENCES "faqs"("id") ON DELETE CASCADE,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "variants" JSONB NOT NULL,
  "status" "FaqStatus" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "faq_revisions_faq_id_created_at_idx" ON "faq_revisions"("faq_id", "created_at");

CREATE TABLE "admin_users" ("id" TEXT PRIMARY KEY, "email" TEXT UNIQUE NOT NULL, "password_hash" TEXT NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "admin_sessions" ("id" TEXT PRIMARY KEY, "user_id" TEXT NOT NULL REFERENCES "admin_users"("id") ON DELETE CASCADE, "token_hash" TEXT UNIQUE NOT NULL, "expires_at" TIMESTAMP(3) NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "admin_sessions_expires_at_idx" ON "admin_sessions"("expires_at");
CREATE TABLE "query_logs" ("id" TEXT PRIMARY KEY, "sanitized_query" TEXT NOT NULL, "decision" TEXT NOT NULL, "confidence" DOUBLE PRECISION NOT NULL, "faq_id" TEXT, "latency_ms" INTEGER NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "query_logs_created_at_idx" ON "query_logs"("created_at");
CREATE TABLE "feedback" ("id" TEXT PRIMARY KEY, "faq_id" TEXT REFERENCES "faqs"("id") ON DELETE SET NULL, "helpful" BOOLEAN NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "webhook_receipts" ("event_id" TEXT PRIMARY KEY, "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "status" TEXT NOT NULL);
