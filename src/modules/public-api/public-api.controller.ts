import { Body, Controller, Get, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { z } from 'zod';
import { FaqRepository } from '../knowledge/repositories/faq.repository';
import { RetrievalService } from '../knowledge/retrieval/retrieval.service';
import { AdminGuard, AuthService } from './auth.service';

const chatSchema = z.object({ message: z.string().trim().min(1).max(500) });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1).max(200) });
const faqSchema = z.object({
  id: z.string().optional(),
  question: z.string().trim().min(3).max(200),
  answer: z.string().trim().min(3).max(2000),
  category: z.string().trim().min(1).max(80).optional(),
  variants: z.array(z.string().trim().min(1).max(200)).max(30).optional(),
  status: z.enum(['draft', 'published', 'needs_review', 'archived']).optional(),
});

const dto = (faq: ReturnType<FaqRepository['list']>[number]) => ({
  id: faq.id,
  question: faq.question,
  answer: faq.answer,
  category: faq.category,
  variants: faq.variants,
  status: faq.status,
  updatedAt: faq.updatedAt,
});

@Controller('v1')
export class PublicApiController {
  constructor(
    private readonly retrieval: RetrievalService,
    private readonly faqs: FaqRepository,
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('chat/query')
  async chat(@Body() body: unknown) {
    const { message } = chatSchema.parse(body);
    const result = await this.retrieval.retrieve(message);
    return {
      answer: result.answer,
      decision: result.decision,
      confidence: result.confidence,
      source: result.faq ? { faqId: result.faq.id, title: result.faq.source } : null,
      suggestions: result.suggestions,
      trace: result.trace,
      mode: result.aiMode,
    };
  }

  @Post('feedback')
  feedback(@Body() body: unknown) {
    return {
      ok: true,
      accepted: z.object({ faqId: z.string().optional(), helpful: z.boolean() }).parse(body),
    };
  }

  @Get('knowledge/faqs')
  knowledge() {
    return this.faqs.list(true).map(dto);
  }

  @Post('auth/login')
  async login(@Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    const input = loginSchema.parse(body);
    const token = await this.auth.login(input.email, input.password);
    if (!token) return response.status(401).json({ message: 'Invalid credentials' });
    response.cookie(this.auth.cookieName(), token, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 1000,
      path: '/',
    });
    return { ok: true };
  }

  @Post('auth/logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(this.auth.cookieName(), { path: '/' });
    return { ok: true };
  }

  @Get('admin/faqs')
  @UseGuards(AdminGuard)
  adminFaqs() {
    return this.faqs.list(false).map(dto);
  }

  @Post('admin/faqs')
  @UseGuards(AdminGuard)
  async createFaq(@Body() body: unknown) {
    return dto(await this.faqs.save(faqSchema.parse(body)));
  }

  @Patch('admin/faqs/:id')
  @UseGuards(AdminGuard)
  async updateFaq(@Param('id') id: string, @Body() body: unknown) {
    return dto(
      await this.faqs.save({
        ...faqSchema.partial({ id: true }).parse(body),
        id,
      } as Parameters<FaqRepository['save']>[0]),
    );
  }

  @Post('admin/faqs/:id/publish')
  @UseGuards(AdminGuard)
  async publish(@Param('id') id: string) {
    const faq = await this.faqs.setStatus(id, 'published');
    return faq ? dto(faq) : { message: 'Not found' };
  }

  @Post('admin/faqs/:id/archive')
  @UseGuards(AdminGuard)
  async archive(@Param('id') id: string) {
    const faq = await this.faqs.setStatus(id, 'archived');
    return faq ? dto(faq) : { message: 'Not found' };
  }
}
