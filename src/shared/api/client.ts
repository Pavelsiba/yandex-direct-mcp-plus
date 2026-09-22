// JSON API v5 — основной клиент: один POST на сервис с телом { method, params }.
import { holdWrite } from "#shared/api/dry-run"
import { assertNoApiError } from "#shared/api/errors"
import { commonHeaders, fetchWithRetry, logUnits } from "#shared/api/fetch"
import { parseJson, stringifyJson } from "#shared/api/json"
import { BASE_URL } from "#shared/config/endpoints"

export async function apiPost(service: string, method: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const held = holdWrite(service, method, params)
  if (held) return held

  const response = await fetchWithRetry(`${BASE_URL}${service}`, {
    method: "POST",
    headers: commonHeaders(),
    body: stringifyJson({ method, params })
  })
  const units = logUnits(response)

  const data = parseJson(await response.text())
  assertNoApiError(data, units)
  return data
}
