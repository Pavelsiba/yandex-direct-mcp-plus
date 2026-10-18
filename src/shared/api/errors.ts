// Разбор ошибок Директа. Хендлеры сюда не заглядывают: их дело — сценарий.
import { parseJson } from "#shared/api/json"
import { getErrorHint } from "#shared/lib/error-hints"

type ApiErrorV5 = {
  error_code?: number | string
  error_string?: string
  error_detail?: string
  request_id?: string
}

// 53 — токен истёк, отозван или неверен. v5 отдаёт её с HTTP 200, v4 — с пустым
// error_detail, Reports — HTTP 400 и XML. Текст заменяется целиком: из родного не понять, что делать.
const AUTH_ERROR_CODE = 53

const AUTH_ERROR_MESSAGE = [
  "Токен Яндекс.Директа не принят: истёк, отозван или задан неверно.",
  "Это не сбой сети и не временная ошибка — повторять вызов бесполезно.",
  "Нужен новый OAuth-токен (https://yandex.ru/dev/direct/doc/ru/token):",
  "передайте его в переменной YANDEX_DIRECT_TOKEN в конфигурации MCP-клиента и перезапустите сервер."
].join(" ")

// Ошибка запроса с кодом Директа: текст адресован модели, код — коду, который решает,
// повторять ли запрос.
export class DirectApiError extends Error {
  readonly code: number | undefined
  readonly requestId: string | undefined

  constructor(message: string, code: unknown, requestId?: string) {
    super(message)
    this.name = "DirectApiError"
    // Код приходит и числом, и строкой; Number("") и Number(null) дали бы ложный 0.
    const numeric =
      typeof code === "number" || (typeof code === "string" && code.trim() !== "") ? Number(code) : Number.NaN
    this.code = Number.isInteger(numeric) ? numeric : undefined
    this.requestId = requestId
  }
}

// 52 и 506 отбиваются до выполнения метода — повтор безопасен и для записи. 1000–1002 —
// внутренний сбой, и обработан ли запрос, Директ не говорит: сами повторяем только чтение,
// иначе повтор add создал бы дубль.
const TRANSIENT_ANY_CODES = new Set([52, 506])
const TRANSIENT_READ_CODES = new Set([1000, 1001, 1002])

export function isTransientApiError(error: unknown, { write }: { write: boolean }): boolean {
  if (!(error instanceof DirectApiError) || error.code === undefined) return false
  return TRANSIENT_ANY_CODES.has(error.code) || (!write && TRANSIENT_READ_CODES.has(error.code))
}

function isAuthError(code: unknown): boolean {
  return Number(code) === AUTH_ERROR_CODE
}

const authError = (requestId?: string) => new DirectApiError(AUTH_ERROR_MESSAGE, AUTH_ERROR_CODE, requestId)

function withAdvice(message: string, code: unknown, units?: string): string {
  const parts = [message]
  const hint = getErrorHint(code)
  if (hint) parts.push(`Что делать: ${hint}`)
  if (units) parts.push(`Баллы API (потрачено/остаток/лимит): ${units}.`)
  return parts.join(" ")
}

// v5 возвращает ошибку запроса телом с HTTP 200 — признак только ключ `error`.
export function assertNoApiError(data: unknown, units?: string): void {
  const error = (data as { error?: ApiErrorV5 } | null)?.error
  if (!error || typeof error !== "object") return
  if (isAuthError(error.error_code)) throw authError(error.request_id)

  const parts = [`Ошибка API Яндекс.Директ [${error.error_code ?? "?"}]: ${error.error_string ?? "неизвестная ошибка"}`]
  if (error.error_detail) parts.push(`— ${error.error_detail}`)
  if (error.request_id) parts.push(`(request_id: ${error.request_id})`)
  throw new DirectApiError(withAdvice(parts.join(" "), error.error_code, units), error.error_code, error.request_id)
}

// v4 отвечает по-своему: error_str вместо error_string, признак — любой из двух ключей.
export function assertNoApiErrorV4(data: Record<string, unknown> | null, units?: string): void {
  if (!data || (data.error_code === undefined && data.error_str === undefined)) return
  if (isAuthError(data.error_code)) throw authError()

  const detail = data.error_detail ? ` — ${data.error_detail}` : ""
  const message = `Ошибка API v4 [${data.error_code ?? "?"}]: ${data.error_str ?? "неизвестная ошибка"}${detail}`
  throw new DirectApiError(withAdvice(message, data.error_code, units), data.error_code)
}

const REPORT_ERROR_CODE = /<reports:errorCode>(\d+)<\/reports:errorCode>/

// Reports отвечает HTTP-кодом и XML, поэтому проверка живёт в транспорте. Регулярка вместо
// разбора XML — ради одного числа.
export function assertNoReportAuthError(body: string): void {
  const code = REPORT_ERROR_CODE.exec(body)?.[1]
  if (code && isAuthError(code)) throw authError()
}

// Лимит частоты (56) Reports отдаёт не XML, а телом v5 с HTTP 400: без разбора код и
// подсказка терялись в «HTTP 400: Bad Request».
export function assertNoHttpErrorBody(body: string): void {
  let data: unknown
  try {
    data = parseJson(body)
  } catch {
    return
  }
  assertNoApiError(data)
}
