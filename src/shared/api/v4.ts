// Live API v4 — ради того, чего нет в v5: баланса аккаунта и прогноза по фразам.
// Формат тела свой: { method, token, param }, токен внутри, а не в заголовке; param бывает
// и объектом, и голым числом (ID отчёта прогноза).
import { assertNoApiErrorV4 } from "#shared/api/errors"
import { fetchWithRetry, logUnits, readJson } from "#shared/api/fetch"
import { stringifyJson } from "#shared/api/json"
import { V4_URL } from "#shared/config/endpoints"
import { getToken } from "#shared/config/env"

export async function apiV4(method: string, param: unknown = {}): Promise<unknown> {
  const response = await fetchWithRetry(V4_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept-Language": "ru" },
    body: stringifyJson({ method, token: getToken(), param })
  })
  const units = logUnits(response)

  const data = (await readJson(response)) as Record<string, unknown>
  assertNoApiErrorV4(data, units)
  return data
}
