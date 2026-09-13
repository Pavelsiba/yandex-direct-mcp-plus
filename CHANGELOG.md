# Changelog

История до отделения от апстрима (версии 3.0.0–5.0.0, проект
`theYahia/yandex-direct-mcp`) — в
[docs/CHANGELOG-upstream.md](docs/CHANGELOG-upstream.md).

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
