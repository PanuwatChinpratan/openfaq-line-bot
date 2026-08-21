import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { STARTER_FAQS } from '../../modules/knowledge/starter-data';

type Extractor = (
  texts: string | string[],
  options: { pooling: 'mean'; normalize: true },
) => Promise<{ tolist(): number[][] }>;

@Injectable()
export class LocalEmbeddingService {
  private extractor?: Promise<Extractor>;
  private corpus?: Promise<Map<string, number[]>>;

  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return this.config.get<string>('EMBEDDING_PROVIDER', 'local') === 'local';
  }

  async search(query: string, limit = 10): Promise<Array<{ faqId: string; score: number }>> {
    if (!this.enabled || this.config.get('NODE_ENV') === 'test') return [];
    try {
      const [queryVector, corpus] = await Promise.all([
        this.embed(`query: ${query}`),
        this.getCorpus(),
      ]);
      return [...corpus.entries()]
        .map(([faqId, vector]) => ({ faqId, score: cosine(queryVector, vector) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch {
      return [];
    }
  }

  async warmup(): Promise<boolean> {
    if (!this.enabled) return false;
    try {
      await this.getCorpus();
      return true;
    } catch {
      return false;
    }
  }

  private async getExtractor(): Promise<Extractor> {
    this.extractor ??= import('@huggingface/transformers').then(async ({ env, pipeline }) => {
      env.cacheDir = this.config.get<string>('MODEL_CACHE_DIR', '.cache/models');
      return (await pipeline(
        'feature-extraction',
        this.config.get<string>('EMBEDDING_MODEL', 'Xenova/multilingual-e5-small'),
      )) as unknown as Extractor;
    });
    return this.extractor;
  }

  private async embed(text: string): Promise<number[]> {
    const extractor = await this.getExtractor();
    return (await extractor(text, { pooling: 'mean', normalize: true })).tolist()[0] ?? [];
  }

  private getCorpus(): Promise<Map<string, number[]>> {
    this.corpus ??= Promise.all(
      STARTER_FAQS.map(
        async (faq) =>
          [
            faq.id,
            await this.embed(`passage: ${faq.question} ${faq.variants.join(' ')} ${faq.answer}`),
          ] as const,
      ),
    ).then((rows) => new Map(rows));
    return this.corpus;
  }
}

const cosine = (a: number[], b: number[]): number => {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    const left = a[index] ?? 0;
    const right = b[index] ?? 0;
    dot += left * right;
    normA += left ** 2;
    normB += right ** 2;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};
