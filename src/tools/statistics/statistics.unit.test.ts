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
import { getStatisticsSchema } from "./schema.js"

installFetchMock()

const TSV = "Date\tImpressions\n2026-09-01\t100\n"
const PERIOD = { date_from: "2026-09-01", date_to: "2026-09-02" }

function lastBody() {
  return JSON.parse(lastRawBody())
}

function lastHeaders() {
  const calls = mockFetch.mock.calls
  return calls[calls.length - 1][1].headers as Record<string, string>
}

function statistics(input: Record<string, unknown>) {
  return handleGetStatistics(getStatisticsSchema.parse({ ...PERIOD, ...input }))
}

describe("get_statistics", () => {
  beforeEach(() => mockFetch.mockReset())

  it("отдаёт TSV отчёта как есть, без обёртки JSON", async () => {
    mockFetch.mockResolvedValueOnce(okResponse(TSV))

    const output = await statistics({ campaign_ids: ["123"] })

    expect(output).toBe(TSV)
    expect(lastRequestUrl()).toContain("/reports")
  })

  it("на пустой 204 бросает сбой, а не отдаёт пустой отчёт", async () => {
    mockFetch.mockResolvedValueOnce({ ...okResponse(""), status: 204 })

    await expect(statistics({ campaign_ids: ["123"] })).rejects.toThrow(/HTTP 204/)
  })

  it("фильтрует по кампаниям строками: ReportService не принимает числа", async () => {
    mockFetch.mockResolvedValueOnce(okResponse(TSV))

    await statistics({ campaign_ids: ["1915016273214320641"] })

    expect(lastBody().params.SelectionCriteria.Filter).toEqual([
      { Field: "CampaignId", Operator: "IN", Values: ["1915016273214320641"] }
    ])
  })

  it("без report_type строит отчёт по кампаниям за период с полями по умолчанию", async () => {
    mockFetch.mockResolvedValueOnce(okResponse(TSV))

    await statistics({ campaign_ids: ["123"] })

    const { params } = lastBody()
    expect(params.ReportType).toBe("CAMPAIGN_PERFORMANCE_REPORT")
    expect(params.DateRangeType).toBe("CUSTOM_DATE")
    expect(params.SelectionCriteria).toMatchObject({ DateFrom: "2026-09-01", DateTo: "2026-09-02" })
    expect(params.FieldNames).toEqual(["Date", "CampaignName", "Impressions", "Clicks", "Cost", "Ctr", "AvgCpc"])
    expect(params.ReportName).toMatch(/^report_\d+$/)
  })

  it.each([
    ["ADGROUP_PERFORMANCE_REPORT", "AdGroupId"],
    ["AD_PERFORMANCE_REPORT", "AdId"],
    ["CRITERIA_PERFORMANCE_REPORT", "CriterionId"]
  ])("%s по умолчанию отдаёт строку на объект за весь период, с его ID", async (reportType, idField) => {
    mockFetch.mockResolvedValueOnce(okResponse(TSV))

    await statistics({ report_type: reportType, campaign_ids: ["123"] })

    const { params } = lastBody()
    expect(params.ReportType).toBe(reportType)
    expect(params.FieldNames).toContain(idField)
    expect(params.FieldNames).not.toContain("Date")
  })

  it("отчёт по аккаунту строится без фильтра по кампаниям", async () => {
    mockFetch.mockResolvedValueOnce(okResponse(TSV))

    await statistics({ report_type: "ACCOUNT_PERFORMANCE_REPORT" })

    const { params } = lastBody()
    expect(params.ReportType).toBe("ACCOUNT_PERFORMANCE_REPORT")
    expect(params.SelectionCriteria).not.toHaveProperty("Filter")
  })

  it("отклоняет кампании в отчёте по аккаунту и их отсутствие в остальных", () => {
    expect(
      getStatisticsSchema.safeParse({ ...PERIOD, report_type: "ACCOUNT_PERFORMANCE_REPORT", campaign_ids: ["123"] })
        .success
    ).toBe(false)
    expect(getStatisticsSchema.safeParse({ ...PERIOD, report_type: "AD_PERFORMANCE_REPORT" }).success).toBe(false)
  })

  it("в отчёте об охвате требует CampaignId среди полей и сам кладёт его в набор по умолчанию", async () => {
    expect(
      getStatisticsSchema.safeParse({
        ...PERIOD,
        report_type: "REACH_AND_FREQUENCY_PERFORMANCE_REPORT",
        campaign_ids: ["123"],
        fields: ["Impressions"]
      }).success
    ).toBe(false)

    mockFetch.mockResolvedValueOnce(okResponse(TSV))
    await statistics({ report_type: "REACH_AND_FREQUENCY_PERFORMANCE_REPORT", campaign_ids: ["123"] })

    expect(lastBody().params.FieldNames).toContain("CampaignId")
  })

  it("не принимает поисковые запросы: для них есть get_search_queries", () => {
    expect(
      getStatisticsSchema.safeParse({ ...PERIOD, report_type: "SEARCH_QUERY_PERFORMANCE_REPORT", campaign_ids: ["1"] })
        .success
    ).toBe(false)
  })

  it("отклоняет имя поля не из reports.xsd и пустой список полей", () => {
    expect(getStatisticsSchema.safeParse({ ...PERIOD, campaign_ids: ["1"], fields: ["Clickz"] }).success).toBe(false)
    expect(getStatisticsSchema.safeParse({ ...PERIOD, campaign_ids: ["1"], fields: [] }).success).toBe(false)
  })

  it("просит деньги в рублях, а не в микроединицах", async () => {
    mockFetch.mockResolvedValueOnce(okResponse(TSV))

    await statistics({ campaign_ids: ["123"] })

    expect(lastHeaders().returnMoneyInMicros).toBe("false")
  })

  it("заменяет поля отчёта, когда они названы явно", async () => {
    mockFetch.mockResolvedValueOnce(okResponse(TSV))

    await statistics({ campaign_ids: ["123"], fields: ["Date", "Conversions"] })

    expect(lastBody().params.FieldNames).toEqual(["Date", "Conversions"])
  })

  it("на лимит частоты отдаёт код 56 с подсказкой, а не голый HTTP 400", async () => {
    mockFetch.mockResolvedValueOnce(
      errorResponse(
        400,
        `{"error":{"request_id":"1","error_string":"Превышен лимит запросов метода",` +
          `"error_detail":"Данный метод можно запрашивать не чаще чем 1 раз в 10 секунд","error_code":"56"}}`
      )
    )

    await expect(statistics({ campaign_ids: ["123"] })).rejects.toThrow(/\[56\].*10 секунд.*Что делать: .*Выждите/)
    expect(mockFetch).toHaveBeenCalledTimes(1)
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

    await expect(statistics({ campaign_ids: ["123"] })).rejects.toThrow(/YANDEX_DIRECT_TOKEN/)
  })
})
