// Разбор ошибок Директа. Хендлеры сюда не заглядывают: их дело — сценарий.

type ApiErrorV5 = {
  error_code?: number | string
  error_string?: string
  error_detail?: string
  request_id?: string
}

// v5 возвращает ошибку уровня запроса телом с HTTP 200 — статус проверять бесполезно,
// признак ошибки один: ключ `error`. Док: https://yandex.ru/dev/direct/doc/en/concepts/errors-list
export function assertNoApiError(data: unknown): void {
  const error = (data as { error?: ApiErrorV5 } | null)?.error
  if (!error || typeof error !== "object") return

  const parts = [`Ошибка API Яндекс.Директ [${error.error_code ?? "?"}]: ${error.error_string ?? "неизвестная ошибка"}`]
  if (error.error_detail) parts.push(`— ${error.error_detail}`)
  if (error.request_id) parts.push(`(request_id: ${error.request_id})`)
  throw new Error(parts.join(" "))
}

// v4 отвечает по-своему: error_str вместо error_string, признак — любой из двух ключей.
export function assertNoApiErrorV4(data: Record<string, unknown> | null): void {
  if (!data || (data.error_code === undefined && data.error_str === undefined)) return

  const detail = data.error_detail ? ` — ${data.error_detail}` : ""
  throw new Error(`Ошибка API v4 [${data.error_code ?? "?"}]: ${data.error_str ?? "неизвестная ошибка"}${detail}`)
}
