# Changelog

## [2.0.1](https://github.com/Pavelsiba/yandex-direct-mcp-plus/compare/v2.0.0...v2.0.1) (2026-11-01)


### Bug Fixes

* **release:** релиз вызывается из CI на пуше в main, а не через workflow_run ([a7debda](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/a7debda8f70e316fe96767e68217c529c7153e63))

# [2.0.0](https://github.com/Pavelsiba/yandex-direct-mcp-plus/compare/v1.8.0...v2.0.0) (2026-11-01)


* feat(ads)!: объявления создаются и правятся как комбинаторные через v501 ([cd28c83](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/cd28c833687dd0ac5448068598cabc73c673f84d))
* feat(keywords)!: ставки через KeywordBids и правило под объём трафика ([fc4178c](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/fc4178c35b083069b75ab50622075aaddaf94c62))
* feat(tools)!: убран dry_run, незнакомые параметры отклоняются схемой ([5848010](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/5848010ba8096e9c92a46389424d7c83e7412f23)), closes [#92](https://github.com/Pavelsiba/yandex-direct-mcp-plus/issues/92)


### Bug Fixes

* **ads:** предупреждения 10251 и 10252 описаны как успешный результат ([9332411](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/9332411f0c87a4fcb316f6bc6f3ee0c111605d14)), closes [#101](https://github.com/Pavelsiba/yandex-direct-mcp-plus/issues/101)
* **deps:** zod 4.6.7 и @hono/node-server 2.x без уязвимостей, аудит зависимостей в CI ([854cc6b](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/854cc6bb77759cfa1959e702dedbbf5e06941105))
* **errors:** лимит частоты 56 от Reports отдаётся с кодом и подсказкой ([39a866b](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/39a866bdd40e56cc80dffb2bb43cc04c1309b135))
* **format:** отказы Live v4 из ActionsResult выводятся строкой ❌ с подсказкой ([cbbad1d](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/cbbad1db0997762366053a7b17cd434875926c3e))
* **format:** цены стратегий и бюджеты переводятся в рубли ([3ec8c75](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/3ec8c75e136d4a73efa49ae32bb1c9b71a23cab2))


### Features

* **ad-groups:** добавлен update_ad_group — название, регионы и UTM-разметка ([94c91d3](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/94c91d3f898bf96ab4abdd1f7e1e662005d13462)), closes [#60](https://github.com/Pavelsiba/yandex-direct-mcp-plus/issues/60)
* **forecast:** добавлен get_keyword_forecast — прогноз показов и цены клика по фразам без кампании ([4688ec4](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/4688ec426c125c2eaca1560a1484e139df156743)), closes [#47](https://github.com/Pavelsiba/yandex-direct-mcp-plus/issues/47)
* **keywords:** категории и бренды автотаргетинга — чтение и запись ([d2796ca](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/d2796cab5333d0665fa7c8e0bb83a62e00af9e43))
* **keywords:** флаги автотаргетинга передаются по отдельности ([6390886](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/63908864c893f578218f9adada73548e2f0f42b8)), closes [#100](https://github.com/Pavelsiba/yandex-direct-mcp-plus/issues/100)
* **statistics:** отчёты по группам, объявлениям, фразам и аккаунту ([dd097a7](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/dd097a70c3bcd161e8d3dd53dcef1f064476d347))


### BREAKING CHANGES

* create_text_ad и update_text_ad заменены на create_responsive_ad
и update_responsive_ad: вместо title/title2/text — titles[] и texts[].
* у set_keyword_bids bid/context_bid переименованы в search_bid/network_bid;
get_keyword_auction отдаёт торги KeywordBids (Search/Network) вместо позиций P11–P24.
* параметра dry_run больше нет; лишний ключ в вызове любого инструмента —
ошибка валидации, а не молча отброшенное поле.

# [1.8.0](https://github.com/Pavelsiba/yandex-direct-mcp-plus/compare/v1.7.0...v1.8.0) (2026-10-11)


### Bug Fixes

* **api:** пустой и не-JSON ответ Директа даёт понятную ошибку ([bcf1ee9](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/bcf1ee9ad6773b472418d2f3e7029a3b58fa6b6f)), closes [#53](https://github.com/Pavelsiba/yandex-direct-mcp-plus/issues/53) [#73](https://github.com/Pavelsiba/yandex-direct-mcp-plus/issues/73) [#74](https://github.com/Pavelsiba/yandex-direct-mcp-plus/issues/74)
* **campaigns:** средства кампании Funds отдаются в рублях ([a253fbc](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/a253fbcb7d649b8d4055f1b3474f93d4912a54ab)), closes [#61](https://github.com/Pavelsiba/yandex-direct-mcp-plus/issues/61)
* **server:** схемы инструментов уходят в JSON Schema 2020-12 ([b0ede87](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/b0ede872a87fd23fc992d0a35b22a60caf95d63c)), closes [#54](https://github.com/Pavelsiba/yandex-direct-mcp-plus/issues/54)


### Features

* **ads:** list_ads отбирает по ID, кампаниям, состоянию, статусу и типу ([b030613](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/b030613376a7d00090181f0ed2d96074693c7d2b)), closes [#63](https://github.com/Pavelsiba/yandex-direct-mcp-plus/issues/63)
* **app:** удалённый сервер по Streamable HTTP с входом по секрету ([ad93a7c](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/ad93a7caf04d69f6958c7b12bbd092fe73e07677)), closes [#75](https://github.com/Pavelsiba/yandex-direct-mcp-plus/issues/75)
* **client:** добавлен повтор временных ошибок Директа ([f580e4a](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/f580e4a51ccc7cd926625b5a8dc8af9c52f1fe99)), closes [#78](https://github.com/Pavelsiba/yandex-direct-mcp-plus/issues/78)
* **tools:** поля ответа — из перечислений WSDL, а не рукописных списков ([1a638e0](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/1a638e0ad8fbced77eeab21a76bb5bf5f9e0c7fa)), closes [#66](https://github.com/Pavelsiba/yandex-direct-mcp-plus/issues/66)

# [1.7.0](https://github.com/Pavelsiba/yandex-direct-mcp-plus/compare/v1.6.1...v1.7.0) (2026-09-22)


### Bug Fixes

* проверки схемы на весь объект доходят до сервера ([4af587f](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/4af587ff9cd67b8a0bcfcfb0fae901a1fffd10cf))
* убраны операции, которые Директ через API не выполняет ([69b1973](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/69b1973174a935fd277ff2d57336802e44ef31c2))


### Features

* dry_run у пишущих инструментов ([2a87114](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/2a87114a585f2069b173f09de28ac2192cc68950))
* подсказки по кодам ошибок Директа и isError при частичном отказе ([bc21972](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/bc219720946e853588e1a866cfcf6f63556a58bc)), closes [#45](https://github.com/Pavelsiba/yandex-direct-mcp-plus/issues/45)

## [1.6.1](https://github.com/Pavelsiba/yandex-direct-mcp-plus/compare/v1.6.0...v1.6.1) (2026-09-13)


### Bug Fixes

* **release:** публикация в реестр MCP вынесена в отдельный workflow ([d4fde8a](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/d4fde8a885b1dae9ed713d2bb6d589d830891d11))

# [1.6.0](https://github.com/Pavelsiba/yandex-direct-mcp-plus/compare/v1.5.0...v1.6.0) (2026-09-13)


### Bug Fixes

* **campaigns:** описано, что кампании MCBANNER API не отдаёт ([f092e39](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/f092e39015d85b338d4da4ac1888d1e589778d9c))


### Features

* **campaigns:** добавлен set_priority_goals для целей стратегии ([7436773](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/74367739cee5cde15e1fe44c318d677fd3fa25f3))

# [1.5.0](https://github.com/Pavelsiba/yandex-direct-mcp-plus/compare/v1.4.0...v1.5.0) (2026-09-13)


### Bug Fixes

* **campaigns:** описан служебный GoalId 13 в стратегии ([5e60c68](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/5e60c68f988bb545104da4b2f4bd71fd415e5e0d))
* **id:** идентификаторы приведены к строке независимо от разрядности ([196f853](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/196f85343eb2e362cfc01a1b0c6e4643dd740b3a))


### Features

* **ads:** list_ads объясняет пустой ответ и предупреждает о неполноте ([c8092ac](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/c8092ac52c3ad67e9a921d29b18bee391b5cb42f))
* **campaigns:** максимум конверсий на запись, цели кампании на чтение ([0069934](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/0069934808edb27b998581479373a46185aaebe2))
* **fields:** наборы FieldNames генерируются из снимка WSDL ([b89a017](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/b89a017065d7e49375544fd0e9974625ae0ee728))
* **keywords:** добавлен get_keyword_auction — цены и ставки по позициям ([3f8fe26](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/3f8fe266291a9f8ab9dd8931e112e6146e858ca2))
* **tools:** list_campaigns и list_keywords принимают набор полей ([4e578dc](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/4e578dc0c06233aae43f5ec75743c1dc952eb71b)), closes [#31](https://github.com/Pavelsiba/yandex-direct-mcp-plus/issues/31)

# [1.4.0](https://github.com/Pavelsiba/yandex-direct-mcp-plus/compare/v1.3.0...v1.4.0) (2026-09-06)


### Bug Fixes

* **api:** понятная ошибка вместо кода 53 на недействительном токене ([d8de34c](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/d8de34caf85c1fff0573a1e2c9dd3d89453c0ece))


### Features

* **tools:** закрыты пробелы в покрытии методов API — семь инструментов ([0b6de10](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/0b6de10414b644e843fd3a31cc00fb793d78acf9))

# [1.3.0](https://github.com/Pavelsiba/yandex-direct-mcp-plus/compare/v1.2.0...v1.3.0) (2026-09-05)


### Features

* **campaigns:** разметка UTM у кампании через tracking_params ([f640e24](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/f640e24baca5a0f9df8a8d5f8d7a4ed157002c16))

# [1.2.0](https://github.com/Pavelsiba/yandex-direct-mcp-plus/compare/v1.1.0...v1.2.0) (2026-09-05)


### Bug Fixes

* **config:** убрана поддержка отключённой песочницы ([e920a40](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/e920a408732f05f5dc888e6547cc725c96a50415))


### Features

* **negative-keywords:** mode обязателен, без значения по умолчанию ([d77210f](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/d77210f51007c43f94a2d55c591cfd5a1c1343aa))
* **negative-keywords:** общие наборы привязываются к кампании ([9b47573](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/9b475733a2359efedd9b60047c0aba13ad19edac))
* **negative-keywords:** режимы add и remove у set_*_negative_keywords ([6d492a1](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/6d492a1a8e4ba129283c499359dbc6e8c76a5012))

# [1.1.0](https://github.com/Pavelsiba/yandex-direct-mcp-plus/compare/v1.0.0...v1.1.0) (2026-09-03)


### Features

* **campaigns:** автостратегии в set_strategy и дата через dateField ([897b986](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/897b986f9475979675e9f268210e6c3aba0ba7b3))
* **time-targeting:** расписание показов и часовые пояса ([41c90fe](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/41c90fe3adaca4a3eb23c9e4b9b4aa9e2914600e))

# 1.0.0 (2026-09-03)


* feat!: раскладка по слоям и перечисления Директа типами схем ([6f4039a](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/6f4039ad2b76277f2ef365eae412f62aea6f6f92))


### BREAKING CHANGES

* поля-перечисления схем стали литералами вместо z.string().
list_campaigns.status и types, update_campaign.status (раньше терпел нижний регистр),
manage_ads.action, operand и operator динамических целей теперь отклоняют значения вне
списка. Валидные вызовы не затронуты: списки взяты из схемы API.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
