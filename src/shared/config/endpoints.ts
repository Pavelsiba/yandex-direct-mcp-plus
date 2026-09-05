// Эндпоинты Директа. Выбирать не из чего: песочница отключена Яндексом с июля 2026
// (ответ поддержки 05.09.2026), контур один — боевой. Отсюда константы, а не функции.

export const BASE_URL = "https://api.direct.yandex.com/json/v5/"
export const REPORT_URL = `${BASE_URL}reports`

// Баланс общего счёта есть только в Live API v4 (AccountManagement.Get). Финансы в v5
// не отсутствуют вовсе — у кампании это поле Funds, у клиента Bonuses и
// OverdraftSumAvailable, — но суммы на счёте среди них нет. Сверено с WSDL 05.09.2026.
export const V4_URL = "https://api.direct.yandex.ru/live/v4/json/"
