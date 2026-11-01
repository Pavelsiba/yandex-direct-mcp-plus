// Эндпоинты Директа. Контур один — боевой: песочница отключена Яндексом с июля 2026.

export const BASE_URL = "https://api.direct.yandex.com/json/v5/"
export const REPORT_URL = `${BASE_URL}reports`

// Только запись комбинаторных объявлений: v5 отбивает ResponsiveAd ошибкой 3500, а целиком
// на v501 клиент не переводится — там ТГО читаются как ЕПК (#46).
export const V501_URL = "https://api.direct.yandex.com/json/v501/"

// Только ради баланса общего счёта: в v5 его нет, есть лишь Funds кампании и бонусы клиента.
export const V4_URL = "https://api.direct.yandex.ru/live/v4/json/"
