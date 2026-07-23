# KinoBot

Telegram-бот для совместного списка просмотренных фильмов и сериалов.

Бот рассчитан на двух пользователей: каждый может искать тайтлы через ПоискКино API, добавлять их в общий список, смотреть список и редактировать записи.

## Цель MVP

Сделать приватного Telegram-бота, который:

- допускает только двух разрешенных пользователей;
- ищет фильмы и сериалы по названию;
- показывает результаты поиска с краткой информацией;
- добавляет выбранный тайтл в общий список;
- показывает общий список просмотренного;
- позволяет редактировать статус, оценку, заметку и дату просмотра;
- не добавляет один и тот же тайтл повторно без подтверждения.

## Технологии

- Node.js 20+
- TypeScript
- Telegraf для Telegram Bot API
- PostgreSQL для хранения данных
- Prisma ORM
- ПоискКино API: https://api.poiskkino.dev

## Документация

- [Требования](./docs/requirements.md)
- [Пользовательские сценарии](./docs/user-flows.md)
- [Архитектура](./docs/architecture.md)
- [Модель данных](./docs/data-model.md)
- [Интеграция с ПоискКино API](./docs/poiskkino-api.md)
- [План разработки](./docs/roadmap.md)

## Переменные окружения

```env
TELEGRAM_BOT_TOKEN=
POISKKINO_API_KEY=
ALLOWED_TELEGRAM_USER_IDS=
DATABASE_URL=postgresql://kinobot:kinobot@localhost:5432/kinobot?schema=public
POSTGRES_PASSWORD=kinobot
PORT=3000
```

`ALLOWED_TELEGRAM_USER_IDS` хранит два Telegram user id через запятую:

```env
ALLOWED_TELEGRAM_USER_IDS=123456789,987654321
```

## PostgreSQL

Для локальной разработки база поднимается через Docker Compose:

```bash
docker compose up -d postgres
```

Для локального Docker Compose нужен `POSTGRES_PASSWORD`:

```env
POSTGRES_PASSWORD=kinobot
```

Строка подключения для этой базы:

```env
DATABASE_URL=postgresql://kinobot:kinobot@localhost:5432/kinobot?schema=public
```

## Разработка

Установка зависимостей:

```bash
npm install
```

Запуск в dev-режиме:

```bash
npm run dev
```

Проверки:

```bash
npm run check
npm run lint
npm run format:check
```

## База данных

После установки зависимостей нужно сгенерировать Prisma Client и применить миграции:

```bash
npm run db:generate
npm run db:migrate
```

Prisma Studio:

```bash
npm run db:studio
```

## Деплой

Проект подготовлен для Dokploy/Docker Compose в том же стиле, что и `CarCeeper`.

Для деплоя через `docker-compose.yml` нужны переменные окружения:

```env
TELEGRAM_BOT_TOKEN=
POISKKINO_API_KEY=
ALLOWED_TELEGRAM_USER_IDS=123456789,987654321
POSTGRES_PASSWORD=strong-production-password
```

Compose поднимает два сервиса:

- `kinobot` - приложение;
- `postgres` - PostgreSQL внутри compose-сети.

Перед стартом контейнер приложения выполняет:

```bash
npm run db:deploy
```

Healthcheck endpoint:

```http
GET /health
```

PostgreSQL проброшен только на loopback хоста для безопасного доступа через SSH tunnel:

```text
127.0.0.1:5433 -> postgres:5432
```

Параметры для Navicat через SSH tunnel:

```text
Host: 127.0.0.1
Port: 5433
Database: kinobot
User: kinobot
Password: значение POSTGRES_PASSWORD
```

Если используешь внешний PostgreSQL в Dokploy, укажи свой `DATABASE_URL` в переменных окружения приложения и убери сервис `postgres` из compose-конфига.

## Основные команды бота

| Команда   | Назначение                      |
| --------- | ------------------------------- |
| `/start`  | Проверка доступа и краткое меню |
| `/search` | Поиск фильма или сериала        |
| `/list`   | Общий список просмотренного     |
| `/stats`  | Статистика по списку            |
| `/help`   | Справка                         |

Основной сценарий поиска можно сделать не только через команды, но и через обычный текст: пользователь пишет название, бот предлагает результаты.

В карточке записи доступны редактирование статуса, оценки, заметки, даты просмотра, флага совместного просмотра и удаление.

## Статусы записей

- `watched` - просмотрено;
- `watching` - смотрим сейчас;
- `planned` - хотим посмотреть;
- `dropped` - бросили.

Для MVP главный статус - `watched`, остальные можно добавить сразу в модель данных, даже если интерфейс появится позже.

## Режим доступа

Бот приватный. Любой запрос от пользователя, чей `telegram_user_id` не входит в `ALLOWED_TELEGRAM_USER_IDS`, должен получать короткий отказ без доступа к данным.

## Источники API

ПоискКино API требует токен и использует заголовок `X-API-KEY`. Документация API доступна на https://api.poiskkino.dev/documentation.
