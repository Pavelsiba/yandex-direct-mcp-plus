// Live API v4 — только ради баланса аккаунта, в v5 финансовой информации нет.
// Формат тела свой: { method, token, param }, токен внутри, а не в заголовке.
import { assertNoApiErrorV4 } from "#shared/api/errors"
import { fetchWithRetry, logUnits } from "#shared/api/fetch"
import { parseJson, stringifyJson } from "#shared/api/json"
import { V4_URL } from "#shared/config/endpoints"
import { getToken } from "#shared/config/env"

export async function apiV4(method: string, param: Record<string, unknown> = {}): Promise<unknown> {
  const response = await fetchWithRetry(V4_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept-Language": "ru" },
    body: stringifyJson({ method, token: getToken(), param })
  })
  logUnits(response)

  const data = parseJson(await response.text()) as Record<string, unknown>
  assertNoApiErrorV4(data)
  return data
}
