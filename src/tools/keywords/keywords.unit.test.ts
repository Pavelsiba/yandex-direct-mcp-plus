// biome-ignore-all lint/plugin: тест разбирает тело запроса; проверка ID сравнивает сырую строку
import { beforeEach, describe, expect, it } from "vitest"
import { installFetchMock, lastRawBody, mockFetch, okResponse } from "#testing/fetch-mock"
import {
  handleAddKeywords,
  handleGetKeywordAuction,
  handleListKeywords,
  handleManageKeywords,
  handleSetKeywordBids,
  handleUpdateKeywords
} from "./handler.js"
import { getKeywordAuctionSchema, listKeywordsSchema, setKeywordBidsSchema } from "./schema.js"

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

  it("отдаёт выбранные вызывающим поля вместо набора по умолчанию", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Keywords: [] } }))

    // Через схему, а не мимо неё: иначе имя поля не проверялось бы ничем и тест прошёл бы
    // с несуществующим Statistics вместо StatisticsSearch.
    const params = listKeywordsSchema.parse({
      ad_group_ids: ["1915016273214320641"],
      fields: ["Id", "Keyword", "StatisticsSearch"]
    })
    await handleListKeywords(params)

    expect(lastBody().params.FieldNames).toEqual(["Id", "Keyword", "StatisticsSearch"])
  })

  // Имя не из KeywordFieldEnum Директ отбивает ошибкой 8000 на боевом вызове — схема
  // обязана не пустить его дальше, иначе баллы тратятся на заведомо неверный запрос.
  it("схема не принимает поле, которого нет в перечислении", () => {
    const parsed = listKeywordsSchema.safeParse({ ad_group_ids: ["1"], fields: ["Id", "Productvity"] })

    expect(parsed.success).toBe(false)
  })

  it("схема не принимает пустой список полей", () => {
    const parsed = listKeywordsSchema.safeParse({ ad_group_ids: ["1"], fields: [] })

    expect(parsed.success).toBe(false)
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

describe("update_keywords", () => {
  beforeEach(() => mockFetch.mockReset())

  it("отправляет только переданные поля: пропущенное остаётся прежним", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { UpdateResults: [] } }))

    await handleUpdateKeywords({
      keywords: [
        { keyword_id: "1915016273214320641", keyword: "купить краба -дешево" },
        { keyword_id: "222", user_param1: "seafood" }
      ]
    })

    expect(lastBody().method).toBe("update")
    expect(lastRawBody()).toContain('"Id":1915016273214320641,"Keyword":"купить краба -дешево"')
    expect(lastBody().params.Keywords[1]).toEqual({ Id: 222, UserParam1: "seafood" })
  })

  it("отличает очистку переменной от её пропуска", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { UpdateResults: [] } }))

    await handleUpdateKeywords({ keywords: [{ keyword_id: "222", user_param1: null }] })

    expect(lastBody().params.Keywords).toEqual([{ Id: 222, UserParam1: null }])
  })

  it("не ходит в сеть, когда менять нечего", async () => {
    await expect(handleUpdateKeywords({ keywords: [{ keyword_id: "222" }] })).rejects.toThrow("222")
    expect(mockFetch).not.toHaveBeenCalled()
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

describe("get_keyword_auction", () => {
  beforeEach(() => mockFetch.mockReset())

  it("отбирает по уровню целей именем множественного числа", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Bids: [] } }))

    await handleGetKeywordAuction(getKeywordAuctionSchema.parse({ campaign_ids: ["1915016273214320641"] }))

    expect(lastBody().method).toBe("get")
    expect(lastRawBody()).toContain('"CampaignIds":[1915016273214320641]')
    expect(lastBody().params.FieldNames).toContain("AuctionBids")
    expect(lastBody().params.FieldNames).toContain("MinSearchPrice")
  })

  it("требует ровно один уровень целей", async () => {
    await expect(handleGetKeywordAuction(getKeywordAuctionSchema.parse({}))).rejects.toThrow("ровно один уровень")

    expect(mockFetch).not.toHaveBeenCalled()
  })

  // Лесенка приходит микроединицами, а CompetitorsBids — голым массивом чисел: без
  // переноса ключа вглубь массива ставки конкурентов остались бы в микроединицах.
  it("переводит в рубли всю аукционную выдачу, включая ставки конкурентов", async () => {
    mockFetch.mockResolvedValueOnce(
      okResponse({
        result: {
          Bids: [
            {
              KeywordId: 1234567890,
              Bid: 300000,
              MinSearchPrice: 300000,
              CurrentSearchPrice: null,
              CompetitorsBids: [45100000, 9700000],
              AuctionBids: [{ Position: "P11", Bid: 45100000, Price: 16000000 }],
              SearchPrices: [{ Position: "PREMIUMFIRST", Price: 45100000 }]
            }
          ]
        }
      })
    )

    const output = JSON.parse(
      await handleGetKeywordAuction(getKeywordAuctionSchema.parse({ keyword_ids: ["1234567890"] }))
    )
    const bid = output.result.Bids[0]

    expect(bid.Bid).toBe(0.3)
    expect(bid.MinSearchPrice).toBe(0.3)
    expect(bid.CurrentSearchPrice).toBeNull()
    expect(bid.CompetitorsBids).toEqual([45.1, 9.7])
    expect(bid.AuctionBids[0]).toEqual({ Position: "P11", Bid: 45.1, Price: 16 })
    expect(bid.SearchPrices[0]).toEqual({ Position: "PREMIUMFIRST", Price: 45.1 })
    expect(bid.KeywordId).toBe("1234567890")
  })
})
