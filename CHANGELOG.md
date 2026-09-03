# Changelog

История до отделения от апстрима (версии 3.0.0–5.0.0, проект
`theYahia/yandex-direct-mcp`) — в
[docs/CHANGELOG-upstream.md](docs/CHANGELOG-upstream.md).

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
