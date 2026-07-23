import { Telegraf } from 'telegraf';

import { config } from './config.js';
import { handleSearchStart } from './handlers/callbacks.js';
import {
  handleAskDate,
  handleAskNote,
  handleDeleteAsk,
  handleDeleteConfirm,
  handleEditRatingMenu,
  handleEditStatusMenu,
  handlePendingEditText,
  handleSetRating,
  handleSetStatus,
  handleToggleTogether,
} from './handlers/edit.js';
import { handleEntryDetails, handleListCommand, handleListPage } from './handlers/list.js';
import { handleAddMovie, handleSearchCommand, handleTextSearch } from './handlers/search.js';
import { handleStatsCallback, handleStatsCommand } from './handlers/stats.js';
import { handleHelp, handleStart } from './handlers/start.js';
import { createAccessMiddleware } from './middlewares/access.js';
import { registerErrorHandler } from './middlewares/error-handler.js';

export function createBot(): Telegraf {
  const bot = new Telegraf(config.telegramBotToken);

  bot.use(createAccessMiddleware(config.allowedTelegramUserIds));

  bot.start(handleStart);
  bot.help(handleHelp);
  bot.command('list', handleListCommand);
  bot.command('stats', handleStatsCommand);
  bot.command('search', handleSearchCommand);
  bot.on('text', handlePendingEditText);
  bot.on('text', handleTextSearch);
  bot.action('search:start', handleSearchStart);
  bot.action(/^list:page:\d+$/, handleListPage);
  bot.action(/^entry:[0-9a-f-]+$/i, handleEntryDetails);
  bot.action(/^edit:status:[0-9a-f-]+$/i, handleEditStatusMenu);
  bot.action(/^edit:rating:[0-9a-f-]+$/i, handleEditRatingMenu);
  bot.action(/^set:status:[0-9a-f-]+:[a-z-]+$/i, handleSetStatus);
  bot.action(/^set:rating:[0-9a-f-]+:(clear|\d+)$/i, handleSetRating);
  bot.action(/^ask:note:[0-9a-f-]+$/i, handleAskNote);
  bot.action(/^ask:date:[0-9a-f-]+$/i, handleAskDate);
  bot.action(/^toggle:together:[0-9a-f-]+$/i, handleToggleTogether);
  bot.action(/^del:ask:[0-9a-f-]+$/i, handleDeleteAsk);
  bot.action(/^del:ok:[0-9a-f-]+$/i, handleDeleteConfirm);
  bot.action('stats:show', handleStatsCallback);
  bot.action(/^add:\d+$/, handleAddMovie);

  registerErrorHandler(bot);

  return bot;
}
