import type { Context } from 'telegraf';
import { Markup } from 'telegraf';

const mainMenu = Markup.inlineKeyboard([
  [
    Markup.button.callback('Найти', 'search:start'),
    Markup.button.callback('Список', 'list:page:1'),
  ],
  [Markup.button.callback('Статистика', 'stats:show')],
]);

export async function handleStart(ctx: Context): Promise<void> {
  await ctx.reply('Что делаем?', mainMenu);
}

export async function handleHelp(ctx: Context): Promise<void> {
  await ctx.reply(
    [
      'Команды:',
      '/search название - найти фильм или сериал',
      '/list - открыть общий список',
      '/stats - показать статистику',
      '/help - справка',
      '',
      'Можно просто написать название фильма или сериала без команды.',
      'В карточке записи доступны статус, оценка, заметка, дата, совместный просмотр и удаление.',
    ].join('\n'),
  );
}
