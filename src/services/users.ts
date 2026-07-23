import { prisma } from '../db/client.js';

export interface TelegramUserProfile {
  telegramUserId: string;
  username: string | null;
  firstName: string | null;
}

export async function ensureTelegramUser(profile: TelegramUserProfile): Promise<void> {
  await prisma.user.upsert({
    where: {
      telegramUserId: profile.telegramUserId,
    },
    create: {
      telegramUserId: profile.telegramUserId,
      username: profile.username,
      firstName: profile.firstName,
    },
    update: {
      username: profile.username,
      firstName: profile.firstName,
    },
  });
}
