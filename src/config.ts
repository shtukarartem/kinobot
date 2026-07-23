import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),
  POISKKINO_API_KEY: z.string().min(1, 'POISKKINO_API_KEY is required'),
  ALLOWED_TELEGRAM_USER_IDS: z
    .string()
    .min(1, 'ALLOWED_TELEGRAM_USER_IDS is required')
    .transform((value) =>
      value
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().regex(/^\d+$/, 'Telegram user id must be numeric')).min(1)),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection URL'),
  PORT: z.coerce.number().int().positive().max(65_535).default(3000),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const details = parsedEnv.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  throw new Error(`Invalid environment configuration:\n${details}`);
}

export const config = {
  telegramBotToken: parsedEnv.data.TELEGRAM_BOT_TOKEN,
  poiskkinoApiKey: parsedEnv.data.POISKKINO_API_KEY,
  allowedTelegramUserIds: parsedEnv.data.ALLOWED_TELEGRAM_USER_IDS,
  databaseUrl: parsedEnv.data.DATABASE_URL,
  port: parsedEnv.data.PORT,
} as const;
