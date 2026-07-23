import type { Context } from 'telegraf';

import { getWatchlistStats } from '../services/watchlist.js';
import { formatWatchlistStats } from '../ui/formatters.js';

export async function handleStatsCommand(ctx: Context): Promise<void> {
  await replyWithStats(ctx);
}

export async function handleStatsCallback(ctx: Context): Promise<void> {
  await ctx.answerCbQuery();
  await replyWithStats(ctx);
}

async function replyWithStats(ctx: Context): Promise<void> {
  const stats = await getWatchlistStats();
  await ctx.reply(formatWatchlistStats(stats));
}
