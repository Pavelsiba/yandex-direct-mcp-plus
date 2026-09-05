# yandex-direct-mcp-plus

MCP-сервер для API Яндекс.Директ — управление контекстной рекламой из любого MCP-клиента (Claude, Cursor и др.): кампании, объявления, аудитории, изображения, фиды, уточнения, ставки, минус-фразы, стратегии, расписание показов, статистика и баланс. **51 инструмент.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D22-green.svg)](https://nodejs.org)

> Деньги — **в рублях** (бюджеты, ставки на вводе и выводе); сервер сам конвертирует в микроединицы API. Поддержан **агентский режим** (Client-Login).
>
> Все ID передаются строками (`"1915016273214320641"`). Это сохраняет 64-битные идентификаторы Яндекс.Директа без потери точности в JavaScript.

> [!NOTE]
> В npm пакет пока не опубликован — ставится сборкой из исходников. Публикация будет отдельным релизом.

## Установка

```bash
git clone git@github.com:Pavelsiba/yandex-direct-mcp-plus.git
cd yandex-direct-mcp-plus
npm ci && npm run build
```

### Claude Desktop

```json
{
  "mcpServers": {
    "yandex-direct": {
      "command": "node",
      "args": ["/путь/к/yandex-direct-mcp-plus/dist/app/index.js"],
      "env": {
        "YANDEX_DIRECT_TOKEN": "ваш_токен"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add yandex-direct -e YANDEX_DIRECT_TOKEN=ваш_токен -- node /путь/к/yandex-direct-mcp-plus/dist/app/index.js
```
## Конфигурация (переменные окружения)

| Переменная | Обязательна | Назначение |
|------------|:-----------:|------------|
| `YANDEX_DIRECT_TOKEN` | да | OAuth-токен Яндекс.Директ |
| `YANDEX_DIRECT_LOGIN` | нет | Логин клиента для агентских токенов (заголовок `Client-Login`). Обязателен, если токен агентский |
| `YANDEX_DIRECT_POLYGON_CAMPAIGN_ID` | нет | Только для `npm run test:int`: ID кампании-полигона, оставленной черновиком. Сетевые тесты пишут в неё и ни во что другое; без переменной они пропускаются |

### Как получить токен

OAuth-токен выпускается для приложения, зарегистрированного в [Яндекс OAuth](https://oauth.yandex.ru/), с доступом к API Директа. Подробности — [регистрация приложения и получение токена](https://yandex.ru/dev/direct/doc/ru/token). Доступ к API нужно [запросить в интерфейсе Директа](https://yandex.ru/dev/direct/doc/ru/access-request).

## ⚠️ Внимание: реальные траты

Инструменты `create_campaign`, `create_text_ad`, `add_keywords`, `set_keyword_bids` и др. меняют боевой рекламный аккаунт и могут **расходовать деньги**.

Тестовой среды у Яндекс.Директа больше нет: песочница отключена с июля 2026, и любой вызов идёт по боевому аккаунту. Отлаживать сценарии приходится на отдельной кампании, оставленной черновиком, — показов она не даёт и потому не тратит бюджет, пока не пройдёт модерацию и не будет включена.

## Инструменты (51)

**Кампании**

| Инструмент | Описание |
|------------|----------|
| `list_campaigns` | Список кампаний (фильтр по статусу/типу, пагинация) |
| `get_campaign` | Детальная информация о кампании по ID |
| `create_campaign` | Создать кампанию (бюджет в рублях, выбор стратегии, часовой пояс) |
| `update_campaign` | Обновить название/бюджет и/или статус (SUSPEND/RESUME/ARCHIVE/UNARCHIVE) |
| `manage_campaigns` | suspend/resume/archive/unarchive для списка кампаний |
| `get_strategy` | Получить стратегию текстово-графической кампании |
| `set_strategy` | Сменить стратегию: ручная, максимум кликов, средняя цена клика/конверсии, оплата за конверсию |
| `get_time_targeting` | Расписание показов: часовой пояс, часы по дням недели, праздники |
| `set_time_targeting` | Задать расписание показов и почасовые коэффициенты (заменяет целиком) |

**Группы объявлений**

| Инструмент | Описание |
|------------|----------|
| `list_ad_groups` | Группы объявлений выбранных кампаний |
| `create_ad_group` | Создать группу с таргетингом по регионам |
| `delete_ad_groups` | Удалить группы по ID |
| `set_ad_group_negative_keywords` | Минус-фразы группы: `mode` обязателен — `replace`, `add` или `remove` |

**Объявления**

| Инструмент | Описание |
|------------|----------|
| `list_ads` | Объявления в группах |
| `create_text_ad` | Создать текстовое объявление (≤56/≤30/≤81) |
| `update_text_ad` | Обновить заголовок/текст/ссылку |
| `manage_ads` | suspend/resume/archive/unarchive/moderate/delete |
| `moderate_ads` | Отправить объявления на модерацию |

**Ключевые слова и ставки**

| Инструмент | Описание |
|------------|----------|
| `list_keywords` | Ключевые фразы в группах (ставки в рублях) |
| `add_keywords` | Добавить ключевые фразы |
| `set_keyword_bids` | Установить ставки (поиск/сети, рубли) на фразах/группах/кампаниях |
| `manage_keywords` | suspend/resume/delete |
| `set_campaign_negative_keywords` | Минус-фразы кампании: `mode` обязателен — `replace`, `add` или `remove` |
| `get_campaign_negative_keywords` | Получить минус-фразы кампаний |

**Быстрые ссылки, уточнения и корректировки**

| Инструмент | Описание |
|------------|----------|
| `list_sitelinks` | Получить наборы быстрых ссылок |
| `set_sitelinks` | Создать новый набор быстрых ссылок |
| `list_ad_extensions` | Получить уточнения (callouts) |
| `add_ad_extensions` | Создать уточнения |
| `delete_ad_extensions` | Удалить уточнения |
| `manage_ad_images` | Загрузить, получить или удалить изображения |
| `get_bid_adjustments` | Получить корректировки по устройствам, полу и возрасту |
| `set_bid_adjustments` | Изменить коэффициенты существующих корректировок |

**Аудитории, цели и фиды**

| Инструмент | Описание |
|------------|----------|
| `list_retargeting_lists` | Получить условия ретаргетинга и подбора аудитории |
| `add_retargeting_list` | Создать условие ретаргетинга |
| `list_audience_targets` | Получить аудиторные цели |
| `set_audience_targets` | add/set_bids/suspend/resume/delete аудиторных целей |
| `list_dynamic_targets` | Получить динамические цели |
| `manage_dynamic_targets` | add/set_bids/suspend/resume/delete динамических целей |
| `list_feeds` | Получить товарные фиды |
| `list_negative_keyword_shared_sets` | Получить общие наборы минус-фраз |
| `manage_negative_keyword_shared_sets` | add/update/delete общих наборов |
| `link_negative_keyword_sets` | Привязать общие наборы к кампаниям и группам объявлений |

**Статистика, аккаунт, справочники**

| Инструмент | Описание |
|------------|----------|
| `get_statistics` | Статистика за период (показы, клики, расход, CTR, CPC) |
| `get_search_queries` | Фактические поисковые запросы для подбора минус-фраз |
| `get_changes` | Проверить изменения кампаний, групп и объявлений |
| `list_vcards` | Получить виртуальные визитки |
| `add_vcard` | Создать виртуальную визитку |
| `list_businesses` | Получить профили организаций Яндекс Бизнеса |
| `get_account_balance` | Баланс аккаунта (Live API v4) |
| `get_regions` | Справочник кодов регионов (225 = Россия) |
| `list_time_zones` | Справочник часовых поясов для расписания показов |

## Примеры запросов

```
Покажи все активные рекламные кампании
Создай кампанию "Летняя распродажа" с бюджетом 5000 ₽/день, старт 2026-05-01
Установи ставку 25 ₽ на ключевые фразы 111 и 222
Добавь минус-фразы "бесплатно", "скачать" в кампанию 12345
Какая статистика у кампаний 12345 и 67890 за последнюю неделю?
Найди код региона для Новосибирска
Покажи баланс аккаунта
```

## Разработка

```bash
npm install
npm run build      # tsc → dist/
npm test           # vitest (моки fetch)
npm run dev        # tsx --conditions=development src/app/index.ts
npm run lint       # biome
npm run typecheck  # tsc --noEmit
npm run lint:dead  # knip
```

Код разложен по слоям `app → tools → shared`; инструмент — это каталог
`src/tools/<домен>/` с `schema.ts`, `handler.ts` и `tool.ts`. Подробности —
в [docs/architecture.md](docs/architecture.md).

## Происхождение и благодарности

Проект начат на коде [`theYahia/yandex-direct-mcp`](https://github.com/theYahia/yandex-direct-mcp) под лицензией MIT. Расширение с 20 до 48 инструментов и перевод ID на строки — работа [**Maxim (DrSeedon)**](https://github.com/DrSeedon), [PR #7](https://github.com/theYahia/yandex-direct-mcp/pull/7); в npm эта версия не публиковалась. Дальше проект развивается самостоятельно и апстрим не отслеживает.

История до отделения от апстрима (версии 3.0.0–5.0.0, включая вклад DrSeedon) — в [docs/CHANGELOG-upstream.md](docs/CHANGELOG-upstream.md); дальнейшие изменения — в [CHANGELOG.md](CHANGELOG.md). План — в [docs/roadmap.md](docs/roadmap.md), архитектура — в [docs/architecture.md](docs/architecture.md).

## Лицензия

MIT — см. [LICENSE](LICENSE). Уведомление об авторских правах исходного проекта сохранено.
