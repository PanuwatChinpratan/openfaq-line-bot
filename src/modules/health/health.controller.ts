import { Controller, Get } from '@nestjs/common';
import { FaqRepository } from '../knowledge/repositories/faq.repository';
import { LineReplyAdapter } from '../line/adapters/line-reply.adapter';

@Controller()
export class HealthController {
  constructor(
    private readonly faqs: FaqRepository,
    private readonly line: LineReplyAdapter,
  ) {}
  @Get('health') health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
  @Get('ready') ready() {
    const count = this.faqs.count();
    return {
      status: count > 0 ? 'ready' : 'not_ready',
      approvedFaqCount: count,
      lineAdapter: this.line.mode,
      vectorRetrieval: process.env.EMBEDDING_PROVIDER === 'disabled' ? 'disabled' : 'local',
      aiMode: process.env.AI_MODE ?? 'public-lite',
    };
  }
}
