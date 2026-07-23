import type { Context } from 'telegraf';

export async function handleSearchStart(ctx: Context): Promise<void> {
  await ctx.answerCbQuery();
  await ctx.reply('Напишите название фильма или сериала.');
}
