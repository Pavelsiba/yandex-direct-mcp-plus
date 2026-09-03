// biome-ignore-all lint/plugin: тест разбирает тело запроса
import { beforeEach, describe, expect, it } from "vitest"
import { installFetchMock, lastRawBody, mockFetch, okResponse } from "#testing/fetch-mock"
import { handleGetBidAdjustments, handleSetBidAdjustments } from "./handler.js"

installFetchMock()

function lastBody() {
  return JSON.parse(lastRawBody())
}

describe("get_bid_adjustments", () => {
  beforeEach(() => mockFetch.mockReset())

  it("отказывается выбирать корректировки одним уровнем, без объектов", async () => {
    await expect(handleGetBidAdjustments({ levels: ["CAMPAIGN"] })).rejects.toThrow("campaign_ids")
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("запрашивает коэффициенты всех типов сразу: они лежат в разных полях", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { BidModifiers: [] } }))

    await handleGetBidAdjustments({ campaign_ids: ["123"], levels: ["CAMPAIGN"], types: ["MOBILE_ADJUSTMENT"] })

    const { params } = lastBody()
    expect(params.SelectionCriteria).toEqual({
      Levels: ["CAMPAIGN"],
      CampaignIds: [123],
      Types: ["MOBILE_ADJUSTMENT"]
    })
    expect(params.MobileAdjustmentFieldNames).toContain("BidModifier")
    expect(params.DemographicsAdjustmentFieldNames).toContain("Gender")
  })
})

describe("set_bid_adjustments", () => {
  beforeEach(() => mockFetch.mockReset())

  it("отправляет коэффициент процентами, без конвертации в микроединицы", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { SetResults: [] } }))

    await handleSetBidAdjustments({ adjustments: [{ adjustment_id: "123", bid_modifier: 150 }] })

    expect(lastBody().method).toBe("set")
    expect(lastBody().params.BidModifiers).toEqual([{ Id: 123, BidModifier: 150 }])
  })
})
