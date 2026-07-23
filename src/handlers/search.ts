import type { Context } from 'telegraf';

import { poiskKinoClient } from '../services/poiskkino.js';
import { addMovieToWatchlist } from '../services/watchlist.js';
import type { MovieSearchResult } from '../types/poiskkino.js';
import { PoiskKinoApiError } from '../types/poiskkino.js';
import { formatSearchResultCaption } from '../ui/formatters.js';
import { buildAddMovieKeyboard } from '../ui/keyboards.js';

const EMPTY_SEARCH_MESSAGE = 'Напишите название после команды. Например: /search Интерстеллар';

export async function handleSearchCommand(ctx: Context): Promise<void> {
  const query = getCommandPayload(ctx);

  if (!query) {
    await ctx.reply(EMPTY_SEARCH_MESSAGE);
    return;
  }

  await searchAndReply(ctx, query);
}

export async function handleTextSearch(ctx: Context): Promise<void> {
  const text = getTextMessage(ctx);

  if (!text || text.startsWith('/')) {
    return;
  }

  await searchAndReply(ctx, text);
}

export async function handleAddMovie(ctx: Context): Promise<void> {
  const poiskkinoId = getAddCallbackPoiskKinoId(ctx);
  const telegramUserId = ctx.from?.id.toString();

  if (!poiskkinoId || !telegramUserId) {
    await ctx.answerCbQuery('Не получилось определить тайтл.');
    return;
  }

  await ctx.answerCbQuery();

  try {
    const movie = await poiskKinoClient.getById(poiskkinoId);

    if (!movie) {
      await ctx.reply('Не получилось найти этот тайтл в ПоискКино.');
      return;
    }

    const result = await addMovieToWatchlist(movie, telegramUserId);
    const titleLabel = formatTitleLabel(result.title.name, result.title.year);

    if (result.status === 'already_exists') {
      await ctx.reply(`Уже есть в списке: ${titleLabel}`);
      return;
    }

    await ctx.reply(`Добавлено: ${titleLabel}`);
  } catch (error) {
    if (error instanceof PoiskKinoApiError) {
      console.error('PoiskKino getById failed', {
        status: error.status,
        poiskkinoId,
      });

      await ctx.reply(getPoiskKinoErrorMessage(error.status));
      return;
    }

    throw error;
  }
}

async function searchAndReply(ctx: Context, query: string): Promise<void> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    await ctx.reply(EMPTY_SEARCH_MESSAGE);
    return;
  }

  try {
    const movies = await poiskKinoClient.search(normalizedQuery);

    if (movies.length === 0) {
      await ctx.reply('Ничего не нашел. Попробуйте другой запрос.');
      return;
    }

    await ctx.reply(`Нашел ${movies.length} вариантов по запросу: ${normalizedQuery}`);

    for (const [index, movie] of movies.entries()) {
      await replyWithMovieCard(ctx, movie, index + 1);
    }
  } catch (error) {
    if (error instanceof PoiskKinoApiError) {
      console.error('PoiskKino search failed', {
        status: error.status,
        query: normalizedQuery,
      });

      await ctx.reply(getPoiskKinoErrorMessage(error.status));
      return;
    }

    throw error;
  }
}

async function replyWithMovieCard(
  ctx: Context,
  movie: MovieSearchResult,
  index: number,
): Promise<void> {
  const caption = formatSearchResultCaption(movie, index);
  const keyboard = buildAddMovieKeyboard(movie, index);

  if (movie.posterUrl) {
    try {
      await ctx.replyWithPhoto(movie.posterUrl, {
        caption,
        ...keyboard,
      });
      return;
    } catch (error) {
      console.warn('Failed to send movie poster, falling back to text card', {
        poiskkinoId: movie.poiskkinoId,
        error,
      });
    }
  }

  await ctx.reply(caption, keyboard);
}

function getCommandPayload(ctx: Context): string | null {
  const text = getTextMessage(ctx);

  if (!text) {
    return null;
  }

  return text.replace(/^\/search(@\w+)?\s*/i, '').trim() || null;
}

function getAddCallbackPoiskKinoId(ctx: Context): number | null {
  const callbackQuery = ctx.callbackQuery;

  if (!callbackQuery || !('data' in callbackQuery)) {
    return null;
  }

  const match = /^add:(\d+)$/.exec(callbackQuery.data);

  return match ? Number(match[1]) : null;
}

function formatTitleLabel(name: string, year: number | null): string {
  return year ? `${name}, ${year}` : name;
}

function getTextMessage(ctx: Context): string | null {
  const message = ctx.message;

  return message && 'text' in message && typeof message.text === 'string' ? message.text : null;
}

function getPoiskKinoErrorMessage(status: number): string {
  if (status === 401) {
    return 'Поиск не настроен: неверный ключ ПоискКино API.';
  }

  if (status === 403) {
    return 'Лимит ПоискКино API исчерпан. Попробуйте позже.';
  }

  return 'Не получилось выполнить поиск. Попробуйте позже.';
}
