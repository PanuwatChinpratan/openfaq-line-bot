import pino, { type Logger } from 'pino';
import { maskSensitive } from '../security/sanitize';

export function createSafeLogger(level = 'info'): Logger {
  return pino({
    level,
    redact: {
      paths: ['*.token', '*.secret', '*.apiKey', '*.replyToken', 'req.headers.authorization'],
      censor: '[REDACTED]',
    },
    hooks: {
      logMethod(args, method) {
        for (let index = 0; index < args.length; index += 1) {
          const argument = args[index];
          if (typeof argument === 'string') args[index] = maskSensitive(argument);
        }
        method.apply(this, args);
      },
    },
  });
}
