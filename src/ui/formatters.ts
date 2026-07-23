import type { MovieSearchResult, MovieType } from '../types/poiskkino.js';
import type { WatchlistEntry, WatchlistPage, WatchlistStats } from '../services/watchlist.js';

const movieTypeLabels: Record<MovieType, string> = {
  movie: 'Фильм',
  'tv-series': 'Сериал',
  cartoon: 'Мультфильм',
  'animated-series': 'Мультсериал',
  anime: 'Аниме',
  'tv-show': 'ТВ-шоу',
};

export function formatSearchResult(movie: MovieSearchResult, index: number): string {
  const title = [`${index}. ${movie.name}`, movie.year ? `(${movie.year})` : null]
    .filter(Boolean)
    .join(' ');
  const type = movie.type ? movieTypeLabels[movie.type] : 'Тип неизвестен';
  const rating = movie.ratingKp ? `КП ${movie.ratingKp.toFixed(1)}` : null;
  const description = movie.shortDescription ?? movie.description;

  return [title, [type, rating].filter(Boolean).join(' | '), description]
    .filter(Boolean)
    .join('\n');
}

export function formatSearchResults(query: string, movies: MovieSearchResult[]): string {
  return [`Нашел по запросу: ${query}`, '', ...movies.map(formatSearchResult)].join('\n\n');
}

export function formatSearchResultCaption(movie: MovieSearchResult, index: number): string {
  return truncate(formatSearchResult(movie, index), 1_024);
}

export function formatWatchlistPage(watchlistPage: WatchlistPage): string {
  if (watchlistPage.total === 0) {
    return 'Список пока пуст. Найдите фильм или сериал и нажмите Добавить.';
  }

  const header = `Список просмотренного: ${watchlistPage.total}\nСтраница ${watchlistPage.page}/${watchlistPage.pages}`;
  const rows = watchlistPage.entries.map((entry, index) => formatWatchlistRow(entry, index + 1));

  return [header, '', ...rows].join('\n');
}

export function formatWatchEntryCard(entry: WatchlistEntry): string {
  const title = formatTitle(entry.title.name, entry.title.year);
  const type = formatTitleType(entry.title.type);
  const rating = entry.rating ? `Оценка: ${entry.rating}/10` : null;
  const addedBy = `Добавил: ${formatTelegramUser(entry.addedByUser)}`;
  const watchedAt = entry.watchedAt ? `Просмотрено: ${formatDate(entry.watchedAt)}` : null;
  const watchedTogether = entry.watchedTogether ? 'Смотрели вместе: да' : null;
  const note = entry.note ? `Заметка: ${entry.note}` : null;
  const description = entry.title.shortDescription ?? entry.title.description;

  return [
    title,
    [type, formatStatus(entry.status)].filter(Boolean).join(' | '),
    rating,
    addedBy,
    watchedAt,
    watchedTogether,
    note,
    description,
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatWatchlistStats(stats: WatchlistStats): string {
  if (stats.total === 0) {
    return 'Статистика пока пустая. Добавьте первый фильм или сериал.';
  }

  return [
    'Статистика',
    '',
    `Всего в списке: ${stats.total}`,
    `Смотрели вместе: ${stats.watchedTogether}`,
    stats.averageRating ? `Средняя оценка: ${stats.averageRating.toFixed(1)}/10` : null,
    stats.rated > 0 ? `Оценено: ${stats.rated}` : null,
    '',
    'По статусам:',
    ...formatCountLines(stats.byStatus, formatStatus),
    '',
    'По типам:',
    ...formatCountLines(stats.byType, formatTitleType),
    '',
    'Кто добавлял:',
    ...stats.byUser.map(({ user, count }) => `${formatTelegramUser(user)}: ${count}`),
  ]
    .filter(Boolean)
    .join('\n');
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function formatWatchlistRow(entry: WatchlistEntry, index: number): string {
  const title = formatTitle(entry.title.name, entry.title.year);
  const rating = entry.rating ? ` | ${entry.rating}/10` : '';

  return `${index}. ${title} | ${formatStatus(entry.status)}${rating}`;
}

function formatTitle(name: string, year: number | null): string {
  return year ? `${name}, ${year}` : name;
}

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    watched: 'Просмотрено',
    watching: 'Смотрим',
    planned: 'В планах',
    dropped: 'Брошено',
  };

  return labels[status] ?? status;
}

function formatTitleType(type: string): string {
  return type in movieTypeLabels ? movieTypeLabels[type as MovieType] : type;
}

function formatTelegramUser(user: WatchlistEntry['addedByUser']): string {
  return user.username ? `@${user.username}` : (user.firstName ?? user.telegramUserId);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatCountLines(
  counts: Record<string, number>,
  labelFormatter: (value: string) => string,
): string[] {
  const lines = Object.entries(counts)
    .sort((left, right) => right[1] - left[1])
    .map(([key, count]) => `${labelFormatter(key)}: ${count}`);

  return lines.length > 0 ? lines : ['Нет данных'];
}
