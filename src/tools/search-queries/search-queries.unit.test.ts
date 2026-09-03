// biome-ignore-all lint/plugin: тест разбирает тело запроса
import { beforeEach, describe, expect, it } from "vitest"
import { installFetchMock, lastRawBody, mockFetch, okResponse } from "#testing/fetch-mock"
import { handleGetSearchQueries } from "./handler.js"

installFetchMock()

const TSV = "Query\tClicks\nкупить краба\t3\n"

function lastBody() {
  return JSON.parse(lastRawBody())
}

describe("get_search_queries", () => {
  beforeEach(() => mockFetch.mockReset())

  it("заказывает отчёт о поисковых запросах, а не о кампаниях", async () => {
    mockFetch.mockResolvedValueOnce(okResponse(TSV))

    const output = await handleGetSearchQueries({
      campaign_ids: ["123"],
      date_from: "2026-09-01",
      date_to: "2026-09-02"
    })

    const { params } = lastBody()
    expect(output).toBe(TSV)
    expect(params.ReportType).toBe("SEARCH_QUERY_PERFORMANCE_REPORT")
    expect(params.FieldNames[0]).toBe("Query")
    expect(params.ReportName).toMatch(/^search_queries_\d+$/)
  })

  it("фильтрует по кампаниям строками: ReportService не принимает числа", async () => {
    mockFetch.mockResolvedValueOnce(okResponse(TSV))

    await handleGetSearchQueries({
      campaign_ids: ["1915016273214320641"],
      date_from: "2026-09-01",
      date_to: "2026-09-02"
    })

    expect(lastBody().params.SelectionCriteria.Filter).toEqual([
      { Field: "CampaignId", Operator: "IN", Values: ["1915016273214320641"] }
    ])
  })
})
