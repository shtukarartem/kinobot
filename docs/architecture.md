# Архитектура

## Общая схема

```text
Telegram
   |
   v
Telegraf bot
   |
   +--> Access middleware
   |
   +--> Command handlers
   |
   +--> Callback handlers
   |
   +--> Services
          |
          +--> PoiskKino client
          +--> Watchlist service
          +--> User service
          |
          v
      PostgreSQL
```

## Предлагаемая структура проекта

```text
src/
  bot.ts
  config.ts
  index.ts
  db/
    client.ts
    schema.ts
  middlewares/
    access.ts
    error-handler.ts
  handlers/
    start.ts
    search.ts
    list.ts
    callbacks.ts
  services/
    poiskkino.ts
    watchlist.ts
    users.ts
  ui/
    keyboards.ts
    formatters.ts
  types/
    poiskkino.ts
    domain.ts
```

## Слои

### `handlers`

Работают с Telegram-контекстом:

- читают текст пользователя;
- вызывают сервисы;
- отправляют сообщения;
- создают inline-кнопки.

В обработчиках не должно быть SQL и прямой работы с HTTP-клиентом ПоискКино.

### `services`

Содержат бизнес-логику:

- поиск тайтлов;
- добавление записи;
- проверка дублей;
- редактирование списка;
- форматирование доменных ошибок.

### `db`

Содержит ORM-клиент и схему базы.

### `ui`

Содержит Telegram-клавиатуры и форматтеры сообщений.

## Конфигурация

`src/config.ts` должен валидировать переменные окружения при старте:

- `TELEGRAM_BOT_TOKEN`;
- `POISKKINO_API_KEY`;
- `ALLOWED_TELEGRAM_USER_IDS`;
- `DATABASE_URL`.

Если обязательной переменной нет, приложение должно завершиться с понятной ошибкой.

## Доступ

Доступ лучше реализовать middleware:

```text
incoming update -> access middleware -> handlers
```

Middleware проверяет:

- есть ли `ctx.from`;
- входит ли `ctx.from.id` в список разрешенных пользователей.

Callback-запросы также проходят через этот middleware.

## Обработка ошибок

Нужно разделить ошибки:

- ожидаемые пользовательские ошибки;
- ошибки внешнего API;
- ошибки базы;
- неизвестные ошибки.

Пользователю показываем короткое сообщение. В лог пишем подробности.

## Хранение состояния

Для MVP лучше избегать сложных conversation-сценариев.

Простые состояния можно хранить в базе или в памяти:

- ожидание заметки;
- ожидание даты;
- ожидание текстового поиска.

Если бот будет запускаться в одном процессе, для MVP достаточно in-memory session. Если важна устойчивость после рестарта, состояние нужно хранить в PostgreSQL.

## Пагинация

Для списка просмотренного используем локальную пагинацию:

- `limit = 10`;
- `offset = page * limit`;
- callback data: `list:page:2`.

Callback data в Telegram ограничена 64 байтами, поэтому она должна быть короткой.

## PostgreSQL

Для разработки можно поднять PostgreSQL локально через Docker Compose.

Рекомендуемая строка подключения:

```env
DATABASE_URL=postgresql://kinobot:kinobot@localhost:5432/kinobot?schema=public
```

Для идентификаторов используем UUID, генерируемые на стороне приложения или базы. Для статусов лучше завести enum на уровне ORM и базы, чтобы не хранить произвольные строки.

## Логирование

Минимально достаточно `pino`:

- старт приложения;
- ошибки Telegram handlers;
- ошибки ПоискКино API;
- ошибки базы;
- попытки доступа от неизвестных пользователей.
