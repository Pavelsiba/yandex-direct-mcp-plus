// biome-ignore-all lint/plugin: тест разбирает тело запроса; проверка ID сравнивает сырую строку
import { beforeEach, describe, expect, it } from "vitest"
import { installFetchMock, lastRawBody, lastRequestUrl, mockFetch, okResponse } from "#testing/fetch-mock"
import {
  handleAddKeywords,
  handleGetKeywordAuction,
  handleListKeywords,
  handleManageKeywords,
  handleSetAutoKeywordBids,
  handleSetKeywordBids,
  handleUpdateKeywords
} from "./handler.js"
import {
  getKeywordAuctionSchema,
  listKeywordsSchema,
  setAutoKeywordBidsSchema,
  setKeywordBidsSchema
} from "./schema.js"

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
    const params = setKeywordBidsSchema.parse({ search_bid: 30 })
    await expect(handleSetKeywordBids(params)).rejects.toThrow("ровно один уровень")

    const twoLevels = setKeywordBidsSchema.parse({ keyword_ids: ["123"], campaign_ids: ["456"], search_bid: 30 })
    await expect(handleSetKeywordBids(twoLevels)).rejects.toThrow("ровно один уровень")

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("ставит ставки через KeywordBids с полем по уровню целей", async () => {
    mockFetch.mockResolvedValue(okResponse({ result: { SetResults: [] } }))

    await handleSetKeywordBids(setKeywordBidsSchema.parse({ ad_group_ids: ["1915016273214320641"], search_bid: 30 }))
    expect(lastRequestUrl()).toMatch(/\/keywordbids$/)
    expect(lastBody().method).toBe("set")
    expect(lastRawBody()).toContain('"KeywordBids":[{"AdGroupId":1915016273214320641')

    await handleSetKeywordBids(setKeywordBidsSchema.parse({ campaign_ids: ["456"], search_bid: 30 }))
    expect(lastBody().params.KeywordBids[0].CampaignId).toBe(456)
  })

  it("конвертирует рубли в микроединицы схемой, а не хендлером", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { SetResults: [] } }))
    const params = setKeywordBidsSchema.parse({ keyword_ids: ["123"], search_bid: 12.5, network_bid: 7 })

    await handleSetKeywordBids(params)

    expect(lastBody().params.KeywordBids[0]).toEqual({ KeywordId: 123, SearchBid: 12_500_000, NetworkBid: 7_000_000 })
  })

  it("переводит флаг автоставки автотаргетинга в YES/NO и принимает его без суммы", async () => {
    mockFetch.mockResolvedValue(okResponse({ result: { SetResults: [] } }))

    await handleSetKeywordBids(setKeywordBidsSchema.parse({ keyword_ids: ["123"], autotargeting_auto_bid: true }))
    expect(lastBody().params.KeywordBids[0]).toEqual({ KeywordId: 123, AutotargetingSearchBidIsAuto: "YES" })

    await handleSetKeywordBids(setKeywordBidsSchema.parse({ keyword_ids: ["123"], autotargeting_auto_bid: false }))
    expect(lastBody().params.KeywordBids[0].AutotargetingSearchBidIsAuto).toBe("NO")
  })

  it("отказывается ставить ставку, не получив ни одного значения", async () => {
    const params = setKeywordBidsSchema.parse({ keyword_ids: ["123"] })

    await expect(handleSetKeywordBids(params)).rejects.toThrow("search_bid, network_bid")
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("схема не пропускает пакет кампаний сверх лимита Директа", () => {
    const campaignIds = Array.from({ length: 11 }, (_, index) => String(index + 1))

    expect(setKeywordBidsSchema.safeParse({ campaign_ids: campaignIds, search_bid: 30 }).success).toBe(false)
  })
})

describe("set_auto_keyword_bids", () => {
  beforeEach(() => mockFetch.mockReset())

  it("собирает правило поиска и сетей с надбавкой и потолком в микроединицах", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { SetAutoResults: [] } }))
    const params = setAutoKeywordBidsSchema.parse({
      ad_group_ids: ["1915016273214320641"],
      search: { traffic_volume: 75, increase_percent: 10, bid_ceiling: 40 },
      network: { coverage: 50 }
    })

    await handleSetAutoKeywordBids(params)

    expect(lastRequestUrl()).toMatch(/\/keywordbids$/)
    expect(lastBody().method).toBe("setAuto")
    expect(lastRawBody()).toContain('"AdGroupId":1915016273214320641')
    expect(lastBody().params.KeywordBids[0].BiddingRule).toEqual({
      SearchByTrafficVolume: { TargetTrafficVolume: 75, IncreasePercent: 10, BidCeiling: 40_000_000 },
      NetworkByCoverage: { TargetCoverage: 50 }
    })
  })

  it("отказывается без правила и без уровня целей, не ходя в сеть", async () => {
    await expect(handleSetAutoKeywordBids(setAutoKeywordBidsSchema.parse({ keyword_ids: ["1"] }))).rejects.toThrow(
      "search и/или network"
    )
    await expect(
      handleSetAutoKeywordBids(setAutoKeywordBidsSchema.parse({ search: { traffic_volume: 100 } }))
    ).rejects.toThrow("ровно один уровень")

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("схема держит проценты в диапазонах Директа", () => {
    const parse = (search: Record<string, number>) =>
      setAutoKeywordBidsSchema.safeParse({ keyword_ids: ["1"], search }).success

    expect(parse({ traffic_volume: 5 })).toBe(true)
    expect(parse({ traffic_volume: 4 })).toBe(false)
    expect(parse({ traffic_volume: 100, increase_percent: 1001 })).toBe(false)
    expect(parse({ traffic_volume: 50.5 })).toBe(false)
  })
})

describe("get_keyword_auction", () => {
  beforeEach(() => mockFetch.mockReset())

  it("запрашивает торги обеих площадок через KeywordBids по уровню целей", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { KeywordBids: [] } }))

    await handleGetKeywordAuction(getKeywordAuctionSchema.parse({ campaign_ids: ["1915016273214320641"] }))

    expect(lastRequestUrl()).toMatch(/\/keywordbids$/)
    expect(lastBody().method).toBe("get")
    expect(lastRawBody()).toContain('"CampaignIds":[1915016273214320641]')
    expect(lastBody().params.FieldNames).not.toContain("StrategyPriority")
    expect(lastBody().params.SearchFieldNames).toContain("AuctionBids")
    expect(lastBody().params.NetworkFieldNames).toContain("Coverage")
  })

  it("не спрашивает поля площадки, которую не выбрали", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { KeywordBids: [] } }))

    await handleGetKeywordAuction(getKeywordAuctionSchema.parse({ keyword_ids: ["1"], placements: ["search"] }))

    expect(lastBody().params.SearchFieldNames).toBeDefined()
    expect(lastBody().params).not.toHaveProperty("NetworkFieldNames")
  })

  it("требует ровно один уровень целей", async () => {
    await expect(handleGetKeywordAuction(getKeywordAuctionSchema.parse({}))).rejects.toThrow("ровно один уровень")

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("переводит в рубли ставки и торги обеих площадок, проценты оставляет числами", async () => {
    mockFetch.mockResolvedValueOnce(
      okResponse({
        result: {
          KeywordBids: [
            {
              KeywordId: 1234567890,
              ServingStatus: "ELIGIBLE",
              Search: {
                Bid: 300000,
                AutotargetingSearchBidIsAuto: "NO",
                AuctionBids: { AuctionBidItems: [{ TrafficVolume: 100, Bid: 45100000, Price: 16000000 }] }
              },
              Network: { Bid: 7000000, Coverage: { CoverageItems: [{ Probability: 62.5, Bid: 3200000 }] } }
            }
          ]
        }
      })
    )

    const output = JSON.parse(
      await handleGetKeywordAuction(getKeywordAuctionSchema.parse({ keyword_ids: ["1234567890"] }))
    )
    const bid = output.result.KeywordBids[0]

    expect(bid.KeywordId).toBe("1234567890")
    expect(bid.Search.Bid).toBe(0.3)
    expect(bid.Search.AuctionBids.AuctionBidItems[0]).toEqual({ TrafficVolume: 100, Bid: 45.1, Price: 16 })
    expect(bid.Network.Bid).toBe(7)
    expect(bid.Network.Coverage.CoverageItems[0]).toEqual({ Probability: 62.5, Bid: 3.2 })
  })
})
