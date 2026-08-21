import { Injectable } from '@nestjs/common';
import { maskSensitive } from '../../../common/security/sanitize';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ConversationService } from '../../conversations/conversation.service';
import { FaqRepository } from '../../knowledge/repositories/faq.repository';
import { RetrievalService } from '../../knowledge/retrieval/retrieval.service';
import { LineReplyAdapter } from '../adapters/line-reply.adapter';
import {
  answerFlex,
  categoryFlex,
  mainMenuFlex,
  noticeFlex,
  welcomeFlex,
} from '../flex/flex.builders';
import { parsePostback } from './postback.parser';

export type LineEvent = {
  type: string;
  webhookEventId?: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type?: string; text?: string };
  postback?: { data?: string };
};

@Injectable()
export class LineEventService {
  private readonly processed = new Set<string>();
  constructor(
    private readonly reply: LineReplyAdapter,
    private readonly faqs: FaqRepository,
    private readonly retrieval: RetrievalService,
    private readonly conversations: ConversationService,
    private readonly prisma: PrismaService,
  ) {}
  async handle(event: LineEvent): Promise<'processed' | 'duplicate' | 'ignored'> {
    const id = event.webhookEventId;
    if (id && (await this.isDuplicate(id))) return 'duplicate';
    const token = event.replyToken;
    if (!token) return 'ignored';
    if (event.type === 'follow') {
      await this.reply.reply(token, [welcomeFlex(), mainMenuFlex()]);
      return 'processed';
    }
    if (event.type === 'postback')
      return this.handlePostback(
        token,
        event.postback?.data ?? '',
        event.source?.userId ?? 'anonymous',
      );
    if (event.type === 'message' && event.message?.type === 'text')
      return this.handleText(token, event.message.text ?? '', event.source?.userId ?? 'anonymous');
    return 'ignored';
  }
  private async isDuplicate(id: string): Promise<boolean> {
    if (!this.prisma.available) {
      if (this.processed.has(id)) return true;
      this.processed.add(id);
      return false;
    }
    try {
      await this.prisma.webhookReceipt.create({ data: { eventId: id, status: 'processing' } });
      return false;
    } catch {
      return true;
    }
  }
  private async handlePostback(token: string, data: string, userId: string): Promise<'processed'> {
    const parsed = parsePostback(data);
    if (!parsed) {
      await this.reply.reply(token, [noticeFlex('คำสั่งไม่ถูกต้อง', 'กรุณากลับไปเลือกจากเมนูหลัก')]);
      return 'processed';
    }
    if (parsed.action === 'main_menu') await this.reply.reply(token, [mainMenuFlex()]);
    else if (parsed.action === 'faq_category') {
      const category = parsed.category;
      if (!category) {
        await this.reply.reply(token, [noticeFlex('คำสั่งไม่ถูกต้อง', 'กรุณากลับไปเลือกจากเมนูหลัก')]);
        return 'processed';
      }
      const rows = this.faqs.findByCategory(category);
      await this.reply.reply(token, [
        rows.length
          ? categoryFlex(category, rows)
          : noticeFlex('ยังไม่มีข้อมูลในหมวดนี้', 'กรุณาเลือกหัวข้ออื่นหรือติดต่อเจ้าหน้าที่'),
      ]);
    } else if (parsed.action === 'faq_detail') {
      const faq = parsed.faqId ? this.faqs.findById(parsed.faqId) : undefined;
      await this.reply.reply(token, [
        faq ? answerFlex(faq) : noticeFlex('ไม่พบข้อมูลที่เผยแพร่แล้ว', 'กรุณาติดต่อเจ้าหน้าที่'),
      ]);
    } else {
      await this.conversations.handoff(userId);
      await this.reply.reply(token, [
        noticeFlex('ติดต่อเจ้าหน้าที่', 'ส่งเลขคำสั่งซื้อและรายละเอียดสั้น ๆ ไว้ได้เลย เจ้าหน้าที่จะรับช่วงต่อ'),
      ]);
    }
    return 'processed';
  }
  private async handleText(token: string, text: string, userId: string): Promise<'processed'> {
    const current = await this.conversations.get(userId);
    if (current?.status === 'handoff') {
      await this.reply.reply(token, [
        noticeFlex('อยู่ระหว่างส่งต่อเจ้าหน้าที่', 'ส่งรายละเอียดเพิ่มเติมไว้ได้ โดยไม่ต้องส่งรหัสผ่านหรือข้อมูลบัตร'),
      ]);
      return 'processed';
    }
    await this.conversations.add(userId, maskSensitive(text));
    const result = await this.retrieval.retrieve(text);
    if (result.handoff) await this.conversations.handoff(userId);
    await this.reply.reply(token, [
      result.faq
        ? answerFlex(result.faq)
        : noticeFlex(
            result.mode === 'sensitive'
              ? 'คำเตือนข้อมูลส่วนตัว'
              : result.mode === 'customer_specific'
                ? 'ข้อมูลเฉพาะบัญชี'
                : 'ผลการค้นหา',
            result.answer,
          ),
    ]);
    return 'processed';
  }
}
