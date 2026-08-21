import { createHmac } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as express from 'express';
import helmet from 'helmet';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { LineReplyAdapter } from '../src/modules/line/adapters/line-reply.adapter';

const describeNetwork = process.env.RUN_NETWORK_TESTS === '1' ? describe : describe.skip;

describeNetwork('app e2e', () => {
  let app: INestApplication;
  let adapter: LineReplyAdapter;
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.LINE_CHANNEL_SECRET = 'test-secret';
    process.env.LINE_CHANNEL_ACCESS_TOKEN = '';
    process.env.AI_MODE = 'public-lite';
    process.env.EMBEDDING_PROVIDER = 'disabled';
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication({ bodyParser: false });
    app.use(helmet());
    app.use('/webhooks/line', express.raw({ type: 'application/json', limit: '1mb' }));
    app.use(express.json());
    await app.init();
    adapter = app.get(LineReplyAdapter);
  });
  afterAll(async () => app.close());
  const signed = (body: object) => {
    const raw = JSON.stringify(body);
    return { raw, signature: createHmac('sha256', 'test-secret').update(raw).digest('base64') };
  };
  test('GET health and ready', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe('ok'));
    await request(app.getHttpServer())
      .get('/ready')
      .expect(200)
      .expect(({ body }) => expect(body.approvedFaqCount).toBeGreaterThanOrEqual(30));
  });
  test('rejects invalid signature before processing', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/line')
      .set('content-type', 'application/json')
      .set('x-line-signature', 'bad')
      .send('{"events":[]}')
      .expect(401);
  });
  test.each([
    [
      'follow',
      { type: 'follow', webhookEventId: 'e-follow', replyToken: 'r1', source: { userId: 'u1' } },
    ],
    [
      'postback',
      {
        type: 'postback',
        webhookEventId: 'e-postback',
        replyToken: 'r2',
        source: { userId: 'u2' },
        postback: { data: 'action=faq_detail&faqId=returns.window' },
      },
    ],
    [
      'text',
      {
        type: 'message',
        webhookEventId: 'e-text',
        replyToken: 'r3',
        source: { userId: 'u3' },
        message: { type: 'text', text: 'คืนสินค้าได้ไหม' },
      },
    ],
  ])('handles %s event', async (_, event) => {
    const payload = { events: [event] };
    const { signature } = signed(payload);
    await request(app.getHttpServer())
      .post('/webhooks/line')
      .set('content-type', 'application/json')
      .set('x-line-signature', signature)
      .send(payload)
      .expect(200)
      .expect(({ body }) => expect(body.results[0]).toBe('processed'));
  });
  test('deduplicates webhook event', async () => {
    const event = { type: 'follow', webhookEventId: 'same', replyToken: 'r4' };
    const payload = { events: [event] };
    const first = signed(payload);
    await request(app.getHttpServer())
      .post('/webhooks/line')
      .set('content-type', 'application/json')
      .set('x-line-signature', first.signature)
      .send(payload)
      .expect(200);
    await request(app.getHttpServer())
      .post('/webhooks/line')
      .set('content-type', 'application/json')
      .set('x-line-signature', first.signature)
      .send(payload)
      .expect(200)
      .expect(({ body }) => expect(body.results[0]).toBe('duplicate'));
    expect(adapter.sent.length).toBeGreaterThan(0);
  });
});
