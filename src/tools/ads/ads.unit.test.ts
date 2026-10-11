// biome-ignore-all lint/plugin: тест разбирает тело запроса; проверка ID сравнивает сырую строку
import { beforeEach, describe, expect, it } from "vitest"
import { installFetchMock, lastRawBody, mockFetch, okResponse } from "#testing/fetch-mock"
import { handleCreateTextAd, handleListAds, handleManageAds, handleModerateAds, handleUpdateTextAd } from "./handler.js"
import { listAdsSchema } from "./schema.js"

installFetchMock()

function lastBody() {
  return JSON.parse(lastRawBody())
}

describe("list_ads", () => {
  beforeEach(() => mockFetch.mockReset())

  it("запрашивает тексты вместе со списком объявлений", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Ads: [] } }))

    await handleListAds({ ad_group_ids: ["123"] })

    expect(lastBody().params.TextAdFieldNames).toContain("Title")
    expect(lastBody().params.TextAdFieldNames).toContain("Href")
  })

  it("запрашивает тип объявления и пояснение модерации", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Ads: [] } }))

    await handleListAds({ ad_group_ids: ["123"] })

    expect(lastBody().params.FieldNames).toEqual(
      expect.arrayContaining(["Type", "Subtype", "StatusClarification", "AdCategories", "AgeLabel"])
    )
  })

  it("запрашивает привязки сайтлинков, визитки и изображения", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Ads: [] } }))

    await handleListAds({ ad_group_ids: ["123"] })

    expect(lastBody().params.TextAdFieldNames).toEqual(
      expect.arrayContaining(["SitelinkSetId", "VCardId", "AdImageHash"])
    )
  })

  it("отдаёт привязки строками независимо от разрядности", async () => {
    mockFetch.mockResolvedValueOnce(
      okResponse({
        result: {
          Ads: [
            {
              Id: "1919964803537252737",
              TextAd: { SitelinkSetId: 5794001114, VCardId: 12345678, AdImageHash: "abc123" }
            }
          ]
        }
      })
    )

    const output = await handleListAds({ ad_group_ids: ["123"] })

    expect(output).toContain('"SitelinkSetId": "5794001114"')
    expect(output).toContain('"VCardId": "12345678"')
    expect(output).toContain('"AdImageHash": "abc123"')
  })

  // Голый `{ "result": {} }` модель читает как поломку инструмента и додумывает причину.
  it("объясняет пустой ответ, в котором Директ не прислал даже ключ Ads", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: {} }))

    const output = await handleListAds({ ad_group_ids: ["123"] })

    expect(output).toContain("Причин две")
    expect(output).toContain("статистика накопительная")
  })

  it("не подсказывает ничего, когда объявления нашлись", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Ads: [{ Id: "1234567890123456789" }] } }))

    const output = await handleListAds({ ad_group_ids: ["123"] })

    expect(output).not.toContain("Причин две")
    expect(output.trimStart().startsWith("{")).toBe(true)
  })

  it("переносит все отборы в SelectionCriteria, а ID — числами без потери точности", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Ads: [] } }))

    await handleListAds({
      ad_ids: ["1919964803537252737"],
      campaign_ids: ["714159718"],
      states: ["ON", "SUSPENDED"],
      statuses: ["REJECTED"],
      types: ["TEXT_AD", "RESPONSIVE_AD"]
    })

    expect(lastRawBody()).toContain('"Ids":[1919964803537252737]')
    expect(lastBody().params.SelectionCriteria).toEqual({
      Ids: [expect.any(Number)],
      CampaignIds: [714159718],
      States: ["ON", "SUSPENDED"],
      Statuses: ["REJECTED"],
      Types: ["TEXT_AD", "RESPONSIVE_AD"]
    })
  })

  it("не шлёт пустых отборов", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Ads: [] } }))

    await handleListAds({ ad_group_ids: ["123"], states: [] })

    expect(lastBody().params.SelectionCriteria).toEqual({ AdGroupIds: [123] })
  })
})

describe("listAdsSchema", () => {
  it("отклоняет вызов без ID объявлений, групп и кампаний", () => {
    const result = listAdsSchema.safeParse({ states: ["ON"], ad_group_ids: [] })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain("ad_ids, ad_group_ids, campaign_ids")
  })

  it("принимает отбор по одной кампании", () => {
    expect(listAdsSchema.safeParse({ campaign_ids: ["714159718"] }).success).toBe(true)
  })

  it("отклоняет больше десяти кампаний — потолок Ads.get", () => {
    const campaignIds = Array.from({ length: 11 }, (_, index) => String(index + 1))

    expect(listAdsSchema.safeParse({ campaign_ids: campaignIds }).success).toBe(false)
  })
})

describe("create_text_ad", () => {
  beforeEach(() => mockFetch.mockReset())

  it("не отправляет Title2, когда второго заголовка нет", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [] } }))

    await handleCreateTextAd({
      ad_group_id: "1915016273214320641",
      title: "Свежий улов",
      text: "Доставка за час",
      href: "https://example.com"
    })

    expect(lastBody().params.Ads[0].TextAd).toEqual({
      Title: "Свежий улов",
      Text: "Доставка за час",
      Href: "https://example.com"
    })
    expect(lastRawBody()).toContain('"AdGroupId":1915016273214320641')
  })
})

describe("create_text_ad со вторым заголовком", () => {
  beforeEach(() => mockFetch.mockReset())

  it("добавляет Title2, когда второй заголовок передан", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [] } }))

    await handleCreateTextAd({
      ad_group_id: "123",
      title: "Свежий улов",
      title2: "Доставка по городу",
      text: "Доставка за час",
      href: "https://example.com"
    })

    expect(lastBody().params.Ads[0].TextAd.Title2).toBe("Доставка по городу")
  })
})

describe("update_text_ad", () => {
  beforeEach(() => mockFetch.mockReset())

  it("шлёт только те поля, которые переданы", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { UpdateResults: [] } }))

    await handleUpdateTextAd({ ad_id: "123", text: "Новый текст" })

    expect(lastBody().params.Ads[0].TextAd).toEqual({ Text: "Новый текст" })
  })

  it("отказывается работать вхолостую", async () => {
    await expect(handleUpdateTextAd({ ad_id: "123" })).rejects.toThrow("Нечего обновлять")
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe("manage_ads", () => {
  beforeEach(() => mockFetch.mockReset())

  it("вызывает метод API по имени действия", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { ArchiveResults: [] } }))

    await handleManageAds({ ad_ids: ["123", "456"], action: "archive" })

    expect(lastBody().method).toBe("archive")
    expect(lastRawBody()).toContain('"Ids":[123,456]')
  })
})

describe("moderate_ads", () => {
  beforeEach(() => mockFetch.mockReset())

  it("отправляет объявления на модерацию методом moderate", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { ModerateResults: [] } }))

    await handleModerateAds({ ad_ids: ["123"] })

    expect(lastBody().method).toBe("moderate")
  })
})
