import { messagingApi } from '@line/bot-sdk';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LineReplyAdapter {
  private readonly client: messagingApi.MessagingApiClient | null;
  readonly sent: Array<{ messages: unknown[] }> = [];
  constructor(config: ConfigService) {
    const token = config.get<string>('LINE_CHANNEL_ACCESS_TOKEN', '');
    this.client = token ? new messagingApi.MessagingApiClient({ channelAccessToken: token }) : null;
  }
  async reply(replyToken: string, messages: unknown[]): Promise<void> {
    if (!this.client) {
      this.sent.push({ messages });
      return;
    }
    await this.client.replyMessage({ replyToken, messages: messages as messagingApi.Message[] });
  }
  get mode(): 'real' | 'mock' {
    return this.client ? 'real' : 'mock';
  }
}
