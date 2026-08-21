import { PrismaClient } from '@prisma/client';
import { normalizeThai } from '../src/common/security/sanitize';
import { STARTER_FAQS } from '../src/modules/knowledge/starter-data';

const prisma = new PrismaClient();

async function main() {
  for (const faq of STARTER_FAQS) {
    await prisma.faq.upsert({
      where: { id: faq.id },
      update: {
        category: faq.category,
        question: faq.question,
        normalized: normalizeThai(faq.question),
        answer: faq.answer,
        source: faq.source,
        status: faq.status,
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
    await prisma.faqVariant.deleteMany({ where: { faqId: faq.id } });
    await prisma.faqVariant.createMany({
      data: faq.variants.map((text) => ({ faqId: faq.id, text, normalized: normalizeThai(text) })),
      skipDuplicates: true,
    });
  }
}

main().finally(() => prisma.$disconnect());
