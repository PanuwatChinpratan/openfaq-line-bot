import { z } from 'zod';

export const traceStageSchema = z.object({
  stage: z.enum(['exact', 'fuzzy', 'vector', 'rrf']),
  score: z.number().min(0).max(1),
  candidateId: z.string(),
  title: z.string(),
});

export const chatResponseSchema = z.object({
  answer: z.string(),
  decision: z.enum(['answer', 'clarify', 'handoff']),
  confidence: z.number().min(0).max(1),
  source: z.object({ faqId: z.string(), title: z.string() }).nullable(),
  suggestions: z.array(z.object({ faqId: z.string(), question: z.string() })),
  trace: z.array(traceStageSchema),
  mode: z.enum(['public-lite', 'local-ai']),
});

export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type TraceStage = z.infer<typeof traceStageSchema>;

export type FaqStatus = 'draft' | 'published' | 'needs_review' | 'archived';
export type FaqDto = {
  id: string;
  question: string;
  answer: string;
  category: string;
  variants: string[];
  status: FaqStatus;
  updatedAt: string;
};
