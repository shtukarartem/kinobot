import { createBot } from './bot.js';
import { config } from './config.js';
import { disconnectDatabase } from './db/client.js';
import { startHealthServer } from './server/healthServer.js';

const bot = createBot();
let stopHealthServer: (() => Promise<void>) | null = null;

async function main(): Promise<void> {
  console.info('KinoBot starting', {
    allowedUsersCount: config.allowedTelegramUserIds.length,
    databaseHost: new URL(config.databaseUrl).host,
  });

  const healthServer = await startHealthServer(config.port);
  stopHealthServer = () =>
    new Promise((resolve, reject) => {
      healthServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

  await bot.telegram.setMyCommands([
    { command: 'start', description: 'Открыть меню' },
    { command: 'search', description: 'Найти фильм или сериал' },
    { command: 'list', description: 'Открыть общий список' },
    { command: 'stats', description: 'Показать статистику' },
    { command: 'help', description: 'Справка' },
  ]);

  await bot.launch();

  console.info('KinoBot started');
}

async function shutdown(signal: string): Promise<void> {
  console.info(`KinoBot stopping: ${signal}`);
  bot.stop(signal);

  await Promise.all([disconnectDatabase(), stopHealthServer?.()]);
}

process.once('SIGINT', () => {
  void shutdown('SIGINT');
});

process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});

void main().catch(async (error: unknown) => {
  console.error('Failed to start KinoBot', { error });
  await Promise.all([disconnectDatabase(), stopHealthServer?.()]);
  process.exitCode = 1;
});
