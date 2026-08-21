import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LINE_CHANNEL_SECRET: z.string().default(''),
  LINE_CHANNEL_ACCESS_TOKEN: z.string().default(''),
  DATABASE_URL: z.string().default('postgresql://openfaq:openfaq@localhost:5432/openfaq'),
  REDIS_URL: z.union([z.string().url(), z.literal('')]).default(''),
  PUBLIC_BASE_URL: z.string().default(''),
  AI_MODE: z.enum(['public-lite', 'local-ai']).default('public-lite'),
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434/v1'),
  OLLAMA_MODEL: z.string().min(1).default('qwen3:4b'),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  AI_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
  EMBEDDING_PROVIDER: z.enum(['local', 'disabled']).default('local'),
  EMBEDDING_MODEL: z.string().default('Xenova/multilingual-e5-small'),
  MODEL_CACHE_DIR: z.string().default('.cache/models'),
  ADMIN_EMAIL: z.string().email().default('admin@openfaq.local'),
  ADMIN_PASSWORD: z.string().default('change-me'),
  ADMIN_PASSWORD_HASH: z.string().default(''),
  LOG_LEVEL: z.string().default('info'),
  CONVERSATION_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  MAX_CONVERSATION_MESSAGES: z.coerce.number().int().min(1).max(20).default(6),
});
export type AppEnv = z.infer<typeof envSchema>;
export function validateEnv(config: Record<string, unknown>): AppEnv {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) throw new Error(`Invalid environment: ${parsed.error.message}`);
  return parsed.data;
}
