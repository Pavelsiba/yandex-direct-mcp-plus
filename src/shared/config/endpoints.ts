// Эндпоинты Директа. Контур один — боевой: песочница отключена Яндексом с июля 2026.

export const BASE_URL = "https://api.direct.yandex.com/json/v5/"
export const REPORT_URL = `${BASE_URL}reports`

// Только запись комбинаторных объявлений: v5 отбивает ResponsiveAd ошибкой 3500, а целиком
// на v501 клиент не переводится — там ТГО читаются как ЕПК (#46).
export const V501_URL = "https://api.direct.yandex.com/json/v501/"

// Только ради баланса общего счёта: в v5 его нет, есть лишь Funds кампании и бонусы клиента.
export const V4_URL = "https://api.direct.yandex.ru/live/v4/json/"

// Вход из диалога: Authorization Code + PKCE, публичный клиент без client_secret.
// client_id и так виден в каждой ссылке входа; доступ к API одобрен именно этому приложению.
export const OAUTH_CLIENT_ID = "023f45a74f7f49ec930a74400078b837"
export const OAUTH_AUTHORIZE_URL = "https://oauth.yandex.ru/authorize"
export const OAUTH_TOKEN_URL = "https://oauth.yandex.ru/token"
// Яндекс показывает код на своей странице, пользователь переносит его в чат.
export const OAUTH_REDIRECT_URI = "https://oauth.yandex.ru/verification_code"
