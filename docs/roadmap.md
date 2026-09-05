# Пробелы в покрытии API и план доработки

Разобрано чтением исходников, а не README. Актуально на 05.09.2026, версия кода —
51 инструмент.

## Что уже покрыто

Кампании (+ управление и стратегии), группы объявлений, объявления (+ модерация),
ключевые фразы и ставки, минус-фразы (+ общие наборы `NegativeKeywordSharedSets`),
быстрые ссылки, уточнения, изображения объявлений, корректировки ставок
(устройства / пол / возраст), ретаргетинг-листы, аудиторные и динамические цели,
фиды (только чтение), отчёт по поисковым запросам, `get_changes`, визитки, профили
организаций, баланс, регионы, временной таргетинг и часовые пояса. Полный список —
в README.

## P1 — критично

1. [x] ~~**Часовой пояс и временной таргетинг (`TimeTargeting`)**~~ — сделано 03.09.2026,
   `feat/time-targeting`: домен `tools/time-targeting` (`get_time_targeting`,
   `set_time_targeting`), справочник `list_time_zones` и `time_zone` в
   `create_campaign`. Наружу расписание задаётся правилами «дни + часы +
   коэффициент», строки из 25 чисел собирает хендлер.

2. [x] ~~**Смена стратегии на существующей кампании.**~~ — сделано 03.09.2026,
   `chore/zod4-conventions`: `set_strategy` принимает `AVERAGE_CPC`, `AVERAGE_CPA`
   и `PAY_FOR_CONVERSION` (плюс `MAXIMUM_COVERAGE` в сетях), настройки собираются
   в `AverageCpc` / `AverageCpa` / `PayForConversion`, цель Метрики приходит
   параметром `goal_id`. Сочетание сторон схемой не проверяется: таблица
   совместимости живёт у Директа.

   - [ ] Остаток: стратегии с несколькими целями, `AVERAGE_ROI`, `AVERAGE_CRR`,
     `MAX_PROFIT`, недельный пакет кликов.

3. [x] ~~**Минус-фразы — только полная замена.**~~ — сделано 05.09.2026,
   `feat/negative-keywords-merge`: у `set_campaign_negative_keywords` и
   `set_ad_group_negative_keywords` появился `mode` — `replace` (по умолчанию,
   прежнее поведение), `add` и `remove`. Чтение и слияние ушли внутрь сервера:
   `add`/`remove` сначала читают текущий список, поэтому стоят двух вызовов API.
   Сравнение фраз — без учёта регистра и краевых пробелов; подтвердить пробоем,
   нормализует ли их сам Директ, пока нельзя (доступ к API не выдан).

   - [ ] Общие наборы (`update` в `manage_negative_keyword_shared_sets`) и привязки
     (`link_negative_keyword_sets`) остались только на замену — та же семантика,
     тот же вопрос.

## P2 — заметно ограничивает

4. [ ] **`get_statistics` — `ReportType` зашит в `CAMPAIGN_PERFORMANCE_REPORT`.**
   Из отчётов Директа доступен только он; `get_search_queries` отдельно закрывает
   `SEARCH_QUERY_PERFORMANCE_REPORT`. Недоступны `ADGROUP_PERFORMANCE_REPORT`,
   `AD_PERFORMANCE_REPORT`, `CRITERIA_PERFORMANCE_REPORT`,
   `ACCOUNT_PERFORMANCE_REPORT`, `CUSTOM_REPORT`,
   `REACH_AND_FREQUENCY_PERFORMANCE_REPORT`.

5. [ ] **UTM-разметка (`TrackingParams`)** — не поддержана ни на кампании, ни на
   объявлении. Метки можно только вписать руками в `href` при создании объявления.

6. [ ] **Автотаргетинг в группах.** `create_ad_group` принимает только `Name`,
   `CampaignId`, `RegionIds`. Категории автотаргетинга (`RelevantKeywords`)
   недоступны ни на чтение, ни на запись.

## P3 — по мере необходимости

7. [ ] **Фиды — только чтение** (`list_feeds`). `Feeds.add/update/delete` не покрыты,
   товарные кампании настраиваются вручную.

8. [ ] **Комбинаторные объявления.** `create_text_ad` / `update_text_ad` работают только
   с классическим `TextAd`. Отдельный ли это `AdType` в сервисе `Ads` или другая
   модель данных (ассеты ЕПК) — требует исследования до написания кода.

- Не трогаем без явного запроса: `AgencyClients`, `Clients`, `Creatives`,
  `AdVideos`, `TurboPages`, `Leads`, `KeywordsResearch`, портфельные `Strategies`.

## Инфраструктура

Отдельным потоком, до фич: архитектура (`docs/architecture.md`), линтеры
(Biome, knip), хуки (lefthook, commitlint), обновление зависимостей
(zod v4, SDK 1.30, TypeScript 7 — сделано 03.09.2026), рефакторинг под
архитектуру, CI/CD, semantic-release.
