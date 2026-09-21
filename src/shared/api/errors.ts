// Разбор ошибок Директа. Хендлеры сюда не заглядывают: их дело — сценарий.
import { getErrorHint } from "#shared/lib/error-hints"

type ApiErrorV5 = {
  error_code?: number | string
  error_string?: string
  error_detail?: string
  request_id?: string
}

// 53 — единственная ошибка, которую не чинит ни повтор, ни другой запрос: токен истёк,
// отозван или указан неверно. Проба 06.09.2026: v5 отдаёт её телом с HTTP 200
// («Ошибка авторизации» / «Недействительный OAuth-токен»), v4 — тем же кодом, но с пустым
// error_detail, а Reports — HTTP 400 и XML, где код лежит в <reports:errorCode>.
const AUTH_ERROR_CODE = 53

// Текст адресован модели на другом конце протокола, а не человеку в логе: без явного
// «повтор не поможет» она уводит вызов в ретраи, и пользователь так и не узнает, что
// нужно перевыпустить токен.
const AUTH_ERROR_MESSAGE = [
  "Токен Яндекс.Директа не принят: истёк, отозван или задан неверно.",
  "Это не сбой сети и не временная ошибка — повторять вызов бесполезно.",
  "Нужен новый OAuth-токен (https://yandex.ru/dev/direct/doc/ru/token):",
  "передайте его в переменной YANDEX_DIRECT_TOKEN в конфигурации MCP-клиента и перезапустите сервер."
].join(" ")

function isAuthError(code: unknown): boolean {
  return Number(code) === AUTH_ERROR_CODE
}

// Хвост ошибки: что делать и сколько баллов осталось. Остаток нужен модели, чтобы
// отличить «кончились баллы» от «запрос неверен» и не сжечь последние на повторах.
function withAdvice(message: string, code: unknown, units?: string): string {
  const parts = [message]
  const hint = getErrorHint(code)
  if (hint) parts.push(`Что делать: ${hint}`)
  if (units) parts.push(`Баллы API (потрачено/остаток/лимит): ${units}.`)
  return parts.join(" ")
}

// v5 возвращает ошибку уровня запроса телом с HTTP 200 — статус проверять бесполезно,
// признак ошибки один: ключ `error`. Док: https://yandex.ru/dev/direct/doc/en/concepts/errors-list
export function assertNoApiError(data: unknown, units?: string): void {
  const error = (data as { error?: ApiErrorV5 } | null)?.error
  if (!error || typeof error !== "object") return
  if (isAuthError(error.error_code)) throw new Error(AUTH_ERROR_MESSAGE)

  const parts = [`Ошибка API Яндекс.Директ [${error.error_code ?? "?"}]: ${error.error_string ?? "неизвестная ошибка"}`]
  if (error.error_detail) parts.push(`— ${error.error_detail}`)
  if (error.request_id) parts.push(`(request_id: ${error.request_id})`)
  throw new Error(withAdvice(parts.join(" "), error.error_code, units))
}

// v4 отвечает по-своему: error_str вместо error_string, признак — любой из двух ключей.
export function assertNoApiErrorV4(data: Record<string, unknown> | null, units?: string): void {
  if (!data || (data.error_code === undefined && data.error_str === undefined)) return
  if (isAuthError(data.error_code)) throw new Error(AUTH_ERROR_MESSAGE)

  const detail = data.error_detail ? ` — ${data.error_detail}` : ""
  const message = `Ошибка API v4 [${data.error_code ?? "?"}]: ${data.error_str ?? "неизвестная ошибка"}${detail}`
  throw new Error(withAdvice(message, data.error_code, units))
}

const REPORT_ERROR_CODE = /<reports:errorCode>(\d+)<\/reports:errorCode>/

// Reports — единственный сервис, отвечающий настоящим HTTP-кодом и XML, поэтому его
// ошибка не доходит ни до assertNoApiError, ни до схемы: транспорт бросает раньше.
// Вызывается из fetchWithRetry — там тело неуспешного ответа и оказывается. Код тянем
// регуляркой: разбирать XML ради одного числа — лишняя зависимость.
export function assertNoReportAuthError(body: string): void {
  const code = REPORT_ERROR_CODE.exec(body)?.[1]
  if (code && isAuthError(code)) throw new Error(AUTH_ERROR_MESSAGE)
}
