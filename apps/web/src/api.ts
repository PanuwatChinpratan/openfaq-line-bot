import { chatResponseSchema, type FaqDto } from '@openfaq/contracts';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!response.ok) throw new Error((await response.text()) || `HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

export const api = {
  async chat(message: string) {
    return chatResponseSchema.parse(
      await request('/v1/chat/query', { method: 'POST', body: JSON.stringify({ message }) }),
    );
  },
  faqs: () => request<FaqDto[]>('/v1/knowledge/faqs'),
  adminFaqs: () => request<FaqDto[]>('/v1/admin/faqs'),
  saveFaq: (faq: Partial<FaqDto> & { id?: string }) =>
    request<FaqDto>(faq.id ? `/v1/admin/faqs/${faq.id}` : '/v1/admin/faqs', {
      method: faq.id ? 'PATCH' : 'POST',
      body: JSON.stringify(faq),
    }),
  publishFaq: (id: string) => request<FaqDto>(`/v1/admin/faqs/${id}/publish`, { method: 'POST' }),
  login: (email: string, password: string) =>
    request<{ ok: true }>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
};
