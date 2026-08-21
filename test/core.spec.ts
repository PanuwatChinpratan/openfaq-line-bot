import { createHmac } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { containsSensitive, maskSensitive, normalizeThai } from '../src/common/security/sanitize';
import { verifyLineSignature } from '../src/common/security/signature';
import type { AiProvider } from '../src/modules/ai/providers/ai-provider';
import { FaqRepository } from '../src/modules/knowledge/repositories/faq.repository';
import { RetrievalService } from '../src/modules/knowledge/retrieval/retrieval.service';
import { STARTER_FAQS } from '../src/modules/knowledge/starter-data';
import {
  answerFlex,
  categoryFlex,
  mainMenuFlex,
  validateFlex,
} from '../src/modules/line/flex/flex.builders';
import { parsePostback } from '../src/modules/line/handlers/postback.parser';

const ai: AiProvider = {
  name: 'test',
  classify: async () => ({
    intent: 'unknown',
    category: 'unknown',
    faqId: null,
    searchQuery: '',
    confidence: 0,
    requiresAuthentication: false,
    preferredResponse: 'flex',
  }),
  groundedAnswer: async (_question, contexts) => contexts[0] ?? '',
  smokeTest: async () => ({ ok: true, model: 'test' }),
};

describe('security and Thai text', () => {
  test('verifies LINE signature over exact raw bytes', () => {
    const body = Buffer.from('{"events":[]}');
    const signature = createHmac('sha256', 'secret').update(body).digest('base64');
    expect(verifyLineSignature(body, signature, 'secret')).toBe(true);
    expect(verifyLineSignature(Buffer.from('{}'), signature, 'secret')).toBe(false);
  });
  test('normalizes Thai and masks secrets', () => {
    expect(normalizeThai('  ส่งนานไหม!? ')).toBe('ส่งนานไหม');
    expect(containsSensitive('OTP 123456')).toBe(true);
    expect(maskSensitive('โทร 0812345678')).not.toContain('0812345678');
  });
});

describe('FAQ retrieval', () => {
  const repository = new FaqRepository();
  const embeddings = { enabled: false, search: async () => [], warmup: async () => false };
  const service = new RetrievalService(
    repository,
    embeddings as never,
    new ConfigService({ AI_MODE: 'public-lite' }),
    ai,
  );

  test('ships useful generic starter data', () => {
    expect(STARTER_FAQS.length).toBeGreaterThanOrEqual(30);
    expect(STARTER_FAQS.every((faq) => faq.status === 'published')).toBe(true);
  });
  test('matches exact variants without AI', async () => {
    const result = await service.retrieve('ของจะถึงกี่วัน');
    expect(result.mode).toBe('exact');
    expect(result.faq?.id).toBe('shipping.time');
    expect(result.confidence).toBe(1);
  });
  test('finds a typo with fuzzy search', () => {
    expect(repository.search('คืนสินค้าด้ายกี่วัน')[0]?.faq.id).toBe('returns.window');
  });
  test('blocks sensitive input', async () => {
    expect((await service.retrieve('OTP 123456')).mode).toBe('sensitive');
  });
});

describe('LINE Flex', () => {
  test('builds valid menu and answer messages', () => {
    expect(validateFlex(mainMenuFlex())).toBe(true);
    const first = STARTER_FAQS[0];
    expect(first && validateFlex(answerFlex(first))).toBe(true);
  });

  test('accepts Thai FAQ category postbacks', () => {
    expect(
      parsePostback(`action=faq_category&category=${encodeURIComponent('การคืนสินค้า')}`),
    ).toEqual({ action: 'faq_category', category: 'การคืนสินค้า', faqId: undefined });
  });

  test('keeps Thai button labels complete and within LINE limits', () => {
    const message = categoryFlex(
      'การคืนสินค้า',
      STARTER_FAQS.filter((faq) => faq.category === 'การคืนสินค้า'),
    );
    const footer = message.contents.footer as { contents: Array<Record<string, unknown>> };
    const labels = footer.contents
      .filter((item) => item.type === 'button')
      .map((item) => (item.action as { label: string }).label);
    expect(labels.every((label) => [...label].length <= 20)).toBe(true);
    expect(labels.every((label) => !label.includes('\u200B'))).toBe(true);
  });
});
