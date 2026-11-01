// JSON API v5 — основной клиент: один POST на сервис с телом { method, params }.
import { withToken } from "#shared/api/authorized"
import { assertNoApiError, isTransientApiError } from "#shared/api/errors"
import { commonHeaders, fetchWithRetry, logUnits, readJson, retryWhen } from "#shared/api/fetch"
import { stringifyJson } from "#shared/api/json"
import { BASE_URL } from "#shared/config/endpoints"

// Всё, чего здесь нет, считается записью: незнакомый метод безопаснее не повторять лишний раз.
const READ_METHODS = new Set([
  "get",
  "getGeoRegions",
  "check",
  "checkCampaigns",
  "checkDictionaries",
  "hasSearchVolume"
])

export async function apiPost(
  service: string,
  method: string,
  params: Record<string, unknown> = {},
  baseUrl: string = BASE_URL
): Promise<unknown> {
  const write = !READ_METHODS.has(method)
  return withToken((token) =>
    retryWhen(
      (error) => isTransientApiError(error, { write }),
      async () => {
        const response = await fetchWithRetry(`${baseUrl}${service}`, {
          method: "POST",
          headers: commonHeaders(token),
          body: stringifyJson({ method, params })
        })
        const units = logUnits(response)

        const data = await readJson(response)
        assertNoApiError(data, units)
        return data
      }
    )
  )
}
