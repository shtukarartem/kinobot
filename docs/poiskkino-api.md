# Интеграция с ПоискКино API

## База

API: https://api.poiskkino.dev

Документация: https://api.poiskkino.dev/documentation

Локальная OpenAPI-спецификация проекта: `/Users/artemstukar/Downloads/api-1.json`.

Версия спецификации: `1.4.1`, OpenAPI `3.0.0`.

Для всех запросов нужен заголовок:

```http
X-API-KEY: <POISKKINO_API_KEY>
```

Токен хранится в переменной окружения `POISKKINO_API_KEY`.

Спецификация также описывает передачу токена через query-параметр `token`, но в проекте используем только заголовок `X-API-KEY`, чтобы не светить ключ в URL и логах.

## Поиск по названию

Для MVP используем:

```http
GET /v1.4/movie/search
```

Параметры:

| Параметр | Тип    | Описание                                                                         |
| -------- | ------ | -------------------------------------------------------------------------------- |
| `query`  | string | Обязательный поисковый запрос                                                    |
| `page`   | number | Страница выборки, минимум `1`, по умолчанию `1`                                  |
| `limit`  | number | Количество элементов на странице, минимум `1`, максимум `250`, по умолчанию `10` |

Пример:

```bash
curl 'https://api.poiskkino.dev/v1.4/movie/search?query=Интерстеллар&limit=5&page=1' \
  --header 'X-API-KEY: YOUR_SECRET_TOKEN'
```

Ответ `200`:

| Поле    | Тип    | Описание                           |
| ------- | ------ | ---------------------------------- |
| `docs`  | array  | Найденные тайтлы                   |
| `total` | number | Общее количество результатов       |
| `limit` | number | Количество результатов на странице |
| `page`  | number | Текущая страница                   |
| `pages` | number | Сколько страниц всего              |

## Получение тайтла по id

После выбора результата можно дополнительно получить полную карточку:

```http
GET /v1.4/movie/{id}
```

Path-параметры:

| Параметр | Тип    | Описание  |
| -------- | ------ | --------- |
| `id`     | number | Id тайтла |

Пример:

```bash
curl 'https://api.poiskkino.dev/v1.4/movie/258687' \
  --header 'X-API-KEY: YOUR_SECRET_TOKEN'
```

## Поля, которые нужны боту

Из ответа поиска сохраняем:

- `id`;
- `name`;
- `alternativeName`;
- `enName`;
- `type`;
- `year`;
- `description`;
- `shortDescription`;
- `rating.kp`;
- `rating.imdb`;
- `poster.url`, если есть.

Название выбираем так:

```text
name || alternativeName || enName || "Без названия"
```

## Типы тайтлов

ПоискКино использует такие значения:

- `movie`;
- `tv-series`;
- `cartoon`;
- `animated-series`;
- `anime`;
- `tv-show`.

Для интерфейса бота можно маппить их так:

| API               | UI          |
| ----------------- | ----------- |
| `movie`           | Фильм       |
| `tv-series`       | Сериал      |
| `cartoon`         | Мультфильм  |
| `animated-series` | Мультсериал |
| `anime`           | Аниме       |
| `tv-show`         | ТВ-шоу      |

## Ошибки

| Код   | Причина                                                          | Поведение бота                     |
| ----- | ---------------------------------------------------------------- | ---------------------------------- |
| `400` | Невалидный запрос                                                | Показать ошибку поиска             |
| `401` | Токен не передан или указан неверно                              | Логировать как ошибку конфигурации |
| `403` | Превышен суточный лимит запросов или лимит пагинации demo-тарифа | Сообщить, что лимит API исчерпан   |
| `404` | Тайтл не найден                                                  | Сообщить, что запись не найдена    |
| `5xx` | Ошибка API                                                       | Предложить попробовать позже       |

## Лимиты

У demo/free-тарифа есть ограничения на пагинацию и размер выборки. Для MVP безопасно использовать:

- `limit = 5` для поиска;
- `page = 1` по умолчанию;
- без глубокого перелистывания результатов API.

По спецификации для demo/free и пользователей без активной подписки доступны только страницы `1-10` и `limit` не больше `10`. Поэтому даже при техническом максимуме `limit = 250` в endpoint-документации клиент бота должен ограничивать поиск значением `5` или `10`.

## Клиентский сервис

Рекомендуемый интерфейс сервиса:

```ts
export interface MovieSearchResult {
  poiskkinoId: number;
  name: string;
  alternativeName: string | null;
  enName: string | null;
  type: MovieType | null;
  year: number | null;
  description: string | null;
  shortDescription: string | null;
  ratingKp: number | null;
  ratingImdb: number | null;
  posterUrl: string | null;
}

export type MovieType = 'movie' | 'tv-series' | 'cartoon' | 'animated-series' | 'anime' | 'tv-show';

export interface PoiskKinoClient {
  search(query: string, limit?: number): Promise<MovieSearchResult[]>;
  getById(id: number): Promise<MovieSearchResult | null>;
}
```

## Важные детали реализации

- Кодировать query-параметры через `URLSearchParams`.
- Не логировать API-ключ.
- Добавить timeout на HTTP-запросы.
- Обрабатывать пустой `docs`.
- Не доверять наличию вложенных полей вроде `rating.kp` и `poster.url`.
- Делать нормализацию данных в одном месте, внутри `PoiskKinoClient`.
