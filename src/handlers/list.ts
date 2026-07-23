import type { Context } from 'telegraf';

import { getWatchEntryById, getWatchlistPage } from '../services/watchlist.js';
import { formatWatchEntryCard, formatWatchlistPage } from '../ui/formatters.js';
import { buildWatchEntryKeyboard, buildWatchlistKeyboard } from '../ui/keyboards.js';

export async function handleListCommand(ctx: Context): Promise<void> {
  await replyWithWatchlistPage(ctx, 1);
}

export async function handleListPage(ctx: Context): Promise<void> {
  const page = getListPageFromCallback(ctx);

  await ctx.answerCbQuery();
  await replyWithWatchlistPage(ctx, page);
}

export async function handleEntryDetails(ctx: Context): Promise<void> {
  const id = getEntryIdFromCallback(ctx);

  if (!id) {
    await ctx.answerCbQuery('Не получилось открыть запись.');
    return;
  }

  await ctx.answerCbQuery();

  const entry = await getWatchEntryById(id);

  if (!entry) {
    await ctx.reply('Запись не найдена.');
    return;
  }

  await ctx.reply(formatWatchEntryCard(entry), buildWatchEntryKeyboard(entry.id));
}

async function replyWithWatchlistPage(ctx: Context, page: number): Promise<void> {
  const watchlistPage = await getWatchlistPage(page);
  const message = formatWatchlistPage(watchlistPage);
  const keyboard = buildWatchlistKeyboard(watchlistPage);

  await ctx.reply(message, keyboard);
}

function getListPageFromCallback(ctx: Context): number {
  const callbackQuery = ctx.callbackQuery;

  if (!callbackQuery || !('data' in callbackQuery)) {
    return 1;
  }

  const match = /^list:page:(\d+)$/.exec(callbackQuery.data);

  return match ? Number(match[1]) : 1;
}

function getEntryIdFromCallback(ctx: Context): string | null {
  const callbackQuery = ctx.callbackQuery;

  if (!callbackQuery || !('data' in callbackQuery)) {
    return null;
  }

  return /^entry:[0-9a-f-]+$/i.test(callbackQuery.data)
    ? callbackQuery.data.replace(/^entry:/, '')
    : null;
}
