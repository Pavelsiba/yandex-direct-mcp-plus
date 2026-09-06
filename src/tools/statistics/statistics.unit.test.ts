// biome-ignore-all lint/plugin: тест разбирает тело запроса
import { beforeEach, describe, expect, it } from "vitest"
import {
  errorResponse,
  installFetchMock,
  lastRawBody,
  lastRequestUrl,
  mockFetch,
  okResponse
} from "#testing/fetch-mock"
import { handleGetStatistics } from "./handler.js"

installFetchMock()

const TSV = "Date\tImpressions\n2026-09-01\t100\n"

function lastBody() {
  return JSON.parse(lastRawBody())
}

function lastHeaders() {
  const calls = mockFetch.mock.calls
  return calls[calls.length - 1][1].headers as Record<string, string>
}

describe("get_statistics", () => {
  beforeEach(() => mockFetch.mockReset())

  it("отдаёт TSV отчёта как есть, без обёртки JSON", async () => {
    mockFetch.mockResolvedValueOnce(okResponse(TSV))

    const output = await handleGetStatistics({ campaign_ids: ["123"], date_from: "2026-09-01", date_to: "2026-09-02" })

    expect(output).toBe(TSV)
    expect(lastRequestUrl()).toContain("/reports")
  })

  it("фильтрует по кампаниям строками: ReportService не принимает числа", async () => {
    mockFetch.mockResolvedValueOnce(okResponse(TSV))

    await handleGetStatistics({
      campaign_ids: ["1915016273214320641"],
      date_from: "2026-09-01",
      date_to: "2026-09-02"
    })

    expect(lastBody().params.SelectionCriteria.Filter).toEqual([
      { Field: "CampaignId", Operator: "IN", Values: ["1915016273214320641"] }
    ])
  })

  it("строит отчёт по кампаниям за указанный период с полями по умолчанию", async () => {
    mockFetch.mockResolvedValueOnce(okResponse(TSV))

    await handleGetStatistics({ campaign_ids: ["123"], date_from: "2026-09-01", date_to: "2026-09-02" })

    const { params } = lastBody()
    expect(params.ReportType).toBe("CAMPAIGN_PERFORMANCE_REPORT")
    expect(params.DateRangeType).toBe("CUSTOM_DATE")
    expect(params.SelectionCriteria).toMatchObject({ DateFrom: "2026-09-01", DateTo: "2026-09-02" })
    expect(params.FieldNames).toEqual(["Date", "CampaignName", "Impressions", "Clicks", "Cost", "Ctr", "AvgCpc"])
    expect(params.ReportName).toMatch(/^report_\d+$/)
  })

  it("просит деньги в рублях, а не в микроединицах", async () => {
    mockFetch.mockResolvedValueOnce(okResponse(TSV))

    await handleGetStatistics({ campaign_ids: ["123"], date_from: "2026-09-01", date_to: "2026-09-02" })

    expect(lastHeaders().returnMoneyInMicros).toBe("false")
  })

  it("заменяет поля отчёта, когда они названы явно", async () => {
    mockFetch.mockResolvedValueOnce(okResponse(TSV))

    await handleGetStatistics({
      campaign_ids: ["123"],
      date_from: "2026-09-01",
      date_to: "2026-09-02",
      fields: ["Date", "Conversions"]
    })

    expect(lastBody().params.FieldNames).toEqual(["Date", "Conversions"])
  })

  // Reports отвечает HTTP 400 и XML: без разбора наружу уходило бы «HTTP 400: Error»
  // с XML-простынёй в хвосте, из которой причина не видна.
  it("на недействительный токен объясняет причину, а не показывает HTTP 400 с XML", async () => {
    mockFetch.mockResolvedValueOnce(
      errorResponse(
        400,
        `<?xml version="1.0" encoding="UTF-8"?><reports:reportDownloadError xmlns:reports="http://api.direct.yandex.com/v5/reports">` +
          `<reports:ApiError><reports:errorCode>53</reports:errorCode>` +
          `<reports:errorMessage>Ошибка авторизации</reports:errorMessage></reports:ApiError></reports:reportDownloadError>`
      )
    )

    await expect(
      handleGetStatistics({ campaign_ids: ["123"], date_from: "2026-09-01", date_to: "2026-09-02" })
    ).rejects.toThrow(/YANDEX_DIRECT_TOKEN/)
  })
})
