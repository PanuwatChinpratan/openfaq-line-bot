import { z } from 'zod';

const actions = z.enum([
  'main_menu',
  'faq_category',
  'faq_detail',
  'contact_staff',
  'human_handoff',
]);
export type PostbackAction = { action: z.infer<typeof actions>; category?: string; faqId?: string };
export function parsePostback(data: string): PostbackAction | null {
  if (data.length > 500) return null;
  const params = new URLSearchParams(data);
  const parsed = actions.safeParse(params.get('action'));
  if (!parsed.success) return null;
  const category = params.get('category') ?? undefined;
  const faqId = params.get('faqId') ?? undefined;
  if (category && !/^[a-z_]{1,80}$/.test(category)) return null;
  if (faqId && !/^[a-z0-9._-]{1,120}$/i.test(faqId)) return null;
  if (parsed.data === 'faq_category' && !category) return null;
  if (parsed.data === 'faq_detail' && !faqId) return null;
  return { action: parsed.data, category, faqId };
}
