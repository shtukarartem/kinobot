import { Markup } from 'telegraf';

import type { WatchlistPage } from '../services/watchlist.js';
import type { MovieSearchResult } from '../types/poiskkino.js';

type InlineButton = ReturnType<typeof Markup.button.callback>;

export function buildSearchResultsKeyboard(movies: MovieSearchResult[]) {
  return Markup.inlineKeyboard(
    movies.map((movie, index) => [
      Markup.button.callback(`Добавить ${index + 1}`, `add:${movie.poiskkinoId}`),
    ]),
  );
}

export function buildAddMovieKeyboard(movie: MovieSearchResult, index: number) {
  return Markup.inlineKeyboard([
    Markup.button.callback(`Добавить ${index}`, `add:${movie.poiskkinoId}`),
  ]);
}

export function buildWatchlistKeyboard(watchlistPage: WatchlistPage) {
  const entryRows = watchlistPage.entries.map((entry, index) => [
    Markup.button.callback(`Открыть ${index + 1}`, `entry:${entry.id}`),
  ]);
  const paginationRow = [
    watchlistPage.hasPreviousPage
      ? Markup.button.callback('Назад', `list:page:${watchlistPage.page - 1}`)
      : null,
    watchlistPage.hasNextPage
      ? Markup.button.callback('Вперед', `list:page:${watchlistPage.page + 1}`)
      : null,
  ].filter((button): button is InlineButton => button !== null);

  return Markup.inlineKeyboard(
    paginationRow.length > 0 ? [...entryRows, paginationRow] : entryRows,
  );
}

export function buildWatchEntryKeyboard(entryId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('Статус', `edit:status:${entryId}`),
      Markup.button.callback('Оценка', `edit:rating:${entryId}`),
    ],
    [
      Markup.button.callback('Заметка', `ask:note:${entryId}`),
      Markup.button.callback('Дата', `ask:date:${entryId}`),
    ],
    [
      Markup.button.callback('Смотрели вместе', `toggle:together:${entryId}`),
      Markup.button.callback('Удалить', `del:ask:${entryId}`),
    ],
  ]);
}

export function buildStatusKeyboard(entryId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('Просмотрено', `set:status:${entryId}:watched`),
      Markup.button.callback('Смотрим', `set:status:${entryId}:watching`),
    ],
    [
      Markup.button.callback('В планах', `set:status:${entryId}:planned`),
      Markup.button.callback('Брошено', `set:status:${entryId}:dropped`),
    ],
    [Markup.button.callback('Назад', `entry:${entryId}`)],
  ]);
}

export function buildRatingKeyboard(entryId: string) {
  const rows: InlineButton[][] = [
    [1, 2, 3, 4, 5].map((rating) =>
      Markup.button.callback(String(rating), `set:rating:${entryId}:${rating}`),
    ),
    [6, 7, 8, 9, 10].map((rating) =>
      Markup.button.callback(String(rating), `set:rating:${entryId}:${rating}`),
    ),
    [
      Markup.button.callback('Сбросить', `set:rating:${entryId}:clear`),
      Markup.button.callback('Назад', `entry:${entryId}`),
    ],
  ];

  return Markup.inlineKeyboard(rows);
}

export function buildDeleteConfirmKeyboard(entryId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('Да, удалить', `del:ok:${entryId}`),
      Markup.button.callback('Отмена', `entry:${entryId}`),
    ],
  ]);
}
