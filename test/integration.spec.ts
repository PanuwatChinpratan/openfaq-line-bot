import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AiModule } from '../src/modules/ai/ai.module';
import { KnowledgeModule } from '../src/modules/knowledge/knowledge.module';
import { FaqRepository } from '../src/modules/knowledge/repositories/faq.repository';
import { RetrievalService } from '../src/modules/knowledge/retrieval/retrieval.service';

describe('knowledge integration', () => {
  test('typed question and postback use the same FAQ record', async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AiModule, KnowledgeModule],
    }).compile();
    const repository = module.get(FaqRepository);
    const retrieval = module.get(RetrievalService);
    expect((await retrieval.retrieve('เช็คพัสดุ')).faq).toEqual(
      repository.findById('shipping.tracking'),
    );
    await module.close();
  });

  test('answers a clear Thai typo without an LLM', async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AiModule, KnowledgeModule],
    }).compile();
    const retrieval = module.get(RetrievalService);
    const result = await retrieval.retrieve('คืนสินค้าด้ายกี่วัน');
    expect(result.decision).toBe('answer');
    expect(result.faq?.id).toBe('returns.window');
    await module.close();
  });

  test('draft FAQ never appears in public retrieval', async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AiModule, KnowledgeModule],
    }).compile();
    const repository = module.get(FaqRepository);
    const draft = await repository.save({
      question: 'คำถามภายใน',
      answer: 'ห้ามเผยแพร่',
      status: 'draft',
    });
    expect(repository.list(true).some((faq) => faq.id === draft.id)).toBe(false);
    await module.close();
  });
});
