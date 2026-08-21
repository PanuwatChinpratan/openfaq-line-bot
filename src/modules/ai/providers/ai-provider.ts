import type { IntentResult } from '../schemas/intent.schema';

export const AI_PROVIDER = Symbol('AI_PROVIDER');
export interface AiProvider {
  readonly name: string;
  classify(message: string): Promise<IntentResult>;
  groundedAnswer(question: string, contexts: string[]): Promise<string>;
  smokeTest(): Promise<{ ok: boolean; model: string; error?: string }>;
}
