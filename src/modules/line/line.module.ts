import { Module } from '@nestjs/common';
import { ConversationService } from '../conversations/conversation.service';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { LineReplyAdapter } from './adapters/line-reply.adapter';
import { LineWebhookController } from './controllers/line-webhook.controller';
import { LineEventService } from './handlers/line-event.service';

@Module({
  imports: [KnowledgeModule],
  controllers: [LineWebhookController],
  providers: [LineReplyAdapter, LineEventService, ConversationService],
  exports: [LineReplyAdapter, LineEventService],
})
export class LineModule {}
