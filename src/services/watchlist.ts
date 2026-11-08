import type { RatingValue, Title, WatchEntry, WatchOpinion, WatchStatus } from '@prisma/client';

import { prisma } from '../db/client.js';
import type { MovieSearchResult } from '../types/poiskkino.js';

export type AddToWatchlistResult =
  | {
      status: 'added';
      entry: WatchEntry;
      title: Title;
    }
  | {
      status: 'already_exists';
      entry: WatchEntry;
      title: Title;
    };

export interface WatchlistUser {
  telegramUserId: string;
  username: string | null;
  firstName: string | null;
}

export interface WatchlistOpinion extends WatchOpinion {
  user: WatchlistUser;
}

export interface WatchlistEntry extends WatchEntry {
  title: Title;
  addedByUser: WatchlistUser;
  opinions: WatchlistOpinion[];
}

export interface WatchlistPage {
  entries: WatchlistEntry[];
  page: number;
  pages: number;
  total: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface WatchlistStats {
  total: number;
  watchedTogether: number;
  rated: number;
  byRating: Record<string, number>;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byUser: Array<{
    user: WatchlistEntry['addedByUser'];
    count: number;
  }>;
}

const WATCHLIST_PAGE_SIZE = 10;

export async function addMovieToWatchlist(
  movie: MovieSearchResult,
  telegramUserId: string,
): Promise<AddToWatchlistResult> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { telegramUserId },
    });

    if (!user) {
      throw new Error(`Allowed Telegram user was not found in database: ${telegramUserId}`);
    }

    const existingTitle = await tx.title.findUnique({
      where: { poiskkinoId: movie.poiskkinoId },
      include: { entry: true },
    });

    if (existingTitle?.entry) {
      return {
        status: 'already_exists',
        entry: existingTitle.entry,
        title: existingTitle,
      };
    }

    const title = await tx.title.upsert({
      where: { poiskkinoId: movie.poiskkinoId },
      create: buildTitlePayload(movie),
      update: buildTitlePayload(movie),
    });

    const entry = await tx.watchEntry.create({
      data: {
        titleId: title.id,
        addedByUserId: user.id,
        status: 'watched',
        watchedAt: new Date(),
      },
    });

    return {
      status: 'added',
      entry,
      title,
    };
  });
}

export async function getWatchlistPage(page: number): Promise<WatchlistPage> {
  const normalizedPage = Number.isInteger(page) && page > 0 ? page : 1;
  const total = await prisma.watchEntry.count();
  const pages = Math.max(Math.ceil(total / WATCHLIST_PAGE_SIZE), 1);
  const safePage = Math.min(normalizedPage, pages);

  const entries = await prisma.watchEntry.findMany({
    include: {
      title: true,
      addedByUser: {
        select: {
          telegramUserId: true,
          username: true,
          firstName: true,
        },
      },
      opinions: {
        include: {
          user: {
            select: {
              telegramUserId: true,
              username: true,
              firstName: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: [{ watchedAt: 'desc' }, { createdAt: 'desc' }],
    skip: (safePage - 1) * WATCHLIST_PAGE_SIZE,
    take: WATCHLIST_PAGE_SIZE,
  });

  return {
    entries,
    page: safePage,
    pages,
    total,
    hasPreviousPage: safePage > 1,
    hasNextPage: safePage < pages,
  };
}

export async function getWatchEntryById(id: string): Promise<WatchlistEntry | null> {
  return prisma.watchEntry.findUnique({
    where: { id },
    include: {
      title: true,
      addedByUser: {
        select: {
          telegramUserId: true,
          username: true,
          firstName: true,
        },
      },
      opinions: {
        include: {
          user: {
            select: {
              telegramUserId: true,
              username: true,
              firstName: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

export async function getWatchlistStats(): Promise<WatchlistStats> {
  const entries = await prisma.watchEntry.findMany({
    include: {
      title: true,
      addedByUser: {
        select: {
          telegramUserId: true,
          username: true,
          firstName: true,
        },
      },
      opinions: {
        include: {
          user: {
            select: {
              telegramUserId: true,
              username: true,
              firstName: true,
            },
          },
        },
      },
    },
  });

  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byRating: Record<string, number> = {};
  const byUserMap = new Map<
    string,
    {
      user: WatchlistEntry['addedByUser'];
      count: number;
    }
  >();
  let rated = 0;
  let watchedTogether = 0;

  for (const entry of entries) {
    byStatus[entry.status] = (byStatus[entry.status] ?? 0) + 1;
    byType[entry.title.type] = (byType[entry.title.type] ?? 0) + 1;

    const userKey = entry.addedByUser.telegramUserId;
    const currentUserCount = byUserMap.get(userKey);
    byUserMap.set(userKey, {
      user: entry.addedByUser,
      count: (currentUserCount?.count ?? 0) + 1,
    });

    for (const opinion of entry.opinions) {
      if (opinion.rating) {
        byRating[opinion.rating] = (byRating[opinion.rating] ?? 0) + 1;
        rated += 1;
      }
    }

    if (entry.watchedTogether) {
      watchedTogether += 1;
    }
  }

  return {
    total: entries.length,
    watchedTogether,
    rated,
    byRating,
    byStatus,
    byType,
    byUser: [...byUserMap.values()].sort((left, right) => right.count - left.count),
  };
}

export async function updateWatchEntryStatus(
  id: string,
  status: WatchStatus,
): Promise<WatchlistEntry | null> {
  await prisma.watchEntry.update({
    where: { id },
    data: {
      status,
      watchedAt: status === 'watched' ? new Date() : undefined,
    },
  });

  return getWatchEntryById(id);
}

export async function updateWatchOpinionRating(
  entryId: string,
  telegramUserId: string,
  rating: RatingValue | null,
): Promise<WatchlistEntry | null> {
  const user = await getUserByTelegramId(telegramUserId);

  await prisma.watchOpinion.upsert({
    where: {
      entryId_userId: { entryId, userId: user.id },
    },
    create: {
      entryId,
      userId: user.id,
      rating,
    },
    update: { rating },
  });

  return getWatchEntryById(entryId);
}

export async function updateWatchOpinionNote(
  entryId: string,
  telegramUserId: string,
  note: string | null,
): Promise<WatchlistEntry | null> {
  const user = await getUserByTelegramId(telegramUserId);

  await prisma.watchOpinion.upsert({
    where: {
      entryId_userId: { entryId, userId: user.id },
    },
    create: {
      entryId,
      userId: user.id,
      note,
    },
    update: { note },
  });

  return getWatchEntryById(entryId);
}

export async function updateWatchEntryWatchedAt(
  id: string,
  watchedAt: Date | null,
): Promise<WatchlistEntry | null> {
  await prisma.watchEntry.update({
    where: { id },
    data: { watchedAt },
  });

  return getWatchEntryById(id);
}

export async function toggleWatchEntryTogether(id: string): Promise<WatchlistEntry | null> {
  const entry = await prisma.watchEntry.findUnique({
    where: { id },
    select: { watchedTogether: true },
  });

  if (!entry) {
    return null;
  }

  await prisma.watchEntry.update({
    where: { id },
    data: { watchedTogether: !entry.watchedTogether },
  });

  return getWatchEntryById(id);
}

export async function deleteWatchEntry(id: string): Promise<void> {
  await prisma.watchEntry.delete({
    where: { id },
  });
}

async function getUserByTelegramId(telegramUserId: string) {
  const user = await prisma.user.findUnique({
    where: { telegramUserId },
  });

  if (!user) {
    throw new Error(`Allowed Telegram user was not found in database: ${telegramUserId}`);
  }

  return user;
}

function buildTitlePayload(movie: MovieSearchResult) {
  return {
    poiskkinoId: movie.poiskkinoId,
    name: movie.name,
    alternativeName: movie.alternativeName,
    type: movie.type ?? 'unknown',
    year: movie.year,
    description: movie.description,
    shortDescription: movie.shortDescription,
    posterUrl: movie.posterUrl,
    ratingKp: movie.ratingKp,
    ratingImdb: movie.ratingImdb,
  };
}
