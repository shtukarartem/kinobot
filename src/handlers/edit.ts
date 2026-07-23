import type { WatchStatus } from '@prisma/client';
import type { Context, MiddlewareFn } from 'telegraf';

import {
  deleteWatchEntry,
  getWatchEntryById,
  toggleWatchEntryTogether,
  updateWatchEntryNote,
  updateWatchEntryRating,
  updateWatchEntryStatus,
  updateWatchEntryWatchedAt,
} from '../services/watchlist.js';
import { formatWatchEntryCard } from '../ui/formatters.js';
import {
  buildDeleteConfirmKeyboard,
  buildRatingKeyboard,
  buildStatusKeyboard,
  buildWatchEntryKeyboard,
} from '../ui/keyboards.js';

type PendingEdit =
  | {
      kind: 'note';
      entryId: string;
    }
  | {
      kind: 'date';
      entryId: string;
    };

const pendingEdits = new Map<string, PendingEdit>();
const watchStatuses = new Set<WatchStatus>(['watched', 'watching', 'planned', 'dropped']);

export async function handleEditStatusMenu(ctx: Context): Promise<void> {
  const entryId = getCallbackEntryId(ctx, /^edit:status:([0-9a-f-]+)$/i);

  if (!entryId) {
    await ctx.answerCbQuery('Не получилось открыть статусы.');
    return;
  }

  await ctx.answerCbQuery();
  await ctx.reply('Выберите статус:', buildStatusKeyboard(entryId));
}

export async function handleEditRatingMenu(ctx: Context): Promise<void> {
  const entryId = getCallbackEntryId(ctx, /^edit:rating:([0-9a-f-]+)$/i);

  if (!entryId) {
    await ctx.answerCbQuery('Не получилось открыть оценки.');
    return;
  }

  await ctx.answerCbQuery();
  await ctx.reply('Выберите оценку:', buildRatingKeyboard(entryId));
}

export async function handleSetStatus(ctx: Context): Promise<void> {
  const callbackData = getCallbackData(ctx);
  const match = /^set:status:([0-9a-f-]+):([a-z-]+)$/i.exec(callbackData ?? '');
  const entryId = match?.[1];
  const status = match?.[2];

  if (!entryId || !isWatchStatus(status)) {
    await ctx.answerCbQuery('Не получилось изменить статус.');
    return;
  }

  await ctx.answerCbQuery();
  const entry = await updateWatchEntryStatus(entryId, status);
  await replyWithUpdatedEntry(ctx, entry, 'Статус обновлен.');
}

export async function handleSetRating(ctx: Context): Promise<void> {
  const callbackData = getCallbackData(ctx);
  const match = /^set:rating:([0-9a-f-]+):(clear|\d+)$/i.exec(callbackData ?? '');
  const entryId = match?.[1];
  const rawRating = match?.[2];
  const rating = rawRating === 'clear' ? null : Number(rawRating);

  if (!entryId || (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 10))) {
    await ctx.answerCbQuery('Не получилось изменить оценку.');
    return;
  }

  await ctx.answerCbQuery();
  const entry = await updateWatchEntryRating(entryId, rating);
  await replyWithUpdatedEntry(
    ctx,
    entry,
    rating === null ? 'Оценка сброшена.' : 'Оценка обновлена.',
  );
}

export async function handleAskNote(ctx: Context): Promise<void> {
  await askForTextValue(
    ctx,
    /^ask:note:([0-9a-f-]+)$/i,
    'note',
    'Напишите заметку следующим сообщением. Для очистки отправьте "-".',
  );
}

export async function handleAskDate(ctx: Context): Promise<void> {
  await askForTextValue(
    ctx,
    /^ask:date:([0-9a-f-]+)$/i,
    'date',
    'Напишите дату просмотра в формате ДД.ММ.ГГГГ. Для очистки отправьте "-".',
  );
}

export const handlePendingEditText: MiddlewareFn<Context> = async (ctx, next) => {
  const telegramUserId = ctx.from?.id.toString();
  const text = getTextMessage(ctx);
  const pendingEdit = telegramUserId ? pendingEdits.get(telegramUserId) : null;

  if (!telegramUserId || !text || !pendingEdit) {
    await next();
    return;
  }

  pendingEdits.delete(telegramUserId);

  if (pendingEdit.kind === 'note') {
    const note = text.trim() === '-' ? null : text.trim();
    const entry = await updateWatchEntryNote(pendingEdit.entryId, note);
    await replyWithUpdatedEntry(ctx, entry, note ? 'Заметка обновлена.' : 'Заметка очищена.');
    return;
  }

  const watchedAt = parseRuDate(text.trim());

  if (text.trim() !== '-' && !watchedAt) {
    await ctx.reply('Не понял дату. Используйте формат ДД.ММ.ГГГГ, например 23.07.2026.');
    return;
  }

  const entry = await updateWatchEntryWatchedAt(pendingEdit.entryId, watchedAt);
  await replyWithUpdatedEntry(ctx, entry, watchedAt ? 'Дата обновлена.' : 'Дата очищена.');
};

export async function handleToggleTogether(ctx: Context): Promise<void> {
  const entryId = getCallbackEntryId(ctx, /^toggle:together:([0-9a-f-]+)$/i);

  if (!entryId) {
    await ctx.answerCbQuery('Не получилось изменить запись.');
    return;
  }

  await ctx.answerCbQuery();
  const entry = await toggleWatchEntryTogether(entryId);
  await replyWithUpdatedEntry(ctx, entry, 'Запись обновлена.');
}

export async function handleDeleteAsk(ctx: Context): Promise<void> {
  const entryId = getCallbackEntryId(ctx, /^del:ask:([0-9a-f-]+)$/i);

  if (!entryId) {
    await ctx.answerCbQuery('Не получилось удалить запись.');
    return;
  }

  await ctx.answerCbQuery();
  const entry = await getWatchEntryById(entryId);

  if (!entry) {
    await ctx.reply('Запись не найдена.');
    return;
  }

  await ctx.reply(`Удалить "${entry.title.name}"?`, buildDeleteConfirmKeyboard(entryId));
}

export async function handleDeleteConfirm(ctx: Context): Promise<void> {
  const entryId = getCallbackEntryId(ctx, /^del:ok:([0-9a-f-]+)$/i);

  if (!entryId) {
    await ctx.answerCbQuery('Не получилось удалить запись.');
    return;
  }

  await ctx.answerCbQuery();
  await deleteWatchEntry(entryId);
  await ctx.reply('Запись удалена.');
}

async function askForTextValue(
  ctx: Context,
  pattern: RegExp,
  kind: PendingEdit['kind'],
  prompt: string,
): Promise<void> {
  const entryId = getCallbackEntryId(ctx, pattern);
  const telegramUserId = ctx.from?.id.toString();

  if (!entryId || !telegramUserId) {
    await ctx.answerCbQuery('Не получилось начать редактирование.');
    return;
  }

  await ctx.answerCbQuery();
  pendingEdits.set(telegramUserId, { kind, entryId });
  await ctx.reply(prompt);
}

async function replyWithUpdatedEntry(
  ctx: Context,
  entry: Awaited<ReturnType<typeof getWatchEntryById>>,
  message: string,
): Promise<void> {
  if (!entry) {
    await ctx.reply('Запись не найдена.');
    return;
  }

  await ctx.reply(message);
  await ctx.reply(formatWatchEntryCard(entry), buildWatchEntryKeyboard(entry.id));
}

function getCallbackEntryId(ctx: Context, pattern: RegExp): string | null {
  const callbackData = getCallbackData(ctx);
  const match = callbackData ? pattern.exec(callbackData) : null;

  return match?.[1] ?? null;
}

function getCallbackData(ctx: Context): string | null {
  const callbackQuery = ctx.callbackQuery;

  return callbackQuery && 'data' in callbackQuery ? callbackQuery.data : null;
}

function getTextMessage(ctx: Context): string | null {
  const message = ctx.message;

  return message && 'text' in message && typeof message.text === 'string' ? message.text : null;
}

function isWatchStatus(status: string | undefined): status is WatchStatus {
  return Boolean(status && watchStatuses.has(status as WatchStatus));
}

function parseRuDate(value: string): Date | null {
  if (value === '-') {
    return null;
  }

  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}
