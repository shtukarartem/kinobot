# Модель данных

## Сущности

### User

Пользователь Telegram, которому разрешен доступ.

| Поле             | Тип          | Описание          |
| ---------------- | ------------ | ----------------- |
| `id`             | uuid         | Внутренний id     |
| `telegramUserId` | string       | Telegram user id  |
| `username`       | string, null | Telegram username |
| `firstName`      | string, null | Имя из Telegram   |
| `createdAt`      | datetime     | Дата создания     |
| `updatedAt`      | datetime     | Дата обновления   |

### Title

Кино или сериал из ПоискКино.

| Поле               | Тип           | Описание                                                                    |
| ------------------ | ------------- | --------------------------------------------------------------------------- |
| `id`               | uuid          | Внутренний id                                                               |
| `poiskkinoId`      | integer       | Id тайтла в ПоискКино                                                       |
| `name`             | string        | Русское название или fallback                                               |
| `alternativeName`  | string, null  | Оригинальное или альтернативное название                                    |
| `type`             | string        | Тип: `movie`, `tv-series`, `cartoon`, `animated-series`, `anime`, `tv-show` |
| `year`             | integer, null | Год                                                                         |
| `description`      | string, null  | Описание                                                                    |
| `shortDescription` | string, null  | Краткое описание                                                            |
| `posterUrl`        | string, null  | URL постера                                                                 |
| `ratingKp`         | float, null   | Рейтинг Кинопоиска                                                          |
| `ratingImdb`       | float, null   | Рейтинг IMDb                                                                |
| `createdAt`        | datetime      | Дата создания                                                               |
| `updatedAt`        | datetime      | Дата обновления                                                             |

### WatchEntry

Запись в общем списке.

| Поле              | Тип            | Описание                                    |
| ----------------- | -------------- | ------------------------------------------- |
| `id`              | uuid           | Внутренний id                               |
| `titleId`         | uuid           | Ссылка на `Title`                           |
| `addedByUserId`   | uuid           | Кто добавил                                 |
| `status`          | enum           | `watched`, `watching`, `planned`, `dropped` |
| `watchedAt`       | datetime, null | Дата просмотра                              |
| `watchedTogether` | boolean        | Смотрели вместе                             |
| `createdAt`       | datetime       | Дата создания                               |
| `updatedAt`       | datetime       | Дата обновления                             |

### WatchOpinion

Персональная оценка и заметка пользователя к записи общего списка.

| Поле        | Тип          | Описание                                        |
| ----------- | ------------ | ----------------------------------------------- |
| `id`        | uuid         | Внутренний id                                   |
| `entryId`   | uuid         | Ссылка на `WatchEntry`                          |
| `userId`    | uuid         | Автор оценки и заметки                          |
| `rating`    | enum, null   | `trash`, `passable`, `commendable`, `excellent` |
| `note`      | string, null | Персональная заметка                            |
| `createdAt` | datetime     | Дата создания                                   |
| `updatedAt` | datetime     | Дата обновления                                 |

## Ограничения

- `Title.poiskkinoId` должен быть уникальным.
- `WatchEntry.titleId` должен быть уникальным для MVP, чтобы не было дублей в общем списке.
- Пара `WatchOpinion.entryId + WatchOpinion.userId` должна быть уникальной.
- У каждого пользователя может быть только одна оценка и одна заметка на тайтл.

## Индексы

Рекомендуемые индексы:

- `User.telegramUserId`;
- `Title.poiskkinoId`;
- `WatchEntry.status`;
- `WatchEntry.watchedAt`;
- `WatchEntry.createdAt`.

## Пример Prisma-схемы

```prisma
enum WatchStatus {
  watched
  watching
  planned
  dropped
}

enum RatingValue {
  trash
  passable
  commendable
  excellent
}

model User {
  id             String       @id @default(uuid()) @db.Uuid
  telegramUserId String       @unique
  username       String?
  firstName      String?
  entries        WatchEntry[]
  opinions       WatchOpinion[]
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
}

model Title {
  id               String       @id @default(uuid()) @db.Uuid
  poiskkinoId       Int          @unique
  name             String
  alternativeName  String?
  type             String
  year             Int?
  description      String?
  shortDescription String?
  posterUrl        String?
  ratingKp         Float?
  ratingImdb       Float?
  entry            WatchEntry?
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
}

model WatchEntry {
  id              String      @id @default(uuid()) @db.Uuid
  titleId         String      @unique @db.Uuid
  addedByUserId   String      @db.Uuid
  status          WatchStatus @default(watched)
  watchedAt       DateTime?
  watchedTogether Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  title       Title @relation(fields: [titleId], references: [id], onDelete: Cascade)
  addedByUser User  @relation(fields: [addedByUserId], references: [id])
  opinions    WatchOpinion[]

  @@index([status])
  @@index([watchedAt])
  @@index([createdAt])
}

model WatchOpinion {
  id        String       @id @default(uuid()) @db.Uuid
  entryId   String       @db.Uuid
  userId    String       @db.Uuid
  rating    RatingValue?
  note      String?
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  entry WatchEntry @relation(fields: [entryId], references: [id], onDelete: Cascade)
  user  User       @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@unique([entryId, userId])
  @@index([userId])
}
```

## Почему `Title` и `WatchEntry` разделены

`Title` хранит данные внешнего каталога, `WatchEntry` — общие данные списка, а `WatchOpinion` — персональные оценки и заметки. Поэтому два пользователя могут независимо оценить один тайтл и оставить разные заметки.

## PostgreSQL-заметки

- Для `id` используем UUID, чтобы не зависеть от последовательных integer id.
- Для `telegramUserId` оставляем `string`, потому что внешние идентификаторы лучше не смешивать с числовыми типами приложения.
- Для `status` используем enum `WatchStatus`.
- Для полнотекстового поиска по своему списку позже можно добавить GIN-индекс по `Title.name`, но для MVP достаточно поиска через ПоискКино API.
