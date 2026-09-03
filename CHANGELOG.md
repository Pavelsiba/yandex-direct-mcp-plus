# Changelog

История до отделения от апстрима (версии 3.0.0–5.0.0, проект
`theYahia/yandex-direct-mcp`) — в
[docs/CHANGELOG-upstream.md](docs/CHANGELOG-upstream.md).

# 1.0.0 (2026-09-03)


* feat!: раскладка по слоям и перечисления Директа типами схем ([6f4039a](https://github.com/Pavelsiba/yandex-direct-mcp-plus/commit/6f4039ad2b76277f2ef365eae412f62aea6f6f92))


### BREAKING CHANGES

* поля-перечисления схем стали литералами вместо z.string().
list_campaigns.status и types, update_campaign.status (раньше терпел нижний регистр),
manage_ads.action, operand и operator динамических целей теперь отклоняют значения вне
списка. Валидные вызовы не затронуты: списки взяты из схемы API.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
