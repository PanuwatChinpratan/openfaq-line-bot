import {
  Controller,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { verifyLineSignature } from '../../../common/security/signature';
import { type LineEvent, LineEventService } from '../handlers/line-event.service';

@Controller('webhooks')
export class LineWebhookController {
  constructor(
    private readonly config: ConfigService,
    private readonly events: LineEventService,
  ) {}
  @Post('line')
  @HttpCode(200)
  async webhook(
    @Req() req: Request,
    @Headers('x-line-signature') signature?: string,
  ): Promise<{ ok: true; results: string[] }> {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
    if (!verifyLineSignature(raw, signature, this.config.get<string>('LINE_CHANNEL_SECRET', '')))
      throw new HttpException('Invalid LINE signature', HttpStatus.UNAUTHORIZED);
    let body: { events?: LineEvent[] };
    try {
      body = JSON.parse(raw.toString('utf8')) as { events?: LineEvent[] };
    } catch {
      throw new HttpException('Invalid JSON', HttpStatus.BAD_REQUEST);
    }
    if (!Array.isArray(body.events))
      throw new HttpException('Invalid event payload', HttpStatus.BAD_REQUEST);
    const results = await Promise.all(
      body.events.map(async (event) => {
        try {
          return await this.events.handle(event);
        } catch {
          return 'ignored' as const;
        }
      }),
    );
    return { ok: true, results };
  }
}
