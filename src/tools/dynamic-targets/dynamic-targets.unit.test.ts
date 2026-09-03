// biome-ignore-all lint/plugin: тест разбирает тело запроса
import { beforeEach, describe, expect, it } from "vitest"
import { installFetchMock, lastRawBody, mockFetch, okResponse } from "#testing/fetch-mock"
import { handleListDynamicTargets, handleManageDynamicTargets } from "./handler.js"
import { manageDynamicTargetsSchema } from "./schema.js"

installFetchMock()

function lastBody() {
  return JSON.parse(lastRawBody())
}

describe("list_dynamic_targets", () => {
  beforeEach(() => mockFetch.mockReset())

  it("собирает выборку из переданных фильтров", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Webpages: [] } }))

    await handleListDynamicTargets({ campaign_ids: ["123"], states: ["SUSPENDED"] })

    expect(lastBody().params.SelectionCriteria).toEqual({ CampaignIds: [123], States: ["SUSPENDED"] })
  })
})

describe("manage_dynamic_targets: add", () => {
  beforeEach(() => mockFetch.mockReset())

  it("кладёт цели в Webpages — так поле называется в API", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [] } }))
    const params = manageDynamicTargetsSchema.parse({
      action: "add",
      targets: [
        {
          ad_group_id: "123",
          name: "Карточки товаров",
          conditions: [{ operand: "URL", operator: "CONTAINS_ANY", arguments: ["/product/"] }],
          bid: 25
        }
      ]
    })

    await handleManageDynamicTargets(params)

    expect(lastBody().params.Webpages[0]).toEqual({
      AdGroupId: 123,
      Name: "Карточки товаров",
      Conditions: [{ Operand: "URL", Operator: "CONTAINS_ANY", Arguments: ["/product/"] }],
      Bid: 25_000_000
    })
  })

  it("требует список целей для добавления", async () => {
    await expect(handleManageDynamicTargets({ action: "add" })).rejects.toThrow("targets")
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe("manage_dynamic_targets: set_bids", () => {
  beforeEach(() => mockFetch.mockReset())

  it("вызывает setBids и адресует ставку по уровню", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { SetBidsResults: [] } }))
    const params = manageDynamicTargetsSchema.parse({
      action: "set_bids",
      bids: [{ dynamic_target_id: "123", bid: 30, context_bid: 0 }]
    })

    await handleManageDynamicTargets(params)

    expect(lastBody().method).toBe("setBids")
    expect(lastBody().params.Bids[0]).toEqual({ Id: 123, Bid: 30_000_000, ContextBid: 0 })
  })

  it("отбивает ставку без единственного адресата и без значений", async () => {
    const twoLevels = manageDynamicTargetsSchema.parse({
      action: "set_bids",
      bids: [{ dynamic_target_id: "123", campaign_id: "456", bid: 30 }]
    })
    await expect(handleManageDynamicTargets(twoLevels)).rejects.toThrow("ровно один ID")

    const empty = manageDynamicTargetsSchema.parse({ action: "set_bids", bids: [{ campaign_id: "456" }] })
    await expect(handleManageDynamicTargets(empty)).rejects.toThrow("bid, context_bid и/или strategy_priority")

    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe("manage_dynamic_targets: состояния", () => {
  beforeEach(() => mockFetch.mockReset())

  it("вызывает метод API по имени действия", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { DeleteResults: [] } }))

    await handleManageDynamicTargets({ action: "delete", dynamic_target_ids: ["123"] })

    expect(lastBody().method).toBe("delete")
    expect(lastBody().params.SelectionCriteria).toEqual({ Ids: [123] })
  })

  it("требует список целей для действия над ними", async () => {
    await expect(handleManageDynamicTargets({ action: "resume" })).rejects.toThrow("dynamic_target_ids")
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
