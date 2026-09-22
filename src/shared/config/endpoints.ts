// Эндпоинты Директа. Контур один — боевой: песочница отключена Яндексом с июля 2026.

export const BASE_URL = "https://api.direct.yandex.com/json/v5/"
export const REPORT_URL = `${BASE_URL}reports`

// Только ради баланса общего счёта: в v5 его нет, есть лишь Funds кампании и бонусы клиента.
export const V4_URL = "https://api.direct.yandex.ru/live/v4/json/"
