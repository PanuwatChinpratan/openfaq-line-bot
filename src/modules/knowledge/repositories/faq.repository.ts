import { randomUUID } from 'node:crypto';
import { Injectable, type OnModuleInit, Optional } from '@nestjs/common';
import { normalizeThai } from '../../../common/security/sanitize';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { type FaqStatus, STARTER_FAQS, type StarterFaq } from '../starter-data';

const trigrams = (value: string): Set<string> => {
  const normalized = `  ${normalizeThai(value)}  `;
  return new Set(
    Array.from({ length: Math.max(0, normalized.length - 2) }, (_, i) =>
      normalized.slice(i, i + 3),
    ),
  );
};

const similarity = (left: string, right: string): number => {
  const a = trigrams(left);
  const b = trigrams(right);
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const item of a) if (b.has(item)) overlap += 1;
  return (2 * overlap) / (a.size + b.size);
};

@Injectable()
export class FaqRepository implements OnModuleInit {
  private rows = structuredClone(STARTER_FAQS);

  constructor(@Optional() private readonly prisma?: PrismaService) {}

  async onModuleInit(): Promise<void> {
    if (!this.prisma || !(await this.prisma.connectSafely())) return;
    if ((await this.prisma.faq.count()) === 0) {
      for (const faq of STARTER_FAQS) await this.persist(faq);
    }
    const stored = await this.prisma.faq.findMany({
      include: { variants: true },
      orderBy: { updatedAt: 'desc' },
    });
    this.rows = stored.map((faq) => ({
      id: faq.id,
      category: faq.category,
      title: faq.question,
      question: faq.question,
      variants: faq.variants.map((variant) => variant.text),
      answer: faq.answer,
      answerFull: faq.answer,
      source: faq.source,
      status: faq.status,
      reviewStatus: 'sit_approved',
      updatedAt: faq.updatedAt.toISOString(),
    }));
  }
  private get approved(): StarterFaq[] {
    return this.rows.filter((faq) => faq.status === 'published');
  }
  findById(id: string): StarterFaq | undefined {
    return this.approved.find((faq) => faq.id === id);
  }
  findByCategory(category: string): StarterFaq[] {
    return this.approved.filter((faq) => faq.category === category);
  }
  count(): number {
    return this.approved.length;
  }
  list(publishedOnly = true): StarterFaq[] {
    return structuredClone(publishedOnly ? this.approved : this.rows);
  }
  async save(
    input: Partial<StarterFaq> & Pick<StarterFaq, 'question' | 'answer'>,
  ): Promise<StarterFaq> {
    const existing = input.id ? this.rows.find((faq) => faq.id === input.id) : undefined;
    if (existing) {
      Object.assign(existing, input, {
        title: input.question ?? existing.question,
        updatedAt: new Date().toISOString(),
      });
      await this.persist(existing);
      return structuredClone(existing);
    }
    const created: StarterFaq = {
      id: input.id ?? `faq.${randomUUID()}`,
      category: input.category ?? 'ทั่วไป',
      title: input.question,
      question: input.question,
      variants: input.variants ?? [],
      answer: input.answer,
      answerFull: input.answer,
      source: input.source ?? 'OpenFAQ Admin',
      status: input.status ?? 'draft',
      reviewStatus: 'sit_approved',
      updatedAt: new Date().toISOString(),
    };
    this.rows.unshift(created);
    await this.persist(created);
    return structuredClone(created);
  }
  async setStatus(id: string, status: FaqStatus): Promise<StarterFaq | undefined> {
    const faq = this.rows.find((row) => row.id === id);
    if (!faq) return undefined;
    faq.status = status;
    faq.updatedAt = new Date().toISOString();
    await this.persist(faq);
    return structuredClone(faq);
  }

  private async persist(faq: StarterFaq): Promise<void> {
    if (!this.prisma?.available) return;
    await this.prisma.$transaction(async (database) => {
      await database.faq.upsert({
        where: { id: faq.id },
        update: {
          category: faq.category,
          question: faq.question,
          normalized: normalizeThai(faq.question),
          answer: faq.answer,
          source: faq.source,
          status: faq.status,
          publishedAt: faq.status === 'published' ? new Date() : null,
        },
        create: {
          id: faq.id,
          category: faq.category,
          question: faq.question,
          normalized: normalizeThai(faq.question),
          answer: faq.answer,
          source: faq.source,
          status: faq.status,
          publishedAt: faq.status === 'published' ? new Date() : null,
        },
      });
      await database.faqVariant.deleteMany({ where: { faqId: faq.id } });
      if (faq.variants.length > 0) {
        await database.faqVariant.createMany({
          data: faq.variants.map((text) => ({
            faqId: faq.id,
            text,
            normalized: normalizeThai(text),
          })),
        });
      }
      await database.faqRevision.create({
        data: {
          faqId: faq.id,
          question: faq.question,
          answer: faq.answer,
          variants: faq.variants,
          status: faq.status,
        },
      });
    });
  }
  exact(question: string): StarterFaq | undefined {
    const query = normalizeThai(question);
    return this.approved.find((faq) =>
      [faq.question, ...faq.variants].some((v) => normalizeThai(v) === query),
    );
  }
  search(question: string, limit = 10): Array<{ faq: StarterFaq; score: number }> {
    const normalized = normalizeThai(question);
    return this.approved
      .map((faq) => {
        const candidates = [faq.question, ...faq.variants];
        const fuzzy = Math.max(...candidates.map((candidate) => similarity(normalized, candidate)));
        const terms = normalized.split(' ').filter((term) => term.length > 1);
        const haystack = normalizeThai(candidates.join(' '));
        const keyword = terms.length
          ? terms.filter((term) => haystack.includes(term)).length / terms.length
          : 0;
        const score = Math.min(1, fuzzy * 0.8 + keyword * 0.2);
        return { faq, score };
      })
      .filter((x) => x.score >= 0.18)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
