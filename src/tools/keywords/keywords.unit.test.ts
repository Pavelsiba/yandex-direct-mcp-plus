// biome-ignore-all lint/plugin: тест разбирает тело запроса; проверка ID сравнивает сырую строку
import { beforeEach, describe, expect, it } from "vitest"
import { installFetchMock, lastRawBody, mockFetch, okResponse } from "#testing/fetch-mock"
import { handleAddKeywords, handleListKeywords, handleManageKeywords, handleSetKeywordBids } from "./handler.js"
import { setKeywordBidsSchema } from "./schema.js"

installFetchMock()

function lastBody() {
  return JSON.parse(lastRawBody())
}

describe("list_keywords", () => {
  beforeEach(() => mockFetch.mockReset())

  it("запрашивает фразы групп вместе со ставками обоих типов", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Keywords: [] } }))

    await handleListKeywords({ ad_group_ids: ["1915016273214320641"], limit: 10 })

    expect(lastRawBody()).toContain('"AdGroupIds":[1915016273214320641]')
    expect(lastBody().params.FieldNames).toEqual(expect.arrayContaining(["Bid", "ContextBid"]))
    expect(lastBody().params.Page).toEqual({ Limit: 10 })
  })
})

describe("add_keywords", () => {
  beforeEach(() => mockFetch.mockReset())

  it("разворачивает список фраз в отдельные записи с ID группы", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [] } }))

    await handleAddKeywords({ ad_group_id: "1915016273214320641", keywords: ["свежая рыба", "купить краба"] })

    expect(lastBody().params.Keywords).toHaveLength(2)
    expect(lastBody().params.Keywords[1].Keyword).toBe("купить краба")
    expect(lastRawBody()).toContain('"AdGroupId":1915016273214320641')
  })
})

describe("manage_keywords", () => {
  beforeEach(() => mockFetch.mockReset())

  it("вызывает метод API по имени действия", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { DeleteResults: [] } }))

    await handleManageKeywords({ keyword_ids: ["123", "456"], action: "delete" })

    expect(lastBody().method).toBe("delete")
    expect(lastRawBody()).toContain('"Ids":[123,456]')
  })
})

describe("set_keyword_bids", () => {
  beforeEach(() => mockFetch.mockReset())

  it("требует ровно один уровень целей", async () => {
    const params = setKeywordBidsSchema.parse({ bid: 30 })
    await expect(handleSetKeywordBids(params)).rejects.toThrow("ровно один уровень")

    const twoLevels = setKeywordBidsSchema.parse({ keyword_ids: ["123"], campaign_ids: ["456"], bid: 30 })
    await expect(handleSetKeywordBids(twoLevels)).rejects.toThrow("ровно один уровень")

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("называет поле ставки по уровню целей", async () => {
    mockFetch.mockResolvedValue(okResponse({ result: { SetResults: [] } }))

    await handleSetKeywordBids(setKeywordBidsSchema.parse({ ad_group_ids: ["123"], bid: 30 }))
    expect(lastBody().params.Bids[0].AdGroupId).toBe(123)

    await handleSetKeywordBids(setKeywordBidsSchema.parse({ campaign_ids: ["456"], bid: 30 }))
    expect(lastBody().params.Bids[0].CampaignId).toBe(456)
  })

  it("конвертирует рубли в микроединицы схемой, а не хендлером", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { SetResults: [] } }))
    const params = setKeywordBidsSchema.parse({ keyword_ids: ["123"], bid: 12.5, context_bid: 7 })

    await handleSetKeywordBids(params)

    expect(lastBody().params.Bids[0]).toMatchObject({ Bid: 12_500_000, ContextBid: 7_000_000 })
  })

  it("отказывается ставить ставку, не получив ни одной суммы", async () => {
    const params = setKeywordBidsSchema.parse({ keyword_ids: ["123"] })

    await expect(handleSetKeywordBids(params)).rejects.toThrow("bid и/или context_bid")
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
