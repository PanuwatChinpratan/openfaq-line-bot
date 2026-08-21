import { Module } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { LocalEmbeddingService } from '../../infrastructure/embedding/local-embedding.service';
import { AiModule } from '../ai/ai.module';
import { FaqRepository } from './repositories/faq.repository';
import { RetrievalService } from './retrieval/retrieval.service';

@Module({
  imports: [AiModule],
  providers: [FaqRepository, RetrievalService, LocalEmbeddingService, PrismaService],
  exports: [FaqRepository, RetrievalService, LocalEmbeddingService, PrismaService],
})
export class KnowledgeModule {}
