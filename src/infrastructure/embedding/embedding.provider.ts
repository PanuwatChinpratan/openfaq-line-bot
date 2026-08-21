export interface EmbeddingProvider {
  readonly name: 'zai' | 'local' | 'disabled';
  readonly dimensions?: number;
  embed(texts: string[]): Promise<number[][]>;
  smokeTest(): Promise<boolean>;
}
export class DisabledEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'disabled' as const;
  async embed(): Promise<number[][]> {
    return [];
  }
  async smokeTest(): Promise<boolean> {
    return false;
  }
}
