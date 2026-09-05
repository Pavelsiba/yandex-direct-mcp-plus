// ReportService отдаёт TSV и работает офлайн: 200 — отчёт готов, 201 — поставлен
// в очередь, 202 — ещё формируется, повторить через retryIn секунд.
// Док: https://yandex.ru/dev/direct/doc/en/codes
import { commonHeaders, fetchWithRetry, logUnits } from "#shared/api/fetch"
import { stringifyJson } from "#shared/api/json"
import { REPORT_URL } from "#shared/config/endpoints"
import { REPORT_DEFAULT_RETRY_IN_SEC, REPORT_MAX_POLLS, REPORT_MAX_RETRY_IN_SEC } from "#shared/config/limits"

export type ReportOptions = {
  skipReportHeader?: boolean
  skipReportSummary?: boolean
  skipColumnHeader?: boolean
}

function reportHeaders(opts: ReportOptions): Record<string, string> {
  return {
    ...commonHeaders(),
    processingMode: "auto",
    returnMoneyInMicros: "false",
    skipReportHeader: opts.skipReportHeader === false ? "false" : "true",
    skipReportSummary: opts.skipReportSummary ? "true" : "false",
    skipColumnHeader: opts.skipColumnHeader ? "true" : "false"
  }
}

// Сервер называет паузу в заголовке retryIn; на мусор и его отсутствие — свой дефолт.
function retryInSeconds(response: Response): number {
  const raw = response.headers?.get?.("retryIn")
  const parsed = raw == null ? Number.NaN : Number(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : REPORT_DEFAULT_RETRY_IN_SEC
}

export async function apiReport(params: Record<string, unknown>, opts: ReportOptions = {}): Promise<string> {
  const headers = reportHeaders(opts)
  const body = stringifyJson({ params })

  for (let poll = 0; poll <= REPORT_MAX_POLLS; poll++) {
    const response = await fetchWithRetry(REPORT_URL, { method: "POST", headers, body })
    logUnits(response)

    if (response.status === 200) return response.text()

    if (response.status === 201 || response.status === 202) {
      if (poll === REPORT_MAX_POLLS) {
        throw new Error(`Отчёт всё ещё формируется после ${REPORT_MAX_POLLS} попыток опроса. Повторите запрос позже.`)
      }
      const retryIn = retryInSeconds(response)
      console.error(
        `[yd-mcp] Отчёт формируется (HTTP ${response.status}), повтор через ${retryIn}с (${poll + 1}/${REPORT_MAX_POLLS})`
      )
      await new Promise((resolve) => setTimeout(resolve, Math.min(retryIn, REPORT_MAX_RETRY_IN_SEC) * 1000))
      continue
    }

    // Прочие коды сюда не доходят: fetchWithRetry бросает на всём, что не ok.
    return response.text()
  }
  throw new Error("Не удалось получить отчёт")
}
