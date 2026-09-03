// biome-ignore-all lint/plugin: тест разбирает тело запроса
import { beforeEach, describe, expect, it } from "vitest"
import { installFetchMock, lastRawBody, mockFetch, okResponse } from "#testing/fetch-mock"
import { handleListAudienceTargets, handleSetAudienceTargets } from "./handler.js"
import { setAudienceTargetsSchema } from "./schema.js"

installFetchMock()

function lastBody() {
  return JSON.parse(lastRawBody())
}

describe("list_audience_targets", () => {
  beforeEach(() => mockFetch.mockReset())

  it("не считает фильтр по состоянию достаточным для выборки", async () => {
    await expect(handleListAudienceTargets({ states: ["ON"] })).rejects.toThrow("хотя бы один фильтр ID")
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("складывает состояние с фильтром по ID, когда он есть", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AudienceTargets: [] } }))

    await handleListAudienceTargets({ ad_group_ids: ["123"], states: ["ON"] })

    expect(lastBody().params.SelectionCriteria).toEqual({ AdGroupIds: [123], States: ["ON"] })
  })
})

describe("set_audience_targets: add", () => {
  beforeEach(() => mockFetch.mockReset())

  it("строит цель ровно на одном источнике", async () => {
    const both = setAudienceTargetsSchema.parse({
      action: "add",
      targets: [{ ad_group_id: "123", retargeting_list_id: "456", interest_id: "789" }]
    })
    await expect(handleSetAudienceTargets(both)).rejects.toThrow("ровно одно")

    const neither = setAudienceTargetsSchema.parse({ action: "add", targets: [{ ad_group_id: "123" }] })
    await expect(handleSetAudienceTargets(neither)).rejects.toThrow("ровно одно")

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("принимает нулевую ставку как снятие ставки, а не как пропуск поля", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [] } }))
    const params = setAudienceTargetsSchema.parse({
      action: "add",
      targets: [{ ad_group_id: "123", retargeting_list_id: "456", context_bid: 0, strategy_priority: "HIGH" }]
    })

    await handleSetAudienceTargets(params)

    expect(lastBody().params.AudienceTargets[0]).toEqual({
      AdGroupId: 123,
      RetargetingListId: 456,
      ContextBid: 0,
      StrategyPriority: "HIGH"
    })
  })

  it("конвертирует ставку в микроединицы схемой", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [] } }))
    const params = setAudienceTargetsSchema.parse({
      action: "add",
      targets: [{ ad_group_id: "123", interest_id: "456", context_bid: 15 }]
    })

    await handleSetAudienceTargets(params)

    expect(lastBody().params.AudienceTargets[0].ContextBid).toBe(15_000_000)
  })
})

describe("set_audience_targets: set_bids", () => {
  beforeEach(() => mockFetch.mockReset())

  it("вызывает setBids и адресует ставку по уровню", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { SetBidsResults: [] } }))
    const params = setAudienceTargetsSchema.parse({
      action: "set_bids",
      bids: [{ campaign_id: "123", context_bid: 20 }]
    })

    await handleSetAudienceTargets(params)

    expect(lastBody().method).toBe("setBids")
    expect(lastBody().params.Bids[0]).toEqual({ CampaignId: 123, ContextBid: 20_000_000 })
  })

  it("отбивает ставку без единственного адресата и без значений", async () => {
    const twoLevels = setAudienceTargetsSchema.parse({
      action: "set_bids",
      bids: [{ campaign_id: "123", ad_group_id: "456", context_bid: 20 }]
    })
    await expect(handleSetAudienceTargets(twoLevels)).rejects.toThrow("ровно один ID")

    const empty = setAudienceTargetsSchema.parse({ action: "set_bids", bids: [{ campaign_id: "123" }] })
    await expect(handleSetAudienceTargets(empty)).rejects.toThrow("context_bid и/или strategy_priority")

    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe("set_audience_targets: состояния", () => {
  beforeEach(() => mockFetch.mockReset())

  it("вызывает метод API по имени действия", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { SuspendResults: [] } }))

    await handleSetAudienceTargets({ action: "suspend", audience_target_ids: ["123"] })

    expect(lastBody().method).toBe("suspend")
    expect(lastBody().params.SelectionCriteria).toEqual({ Ids: [123] })
  })

  it("требует список условий для действия над ними", async () => {
    await expect(handleSetAudienceTargets({ action: "delete" })).rejects.toThrow("audience_target_ids")
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
