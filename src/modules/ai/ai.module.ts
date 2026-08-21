import { Module } from '@nestjs/common';
import { AI_PROVIDER } from './providers/ai-provider';
import { OllamaProvider } from './providers/ollama.provider';

@Module({
  providers: [OllamaProvider, { provide: AI_PROVIDER, useExisting: OllamaProvider }],
  exports: [AI_PROVIDER, OllamaProvider],
})
export class AiModule {}
