import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  containsSensitive,
  hasPromptInjection,
  maskSensitive,
} from '../../../common/security/sanitize';
import { LocalEmbeddingService } from '../../../infrastructure/embedding/local-embedding.service';
import { AI_PROVIDER, type AiProvider } from '../../ai/providers/ai-provider';
import { FaqRepository } from '../repositories/faq.repository';
import type { StarterFaq } from '../starter-data';

export type RetrievalTrace = {
  stage: 'exact' | 'fuzzy' | 'vector' | 'rrf';
  score: number;
  candidateId: string;
  title: string;
};

export type RetrievalResult = {
  mode: 'exact' | 'hybrid' | 'sensitive' | 'customer_specific' | 'handoff' | 'unknown';
  decision: 'answer' | 'clarify' | 'handoff';
  faq?: StarterFaq;
  answer: string;
  handoff: boolean;
  confidence: number;
  suggestions: Array<{ faqId: string; question: string }>;
  trace: RetrievalTrace[];
  aiMode: 'public-lite' | 'local-ai';
};

@Injectable()
export class RetrievalService {
  constructor(
    private readonly faqs: FaqRepository,
    private readonly embeddings: LocalEmbeddingService,
    private readonly config: ConfigService,
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
  ) {}

  async retrieve(raw: string): Promise<RetrievalResult> {
    const aiMode =
      this.config.get<string>('AI_MODE', 'public-lite') === 'local-ai' ? 'local-ai' : 'public-lite';
    if (containsSensitive(raw))
      return this.notice(
        'sensitive',
        'เพื่อความปลอดภัย กรุณาอย่าส่ง OTP, PIN, รหัสผ่าน หมายเลขบัตร หรือข้อมูลส่วนตัวผ่านแชต',
        true,
        aiMode,
      );
    if (hasPromptInjection(raw))
      return this.notice('unknown', 'ฉันตอบได้เฉพาะข้อมูลที่เผยแพร่ในคลัง FAQ เท่านั้น', false, aiMode);

    const query = maskSensitive(raw).trim().slice(0, 500);
    const exact = this.faqs.exact(query);
    if (exact) {
      return {
        mode: 'exact',
        decision: 'answer',
        faq: exact,
        answer: exact.answer,
        handoff: Boolean(exact.requiresHandoff),
        confidence: 1,
        suggestions: [],
        trace: [{ stage: 'exact', score: 1, candidateId: exact.id, title: exact.title }],
        aiMode,
      };
    }

    const [fuzzy, vectors] = await Promise.all([
      this.faqs.search(query),
      this.embeddings.search(query),
    ]);
    const vectorById = new Map(vectors.map((item) => [item.faqId, item.score]));
    const fuzzyById = new Map(fuzzy.map((item) => [item.faq.id, item.score]));
    const ids = new Set([...fuzzyById.keys(), ...vectorById.keys()]);
    const ranked = [...ids]
      .map((id) => {
        const fuzzyRank = fuzzy.findIndex((item) => item.faq.id === id);
        const vectorRank = vectors.findIndex((item) => item.faqId === id);
        const rrf =
          (fuzzyRank >= 0 ? 1 / (60 + fuzzyRank + 1) : 0) +
          (vectorRank >= 0 ? 1 / (60 + vectorRank + 1) : 0);
        const lexical = fuzzyById.get(id) ?? 0;
        const semantic = Math.max(0, vectorById.get(id) ?? 0);
        const agreement = fuzzyRank >= 0 && vectorRank >= 0 ? 1 : 0;
        const confidence = Math.min(
          1,
          vectors.length > 0 ? lexical * 0.45 + semantic * 0.45 + agreement * 0.1 : lexical,
        );
        return { id, rrf, confidence, lexical, semantic, faq: this.faqs.findById(id) };
      })
      .filter((item): item is typeof item & { faq: StarterFaq } => Boolean(item.faq))
      .sort((a, b) => b.rrf - a.rrf || b.confidence - a.confidence);

    const best = ranked[0];
    const trace: RetrievalTrace[] = [];
    if (fuzzy[0])
      trace.push({
        stage: 'fuzzy',
        score: fuzzy[0].score,
        candidateId: fuzzy[0].faq.id,
        title: fuzzy[0].faq.title,
      });
    if (vectors[0]) {
      const faq = this.faqs.findById(vectors[0].faqId);
      if (faq)
        trace.push({
          stage: 'vector',
          score: Math.max(0, vectors[0].score),
          candidateId: faq.id,
          title: faq.title,
        });
    }
    if (best)
      trace.push({
        stage: 'rrf',
        score: best.confidence,
        candidateId: best.id,
        title: best.faq.title,
      });

    if (!best || best.confidence < 0.45) {
      const intent = await this.ai.classify(query);
      if (intent.intent === 'human_handoff')
        return this.notice(
          'handoff',
          'รับทราบค่ะ กำลังส่งต่อให้เจ้าหน้าที่ กรุณาอย่าส่งรหัสผ่านหรือข้อมูลบัตร',
          true,
          aiMode,
          trace,
        );
      if (intent.intent === 'customer_specific')
        return this.notice(
          'customer_specific',
          'คำถามนี้เป็นข้อมูลเฉพาะคำสั่งซื้อ กรุณาติดต่อเจ้าหน้าที่พร้อมเลขคำสั่งซื้อ และอย่าส่งข้อมูลบัตร',
          true,
          aiMode,
          trace,
        );
      return {
        ...this.notice(
          'unknown',
          'ยังไม่พบคำตอบที่มั่นใจ ลองเลือกคำถามใกล้เคียงหรือติดต่อเจ้าหน้าที่',
          false,
          aiMode,
          trace,
        ),
        confidence: best?.confidence ?? 0,
        suggestions: ranked
          .slice(0, 3)
          .map(({ faq }) => ({ faqId: faq.id, question: faq.question })),
      };
    }

    const runnerUp = ranked[1];
    if (best.confidence < 0.72 && runnerUp && best.confidence - runnerUp.confidence < 0.08) {
      return {
        mode: 'hybrid',
        decision: 'clarify',
        answer: 'คุณหมายถึงคำถามใดต่อไปนี้',
        handoff: false,
        confidence: best.confidence,
        suggestions: ranked
          .slice(0, 3)
          .map(({ faq }) => ({ faqId: faq.id, question: faq.question })),
        trace,
        aiMode,
      };
    }

    const answer =
      aiMode === 'local-ai'
        ? await this.ai.groundedAnswer(query, [best.faq.answer])
        : best.faq.answer;
    return {
      mode: 'hybrid',
      decision: 'answer',
      faq: best.faq,
      answer,
      handoff: Boolean(best.faq.requiresHandoff),
      confidence: best.confidence,
      suggestions: [],
      trace,
      aiMode,
    };
  }

  private notice(
    mode: 'sensitive' | 'customer_specific' | 'handoff' | 'unknown',
    answer: string,
    handoff: boolean,
    aiMode: 'public-lite' | 'local-ai',
    trace: RetrievalTrace[] = [],
  ): RetrievalResult {
    return {
      mode,
      decision: handoff ? 'handoff' : 'clarify',
      answer,
      handoff,
      confidence: 0,
      suggestions: [],
      trace,
      aiMode,
    };
  }
}
