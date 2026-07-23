import type { Telegraf } from 'telegraf';

export function registerErrorHandler(bot: Telegraf): void {
  bot.catch(async (error, ctx) => {
    console.error('Unhandled Telegram update error', {
      error,
      updateId: ctx.update.update_id,
      updateType: ctx.updateType,
      telegramUserId: ctx.from?.id,
    });

    try {
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery('Что-то пошло не так. Попробуйте еще раз.');
        return;
      }

      await ctx.reply('Что-то пошло не так. Попробуйте позже.');
    } catch (replyError) {
      console.error('Failed to send error response', { error: replyError });
    }
  });
}
