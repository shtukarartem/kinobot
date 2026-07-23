import type { Context, MiddlewareFn } from 'telegraf';

import { ensureTelegramUser } from '../services/users.js';

const ACCESS_DENIED_MESSAGE = 'У вас нет доступа к этому боту.';

export function createAccessMiddleware(
  allowedTelegramUserIds: readonly string[],
): MiddlewareFn<Context> {
  const allowedIds = new Set(allowedTelegramUserIds);

  return async (ctx, next) => {
    const from = ctx.from;
    const telegramUserId = from?.id.toString();

    if (!from || !telegramUserId || !allowedIds.has(telegramUserId)) {
      console.warn('Rejected unauthorized Telegram update', {
        telegramUserId: telegramUserId ?? null,
        updateType: ctx.updateType,
      });

      if (ctx.callbackQuery) {
        await ctx.answerCbQuery(ACCESS_DENIED_MESSAGE);
        return;
      }

      await ctx.reply(ACCESS_DENIED_MESSAGE);
      return;
    }

    await ensureTelegramUser({
      telegramUserId,
      username: from.username ?? null,
      firstName: from.first_name ?? null,
    });

    await next();
  };
}
