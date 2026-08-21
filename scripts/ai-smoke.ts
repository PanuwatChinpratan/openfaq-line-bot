import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { OllamaProvider } from '../src/modules/ai/providers/ollama.provider';

async function main() {
  const result = await new OllamaProvider(new ConfigService(process.env)).smokeTest();
  console.log(
    JSON.stringify({ provider: 'ollama', model: result.model, ok: result.ok, error: result.error }),
  );
  if (!result.ok) process.exitCode = 1;
}

void main();
