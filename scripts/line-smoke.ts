import 'dotenv/config';
import { messagingApi } from '@line/bot-sdk';

async function main() {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not configured');
  const bot = await new messagingApi.MessagingApiClient({ channelAccessToken: token }).getBotInfo();
  console.log(JSON.stringify({ ok: true, displayName: bot.displayName, basicId: bot.basicId }));
}

main().catch((error) => {
  console.log(
    JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'unknown' }),
  );
  process.exitCode = 1;
});
