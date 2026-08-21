import { z } from 'zod';

export const intentSchema = z.object({
  intent: z.enum(['faq', 'customer_specific', 'human_handoff', 'sensitive_data', 'unknown']),
  category: z.string().max(80).default('unknown'),
  faqId: z.string().max(120).nullable().default(null),
  searchQuery: z.string().max(300),
  confidence: z.number().min(0).max(1),
  requiresAuthentication: z.boolean(),
  preferredResponse: z.enum(['text', 'flex']),
});
export type IntentResult = z.infer<typeof intentSchema>;
